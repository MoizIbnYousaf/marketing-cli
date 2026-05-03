import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startTestServer, type ServerHandle } from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4004);
});

afterAll(async () => {
  await server.kill();
});

async function countActivity(baseUrl: string, kind?: string): Promise<number> {
  // Scoped by `kind` when provided so a polluted activity table (500+ rows in
  // shared marketing.db) doesn't cap the count and hide the delta. Falls back
  // to the full list for tests that don't care about isolation.
  const q = kind ? `?kind=${encodeURIComponent(kind)}&limit=500` : "?limit=500";
  const res = await fetch(`${baseUrl}/api/activity${q}`);
  const body = (await res.json()) as { data: unknown[] };
  return body.data.length;
}

async function countActivityBySummary(baseUrl: string, probe: string): Promise<number> {
  const res = await fetch(`${baseUrl}/api/activity?limit=500`)
  const body = (await res.json()) as { data: Array<{ summary?: string }> }
  return body.data.filter((row) => row.summary?.includes(probe)).length
}

async function countOpportunities(baseUrl: string): Promise<number> {
  // This endpoint returns a bare structured shape (no envelope) so Pulse can
  // consume it directly. The dry-run check only cares about the visible card
  // count.
  const res = await fetch(`${baseUrl}/api/opportunities`);
  const body = (await res.json()) as { opportunities: unknown[] };
  return body.opportunities.length;
}

describe("integration/dryrun", () => {
  test("POST /api/activity/log?dryRun=true does NOT insert a row", async () => {
    const summary = `dryrun probe ${Date.now()}`
    const before = await countActivityBySummary(server.baseUrl, summary);
    const res = await fetch(`${server.baseUrl}/api/activity/log?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "custom", summary }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    const after = await countActivityBySummary(server.baseUrl, summary);
    expect(after).toBe(before);
  });

  test("POST /api/opportunities/push?dryRun=true does NOT insert a row", async () => {
    const before = await countOpportunities(server.baseUrl);
    const res = await fetch(`${server.baseUrl}/api/opportunities/push?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        skill: "landscape-scan",
        reason: "dry-run probe",
        priority: 50,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(body.dryRun).toBe(true);
    const after = await countOpportunities(server.baseUrl);
    expect(after).toBe(before);
  });

  test("POST /api/brand/note?dryRun=true does NOT write a row", async () => {
    // /api/brand/note writes with kind="brand-write" — scope the count to that.
    const before = await countActivity(server.baseUrl, "brand-write");
    const res = await fetch(`${server.baseUrl}/api/brand/note?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        file: "brand/voice-profile.md",
        excerpt: "## Voice\ndryrun test",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dryRun?: boolean };
    expect(body.dryRun).toBe(true);
    const after = await countActivity(server.baseUrl, "brand-write");
    expect(after).toBe(before);
  });

  test("without ?dryRun=true the write IS persisted", async () => {
    const summary = `persisted ${Date.now()}`
    const before = await countActivityBySummary(server.baseUrl, summary);
    const res = await fetch(`${server.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "custom",
        summary,
      }),
    });
    expect(res.status).toBe(200);
    const after = await countActivityBySummary(server.baseUrl, summary);
    expect(after).toBe(before + 1);
  });
});
