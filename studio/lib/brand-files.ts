// lib/brand-files.ts -- brand/ filesystem helpers shared by /api/brand/*
//
// Single source of truth for:
//   - the canonical 10 brand files + their freshness windows + owning skills
//     (mirrors brand/SCHEMA.md from the mktg CLI repo)
//   - safe path resolution under the project's brand/ directory
//   - template detection (so the UI can render a "template" chip instead of
//     pretending an empty seed file is real research)

import { createHash } from "node:crypto";
import { existsSync, statSync, readFileSync, writeFileSync, renameSync, readdirSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI_BRAND_TEMPLATE_SHA256 } from "./brand-template-hashes.ts";
import { resolveProjectRoot } from "./project-root.ts";

// ─── Canonical brand files ──────────────────────────────────────────────────
//
// Order matches the SCHEMA.md table in the mktg CLI; the studio sorts by this
// order when listing so the UI is deterministic. `freshnessDays = null` means
// "append-only, never stale" (assets.md, learnings.md).

export interface BrandFileSpec {
  name: string;
  /** Owning skill -- `null` for manually-maintained files. */
  skill: string | null;
  /** Days after `mtime` at which the file is considered stale. `null` = never. */
  freshnessDays: number | null;
  /** Short purpose, surfaced in tooltips. */
  purpose: string;
}

export const BRAND_FILE_SPECS: readonly BrandFileSpec[] = [
  { name: "voice-profile.md", skill: "brand-voice",         freshnessDays: 30,  purpose: "How the brand sounds" },
  { name: "positioning.md",   skill: "positioning-angles",  freshnessDays: 30,  purpose: "Why the brand is different" },
  { name: "audience.md",      skill: "audience-research",   freshnessDays: 30,  purpose: "Who the brand talks to" },
  { name: "competitors.md",   skill: "competitive-intel",   freshnessDays: 30,  purpose: "Who the brand competes with" },
  { name: "landscape.md",     skill: "landscape-scan",      freshnessDays: 90,  purpose: "Market snapshot" },
  { name: "keyword-plan.md",  skill: "keyword-research",    freshnessDays: 90,  purpose: "What people search for" },
  { name: "creative-kit.md",  skill: "visual-style",        freshnessDays: 180, purpose: "Visual identity" },
  { name: "stack.md",         skill: null,                  freshnessDays: 180, purpose: "Marketing tools in use" },
  { name: "assets.md",        skill: null,                  freshnessDays: null, purpose: "Created assets log (append-only)" },
  { name: "learnings.md",     skill: null,                  freshnessDays: null, purpose: "What worked/didn't (append-only)" },
] as const;

export const BRAND_FILE_NAMES: readonly string[] = BRAND_FILE_SPECS.map((s) => s.name);

const BY_NAME = new Map<string, BrandFileSpec>(
  BRAND_FILE_SPECS.map((s) => [s.name, s]),
);

export function getSpec(name: string): BrandFileSpec | null {
  return BY_NAME.get(name) ?? null;
}

// ─── Template detection ─────────────────────────────────────────────────────
//
// Exact SHA-256 match against the CLI's `BRAND_TEMPLATES` digests
// (`CLI_BRAND_TEMPLATE_SHA256`). Same contract as `isTemplateContent()` in
// `src/core/brand.ts`: no char-count heuristics, no HTML-comment scans.

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function hasBrandTemplateFile(dir: string): boolean {
  return existsSync(join(dir, "voice-profile.md"));
}

function parentDirs(start: string): string[] {
  const dirs: string[] = [];
  let current = resolve(start);
  while (true) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

function samePath(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return resolve(a) === resolve(b);
  }
}

/**
 * Resolve a marketing-cli package root that may hold seed brand scaffolds.
 * Used by foundation / regenerate paths; not by `looksLikeTemplate`
 * (which uses `CLI_BRAND_TEMPLATE_SHA256` instead).
 *
 * Never returns the *project's* own `brand/` directory (self-compare would
 * mark every customized file as a template when the checkout IS marketing-cli).
 */
export function resolveBrandTemplateRoot(projectRoot: string = process.cwd()): string | null {
  const projectBrand = resolve(resolveProjectRoot(projectRoot), "brand");

  const accept = (candidate: string): boolean => {
    if (!hasBrandTemplateFile(candidate)) return false;
    if (samePath(candidate, projectBrand)) return false;
    return true;
  };

  const envTemplateDir = process.env.MKTG_BRAND_TEMPLATE_DIR ?? process.env.MARKETING_CLI_BRAND_DIR;
  if (envTemplateDir && accept(envTemplateDir)) {
    return envTemplateDir;
  }

  const envCliRoot = process.env.MKTG_CLI_ROOT ?? process.env.MARKETING_CLI_ROOT;
  if (envCliRoot) {
    const candidate = join(envCliRoot, "brand");
    if (accept(candidate)) return candidate;
  }

  const seen = new Set<string>();
  for (const base of [projectRoot, MODULE_ROOT]) {
    for (const dir of parentDirs(base)) {
      const candidate = join(dir, "marketing-cli", "brand");
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      if (accept(candidate)) return candidate;
    }
  }

  return null;
}

/** True iff content is byte-identical to the CLI seed template for `file`. */
export function looksLikeTemplate(file: string, content: string): boolean {
  const expected = CLI_BRAND_TEMPLATE_SHA256[file];
  if (!expected) return false;
  return createHash("sha256").update(content).digest("hex") === expected;
}

// ─── Freshness derivation ───────────────────────────────────────────────────

export type Freshness = "fresh" | "stale" | "template";

export function computeFreshness(
  file: string,
  content: string,
  mtimeMs: number,
  now: number = Date.now(),
): { freshness: Freshness; ageDays: number | null } {
  const spec = getSpec(file);
  const ageMs = now - mtimeMs;
  const ageDays = ageMs / 86_400_000;

  // Append-only logs (assets.md, learnings.md) should read as live records,
  // not as "templates", even when they are short.
  if (spec?.freshnessDays === null) {
    return { freshness: "fresh", ageDays };
  }

  if (looksLikeTemplate(file, content)) {
    return { freshness: "template", ageDays };
  }
  if (spec?.freshnessDays != null && ageDays > spec.freshnessDays) {
    return { freshness: "stale", ageDays };
  }
  return { freshness: "fresh", ageDays };
}

// ─── Path safety ────────────────────────────────────────────────────────────
//
// Every `file` parameter comes from the wire, so we resolve and verify it
// stays under `./brand/`. Validators in lib/validators.ts already catch
// control chars / double-encoding / `..` segments -- this layer applies on
// top by combining them and checking the resolved path stays in-tree.

/**
 * Resolves the brand/ directory.
 *
 * Precedence:
 *   1. `MKTG_BRAND_DIR` env var (absolute path) -- used by the E1 test
 *      harness to point the server at a tmp dir so suites don't write
 *      into the developer's real brand/. See A30 / tests/e2e/real-pipeline.
 *   2. `projectRoot + '/brand'` -- the production default.
 *
 * Every `/api/brand/*` route resolves through here, so one knob
 * redirects reads + writes + lists + reset atomically.
 */
export function brandRoot(projectRoot: string = process.cwd()): string {
  const envDir = process.env.MKTG_BRAND_DIR;
  if (envDir && envDir.length > 0) return envDir;
  return join(resolveProjectRoot(projectRoot), "brand");
}

export interface ResolvedBrandPath {
  ok: true;
  abs: string;
  /** The bare filename, e.g. "voice-profile.md". */
  rel: string;
}
export interface ResolvedBrandPathError {
  ok: false;
  message: string;
}

/**
 * Validate a wire-supplied filename, accepting either the bare name
 * ("voice-profile.md") or the project-relative path ("brand/voice-profile.md").
 * Always resolves to a path under `./brand/`. Rejects anything else.
 *
 * Note: this does NOT require the file to exist (writes need to create it).
 */
export function resolveBrandPath(
  input: string,
  projectRoot: string = process.cwd(),
): ResolvedBrandPath | ResolvedBrandPathError {
  if (!input || typeof input !== "string") {
    return { ok: false, message: "file is required" };
  }
  if (input.includes("\x00") || input.includes("..")) {
    return { ok: false, message: "file contains illegal segments" };
  }
  // Strip `brand/` prefix if present so we always compare against the bare name.
  const rel = input.startsWith("brand/") ? input.slice("brand/".length) : input;
  if (rel.includes("/") || rel.includes("\\")) {
    return { ok: false, message: "file may not contain path separators (sub-directories not yet supported)" };
  }
  if (!rel.endsWith(".md")) {
    return { ok: false, message: "file must end in .md" };
  }
  const abs = join(brandRoot(projectRoot), rel);
  return { ok: true, abs, rel };
}

// ─── Listing ────────────────────────────────────────────────────────────────

export interface BrandFileListing {
  name: string;
  path: string;
  bytes: number;
  mtime: string;
  exists: boolean;
  freshnessWindow: number | null;
  freshness: Freshness | "missing";
  ageDays: number | null;
  skill: string | null;
  purpose: string;
}

/**
 * List every canonical brand file plus any extras present on disk. Sorted
 * with the canonical 10 first (in spec order), extras after (alphabetical).
 */
export function listBrandFiles(projectRoot: string = process.cwd()): BrandFileListing[] {
  const root = brandRoot(projectRoot);
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
  }

  const onDisk = new Set<string>(
    readdirSync(root).filter((f) => f.endsWith(".md")),
  );

  const result: BrandFileListing[] = [];

  for (const spec of BRAND_FILE_SPECS) {
    result.push(buildListing(spec.name, projectRoot));
    onDisk.delete(spec.name);
  }

  // Extras (e.g. brand/SCHEMA.md, user-added files) -- alphabetical.
  for (const name of Array.from(onDisk).sort()) {
    result.push(buildListing(name, projectRoot));
  }

  return result;
}

function buildListing(name: string, projectRoot: string): BrandFileListing {
  const abs = join(brandRoot(projectRoot), name);
  const spec = getSpec(name);

  if (!existsSync(abs)) {
    return {
      name,
      path: `brand/${name}`,
      bytes: 0,
      mtime: "",
      exists: false,
      freshnessWindow: spec?.freshnessDays ?? null,
      freshness: "missing",
      ageDays: null,
      skill: spec?.skill ?? null,
      purpose: spec?.purpose ?? "",
    };
  }

  const stat = statSync(abs);
  const content = readFileSync(abs, "utf-8");
  const f = computeFreshness(name, content, stat.mtimeMs);

  return {
    name,
    path: `brand/${name}`,
    bytes: stat.size,
    mtime: stat.mtime.toISOString(),
    exists: true,
    freshnessWindow: spec?.freshnessDays ?? null,
    freshness: f.freshness,
    ageDays: f.ageDays,
    skill: spec?.skill ?? null,
    purpose: spec?.purpose ?? "",
  };
}

// ─── Read / Write ───────────────────────────────────────────────────────────

export interface BrandReadResult {
  content: string;
  mtime: string;
  bytes: number;
  freshness: Freshness;
  ageDays: number | null;
}

export function readBrandFile(abs: string): BrandReadResult {
  const stat = statSync(abs);
  const content = readFileSync(abs, "utf-8");
  const name = basename(abs);
  const f = computeFreshness(name, content, stat.mtimeMs);
  return {
    content,
    mtime: stat.mtime.toISOString(),
    bytes: stat.size,
    freshness: f.freshness,
    ageDays: f.ageDays,
  };
}

export type WriteResult =
  | { ok: true; mtime: string; bytes: number; deltaChars: number }
  | { ok: false; code: "CONFLICT"; serverMtime: string; clientMtime: string };

/**
 * Atomic write: stages to a sibling .tmp then rename(), so a partial write
 * never replaces the original. If `expectedMtime` is provided and disagrees
 * with the on-disk mtime, returns a CONFLICT -- UI loops the user through
 * "reload and merge".
 */
export function writeBrandFile(
  abs: string,
  content: string,
  expectedMtime?: string,
): WriteResult {
  const before = existsSync(abs) ? statSync(abs) : null;

  if (expectedMtime && before) {
    const serverMtime = before.mtime.toISOString();
    if (serverMtime !== expectedMtime) {
      return { ok: false, code: "CONFLICT", serverMtime, clientMtime: expectedMtime };
    }
  }

  // Ensure brand/ exists for first-time writes.
  mkdirSync(brandRoot(process.cwd()), { recursive: true });

  const tmp = `${abs}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  renameSync(tmp, abs);

  const after = statSync(abs);
  const deltaChars = content.length - (before?.size ?? 0);
  return {
    ok: true,
    mtime: after.mtime.toISOString(),
    bytes: after.size,
    deltaChars,
  };
}
