/**
 * Client-side helpers for the Brand tab editor.
 *
 * Pairs with the server in `lib/brand-files.ts` and the `/api/brand/*` routes.
 * This file is browser-safe (no `node:fs` imports).
 *
 * Contract (implemented server-side):
 *   GET  /api/brand/files                       → {ok, data: BrandFile[]}
 *   GET  /api/brand/read?file=voice-profile.md  → {ok, data: {content, mtime}}
 *   POST /api/brand/write                       → {file, content, expectedMtime?}
 *                                                 ok:true  → {mtime}
 *                                                 ok:false → error.code="CONFLICT"
 *   POST /api/brand/regenerate                  → {file}
 *                                                 ok:true  → {jobId}
 *                                                 fires SSE `skill-start` / `skill-complete`
 */

import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"

export type BrandFreshness = "fresh" | "stale" | "empty" | "missing" | "template"

export interface BrandFile {
  /** Basename, e.g. `voice-profile.md`. */
  name: string
  /** Relative path from project root. Optional — server may omit. */
  path?: string
  /** File size in bytes, 0 if missing. */
  bytes: number
  /** ISO mtime from the server. Empty string for missing files. */
  mtime: string
  /** Server-computed freshness. If missing, compute locally. */
  freshness?: BrandFreshness
  /** Optional category label (from the schema writer ownership). */
  category?: string
}

export interface BrandFileReadResponse {
  content: string
  mtime: string
}

export interface BrandFileSaveResult {
  mtime: string
}

export interface BrandRegenerateResult {
  jobId: string
}

/**
 * Canonical 10 brand files, in the order they appear in `brand/SCHEMA.md`.
 * Mirrors the server's `lib/brand-files.ts` spec so the UI renders these
 * even when a fresh project has no files on disk yet.
 */
export const BRAND_FILE_SPEC: Record<
  string,
  {
    label: string
    description: string
    /** Days before the file is considered stale. `null` = append-only. */
    freshnessDays: number | null
    /** The skill that regenerates this file. `null` = manual / append-only. */
    writer: string | null
    order: number
  }
> = {
  "voice-profile.md": {
    label: "Voice profile",
    description: "How the brand sounds — personality, vocabulary, sentence patterns.",
    freshnessDays: 30,
    writer: "brand-voice",
    order: 1,
  },
  "positioning.md": {
    label: "Positioning",
    description: "Why the brand is different — angle, proof points, differentiation.",
    freshnessDays: 30,
    writer: "positioning-angles",
    order: 2,
  },
  "audience.md": {
    label: "Audience",
    description: "Personas, pain points, watering holes.",
    freshnessDays: 30,
    writer: "audience-research",
    order: 3,
  },
  "competitors.md": {
    label: "Competitors",
    description: "Direct, indirect, positioning gaps.",
    freshnessDays: 30,
    writer: "competitive-intel",
    order: 4,
  },
  "landscape.md": {
    label: "Landscape",
    description: "Ecosystem snapshot + Claims Blacklist.",
    freshnessDays: 90,
    writer: "landscape-scan",
    order: 5,
  },
  "keyword-plan.md": {
    label: "Keyword plan",
    description: "Primary, secondary, long-tail keywords.",
    freshnessDays: 90,
    writer: "keyword-research",
    order: 6,
  },
  "creative-kit.md": {
    label: "Creative kit",
    description: "Visual identity — colors, typography, style anchors.",
    freshnessDays: 180,
    writer: "visual-style",
    order: 7,
  },
  "stack.md": {
    label: "Stack",
    description: "Marketing tools in use.",
    freshnessDays: 180,
    writer: null,
    order: 8,
  },
  "assets.md": {
    label: "Assets",
    description: "Created asset log (append-only).",
    freshnessDays: null,
    writer: null,
    order: 9,
  },
  "learnings.md": {
    label: "Learnings",
    description: "What worked / didn't (append-only).",
    freshnessDays: null,
    writer: null,
    order: 10,
  },
}

export function computeFreshness(file: BrandFile): BrandFreshness {
  if (file.freshness) return file.freshness
  if (file.bytes === 0 || !file.mtime) return "missing"
  if (file.bytes < 80) return "empty"
  const spec = BRAND_FILE_SPEC[file.name]
  if (!spec || spec.freshnessDays === null) return "fresh"
  const ageMs = Date.now() - new Date(file.mtime).getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return "fresh"
  const days = ageMs / (1000 * 60 * 60 * 24)
  return days > spec.freshnessDays ? "stale" : "fresh"
}

export function getWriterSkill(fileName: string): string | null {
  return BRAND_FILE_SPEC[fileName]?.writer ?? null
}

export function getFileLabel(fileName: string): string {
  return BRAND_FILE_SPEC[fileName]?.label ?? fileName.replace(/\.md$/, "")
}

export function sortBrandFiles(files: BrandFile[]): BrandFile[] {
  return [...files].sort((a, b) => {
    const ao = BRAND_FILE_SPEC[a.name]?.order ?? 999
    const bo = BRAND_FILE_SPEC[b.name]?.order ?? 999
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || (json && json.ok !== true)) {
    const msg = extractErrorMessage(json ?? {}, fallback)
    const fix = extractErrorFix(json ?? {})
    const code =
      json && typeof json.error === "object" && json.error && "code" in json.error
        ? (json.error as { code?: string }).code
        : undefined
    throw Object.assign(new Error(msg), { fix, code })
  }
  return json.data as T
}

export async function listBrandFiles(): Promise<BrandFile[]> {
  const res = await fetch("/api/brand/files")
  return parseJson<BrandFile[]>(res, "Couldn't load brand files")
}

export async function readBrandFile(name: string): Promise<BrandFileReadResponse> {
  const res = await fetch(`/api/brand/read?file=${encodeURIComponent(name)}`)
  return parseJson<BrandFileReadResponse>(res, `Couldn't read ${name}`)
}

export async function writeBrandFile(args: {
  file: string
  content: string
  expectedMtime?: string
}): Promise<BrandFileSaveResult> {
  const res = await fetch("/api/brand/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  return parseJson<BrandFileSaveResult>(res, "Save failed")
}

export async function regenerateBrandFile(file: string): Promise<BrandRegenerateResult> {
  const res = await fetch("/api/brand/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file }),
  })
  return parseJson<BrandRegenerateResult>(res, "Regenerate failed")
}

/** Age helper used by the file-list freshness badge. */
export function relativeAge(iso: string | undefined): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return "just now"
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}
