// lib/dx.ts — Agent DX 21/21 route wrapper
//
// `wrapRoute()` handles the cross-cutting concerns every studio endpoint
// needs: strict JSON error envelope, dry-run + confirm rails, field-mask
// filtering, access logging. Handlers return plain data; the wrapper
// shapes it into the response.
//
// Contract:
//   - Success body is exactly what the handler returns (JSON.stringify-able).
//   - Error body is always `{ok: false, error: {code, message, fix?}}`.
//   - `?dryRun=true` short-circuits mutations and returns `{ok: true, dryRun: true}`.
//   - `?confirm=true` is required on destructive routes.
//   - `?fields=a.b,c` masks top-level and nested fields via dot paths.

import type { ZodType } from "zod";
import { logAccess } from "./logger.ts";
import { parseJsonInput } from "./validators.ts";
import { wantsNdjson, streamNdjson } from "./ndjson.ts";

// ---------------------------------------------------------------------------
// Error vocabulary — every code documented with a deterministic fix hint.
// ---------------------------------------------------------------------------

// All ErrorCode values are also valid `StudioErrorCode` consumers (the wider
// vocabulary in lib/output.ts). The audit suite (tests/agent-dx.test.ts) and
// the cmo-api.md contract treat the canonical input-rejection code as
// `BAD_INPUT`; the granular variants below (INVALID_JSON, etc.) are kept for
// detailed logging but parseBodyStrict + apiError surface BAD_INPUT to the
// wire so downstream consumers don't have to branch on every flavor.
export type ErrorCode =
  | "BAD_INPUT"             // canonical input-rejection, used at the wire
  | "INVALID_INPUT"         // alias for BAD_INPUT (legacy)
  | "INVALID_JSON"          // alias for BAD_INPUT (legacy)
  | "PAYLOAD_TOO_LARGE"
  | "UNSAFE_JSON_KEYS"
  | "CONTROL_CHARS_REJECTED"
  | "DOUBLE_ENCODING"
  | "PATH_TRAVERSAL"
  | "PATH_ABSOLUTE"
  | "SYMLINK_REJECTED"
  | "INVALID_RESOURCE_ID"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFIRM_REQUIRED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_FAILED"       // generic upstream non-200
  | "MKTG_CLI_FAILED"
  | "POSTIZ_UNREACHABLE"
  | "SCHEMA_MISMATCH"
  | "INTERNAL_ERROR";

export const ERROR_FIX_HINTS: Record<ErrorCode, string> = {
  BAD_INPUT: "Check the request body against GET /api/schema",
  INVALID_INPUT: "Check the request body against GET /api/schema",
  INVALID_JSON: "Send a valid JSON object as the request body",
  PAYLOAD_TOO_LARGE: "Keep the JSON body under 64 KB",
  UNSAFE_JSON_KEYS: "Remove __proto__ or constructor keys from the payload",
  CONTROL_CHARS_REJECTED:
    "Strip control characters from the value (tabs and newlines are the only ones allowed)",
  DOUBLE_ENCODING: "Send plain paths, not URL-encoded ones",
  PATH_TRAVERSAL: "Drop `..` segments — paths must stay inside the project root",
  PATH_ABSOLUTE: "Use a project-relative path, not an absolute one",
  SYMLINK_REJECTED: "Replace the symlink with a regular file",
  INVALID_RESOURCE_ID:
    "Use lowercase a-z, 0-9, dots, hyphens, underscores (≤128 chars)",
  NOT_FOUND: "Check GET /api/schema for valid routes and GET /api/jobs/:id for valid job ids",
  METHOD_NOT_ALLOWED: "Check the method column in GET /api/schema",
  CONFIRM_REQUIRED: "Add ?confirm=true to the URL to confirm this destructive action",
  CONFLICT: "Reload the resource and merge — your expected version is stale",
  RATE_LIMITED: "Back off — this client exceeded 60 requests/minute",
  UPSTREAM_FAILED: "Upstream service failed — retry; if persistent, check the upstream health",
  MKTG_CLI_FAILED:
    "Check that mktg is installed (npm i -g marketing-cli) and `mktg doctor` passes",
  POSTIZ_UNREACHABLE:
    "Check POSTIZ_API_KEY + POSTIZ_API_BASE; verify with `mktg doctor`",
  SCHEMA_MISMATCH: "The upstream response didn't match the expected shape — file a bug",
  INTERNAL_ERROR: "Check the server logs. This is a bug — please report.",
};

export interface ApiErrorBody {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    fix?: string;
  };
}

export function apiErrorBody(
  code: ErrorCode,
  message: string,
  fix?: string,
): ApiErrorBody {
  return {
    ok: false,
    error: {
      code,
      message,
      fix: fix ?? ERROR_FIX_HINTS[code],
    },
  };
}

export function apiError(
  code: ErrorCode,
  message: string,
  status = 400,
  extraHeaders: Record<string, string> = {},
  fix?: string,
): Response {
  return new Response(JSON.stringify(apiErrorBody(code, message, fix)), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Field mask — dot-path filtering for Agent DX axis 4.
// Works on arrays (masks every element) and nested objects.
// ---------------------------------------------------------------------------

export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  const parts = path.split(".");
  let cursor: unknown = obj;
  for (const part of parts) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      return cursor.map((item) => getNestedValue(item, parts.slice(parts.indexOf(part)).join(".")));
    }
    if (typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cursor;
}

function pickDotPath(target: Record<string, unknown>, source: unknown, path: string): void {
  if (source == null || typeof source !== "object") return;
  const dotIdx = path.indexOf(".");
  const head = dotIdx < 0 ? path : path.slice(0, dotIdx);
  const tail = dotIdx < 0 ? "" : path.slice(dotIdx + 1);

  if (Array.isArray(source)) {
    const arr = target[head];
    const existing = Array.isArray(arr) ? (arr as unknown[]) : [];
    const out: unknown[] = source.map((item, i) => {
      const cur = existing[i] ?? {};
      if (tail) {
        if (typeof cur === "object" && cur !== null && !Array.isArray(cur)) {
          pickDotPath(cur as Record<string, unknown>, item, path);
          return cur;
        }
        const fresh: Record<string, unknown> = {};
        pickDotPath(fresh, item, path);
        return fresh;
      }
      return item;
    });
    target[head] = out;
    return;
  }

  const src = source as Record<string, unknown>;
  if (!(head in src)) return;

  if (!tail) {
    target[head] = src[head];
    return;
  }

  const nestedSrc = src[head];
  if (nestedSrc == null) return;

  if (Array.isArray(nestedSrc)) {
    const out = nestedSrc.map((item) => {
      const fresh: Record<string, unknown> = {};
      pickDotPath(fresh, item, tail);
      return fresh;
    });
    target[head] = out;
    return;
  }

  if (typeof nestedSrc === "object") {
    const existing = target[head];
    const nestedTarget =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    pickDotPath(nestedTarget, nestedSrc, tail);
    target[head] = nestedTarget;
  }
}

export type FieldMaskResult =
  | { ok: true; data: unknown }
  | { ok: false; missing: string[]; available: string[] };

function topLevelKeys(data: unknown): string[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    const keys = new Set<string>();
    for (const item of data.slice(0, 10)) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        for (const k of Object.keys(item as Record<string, unknown>)) keys.add(k);
      }
    }
    return Array.from(keys).sort();
  }
  if (typeof data === "object") {
    return Object.keys(data as Record<string, unknown>).sort();
  }
  return [];
}

function fieldHeadResolves(data: unknown, head: string): boolean {
  if (data == null || typeof data !== "object") return false;
  if (Array.isArray(data)) {
    return data.some((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? head in (item as Record<string, unknown>)
        : false,
    );
  }
  return head in (data as Record<string, unknown>);
}

/**
 * Apply a comma-separated `?fields=a.b,c.d` mask to an object or array.
 * Top-level arrays are masked element-wise.
 *
 * Returns a `FieldMaskResult`. Unknown top-level fields produce a structured
 * failure with the available field set so the caller can surface a
 * `BAD_INPUT` envelope (Agent DX axis 4 contract).
 */
export function applyFieldMaskStrict(
  data: unknown,
  fieldsParam: string | null,
): FieldMaskResult {
  if (!fieldsParam || data == null || typeof data !== "object") {
    return { ok: true, data };
  }
  const paths = fieldsParam
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && /^[a-zA-Z0-9_.]+$/.test(p));
  if (paths.length === 0) return { ok: true, data };

  const missing: string[] = [];
  for (const path of paths) {
    const head = path.split(".")[0]!;
    if (!fieldHeadResolves(data, head)) missing.push(path);
  }

  if (missing.length > 0) {
    return { ok: false, missing, available: topLevelKeys(data) };
  }

  if (Array.isArray(data)) {
    return {
      ok: true,
      data: data.map((item) => {
        const out: Record<string, unknown> = {};
        for (const path of paths) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            pickDotPath(out, item, path);
          }
        }
        return out;
      }),
    };
  }

  const out: Record<string, unknown> = {};
  for (const path of paths) pickDotPath(out, data, path);
  return { ok: true, data: out };
}

/**
 * Backward-compatible wrapper that silently drops unknown fields.
 * Prefer `applyFieldMaskStrict` for new code.
 */
export function applyFieldMask(data: unknown, fieldsParam: string | null): unknown {
  if (!fieldsParam || data == null || typeof data !== "object") return data;
  const paths = fieldsParam
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && /^[a-zA-Z0-9_.]+$/.test(p));
  if (paths.length === 0) return data;

  if (Array.isArray(data)) {
    return data.map((item) => applyFieldMask(item, fieldsParam));
  }

  const out: Record<string, unknown> = {};
  for (const path of paths) pickDotPath(out, data, path);
  return out;
}

// ---------------------------------------------------------------------------
// Body parsing — wraps zod + parseJsonInput (64KB + prototype-pollution guard).
// ---------------------------------------------------------------------------

export async function parseBodyStrict<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return {
      ok: false,
      res: apiError("BAD_INPUT", "Failed to read request body", 400, {}, "Send a valid JSON object as the request body"),
    };
  }

  const parsed = parseJsonInput<unknown>(raw);
  if (!parsed.ok) {
    if (parsed.message.includes("64KB")) {
      return {
        ok: false,
        res: apiError("PAYLOAD_TOO_LARGE", parsed.message, 413),
      };
    }
    if (parsed.message.includes("Unsafe")) {
      return {
        ok: false,
        res: apiError("UNSAFE_JSON_KEYS", parsed.message),
      };
    }
    // Malformed JSON → BAD_INPUT (canonical wire code per docs/cmo-api.md)
    return {
      ok: false,
      res: apiError("BAD_INPUT", parsed.message, 400, {}, "Send a valid JSON object as the request body"),
    };
  }

  // Promote ZodObject schemas to strict mode so unknown fields are rejected
  // at the wire instead of silently stripped (audit P2-A). This keeps the
  // runtime in lockstep with the `additionalProperties: false` that
  // lib/schema-export.ts already advertises on GET /api/schema.
  const maybeStrict = schema as unknown as { strict?: () => ZodType<T> };
  const strictSchema =
    typeof maybeStrict.strict === "function" ? maybeStrict.strict() : schema;

  const check = strictSchema.safeParse(parsed.data);
  if (!check.success) {
    const message = check.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    const fields = check.error.issues
      .map((e) => (e.path.length > 0 ? e.path.join(".") : "(root)"))
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .join(", ");
    return {
      ok: false,
      res: apiError("BAD_INPUT", message, 400, {}, fields ? `Check field(s): ${fields}` : "Check the request body shape"),
    };
  }

  return { ok: true, data: check.data };
}

// ---------------------------------------------------------------------------
// Rate limiter — sliding window, pluggable backend, per IP+method.
// 60 req/min default. Mutating methods only; GET is assumed idempotent.
//
// Backend is selected at startup via the `RATE_LIMIT_STORE` env var
// (memory | sqlite). See lib/rate-limit-store.ts for the contract.
// ---------------------------------------------------------------------------

import { getRateLimitStore } from "./rate-limit-store.ts";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface RateCheckOk {
  ok: true;
  /** True when the underlying store failed and let the request through anyway. */
  degraded?: boolean;
}
export interface RateCheckBlocked {
  ok: false;
  retryAfterSec: number;
}

export function checkRateLimit(req: Request): RateCheckOk | RateCheckBlocked {
  if (!MUTATING_METHODS.has(req.method)) return { ok: true };

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const key = `${ip}:${req.method}`;
  const now = Date.now();

  const store = getRateLimitStore();
  const { count, oldestHitMs } = store.incr(key, RATE_WINDOW_MS, now);

  // If the store is degraded (e.g. SQLite write failed), the count we got is
  // best-effort — fail open with the header so callers can surface it.
  if (store.isDegraded()) {
    return { ok: true, degraded: true };
  }

  if (count > RATE_MAX) {
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - oldestHitMs)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true };
}

/** Reset all rate buckets. Test-only. */
export function resetRateLimits(): void {
  getRateLimitStore().reset();
}

// ---------------------------------------------------------------------------
// wrapRoute — the route-handler wrapper.
// ---------------------------------------------------------------------------

export interface DXContext {
  req: Request;
  url: URL;
  corsHeaders: Record<string, string>;
  dryRun: boolean;
  fields: string | null;
  acceptsNdjson: boolean;
}

export type DXHandlerResult<O> =
  | {
      ok: true;
      data: O;
      status?: number;
      /**
       * Optional sibling metadata. Surfaced as a top-level `meta` key on the
       * response envelope so it stays out of `data` (and therefore out of
       * NDJSON streams + field masks). Useful for `fetchedAt`,
       * `lastUpdatedAt`, freshness windows, pagination cursors.
       */
      meta?: Record<string, unknown>;
    }
  | { ok: false; code: ErrorCode; message: string; status?: number; fix?: string };

export type DXHandler<I, O> = (
  input: I,
  ctx: DXContext,
) => Promise<DXHandlerResult<O>>;

export interface WrapRouteOptions<I, O> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Zod schema for POST/PUT/PATCH body. Omit for GET. */
  inputSchema?: ZodType<I>;
  /** True = this is a mutation — supports `?dryRun=true`. */
  dryRun?: boolean;
  /** True = destructive — requires `?confirm=true`. */
  destructive?: boolean;
  /** True = response is a list and should support NDJSON + field-mask element-wise. */
  listResponse?: boolean;
  /** The actual handler. Called after all gates pass. */
  handler: DXHandler<I, O>;
}

/**
 * Wrap a route handler with the full DX 21/21 stack:
 *   - method check
 *   - rate limit (mutations only)
 *   - dry-run gate
 *   - confirm gate (destructive)
 *   - JSON body parse + zod validate
 *   - field-mask on response
 *   - NDJSON streaming on list responses
 *   - access log
 *   - consistent error envelope
 */
export function wrapRoute<I = undefined, O = unknown>(
  opts: WrapRouteOptions<I, O>,
): (req: Request, corsHeaders?: Record<string, string>) => Promise<Response> {
  return async (req, corsHeaders = {}) => {
    const started = performance.now();

    let response: Response;

    try {
      if (req.method !== opts.method) {
        response = apiError(
          "METHOD_NOT_ALLOWED",
          `${req.method} not allowed on this route`,
          405,
          corsHeaders,
        );
      } else {
        const rate = checkRateLimit(req);
        if (rate.ok && rate.degraded) {
          // Fail-open path: the underlying store had a hiccup but we let the
          // request through. Tag every downstream response with the header
          // so callers know the count they're seeing isn't authoritative.
          corsHeaders = { ...corsHeaders, "X-Rate-Limit-Degraded": "true" };
        }
        if (!rate.ok) {
          response = apiError(
            "RATE_LIMITED",
            `Rate limit exceeded — retry in ${rate.retryAfterSec}s`,
            429,
            { ...corsHeaders, "Retry-After": String(rate.retryAfterSec) },
          );
        } else {
          const url = new URL(req.url);
          const dryRun = url.searchParams.get("dryRun") === "true";
          const confirm = url.searchParams.get("confirm") === "true";
          const fields = url.searchParams.get("fields");

          if (opts.destructive && !confirm) {
            response = apiError(
              "CONFIRM_REQUIRED",
              "This route is destructive and requires explicit confirmation",
              400,
              corsHeaders,
            );
          } else {
            let input: I = undefined as unknown as I;
            if (opts.inputSchema && opts.method !== "GET") {
              const parsed = await parseBodyStrict(req, opts.inputSchema);
              if (!parsed.ok) {
                response = parsed.res;
                logAccess(req, response.status, performance.now() - started);
                return withCors(response, corsHeaders);
              }
              input = parsed.data;
            }

            if (dryRun && opts.dryRun) {
              response = new Response(
                JSON.stringify({ ok: true, dryRun: true }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                },
              );
            } else {
              const ctx: DXContext = {
                req,
                url,
                corsHeaders,
                dryRun,
                fields,
                acceptsNdjson: wantsNdjson(req),
              };

              const result = await opts.handler(input, ctx);

              if (!result.ok) {
                response = apiError(
                  result.code,
                  result.message,
                  result.status ?? 400,
                  corsHeaders,
                  result.fix,
                );
              } else {
                response = shapeOk(
                  result.data,
                  ctx,
                  result.status ?? 200,
                  opts.listResponse === true,
                  result.meta,
                );
              }
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response = apiError("INTERNAL_ERROR", message, 500, corsHeaders);
    }

    logAccess(req, response.status, performance.now() - started);
    return withCors(response, corsHeaders);
  };
}

function withCors(res: Response, cors: Record<string, string>): Response {
  if (Object.keys(cors).length === 0) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function shapeOk<O>(
  data: O,
  ctx: DXContext,
  status: number,
  listResponse: boolean,
  meta?: Record<string, unknown>,
): Response {
  const maskResult = applyFieldMaskStrict(data, ctx.fields);
  if (!maskResult.ok) {
    return apiError(
      "BAD_INPUT",
      `Unknown field(s): ${maskResult.missing.join(", ")}`,
      400,
      ctx.corsHeaders,
      maskResult.available.length > 0
        ? `Available top-level fields: ${maskResult.available.join(", ")}`
        : "Drop the ?fields= query or pick a real field",
    );
  }
  const masked = maskResult.data;

  if (listResponse && ctx.acceptsNdjson && Array.isArray(masked)) {
    // NDJSON drops `meta` (it's stream-of-items by definition). Callers
    // that need both should fetch in JSON mode.
    return streamNdjson(masked as Iterable<unknown>, ctx.corsHeaders);
  }

  const body: Record<string, unknown> = { ok: true, data: masked };
  if (meta) body.meta = meta;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...ctx.corsHeaders },
  });
}

// ---------------------------------------------------------------------------
// Exports for tests + server.ts interop with the legacy helpers.
// ---------------------------------------------------------------------------

export const __internals = {
  pickDotPath,
};
