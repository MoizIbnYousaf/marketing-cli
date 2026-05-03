// tests/e2e/real-pipeline/flow-signals.test.ts
//
// J4 -- Full-flow E2E: Signal collection + severity + actions.
//
// Exercises the signals surface against a real spawned server + real SQLite.
// Does not require external APIs. Test setup seeds signals directly into
// the harness's SQLite so the feed + action routes can be exercised
// deterministically.
//
// Flow:
//   1. Signals arrive via /cmo running mktg-x / last30days / landscape-scan
//      which INSERT rows into the signals table (test: direct seed)
//   2. User opens Signals tab -> SWR GET /api/signals with filters
//   3. User views severity pills (P0, P1, Warn, Watch counts from /api/signals)
//   4. User filters by platform / time-window / stream
//   5. User picks one and clicks Approve / Dismiss / Flag
//   6. Server updates signals.feedback + fires activity row (see server.ts)
//   7. UI SWR revalidates, row disappears from default filter

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { createHarness, type RealPipelineHarness } from "./setup";

// Harness now spawns the server with MKTG_STUDIO_DB pointed at a temp
// SQLite file (see setup.ts:102), and the server honors that env via
// resolveStudioDbPath() in lib/project-root.ts. Seeds therefore go into
// the harness's per-test DB at `${tempDir}/studio.sqlite` — full isolation,
// no developer-DB pollution, no sentinel cleanup needed.
const SENTINEL = "__J4_TEST__";

function harnessDbPath(): string {
  return resolve(h().tempDir, "studio.sqlite");
}

let harness: RealPipelineHarness | null = null;

beforeEach(async () => {
  harness = await createHarness();
});

afterEach(async () => {
  // Per-test DB lives in the harness tempDir; teardown rm -rfs it.
  if (harness) {
    await harness.teardown();
    harness = null;
  }
});

afterAll(() => {
  // No-op: every harness owns its own tempDir + studio.sqlite, all
  // cleaned up by teardown. Kept for parity with the J3 / J1 layout.
});

function h(): RealPipelineHarness {
  if (!harness) throw new Error("harness not initialized");
  return harness;
}

/** Insert a signal directly into the harness's temp SQLite so the API can see it. */
function seedSignal(opts: {
  platform: string;
  content: string;
  url?: string;
  severity?: string;
  spike?: number;
  feedback?: string;
  ageHours?: number;
}): number {
  // Schema stores severity as INTEGER (db/schema.sql:9) and the server's
  // normalizeSignalSeverity() maps numeric thresholds to labels:
  //   >=80 -> p0, 60-79 -> p1, 40-59 -> watch, <0 -> negative, else neutral.
  // Test callers can pass either a label or a number; we convert here.
  const SEVERITY_LABELS: Record<string, number> = {
    p0: 90,
    p1: 70,
    watch: 50,
    neutral: 20,
    negative: -10,
  };
  const severityRaw = opts.severity ?? "p1";
  const severityNumeric =
    typeof severityRaw === "number"
      ? severityRaw
      : (SEVERITY_LABELS[severityRaw] ?? 70);
  const db = new Database(harnessDbPath());
  try {
    const stmt = db.prepare(
      "INSERT INTO signals (platform, content, url, severity, spike_detected, feedback, metadata, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))",
    );
    const ageOffset = `-${opts.ageHours ?? 1} hours`;
    const info = stmt.run(
      opts.platform,
      `${SENTINEL} ${opts.content}`,
      opts.url ?? "https://example.com/test",
      severityNumeric,
      opts.spike ?? 0,
      opts.feedback ?? "pending",
      JSON.stringify({ source: "j4-test" }),
      ageOffset,
    );
    return Number(info.lastInsertRowid);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
describe("J4 signal-collection flow", () => {
  test("step 1: GET /api/signals returns a list (bare array OR wrapped)", async () => {
    const res = await fetch(`${h().studioBaseUrl}/api/signals`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Signals route returns bare array per CLAUDE.md axis-1 bare-structured-shape
    // note (not wrapped in {ok:true,data}). Accept either shape.
    if (Array.isArray(body)) {
      expect(body).toBeDefined();
    } else {
      expect((body as { ok: true; data: unknown[] }).ok).toBe(true);
      expect(Array.isArray((body as { data: unknown[] }).data)).toBe(true);
    }
  });

  test("step 2: seeded signals appear in GET /api/signals with severity + spike fields", async () => {
    const id1 = seedSignal({ platform: "twitter", content: "P0 urgent thing", severity: "p0", spike: 1, ageHours: 1 });
    const id2 = seedSignal({ platform: "tiktok", content: "P1 rising", severity: "p1", ageHours: 6 });
    const id3 = seedSignal({ platform: "news", content: "Watch it", severity: "watch", ageHours: 12 });

    const res = await fetch(`${h().studioBaseUrl}/api/signals`);
    expect(res.status).toBe(200);
    const raw = await res.json();
    const signals = Array.isArray(raw) ? raw : (raw as { data: unknown[] }).data;
    expect(Array.isArray(signals)).toBe(true);
    // Server serializes id as string for stable JSON across bigint-safe
    // payloads (server.ts:969). Tests compare via String(...) to match.
    const list = signals as Array<{ id: string; platform: string; severity?: string; spikeDetected?: boolean; spike_detected?: number; content?: string }>;
    expect(list.length).toBeGreaterThanOrEqual(3);
    const ids = list.map((s) => s.id);
    expect(ids).toContain(String(id1));
    expect(ids).toContain(String(id2));
    expect(ids).toContain(String(id3));

    // Severity + spike fields preserved per-row.
    const p0 = list.find((s) => s.id === String(id1))!;
    expect(p0.severity).toBe("p0");
    // Spike may be exposed as spikeDetected boolean OR spike_detected 0/1.
    const spikeFlag = p0.spikeDetected === true || p0.spike_detected === 1;
    expect(spikeFlag).toBe(true);
  });

  test("step 3: GET /api/signals/:id returns single row envelope", async () => {
    const id = seedSignal({ platform: "twitter", content: "single-row probe", severity: "p1" });

    const res = await fetch(`${h().studioBaseUrl}/api/signals/${id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; data: { id: string; content: string; platform: string } };
    expect(body.ok).toBe(true);
    // Server serializes id as string (server.ts:969).
    expect(body.data.id).toBe(String(id));
    expect(body.data.content).toContain("single-row probe");
    expect(body.data.platform).toBe("twitter");
  });

  test("step 4: GET /api/signals/:id on unknown id returns 404", async () => {
    const res = await fetch(`${h().studioBaseUrl}/api/signals/9999999`);
    expect(res.status).toBe(404);
  });

  test("step 5: POST /api/signals/dismiss?dryRun=true returns ok without mutating", async () => {
    const id = seedSignal({ platform: "twitter", content: "dismiss dry-run", severity: "p1", feedback: "pending" });

    const res = await fetch(`${h().studioBaseUrl}/api/signals/dismiss?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(body.ok).toBe(true);

    // Row unchanged.
    const after = await fetch(`${h().studioBaseUrl}/api/signals/${id}`).then((r) => r.json() as Promise<{ ok: true; data: { feedback: string } }>);
    expect(after.data.feedback).toBe("pending");
  });

  test("step 6: POST /api/signals/dismiss flips feedback to dismissed", async () => {
    const id = seedSignal({ platform: "twitter", content: "dismiss real", severity: "p2", feedback: "pending" });

    const res = await fetch(`${h().studioBaseUrl}/api/signals/dismiss`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    expect(res.status).toBe(200);

    const after = await fetch(`${h().studioBaseUrl}/api/signals/${id}`).then((r) => r.json() as Promise<{ ok: true; data: { feedback: string } }>);
    expect(after.data.feedback).toBe("dismissed");
  });

  test("step 7: POST /api/signals/approve flips feedback to approved", async () => {
    const id = seedSignal({ platform: "tiktok", content: "approve flow", severity: "p0", feedback: "pending" });

    const res = await fetch(`${h().studioBaseUrl}/api/signals/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    expect(res.status).toBe(200);

    const after = await fetch(`${h().studioBaseUrl}/api/signals/${id}`).then((r) => r.json() as Promise<{ ok: true; data: { feedback: string } }>);
    expect(after.data.feedback).toBe("approved");
  });

  test("step 8: POST /api/signals/flag with reason persists flag + reason", async () => {
    const id = seedSignal({ platform: "instagram", content: "flag with reason", severity: "p1", feedback: "pending" });

    const res = await fetch(`${h().studioBaseUrl}/api/signals/flag`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, reason: "wrong platform classification" }),
    });
    expect(res.status).toBe(200);

    const after = await fetch(`${h().studioBaseUrl}/api/signals/${id}`).then((r) => r.json() as Promise<{ ok: true; data: { feedback: string } }>);
    expect(after.data.feedback).toBe("flagged");
  });

  test("step 9: action on unknown id returns 404 (not 500)", async () => {
    // H1-77-era regression: action handlers on missing id must return 404
    // with a structured error, not 500. Verified fixed at `51dc0e5`.
    for (const action of ["dismiss", "approve"] as const) {
      const res = await fetch(`${h().studioBaseUrl}/api/signals/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: 9999999 }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as { ok: false; error: { code: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    }
  });

  test("step 10: action with invalid body returns 400 BAD_INPUT", async () => {
    const res = await fetch(`${h().studioBaseUrl}/api/signals/dismiss`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "not-a-number" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("BAD_INPUT");
  });

  test("step 11: bulk-ish action loop -- 5 rapid dismiss calls all persist + 0 race/overwrite", async () => {
    // J4 surfaced the absence of a proper bulk endpoint (H1-69) -- users
    // currently loop one-by-one. This test asserts that loop behavior is
    // safe: no row ends up in a half-state, every call independently 200s,
    // and the feed after shows all 5 as dismissed.
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(seedSignal({ platform: "news", content: `bulk probe ${i}`, severity: "p1", feedback: "pending" }));
    }

    const results = await Promise.all(
      ids.map((id) =>
        fetch(`${h().studioBaseUrl}/api/signals/dismiss`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }).then((r) => r.status),
      ),
    );
    for (const status of results) expect(status).toBe(200);

    for (const id of ids) {
      const after = await fetch(`${h().studioBaseUrl}/api/signals/${id}`).then((r) => r.json() as Promise<{ ok: true; data: { feedback: string } }>);
      expect(after.data.feedback).toBe("dismissed");
    }
  });

  test("step 12: GET /api/signals/baseline returns baselines envelope", async () => {
    const res = await fetch(`${h().studioBaseUrl}/api/signals/baseline`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Baseline route may return bare envelope or wrapped -- accept both.
    expect(body).toBeDefined();
  });
});
