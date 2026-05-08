// Lane 1 E2E -- the 5 palette-reachable mutating endpoints must all be
// token-gated. greensnow flagged this as a P0: a single keyboard chord
// fires up to 5 mutations from one location, and any of them being
// reachable without auth is a leak surface in production.
//
// Endpoints (per MEGA-PLAN.md gotcha "Palette as de-facto API surface"):
//   1. POST /api/skill/run
//   2. POST /api/cmo/playbook
//   3. POST /api/brand/refresh
//   4. POST /api/brand/reset      (also requires ?confirm=true)
//   5. POST /api/settings/env     (also requires ?confirm=true post-Lane 1)
//
// Each is probed with: no auth (401), valid bearer dryRun (200/202), valid
// token via ?token= (matches the SSE-fallback path).

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startSecurityServer, type SecurityHarness, PORTS } from "./harness";

let h: SecurityHarness;

beforeAll(async () => {
  h = await startSecurityServer({ port: PORTS.paletteEndpoints });
});

afterAll(async () => {
  await h?.teardown();
});

interface Probe {
  readonly path: string;
  readonly body: Record<string, unknown>;
  /** Extra query params (e.g. confirm=true). */
  readonly extraQuery?: string;
  /** Acceptable success status codes (some routes return 202). */
  readonly successStatus: ReadonlyArray<number>;
}

const PROBES: Record<string, Probe> = {
  "/api/skill/run":        { path: "/api/skill/run",        body: { name: "brand-voice" },         successStatus: [200, 202] },
  "/api/cmo/playbook":     { path: "/api/cmo/playbook",     body: { name: "voice-research" },      successStatus: [200, 202] },
  "/api/brand/refresh":    { path: "/api/brand/refresh",    body: { seed: true },                  successStatus: [200, 202] },
  "/api/brand/reset":      { path: "/api/brand/reset",      body: {}, extraQuery: "confirm=true",  successStatus: [200, 202] },
  "/api/settings/env":     { path: "/api/settings/env",     body: { FOO_KEY: "bar" }, extraQuery: "confirm=true", successStatus: [200, 202] },
};

const buildUrl = (base: string, p: Probe, withDryRun: boolean, withTokenQuery?: string): string => {
  const params = new URLSearchParams();
  if (withDryRun) params.set("dryRun", "true");
  if (p.extraQuery) {
    for (const [k, v] of new URLSearchParams(p.extraQuery)) params.set(k, v);
  }
  if (withTokenQuery) params.set("token", withTokenQuery);
  const q = params.toString();
  return `${base}${p.path}${q ? `?${q}` : ""}`;
};

describe("palette endpoints -- token gate covers all 5", () => {
  for (const [name, probe] of Object.entries(PROBES)) {
    describe(name, () => {
      test("FAILURE: no auth returns 401 UNAUTHORIZED", async () => {
        const r = await fetch(buildUrl(h.baseUrl, probe, true), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(probe.body),
        });
        expect(r.status).toBe(401);
        const env = (await r.json()) as { ok: false; error: { code: string } };
        expect(env.error.code).toBe("UNAUTHORIZED");
      });

      test("HAPPY: valid Authorization: Bearer + dryRun returns success", async () => {
        const r = await fetch(buildUrl(h.baseUrl, probe, true), {
          method: "POST",
          headers: { ...h.bearer(), "Content-Type": "application/json" },
          body: JSON.stringify(probe.body),
        });
        expect(probe.successStatus).toContain(r.status);
      });

      test("HAPPY: valid ?token= query + dryRun returns success", async () => {
        const r = await fetch(buildUrl(h.baseUrl, probe, true, h.token), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(probe.body),
        });
        expect(probe.successStatus).toContain(r.status);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Confirm gate on destructive endpoints (Lane 1 added settings/env to the
// destructive set; brand/reset was already there).
// ---------------------------------------------------------------------------

describe("palette endpoints -- destructive routes require ?confirm=true", () => {
  test("/api/brand/reset without confirm returns 400 CONFIRM_REQUIRED (auth-gated first)", async () => {
    const r = await fetch(`${h.baseUrl}/api/brand/reset`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string } };
    expect(env.error.code).toBe("CONFIRM_REQUIRED");
  });

  test("/api/settings/env without confirm returns 400 CONFIRM_REQUIRED", async () => {
    const r = await fetch(`${h.baseUrl}/api/settings/env`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: JSON.stringify({ FOO_KEY: "bar" }),
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string; fix?: string } };
    expect(env.error.code).toBe("CONFIRM_REQUIRED");
    expect(env.error.fix).toMatch(/confirm=true/);
  });

  test("/api/settings/env with confirm + valid bearer writes + emits activity-new", async () => {
    // Subscribe to /api/events first to capture the activity-new SSE.
    const ctrl = new AbortController();
    const eventsPromise = fetch(h.withToken("/api/events"), { signal: ctrl.signal });
    const events = await eventsPromise;
    expect(events.status).toBe(200);

    // Read the first 'connected' frame so the subscription is live.
    const reader = events.body!.getReader();
    const decoder = new TextDecoder();
    const readFrame = async (): Promise<string> => {
      const { value, done } = await reader.read();
      if (done) return "";
      return decoder.decode(value, { stream: true });
    };
    await readFrame(); // discard 'connected'

    // Now trigger the env write (with confirm=true).
    const w = await fetch(`${h.baseUrl}/api/settings/env?confirm=true`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: JSON.stringify({ FOO_E2E_KEY: "test-value-e2e" }),
    });
    expect(w.status).toBe(200);
    const writeBody = (await w.json()) as { ok: boolean; written: string[] };
    expect(writeBody.ok).toBe(true);
    expect(writeBody.written).toContain("FOO_E2E_KEY");

    // Drain frames until we see activity-new with kind=audit. Bound the wait.
    let sawAudit = false;
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      const frame = await Promise.race([
        readFrame(),
        new Promise<string>((res) => setTimeout(() => res(""), 500)),
      ]);
      if (!frame) continue;
      if (frame.includes('"activity-new"') && frame.includes('"audit"')) {
        sawAudit = true;
        // Audit row must include the key NAME but NEVER the value.
        expect(frame).toMatch(/FOO_E2E_KEY/);
        expect(frame).not.toMatch(/test-value-e2e/);
        break;
      }
    }
    ctrl.abort();
    expect(sawAudit).toBe(true);
  });
});
