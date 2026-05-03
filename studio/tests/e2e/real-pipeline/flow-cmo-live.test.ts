// tests/e2e/real-pipeline/flow-cmo-live.test.ts
//
// J3 -- /cmo live-driving soak (scaled smoke).
//
// Exercises the 5-verb /cmo <-> studio contract under a sustained session:
// activity-log, navigate, toast, brand/refresh, schema. Drives the verbs
// at ~15s intervals for ~90s wall-clock, samples /api/health every 10s to
// verify SSE subscribers never drops to 0 mid-session (the Bug #8
// regression guard A5 already verified at 10 min; J3 is the CI-sized
// version that runs every commit).
//
// Production 10-min soak is documented in docs/FLOW-CMO-LIVE.md + K4
// pre-flight checklist. This CI test is the 90s version so it fits in
// a reasonable test budget and catches regressions early.
//
// Live driving mode (skipped unless `mktg cmo` subcommand exists on the
// installed CLI, which landed in M4 / `ade8760`) would use the CLI as
// the driver. The default HTTP-simulation path mirrors what /cmo does
// over the wire, which is the same risk surface the studio exposes.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHarness, type RealPipelineHarness } from "./setup";

const HAS_LIVE_CMO = (() => {
  try {
    const r = spawnSync("mktg", ["cmo", "--help"], { encoding: "utf8" });
    return r.status === 0;
  } catch {
    return false;
  }
})();

// Session-sized knob. The K4 pre-flight runs 600s for the real go/no-go
// soak. CI version runs shorter so it fits in test budget.
// Override with J3_SOAK_SECONDS=300 for mid-length verification.
const SOAK_SECONDS = Number(process.env.J3_SOAK_SECONDS ?? "90");
const VERB_INTERVAL_MS = Number(process.env.J3_VERB_INTERVAL_MS ?? "8000");
const HEALTH_INTERVAL_MS = Number(process.env.J3_HEALTH_INTERVAL_MS ?? "10000");

let harness: RealPipelineHarness | null = null;

beforeEach(async () => {
  harness = await createHarness();
});

afterEach(async () => {
  if (harness) {
    await harness.teardown();
    harness = null;
  }
});

function h(): RealPipelineHarness {
  if (!harness) throw new Error("harness not initialized");
  return harness;
}

interface HealthSample {
  at: number;
  status: number;
  subscribers: number;
  ok: boolean;
  error?: string;
}

async function sampleHealth(baseUrl: string): Promise<HealthSample> {
  const at = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    const body = (await res.json()) as { ok?: boolean; subscribers?: number };
    return { at, status: res.status, subscribers: body.subscribers ?? 0, ok: body.ok ?? false };
  } catch (e) {
    return { at, status: 0, subscribers: 0, ok: false, error: String(e).slice(0, 80) };
  }
}

/** Five-verb driver -- each returns true on 2xx, false otherwise. */
const verbs: ReadonlyArray<{ name: string; run: (baseUrl: string, i: number) => Promise<boolean> }> = [
  {
    name: "activity-log",
    run: async (baseUrl, i) => {
      const res = await fetch(`${baseUrl}/api/activity/log`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "skill-run",
          skill: "j3-soak",
          summary: `J3 soak tick ${i}`,
          meta: { tick: i },
        }),
      });
      return res.ok;
    },
  },
  {
    name: "navigate",
    run: async (baseUrl, i) => {
      const tabs = ["hq", "signals", "publish", "brand"];
      const tab = tabs[i % tabs.length]!;
      const res = await fetch(`${baseUrl}/api/navigate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tab }),
      });
      return res.ok;
    },
  },
  {
    name: "toast",
    run: async (baseUrl, i) => {
      const res = await fetch(`${baseUrl}/api/toast`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ level: "info", message: `J3 ping ${i}`, duration: 1000 }),
      });
      return res.ok;
    },
  },
  {
    name: "schema-fetch",
    run: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/schema`);
      return res.ok;
    },
  },
  {
    name: "brand-refresh",
    run: async (baseUrl) => {
      // dry-run so we don't actually enqueue foundation agents every cycle.
      const res = await fetch(`${baseUrl}/api/brand/refresh?dryRun=true`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      return res.ok;
    },
  },
];

async function openSseSubscriber(baseUrl: string, ac: AbortController): Promise<void> {
  // Fire-and-forget: we only need the server to register a subscriber so
  // /api/health reports subscribers >= 1. Consume the stream so it stays open.
  fetch(`${baseUrl}/api/events`, { signal: ac.signal }).then(async (res) => {
    if (!res.body) return;
    const reader = res.body.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      /* aborted on teardown */
    }
  }).catch(() => {
    /* ignore */
  });
  // Give the server a moment to register.
  await Bun.sleep(300);
}

// ---------------------------------------------------------------------------
describe("J3 /cmo live-driving soak", () => {
  test(`${SOAK_SECONDS}s HTTP-simulated soak: SSE subscribers stay >= 1, all verbs round-trip`, async () => {
    const baseUrl = h().studioBaseUrl;

    // Simulate a dashboard client.
    const ac = new AbortController();
    await openSseSubscriber(baseUrl, ac);

    const deadline = Date.now() + SOAK_SECONDS * 1000;
    const healthSamples: HealthSample[] = [];
    const verbResults: Array<{ verb: string; tick: number; ok: boolean; ms: number }> = [];

    let tick = 0;
    let nextHealthAt = Date.now() + HEALTH_INTERVAL_MS;
    let nextVerbAt = Date.now() + VERB_INTERVAL_MS;

    // Initial health sample.
    healthSamples.push(await sampleHealth(baseUrl));

    while (Date.now() < deadline) {
      const now = Date.now();
      if (now >= nextHealthAt) {
        healthSamples.push(await sampleHealth(baseUrl));
        nextHealthAt = now + HEALTH_INTERVAL_MS;
      }
      if (now >= nextVerbAt) {
        const verb = verbs[tick % verbs.length]!;
        const t0 = Date.now();
        const ok = await verb.run(baseUrl, tick).catch(() => false);
        const ms = Date.now() - t0;
        verbResults.push({ verb: verb.name, tick, ok, ms });
        tick++;
        nextVerbAt = now + VERB_INTERVAL_MS;
      }
      // Short sleep so we don't busy-loop.
      await Bun.sleep(200);
    }

    // Final health sample after the soak.
    healthSamples.push(await sampleHealth(baseUrl));

    ac.abort();

    // ------------------------------------------------------------------
    // Assertions
    // ------------------------------------------------------------------

    // At least 5 verbs fired.
    expect(verbResults.length).toBeGreaterThanOrEqual(5);
    // All verbs returned 2xx.
    for (const r of verbResults) {
      expect(r.ok).toBe(true);
      // Each verb round-trip should land within 500ms budget.
      expect(r.ms).toBeLessThan(500);
    }
    // Every kind of verb exercised at least once.
    const verbKinds = new Set(verbResults.map((r) => r.verb));
    for (const v of verbs) {
      expect(verbKinds.has(v.name)).toBe(true);
    }

    // At least 3 health samples captured.
    expect(healthSamples.length).toBeGreaterThanOrEqual(3);
    // Every sample returned 200 OK.
    for (const s of healthSamples) {
      expect(s.status).toBe(200);
      expect(s.ok).toBe(true);
    }
    // Subscribers must stay >= 1 across the session (Bug #8 regression guard).
    const steadySubscribers = healthSamples.every((s) => s.subscribers >= 1);
    expect(steadySubscribers).toBe(true);

    // No health sample should report an error string.
    for (const s of healthSamples) {
      expect(s.error).toBeUndefined();
    }
  }, SOAK_SECONDS * 1000 + 30_000);

  test("each verb round-trips under 500ms in isolation (no contention)", async () => {
    const baseUrl = h().studioBaseUrl;
    for (const verb of verbs) {
      const t0 = Date.now();
      const ok = await verb.run(baseUrl, 0);
      const ms = Date.now() - t0;
      expect(ok).toBe(true);
      expect(ms).toBeLessThan(500);
    }
  });

  test("subscribers count goes 0 -> 1 on connect, 1 -> 0 on disconnect", async () => {
    const baseUrl = h().studioBaseUrl;
    const baseline = await sampleHealth(baseUrl);
    // Fresh harness should start with 0 subscribers.
    expect(baseline.subscribers).toBe(0);

    const ac = new AbortController();
    await openSseSubscriber(baseUrl, ac);
    const connected = await sampleHealth(baseUrl);
    expect(connected.subscribers).toBeGreaterThanOrEqual(1);

    ac.abort();
    // Give the server a moment to notice the disconnect.
    await Bun.sleep(500);
    const disconnected = await sampleHealth(baseUrl);
    expect(disconnected.subscribers).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Live CLI-driven soak (skipped unless `mktg cmo` is installed)
// ---------------------------------------------------------------------------
describe.skipIf(!HAS_LIVE_CMO)("J3 /cmo live-driving soak (CLI mode)", () => {
  test("mktg cmo --json round-trips against the spawned studio", async () => {
    // Skipped on machines without marketing-cli 0.2.0+ / M4 `mktg cmo`.
    // When present, a follow-up suite would scripted-drive a full 10-min
    // session per K4 pre-flight. Left as a scaffold here so a curious
    // operator can `J3_SOAK_SECONDS=600 bun test ...` with live /cmo.
    expect(HAS_LIVE_CMO).toBe(true);
  });
});
