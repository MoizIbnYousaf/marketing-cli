// tests/e2e/real-pipeline/setup.test.ts
//
// Validates the harness itself. If this file fails, every downstream
// real-pipeline suite will also fail — this is the first stop when
// triaging E2/I1/I2/I3/I4/H3/J1/J2/J3/J4 breakage.
//
// No external API keys required. Only tests the scaffold: harness boots,
// health responds, helpers work, teardown is clean.

import { describe, test, expect, afterEach, beforeEach } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { rm as rmFs } from "node:fs/promises";
import { createHarness, type RealPipelineHarness } from "./setup";
import { probeHealthUntilReady } from "./lib/probe";
import { captureApiResponse } from "./lib/capture";
import { captureAndAssertFullShape } from "./lib/schema";
import { requireEnv } from "./lib/env";
import { replayOrCapture, goldenAvailable, goldenPathFor, resolveMode } from "./lib/replay";

// Each test creates its own harness on an ephemeral port so they can run
// in parallel without port clashes. Teardown is the responsibility of each
// test; afterEach is a safety net if a test forgets.
let currentHarness: RealPipelineHarness | null = null;

afterEach(async () => {
 if (currentHarness) {
 await currentHarness.teardown();
 currentHarness = null;
 }
});

// Pick a port per test that's unlikely to clash with the default or with
// a dev server. Harness self-test range is 32000-32009; the 31900-31999
// block is reserved for real-pipeline suites per the maintainer's coordination
// (I1 → 31900-31909, I2 → 31910-31919, I4 → 31920-31929, E2 → 31930-31939,
// H3 → 31940-31949, I3 → 31950-31999).
const nextPort = (() => {
 let n = 32000;
 return () => n++;
})();

describe("real-pipeline harness — boot + teardown", () => {
 test("createHarness spawns a real server and health returns 200", async () => {
 const h = await createHarness({ studioPort: nextPort() });
 currentHarness = h;

 const res = await fetch(`${h.studioBaseUrl}/api/health`);
 expect(res.status).toBe(200);
 const body = await res.json();
 expect(body).toHaveProperty("ok");
 });

 test("seeds all 10 brand files when skipBrandSeed is false (default)", async () => {
 const h = await createHarness({ studioPort: nextPort() });
 currentHarness = h;

 const expected = [
 "voice-profile.md", "audience.md", "positioning.md", "competitors.md",
 "landscape.md", "keyword-plan.md", "creative-kit.md", "stack.md",
 "assets.md", "learnings.md",
 ];
 for (const name of expected) {
 expect(existsSync(join(h.brandDir, name))).toBe(true);
 }
 const voice = await readFile(join(h.brandDir, "voice-profile.md"), "utf-8");
 expect(voice).toContain("Direct, plain-language");
 });

 test("skipBrandSeed leaves brand dir empty (no seed files)", async () => {
 const h = await createHarness({ studioPort: nextPort(), skipBrandSeed: true });
 currentHarness = h;

 // The server lazy-creates MKTG_BRAND_DIR via lib/brand-files.ts:268
 // when listBrandFiles() runs (e.g., during /api/health probe), so we
 // assert the contract is "no seed files" rather than "no dir at all."
 if (existsSync(h.brandDir)) {
 const { readdir } = await import("node:fs/promises");
 const entries = await readdir(h.brandDir);
 expect(entries).toEqual([]);
 }
 });

 test("teardown kills the server and removes the temp dir (idempotent)", async () => {
 const h = await createHarness({ studioPort: nextPort() });
 const tempDir = h.tempDir;
 const baseUrl = h.studioBaseUrl;

 await h.teardown();

 // After teardown: temp dir gone
 expect(existsSync(tempDir)).toBe(false);

 // Server no longer reachable
 const probe = await probeHealthUntilReady(`${baseUrl}/api/health`, { timeoutMs: 500 });
 expect(probe.ok).toBe(false);

 // Second teardown is a no-op, not a throw
 await h.teardown();

 // Don't let afterEach teardown again
 currentHarness = null;
 });
});

describe("probeHealthUntilReady", () => {
 test("returns ok=true with elapsedMs + attempts on a live server", async () => {
 const h = await createHarness({ studioPort: nextPort() });
 currentHarness = h;

 const probe = await probeHealthUntilReady(`${h.studioBaseUrl}/api/health`);
 expect(probe.ok).toBe(true);
 if (!probe.ok) return;
 expect(probe.status).toBe(200);
 expect(probe.attempts).toBeGreaterThanOrEqual(1);
 expect(probe.elapsedMs).toBeGreaterThanOrEqual(0);
 });

 test("returns ok=false with lastError on a dead port", async () => {
 const probe = await probeHealthUntilReady("http://127.0.0.1:31999/api/health", {
 timeoutMs: 500,
 intervalMs: 50,
 });
 expect(probe.ok).toBe(false);
 if (probe.ok) return;
 expect(probe.lastError.length).toBeGreaterThan(0);
 expect(probe.attempts).toBeGreaterThanOrEqual(1);
 });
});

describe("captureApiResponse + captureAndAssertFullShape", () => {
 test("captures a real studio response with full envelope", async () => {
 const h = await createHarness({ studioPort: nextPort() });
 currentHarness = h;

 const { body, captured } = await captureApiResponse<{ ok: boolean }>(
 { api: "studio", endpoint: "/api/health", method: "GET", force: false },
 () => fetch(`${h.studioBaseUrl}/api/health`),
 );

 expect(captured.api).toBe("studio");
 expect(captured.endpoint).toBe("/api/health");
 expect(captured.method).toBe("GET");
 expect(captured.status).toBe(200);
 expect(captured.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
 expect(captured.elapsedMs).toBeGreaterThanOrEqual(0);
 expect(body.ok).toBe(true);
 });

 test("captureAndAssertFullShape passes on a matching schema", () => {
 const response = {
 ok: true,
 version: "0.1.0",
 uptime: 1234,
 subscribers: { activity: 0, events: 0 },
 };
 // Should not throw.
 captureAndAssertFullShape(response, {
 ok: { type: "boolean", required: true },
 version: { type: "string", required: true },
 uptime: { type: "number", required: true },
 subscribers: {
 type: "object", required: true, fields: {
 activity: { type: "number", required: true },
 events: { type: "number", required: true },
 },
 },
 });
 });

 test("captureAndAssertFullShape flags a missing required field", () => {
 const response = { ok: true }; // missing `version`
 expect(() =>
 captureAndAssertFullShape(response, {
 ok: { type: "boolean", required: true },
 version: { type: "string", required: true },
 }),
 ).toThrow();
 });

 test("captureAndAssertFullShape flags an unexpected field", () => {
 const response = { ok: true, surprise: "boo" };
 expect(() =>
 captureAndAssertFullShape(response, {
 ok: { type: "boolean", required: true },
 }),
 ).toThrow();
 });

 test("captureAndAssertFullShape flags a wrong type", () => {
 const response = { ok: "yes" }; // string, not boolean
 expect(() =>
 captureAndAssertFullShape(response, {
 ok: { type: "boolean", required: true },
 }),
 ).toThrow();
 });
});

describe("requireEnv", () => {
 test("returns ok=true with frozen values when every key is present", () => {
 const was = { a: process.env.__VOID_TEST_A, b: process.env.__VOID_TEST_B };
 process.env.__VOID_TEST_A = "alpha";
 process.env.__VOID_TEST_B = "bravo";
 try {
 const res = requireEnv(["__VOID_TEST_A", "__VOID_TEST_B"]);
 expect(res.ok).toBe(true);
 if (!res.ok) return;
 expect(res.values.__VOID_TEST_A).toBe("alpha");
 expect(res.values.__VOID_TEST_B).toBe("bravo");
 // Object is frozen — mutation attempt silently no-ops in non-strict
 // but we still want to prove the read path works; type-level readonly
 // is the real contract.
 } finally {
 if (was.a === undefined) delete process.env.__VOID_TEST_A; else process.env.__VOID_TEST_A = was.a;
 if (was.b === undefined) delete process.env.__VOID_TEST_B; else process.env.__VOID_TEST_B = was.b;
 }
 });

 test("returns ok=false with skip=true + missing list when keys are absent", () => {
 delete process.env.__VOID_TEST_NOT_SET_1;
 delete process.env.__VOID_TEST_NOT_SET_2;
 const res = requireEnv(["__VOID_TEST_NOT_SET_1", "__VOID_TEST_NOT_SET_2"]);
 expect(res.ok).toBe(false);
 if (res.ok) return;
 expect(res.skip).toBe(true);
 expect(res.missing).toEqual(["__VOID_TEST_NOT_SET_1", "__VOID_TEST_NOT_SET_2"]);
 expect(res.reason).toContain("missing env");
 expect(res.reason).toContain(".env.test");
 });

 test("treats empty string as missing (blank POSTIZ_API_KEY= should skip, not fail mid-test)", () => {
 const was = process.env.__VOID_TEST_BLANK;
 process.env.__VOID_TEST_BLANK = "";
 try {
 const res = requireEnv(["__VOID_TEST_BLANK"]);
 expect(res.ok).toBe(false);
 if (res.ok) return;
 expect(res.missing).toEqual(["__VOID_TEST_BLANK"]);
 } finally {
 if (was === undefined) delete process.env.__VOID_TEST_BLANK;
 else process.env.__VOID_TEST_BLANK = was;
 }
 });
});

describe("replayOrCapture", () => {
 // Each test uses a unique goldenKey so runs don't clobber each other.
 const uniqKey = () => `void-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

 // Nuke any void-test/ leftovers from previous runs before AND after each
 // test, so a mid-test failure can't leak a fixture into the committed tree.
 // `fixtures/golden/void-test/` is gitignored as a belt-and-suspenders check.
 const cleanupVoidNs = async (): Promise<void> => {
 const voidDir = dirname(goldenPathFor("void-test", "x"));
 await rmFs(voidDir, { recursive: true, force: true });
 };
 beforeEach(cleanupVoidNs);
 afterEach(cleanupVoidNs);

 test("resolveMode reads HARNESS_LIVE / HARNESS_CAPTURE / default", () => {
 const was = {
 live: process.env.HARNESS_LIVE,
 capture: process.env.HARNESS_CAPTURE,
 };
 try {
 delete process.env.HARNESS_LIVE;
 delete process.env.HARNESS_CAPTURE;
 expect(resolveMode()).toBe("replay");

 process.env.HARNESS_LIVE = "1";
 expect(resolveMode()).toBe("live");

 delete process.env.HARNESS_LIVE;
 process.env.HARNESS_CAPTURE = "1";
 expect(resolveMode()).toBe("capture");

 // CAPTURE wins over LIVE when both set
 process.env.HARNESS_LIVE = "1";
 expect(resolveMode()).toBe("capture");
 } finally {
 if (was.live === undefined) delete process.env.HARNESS_LIVE; else process.env.HARNESS_LIVE = was.live;
 if (was.capture === undefined) delete process.env.HARNESS_CAPTURE; else process.env.HARNESS_CAPTURE = was.capture;
 }
 });

 test("default (replay) mode with no golden returns kind=skipped with clear reason", async () => {
 const key = uniqKey();
 const res = await replayOrCapture(
 { api: "void-test", goldenKey: key, method: "GET", endpoint: "/whatever", mode: "replay" },
 async () => { throw new Error("liveFn should NOT be called in replay mode when no golden exists"); },
 );
 expect(res.kind).toBe("skipped");
 if (res.kind !== "skipped") return;
 expect(res.reason).toContain("no golden fixture");
 expect(res.reason).toContain("HARNESS_CAPTURE=1");
 expect(res.goldenPath).toContain(key);
 });

 test("capture mode writes golden + subsequent replay reads it", async () => {
 const key = uniqKey();
 const goldenPath = goldenPathFor("void-test", key);

 // Capture from a fake live fn.
 const captureRes = await replayOrCapture<{ hello: string }>(
 { api: "void-test", goldenKey: key, method: "GET", endpoint: "/hello", mode: "capture" },
 async () => new Response(JSON.stringify({ hello: "world" }), {
 status: 200, headers: { "content-type": "application/json" },
 }),
 );
 expect(captureRes.kind).toBe("captured");
 if (captureRes.kind === "skipped") return;
 expect(captureRes.body.hello).toBe("world");
 expect(captureRes.status).toBe(200);

 // Golden should now be available.
 expect(goldenAvailable("void-test", key)).toBe(true);

 // Replay reads from disk without calling liveFn.
 const replayRes = await replayOrCapture<{ hello: string }>(
 { api: "void-test", goldenKey: key, method: "GET", endpoint: "/hello", mode: "replay" },
 async () => { throw new Error("liveFn should NOT be called during replay of a fresh golden"); },
 );
 expect(replayRes.kind).toBe("replayed");
 if (replayRes.kind === "skipped") return;
 expect(replayRes.body.hello).toBe("world");

 // Cleanup.
 await rm(goldenPath, { force: true });
 });

 test("live mode hits API but does NOT write golden", async () => {
 const key = uniqKey();
 const goldenPath = goldenPathFor("void-test", key);

 const res = await replayOrCapture<{ fresh: boolean }>(
 { api: "void-test", goldenKey: key, method: "GET", endpoint: "/fresh", mode: "live" },
 async () => new Response(JSON.stringify({ fresh: true }), {
 status: 200, headers: { "content-type": "application/json" },
 }),
 );
 expect(res.kind).toBe("live");
 if (res.kind === "skipped") return;
 expect(res.body.fresh).toBe(true);

 // Golden NOT written in live mode.
 expect(goldenAvailable("void-test", key)).toBe(false);
 });

 test("replay of a stale golden (ttl elapsed) returns kind=skipped", async () => {
 const key = uniqKey();
 const goldenPath = goldenPathFor("void-test", key);
 // Seed a golden with a capturedAt 2 hours ago and ttlMs=1 hour (stale).
 const stale = {
 api: "void-test",
 goldenKey: key,
 method: "GET",
 endpoint: "/stale",
 status: 200,
 body: { old: true },
 capturedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
 ttlMs: 60 * 60 * 1000,
 };
 await mkdir(goldenPath.substring(0, goldenPath.lastIndexOf("/")), { recursive: true });
 await writeFile(goldenPath, JSON.stringify(stale, null, 2));

 try {
 const res = await replayOrCapture(
 { api: "void-test", goldenKey: key, method: "GET", endpoint: "/stale", mode: "replay" },
 async () => { throw new Error("liveFn should NOT be called when golden is stale — skip is the correct path"); },
 );
 expect(res.kind).toBe("skipped");
 if (res.kind !== "skipped") return;
 expect(res.reason).toContain("stale");
 expect(res.reason).toContain("HARNESS_CAPTURE=1");
 } finally {
 await rm(goldenPath, { force: true });
 }
 });
});
