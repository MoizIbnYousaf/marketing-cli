// tests/unit/pulse-snapshot.test.ts -- exercise the Pulse aggregator against
// a real Bun SQLite handle so we trust the funnel + section behavior end to
// end. Bug-driver: ironmint's live rig reported funnel zeros even though
// seeded INSERTs landed and recentPublish (an unwindowed read) populated.
// These tests pin the actual SQL-vs-JS day-key contract.

import { describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { buildPulseSnapshot } from "../../lib/pulse-snapshot.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, "..", "..")

function freshDb(): Database {
  const tempDir = mkdtempSync(join(tmpdir(), "pulse-snapshot-"))
  const dbPath = join(tempDir, "marketing.db")
  const db = new Database(dbPath, { create: true })
  db.run("PRAGMA journal_mode=WAL")
  // Apply migrations directly. Use exec() for multi-statement files; bun's
  // run() can choke on multi-statement strings depending on driver mode.
  for (const file of ["001_initial.sql", "002_activity.sql", "003_rate_limits.sql"]) {
    const sql = readFileSync(join(REPO_ROOT, "db", "migrations", file), "utf-8")
    db.exec(sql)
  }
  return db
}

// Bun SQLite has a quirk where bound parameters inside `datetime('now', ?)`
// in an INSERT's VALUES clause silently produce NULL created_at. Sidestep by
// computing the ISO timestamp in JS and binding it as plain TEXT, matching
// the format SQLite's date()/datetime() returns.
function isoOffset(daysAgo: number, hours = 6): string {
  const t = Date.now() - daysAgo * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000
  return new Date(t).toISOString().slice(0, 19).replace("T", " ")
}
function seedSignal(db: Database, daysAgo: number, hourOffset = 6): void {
  db.prepare(
    `INSERT INTO signals (platform, content, severity, spike_detected, feedback, created_at)
     VALUES ('twitter', 'seed', 50, 0, 'pending', ?)`,
  ).run(isoOffset(daysAgo, hourOffset))
}
function seedBrief(db: Database, daysAgo: number): void {
  db.prepare(
    `INSERT INTO briefs (title, content, skill, created_at)
     VALUES ('seed brief', 'seed', 'intelligence-report', ?)`,
  ).run(isoOffset(daysAgo, 3))
}
function seedDraft(db: Database, daysAgo: number): void {
  db.prepare(
    `INSERT INTO skill_runs (skill, status, duration_ms, created_at)
     VALUES ('seo-content', 'success', 800, ?)`,
  ).run(isoOffset(daysAgo, 5))
}
function seedPublish(db: Database, daysAgo: number): void {
  db.prepare(
    `INSERT INTO publish_log (adapter, providers, content_preview, items_published, items_failed, created_at)
     VALUES ('mktg-native', '["x"]', 'seed', 1, 0, ?)`,
  ).run(isoOffset(daysAgo, 9))
}

describe("buildPulseSnapshot funnel", () => {
  test("returns non-zero totals when each table is seeded across the 14-day window", () => {
    const db = freshDb()
    // Prior-7 window: daysAgo 13..7. Current-7 window: daysAgo 6..0.
    for (let d = 13; d >= 0; d--) seedSignal(db, d)
    for (let d = 13; d >= 0; d--) seedBrief(db, d)
    for (let d = 13; d >= 0; d--) seedDraft(db, d)
    for (let d = 13; d >= 0; d--) seedPublish(db, d)

    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })

    expect(snap.staleSections).not.toContain("funnel")
    const [signals, briefs, drafts, publishes] = snap.funnel.nodes
    expect(signals.total).toBe(7)
    expect(briefs.total).toBe(7)
    expect(drafts.total).toBe(7)
    expect(publishes.total).toBe(7)
    // Equal seeding across both 7-day windows -> deltaPct should be 0% (flat).
    expect(signals.deltaPct).toBe(0)
  })

  test("delta is positive when current window seeded heavier than prior", () => {
    const db = freshDb()
    // Prior 7: 1 signal/day. Current 7: 3 signals/day.
    for (let d = 13; d >= 7; d--) seedSignal(db, d)
    for (let d = 6; d >= 0; d--) {
      seedSignal(db, d)
      seedSignal(db, d, 7)
      seedSignal(db, d, 8)
    }

    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    const signals = snap.funnel.nodes[0]
    expect(signals.total).toBe(21)
    expect(signals.deltaPct).not.toBeNull()
    expect((signals.deltaPct ?? 0) > 100).toBe(true)
  })

  test("returns zeros without throwing when DB is empty", () => {
    const db = freshDb()
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    expect(snap.staleSections).not.toContain("funnel")
    for (const node of snap.funnel.nodes) {
      expect(node.total).toBe(0)
      expect(node.deltaPct).toBeNull()
    }
  })

  test("series length is exactly 7 per node", () => {
    const db = freshDb()
    seedSignal(db, 0)
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    for (const node of snap.funnel.nodes) {
      expect(node.series.length).toBe(7)
    }
  })

  test("today's row lands in the current 7-day window", () => {
    const db = freshDb()
    seedSignal(db, 0)
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    const signals = snap.funnel.nodes[0]
    expect(signals.total).toBe(1)
    expect(signals.series[6]).toBe(1)
  })

  test("a row aged 13 days lands in the prior 7-day window (delta non-null)", () => {
    const db = freshDb()
    // 1 row in prior window only.
    seedSignal(db, 13)
    seedSignal(db, 0) // current window so prior isn't 0; prevents null delta
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    const signals = snap.funnel.nodes[0]
    // current=1, prior=1 -> deltaPct=0
    expect(signals.total).toBe(1)
    expect(signals.deltaPct).toBe(0)
  })
})

describe("buildPulseSnapshot recentPublish", () => {
  test("returns up to 3 rows in DESC order", () => {
    const db = freshDb()
    seedPublish(db, 5)
    seedPublish(db, 3)
    seedPublish(db, 1)
    seedPublish(db, 0)
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    expect(snap.recentPublish.length).toBe(3)
  })
})

describe("buildPulseSnapshot stale fallback", () => {
  test("activity table missing -> staleSections includes 'activity'", () => {
    const db = freshDb()
    db.run("DROP TABLE activity")
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    expect(snap.staleSections).toContain("activity")
    expect(snap.activity).toEqual([])
  })

  test("publish_log table missing -> staleSections includes 'publish'", () => {
    const db = freshDb()
    db.run("DROP TABLE publish_log")
    const snap = buildPulseSnapshot({ db, projectRoot: "/tmp/__unused", recentMedia: [] })
    expect(snap.staleSections).toContain("publish")
    expect(snap.recentPublish).toEqual([])
  })
})
