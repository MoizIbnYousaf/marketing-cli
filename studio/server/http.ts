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
