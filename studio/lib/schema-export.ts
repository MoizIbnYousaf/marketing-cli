// lib/schema-export.ts — JSON Schema enrichment for ROUTE_SCHEMA (Agent DX axis 3)
//
// Today each ROUTE_SCHEMA entry can carry a `body: { id: "number", ... }`
// hand-authored description. That works as a fallback (passes axis 3) but
// can drift from the actual Zod validator on the handler.
//
// This module provides a single source of truth: each route's POST/PUT/PATCH
// body has its Zod schema registered here, and `GET /api/schema` emits the
// converted JSON Schema as a sibling `inputSchema` field on each entry.
//
// Uses Zod 4's built-in `z.toJSONSchema()` — zero third-party deps.

import { z, type ZodType } from "zod";

// ─── Registry ───────────────────────────────────────────────────────────────
//
// Maps route path → { method, body? Zod schema }. Add an entry per route that
// has a body schema. Path-pattern routes (e.g. /api/skills/:name) use the
// pattern as-declared in ROUTE_SCHEMA.
//
// The handler's Zod schema MUST be the same instance/shape as what's
// registered here — both the wire validator and the schema export resolve
// off this single declaration.

export interface RouteSchemaSource {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: ZodType<unknown>;
}

const REGISTRY = new Map<string, RouteSchemaSource[]>();

/**
 * Register a route's Zod input schema for /api/schema enrichment.
 * Multiple methods on the same path are allowed (rare but supported).
 */
export function registerRouteSchema(
  path: string,
  source: RouteSchemaSource,
): void {
  const existing = REGISTRY.get(path) ?? [];
  // Replace any prior entry for the same method on the same path.
  const next = existing.filter((s) => s.method !== source.method);
  next.push(source);
  REGISTRY.set(path, next);
}

/**
 * Look up the registered Zod body schema for a route's method.
 * Returns the converted JSON Schema (Draft 2020-12) or undefined.
 */
export function getInputJsonSchema(path: string, method: string): unknown | undefined {
  const entries = REGISTRY.get(path);
  if (!entries) return undefined;
  const match = entries.find((e) => e.method === method);
  if (!match || !match.body) return undefined;
  return safeToJsonSchema(match.body);
}

function safeToJsonSchema(schema: ZodType<unknown>): unknown {
  try {
    return z.toJSONSchema(schema);
  } catch (err) {
    // toJSONSchema can throw on cycles or unsupported types — fall back to
    // a placeholder rather than crashing /api/schema.
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $comment: `Failed to convert Zod schema: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Enrichment ─────────────────────────────────────────────────────────────

/**
 * Generic shape of a ROUTE_SCHEMA entry. We don't import the concrete type
 * from server.ts to avoid a cycle — the entry shape is stable and small.
 */
export interface RouteEntryLike {
  readonly method: string;
  readonly path: string;
  readonly body?: Record<string, unknown> | unknown;
  // Other fields (description, params, accepts, dryRun, errors, confirm) pass through.
  readonly [key: string]: unknown;
}

/**
 * Take a ROUTE_SCHEMA entry and add `inputSchema` (JSON Schema) when the
 * Zod registry has a match. Original entry is preserved — `body` (the
 * stringly-typed description) still ships for backward compat.
 */
export function enrichRouteEntry<T extends RouteEntryLike>(
  entry: T,
): T & { inputSchema?: unknown } {
  const schema = getInputJsonSchema(entry.path, entry.method);
  if (!schema) return entry;
  return { ...entry, inputSchema: schema };
}

/** Apply `enrichRouteEntry` across an array of entries. */
export function enrichRouteSchema<T extends RouteEntryLike>(
  entries: readonly T[],
): (T & { inputSchema?: unknown })[] {
  return entries.map(enrichRouteEntry);
}

// ─── Test helpers (exported for unit coverage) ──────────────────────────────

export function _resetRegistryForTests(): void {
  REGISTRY.clear();
}

export function _registrySize(): number {
  return REGISTRY.size;
}
