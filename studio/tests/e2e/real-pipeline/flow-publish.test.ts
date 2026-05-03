// tests/e2e/real-pipeline/flow-publish.test.ts
//
// J2 -- Full-flow E2E: Publish loop (draft -> scheduled -> published).
//
// Exercises the studio's publish pipeline against a real spawned server +
// real SQLite publish_log + real SSE. Live Postiz API is exercised only
// when POSTIZ_API_KEY is set in the environment; otherwise those tests
// are skipped with a clear message and the offline tests assert that
// the unavailable path degrades gracefully.
//
// What the flow is (per CLAUDE.md driver/dashboard contract):
//
// 1. User picks one or more connected accounts in Publish tab
// 2. User composes content, selects mode (draft / schedule / now)
// 3. Studio POSTs /api/publish with {adapter:"postiz", manifest, confirm}
// 4. Studio shells out to `mktg publish --adapter postiz --json` which
// raw-fetches the Postiz public API (AGPL firewall: no @postiz/node)
// 5. On success: publish_log row inserted + SSE broadcast `publish-completed`
// + toast (see A16 / H1-55 -- toast reads server truth, not requested mode)
// 6. Scheduled queue re-reads /api/publish/scheduled (Postiz-side)
// 7. Rate-limit badge re-reads /api/publish/history (local 1h window)
//
// This suite covers steps 3, 5, 6, 7 against the server. Steps 1 and 2 are
// Publish-tab UI (covered by G2 mobile + G1 desktop). Step 4 (the mktg
// CLI adapter) is covered by the maintainer's CLI-side tests; here we assert
// the envelope the studio expects from that call.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHarness, type RealPipelineHarness } from "./setup";

const HAS_POSTIZ = !!process.env.POSTIZ_API_KEY;

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

async function collectSseEvents(baseUrl: string, predicate: (e: { type: string; payload: unknown }) => boolean, timeoutMs: number): Promise<Array<{ type: string; payload: unknown }>> {
 const ac = new AbortController();
 const collected: Array<{ type: string; payload: unknown }> = [];
 let resolved = false;
 const timer = setTimeout(() => { ac.abort(); }, timeoutMs);
 try {
 const res = await fetch(`${baseUrl}/api/events`, { signal: ac.signal });
 if (!res.ok || !res.body) return collected;
 const reader = res.body.getReader();
 const decoder = new TextDecoder();
 let buffer = "";
 while (!resolved) {
 const { value, done } = await reader.read();
 if (done) break;
 buffer += decoder.decode(value, { stream: true });
 let idx = buffer.indexOf("\n\n");
 while (idx !== -1) {
 const frame = buffer.slice(0, idx);
 buffer = buffer.slice(idx + 2);
 for (const line of frame.split("\n")) {
 if (!line.startsWith("data:")) continue;
 const payload = line.slice(5).trim();
 if (!payload) continue;
 try {
 const evt = JSON.parse(payload) as { type: string; payload: unknown };
 collected.push(evt);
 if (predicate(evt)) { resolved = true; break; }
 } catch { /* skip malformed */ }
 }
 idx = buffer.indexOf("\n\n");
 }
 }
 try { reader.cancel(); } catch { /* ignore */ }
 } catch { /* aborted on timeout */ } finally {
 clearTimeout(timer);
 }
 return collected;
}

// ---------------------------------------------------------------------------
// Offline flow -- always runs, no API keys required
// ---------------------------------------------------------------------------
describe("J2 publish flow (offline)", () => {
 test("GET /api/publish/adapters returns an array of known adapters", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish/adapters`);
 expect(res.status).toBe(200);
 const body = (await res.json()) as { ok: true; data: Array<{ name: string; envVar?: string | null; configured?: boolean }> };
 expect(body.ok).toBe(true);
 expect(Array.isArray(body.data)).toBe(true);
 expect(body.data.length).toBeGreaterThan(0);
 // Every entry must have a name and a configured flag. postiz availability
 // depends on the installed marketing-cli version (0.2.0+ ships it; 0.1.0
 // does not -- tracked in F3-02). Don't pin to postiz here.
 for (const a of body.data) {
 expect(typeof a.name).toBe("string");
 expect(typeof a.configured).toBe("boolean");
 }
 // At least one of the long-lived adapters ('file' is always present) must
 // be in the list.
 const names = body.data.map((a) => a.name);
 expect(names).toContain("file");
 });

 test("GET /api/publish/integrations?adapter=postiz returns structured envelope", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish/integrations?adapter=postiz`);
 expect(res.status).toBe(200);
 const body = (await res.json()) as { ok: boolean; adapter?: string; data?: unknown[]; unavailable?: boolean; error?: string };
 // Either configured (ok:true + data:[]+ | [...]) or unavailable (ok:true, unavailable:true, error string).
 expect(body.ok).toBe(true);
 if (!HAS_POSTIZ) {
 // Postiz key not set: integrations should be unavailable OR data empty.
 expect(body.unavailable === true || (Array.isArray(body.data) && body.data.length === 0)).toBe(true);
 }
 });

 test("POST /api/publish?dryRun=true returns adapter echo without side effects", async () => {
 const baseUrl = h().studioBaseUrl;
 const beforeHistory = await fetch(`${baseUrl}/api/publish/history?limit=50`).then((r) => r.json() as Promise<{ ok: true; data: unknown[] }>);

 const res = await fetch(`${baseUrl}/api/publish?dryRun=true`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter: "postiz",
 manifest: {
 name: "j2-dry-run",
 items: [
 {
 type: "social",
 adapter: "postiz",
 content: "J2 dry-run test post",
 metadata: { postType: "draft" },
 },
 ],
 },
 confirm: false,
 }),
 });
 expect(res.status).toBe(200);
 const body = (await res.json()) as { ok: true; dryRun: true; adapter: string };
 expect(body.ok).toBe(true);
 expect(body.dryRun).toBe(true);
 expect(body.adapter).toBe("postiz");

 const afterHistory = await fetch(`${baseUrl}/api/publish/history?limit=50`).then((r) => r.json() as Promise<{ ok: true; data: unknown[] }>);
 expect(afterHistory.data.length).toBe(beforeHistory.data.length);
 });

 test("POST /api/publish with invalid adapter name returns 400", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter: "../../../etc",
 manifest: { name: "malicious", items: [] },
 }),
 });
 expect(res.status).toBeGreaterThanOrEqual(400);
 expect(res.status).toBeLessThan(500);
 const body = (await res.json()) as { ok: false; error: { code: string; message: string } };
 expect(body.ok).toBe(false);
 expect(typeof body.error.code).toBe("string");
 });

 test("POST /api/publish with missing body fields returns BAD_INPUT", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({}),
 });
 expect(res.status).toBe(400);
 const body = (await res.json()) as { ok: false; error: { code: string } };
 expect(body.ok).toBe(false);
 expect(body.error.code).toBe("BAD_INPUT");
 });

 test("GET /api/publish/history returns an array + envelope", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish/history?limit=10`);
 expect(res.status).toBe(200);
 const body = (await res.json()) as { ok: true; data: Array<{ adapter: string; createdAt: string; itemsPublished: number }> };
 expect(body.ok).toBe(true);
 expect(Array.isArray(body.data)).toBe(true);
 // Empty on fresh harness is valid.
 });

 test("GET /api/publish/scheduled is shaped even when Postiz unreachable", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish/scheduled`);
 // When POSTIZ_API_KEY absent, route may return 200 ok:true with unavailable:true
 // or 502 UPSTREAM_FAILED. Both are valid degradation.
 expect([200, 502]).toContain(res.status);
 const body = (await res.json()) as { ok: boolean; data?: unknown[]; unavailable?: boolean; error?: unknown };
 if (body.ok) {
 expect(body.unavailable === true || Array.isArray(body.data)).toBe(true);
 } else {
 expect(body.error).toBeDefined();
 }
 });

 test("POST /api/publish without POSTIZ_API_KEY degrades with a structured error (no crash)", async () => {
 if (HAS_POSTIZ) {
 // In a live-key env this path would actually publish; skip because
 // that belongs to the live-integration block below.
 return;
 }
 const res = await fetch(`${h().studioBaseUrl}/api/publish`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter: "postiz",
 manifest: {
 name: "j2-offline",
 items: [
 {
 type: "social",
 adapter: "postiz",
 content: "offline J2",
 metadata: {
 providers: ["bluesky"],
 integrationIdentifier: "bluesky",
 postType: "draft",
 },
 },
 ],
 },
 confirm: true,
 }),
 });
 // Current server behavior is adapter-shaped:
 // - some failures bubble up as top-level 401/502
 // - some return 200 with adapter-level failed counts inside the publish envelope
 expect([200, 401, 502]).toContain(res.status);
 const body = (await res.json()) as
 | { ok: false; error: { code: string; message: string; fix?: string } }
 | {
 ok: true;
 data: {
 failed?: number;
 adapters?: Array<{ failed?: number; errors?: string[] }>;
 };
 };

 if (!body.ok) {
 expect(["UNAUTHORIZED", "UPSTREAM_FAILED", "AUTH_MISSING", "AUTH_INVALID"]).toContain(body.error.code);
 return;
 }

 expect((body.data.failed ?? 0) > 0 || (body.data.adapters?.[0]?.failed ?? 0) > 0).toBe(true);
 });

 test("mktg-native flow creates a local provider, stores a scheduled post, and exposes it through the queue", async () => {
 const baseUrl = h().studioBaseUrl;

 const accountRes = await fetch(`${baseUrl}/api/publish/native/account`);
 expect(accountRes.status).toBe(200);
 const account = (await accountRes.json()) as {
 ok: true;
 data: { account: { id: string; apiKeyPreview: string }; providerCount: number; postCount: number };
 };
 expect(account.ok).toBe(true);
 expect(account.data.account.id).toContain("mktg-native-");

 const createProviderRes = await fetch(`${baseUrl}/api/publish/native/providers`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 identifier: "linkedin",
 name: "Acme LinkedIn",
 profile: "acme",
 }),
 });
 expect(createProviderRes.status).toBe(200);
 const createProvider = (await createProviderRes.json()) as {
 ok: true;
 data: { provider: { id: string; identifier: string; profile: string } };
 };
 expect(createProvider.ok).toBe(true);
 expect(createProvider.data.provider.identifier).toBe("linkedin");

 const publishRes = await fetch(`${baseUrl}/api/publish`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter: "mktg-native",
 manifest: {
 name: "native-e2e",
 items: [
 {
 type: "social",
 adapter: "mktg-native",
 content: "Native scheduled post",
 metadata: {
 integrationId: createProvider.data.provider.id,
 integrationIdentifier: "linkedin",
 providers: ["linkedin"],
 postType: "schedule",
 date: "2026-04-24T10:00:00.000Z",
 },
 },
 ],
 },
 confirm: true,
 }),
 });
 expect(publishRes.status).toBe(200);
 const publish = (await publishRes.json()) as {
 ok: true;
 data: {
 adapters: Array<{ adapter: string; published: number; failed: number }>;
 };
 };
 expect(publish.ok).toBe(true);
 expect(publish.data.adapters[0]?.adapter).toBe("mktg-native");
 expect(publish.data.adapters[0]?.published).toBe(1);

 const queueRes = await fetch(
 `${baseUrl}/api/publish/scheduled?adapter=mktg-native&startDate=${encodeURIComponent("2026-04-23T00:00:00.000Z")}&endDate=${encodeURIComponent("2026-04-30T00:00:00.000Z")}`,
 );
 expect(queueRes.status).toBe(200);
 const queue = (await queueRes.json()) as {
 ok: true;
 data: Array<{
 campaign: string;
 status: string;
 posts: Array<{ integration: { identifier: string }; value: Array<{ content: string }> }>;
 }>;
 };
 expect(queue.ok).toBe(true);
 expect(queue.data.some((post) =>
 post.campaign === "native-e2e" &&
 post.status === "scheduled" &&
 post.posts[0]?.integration.identifier === "linkedin" &&
 post.posts[0]?.value[0]?.content === "Native scheduled post",
 )).toBe(true);
 });
});

// ---------------------------------------------------------------------------
// Live flow -- only runs when POSTIZ_API_KEY is present
// ---------------------------------------------------------------------------
describe.skipIf(!HAS_POSTIZ)("J2 publish flow (live Postiz)", () => {
 test("POST /api/publish draft mode: writes publish_log + fires SSE publish-completed", async () => {
 const baseUrl = h().studioBaseUrl;

 const ssePromise = collectSseEvents(
 baseUrl,
 (e) => e.type === "publish-completed",
 30_000,
 );
 await Bun.sleep(200);

 // Get an integration id from a real Postiz call; if none configured,
 // skip this assertion cleanly rather than fail the whole suite.
 const integrations = await fetch(`${baseUrl}/api/publish/integrations?adapter=postiz`).then((r) => r.json() as Promise<{ ok: true; data: Array<{ id: string; identifier: string }> }>);
 if (!integrations.ok || !Array.isArray(integrations.data) || integrations.data.length === 0) {
 console.log("SKIP: Postiz key set but no integrations connected -- cannot exercise draft flow");
 return;
 }
 const first = integrations.data[0];

 const publishRes = await fetch(`${baseUrl}/api/publish`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter: "postiz",
 confirm: false,
 manifest: {
 name: `j2-live-${Date.now()}`,
 items: [
 {
 type: "social",
 adapter: "postiz",
 content: "mktg-studio J2 live draft smoke test -- safe to delete",
 metadata: {
 integrationId: first.id,
 integrationIdentifier: first.identifier,
 postType: "draft",
 date: new Date().toISOString(),
 },
 },
 ],
 },
 }),
 });
 expect([200, 202]).toContain(publishRes.status);

 const events = await ssePromise;
 const done = events.find((e) => e.type === "publish-completed");
 expect(done).toBeDefined();

 const history = await fetch(`${baseUrl}/api/publish/history?limit=5`).then((r) => r.json() as Promise<{ ok: true; data: Array<{ adapter: string; itemsPublished: number }> }>);
 expect(history.data.some((r) => r.adapter === "postiz")).toBe(true);
 }, 60_000);

 test("GET /api/publish/scheduled returns array when Postiz reachable", async () => {
 const res = await fetch(`${h().studioBaseUrl}/api/publish/scheduled`);
 expect(res.status).toBe(200);
 const body = (await res.json()) as { ok: true; data: unknown[] };
 expect(body.ok).toBe(true);
 expect(Array.isArray(body.data)).toBe(true);
 });
});
