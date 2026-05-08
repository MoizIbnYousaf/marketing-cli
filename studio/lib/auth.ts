// lib/auth.ts -- Studio auth perimeter v1 (Lane 1, Wave A).
//
// Threat model: the studio binds to localhost only and serves a single user
// from the Bun server on :3001. Without auth, any local process or any tab
// in the user's browser can drive every endpoint, including writes to
// `.env.local` and queueing of skill runs. This module enforces:
//
//   1. DNS rebinding mitigation -- Host header allowlist.
//   2. Bearer token check -- `Authorization: Bearer <hex>` for fetch,
//      `?token=<hex>` query string for EventSource (browsers forbid
//      JS-set headers on EventSource).
//   3. Public allowlist -- `/api/health`, `/api/schema`, `/api/help`
//      are reachable without a token so launchers can poll boot status.
//
// Pattern lifted from hilash/cabinet `src/lib/agents/daemon-auth.ts` plus
// `server/cabinet-daemon.ts:1338`. Token persisted at
// `~/.mktg/.runtime/studio-token` mode 0o600. Compared with
// `crypto.timingSafeEqual` to keep the check constant-time.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// --- Constants -------------------------------------------------------------

const TOKEN_DIR = process.env.MKTG_STUDIO_TOKEN_DIR
  || join(homedir(), ".mktg", ".runtime");
const TOKEN_PATH = process.env.MKTG_STUDIO_TOKEN_PATH
  || join(TOKEN_DIR, "studio-token");

// Routes that bypass the bearer check. Host header is still enforced so a
// drive-by `evil.com` page cannot probe even these. `/api/auth/bootstrap`
// is localhost-only and returns the token so the dashboard can populate
// localStorage on direct-nav (no launcher) cold starts; CORS still blocks
// cross-origin reads.
const PUBLIC_PATHS = new Set<string>([
  "/api/health",
  "/api/schema",
  "/api/help",
  "/api/auth/bootstrap",
]);

// DNS rebinding mitigation. A page on `evil.com` that re-pins DNS to
// 127.0.0.1 after the initial handshake will still send `Host: evil.com`,
// which we reject here regardless of socket binding.
const ALLOWED_HOSTS = new Set<string>([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

// Module-local cache so we don't re-read the token file on every request.
let cachedToken: string | null = null;

// --- Token lifecycle -------------------------------------------------------

/**
 * Returns the studio bearer token, generating + persisting one if needed.
 *
 * Resolution order:
 *   1. `MKTG_STUDIO_TOKEN` env var (test runner / ephemeral processes).
 *   2. The file at `MKTG_STUDIO_TOKEN_PATH` (or
 *      `~/.mktg/.runtime/studio-token` by default).
 *   3. A freshly generated 32-byte hex token persisted to that file at
 *      mode 0o600.
 *
 * The result is cached for the life of the process. Restart to rotate.
 */
export function getOrCreateStudioToken(): string {
  if (cachedToken) return cachedToken;

  const envToken = process.env.MKTG_STUDIO_TOKEN;
  if (envToken && envToken.length >= 32) {
    cachedToken = envToken;
    return cachedToken;
  }

  if (existsSync(TOKEN_PATH)) {
    try {
      const tok = readFileSync(TOKEN_PATH, "utf-8").trim();
      if (tok.length >= 32) {
        cachedToken = tok;
        return cachedToken;
      }
    } catch {
      // Fall through to regenerate. Corrupted token file is recoverable.
    }
  }

  mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  const token = randomBytes(32).toString("hex");
  writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
  try {
    // writeFileSync sometimes ignores `mode` if the file already exists;
    // chmod explicitly to be sure.
    chmodSync(TOKEN_PATH, 0o600);
  } catch {
    // Best effort -- Windows or restricted filesystems.
  }
  cachedToken = token;
  return token;
}

/** Path to the persisted token file (for launcher / docs). */
export function studioTokenPath(): string {
  return TOKEN_PATH;
}

// --- Auth check ------------------------------------------------------------

export type AuthOk = { readonly ok: true };
export type AuthFail = {
  readonly ok: false;
  readonly reason: "FORBIDDEN_HOST" | "UNAUTHORIZED";
  readonly status: 400 | 401;
  readonly message: string;
  readonly fix: string;
};
export type AuthResult = AuthOk | AuthFail;

function hostHeaderAllowed(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  // Strip port portion before comparing.
  const hostname = host.replace(/:\d+$/, "").toLowerCase();
  return ALLOWED_HOSTS.has(hostname);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
  } catch {
    return false;
  }
}

/**
 * Single auth gate for the studio. Caller decides the response shape;
 * this function only computes the verdict.
 *
 * Order:
 *   1. Reject any request whose `Host` header isn't a localhost variant
 *      (DNS rebinding mitigation).
 *   2. Allow public paths to skip the token check.
 *   3. If `MKTG_STUDIO_AUTH=disabled` is set in the server env, allow.
 *      This is a TEST/DEV escape hatch -- production launches do not set it.
 *      The server logs a warning at boot when it is set.
 *   4. Otherwise require `Authorization: Bearer <token>` OR `?token=<token>`.
 */
export function checkAuth(req: Request, url: URL): AuthResult {
  if (!hostHeaderAllowed(req)) {
    return {
      ok: false,
      reason: "FORBIDDEN_HOST",
      status: 400,
      message: "Host header rejected -- studio binds to localhost only",
      fix: "Connect via http://127.0.0.1 or http://localhost (DNS rebinding guard)",
    };
  }

  if (PUBLIC_PATHS.has(url.pathname)) {
    return { ok: true };
  }

  if (process.env.MKTG_STUDIO_AUTH === "disabled") {
    return { ok: true };
  }

  const expected = getOrCreateStudioToken();

  const header = req.headers.get("authorization") ?? "";
  let presented = "";
  if (header.toLowerCase().startsWith("bearer ")) {
    presented = header.slice(7).trim();
  } else {
    // EventSource cannot set Authorization in browsers -- fall back to query.
    presented = url.searchParams.get("token") ?? "";
  }

  if (!presented) {
    return {
      ok: false,
      reason: "UNAUTHORIZED",
      status: 401,
      message: "Missing bearer token",
      fix: `Send Authorization: Bearer <token> (or ?token= for EventSource). Token at ${TOKEN_PATH}`,
    };
  }

  if (!safeEqual(presented, expected)) {
    return {
      ok: false,
      reason: "UNAUTHORIZED",
      status: 401,
      message: "Invalid bearer token",
      fix: `Token at ${TOKEN_PATH} -- restart studio to rotate`,
    };
  }

  return { ok: true };
}

/**
 * Returns true if the studio is running with auth disabled. Used at boot
 * to print a loud warning. Do not gate features on this.
 */
export function authIsDisabled(): boolean {
  return process.env.MKTG_STUDIO_AUTH === "disabled";
}
