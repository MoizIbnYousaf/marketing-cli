// tests/integration/helpers.ts — shared integration harness
//
// Spawns `bun run server.ts` on a port allocated per-suite so multiple
// integration files can run in parallel without clashes. Returns a handle
// that exposes the base URL and a kill() hook for teardown.

import { spawn, type Subprocess } from "bun";
import { join } from "node:path";

export interface ServerHandle {
  baseUrl: string;
  port: number;
  proc: Subprocess;
  kill: () => Promise<void>;
}

const REPO_ROOT = join(import.meta.dir, "..", "..");

export async function startTestServer(port: number): Promise<ServerHandle> {
  const proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: REPO_ROOT,
    env: { ...process.env, STUDIO_PORT: String(port) },
    stdout: "pipe",
    stderr: "pipe",
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  const start = Date.now();
  while (Date.now() - start < 15_000) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return {
          baseUrl,
          port,
          proc,
          kill: async () => {
            proc.kill("SIGINT");
            await proc.exited;
          },
        };
      }
    } catch {
      // retry
    }
    await Bun.sleep(100);
  }

  proc.kill("SIGKILL");
  throw new Error(`test server on port ${port} did not boot within 15s`);
}

/**
 * Strict error envelope shape — mirrors `lib/output.ts::errEnv` exactly.
 */
export function isErrorEnvelope(body: unknown): body is {
  ok: false;
  error: { code: string; message: string; fix?: string };
} {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.ok !== false) return false;
  const err = b.error;
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

export const STUDIO_ERROR_CODES = new Set([
  "BAD_INPUT",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "UPSTREAM_FAILED",
  "PARSE_ERROR",
  "INTERNAL",
  "DRY_RUN_ONLY",
  "CONFIRM_REQUIRED",
]);
