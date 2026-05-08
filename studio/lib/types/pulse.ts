// lib/types/pulse.ts -- canonical contract for GET /api/pulse/snapshot.
//
// One envelope, one round-trip. Coalesces 7 SWR calls into a single read with
// per-section error capture so Pulse never goes blank when a single upstream
// fails. The aggregator is in studio/server.ts (route slot owned by ironmint);
// the seeder is studio/scripts/seed-pulse-series.ts.
//
// Cap discipline: this contract is the funnel ribbon + brand-health composite
// + recent activity + recent media + recent publishes + ranked actions. Any
// new Pulse section gets its own endpoint, NOT a new field on snapshot.

import type { Activity } from "./activity"
import type { BrandFile } from "../brand-editor"

// ─── Funnel ribbon (the dominant element above the fold) ─────────────────────

/**
 * Daily counts for the last 7 days. Index 0 = oldest, index 6 = today.
 * 7 numbers, never null. Empty days are 0, not undefined.
 */
export type PulseSeries = readonly [number, number, number, number, number, number, number]

export interface PulseFunnelNode {
  /** Stable id for renderers. */
  key: "signals" | "briefs" | "drafts" | "publishes"
  /** Display label. */
  label: string
  /** Last-7-day daily counts. */
  series: PulseSeries
  /** Sum of `series`. */
  total: number
  /** % change vs the prior 7-day window. `null` when prior window is empty. */
  deltaPct: number | null
}

export interface PulseFunnel {
  /** Always 4 nodes in fixed order: signals → briefs → drafts → publishes. */
  nodes: readonly [PulseFunnelNode, PulseFunnelNode, PulseFunnelNode, PulseFunnelNode]
  /** ISO datetime of the latest data point used in any series. */
  windowEnd: string
}

// ─── Brand-health composite ──────────────────────────────────────────────────

export interface PulseBrandHealth {
  /** 0-100 composite. Lower bound when `files.length === 0`. */
  score: number
  /** All 10 brand files (or fewer if missing). UI computes freshness chips. */
  files: BrandFile[]
  /** Convenience: count of `freshness === "fresh"`. */
  readyCount: number
  /** Convenience: total file slots from the schema (always 10 today). */
  totalSlots: number
}

// ─── Action stack (what to do next) ──────────────────────────────────────────

export type PulseActionTone = "green" | "blue" | "violet" | "amber"

export interface PulseAction {
  id: string
  title: string
  detail: string
  /** App-relative href. The dashboard validates these. */
  href: string
  /** Lucide icon name; UI maps to component. Avoids component refs in JSON. */
  icon: "BookOpen" | "ImageIcon" | "Sparkles" | "Send" | "CheckCircle2" | "Target"
  tone: PulseActionTone
}

// ─── Recent media + publish strip ────────────────────────────────────────────

export interface PulseMediaItem {
  id: string
  title: string
  /** "image" or "video"; "audio"/"file" are filtered out by the snapshot. */
  kind: "image" | "video"
  /** URL the dashboard can load directly. */
  src: string
  /** Modified-time in ms since epoch. */
  mtimeMs: number
}

export interface PulsePublishItem {
  id: number
  adapter: string
  /** Top 2 providers, joined by the renderer; comes pre-trimmed. */
  providers: string[]
  contentPreview: string
  itemsPublished: number
  itemsFailed: number
  createdAt: string
}

// ─── Snapshot envelope ───────────────────────────────────────────────────────

/**
 * Sections the aggregator may mark stale. When an upstream fetch fails or
 * times out, the snapshot returns the last-known value for that section and
 * adds the section key here. UI renders a stale-banner per affected section.
 */
export type PulseStaleSection =
  | "funnel"
  | "brandHealth"
  | "actions"
  | "activity"
  | "media"
  | "publish"

export interface PulseSnapshot {
  funnel: PulseFunnel
  brandHealth: PulseBrandHealth
  actions: PulseAction[]
  /** Last 6 activity rows (mix of seeded + live). */
  activity: Activity[]
  /** Last 4 image/video assets sorted by mtime desc. */
  recentMedia: PulseMediaItem[]
  /** Last 3 publish_log rows. */
  recentPublish: PulsePublishItem[]
  /** ISO datetime when the aggregator finished assembling this snapshot. */
  generatedAt: string
  /** Sections served from cache because their upstream failed. */
  staleSections: PulseStaleSection[]
}

// ─── Wire envelope ───────────────────────────────────────────────────────────

/** Matches the `{ ok: true, data: T }` convention used across the studio API. */
export interface PulseSnapshotResponse {
  ok: true
  data: PulseSnapshot
}

