// tests/e2e/pulse/snapshot.test.ts
//
// Lane 5 E2E -- /api/pulse/snapshot full-shape coverage with auth ENABLED.
// Boots a real Bun server through harness.ts, runs the real seeder against
// the harness DB, and walks every field of every section on every snapshot.
//
// Companion suites in this dir:
//   - staleSections.test.ts  per-section fallback when DB tables drop
//   - playwright.test.ts     UI render, sparkline paint, SSE-driven UI update
//
// Hard rules: no mocks, no fake fetches, no shimmed validators. The auth gate
// fires for every request; tests carry the bearer header from the on-disk
// token the server wrote at boot.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PORTS, startPulseHarness, type PulseHarness } from "./harness"
import type {
  PulseAction,
  PulseFunnelNode,
  PulseSnapshot,
  PulseSnapshotResponse,
  PulseStaleSection,
} from "../../../lib/types/pulse"
import type { Activity } from "../../../lib/types/activity"

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures")

let harness: PulseHarness | null = null

beforeAll(async () => {
  harness = await startPulseHarness({ port: PORTS.snapshot })
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
  // Wipe every table the funnel reads so each test composes from a known floor.
  // Runs through harness.withDb so we exercise the same connection path.
  h().withDb((db) => {
    db.run("DELETE FROM signals")
    db.run("DELETE FROM briefs")
    db.run("DELETE FROM skill_runs")
    db.run("DELETE FROM publish_log")
    db.run("DELETE FROM activity")
  })
}

function seedSignal(daysAgo: number, hour = 6): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO signals (platform, content, severity, spike_detected, feedback, created_at) VALUES ('twitter', 'snap-e2e signal', 50, 0, 'pending', ?)",
    ).run(isoOffset(daysAgo, hour))
  })
}
function seedBrief(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO briefs (title, content, skill, created_at) VALUES ('snap-e2e brief', 'seed', 'intelligence-report', ?)",
    ).run(isoOffset(daysAgo, 3))
  })
}
function seedDraft(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO skill_runs (skill, status, duration_ms, created_at) VALUES ('seo-content', 'success', 800, ?)",
    ).run(isoOffset(daysAgo, 5))
  })
}
function seedPublish(daysAgo: number): void {
  h().withDb((db) => {
    db.prepare(
      "INSERT INTO publish_log (adapter, providers, content_preview, items_published, items_failed, created_at) VALUES ('mktg-native', '[\"x\"]', 'snap-e2e publish', 1, 0, ?)",
    ).run(isoOffset(daysAgo, 9))
  })
}

async function getSnapshot(qs = ""): Promise<{ status: number; body: PulseSnapshotResponse }> {
  const res = await h().fetchAuthed(`/api/pulse/snapshot${qs}`)
  return { status: res.status, body: (await res.json()) as PulseSnapshotResponse }
}

function dump(name: string, snap: PulseSnapshot): void {
  mkdirSync(FIXTURES_DIR, { recursive: true })
  writeFileSync(join(FIXTURES_DIR, `${name}.json`), JSON.stringify(snap, null, 2) + "\n")
}

// ---------------------------------------------------------------------------
// Full-shape walker. Asserts the contract exhaustively.
// ---------------------------------------------------------------------------

function assertFullShape(snap: PulseSnapshot): void {
  // Top-level set
  expect(Object.keys(snap).sort()).toEqual(
    [
      "actions", "activity", "brandHealth", "funnel",
      "generatedAt", "recentMedia", "recentPublish", "staleSections",
    ].sort(),
  )
  expect(typeof snap.generatedAt).toBe("string")
  expect(Number.isFinite(new Date(snap.generatedAt).getTime())).toBe(true)

  // staleSections: array of allowed keys
  const allowedStale: PulseStaleSection[] = ["funnel", "brandHealth", "actions", "activity", "media", "publish"]
  expect(Array.isArray(snap.staleSections)).toBe(true)
  for (const k of snap.staleSections) expect(allowedStale).toContain(k)

  // funnel
  const f = snap.funnel
  expect(typeof f.windowEnd).toBe("string")
  expect(Number.isFinite(new Date(f.windowEnd).getTime())).toBe(true)
  expect(f.nodes.length).toBe(4)
  expect(f.nodes.map((n: PulseFunnelNode) => n.key)).toEqual(["signals", "briefs", "drafts", "publishes"])
  for (const n of f.nodes) {
    expect(typeof n.key).toBe("string")
    expect(typeof n.label).toBe("string")
    expect(n.label.length).toBeGreaterThan(0)
    expect(n.series.length).toBe(7)
    for (const v of n.series) {
      expect(typeof v).toBe("number")
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
    expect(typeof n.total).toBe("number")
    expect(n.total).toBeGreaterThanOrEqual(0)
    expect(n.deltaPct === null || (typeof n.deltaPct === "number" && Number.isFinite(n.deltaPct))).toBe(true)
  }

  // brandHealth
  const bh = snap.brandHealth
  expect(typeof bh.score).toBe("number")
  expect(bh.score).toBeGreaterThanOrEqual(0)
  expect(bh.score).toBeLessThanOrEqual(100)
  expect(typeof bh.totalSlots).toBe("number")
  expect(bh.totalSlots).toBeGreaterThan(0)
  expect(typeof bh.readyCount).toBe("number")
  expect(bh.readyCount).toBeGreaterThanOrEqual(0)
  expect(bh.readyCount).toBeLessThanOrEqual(bh.totalSlots)
  expect(Array.isArray(bh.files)).toBe(true)
  for (const file of bh.files) {
    expect(typeof file.name).toBe("string")
    expect(file.name.length).toBeGreaterThan(0)
    expect(typeof file.bytes).toBe("number")
    expect(file.bytes).toBeGreaterThanOrEqual(0)
    expect(typeof file.mtime).toBe("string")
  }

  // actions
  const allowedIcons: PulseAction["icon"][] = ["BookOpen", "ImageIcon", "Sparkles", "Send", "CheckCircle2", "Target"]
  const allowedTones: PulseAction["tone"][] = ["green", "blue", "violet", "amber"]
  expect(Array.isArray(snap.actions)).toBe(true)
  for (const a of snap.actions) {
    expect(typeof a.id).toBe("string")
    expect(typeof a.title).toBe("string")
    expect(typeof a.detail).toBe("string")
    expect(typeof a.href).toBe("string")
    expect(a.href.startsWith("/")).toBe(true)
    expect(allowedIcons).toContain(a.icon)
    expect(allowedTones).toContain(a.tone)
  }

  // activity
  const allowedKinds: Activity["kind"][] = ["skill-run", "brand-write", "publish", "toast", "navigate", "custom"]
  expect(Array.isArray(snap.activity)).toBe(true)
  for (const r of snap.activity) {
    expect(typeof r.id).toBe("number")
    expect(typeof r.summary).toBe("string")
    expect(typeof r.createdAt).toBe("string")
    expect(allowedKinds).toContain(r.kind)
  }

  // recentMedia
  expect(Array.isArray(snap.recentMedia)).toBe(true)
  for (const m of snap.recentMedia) {
    expect(typeof m.id).toBe("string")
    expect(typeof m.title).toBe("string")
    expect(["image", "video"]).toContain(m.kind)
    expect(typeof m.src).toBe("string")
    expect(typeof m.mtimeMs).toBe("number")
  }

  // recentPublish
  expect(Array.isArray(snap.recentPublish)).toBe(true)
  for (const p of snap.recentPublish) {
    expect(typeof p.id).toBe("number")
    expect(typeof p.adapter).toBe("string")
    expect(Array.isArray(p.providers)).toBe(true)
    expect(typeof p.contentPreview).toBe("string")
    expect(typeof p.itemsPublished).toBe("number")
    expect(typeof p.itemsFailed).toBe("number")
    expect(typeof p.createdAt).toBe("string")
  }
}

// ---------------------------------------------------------------------------

describe("Lane 5 E2E -- /api/pulse/snapshot (auth on)", () => {
  test("auth perimeter: unauthed GET is rejected", async () => {
    const res = await fetch(`${h().baseUrl}/api/pulse/snapshot`)
    expect(res.status).toBe(401)
  })

  test("auth perimeter: bearer header authorizes", async () => {
    const res = await h().fetchAuthed("/api/pulse/snapshot")
    expect(res.status).toBe(200)
  })

  test("auth perimeter: ?token= query param authorizes (SSE / browser EventSource path)", async () => {
    const res = await fetch(h().withToken("/api/pulse/snapshot"))
    expect(res.status).toBe(200)
  })

  test("[state 1] empty DB returns canonical envelope", async () => {
    clearAllSeed()
    const { body } = await getSnapshot()
    expect(body.ok).toBe(true)
    assertFullShape(body.data)
    expect(body.data.staleSections).toEqual([])
    for (const node of body.data.funnel.nodes) {
      expect(node.total).toBe(0)
      expect(node.deltaPct).toBeNull()
      expect(node.series.every((v) => v === 0)).toBe(true)
    }
    dump("state-1-empty", body.data)
  })

  test("[state 2] single-day seed -- today lands at series[6]", async () => {
    clearAllSeed()
    seedSignal(0); seedBrief(0); seedDraft(0); seedPublish(0)
    const { body } = await getSnapshot()
    assertFullShape(body.data)
    for (const node of body.data.funnel.nodes) {
      expect(node.total).toBe(1)
      expect(node.series[6]).toBe(1)
      expect(node.deltaPct).toBeNull()
    }
    expect(body.data.recentPublish.length).toBe(1)
    expect(body.data.recentPublish[0]?.contentPreview).toContain("snap-e2e publish")
    dump("state-2-single-day", body.data)
  })

  test("[state 3] 14-day flat seed -- both windows equal, deltaPct === 0", async () => {
    clearAllSeed()
    for (let d = 13; d >= 0; d--) {
      seedSignal(d); seedBrief(d); seedDraft(d); seedPublish(d)
    }
    const { body } = await getSnapshot()
    assertFullShape(body.data)
    for (const node of body.data.funnel.nodes) {
      expect(node.total).toBe(7)
      expect(node.deltaPct).toBe(0)
    }
    dump("state-3-14day-flat", body.data)
  })

  test("[state 4] heavy-current vs light-prior -- deltaPct positive", async () => {
    clearAllSeed()
    for (let d = 13; d >= 7; d--) seedSignal(d)
    for (let d = 6; d >= 0; d--) {
      seedSignal(d, 6); seedSignal(d, 7); seedSignal(d, 8)
    }
    const { body } = await getSnapshot()
    assertFullShape(body.data)
    const signals = body.data.funnel.nodes[0]
    expect(signals.total).toBe(21)
    expect((signals.deltaPct ?? 0) > 100).toBe(true)
    dump("state-4-heavy-current", body.data)
  })

  test("[state 5] real seeder script populates the funnel", async () => {
    // Re-run the harness's seeder. It wipes prior pulse-seed rows then
    // distributes 14 days; current heavier than prior so deltas positive.
    const r = h().seed({ reset: true })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain("signals")
    expect(r.stdout).toContain("briefs")
    expect(r.stdout).toContain("drafts")
    expect(r.stdout).toContain("publishes")

    const { body } = await getSnapshot()
    assertFullShape(body.data)
    expect(body.data.staleSections).toEqual([])
    for (const node of body.data.funnel.nodes) {
      expect(node.total).toBeGreaterThan(0)
      expect(node.deltaPct).not.toBeNull()
      expect((node.deltaPct ?? 0) > 0).toBe(true)
    }
    dump("state-5-real-seeder", body.data)
  })

  test("[state 6] activity-log POST surfaces in the next snapshot fetch", async () => {
    clearAllSeed()
    const baseline = await getSnapshot()
    const baseCount = baseline.body.data.activity.length

    const marker = `snap-e2e SSE round-trip ${Date.now()}`
    const post = await h().fetchAuthed("/api/activity/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "skill-run", skill: "seo-content", summary: marker }),
    })
    expect(post.status).toBe(200)

    const after = await getSnapshot()
    expect(after.body.data.activity.length).toBe(baseCount + 1)
    const found = after.body.data.activity.find((r) => r.summary === marker)
    expect(found).toBeDefined()
    expect(found?.kind).toBe("skill-run")
    expect(found?.skill).toBe("seo-content")
    dump("state-6-after-activity", after.body.data)
  })

  test("?fields= projection masks the snapshot envelope", async () => {
    const res = await h().fetchAuthed("/api/pulse/snapshot?fields=brandHealth.score,staleSections")
    expect(res.status).toBe(200)
    const body = (await res.json()) as PulseSnapshotResponse
    expect(body.ok).toBe(true)
    const data = body.data as unknown as Record<string, unknown>
    expect(data.staleSections).toBeDefined()
    expect(data.brandHealth).toBeDefined()
    expect(data.funnel).toBeUndefined()
    expect(data.activity).toBeUndefined()
    expect(data.recentMedia).toBeUndefined()
    expect(data.recentPublish).toBeUndefined()
  })

  test("repeated identical fetch returns the same shape (stable contract)", async () => {
    const a = (await getSnapshot()).body.data
    const b = (await getSnapshot()).body.data
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort())
    expect(a.funnel.nodes.length).toBe(b.funnel.nodes.length)
    expect(a.funnel.nodes.map((n) => n.key)).toEqual(b.funnel.nodes.map((n) => n.key))
  })
})
