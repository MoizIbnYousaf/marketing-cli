// server.ts — mktg-studio local backend
//
// Bun.serve entry point. Bridges:
//   Next.js dashboard ← SSE → Bun server → mktg CLI / /cmo / SQLite
//
// Port: STUDIO_PORT env var (default 3001)
// CORS: localhost:3000 (Next.js dev server)
//
// Agent DX contract (21/21):
//   - Every route returns typed JSON or SSE
//   - Every POST validates input with zod
//   - ?dryRun=true supported on all mutating endpoints
//   - /api/schema for runtime self-discovery
//   - Input hardened via lib/validators.ts

// Side-effect import: installs `uncaughtException` + `unhandledRejection`
// handlers so silent Bun exits become visible stack traces (T31).
// Must be the first import — installs handlers before anything else can throw.
import "./lib/crash-handlers.ts";

import { z } from "zod";
import { getDb, closeDb, queryAll, queryOne, execute } from "./lib/sqlite.ts";
import { globalEmitter, getJobEmitter } from "./lib/sse.ts";
import { startBrandWatcher, startContentWatcher, stopBrandWatcher, stopContentWatcher } from "./lib/watcher.ts";
import { startZombieSweeper } from "./lib/sweep.ts";
import { backupBrandDir } from "./lib/brand-backup.ts";
import { createJob, runJob, getJob, listJobs, cancelJob } from "./lib/jobs.ts";
import {
  rejectControlChars,
  validateResourceId,
  validatePathInput,
} from "./lib/validators.ts";
import { basename, join } from "node:path";
import { writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { diagnosePostiz, getScheduledPosts, mapPostizError } from "./lib/postiz.ts";
import {
  mktgList,
  mktgSkillInfo,
  mktgCatalogList,
  mktgCatalogStatus,
  mktgCatalogInfo,
  mktgStatus,
  mktgPublishListAdapters,
  mktgPublishListIntegrations,
  mktgPublishNativeAccount,
  mktgPublishNativeListPosts,
  mktgPublishNativeUpsertProvider,
  mktgPublish,
} from "./lib/mktg.ts";
import type { PublishManifest } from "./lib/types/mktg.ts";
import {
  errEnv,
  applyFieldsFromUrl,
  ndjsonResponse,
  wantsNDJSON,
  type StudioErrorCode,
} from "./lib/output.ts";
import { wrapRoute, checkRateLimit } from "./lib/dx.ts";
import {
  startFoundation,
  FOUNDATION_AGENTS,
  AGENT_TO_FILE,
} from "./lib/foundation.ts";
import {
  registerRouteSchema,
  enrichRouteSchema,
  enrichRouteEntry,
} from "./lib/schema-export.ts";
import {
  BRAND_FILE_NAMES,
  listBrandFiles,
  readBrandFile,
  writeBrandFile,
  resolveBrandPath,
  getSpec as getBrandSpec,
} from "./lib/brand-files.ts";
import { resolveProjectPath, resolveProjectRoot, resolveStudioDbPath } from "./lib/project-root.ts";
import {
  assertProjectMediaPath,
  buildContentManifest,
  classifyContentAssetKind,
  contentMimeType,
  loadContentMeta,
  readContentFile,
  writeContentFile,
  writeContentMeta,
  type ContentAssetMeta,
  type ContentGroupMeta,
} from "./lib/content-manifest.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.STUDIO_PORT ?? "3001", 10);
const STUDIO_CWD = resolveProjectRoot(process.cwd());

const readEnvFile = (root: string): Record<string, string> => {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return {};
  const env: Record<string, string> = {};
  for (const raw of readFileSync(envPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const applyProjectEnvIsolation = (): void => {
  const repoRoot = process.cwd();
  const repoEnv = readEnvFile(repoRoot);
  const projectEnv = readEnvFile(STUDIO_CWD);
  if (STUDIO_CWD !== repoRoot) {
    for (const [key, value] of Object.entries(repoEnv)) {
      if (projectEnv[key] === undefined && process.env[key] === value) {
        delete process.env[key];
      }
    }
  }
  for (const [key, value] of Object.entries(projectEnv)) {
    process.env[key] = value;
  }
};

applyProjectEnvIsolation();
// Origins allowed to make cross-origin requests (CORS + EventSource). The
// dev dashboard runs on :3000; Playwright's scratch dashboard on :4800. Add
// new entries here when integrating a fresh frontend host.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4840",
  "http://127.0.0.1:4840",
  "http://localhost:4800",
  "http://127.0.0.1:4800",
]);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

console.log("[server] Initializing database...");
getDb();
console.log("[server] Database ready.");

startBrandWatcher(globalEmitter);
startContentWatcher(globalEmitter, STUDIO_CWD);

// Zombie-run sweeper — every 60s, flip skill_runs rows stuck in 'running'
// for >5 minutes to 'abandoned' and broadcast `skill-abandoned` over SSE so
// dashboards can unstick the activity panel spinner. Covers the /cmo-crash
// / Claude-Code-reload scenario where the skill wrapper's cleanup never
// ran (A14 / H1-33 / H1-90). /cmo emits its own 'skill-complete abandoned'
// on graceful-interrupt paths; this is the safety net.
startZombieSweeper(getDb(), (rows) => {
  for (const r of rows) {
    globalEmitter.publish("*", {
      type: "skill-abandoned",
      payload: { id: r.id, skill: r.skill, createdAt: r.createdAt, ageMs: r.ageMs },
    });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED_ORIGINS.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    : {};
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function assetContentType(path: string): string {
  return contentMimeType(path);
}

function parseByteRange(rangeHeader: string | null, size: number):
  | { ok: true; start: number; end: number }
  | { ok: false } {
  if (!rangeHeader) return { ok: false };
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return { ok: false };
  const [, startRaw = "", endRaw = ""] = match;
  if (!startRaw && !endRaw) return { ok: false };

  let start: number;
  let end: number;
  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return { ok: false };
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : size - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    return { ok: false };
  }
  return { ok: true, start, end: Math.min(end, size - 1) };
}

function serveProjectAsset(
  req: Request,
  relativePath: string,
  corsHeaders: Record<string, string>,
): Response {
  const ctrl = rejectControlChars(relativePath, "path");
  if (!ctrl.ok) return err(ctrl.message, 400, corsHeaders);

  const resolved = assertProjectMediaPath(relativePath, STUDIO_CWD);
  if (!resolved.ok) {
    const status = resolved.message.includes("does not exist") ? 404 : 400;
    return errResponse(
      status === 404 ? "NOT_FOUND" : "PATH_TRAVERSAL",
      resolved.message,
      status,
      undefined,
      corsHeaders,
    );
  }

  const stat = statSync(resolved.abs);
  const contentType = assetContentType(resolved.abs);
  const baseHeaders = {
    ...corsHeaders,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "ETag": `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`,
    "Last-Modified": stat.mtime.toUTCString(),
  };
  const range = parseByteRange(req.headers.get("range"), stat.size);
  if (range.ok) {
    const chunkSize = range.end - range.start + 1;
    return new Response(Bun.file(resolved.abs).slice(range.start, range.end + 1), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  }

  if (req.headers.has("range")) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${stat.size}`,
      },
    });
  }

  return new Response(Bun.file(resolved.abs), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(stat.size),
    },
  });
}

const PROJECT_LOGO_CANDIDATES = [
  "brand/logo.png",
  "brand/logo.jpg",
  "brand/logo.jpeg",
  "brand/logo.webp",
  "brand/logo.svg",
  "brand/assets/logo.png",
  "brand/assets/logo.jpg",
  "brand/assets/logo.jpeg",
  "brand/assets/logo.webp",
  "brand/assets/logo.svg",
  "public/logo.png",
  "public/logo.jpg",
  "public/logo.jpeg",
  "public/logo.webp",
  "public/logo.svg",
  "public/favicon.ico",
  "public/favicon.png",
  "public/icon.png",
  "app/favicon.ico",
  "app/icon.png",
  "src/app/favicon.ico",
  "src/app/icon.png",
  "favicon.ico",
];

function projectInitials(name: string): string {
  const parts = name
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "MK";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? "M"}${parts[1]![0] ?? "K"}`.toUpperCase();
}

function rootLabel(root: string): string {
  return basename(root) || root;
}

function discoverProjectLogo(projectName: string):
  | { kind: "image"; path: string; url: string; contentType: string }
  | { kind: "initials"; initials: string } {
  for (const candidate of PROJECT_LOGO_CANDIDATES) {
    const resolved = resolveProjectPath(candidate, STUDIO_CWD);
    if (!resolved.ok) continue;
    try {
      if (!existsSync(resolved.abs) || !statSync(resolved.abs).isFile()) continue;
      return {
        kind: "image",
        path: resolved.rel,
        url: `/api/assets/file?path=${encodeURIComponent(resolved.rel)}`,
        contentType: assetContentType(resolved.abs),
      };
    } catch {
      continue;
    }
  }
  return { kind: "initials", initials: projectInitials(projectName) };
}

function countNativePublishState(root: string): { configured: boolean; providerCount: number; postCount: number } {
  const readArrayCount = (path: string, key: "providers" | "posts"): number => {
    if (!existsSync(path)) return 0;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
      const value = parsed[key];
      return Array.isArray(value) ? value.length : 0;
    } catch {
      return 0;
    }
  };

  const accountPath = join(root, ".mktg", "native-publish", "account.json");
  const providersPath = join(root, ".mktg", "native-publish", "providers.json");
  const postsPath = join(root, ".mktg", "native-publish", "posts.json");

  return {
    configured: existsSync(accountPath),
    providerCount: readArrayCount(providersPath, "providers"),
    postCount: readArrayCount(postsPath, "posts"),
  };
}

/**
 * Build a structured error response (axis 7).
 * The wire shape is `{ok:false, error:{code, message, fix?}}`.
 *
 * `code` is required and must be one of the `StudioErrorCode` enum values so
 * agents can branch on the failure mode without parsing prose. `fix` is a
 * single-line, agent-actionable hint for recovery.
 *
 * Most call sites use the lowercase `err()` shorthand which defaults to
 * `BAD_INPUT` at HTTP 400.
 */
function errResponse(
  code: StudioErrorCode,
  message: string,
  status: number,
  fix?: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return json(errEnv(code, message, fix), status, extraHeaders);
}

function err(
  message: string,
  status = 400,
  extraHeaders: Record<string, string> = {},
  fix?: string,
): Response {
  const code: StudioErrorCode =
    status === 401 ? "UNAUTHORIZED" :
    status === 404 ? "NOT_FOUND" :
    status === 429 ? "RATE_LIMITED" :
    status >= 500 ? "INTERNAL" :
    "BAD_INPUT";
  return errResponse(code, message, status, fix, extraHeaders);
}

async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  try {
    const raw = await req.text();
    // Promote ZodObject schemas to strict mode so unknown fields are rejected
    // at the wire instead of silently stripped (audit P2-A, mirrors
    // lib/dx.ts::parseBodyStrict). Keeps the runtime in sync with the
    // `additionalProperties: false` that GET /api/schema advertises.
    const maybeStrict = schema as unknown as { strict?: () => z.ZodSchema<T> };
    const strictSchema =
      typeof maybeStrict.strict === "function" ? maybeStrict.strict() : schema;
    const check = strictSchema.safeParse(JSON.parse(raw));
    if (!check.success) {
      const issues = check.error.issues;
      const message = issues.map((e) => e.message).join("; ");
      const fields = issues
        .map((e) => (e.path.length > 0 ? e.path.join(".") : "(root)"))
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .join(", ");
      return {
        ok: false,
        res: errResponse(
          "BAD_INPUT",
          message,
          400,
          fields ? `Check field(s): ${fields}` : "Check the request body shape",
        ),
      };
    }
    return { ok: true, data: check.data };
  } catch {
    return {
      ok: false,
      res: errResponse(
        "BAD_INPUT",
        "Invalid JSON body",
        400,
        "Send a UTF-8 JSON object as the request body",
      ),
    };
  }
}

function isDryRun(url: URL): boolean {
  return url.searchParams.get("dryRun") === "true";
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeContentAssetPatch(patch: Record<string, unknown>): ContentAssetMeta {
  const out: ContentAssetMeta = {};
  if (typeof patch.title === "string") out.title = patch.title.slice(0, 240);
  if (
    patch.status === "draft" ||
    patch.status === "approved" ||
    patch.status === "published" ||
    patch.status === "archived"
  ) {
    out.status = patch.status;
  }
  if (Array.isArray(patch.tags)) {
    out.tags = patch.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 40);
  }
  if (typeof patch.orderKey === "string") out.orderKey = patch.orderKey.slice(0, 128);
  if (typeof patch.groupId === "string") out.groupId = patch.groupId.slice(0, 128);
  if (Array.isArray(patch.linkedMarkdownPaths)) {
    out.linkedMarkdownPaths = patch.linkedMarkdownPaths
      .filter((path): path is string => typeof path === "string")
      .slice(0, 40);
  }
  if (typeof patch.notes === "string") out.notes = patch.notes.slice(0, 8_000);
  out.updatedAt = new Date().toISOString();
  return out;
}

function sanitizeContentGroupPatch(
  id: string,
  existing: ContentGroupMeta | undefined,
  patch: Record<string, unknown>,
): ContentGroupMeta {
  return {
    title: typeof patch.title === "string" && patch.title.trim()
      ? patch.title.slice(0, 160)
      : existing?.title ?? id,
    orderKey: typeof patch.orderKey === "string"
      ? patch.orderKey.slice(0, 128)
      : existing?.orderKey,
  };
}

/**
 * Respond to a list-style GET with field-mask + NDJSON support (axis 4).
 *
 * - `Accept: application/x-ndjson` → newline-delimited JSON, one item per line
 * - `?fields=a,b.c` → server-side projection; unknown fields return BAD_INPUT
 *   listing what is available
 * - default → standard `{ok:true, data:[...]}` envelope
 *
 * The field mask runs before NDJSON serialization so both transports project
 * the same shape.
 */
function respondList<T>(
  req: Request,
  url: URL,
  items: readonly T[],
  corsHeaders: Record<string, string>,
): Response {
  const filtered = applyFieldsFromUrl(items, url);
  if (!filtered.ok) {
    return json({ ok: false, error: filtered.error }, filtered.status, corsHeaders);
  }
  const projected = filtered.data;

  if (wantsNDJSON(req)) {
    const arr = Array.isArray(projected) ? projected : [projected];
    return ndjsonResponse(arr, corsHeaders);
  }

  return json({ ok: true, data: projected }, 200, corsHeaders);
}

/**
 * Respond to a single-object GET with field-mask support (axis 4).
 * NDJSON doesn't apply for single-object responses.
 */
function respondObject<T>(
  url: URL,
  data: T,
  corsHeaders: Record<string, string>,
  extras: Record<string, unknown> = {},
): Response {
  const filtered = applyFieldsFromUrl(data, url);
  if (!filtered.ok) {
    return json({ ok: false, error: filtered.error }, filtered.status, corsHeaders);
  }
  return json({ ok: true, data: filtered.data, ...extras }, 200, corsHeaders);
}

function respondMktgError(
  result: { error: { code: string; message: string; suggestions: readonly string[] } },
  corsHeaders: Record<string, string>,
): Response {
  const code: StudioErrorCode =
    result.error.code === "AUTH_MISSING" || result.error.code === "AUTH_INVALID"
      ? "UNAUTHORIZED"
      : result.error.code === "RATE_LIMITED"
        ? "RATE_LIMITED"
        : result.error.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : "UPSTREAM_FAILED";
  const status =
    code === "UNAUTHORIZED"
      ? 401
      : code === "NOT_FOUND"
        ? 404
        : code === "RATE_LIMITED"
          ? 429
          : 502;
  const fix = result.error.suggestions?.[0] ?? undefined;
  return errResponse(code, result.error.message, status, fix, corsHeaders);
}

// ---------------------------------------------------------------------------
// Route schema (for /api/schema — Agent DX axis 3)
// ---------------------------------------------------------------------------

const ROUTE_SCHEMA = [
  // Health + meta
  { method: "GET",  path: "/api/health",                  description: "Server health check" },
  { method: "GET",  path: "/api/project/current",         description: "Active local marketing project identity, launch context, and health" },
  { method: "GET",  path: "/api/schema",                  description: "Runtime route schema for agent self-discovery", params: ["route"] },
  { method: "GET",  path: "/api/help",                    description: "Agent cheat-sheet: envelopes, error codes, query params, entry points" },

  // HQ legacy signal endpoints
  { method: "GET",  path: "/api/pulse/decision-feed",     description: "Decision feed cards (brand status + next action)", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/what-changed",      description: "Recent brand file changes", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/spike-stack",       description: "Spike signal stack", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/fresh-intel",       description: "Fresh intelligence from signals", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/social-highlights", description: "Social performance highlights", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/archetype-cards",   description: "Audience archetype cards", params: ["groupId"] },
  { method: "GET",  path: "/api/pulse/live-proof",        description: "Live social proof feed", params: ["groupId"] },

  // Signals / Trend radar
  { method: "GET",  path: "/api/trends/hot-context",      description: "Hot market context (landscape + competitors)", params: ["groupId"] },
  { method: "GET",  path: "/api/trends/feed",             description: "Trends feed", params: ["groupId"] },

  // Signals tab
  { method: "GET",  path: "/api/signals",                 description: "Signal feed with optional filter", params: ["filter", "platform", "stream", "time"] },
  { method: "GET",  path: "/api/signals/:id",             description: "Get signal by id" },
  { method: "GET",  path: "/api/signals/baseline",        description: "Metric baselines" },
  { method: "POST", path: "/api/signals/dismiss",         description: "Dismiss a signal", body: { id: "number" }, dryRun: true, errors: ["BAD_INPUT", "NOT_FOUND", "RATE_LIMITED"] },
  { method: "POST", path: "/api/signals/approve",         description: "Approve a signal", body: { id: "number" }, dryRun: true, errors: ["BAD_INPUT", "NOT_FOUND", "RATE_LIMITED"] },
  { method: "POST", path: "/api/signals/flag",            description: "Flag a signal with reason", body: { id: "number", reason: "string" }, dryRun: true, errors: ["BAD_INPUT", "NOT_FOUND", "RATE_LIMITED"] },

  // HQ audience summary
  { method: "GET",  path: "/api/audience/profiles",       description: "Parsed audience persona cards", params: ["groupId"] },

  // HQ next actions
  { method: "GET",  path: "/api/opportunities",           description: "Ranked action opportunities from /cmo", params: ["groupId"] },

  // Intelligence + Briefs
  { method: "GET",  path: "/api/intelligence/latest",     description: "Latest intelligence briefs", params: ["groupId"] },
  { method: "GET",  path: "/api/briefs",                  description: "All generated briefs", params: ["groupId"] },
  { method: "GET",  path: "/api/research/active",         description: "Active research jobs", params: ["groupId"] },

  // Skills
  { method: "GET",  path: "/api/skills",                  description: "All 50 skills from mktg list --json --routing" },
  { method: "GET",  path: "/api/skills/:name",            description: "Single skill detail" },
  { method: "POST", path: "/api/skill/run",               description: "Queue a skill execution via /cmo", body: { name: "string", args: "object?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },

  // Jobs
  { method: "GET",  path: "/api/jobs/:id",                description: "Job status by id" },
  { method: "GET",  path: "/api/jobs/:id/stream",         description: "SSE stream of job events" },

  // /cmo
  { method: "POST", path: "/api/cmo/playbook",            description: "Queue a named /cmo playbook", body: { name: "string" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },

  // Setup / onboarding
  { method: "POST", path: "/api/init",                    description: "Initialize mktg project (mktg init)", body: { from: "string?" }, dryRun: true, errors: ["BAD_INPUT", "UPSTREAM_FAILED", "RATE_LIMITED"] },
  { method: "POST", path: "/api/settings/env",            description: "Write API keys to .env.local", body: { "[key]": "string" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "GET",  path: "/api/settings/env/status",     description: "Per-key set/unset map for known env vars (NEVER returns values)", params: ["fields"], errors: [] },
  { method: "POST", path: "/api/onboarding/foundation",   description: "Spawn 3 foundation research agents in parallel; emits foundation:progress + foundation:complete SSE events", body: { from: "string?", seed: "boolean?" }, dryRun: true, errors: ["BAD_INPUT", "UPSTREAM_FAILED", "RATE_LIMITED"] },
  { method: "GET",  path: "/api/onboarding/stream",       description: "SSE stream of foundation agent progress (filter on the global stream)" },
  { method: "POST", path: "/api/brand/refresh",           description: "Re-run the foundation research skills (same plumbing as /api/onboarding/foundation)", body: { from: "string?", seed: "boolean?" }, dryRun: true, errors: ["BAD_INPUT", "UPSTREAM_FAILED", "RATE_LIMITED"] },
  { method: "POST", path: "/api/brand/reset",             description: "Wipe brand/ files back to templates. Destructive — requires ?confirm=true", body: {}, dryRun: true, confirm: true, errors: ["BAD_INPUT", "UPSTREAM_FAILED", "RATE_LIMITED"] },

  // Brand docs editor
  { method: "GET",  path: "/api/brand/files",             description: "List every brand/*.md file with freshness chips (fresh|stale|template|missing)", params: ["fields"], accepts: ["application/x-ndjson"], errors: [] },
  { method: "GET",  path: "/api/brand/read",              description: "Read a single brand file's content + mtime (optimistic-lock support)", params: ["file", "fields"], errors: ["BAD_INPUT", "PATH_TRAVERSAL", "NOT_FOUND"] },
  { method: "GET",  path: "/api/assets/file",             description: "Serve a project-local asset file for studio previews", params: ["path"], errors: ["BAD_INPUT", "PATH_TRAVERSAL", "NOT_FOUND"] },
  { method: "POST", path: "/api/brand/write",             description: "Atomic write with mtime-conflict detection. Fires brand-file-changed + activity-new on success. CONFLICT (HTTP 409) when expectedMtime mismatches.", body: { file: "string", content: "string", expectedMtime: "string?" }, dryRun: true, errors: ["BAD_INPUT", "PATH_TRAVERSAL", "CONFLICT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/brand/regenerate",        description: "Queue the owning skill (per brand/SCHEMA.md) to re-research a single file. Returns jobId; /cmo executes.", body: { file: "string" }, dryRun: true, errors: ["BAD_INPUT", "PATH_TRAVERSAL", "RATE_LIMITED"] },

  // Content workspace
  { method: "GET",  path: "/api/cmo/content/manifest",    description: "Rebuildable local content manifest from markdown, media files, and .cmo/content.meta.json", params: ["fields"], errors: ["BAD_INPUT"] },
  { method: "GET",  path: "/api/cmo/content/file",        description: "Read a project-local markdown/text artifact for source editing", params: ["path", "fields"], errors: ["BAD_INPUT", "PATH_TRAVERSAL", "NOT_FOUND"] },
  { method: "PUT",  path: "/api/cmo/content/file",        description: "Write a project-local markdown/text artifact with optional mtime conflict detection", body: { path: "string", content: "string", expectedMtime: "string?" }, dryRun: true, errors: ["BAD_INPUT", "PATH_TRAVERSAL", "CONFLICT", "RATE_LIMITED"] },
  { method: "GET",  path: "/api/cmo/content/media",       description: "Serve project-local media with HTTP Range support for video preview/seek", params: ["path"], errors: ["BAD_INPUT", "PATH_TRAVERSAL", "NOT_FOUND"] },
  { method: "GET",  path: "/api/cmo/content/events/stream", description: "SSE stream for content-file-changed manifest invalidation" },
  { method: "PATCH", path: "/api/cmo/content/meta",       description: "Patch .cmo/content.meta.json asset/group metadata", body: { assetId: "string?", groupId: "string?", patch: "object" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/cmo/content/reindex",     description: "Rebuild and return the content manifest", body: {}, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },

  // Publish tab
  { method: "GET",  path: "/api/publish/adapters",        description: "List available publish adapters", params: ["fields"], accepts: ["application/x-ndjson"] },
  { method: "GET",  path: "/api/publish/integrations",    description: "List connected postiz providers", params: ["adapter", "fields"], accepts: ["application/x-ndjson"] },
  { method: "GET",  path: "/api/publish/postiz/diagnostics", description: "Postiz self-host/hosted connection diagnostics", params: ["fields"] },
  { method: "GET",  path: "/api/publish/scheduled",       description: "Scheduled + published posts from the selected adapter", params: ["adapter", "startDate", "endDate", "fields"], accepts: ["application/x-ndjson"] },
  { method: "GET",  path: "/api/publish/history",         description: "Publish history from local SQLite publish_log", params: ["limit", "offset", "fields"], accepts: ["application/x-ndjson"] },
  { method: "POST", path: "/api/publish",                 description: "Publish content via adapter", body: { adapter: "string", manifest: "object", confirm: "boolean?" }, dryRun: true, errors: ["BAD_INPUT", "UPSTREAM_FAILED", "RATE_LIMITED"] },
  { method: "GET",  path: "/api/publish/native/account",  description: "Local mktg-native workspace account and API key summary" },
  { method: "POST", path: "/api/publish/native/providers",description: "Create or update a local mktg-native provider", body: { id: "string?", identifier: "string", name: "string", profile: "string", picture: "string?", disabled: "boolean?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },

  // /cmo → studio control surface
  { method: "POST", path: "/api/activity/log",            description: "Log an activity entry from /cmo (skill run, brand write, etc.)", body: { kind: "string", skill: "string?", summary: "string", detail: "string?", filesChanged: "string[]?", meta: "object?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "DELETE", path: "/api/activity/:id",          description: "Delete one activity row by id. Destructive — requires ?confirm=true. Fires `activity-deleted` SSE.", dryRun: true, confirm: true, errors: ["BAD_INPUT", "CONFIRM_REQUIRED", "NOT_FOUND", "RATE_LIMITED"] },
  { method: "GET",  path: "/api/activity",                description: "Recent activity entries", params: ["kind", "skill", "limit", "offset", "fields"], accepts: ["application/x-ndjson"] },
  { method: "POST", path: "/api/opportunities/push",      description: "Push a recommended action onto HQ next actions", body: { skill: "string", reason: "string", priority: "number?", prerequisites: "object?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/navigate",                description: "Tell the dashboard to switch tabs", body: { tab: "string", filter: "object?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/toast",                   description: "Show a transient toast notification", body: { level: "string", message: "string", duration: "number?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/highlight",               description: "Highlight a tab/element to draw user attention", body: { tab: "string", selector: "string?", reason: "string?" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },
  { method: "POST", path: "/api/brand/note",              description: "Note that /cmo wrote a brand file excerpt (for activity feed)", body: { file: "string", excerpt: "string" }, dryRun: true, errors: ["BAD_INPUT", "RATE_LIMITED"] },

  // Events
  { method: "GET",  path: "/api/events",                  description: "Global SSE stream (brand changes, skill completions)" },

  // Catalog
  { method: "GET",  path: "/api/catalog/list",            description: "List all upstream catalogs" },
  { method: "GET",  path: "/api/catalog/info/:name",      description: "Catalog detail by name" },
  { method: "GET",  path: "/api/catalog/status",          description: "Catalog health status" },
];

// ---------------------------------------------------------------------------
// wrapRoute migration (Agent DX 21/21 — T4)
//
// `wrapRoute` from lib/dx.ts is the single source of truth for the route
// contract: error envelope, dryRun, fields, NDJSON, rate limit, access log.
// Handlers below opt in for that uniformity. The remaining inline if-blocks
// in the dispatcher either:
//   - serve SSE (which bypasses the JSON envelope), or
//   - return shapes that wrapRoute can't represent yet (degraded reads,
//     job creation with custom top-level fields, path-param routes that
//     need a regex match before invocation).
// Each opt-in route below has the same wire contract as before with one
// uniformity change: success bodies are `{ok:true, data:T}` (no extra
// top-level fields like `id` — those nest into `data`).
// ---------------------------------------------------------------------------

const HEALTH_ROUTE = wrapRoute<undefined, {
  version: string;
  ts: string;
  subscribers: number;
}>({
  method: "GET",
  handler: async () => ({
    ok: true,
    data: {
      version: "0.1.0",
      ts: new Date().toISOString(),
      subscribers: globalEmitter.size,
    },
  }),
});

const ACTIVITY_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async (_input, ctx) => {
    const kind = ctx.url.searchParams.get("kind");
    const skill = ctx.url.searchParams.get("skill");
    const limit = Math.min(
      Math.max(parseInt(ctx.url.searchParams.get("limit") ?? "50", 10) || 50, 1),
      500,
    );
    const offset = Math.max(
      parseInt(ctx.url.searchParams.get("offset") ?? "0", 10) || 0,
      0,
    );

    const where: string[] = [];
    const params: unknown[] = [];
    if (kind) {
      const c = rejectControlChars(kind, "kind");
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
      where.push("kind = ?");
      params.push(kind);
    }
    if (skill) {
      const c = rejectControlChars(skill, "skill");
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
      where.push("skill = ?");
      params.push(skill);
    }

    let sql = "SELECT id, kind, skill, summary, detail, files_changed, meta, created_at FROM activity";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = queryAll<{
      id: number;
      kind: string;
      skill: string | null;
      summary: string;
      detail: string | null;
      files_changed: string | null;
      meta: string | null;
      created_at: string;
    }>(sql, params);

    return {
      ok: true as const,
      data: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        skill: r.skill,
        summary: r.summary,
        detail: r.detail,
        filesChanged: r.files_changed ? safeJsonParse<string[]>(r.files_changed, []) : [],
        meta: r.meta ? safeJsonParse<Record<string, unknown> | null>(r.meta, null) : null,
        createdAt: r.created_at,
      })),
    };
  },
});

// ActivityKind — the canonical set of /cmo event types. Mirrors the Activity
// type in lib/types/activity.ts and the icon mapping in
// components/workspace/activity-panel/activity-item.tsx. Anything outside this
// set should fail BAD_INPUT instead of writing a row the UI can't render.
const ACTIVITY_LOG_BODY = z.object({
  kind: z.enum([
    "skill-run",
    "brand-write",
    "publish",
    "toast",
    "navigate",
    "audit",
    "note",
    "custom",
  ]),
  skill: z.string().min(1).max(128).optional(),
  summary: z.string().min(1).max(500),
  detail: z.string().max(8_000).optional(),
  filesChanged: z.array(z.string().max(512)).max(50).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const ACTIVITY_LOG_ROUTE = wrapRoute<z.infer<typeof ACTIVITY_LOG_BODY>, {
  id: number;
  kind: string;
  skill: string | null;
  summary: string;
  detail: string | null;
  filesChanged: string[];
  meta: Record<string, unknown> | null;
  createdAt: string;
}>({
  method: "POST",
  inputSchema: ACTIVITY_LOG_BODY,
  dryRun: true,
  handler: async (input) => {
    for (const [field, value] of Object.entries({
      kind: input.kind,
      summary: input.summary,
      detail: input.detail ?? "",
      skill: input.skill ?? "",
    })) {
      const c = rejectControlChars(value, field);
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
    }
    if (input.skill) {
      const idCheck = validateResourceId(input.skill, "skill");
      if (!idCheck.ok) {
        return { ok: false as const, code: "INVALID_RESOURCE_ID" as const, message: idCheck.message };
      }
    }

    const result = execute(
      `INSERT INTO activity (kind, skill, summary, detail, files_changed, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.kind,
        input.skill ?? null,
        input.summary,
        input.detail ?? null,
        input.filesChanged ? JSON.stringify(input.filesChanged) : null,
        input.meta ? JSON.stringify(input.meta) : null,
      ],
    );

    const id = Number(result.lastInsertRowid);
    const payload = {
      id,
      kind: input.kind,
      skill: input.skill ?? null,
      summary: input.summary,
      detail: input.detail ?? null,
      filesChanged: input.filesChanged ?? [],
      meta: input.meta ?? null,
      createdAt: new Date().toISOString(),
    };

    globalEmitter.publish("*", { type: "activity-new", payload });

    return { ok: true as const, data: payload };
  },
});

// DELETE /api/activity/:id?confirm=true — destructive removal of one activity
// row. wrapRoute's `destructive: true` auto-gates on `?confirm=true`; without
// it the request returns `{ok:false, error:{code:"CONFIRM_REQUIRED"}}`. The
// handler reads :id from the URL path (set by the dispatcher), 404s when the
// row isn't there, otherwise deletes + emits an `activity-deleted` SSE event
// so the Activity panel can drop the row in real time.
const ACTIVITY_DELETE_ROUTE = wrapRoute<undefined, { id: number; deleted: true }>({
  method: "DELETE",
  destructive: true,
  dryRun: true,
  handler: async (_input, ctx) => {
    const match = ctx.url.pathname.match(/^\/api\/activity\/(\d+)$/);
    if (!match) {
      return { ok: false as const, code: "BAD_INPUT" as const, message: "Path must be /api/activity/:id where :id is a positive integer" };
    }
    const id = Number(match[1]);
    const row = queryOne<{ id: number }>("SELECT id FROM activity WHERE id = ?", [id]);
    if (!row) {
      return { ok: false as const, code: "NOT_FOUND" as const, message: `activity row ${id} does not exist`, status: 404, fix: "GET /api/activity to list valid ids" };
    }
    execute("DELETE FROM activity WHERE id = ?", [id]);
    globalEmitter.publish("*", { type: "activity-deleted", payload: { id } });
    return { ok: true as const, data: { id, deleted: true as const } };
  },
});

// Shared wrapped handlers for empty-stub GETs (HQ legacy signal routes, Trends, Audience, etc.)
// Each returns `{ok:true, data:[]}` and inherits the wrapper's contract:
// fields projection, NDJSON streaming, structured errors, access logging.
const EMPTY_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({ ok: true as const, data: [] as unknown[] }),
});

const TRENDS_HOT_CONTEXT_ROUTE = wrapRoute({
  method: "GET",
  handler: async () => ({ ok: true as const, data: null }),
});

const SIGNALS_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async (_input, ctx) => {
    const platform = ctx.url.searchParams.get("platform");
    const feedback = ctx.url.searchParams.get("filter");
    const where: string[] = [];
    const params: unknown[] = [];
    if (platform) {
      const c = rejectControlChars(platform, "platform");
      if (!c.ok) return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      where.push("platform = ?");
      params.push(platform);
    }
    if (feedback) {
      const c = rejectControlChars(feedback, "filter");
      if (!c.ok) return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      where.push("feedback = ?");
      params.push(feedback);
    }
    let sql = "SELECT * FROM signals";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY severity DESC, created_at DESC LIMIT 100";
    const rows = queryAll<Record<string, unknown>>(sql, params);
    return { ok: true as const, data: rows.map(normalizeSignalRow) };
  },
});

function normalizeSignalSeverity(value: unknown): "p0" | "p1" | "watch" | "negative" | "neutral" {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "neutral";
  if (numeric >= 80) return "p0";
  if (numeric >= 60) return "p1";
  if (numeric >= 40) return "watch";
  if (numeric < 0) return "negative";
  return "neutral";
}

function normalizeSignalRow(row: Record<string, unknown>) {
  const createdAt =
    typeof row.created_at === "string"
      ? new Date(row.created_at.endsWith("Z") ? row.created_at : `${row.created_at}Z`).toISOString()
      : new Date().toISOString();
  const updatedAt =
    typeof row.updated_at === "string"
      ? new Date(row.updated_at.endsWith("Z") ? row.updated_at : `${row.updated_at}Z`).toISOString()
      : createdAt;
  const capturedAt = Date.parse(createdAt);
  const metadata = safeJsonParse<Record<string, unknown>>(typeof row.metadata === "string" ? row.metadata : "{}", {});
  const content = typeof row.content === "string" ? row.content.replace(/^demo:\s*/i, "") : null;
  const canonicalUrl = typeof row.url === "string" ? row.url : null;
  const spikeDetected = row.spike_detected === 1 || row.spike_detected === true;
  const severity = normalizeSignalSeverity(row.severity);

  return {
    id: String(row.id),
    platform: typeof row.platform === "string" ? row.platform : "news",
    content,
    url: canonicalUrl,
    canonicalUrl,
    severity,
    spikeMultiplier:
      typeof metadata.spikeMultiplier === "number"
        ? metadata.spikeMultiplier
        : spikeDetected && typeof row.severity === "number" && row.severity > 0
          ? Math.max(1, row.severity / 20)
          : undefined,
    spikeDetected,
    feedback: typeof row.feedback === "string" ? row.feedback : "pending",
    feedbackAt:
      typeof metadata.feedbackAt === "number"
        ? metadata.feedbackAt
        : undefined,
    metadata: typeof row.metadata === "string" ? row.metadata : null,
    capturedAt: Number.isFinite(capturedAt) ? capturedAt : Date.now(),
    createdAt,
    updatedAt,
    title: typeof metadata.title === "string" ? metadata.title : undefined,
    authorHandle: typeof metadata.authorHandle === "string" ? metadata.authorHandle : null,
    externalId: typeof metadata.externalId === "string" ? metadata.externalId : null,
    hashtags: Array.isArray(metadata.hashtags)
      ? metadata.hashtags.filter((tag): tag is string => typeof tag === "string")
      : null,
    stream: typeof metadata.stream === "string" ? metadata.stream : null,
    metrics:
      metadata.metrics && typeof metadata.metrics === "object"
        ? {
            views: typeof (metadata.metrics as Record<string, unknown>).views === "number" ? (metadata.metrics as Record<string, number>).views : undefined,
            likes: typeof (metadata.metrics as Record<string, unknown>).likes === "number" ? (metadata.metrics as Record<string, number>).likes : undefined,
            comments: typeof (metadata.metrics as Record<string, unknown>).comments === "number" ? (metadata.metrics as Record<string, number>).comments : undefined,
            shares: typeof (metadata.metrics as Record<string, unknown>).shares === "number" ? (metadata.metrics as Record<string, number>).shares : undefined,
          }
        : undefined,
    trendInterest: typeof metadata.trendInterest === "number" ? metadata.trendInterest : undefined,
    trendRising: typeof metadata.trendRising === "boolean" ? metadata.trendRising : undefined,
  };
}

const SIGNALS_BASELINE_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: queryAll<Record<string, unknown>>(
      "SELECT * FROM metric_baselines ORDER BY computed_at DESC",
    ),
  }),
});

const OPPORTUNITIES_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: queryAll<Record<string, unknown>>(
      "SELECT * FROM opportunities WHERE status = 'pending' ORDER BY priority DESC LIMIT 20",
    ),
  }),
});

const INTELLIGENCE_LATEST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: queryAll<Record<string, unknown>>(
      "SELECT * FROM briefs ORDER BY created_at DESC LIMIT 10",
    ),
  }),
});

const BRIEFS_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: queryAll<Record<string, unknown>>(
      "SELECT * FROM briefs ORDER BY created_at DESC LIMIT 50",
    ),
  }),
});

const RESEARCH_ACTIVE_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: listJobs()
      .filter((j) => j.status === "running" && j.kind.startsWith("research"))
      .map((j) => ({ id: j.id, kind: j.kind, status: j.status, startedAt: j.startedAt })),
  }),
});

const SIGNAL_ID_BODY = z.object({ id: z.number().int().positive() });

const SIGNAL_DISMISS_ROUTE = wrapRoute<z.infer<typeof SIGNAL_ID_BODY>, { id: number; feedback: "dismissed" }>({
  method: "POST",
  inputSchema: SIGNAL_ID_BODY,
  dryRun: true,
  handler: async (input) => {
    const result = execute(
      "UPDATE signals SET feedback = 'dismissed', updated_at = datetime('now') WHERE id = ?",
      [input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return { ok: true as const, data: { id: input.id, feedback: "dismissed" as const } };
  },
});

const SIGNAL_APPROVE_ROUTE = wrapRoute<z.infer<typeof SIGNAL_ID_BODY>, { id: number; feedback: "approved" }>({
  method: "POST",
  inputSchema: SIGNAL_ID_BODY,
  dryRun: true,
  handler: async (input) => {
    const result = execute(
      "UPDATE signals SET feedback = 'approved', updated_at = datetime('now') WHERE id = ?",
      [input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return { ok: true as const, data: { id: input.id, feedback: "approved" as const } };
  },
});

const SIGNAL_FLAG_BODY = z.object({
  id: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

const SIGNAL_FLAG_ROUTE = wrapRoute<z.infer<typeof SIGNAL_FLAG_BODY>, { id: number; feedback: "flagged"; reason: string }>({
  method: "POST",
  inputSchema: SIGNAL_FLAG_BODY,
  dryRun: true,
  handler: async (input) => {
    const reasonCheck = rejectControlChars(input.reason, "reason");
    if (!reasonCheck.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: reasonCheck.message };
    }
    const result = execute(
      "UPDATE signals SET feedback = 'flagged', metadata = json_patch(COALESCE(metadata,'{}'), json_object('flagReason', ?)), updated_at = datetime('now') WHERE id = ?",
      [input.reason, input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return {
      ok: true as const,
      data: { id: input.id, feedback: "flagged" as const, reason: input.reason },
    };
  },
});

const CMO_PLAYBOOK_BODY = z.object({ name: z.string().min(1).max(128) });

const CMO_PLAYBOOK_ROUTE = wrapRoute<z.infer<typeof CMO_PLAYBOOK_BODY>, { jobId: string; playbook: string }>({
  method: "POST",
  inputSchema: CMO_PLAYBOOK_BODY,
  dryRun: true,
  handler: async (input) => {
    const ctrl = rejectControlChars(input.name, "playbook name");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const job = createJob(`playbook:${input.name}`, { playbookName: input.name });
    runJob(job.id, async (_job, emit) => {
      emit(`Playbook queued: ${input.name}. Run /cmo in your terminal to execute it.`);
      return { status: "queued", playbook: input.name };
    });
    return { ok: true as const, data: { jobId: job.id, playbook: input.name } };
  },
});

// ---------------------------------------------------------------------------
// Brand docs editor server endpoints
//
// 4 endpoints power the Brand docs UI:
//   GET  /api/brand/files       list every brand/*.md with freshness chips
//   GET  /api/brand/read        read one file + mtime
//   POST /api/brand/write       atomic write with optimistic-lock (mtime)
//   POST /api/brand/regenerate  invoke the owning skill via the job queue
//
// Body schemas live as constants here so the same Zod validator drives both
// the wire AND the JSON Schema enrichment on /api/schema (single source of truth).
// ---------------------------------------------------------------------------

const BRAND_FILE_NAME_SCHEMA = z.string().min(1).max(128).regex(
  /^(brand\/)?[a-z0-9][a-z0-9._-]*\.md$/,
  "must be a .md file under brand/",
);

const BRAND_WRITE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
  content: z.string().max(2_000_000), // 2MB — markdown rarely exceeds this
  expectedMtime: z.string().optional(),
});

const BRAND_REGENERATE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
});

const BRAND_FILES_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: listBrandFiles() as unknown[],
    meta: { fetchedAt: new Date().toISOString() },
  }),
});

const BRAND_READ_ROUTE = wrapRoute<undefined, {
  file: string;
  content: string;
  mtime: string;
  bytes: number;
  freshness: "fresh" | "stale" | "template";
  ageDays: number | null;
}>({
  method: "GET",
  handler: async (_input, ctx) => {
    const fileQ = ctx.url.searchParams.get("file");
    if (!fileQ) {
      return { ok: false as const, code: "BAD_INPUT" as const, message: "file query parameter is required" };
    }
    const ctrl = rejectControlChars(fileQ, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(fileQ);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }
    if (!existsSync(resolved.abs)) {
      return { ok: false as const, code: "NOT_FOUND" as const, message: `brand/${resolved.rel} does not exist`, status: 404 };
    }
    try {
      const r = readBrandFile(resolved.abs);
      return {
        ok: true as const,
        data: {
          file: resolved.rel,
          content: r.content,
          mtime: r.mtime,
          bytes: r.bytes,
          freshness: r.freshness,
          ageDays: r.ageDays,
        },
        meta: { fetchedAt: new Date().toISOString() },
      };
    } catch (e) {
      return {
        ok: false as const,
        code: "INTERNAL_ERROR" as const,
        message: e instanceof Error ? e.message : "failed to read file",
        status: 500,
      };
    }
  },
});

const BRAND_WRITE_ROUTE = wrapRoute<z.infer<typeof BRAND_WRITE_BODY>, {
  file: string;
  mtime: string;
  bytes: number;
  deltaChars: number;
}>({
  method: "POST",
  inputSchema: BRAND_WRITE_BODY,
  dryRun: true,
  handler: async (input) => {
    const ctrl = rejectControlChars(input.file, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(input.file);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }

    const result = writeBrandFile(resolved.abs, input.content, input.expectedMtime);
    if (!result.ok) {
      return {
        ok: false as const,
        code: "CONFLICT" as const,
        message: `File modified elsewhere at ${result.serverMtime}`,
        status: 409,
        fix: `Reload (GET /api/brand/read?file=${resolved.rel}) and merge — your expectedMtime was ${result.clientMtime}`,
      };
    }

    // Hook the Activity panel: every successful write becomes a brand-write
    // entry that the dashboard renders in real time.
    const summary = `Wrote brand/${resolved.rel} (${result.deltaChars >= 0 ? "+" : ""}${result.deltaChars} chars)`;
    try {
      const row = execute(
        `INSERT INTO activity (kind, summary, files_changed, meta)
         VALUES ('brand-write', ?, ?, ?)`,
        [
          summary,
          JSON.stringify([`brand/${resolved.rel}`]),
          JSON.stringify({ source: "studio", bytes: result.bytes, deltaChars: result.deltaChars }),
        ],
      );
      globalEmitter.publish("*", {
        type: "activity-new",
        payload: {
          id: Number(row.lastInsertRowid),
          kind: "brand-write" as const,
          summary,
          filesChanged: [`brand/${resolved.rel}`],
          meta: { source: "studio", bytes: result.bytes, deltaChars: result.deltaChars },
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // DB write failures don't break the file write
    }

    globalEmitter.publish("*", {
      type: "brand-file-changed",
      payload: { file: `brand/${resolved.rel}`, mtime: result.mtime, bytes: result.bytes },
    });

    return {
      ok: true as const,
      data: {
        file: resolved.rel,
        mtime: result.mtime,
        bytes: result.bytes,
        deltaChars: result.deltaChars,
      },
    };
  },
});

const BRAND_REGENERATE_ROUTE = wrapRoute<z.infer<typeof BRAND_REGENERATE_BODY>, {
  jobId: string;
  skill: string;
  file: string;
  note: string;
}>({
  method: "POST",
  inputSchema: BRAND_REGENERATE_BODY,
  dryRun: true,
  handler: async (input) => {
    const ctrl = rejectControlChars(input.file, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(input.file);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }
    const spec = getBrandSpec(resolved.rel);
    if (!spec || !spec.skill) {
      return {
        ok: false as const,
        code: "BAD_INPUT" as const,
        message: `brand/${resolved.rel} has no owning skill — append-only or manual file`,
        fix: "Pick a file from the canonical 10 with a skill owner (voice-profile, audience, competitors, …)",
      };
    }

    // The studio cannot directly invoke /cmo (no AGPL-style coupling); instead
    // we queue a job that /cmo (running in the user's Claude Code session)
    // picks up. Same pattern as /api/skill/run.
    const job = createJob(`brand:regenerate:${spec.skill}`, {
      file: resolved.rel,
      skill: spec.skill,
    });
    runJob(job.id, async (_job, emit) => {
      emit(`Queued brand/${resolved.rel} regeneration via skill ${spec.skill}. Run /cmo to execute.`);
      // Emit the skill-start event so the dashboard can render a "regenerating"
      // banner immediately; skill-complete fires when /cmo POSTs back.
      globalEmitter.publish("*", {
        type: "skill-start",
        payload: { skill: spec.skill, file: `brand/${resolved.rel}`, jobId: job.id },
      });
      return { status: "queued", skill: spec.skill, file: resolved.rel };
    });

    // Activity-feed entry so the user sees this immediately.
    try {
      const row = execute(
        `INSERT INTO activity (kind, skill, summary, files_changed, meta)
         VALUES ('skill-run', ?, ?, ?, ?)`,
        [
          spec.skill,
          `Regenerating brand/${resolved.rel}`,
          JSON.stringify([`brand/${resolved.rel}`]),
          JSON.stringify({ source: "studio", jobId: job.id, status: "queued" }),
        ],
      );
      globalEmitter.publish("*", {
        type: "activity-new",
        payload: {
          id: Number(row.lastInsertRowid),
          kind: "skill-run" as const,
          skill: spec.skill,
          summary: `Regenerating brand/${resolved.rel}`,
          filesChanged: [`brand/${resolved.rel}`],
          meta: { source: "studio", jobId: job.id, status: "queued" },
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // ignore
    }

    return {
      ok: true as const,
      data: {
        jobId: job.id,
        skill: spec.skill,
        file: resolved.rel,
        note: `Queued via job ${job.id} — /cmo executes the skill in the user's Claude Code session`,
      },
      meta: { fetchedAt: new Date().toISOString() },
    };
  },
});

// ---------------------------------------------------------------------------
// Inline body schemas extracted to constants
//
// DO NOT STRIP — these registrations are required at runtime so /api/schema
// returns real JSON Schema 2020-12 for every POST. A "strip unused" lint pass
// might think these are dead because they're side-effect imports; they are
// NOT. The regression test in tests/server/route-schema.test.ts will catch a
// drift; the single-line registrations below must stay.
// ---------------------------------------------------------------------------

const OPPORTUNITIES_PUSH_BODY = z.object({
  skill: z.string().min(1).max(128),
  reason: z.string().min(1).max(2_000),
  priority: z.number().int().min(0).max(100).optional(),
  prerequisites: z.record(z.string(), z.unknown()).optional(),
});

const PRIMARY_NAV_TABS = ["hq", "content", "publish", "brand"] as const;

const NAVIGATE_BODY = z.object({
  tab: z.enum(PRIMARY_NAV_TABS),
  filter: z.record(z.string(), z.unknown()).optional(),
});

const NAVIGATE_REQUEST_BODY = z.object({
  tab: z.string().min(1).max(64),
  filter: z.record(z.string(), z.unknown()).optional(),
});

function normalizeNavigateTab(tab: string): { tab: (typeof PRIMARY_NAV_TABS)[number] } | null {
  if ((PRIMARY_NAV_TABS as readonly string[]).includes(tab)) {
    return { tab: tab as (typeof PRIMARY_NAV_TABS)[number] };
  }
  if (tab === "pulse") return { tab: "hq" };
  if (tab === "trends" || tab === "signals") return { tab: "content" };
  if (tab === "audience" || tab === "opportunities") return { tab: "hq" };
  return null;
}

const TOAST_BODY = z.object({
  level: z.enum(["info", "success", "warn", "error"]),
  message: z.string().min(1).max(500),
  duration: z.number().int().min(500).max(60_000).optional(),
});

const HIGHLIGHT_BODY = z.object({
  tab: z.string().min(1).max(64),
  selector: z.string().max(256).optional(),
  reason: z.string().max(500).optional(),
});

const BRAND_NOTE_BODY = z.object({
  file: z.string().min(1).max(512),
  excerpt: z.string().min(1).max(8_000),
});

const SKILL_RUN_BODY = z.object({
  name: z.string().min(1).max(128),
  args: z.record(z.string(), z.unknown()).optional(),
});

const INIT_BODY = z.object({
  from: z.string().url().optional(),
});

const SETTINGS_ENV_BODY = z.record(z.string(), z.string().max(512));

const FOUNDATION_BODY = z.object({
  from: z.string().url().optional(),
  seed: z.boolean().optional(),
});

const BRAND_RESET_BODY = z.object({}).optional();

const PUBLISH_BODY = z.object({
  adapter: z.string().min(1).max(64),
  manifest: z.record(z.string(), z.unknown()),
  confirm: z.boolean().optional(),
});

const PUBLISH_NATIVE_PROVIDER_BODY = z.object({
  id: z.string().min(1).max(128).optional(),
  identifier: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  profile: z.string().min(1).max(120),
  picture: z.string().max(2048).optional(),
  disabled: z.boolean().optional(),
});

const CONTENT_FILE_WRITE_BODY = z.object({
  path: z.string().min(1).max(1_024),
  content: z.string().max(5_000_000),
  expectedMtime: z.string().optional(),
});

const CONTENT_META_PATCH_BODY = z.object({
  assetId: z.string().min(1).max(128).optional(),
  groupId: z.string().min(1).max(128).optional(),
  patch: z.record(z.string(), z.unknown()),
}).refine((value) => Boolean(value.assetId) !== Boolean(value.groupId), {
  message: "Provide exactly one of assetId or groupId",
});

const CONTENT_REINDEX_BODY = z.object({}).optional();

// Single source of truth: register schemas with the introspection registry
// (powers GET /api/schema?route=… inputSchema enrichment).
//
// One call per route. Adding a new POST route? Add a registerRouteSchema()
// call here AND export the body schema as a const. The regression test in
// tests/server/route-schema.test.ts checks every ROUTE_SCHEMA entry with a
// `body: {...}` declaration has a matching registry entry.
registerRouteSchema("/api/brand/write",          { method: "POST", body: BRAND_WRITE_BODY });
registerRouteSchema("/api/brand/regenerate",     { method: "POST", body: BRAND_REGENERATE_BODY });
registerRouteSchema("/api/activity/log",         { method: "POST", body: ACTIVITY_LOG_BODY });
registerRouteSchema("/api/opportunities/push",   { method: "POST", body: OPPORTUNITIES_PUSH_BODY });
registerRouteSchema("/api/navigate",             { method: "POST", body: NAVIGATE_BODY });
registerRouteSchema("/api/toast",                { method: "POST", body: TOAST_BODY });
registerRouteSchema("/api/highlight",            { method: "POST", body: HIGHLIGHT_BODY });
registerRouteSchema("/api/brand/note",           { method: "POST", body: BRAND_NOTE_BODY });
registerRouteSchema("/api/signals/dismiss",      { method: "POST", body: SIGNAL_ID_BODY });
registerRouteSchema("/api/signals/approve",      { method: "POST", body: SIGNAL_ID_BODY });
registerRouteSchema("/api/signals/flag",         { method: "POST", body: SIGNAL_FLAG_BODY });
registerRouteSchema("/api/skill/run",            { method: "POST", body: SKILL_RUN_BODY });
registerRouteSchema("/api/cmo/playbook",         { method: "POST", body: CMO_PLAYBOOK_BODY });
registerRouteSchema("/api/init",                 { method: "POST", body: INIT_BODY });
registerRouteSchema("/api/settings/env",         { method: "POST", body: SETTINGS_ENV_BODY });
registerRouteSchema("/api/onboarding/foundation",{ method: "POST", body: FOUNDATION_BODY });
registerRouteSchema("/api/brand/refresh",        { method: "POST", body: FOUNDATION_BODY });
registerRouteSchema("/api/brand/reset",          { method: "POST", body: BRAND_RESET_BODY });
registerRouteSchema("/api/publish",              { method: "POST", body: PUBLISH_BODY });
registerRouteSchema("/api/publish/native/providers", { method: "POST", body: PUBLISH_NATIVE_PROVIDER_BODY });
registerRouteSchema("/api/cmo/content/file",     { method: "PUT", body: CONTENT_FILE_WRITE_BODY });
registerRouteSchema("/api/cmo/content/meta",     { method: "PATCH", body: CONTENT_META_PATCH_BODY });
registerRouteSchema("/api/cmo/content/reindex",  { method: "POST", body: CONTENT_REINDEX_BODY });

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  // Bun.serve defaults to a 10s idleTimeout which silently closes our SSE
  // streams every ~10s — that's the underlying cause of Bug #8 ("subscribers
  // drops after ~30s"). 255 is the maximum Bun supports; combined with the
  // 15s comment-line keepalive in lib/sse.ts, SSE connections stay alive
  // indefinitely under normal use.
  idleTimeout: 255,

  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    const corsHeaders = cors(req);

    // OPTIONS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Rate limit mutations (Agent DX axis 5).
    // GETs are idempotent and unthrottled.
    const rate = checkRateLimit(req);
    if (!rate.ok) {
      return err(
        `Rate limit exceeded — retry in ${rate.retryAfterSec}s`,
        429,
        { ...corsHeaders, "Retry-After": String(rate.retryAfterSec) },
        "Back off — the studio allows 60 mutating requests per minute per client",
      );
    }

    // -----------------------------------------------------------------------
    // GET /api/health
    //
    // Kept inline (NOT wrapRoute-migrated) because the integration suite
    // (tests/integration/server-boot.test.ts) pins the response to a flat
    // `{ok, version, ts}` shape rather than the wrapRoute envelope
    // `{ok, data: {...}}`. Migrating breaks that pin.
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/health") {
      return json(
        {
          ok: true,
          version: "0.1.0",
          ts: new Date().toISOString(),
          subscribers: globalEmitter.size,
        },
        200,
        corsHeaders,
      );
    }

    // -----------------------------------------------------------------------
    // GET /api/project/current
    //
    // Read-only identity endpoint for the Studio shell. It is intentionally
    // derived from the active project root and does not call native publish
    // provisioning commands, so rendering the header cannot create state.
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/project/current") {
      const status = await mktgStatus(STUDIO_CWD);
      const fallbackName = basename(STUDIO_CWD) || "Marketing Project";
      const projectName = status.ok ? status.data.project : fallbackName;
      const brandSummary = status.ok
        ? status.data.brandSummary
        : { populated: 0, template: 0, missing: 0, stale: 0 };
      const brandFileCount =
        brandSummary.populated + brandSummary.template + brandSummary.missing;

      return json(
        {
          ok: true,
          data: {
            name: projectName,
            root: STUDIO_CWD,
            rootLabel: rootLabel(STUDIO_CWD),
            health: status.ok ? status.data.health : "unknown",
            brand: {
              ...brandSummary,
              total: brandFileCount,
            },
            dbPath: resolveStudioDbPath(process.cwd()),
            sessionId: process.env.MKTG_STUDIO_SESSION || null,
            launchIntent: process.env.MKTG_STUDIO_INTENT || null,
            logo: discoverProjectLogo(projectName),
            nativePublish: countNativePublishState(STUDIO_CWD),
            fetchedAt: new Date().toISOString(),
          },
        },
        200,
        corsHeaders,
      );
    }

    // -----------------------------------------------------------------------
    // GET /api/schema — Agent DX axis 3: runtime self-discovery
    // Supports ?route=<path> to fetch a single entry.
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/schema") {
      const routeFilter = url.searchParams.get("route");
      if (routeFilter) {
        const ctrl = rejectControlChars(routeFilter, "route");
        if (!ctrl.ok) return err(ctrl.message, 400, corsHeaders);
        const matches = ROUTE_SCHEMA.filter((r) => r.path === routeFilter);
        if (matches.length === 0) {
          return err(
            `Route not registered: ${routeFilter}`,
            404,
            corsHeaders,
            "Call GET /api/schema with no query to list every registered path",
          );
        }
        // JSON Schema 2020-12 inputSchema enrichment for routes
        // that have a registered Zod body (no-op on unregistered entries).
        return json(
          { ok: true, routes: matches.map(enrichRouteEntry) },
          200,
          corsHeaders,
        );
      }
      return json(
        { ok: true, routes: enrichRouteSchema(ROUTE_SCHEMA) },
        200,
        corsHeaders,
      );
    }

    // -----------------------------------------------------------------------
    // GET /api/help — terse agent cheat-sheet (Agent DX axis 7).
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/help") {
      return json(
        {
          ok: true,
          data: {
            summary:
              "mktg-studio is a local Bun server (:3001) that exposes the brand/ files + SQLite + postiz API to /cmo and the Next.js dashboard.",
            envelopes: {
              success: `{"ok": true, "data": ...}`,
              error: `{"ok": false, "error": {"code": "<StudioErrorCode>", "message": "...", "fix": "..."}}`,
              degraded: `{"ok": true, "data": [], "degraded": true, "degradedReason": "..."}`,
            },
            errorCodes: [
              "BAD_INPUT",
              "NOT_FOUND",
              "UNAUTHORIZED",
              "CONFIRM_REQUIRED",
              "CONFLICT",
              "RATE_LIMITED",
              "UPSTREAM_FAILED",
              "PARSE_ERROR",
              "INTERNAL",
            ],
            queryParams: {
              fields: "?fields=a,b.c — dot-path projection on GETs",
              dryRun: "?dryRun=true — mutations validate but write nothing",
              confirm: "?confirm=true — required on destructive ops",
              route: "/api/schema?route=/api/activity — fetch one entry",
            },
            headers: {
              "Accept: application/x-ndjson":
                "On list GETs, stream rows as NDJSON instead of a JSON envelope",
              "Content-Type: application/json":
                "Required on POST bodies (raw JSON, no form fields)",
            },
            entryPoints: [
              { path: "/api/schema", why: "discover every route + body shape" },
              { path: "/api/events", why: "SSE stream of dashboard events (toast, navigate, activity-new, ...)" },
              { path: "/api/activity/log", why: "POST to append to the activity feed" },
              { path: "/api/opportunities/push", why: "POST to recommend an action to the user" },
              { path: "/api/navigate", why: "POST to switch the dashboard tab" },
              { path: "/api/toast", why: "POST to show a transient notification" },
              { path: "/api/publish", why: "POST a manifest through mktg publish (postiz, typefully, ...)" },
            ],
            docs: "docs/cmo-api.md",
          },
        },
        200,
        corsHeaders,
      );
    }

    // -----------------------------------------------------------------------
    // GET /api/events — global SSE broadcast
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/events") {
      return globalEmitter.subscribe("*", corsHeaders);
    }

    // -----------------------------------------------------------------------
    // HQ legacy signal routes + Trends — wrapRoute migrated (T4)
    //
    // Stubs that return empty scaffolds. wrapRoute gives them the uniform
    // {ok, data} envelope, ?fields= projection, NDJSON streaming, and the
    // structured error envelope on bad input — for free.
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/pulse/decision-feed") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/what-changed") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/spike-stack") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/fresh-intel") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/social-highlights") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/archetype-cards") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/pulse/live-proof") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/trends/hot-context") {
      return TRENDS_HOT_CONTEXT_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/trends/feed") {
      return EMPTY_LIST_ROUTE(req, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Signals tab — wrapRoute migrated (T4)
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/signals") {
      return SIGNALS_LIST_ROUTE(req, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/signals/baseline") {
      return SIGNALS_BASELINE_ROUTE(req, corsHeaders);
    }

    // GET /api/signals/:id  (must come after /baseline)
    const signalMatch = url.pathname.match(/^\/api\/signals\/(\d+)$/);
    if (method === "GET" && signalMatch) {
      const { queryOne } = await import("./lib/sqlite.ts");
      const signal = queryOne<Record<string, unknown>>("SELECT * FROM signals WHERE id = ?", [signalMatch[1]]);
      if (!signal) return err("Signal not found", 404, corsHeaders);
      return json({ ok: true, data: normalizeSignalRow(signal) }, 200, corsHeaders);
    }

    // POST /api/signals/{dismiss,approve,flag} — wrapRoute migrated (T4)
    if (method === "POST" && url.pathname === "/api/signals/dismiss") {
      return SIGNAL_DISMISS_ROUTE(req, corsHeaders);
    }
    if (method === "POST" && url.pathname === "/api/signals/approve") {
      return SIGNAL_APPROVE_ROUTE(req, corsHeaders);
    }
    if (method === "POST" && url.pathname === "/api/signals/flag") {
      return SIGNAL_FLAG_ROUTE(req, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // HQ audience summary
    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // Audience / Opportunities / Briefs — bare structured shape (T29)
    //
    // These three tab-feeding GETs return their structured shape AT THE TOP
    // LEVEL (no `{ok:true, data}` envelope). The UI components (audience-tab,
    // opportunities-tab, briefs-tab) consume `useSWR<TypeResponse>(url, fetcher)`
    // and destructure `{profiles, …}` directly. Per CLAUDE.md axis 1: "plain
    // data on pure reads is acceptable for tab-feeding endpoints."
    //
    // Other consumers (agents) can still use ?fields= projection — the bare
    // shape is the same input as the field-mask helper.
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/audience/profiles") {
      return json(
        {
          profiles: [],
          platformIntelligence: [],
          byTheNumbers: [],
          fetchedAt: new Date().toISOString(),
        },
        200,
        corsHeaders,
      );
    }

    if (method === "GET" && url.pathname === "/api/opportunities") {
      // The `opportunities` table is the canonical action queue, populated
      // by /cmo's analysis loop. `watchItems` and `actions` are unwired
      // today; they'll come from /cmo too. Empty arrays preserve the UI's
      // optional-rendering path.
      const rows = queryAll<{
        id: number;
        skill: string;
        reason: string;
        priority: number;
        prerequisites: string | null;
        status: string;
        created_at: string;
      }>(
        "SELECT id, skill, reason, priority, prerequisites, status, created_at FROM opportunities WHERE status = 'pending' ORDER BY priority DESC LIMIT 20",
      );

      // Map the SQLite rows into the ContentOpportunity[] shape the UI
      // component expects. The opportunities table is the source of truth.
      const opportunities = rows.map((r) => ({
        hook: r.reason,
        archetype: r.skill,
        urgency: r.priority >= 80 ? "now" : r.priority >= 50 ? "soon" : "watch",
      }));

      return json(
        {
          opportunities,
          watchItems: [] as { item: string; action?: string }[],
          actions: [] as Array<Record<string, unknown>>,
          fetchedAt: new Date().toISOString(),
        },
        200,
        corsHeaders,
      );
    }

    if (method === "GET" && url.pathname === "/api/intelligence/latest") {
      return INTELLIGENCE_LATEST_ROUTE(req, corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/briefs") {
      const briefs = queryAll<Record<string, unknown>>(
        "SELECT * FROM briefs ORDER BY created_at DESC LIMIT 50",
      );
      return json(
        {
          agents: [] as { _id: string; name: string; agentType?: string }[],
          briefs,
          fetchedAt: new Date().toISOString(),
        },
        200,
        corsHeaders,
      );
    }

    if (method === "GET" && url.pathname === "/api/research/active") {
      return RESEARCH_ACTIVE_ROUTE(req, corsHeaders);
    }

    // GET /api/activity — wrapRoute migrated (T4)
    if (method === "GET" && url.pathname === "/api/activity") {
      return ACTIVITY_LIST_ROUTE(req, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // /cmo → studio control surface
    // -----------------------------------------------------------------------

    // POST /api/activity/log — wrapRoute migrated (T4)
    if (method === "POST" && url.pathname === "/api/activity/log") {
      return ACTIVITY_LOG_ROUTE(req, corsHeaders);
    }

    // DELETE /api/activity/:id?confirm=true — must come AFTER /api/activity/log
    // so the regex doesn't swallow the literal `log` segment. (Match digits only.)
    if (method === "DELETE" && /^\/api\/activity\/\d+$/.test(url.pathname)) {
      return ACTIVITY_DELETE_ROUTE(req, corsHeaders);
    }

    // POST /api/opportunities/push — push a ranked action onto HQ
    if (method === "POST" && url.pathname === "/api/opportunities/push") {
      const body = await parseBody(
        req,
        z.object({
          skill: z.string().min(1).max(128),
          reason: z.string().min(1).max(2_000),
          priority: z.number().int().min(0).max(100).optional(),
          prerequisites: z.record(z.string(), z.unknown()).optional(),
        }),
      );
      if (!body.ok) return body.res;

      const idCheck = validateResourceId(body.data.skill, "skill");
      if (!idCheck.ok) return err(idCheck.message, 400, corsHeaders);

      const reasonCheck = rejectControlChars(body.data.reason, "reason");
      if (!reasonCheck.ok) return err(reasonCheck.message, 400, corsHeaders);

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      const result = execute(
        `INSERT INTO opportunities (skill, reason, priority, prerequisites, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [
          body.data.skill,
          body.data.reason,
          body.data.priority ?? 0,
          body.data.prerequisites ? JSON.stringify(body.data.prerequisites) : null,
        ],
      );

      const id = Number(result.lastInsertRowid);
      const payload = {
        id,
        skill: body.data.skill,
        reason: body.data.reason,
        priority: body.data.priority ?? 0,
        prerequisites: body.data.prerequisites ?? null,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      globalEmitter.publish("*", { type: "opportunity-new", payload });

      return json({ ok: true, id, data: payload }, 200, corsHeaders);
    }

    // POST /api/navigate — tell dashboard to switch tabs (no DB)
    if (method === "POST" && url.pathname === "/api/navigate") {
      const body = await parseBody(
        req,
        NAVIGATE_REQUEST_BODY,
      );
      if (!body.ok) return body.res;
      const tabCheck = rejectControlChars(body.data.tab, "tab");
      if (!tabCheck.ok) return err(tabCheck.message, 400, corsHeaders);

      const target = normalizeNavigateTab(body.data.tab);
      if (!target) {
        return err(
          `Invalid navigation tab: ${body.data.tab}`,
          400,
          corsHeaders,
          "Use one of: hq, content, publish, brand",
        );
      }

      const filter = { ...(body.data.filter ?? {}) };
      delete filter.mode;
      const payload = {
        tab: target.tab,
        filter: Object.keys(filter).length > 0 ? filter : null,
      };

      if (isDryRun(url)) return json({ ok: true, dryRun: true, data: payload }, 200, corsHeaders);

      globalEmitter.publish("*", {
        type: "navigate",
        payload,
      });

      return json({ ok: true }, 200, corsHeaders);
    }

    // POST /api/toast — transient toast notification
    if (method === "POST" && url.pathname === "/api/toast") {
      const body = await parseBody(
        req,
        z.object({
          level: z.enum(["info", "success", "warn", "error"]),
          message: z.string().min(1).max(500),
          duration: z.number().int().min(500).max(60_000).optional(),
        }),
      );
      if (!body.ok) return body.res;

      const c = rejectControlChars(body.data.message, "message");
      if (!c.ok) return err(c.message, 400, corsHeaders);

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      globalEmitter.publish("*", {
        type: "toast",
        payload: {
          level: body.data.level,
          message: body.data.message,
          duration: body.data.duration ?? 4_000,
        },
      });

      return json({ ok: true }, 200, corsHeaders);
    }

    // POST /api/highlight — highlight a tab/element to draw attention
    if (method === "POST" && url.pathname === "/api/highlight") {
      const body = await parseBody(
        req,
        z.object({
          tab: z.string().min(1).max(64),
          selector: z.string().max(256).optional(),
          reason: z.string().max(500).optional(),
        }),
      );
      if (!body.ok) return body.res;

      for (const [field, value] of Object.entries({
        tab: body.data.tab,
        selector: body.data.selector ?? "",
        reason: body.data.reason ?? "",
      })) {
        const c = rejectControlChars(value, field);
        if (!c.ok) return err(c.message, 400, corsHeaders);
      }

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      globalEmitter.publish("*", {
        type: "highlight",
        payload: {
          tab: body.data.tab,
          selector: body.data.selector ?? null,
          reason: body.data.reason ?? null,
        },
      });

      return json({ ok: true }, 200, corsHeaders);
    }

    // GET /api/brand/files — list brand/*.md with freshness chips
    if (method === "GET" && url.pathname === "/api/brand/files") {
      return BRAND_FILES_ROUTE(req, corsHeaders);
    }

    // GET /api/brand/read?file=… — read a single brand file
    if (method === "GET" && url.pathname === "/api/brand/read") {
      return BRAND_READ_ROUTE(req, corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/assets/file") {
      const fileQ = url.searchParams.get("path");
      if (!fileQ) return err("path query parameter is required", 400, corsHeaders);
      return serveProjectAsset(req, fileQ, corsHeaders);
    }

    // POST /api/brand/write — atomic write w/ optimistic lock
    if (method === "POST" && url.pathname === "/api/brand/write") {
      return BRAND_WRITE_ROUTE(req, corsHeaders);
    }

    // POST /api/brand/regenerate — queue owning skill via /cmo
    if (method === "POST" && url.pathname === "/api/brand/regenerate") {
      return BRAND_REGENERATE_ROUTE(req, corsHeaders);
    }

    // POST /api/brand/note — note a brand file write into the activity feed
    if (method === "POST" && url.pathname === "/api/brand/note") {
      const body = await parseBody(
        req,
        z.object({
          file: z.string().min(1).max(512),
          excerpt: z.string().min(1).max(8_000),
        }),
      );
      if (!body.ok) return body.res;

      const sandboxCheck = validatePathInput(STUDIO_CWD, body.data.file);
      if (!sandboxCheck.ok) return err(sandboxCheck.message, 400, corsHeaders);

      const excerptCheck = rejectControlChars(body.data.excerpt, "excerpt");
      if (!excerptCheck.ok) return err(excerptCheck.message, 400, corsHeaders);

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      const summary = `Brand file updated: ${body.data.file}`;
      const result = execute(
        `INSERT INTO activity (kind, summary, detail, files_changed)
         VALUES ('brand-write', ?, ?, ?)`,
        [
          summary,
          body.data.excerpt.slice(0, 4_000),
          JSON.stringify([body.data.file]),
        ],
      );

      const id = Number(result.lastInsertRowid);
      const payload = {
        id,
        kind: "brand-write" as const,
        skill: null,
        summary,
        detail: body.data.excerpt.slice(0, 4_000),
        filesChanged: [body.data.file],
        meta: null,
        createdAt: new Date().toISOString(),
      };

      globalEmitter.publish("*", { type: "activity-new", payload });
      globalEmitter.publish("*", {
        type: "brand-file-changed",
        payload: { file: body.data.file },
      });

      return json({ ok: true, id, data: payload }, 200, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Content workspace — local-first manifest + artifact APIs
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/cmo/content/manifest") {
      return respondObject(url, buildContentManifest(STUDIO_CWD), corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/cmo/content/file") {
      const pathQ = url.searchParams.get("path");
      if (!pathQ) return err("path query parameter is required", 400, corsHeaders);
      const ctrl = rejectControlChars(pathQ, "path");
      if (!ctrl.ok) return err(ctrl.message, 400, corsHeaders);
      try {
        return respondObject(url, readContentFile(pathQ, STUDIO_CWD), corsHeaders);
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to read file";
        if (message.includes("does not exist")) return errResponse("NOT_FOUND", message, 404, undefined, corsHeaders);
        if (message.includes("absolute paths") || message.includes("project root")) {
          return errResponse("PATH_TRAVERSAL", message, 400, undefined, corsHeaders);
        }
        return errResponse("BAD_INPUT", message, 400, undefined, corsHeaders);
      }
    }

    if (method === "PUT" && url.pathname === "/api/cmo/content/file") {
      const body = await parseBody(req, CONTENT_FILE_WRITE_BODY);
      if (!body.ok) return body.res;
      const ctrl = rejectControlChars(body.data.path, "path");
      if (!ctrl.ok) return err(ctrl.message, 400, corsHeaders);
      if (isDryRun(url)) {
        return json({ ok: true, dryRun: true, data: { path: body.data.path } }, 200, corsHeaders);
      }

      try {
        const result = writeContentFile(
          body.data.path,
          body.data.content,
          body.data.expectedMtime,
          STUDIO_CWD,
        );
        if (!result.ok) {
          return errResponse(
            "CONFLICT",
            `File modified elsewhere at ${result.serverMtime}`,
            409,
            `Reload (GET /api/cmo/content/file?path=${encodeURIComponent(body.data.path)}) and merge`,
            corsHeaders,
          );
        }

        const payload = {
          path: result.path,
          kind: classifyContentAssetKind(result.path),
          mtime: result.mtime,
          bytes: result.bytes,
        };
        globalEmitter.publish("*", { type: "content-file-changed", payload });
        if (result.path.startsWith("brand/") && result.path.endsWith(".md")) {
          globalEmitter.publish("*", {
            type: "brand-file-changed",
            payload: {
              file: result.path.replace(/^brand\//, ""),
              brandFile: result.path.replace(/^brand\//, ""),
              path: join(STUDIO_CWD, result.path),
              eventType: "change",
            },
          });
        }

        try {
          const row = execute(
            `INSERT INTO activity (kind, summary, files_changed, meta)
             VALUES ('brand-write', ?, ?, ?)`,
            [
              `Wrote ${result.path} (${result.deltaChars >= 0 ? "+" : ""}${result.deltaChars} chars)`,
              JSON.stringify([result.path]),
              JSON.stringify({ source: "content-workspace", bytes: result.bytes, deltaChars: result.deltaChars }),
            ],
          );
          globalEmitter.publish("*", {
            type: "activity-new",
            payload: {
              id: Number(row.lastInsertRowid),
              kind: "brand-write",
              summary: `Wrote ${result.path}`,
              filesChanged: [result.path],
              meta: { source: "content-workspace", bytes: result.bytes, deltaChars: result.deltaChars },
              createdAt: new Date().toISOString(),
            },
          });
        } catch {
          // Activity logging should not block the file write.
        }

        return json({ ok: true, data: result }, 200, corsHeaders);
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to write file";
        if (message.includes("absolute paths") || message.includes("project root")) {
          return errResponse("PATH_TRAVERSAL", message, 400, undefined, corsHeaders);
        }
        return errResponse("BAD_INPUT", message, 400, undefined, corsHeaders);
      }
    }

    if (method === "GET" && url.pathname === "/api/cmo/content/media") {
      const fileQ = url.searchParams.get("path");
      if (!fileQ) return err("path query parameter is required", 400, corsHeaders);
      return serveProjectAsset(req, fileQ, corsHeaders);
    }

    if (
      method === "GET" &&
      (url.pathname === "/api/cmo/content/events" || url.pathname === "/api/cmo/content/events/stream")
    ) {
      return globalEmitter.subscribe("*", corsHeaders);
    }

    if (method === "PATCH" && url.pathname === "/api/cmo/content/meta") {
      const body = await parseBody(req, CONTENT_META_PATCH_BODY);
      if (!body.ok) return body.res;
      const id = body.data.assetId ?? body.data.groupId ?? "";
      const ctrl = rejectControlChars(id, body.data.assetId ? "assetId" : "groupId");
      if (!ctrl.ok) return err(ctrl.message, 400, corsHeaders);
      if (isDryRun(url)) {
        return json({ ok: true, dryRun: true, data: { id, patch: body.data.patch } }, 200, corsHeaders);
      }

      const meta = loadContentMeta(STUDIO_CWD);
      if (body.data.assetId) {
        meta.assets[body.data.assetId] = {
          ...(meta.assets[body.data.assetId] ?? {}),
          ...sanitizeContentAssetPatch(body.data.patch),
        };
      } else if (body.data.groupId) {
        meta.groups[body.data.groupId] = sanitizeContentGroupPatch(
          body.data.groupId,
          meta.groups[body.data.groupId],
          body.data.patch,
        );
      }
      const saved = writeContentMeta(meta, STUDIO_CWD);
      globalEmitter.publish("*", {
        type: "content-meta-changed",
        payload: { assetId: body.data.assetId ?? null, groupId: body.data.groupId ?? null },
      });
      return json({ ok: true, data: saved }, 200, corsHeaders);
    }

    if (method === "POST" && url.pathname === "/api/cmo/content/reindex") {
      const manifest = buildContentManifest(STUDIO_CWD);
      if (!isDryRun(url)) {
        globalEmitter.publish("*", {
          type: "content-reindexed",
          payload: { total: manifest.stats.total, generatedAt: manifest.generatedAt },
        });
      }
      return json({ ok: true, data: manifest, dryRun: isDryRun(url) || undefined }, 200, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Skills
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/skills") {
      const result = await mktgList({ routing: true, cwd: STUDIO_CWD });
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondList(req, url, result.data.skills, corsHeaders);
    }

    const skillNameMatch = url.pathname.match(/^\/api\/skills\/([a-z0-9-]+)$/);
    if (method === "GET" && skillNameMatch) {
      const idCheck = validateResourceId(skillNameMatch[1], "skill");
      if (!idCheck.ok) return err(idCheck.message, 400, corsHeaders);
      const result = await mktgSkillInfo(skillNameMatch[1], { cwd: STUDIO_CWD });
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondObject(url, result.data, corsHeaders);
    }

    // POST /api/skill/run — queue a skill via /cmo
    if (method === "POST" && url.pathname === "/api/skill/run") {
      const body = await parseBody(
        req,
        z.object({
          name: z.string().min(1).max(128),
          args: z.record(z.string(), z.unknown()).optional(),
        }),
      );
      if (!body.ok) return body.res;

      const idCheck = validateResourceId(body.data.name, "skill");
      if (!idCheck.ok) return err(idCheck.message, 400, corsHeaders);

      const ctrlCheck = rejectControlChars(body.data.name, "skill name");
      if (!ctrlCheck.ok) return err(ctrlCheck.message, 400, corsHeaders);

      if (isDryRun(url)) {
        return json({ ok: true, dryRun: true, name: body.data.name }, 200, corsHeaders);
      }

      const job = createJob(body.data.name, body.data.args ?? {});

      // /cmo runs in the user's Claude Code session and calls back via HTTP.
      // This job is a placeholder entry; /cmo will report completion via POST /api/activity/log.
      runJob(job.id, async (_job, emit) => {
        emit(`Skill queued: ${body.data.name}. Run /cmo in your terminal to execute it.`);
        return { status: "queued", skill: body.data.name };
      });

      return json({ ok: true, jobId: job.id }, 202, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Jobs
    // -----------------------------------------------------------------------
    const jobStreamMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/stream$/);
    if (method === "GET" && jobStreamMatch) {
      const jobId = jobStreamMatch[1];
      const job = getJob(jobId);
      if (!job) return err("Job not found", 404, corsHeaders);
      const emitter = getJobEmitter(jobId);
      return emitter.subscribe(jobId);
    }

    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (method === "GET" && jobMatch) {
      const job = getJob(jobMatch[1]);
      if (!job) return err("Job not found", 404, corsHeaders);
      return json({ ok: true, data: { id: job.id, kind: job.kind, status: job.status, startedAt: job.startedAt, completedAt: job.completedAt, log: job.log, error: job.error } }, 200, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // /cmo playbook — wrapRoute migrated (T4)
    // Note: success body is now `{ok:true, data:{jobId}}` (jobId nested under
    // `data` per the wrapRoute envelope; previously top-level).
    // -----------------------------------------------------------------------
    if (method === "POST" && url.pathname === "/api/cmo/playbook") {
      return CMO_PLAYBOOK_ROUTE(req, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Init + Settings + Onboarding
    // -----------------------------------------------------------------------
    if (method === "POST" && url.pathname === "/api/init") {
      const body = await parseBody(req, z.object({ from: z.string().url().optional() }));
      if (!body.ok) return body.res;

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      const job = createJob("mktg:init", { from: body.data.from });
      runJob(job.id, async (_job, emit) => {
        emit("Running mktg init...");
        const args = body.data.from
          ? ["init", "--from", body.data.from, "--yes"]
          : ["init", "--yes"];
        const proc = Bun.spawn(["mktg", ...args], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;
        emit(stdout.trim() || "(no output)");
        if (stderr.trim()) emit(`stderr: ${stderr.trim()}`);
        if (exitCode !== 0) throw new Error(`mktg init exited with code ${exitCode}`);
        return { exitCode, stdout, stderr };
      });

      return json({ ok: true, jobId: job.id }, 202, corsHeaders);
    }

    // POST /api/settings/env — write API keys to .env.local
    if (method === "POST" && url.pathname === "/api/settings/env") {
      // Schema: { POSTIZ_API_KEY: "...", POSTIZ_API_BASE: "...", etc. }
      const body = await parseBody(req, z.record(z.string(), z.string().max(512)));
      if (!body.ok) return body.res;

      // Validate all keys and values
      for (const [k, v] of Object.entries(body.data)) {
        // Keys: uppercase + underscore only (env var convention)
        if (!/^[A-Z][A-Z0-9_]*$/.test(k)) {
          return err(`Invalid env var key: ${k}`, 400, corsHeaders);
        }
        const ctrlCheck = rejectControlChars(v, `value for ${k}`);
        if (!ctrlCheck.ok) return err(ctrlCheck.message, 400, corsHeaders);
      }

      if (isDryRun(url)) return json({ ok: true, dryRun: true, keys: Object.keys(body.data) }, 200, corsHeaders);

      // Read existing .env.local
      const envPath = join(STUDIO_CWD, ".env.local");
      let existing: string[] = existsSync(envPath)
        ? readFileSync(envPath, "utf-8").split("\n")
        : [];

      // Upsert each key
      for (const [k, v] of Object.entries(body.data)) {
        const line = `${k}=${v}`;
        const idx = existing.findIndex((l) => l.startsWith(`${k}=`));
        if (idx >= 0) {
          existing[idx] = line;
        } else {
          existing.push(line);
        }
        process.env[k] = v;
      }

      writeFileSync(envPath, existing.filter((l) => l !== "").join("\n") + "\n", "utf-8");

      return json({ ok: true, written: Object.keys(body.data) }, 200, corsHeaders);
    }

    // POST /api/onboarding/foundation — real parallel runner.
    // Spawns 3 research lanes via lib/foundation.ts; each emits foundation:progress
    // and the runner emits foundation:complete on the global SSE channel.
    if (method === "POST" && url.pathname === "/api/onboarding/foundation") {
      const body = await parseBody(req, FOUNDATION_BODY);
      if (!body.ok) return body.res;

      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      const result = startFoundation({ from: body.data.from, seed: body.data.seed });
      return json(
        {
          ok: true,
          data: {
            jobIds: result.jobIds,
            agents: FOUNDATION_AGENTS as readonly string[],
            note: body.data.from
              ? "Scraping project URL via mktg init; subscribe to /api/events for foundation:* events"
              : "Seeding brand templates; run /cmo for full per-skill research",
          },
        },
        202,
        corsHeaders,
      );
    }

    // POST /api/brand/refresh — same plumbing as foundation; entry from
    // Settings tab "Refresh research" button.
    if (method === "POST" && url.pathname === "/api/brand/refresh") {
      const body = await parseBody(req, FOUNDATION_BODY);
      if (!body.ok) return body.res;
      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      const result = startFoundation({ from: body.data.from, seed: body.data.seed });
      return json(
        {
          ok: true,
          data: {
            jobIds: result.jobIds,
            agents: FOUNDATION_AGENTS as readonly string[],
            note: "Brand refresh queued; subscribe to /api/events for foundation:* events",
          },
        },
        202,
        corsHeaders,
      );
    }

    // POST /api/brand/reset?confirm=true — destructive, wipe brand/ to templates.
    if (method === "POST" && url.pathname === "/api/brand/reset") {
      const confirm = url.searchParams.get("confirm") === "true";
      if (!confirm) {
        return errResponse(
          "CONFIRM_REQUIRED",
          "This route is destructive and requires explicit confirmation",
          400,
          "Add ?confirm=true to the URL",
          corsHeaders,
        );
      }
      if (isDryRun(url)) return json({ ok: true, dryRun: true }, 200, corsHeaders);

      // A15 / H1-110: back up brand/ BEFORE doing anything destructive.
      // If the backup fails we refuse to proceed — the whole point of
      // this code path is that losing months of learnings.md is not an
      // acceptable failure mode. Users can always re-try once the
      // backup target is writable.
      const backup = await backupBrandDir(STUDIO_CWD);
      if (!backup.ok) {
        return err(
          `Backup failed: ${backup.error}`,
          502,
          corsHeaders,
          "Brand files NOT reset. Verify `zip` is on PATH and `.mktg/` is writable, then retry.",
        );
      }

      // Re-run mktg init --skip-skills --skip-agents --yes which recreates
      // brand/ from templates. Existing files are overwritten.
      try {
        const proc = Bun.spawn(
          ["mktg", "init", "--yes", "--skip-skills", "--skip-agents", "--json"],
          { cwd: STUDIO_CWD, stdout: "pipe", stderr: "pipe" },
        );
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;
        if (exitCode !== 0) {
          return err(stderr.trim() || `mktg init exited ${exitCode}`, 502, corsHeaders, "Run `mktg doctor` to diagnose");
        }
      } catch (e) {
        return err(
          e instanceof Error ? e.message : "spawn failed",
          502,
          corsHeaders,
          "Ensure marketing-cli is installed: npm i -g marketing-cli",
        );
      }

      const files = Object.values(AGENT_TO_FILE);
      for (const f of files) {
        globalEmitter.publish("*", { type: "brand-file-changed", payload: { file: f } });
      }
      const backupData = backup.skipped
        ? { skipped: true as const, reason: backup.reason }
        : {
            skipped: false as const,
            path: backup.backupRelativePath,
            fileCount: backup.fileCount,
            sizeBytes: backup.sizeBytes,
          };
      return json(
        {
          ok: true,
          data: {
            filesReset: files,
            backup: backupData,
            note: backup.skipped
              ? "brand/ reset to templates — POST /api/brand/refresh or run /cmo to repopulate"
              : `brand/ backed up to ${backup.backupRelativePath} then reset to templates — POST /api/brand/refresh or run /cmo to repopulate`,
          },
        },
        200,
        corsHeaders,
      );
    }

    // GET /api/settings/env/status — per-key set/unset map. NEVER returns values.
    if (method === "GET" && url.pathname === "/api/settings/env/status") {
      const KNOWN = [
        "POSTIZ_API_KEY",
        "POSTIZ_API_BASE",
        "TYPEFULLY_API_KEY",
        "EXA_API_KEY",
        "FIRECRAWL_API_KEY",
        "RESEND_API_KEY",
      ] as const;
      const envPath = join(STUDIO_CWD, ".env.local");
      const fileLines = existsSync(envPath)
        ? readFileSync(envPath, "utf-8").split("\n")
        : [];
      const inFile = new Set(
        fileLines.map((l) => l.split("=")[0]?.trim()).filter((k): k is string => Boolean(k)),
      );
      const result = {} as Record<(typeof KNOWN)[number], "set" | "unset">;
      for (const key of KNOWN) {
        result[key] = inFile.has(key) || Boolean(process.env[key]) ? "set" : "unset";
      }
      return json({ ok: true, data: result }, 200, corsHeaders);
    }

    // GET /api/onboarding/stream — SSE for onboarding progress
    if (method === "GET" && url.pathname === "/api/onboarding/stream") {
      return globalEmitter.subscribe("onboarding");
    }

    // -----------------------------------------------------------------------
    // Publish tab
    // -----------------------------------------------------------------------
    // Note: when an upstream is unreachable but the route is healthy we return
    // `{ok:true, data:[], degraded:true, degradedReason:"..."}`. The route
    // itself succeeded — the *upstream* is degraded — so `ok:true` is right.
    // The `error` envelope (axis 7) is reserved for true `ok:false` failures.

    if (method === "GET" && url.pathname === "/api/publish/adapters") {
      const result = await mktgPublishListAdapters();
      if (!result.ok) {
        return json(
          {
            ok: true,
            data: [],
            degraded: true,
            degradedReason: result.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return respondList(req, url, result.data.adapters, corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/publish/integrations") {
      const adapter = url.searchParams.get("adapter") ?? "postiz";
      const idCheck = validateResourceId(adapter, "adapter");
      if (!idCheck.ok) {
        return err(idCheck.message, 400, corsHeaders, "Use [a-z0-9._-] only");
      }

      const result = await mktgPublishListIntegrations(adapter);
      if (!result.ok) {
        return json(
          {
            ok: true,
            data: [],
            adapter,
            degraded: true,
            degradedReason: result.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return respondList(req, url, result.data.integrations, {
        ...corsHeaders,
        "X-Adapter": adapter,
      });
    }

    if (method === "GET" && url.pathname === "/api/publish/postiz/diagnostics") {
      const diagnostics = await diagnosePostiz();
      return respondObject(url, diagnostics, corsHeaders);
    }

    if (method === "GET" && url.pathname === "/api/publish/native/account") {
      const result = await mktgPublishNativeAccount();
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondObject(url, result.data, corsHeaders);
    }

    if (method === "POST" && url.pathname === "/api/publish/native/providers") {
      const dryRun = url.searchParams.get("dryRun") === "true";
      const parsed = await parseBody(req, PUBLISH_NATIVE_PROVIDER_BODY);
      if (!parsed.ok) return parsed.res;

      for (const [field, value] of Object.entries({
        identifier: parsed.data.identifier,
        name: parsed.data.name,
        profile: parsed.data.profile,
        picture: parsed.data.picture ?? "",
      })) {
        const c = rejectControlChars(value, field);
        if (!c.ok) {
          return err(c.message, 400, corsHeaders, `Remove control characters from ${field}`);
        }
      }

      if (dryRun) {
        return json({ ok: true, dryRun: true, adapter: "mktg-native", input: parsed.data }, 200, corsHeaders);
      }

      const result = await mktgPublishNativeUpsertProvider(parsed.data);
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondObject(url, result.data, corsHeaders);
    }

    // GET /api/publish/scheduled — Postiz-side queue (read-through)
    if (method === "GET" && url.pathname === "/api/publish/scheduled") {
      const adapter = url.searchParams.get("adapter") ?? "postiz";
      const adapterCheck = validateResourceId(adapter, "adapter");
      if (!adapterCheck.ok) {
        return err(adapterCheck.message, 400, corsHeaders, "Use lowercase adapter ids like postiz or mktg-native");
      }
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
      const defaultEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString();
      const startDate = url.searchParams.get("startDate") ?? defaultStart;
      const endDate = url.searchParams.get("endDate") ?? defaultEnd;

      for (const [field, value] of Object.entries({ startDate, endDate })) {
        const c = rejectControlChars(value, field);
        if (!c.ok) {
          return err(c.message, 400, corsHeaders, `Send ${field} as a clean ISO 8601 string`);
        }
        if (Number.isNaN(Date.parse(value))) {
          return err(
            `${field} must be ISO 8601`,
            400,
            corsHeaders,
            "Use new Date().toISOString() format",
          );
        }
      }

      if (adapter === "mktg-native") {
        const result = await mktgPublishNativeListPosts();
        if (!result.ok) return respondMktgError(result, corsHeaders);

        const filtered = result.data.posts.filter((post) =>
          post.date >= startDate && post.date <= endDate,
        );
        return respondList(req, url, filtered, {
          ...corsHeaders,
          "X-Adapter": adapter,
        });
      }

      const result = await getScheduledPosts(startDate, endDate);
      if (!result.ok) {
        return json(
          {
            ok: true,
            data: [],
            degraded: true,
            degradedReason: mapPostizError(result.error),
            postizErrorKind: result.error.kind,
            adapter,
          },
          200,
          corsHeaders,
        );
      }
      return respondList(req, url, result.data, {
        ...corsHeaders,
        "X-Adapter": adapter,
      });
    }

    // GET /api/publish/history — local SQLite publish_log
    if (method === "GET" && url.pathname === "/api/publish/history") {
      const limit = Math.min(
        Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
        500,
      );
      const offset = Math.max(
        parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
        0,
      );

      const rows = queryAll<{
        id: number;
        adapter: string;
        providers: string | null;
        content_preview: string | null;
        result: string | null;
        items_published: number;
        items_failed: number;
        created_at: string;
      }>(
        "SELECT id, adapter, providers, content_preview, result, items_published, items_failed, created_at FROM publish_log ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset],
      );

      const data = rows.map((r) => ({
        id: r.id,
        adapter: r.adapter,
        providers: r.providers ? safeJsonParse<string[]>(r.providers, []) : [],
        contentPreview: r.content_preview ?? "",
        result: r.result ? safeJsonParse<unknown>(r.result, null) : null,
        itemsPublished: r.items_published,
        itemsFailed: r.items_failed,
        createdAt: r.created_at,
      }));

      return respondList(req, url, data, corsHeaders);
    }

    if (method === "POST" && url.pathname === "/api/publish") {
      const body = await parseBody(
        req,
        z.object({
          adapter: z.string().min(1).max(64),
          manifest: z.record(z.string(), z.unknown()),
          confirm: z.boolean().optional(),
        }),
      );
      if (!body.ok) return body.res;

      const idCheck = validateResourceId(body.data.adapter, "adapter");
      if (!idCheck.ok) return err(idCheck.message, 400, corsHeaders);

      if (isDryRun(url)) {
        return json(
          { ok: true, dryRun: true, adapter: body.data.adapter },
          200,
          corsHeaders,
        );
      }

      const manifest = body.data.manifest as unknown as PublishManifest;
      const result = await mktgPublish(manifest, {
        adapter: body.data.adapter,
        confirm: body.data.confirm ?? false,
      });

      if (!result.ok) {
        const code: StudioErrorCode =
          result.error.code === "AUTH_MISSING" || result.error.code === "AUTH_INVALID"
            ? "UNAUTHORIZED"
            : result.error.code === "RATE_LIMITED"
              ? "RATE_LIMITED"
              : "UPSTREAM_FAILED";
        const fix = result.error.suggestions?.[0] ?? undefined;
        return errResponse(code, result.error.message, code === "UNAUTHORIZED" ? 401 : 502, fix, corsHeaders);
      }

      const data = result.data;
      const adapterResults = data.adapters?.[0];
      const providers = adapterResults
        ? Array.from(
            new Set(
              (manifest.items ?? [])
                .flatMap((it) => {
                  const meta = it.metadata ?? {};
                  const integ = meta.integrationIdentifier;
                  if (typeof integ === "string") return [integ];
                  if (Array.isArray(integ)) return integ as string[];
                  return [];
                })
                .filter(Boolean) as string[],
            ),
          )
        : [];

      const contentPreview = (manifest.items?.[0]?.content ?? "").slice(0, 280);

      execute(
        `INSERT INTO publish_log (adapter, providers, content_preview, result, items_published, items_failed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          body.data.adapter,
          providers.length ? JSON.stringify(providers) : null,
          contentPreview,
          JSON.stringify(data),
          data.published ?? 0,
          data.failed ?? 0,
        ],
      );

      globalEmitter.publish("*", {
        type: "publish-completed",
        payload: {
          adapter: body.data.adapter,
          published: data.published ?? 0,
          failed: data.failed ?? 0,
        },
      });

      return json({ ok: true, data }, 200, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // Catalog — wrapRoute migrated (T4)
    // -----------------------------------------------------------------------
    if (method === "GET" && url.pathname === "/api/catalog/list") {
      const result = await mktgCatalogList();
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondList(req, url, result.data.catalogs, corsHeaders);
    }
    if (method === "GET" && url.pathname === "/api/catalog/status") {
      const result = await mktgCatalogStatus();
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondList(req, url, result.data.catalogs, corsHeaders);
    }

    const catalogInfoMatch = url.pathname.match(/^\/api\/catalog\/info\/([a-z0-9-]+)$/);
    if (method === "GET" && catalogInfoMatch) {
      const name = catalogInfoMatch[1];
      const idCheck = validateResourceId(name, "catalog");
      if (!idCheck.ok) return err(idCheck.message, 400, corsHeaders);
      const result = await mktgCatalogInfo(name);
      if (!result.ok) return respondMktgError(result, corsHeaders);
      return respondObject(url, result.data, corsHeaders);
    }

    // -----------------------------------------------------------------------
    // 404 fallthrough — structured envelope (Agent DX axis 7)
    // -----------------------------------------------------------------------
    return err(
      `No route registered for ${method} ${url.pathname}`,
      404,
      corsHeaders,
      "Hit GET /api/schema for the full route list",
    );
  },

  error(error) {
    console.error("[server] Unhandled error:", error.message);
    return new Response(
      JSON.stringify(
        errEnv("INTERNAL", "Unhandled server error", "Check the server logs and report at github.com/MoizIbnYousaf/marketing-cli/issues"),
      ),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});

console.log(`[server] mktg-studio backend running on http://localhost:${PORT}`);
console.log(`[server] Routes: ${ROUTE_SCHEMA.length} registered`);
console.log(`[server] Health: http://localhost:${PORT}/api/health`);
console.log(`[server] Schema: http://localhost:${PORT}/api/schema`);
console.log(`[server] Events: http://localhost:${PORT}/api/events (SSE)`);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on("SIGINT", () => {
  console.log("\n[server] Shutting down...");
  stopBrandWatcher();
  stopContentWatcher();
  closeDb();
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopBrandWatcher();
  stopContentWatcher();
  closeDb();
  server.stop();
  process.exit(0);
});
