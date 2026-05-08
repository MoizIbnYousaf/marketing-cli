#!/usr/bin/env bun
/**
 * Pulse funnel seeder. Writes 14 days of distributed rows into the four
 * tables the Pulse snapshot reads from for its funnel ribbon:
 *
 *   signals     -> "signals" funnel node
 *   briefs      -> "briefs" funnel node
 *   skill_runs  -> "drafts" funnel node (filtered by content-producing skills)
 *   publish_log -> "publishes" funnel node
 *
 * The shape: 14 days of daily counts, with the last 7 days higher than the
 * prior 7 so the snapshot's deltaPct renders a positive trend on a fresh seed.
 * Each row is tagged with the demo sentinel ("pulse-seed:") so reseeding
 * with --reset wipes only what this script wrote.
 *
 * Usage: bun run scripts/seed-pulse-series.ts [--reset] [--db <path>]
 *
 * Note: this script is independent of seed-demo.ts. After neonpulse completes
 * the seed-demo text/URLs pass, fold these inserts into seed-demo so a single
 * seed call populates both demo fixtures and the funnel time series.
 */

import { Database } from "bun:sqlite"
import path from "node:path"
import { existsSync } from "node:fs"
import { resolveStudioDbPath } from "../lib/project-root"

const SENTINEL = "pulse-seed:"

// Resolve in the same order the server does so seed + boot can never drift:
//   1. explicit --db <path>
//   2. MKTG_STUDIO_DB env var
//   3. MKTG_PROJECT_ROOT/marketing.db
//   4. cwd/marketing.db
// The first three are handled by resolveStudioDbPath; only --db sits above it.
const argDbIdx = process.argv.indexOf("--db")
const dbPath =
  argDbIdx >= 0 && process.argv[argDbIdx + 1]
    ? path.resolve(process.argv[argDbIdx + 1]!)
    : resolveStudioDbPath()
const reset = process.argv.includes("--reset")

console.error(`[seed-pulse-series] DB target: ${dbPath}`)
if (!existsSync(dbPath)) {
  console.error(`[seed-pulse-series] marketing.db not found at ${dbPath}.`)
  console.error("[seed-pulse-series] Boot the studio server once to create it: bun run server.ts")
  console.error("[seed-pulse-series] Or align with your server: pass --db <path> or set MKTG_STUDIO_DB.")
  process.exit(1)
}

const db = new Database(dbPath)
db.exec("PRAGMA journal_mode=WAL")

// Day-by-day target counts. Prior week is lower than current week so the
// snapshot's deltaPct is a clearly positive number on a fresh seed.
//
// Index 0 = 13 days ago, index 13 = today.
type DailyCounts = {
  signals: number
  briefs: number
  drafts: number
  publishes: number
}
const DAILY: DailyCounts[] = [
  { signals: 4,  briefs: 1, drafts: 2, publishes: 1 }, // -13d
  { signals: 6,  briefs: 1, drafts: 3, publishes: 1 }, // -12d
  { signals: 5,  briefs: 2, drafts: 2, publishes: 0 }, // -11d
  { signals: 7,  briefs: 1, drafts: 3, publishes: 2 }, // -10d
  { signals: 6,  briefs: 2, drafts: 2, publishes: 1 }, // -9d
  { signals: 8,  briefs: 1, drafts: 4, publishes: 1 }, // -8d
  { signals: 7,  briefs: 2, drafts: 3, publishes: 2 }, // -7d (end of prior window)
  { signals: 9,  briefs: 2, drafts: 4, publishes: 2 }, // -6d (start of current window)
  { signals: 11, briefs: 3, drafts: 5, publishes: 2 }, // -5d
  { signals: 10, briefs: 2, drafts: 4, publishes: 3 }, // -4d
  { signals: 12, briefs: 3, drafts: 5, publishes: 2 }, // -3d
  { signals: 14, briefs: 3, drafts: 6, publishes: 3 }, // -2d
  { signals: 11, briefs: 4, drafts: 5, publishes: 3 }, // -1d
  { signals: 13, briefs: 3, drafts: 5, publishes: 4 }, // today
]

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

if (reset) {
  console.error("[seed-pulse-series] Removing prior pulse-seed rows ...")
  const sentinel = `${SENTINEL}%`
  db.prepare("DELETE FROM signals     WHERE content        LIKE ?").run(sentinel)
  db.prepare("DELETE FROM briefs      WHERE content        LIKE ?").run(sentinel)
  db.prepare("DELETE FROM skill_runs  WHERE note           LIKE ?").run(sentinel)
  db.prepare("DELETE FROM publish_log WHERE content_preview LIKE ?").run(sentinel)
}

// ---------------------------------------------------------------------------
// Inserts
// ---------------------------------------------------------------------------

const PLATFORMS = ["twitter", "tiktok", "reddit", "instagram", "news", "google_trends"]
const SKILLS = ["seo-content", "direct-response-copy", "social-campaign", "newsletter", "creative"]

// Bun SQLite has a quirk: bound parameters (positional `?` OR named `$name`)
// inside `datetime('now', ?)` in an INSERT's VALUES clause do NOT actually
// bind when the surrounding values are SQL literals -- the column ends up
// NULL silently. The seed-demo.ts script in the existing tree has the same
// shape, but its UI never aggregated by day so the bug was latent.
//
// Workaround: compute the timestamp in JS as an ISO string (`YYYY-MM-DD
// HH:MM:SS` UTC, the same format SQLite's datetime() returns), then bind
// as a plain TEXT positional. This is what the funnel SQL filters on.
const sigStmt = db.prepare(
  "INSERT INTO signals (platform, content, url, severity, spike_detected, feedback, metadata, created_at) VALUES (?, ?, NULL, ?, 0, 'pending', NULL, ?)",
)
const briefStmt = db.prepare(
  "INSERT INTO briefs (title, content, skill, brand_files_read, created_at) VALUES (?, ?, ?, ?, ?)",
)
const skillStmt = db.prepare(
  "INSERT INTO skill_runs (skill, status, duration_ms, brand_files_changed, result, note, created_at) VALUES (?, 'success', ?, ?, NULL, ?, ?)",
)
const pubStmt = db.prepare(
  "INSERT INTO publish_log (adapter, providers, content_preview, result, items_published, items_failed, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
)

const NOW_MS = Date.now()
function isoOffset(daysAgo: number, minutes: number): string {
  const t = NOW_MS - daysAgo * 24 * 60 * 60 * 1000 + minutes * 60 * 1000
  return new Date(t).toISOString().slice(0, 19).replace("T", " ")
}

let totals = { signals: 0, briefs: 0, drafts: 0, publishes: 0 }

DAILY.forEach((day, idx) => {
  const daysAgo = 13 - idx
  // Spread rows across the day in deterministic minute offsets so per-day
  // ordering looks natural in the activity view.
  const minuteStep = Math.max(1, Math.floor(1440 / Math.max(day.signals, day.briefs, day.drafts, day.publishes, 1)))

  for (let i = 0; i < day.signals; i++) {
    const minute = i * minuteStep
    const platform = PLATFORMS[i % PLATFORMS.length]!
    sigStmt.run(
      platform,
      `${SENTINEL} signal #${idx}.${i} for funnel seed`,
      30 + (i % 50),
      isoOffset(daysAgo, minute),
    )
    totals.signals++
  }
  for (let i = 0; i < day.briefs; i++) {
    const minute = (i + 3) * minuteStep
    briefStmt.run(
      `Pulse brief seed ${idx}.${i}`,
      `${SENTINEL} brief #${idx}.${i} for funnel seed`,
      "intelligence-report",
      JSON.stringify(["brand/audience.md", "brand/competitors.md"]),
      isoOffset(daysAgo, minute),
    )
    totals.briefs++
  }
  for (let i = 0; i < day.drafts; i++) {
    const minute = (i + 6) * minuteStep
    const skill = SKILLS[i % SKILLS.length]!
    skillStmt.run(
      skill,
      400 + (i * 137) % 4000,
      JSON.stringify([]),
      `${SENTINEL} draft skill_run for funnel seed`,
      isoOffset(daysAgo, minute),
    )
    totals.drafts++
  }
  for (let i = 0; i < day.publishes; i++) {
    const minute = (i + 9) * minuteStep
    const adapter = i % 2 === 0 ? "mktg-native" : "postiz"
    pubStmt.run(
      adapter,
      JSON.stringify(adapter === "postiz" ? ["linkedin", "bluesky"] : ["x"]),
      `${SENTINEL} pulse seed publish #${idx}.${i}`,
      JSON.stringify({ ok: true }),
      1,
      isoOffset(daysAgo, minute),
    )
    totals.publishes++
  }
})

db.close()

console.log("[seed-pulse-series] Inserted across 14 days:")
for (const [k, v] of Object.entries(totals)) {
  console.log(`  - ${k}: ${v}`)
}
console.log("[seed-pulse-series] Done. Run 'mktg studio' and visit /dashboard to verify the funnel ribbon.")
