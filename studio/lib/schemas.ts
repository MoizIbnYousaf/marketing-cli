// lib/schemas.ts — single source of truth for POST body shapes.
//
// `server.ts` imports these for zod-validated request parsing. They're also
// the basis for the JSON Schema fragments published by /api/schema, so /cmo
// (or any HTTP client) can self-discover the wire contract.
//
// Kept deliberately tiny and dependency-free — any change here propagates to
// every endpoint's runtime validation and the schema introspection surface.

import { z } from "zod";

// ActivityKind — the canonical set of event types /cmo can log. Keep in sync
// with lib/types/activity.ts and components/workspace/activity-panel/.
export const ACTIVITY_KIND = z.enum([
  "skill-run",
  "brand-write",
  "publish",
  "toast",
  "navigate",
  "audit",
  "note",
  "custom",
]);

export const ACTIVITY_LOG_BODY = z.object({
  kind: ACTIVITY_KIND,
  skill: z.string().min(1).max(128).optional(),
  summary: z.string().min(1).max(500),
  detail: z.string().max(8_000).optional(),
  filesChanged: z.array(z.string().max(512)).max(50).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const OPPORTUNITIES_PUSH_BODY = z.object({
  skill: z.string().min(1).max(128),
  reason: z.string().min(1).max(2_000),
  priority: z.number().int().min(0).max(100).optional(),
  prerequisites: z.record(z.string(), z.unknown()).optional(),
});

export const NAVIGATE_BODY = z.object({
  tab: z.enum(["hq", "content", "publish", "brand"]),
  filter: z.record(z.string(), z.unknown()).optional(),
});

export const TOAST_BODY = z.object({
  level: z.enum(["info", "success", "warn", "error"]),
  message: z.string().min(1).max(500),
  duration: z.number().int().min(500).max(60_000).optional(),
});

export const HIGHLIGHT_BODY = z.object({
  tab: z.string().min(1).max(64),
  selector: z.string().max(256).optional(),
  reason: z.string().max(500).optional(),
});

export const BRAND_NOTE_BODY = z.object({
  file: z.string().min(1).max(512),
  excerpt: z.string().min(1).max(8_000),
});

export const SKILL_RUN_BODY = z.object({
  name: z.string().min(1).max(128),
  args: z.record(z.string(), z.unknown()).optional(),
});

export const INIT_BODY = z.object({
  from: z.string().url().optional(),
});

export const PUBLISH_BODY = z.object({
  adapter: z.string().min(1).max(64),
  manifest: z.record(z.string(), z.unknown()),
  confirm: z.boolean().optional(),
});

/**
 * `/api/settings/env` accepts a dynamic record of env-var KVs — caller-supplied
 * keys can't be enumerated up front, so the JSON Schema is a passthrough.
 */
export const SETTINGS_ENV_BODY = z.record(z.string(), z.string().max(512));

/** `/api/brand/reset` is body-less (destructive route gated by ?confirm=true). */
export const BRAND_RESET_BODY = z.object({}).optional();

// ─── Brand docs ───────────────────────────────────────────────────────
//
// Mirrors `BRAND_FILE_NAME_SCHEMA` in server.ts. Path-checked at
// the brand-files layer too — this validator is the first wall.

export const BRAND_FILE_NAME_SCHEMA = z
  .string()
  .min(1)
  .max(128)
  .regex(/^(brand\/)?[a-z0-9][a-z0-9._-]*\.md$/, "must be a .md file under brand/");

export const BRAND_WRITE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
  content: z.string().max(2_000_000), // 2MB — markdown rarely exceeds this
  expectedMtime: z.string().optional(),
});

export const BRAND_REGENERATE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
});
