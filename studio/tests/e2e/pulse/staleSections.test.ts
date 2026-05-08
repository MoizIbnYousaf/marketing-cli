// tests/e2e/pulse/staleSections.test.ts
//
// Lane 5 E2E -- per-section staleSections fallback. Drops a real DB table
// (or row set) that one snapshot section depends on, then asserts that
// section's key surfaces in `staleSections` while sibling sections still
// render fresh data.
//
// This is the contract that proves Pulse never goes blank when one upstream
// fails -- the rebuilt aggregator wraps each table read in its own try/catch
// inside buildFunnel, marks the funnel section stale via a hook callback if
// any one of its 4 source tables fails, and the remaining 3 nodes still
// populate from the surviving tables.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { PORTS, startPulseHarness, type PulseHarness } from "./harness"
import type { PulseSnapshotResponse } from "../../../lib/types/pulse"

let harness: PulseHarness | null = null

beforeAll(async () => {
  harness = await startPulseHarness({ port: PORTS.staleSections, skipFunnelSeed: true })
})

afterAll(async () => {
  await harness?.teardown()
})

function h(): PulseHarness {
  if (!harness) throw new Error("harness not booted")
  return harness
}

function isoOffset(daysAgo: number, hours = 6): string {
  const t = Date.now() - daysAgo * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000
  return new Date(t).toISOString().slice(0, 19).replace("T", " ")
}

function clearAllSeed(): void {
  h().withDb((db) => {
    for (const tbl of ["signals", "briefs", "skill_runs", "publish_log", "activity"]) {
      try {
        db.run(`DELETE FROM ${tbl}`)
      } catch {
        // table may have been dropped in a prior test; ignore.
      }
    }
  })
}

function seedSignal(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO signals (platform, content, severity, spike_detected, feedback, created_at) VALUES ('twitter', 'stale-e2e signal', 50, 0, 'pending', ?)",
    ).run(isoOffset(daysAgo))
  })
}
function seedBrief(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO briefs (title, content, skill, created_at) VALUES ('stale-e2e brief', 'seed', 'intelligence-report', ?)",
    ).run(isoOffset(daysAgo))
  })
}
function seedDraft(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO skill_runs (skill, status, duration_ms, created_at) VALUES ('seo-content', 'success', 800, ?)",
    ).run(isoOffset(daysAgo))
  })
}

async function getSnapshot(): Promise<PulseSnapshotResponse> {
  const res = await h().fetchAuthed("/api/pulse/snapshot")
  expect(res.status).toBe(200)
  return (await res.json()) as PulseSnapshotResponse
}

// Each test re-creates the schema by re-running migration 001 because the
// staleSections paths drop tables. CREATE TABLE IF NOT EXISTS makes this safe.
async function recreateMissingTables(): Promise<void> {
  const migration = await Bun.file(
    new URL("../../../db/migrations/001_initial.sql", import.meta.url).pathname,
  ).text()
  h().withDb((db) => {
    db.exec(migration)
  })
  // 002 adds activity table.
  const m2 = await Bun.file(
    new URL("../../../db/migrations/002_activity.sql", import.meta.url).pathname,
  ).text()
  h().withDb((db) => {
    db.exec(m2)
  })
}

beforeEach(async () => {
  await recreateMissingTables()
  clearAllSeed()
})

// ---------------------------------------------------------------------------

describe("Lane 5 E2E -- per-section staleSections fallback", () => {
  test("dropped publish_log: 'publish' AND 'funnel' stale, sibling funnel nodes populate", async () => {
    seedSignal(0)
    seedSignal(3)
    seedBrief(2)
    seedDraft(1)
    h().withDb((db) => db.run("DROP TABLE publish_log"))

    const body = await getSnapshot()
    expect(body.ok).toBe(true)
    expect(body.data.staleSections).toContain("publish")
    expect(body.data.staleSections).toContain("funnel")
    expect(body.data.recentPublish).toEqual([])

    // signals/briefs/drafts nodes must still surface their counts via the
    // per-table fallback inside buildFunnel.
    expect(body.data.funnel.nodes[0].key).toBe("signals")
    expect(body.data.funnel.nodes[0].total).toBe(2)
    expect(body.data.funnel.nodes[1].key).toBe("briefs")
    expect(body.data.funnel.nodes[1].total).toBe(1)
    expect(body.data.funnel.nodes[2].key).toBe("drafts")
    expect(body.data.funnel.nodes[2].total).toBe(1)
    expect(body.data.funnel.nodes[3].key).toBe("publishes")
    expect(body.data.funnel.nodes[3].total).toBe(0)
  })

  test("dropped activity table: 'activity' stale, signals funnel survives", async () => {
    seedSignal(0)
    h().withDb((db) => db.run("DROP TABLE activity"))

    const body = await getSnapshot()
    expect(body.ok).toBe(true)
    expect(body.data.staleSections).toContain("activity")
    expect(body.data.activity).toEqual([])
    // signals still populate; activity drop does not affect funnel queries.
    expect(body.data.funnel.nodes[0].total).toBe(1)
    expect(body.data.staleSections).not.toContain("media")
    expect(body.data.staleSections).not.toContain("brandHealth")
  })

  test("dropped briefs only: only 'funnel' stale, briefs node zeros, others survive", async () => {
    seedSignal(0)
    seedDraft(0)
    h().withDb((db) => db.run("DROP TABLE briefs"))

    const body = await getSnapshot()
    expect(body.ok).toBe(true)
    expect(body.data.staleSections).toContain("funnel")
    expect(body.data.staleSections).not.toContain("publish")
    expect(body.data.staleSections).not.toContain("activity")
    expect(body.data.funnel.nodes[0].total).toBe(1) // signals survives
    expect(body.data.funnel.nodes[1].total).toBe(0) // briefs zeros
    expect(body.data.funnel.nodes[2].total).toBe(1) // drafts survives
  })

  test("multiple tables dropped: 'funnel' + 'publish' both stale, signals still populate", async () => {
    seedSignal(0)
    seedSignal(2)
    h().withDb((db) => {
      db.run("DROP TABLE skill_runs")
      db.run("DROP TABLE publish_log")
    })

    const body = await getSnapshot()
    expect(body.ok).toBe(true)
    expect(body.data.staleSections).toContain("funnel")
    expect(body.data.staleSections).toContain("publish")
    expect(body.data.funnel.nodes[0].total).toBe(2) // signals
    expect(body.data.funnel.nodes[2].total).toBe(0) // drafts (skill_runs gone)
    expect(body.data.funnel.nodes[3].total).toBe(0) // publishes (publish_log gone)
  })

  test("no drops: staleSections empty, every section serves fresh data", async () => {
    seedSignal(0)
    const body = await getSnapshot()
    expect(body.data.staleSections).toEqual([])
    expect(body.data.funnel.nodes[0].total).toBe(1)
  })
})
