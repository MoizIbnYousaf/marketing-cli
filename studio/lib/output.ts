// lib/output.ts -- Agent DX 21/21 helpers for server.ts
//
// Mirrors the mktg CLI's output contract:
//   - errEnv: structured error envelope `{ok:false, error:{code, message, fix?}}`
//   - applyFields: dot-notation field mask with smart pivot (axis 4)
//   - ndjsonStream: NDJSON streaming response for list endpoints (axis 4)
//
// Reference: ~/projects/mktgmono/marketing-cli/src/core/output.ts (filterFields + pickFromObject)

// ─── Error envelope ─────────────────────────────────────────────────────────

export type StudioErrorCode =
  | "BAD_INPUT"          // Schema or validator rejection
  | "PATH_TRAVERSAL"     // Path escaped project-root / brand-root guardrails
  | "NOT_FOUND"          // Resource missing
  | "UNAUTHORIZED"       // Missing/invalid credentials
  | "RATE_LIMITED"       // Upstream throttled us
  | "UPSTREAM_FAILED"    // External service (mktg CLI, postiz) failed
  | "PARSE_ERROR"        // Couldn't parse response
  | "INTERNAL"           // Unhandled server error
  | "CONFIRM_REQUIRED"   // Destructive route called without ?confirm=true
  | "CONFLICT"           // Optimistic-lock failure (e.g. mtime mismatch)
  | "DRY_RUN_ONLY";      // Marker -- not actually returned, used by safety rails

export interface StudioErrorEnvelope {
  readonly code: StudioErrorCode;
  readonly message: string;
  /** Single-line, agent-actionable hint for recovery. */
  readonly fix?: string;
}

export function errEnv(
  code: StudioErrorCode,
  message: string,
  fix?: string,
): { ok: false; error: StudioErrorEnvelope } {
  return fix
    ? { ok: false, error: { code, message, fix } }
    : { ok: false, error: { code, message } };
}

// ─── Field mask (axis 4) ────────────────────────────────────────────────────

/** Split `?fields=a,b.c.d` into a clean array. Returns [] for empty input. */
export function parseFields(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const remaining = parts.slice(i).join(".");
      return current.map((item) =>
        isObject(item) ? getNestedValue(item, remaining) : undefined,
      );
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[parts[i]!];
  }
  return current;
};

const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
};

interface PickResult {
  result: Record<string, unknown>;
  missing: string[];
}

const pickFromObject = (
  data: Record<string, unknown>,
  fields: readonly string[],
): PickResult => {
  const result: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const field of fields) {
    if (field.includes(".")) {
      const value = getNestedValue(data, field);
      if (value !== undefined) {
        setNestedValue(result, field, value);
      } else {
        missing.push(field);
      }
    } else if (field in data) {
      result[field] = data[field];
    } else {
      missing.push(field);
    }
  }
  return { result, missing };
};

const collectArrayKeys = (items: readonly unknown[], limit = 10): string[] => {
  const keys = new Set<string>();
  for (const item of items.slice(0, limit)) {
    if (isObject(item)) {
      for (const key of Object.keys(item)) keys.add(key);
    }
  }
  return Array.from(keys).sort();
};

type FilterResult =
  | { readonly ok: true; readonly data: unknown }
  | {
      readonly ok: false;
      readonly missing: readonly string[];
      readonly available: readonly string[];
    };

const filterArrayItems = (
  items: readonly unknown[],
  fields: readonly string[],
): FilterResult => {
  const filtered: unknown[] = [];
  const missingPerItem: string[][] = [];
  for (const item of items) {
    if (isObject(item)) {
      const { result, missing } = pickFromObject(item, fields);
      filtered.push(result);
      missingPerItem.push(missing);
    } else {
      filtered.push(item);
      missingPerItem.push([...fields]);
    }
  }
  const globallyMissing = fields.filter(
    (f) =>
      missingPerItem.length > 0 && missingPerItem.every((m) => m.includes(f)),
  );
  if (globallyMissing.length > 0) {
    return {
      ok: false,
      missing: globallyMissing,
      available: collectArrayKeys(items),
    };
  }
  return { ok: true, data: filtered };
};

/**
 * Apply a `?fields=` mask to response data.
 * Supports three shapes (matches mktg CLI):
 *   - primitive -- fields don't apply, pass through
 *   - array -- filter each object item
 *   - object -- top-level pick, with smart pivot into the first array-valued
 *              key when every requested field is an item-level field
 *
 * On unresolved fields, returns a structured failure listing what's available.
 */
export function applyFields<T>(data: T, fields: readonly string[]): FilterResult {
  if (fields.length === 0) return { ok: true, data };

  if (data === null || data === undefined || typeof data !== "object") {
    return { ok: true, data };
  }

  if (Array.isArray(data)) {
    return filterArrayItems(data, fields);
  }

  const obj = data as Record<string, unknown>;

  const { result: topLevel, missing: topLevelMissing } = pickFromObject(obj, fields);
  if (topLevelMissing.length === 0) {
    return { ok: true, data: topLevel };
  }

  // Smart pivot: when every requested field is missing at the top level, look
  // for the first array-valued key whose items satisfy all fields.
  if (topLevelMissing.length === fields.length) {
    for (const [_, value] of Object.entries(obj)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      const trial = filterArrayItems(value as unknown[], fields);
      if (trial.ok) return trial;
    }
  }

  return {
    ok: false,
    missing: topLevelMissing,
    available: Object.keys(obj).sort(),
  };
}

/**
 * Convenience: apply ?fields= from a URL and return either the filtered data
 * or a structured BAD_INPUT error that names the missing/available fields.
 */
export function applyFieldsFromUrl<T>(
  data: T,
  url: URL,
):
  | { ok: true; data: unknown }
  | {
      ok: false;
      error: StudioErrorEnvelope;
      status: number;
    } {
  const fields = parseFields(url.searchParams.get("fields"));
  if (fields.length === 0) return { ok: true, data };

  const result = applyFields(data, fields);
  if (result.ok) return { ok: true, data: result.data };

  return {
    ok: false,
    status: 400,
    error: {
      code: "BAD_INPUT",
      message: `Unknown field(s): ${result.missing.join(", ")}`,
      fix:
        result.available.length > 0
          ? `Available top-level fields: ${result.available.join(", ")}`
          : "Drop the ?fields= query or pick a real field",
    },
  };
}

// ─── NDJSON streaming (axis 4) ──────────────────────────────────────────────

/** True when the request explicitly asks for NDJSON via Accept header. */
export function wantsNDJSON(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.toLowerCase().includes("application/x-ndjson");
}

/**
 * Stream `items` as NDJSON. One JSON-encoded item per line, no envelope.
 * Use this on list endpoints when the caller asks for it via
 * `Accept: application/x-ndjson`.
 */
export function ndjsonResponse<T>(
  items: readonly T[],
  extraHeaders: Record<string, string> = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const item of items) {
        controller.enqueue(encoder.encode(JSON.stringify(item) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      ...extraHeaders,
    },
  });
}
