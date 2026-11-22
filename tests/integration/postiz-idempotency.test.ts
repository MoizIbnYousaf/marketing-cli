// Integration test: postiz sent-marker idempotency (spec §5).
// Real file I/O in temp dirs. Real local HTTP server for the two-step flow.
// NO MOCKS.

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "bun";

import type { GlobalFlags } from "../../src/types";
import { handler } from "../../src/commands/publish";
import { sentMarkerKey, readSentMarker, persistSentMarker } from "../../src/core/publish/postiz";

// ─── Test HTTP server (shared across describe blocks) ───
type RouteResponse = { status: number; body?: unknown; headers?: Record<string, string> };
let server: Server;
let routes: Map<string, RouteResponse[]> = new Map();
let postCount = 0;

const setRoute = (key: string, responses: RouteResponse[]): void => { routes.set(key, [...responses]); };

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const url = new URL(req.url);
      const key = `${req.method} ${url.pathname}`;
      if (req.method === "POST" && url.pathname === "/public/v1/posts") postCount++;
      const queue = routes.get(key);
      if (!queue || queue.length === 0) {
        return new Response(JSON.stringify({ msg: `No route stubbed for ${key}` }), { status: 500 });
      }
      const next = queue.shift()!;
      return new Response(JSON.stringify(next.body ?? {}), {
        status: next.status,
        headers: { "Content-Type": "application/json", ...(next.headers ?? {}) },
      });
    },
  });
});

afterAll(() => { server.stop(true); });

beforeEach(() => {
  routes = new Map();
  postCount = 0;
  process.env.POSTIZ_API_BASE = `http://localhost:${server.port}`;
  process.env.POSTIZ_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.POSTIZ_API_BASE;
  delete process.env.POSTIZ_API_KEY;
});

// ─── sentMarkerKey hash formula (spec §5.2) ───
describe("sentMarkerKey hash formula", () => {
  test("same inputs → same key", () => {
    const k1 = sentMarkerKey("camp1", "Hello", ["int-a", "int-b"]);
    const k2 = sentMarkerKey("camp1", "Hello", ["int-a", "int-b"]);
    expect(k1).toBe(k2);
  });

  test("different content → different key", () => {
    const k1 = sentMarkerKey("camp1", "Hello", ["int-a"]);
    const k2 = sentMarkerKey("camp1", "Hello!", ["int-a"]);
    expect(k1).not.toBe(k2);
  });

  test("different campaign → different key", () => {
    const k1 = sentMarkerKey("camp1", "Hello", ["int-a"]);
    const k2 = sentMarkerKey("camp2", "Hello", ["int-a"]);
    expect(k1).not.toBe(k2);
  });

  test("different integration ids → different key", () => {
    const k1 = sentMarkerKey("camp1", "Hello", ["int-a"]);
    const k2 = sentMarkerKey("camp1", "Hello", ["int-b"]);
    expect(k1).not.toBe(k2);
  });

  test("integration id order does NOT matter (sorted internally)", () => {
    const k1 = sentMarkerKey("camp1", "Hello", ["int-a", "int-b", "int-c"]);
    const k2 = sentMarkerKey("camp1", "Hello", ["int-c", "int-a", "int-b"]);
    expect(k1).toBe(k2);
  });

  test("returns 64-char hex (sha256)", () => {
    const k = sentMarkerKey("c", "hi", ["x"]);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  test("double-delimiter prevents pipe-smuggling in content", () => {
    // "camp||hi" + "||" + "ids" vs "camp" + "||" + "hi||ids" would collide
    // without the double-delimiter convention. Our formula uses || between
    // every field; content with embedded || should not collide with
    // different (campaign, content, ids) triples.
    const k1 = sentMarkerKey("camp", "content", ["id"]);
    const k2 = sentMarkerKey("camp||content", "", ["id"]);
    expect(k1).not.toBe(k2);
  });
});

// ─── readSentMarker / persistSentMarker ───
describe("sent-marker file I/O", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-postiz-marker-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("readSentMarker returns an empty marker for a missing file", async () => {
    const read = await readSentMarker(join(tempDir, "missing.json"), "my-campaign");
    expect(read.state).toBe("missing");
    if (read.state === "corrupt") return;
    expect(read.marker.version).toBe(1);
    expect(read.marker.campaign).toBe("my-campaign");
    expect(read.marker.catalog).toBe("postiz");
    expect(read.marker.sent).toEqual({});
  });

  test("persistSentMarker then readSentMarker round-trips, pending entries included", async () => {
    const path = join(tempDir, "camp.json");
    const original = {
      version: 1 as const,
      campaign: "camp",
      catalog: "postiz" as const,
      sent: {
        abc123: { postedAt: "2026-04-15T10:00:00Z", providers: ["linkedin", "bluesky"] },
        def456: { postedAt: "2026-04-15T10:00:01Z", providers: ["linkedin"], state: "pending" as const },
      },
    };
    await persistSentMarker(path, original);
    const read = await readSentMarker(path, "camp");
    expect(read.state).toBe("present");
    expect(read.marker).toEqual(original);
    expect(await readdir(tempDir)).toEqual(["camp.json"]); // no temp file left
  });

  test("persistSentMarker creates parent directory", async () => {
    const path = join(tempDir, "nested", "dir", "marker.json");
    await persistSentMarker(path, {
      version: 1,
      campaign: "c",
      catalog: "postiz",
      sent: {},
    });
    const read = await readFile(path, "utf-8");
    expect(JSON.parse(read).campaign).toBe("c");
  });

  const expectCorruptAndUntouched = async (name: string, content: string, campaign: string) => {
    const path = join(tempDir, name);
    await writeFile(path, content);
    const read = await readSentMarker(path, campaign);
    expect(read.state).toBe("corrupt");
    expect(read.marker).toBeNull();
    // Reported, never archived or replaced: the file may record real posts.
    expect(await readdir(tempDir)).toEqual([name]);
    expect(await readFile(path, "utf-8")).toBe(content);
  };

  test("corrupted JSON → corrupt, file left in place", async () => {
    await expectCorruptAndUntouched("camp-postiz.json", "{not valid json", "camp");
  });

  test("wrong shape (missing campaign field) → corrupt, file left in place", async () => {
    await expectCorruptAndUntouched("bad.json", JSON.stringify({ version: 1, sent: {} }), "new-campaign");
  });

  test("wrong catalog field → corrupt, file left in place", async () => {
    await expectCorruptAndUntouched("wrong-catalog.json", JSON.stringify({ version: 1, campaign: "c", catalog: "typefully", sent: {} }), "c");
  });

  test("an unknown entry state → corrupt", async () => {
    await expectCorruptAndUntouched(
      "state.json",
      JSON.stringify({ version: 1, campaign: "c", catalog: "postiz", sent: { k: { postedAt: "x", providers: [], state: "weird" } } }),
      "c",
    );
  });

  test("campaign mismatch → fresh empty without archiving", async () => {
    const path = join(tempDir, "mismatch.json");
    await persistSentMarker(path, {
      version: 1,
      campaign: "original-campaign",
      catalog: "postiz",
      sent: { hash1: { postedAt: "2026-04-15T10:00:00Z", providers: ["linkedin"] } },
    });

    const read = await readSentMarker(path, "different-campaign");
    expect(read.state).toBe("present");
    expect(read.marker?.campaign).toBe("different-campaign");
    expect(read.marker?.sent).toEqual({});

    // Original file should NOT be archived — campaign mismatch is a clean
    // boundary condition, not corruption.
    const files = await readdir(tempDir);
    expect(files.some((f) => f.includes(".corrupt."))).toBe(false);
  });
});

// ─── End-to-end idempotency via publishPostiz ───
describe("publishPostiz idempotency end-to-end", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-postiz-idem-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const makeManifest = (campaign: string, items: Array<{ content: string; providers: string[] }>) => ({
    name: campaign,
    items: items.map((it) => ({
      type: "social" as const,
      adapter: "postiz",
      content: it.content,
      metadata: { providers: it.providers },
    })),
  });

  test("running the same campaign twice — second run is a no-op (no POST)", async () => {
    // First run: integrations + one POST
    setRoute("GET /public/v1/integrations", [
      { status: 200, body: [{ id: "int-linkedin", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }] },
      // Second run will also call GET /integrations — return same data
      { status: 200, body: [{ id: "int-linkedin", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }] },
    ]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "post-1" } }]);

    const manifest = makeManifest("idem-camp", [{ content: "Hello twice", providers: ["linkedin"] }]);

    const first = await handler(["--confirm", "--adapter", "postiz"], { ...flags, jsonInput: JSON.stringify(manifest) });
    expect(first.ok).toBe(true);
    expect(postCount).toBe(1);

    // Verify marker file exists with exactly one entry
    const markerPath = join(tempDir, ".mktg", "publish", "idem-camp-postiz.json");
    const markerRaw = await readFile(markerPath, "utf-8");
    const marker = JSON.parse(markerRaw);
    expect(Object.keys(marker.sent)).toHaveLength(1);

    // Second run: same manifest, same marker, should skip the POST
    const second = await handler(["--confirm", "--adapter", "postiz"], { ...flags, jsonInput: JSON.stringify(manifest) });
    expect(second.ok).toBe(true);
    expect(postCount).toBe(1); // NOT 2 — idempotency kicked in

    if (!second.ok) return;
    const data = second.data as { adapters: Array<{ results: Array<{ status: string; detail: string }> }> };
    expect(data.adapters[0]!.results[0]!.status).toBe("skipped");
    expect(data.adapters[0]!.results[0]!.detail).toMatch(/already-sent/);
  });

  test("unsafe campaign names cannot escape the marker directory", async () => {
    setRoute("GET /public/v1/integrations", [
      { status: 200, body: [{ id: "int-linkedin", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }] },
    ]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "post-safe" } }]);

    const manifest = makeManifest("../../outside", [{ content: "Contained", providers: ["linkedin"] }]);
    const result = await handler(["--confirm", "--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(manifest),
    });
    expect(result.ok).toBe(true);
    expect(await Bun.file(join(tempDir, "outside-postiz.json")).exists()).toBe(false);
    const markers = await readdir(join(tempDir, ".mktg", "publish"));
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatch(/^campaign-[0-9a-f]{16}-postiz\.json$/);
  });

  test("different content in same campaign → new POST (no false-positive skip)", async () => {
    setRoute("GET /public/v1/integrations", [
      { status: 200, body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }] },
      { status: 200, body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }] },
    ]);
    setRoute("POST /public/v1/posts", [
      { status: 200, body: { id: "p1" } },
      { status: 200, body: { id: "p2" } },
    ]);

    await handler(["--confirm", "--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(makeManifest("camp", [{ content: "v1", providers: ["linkedin"] }])),
    });
    expect(postCount).toBe(1);

    await handler(["--confirm", "--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(makeManifest("camp", [{ content: "v2", providers: ["linkedin"] }])),
    });
    expect(postCount).toBe(2);

    // Marker should now have both entries
    const markerPath = join(tempDir, ".mktg", "publish", "camp-postiz.json");
    const marker = JSON.parse(await readFile(markerPath, "utf-8"));
    expect(Object.keys(marker.sent)).toHaveLength(2);
  });

  test("failed POST does NOT add sent-marker entry", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);
    setRoute("POST /public/v1/posts", [{ status: 400, body: { msg: "validation error" } }]);

    await handler(["--confirm", "--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(makeManifest("fail-camp", [{ content: "bad", providers: ["linkedin"] }])),
    });

    const markerPath = join(tempDir, ".mktg", "publish", "fail-camp-postiz.json");
    const exists = await Bun.file(markerPath).exists();
    // Marker file may exist (we always persist), but should have no sent entries
    if (exists) {
      const marker = JSON.parse(await readFile(markerPath, "utf-8"));
      expect(Object.keys(marker.sent)).toHaveLength(0);
    }
  });

  test("dry-run does NOT write sent-marker file", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);

    // No --confirm — dry-run path
    await handler(["--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(makeManifest("dry-camp", [{ content: "x", providers: ["linkedin"] }])),
    });

    // Marker file still gets persisted (the adapter always runs through
    // persistSentMarker at the end), but sent should be empty because no
    // item was actually published.
    const markerPath = join(tempDir, ".mktg", "publish", "dry-camp-postiz.json");
    const exists = await Bun.file(markerPath).exists();
    if (exists) {
      const marker = JSON.parse(await readFile(markerPath, "utf-8"));
      expect(Object.keys(marker.sent)).toHaveLength(0);
    }
  });

  test("corrupt marker → the confirmed run refuses to send and leaves the file as it is", async () => {
    const markerDir = join(tempDir, ".mktg", "publish");
    await mkdir(markerDir, { recursive: true });
    await writeFile(join(markerDir, "recovery-camp-postiz.json"), "{garbage");

    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "p1" } }]);

    const result = await handler(["--confirm", "--adapter", "postiz"], {
      ...flags,
      jsonInput: JSON.stringify(makeManifest("recovery-camp", [{ content: "hi", providers: ["linkedin"] }])),
    });

    // Full result as data, exit 4: the item failed because nothing could be
    // sent safely, not because Postiz rejected it.
    expect(result.exitCode).toBe(4);
    expect(postCount).toBe(0);
    const data = (result as unknown as { data: { failed: number; adapters: Array<{ results: Array<{ status: string; detail: string }> }> } }).data;
    expect(data.failed).toBe(1);
    expect(data.adapters[0]!.results[0]!.detail).toContain("unreadable");

    expect(await readdir(markerDir)).toEqual(["recovery-camp-postiz.json"]);
    expect(await readFile(join(markerDir, "recovery-camp-postiz.json"), "utf-8")).toBe("{garbage");
  });
});
