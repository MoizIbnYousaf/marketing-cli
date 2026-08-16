// Shared helpers for route modules extracted from server.ts.
// Prefer lib/* for DX/auth/validators; keep only tiny local utilities here.

import type { z } from "zod";
import type { StudioErrorCode } from "../lib/output.ts";

/** Parse JSON or return `fallback` on any parse failure. */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * HTTP helpers injected into extracted route modules so they share the same
 * json/err/parseBody/respond* implementations as the server.ts perimeter.
 */
export type RouteHttpHelpers = {
  json: (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;
  err: (
    message: string,
    status?: number,
    extraHeaders?: Record<string, string>,
    fix?: string,
  ) => Response;
  errResponse: (
    code: StudioErrorCode,
    message: string,
    status: number,
    fix?: string,
    extraHeaders?: Record<string, string>,
  ) => Response;
  parseBody: <T>(
    req: Request,
    schema: z.ZodSchema<T>,
  ) => Promise<{ ok: true; data: T } | { ok: false; res: Response }>;
  isDryRun: (url: URL) => boolean;
  respondList: <T>(
    req: Request,
    url: URL,
    items: readonly T[],
    corsHeaders: Record<string, string>,
  ) => Response;
  respondObject: <T>(
    url: URL,
    data: T,
    corsHeaders: Record<string, string>,
    extras?: Record<string, unknown>,
  ) => Response;
  respondMktgError: (
    result: { error: { code: string; message: string; suggestions: readonly string[] } },
    corsHeaders: Record<string, string>,
  ) => Response;
};

// ---------------------------------------------------------------------------
// CLI error → Studio error mapping (single source; used by server.ts
// respondMktgError and server/routes/publish.ts).
//
// The mktg CLI emits: INVALID_ARGS, MISSING_INPUT, UNKNOWN_FIELD, UNKNOWN_FLAG,
// NOT_FOUND, NOT_IMPLEMENTED, MISSING_DEPENDENCY, NETWORK_ERROR, SKILL_FAILED,
// TIMEOUT, IO_ERROR, UNHANDLED_ERROR. Client-side mistakes must NOT surface as
// 502 UPSTREAM_FAILED — that hides a bad request behind an "upstream" label.
// ---------------------------------------------------------------------------
export function mapMktgErrorCode(cliCode: string): { code: StudioErrorCode; status: number } {
  switch (cliCode) {
    case "INVALID_ARGS":
    case "MISSING_INPUT":
    case "UNKNOWN_FIELD":
    case "UNKNOWN_FLAG":
    case "NOT_IMPLEMENTED":
      return { code: "BAD_INPUT", status: 400 };
    case "NOT_FOUND":
      return { code: "NOT_FOUND", status: 404 };
    case "AUTH_MISSING":
    case "AUTH_INVALID":
      return { code: "UNAUTHORIZED", status: 401 };
    case "RATE_LIMITED":
      return { code: "RATE_LIMITED", status: 429 };
    default:
      // MISSING_DEPENDENCY, NETWORK_ERROR, SKILL_FAILED, TIMEOUT, IO_ERROR,
      // SPAWN_ERROR, PARSE_ERROR, UNHANDLED_ERROR
      return { code: "UPSTREAM_FAILED", status: 502 };
  }
}
