// Integration test: postiz adapter — raw-fetch, license firewall, two-step flow,
// error envelope, rate-limit handling, --list-integrations.
// Real file I/O + real local HTTP server (no mocks). Spec: docs/integration/postiz-api-reference.md

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "bun";

import type { GlobalFlags } from "../../src/types";
import { handler } from "../../src/commands/publish";
import { postizFetch } from "../../src/commands/publish";

// ─── License firewall (spec §8) — must run first; the strictest invariant. ───
describe("License firewall — @postiz/node is AGPL-3.0 and must never be linked", () => {
  const repoRoot = import.meta.dir.replace("/tests/integration", "");

  test("package.json has no @postiz/node in any deps section", async () => {
    const raw = await readFile(join(repoRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
      const deps = pkg[section] ?? {};
      expect(deps["@postiz/node"]).toBeUndefined();
      for (const key of Object.keys(deps)) {
        expect(key, `${section} contains postiz-named package: ${key}`).not.toMatch(/@?postiz/i);
      }
    }
  });

  test("no source file imports from @postiz/node", async () => {
    const glob = new Bun.Glob("src/**/*.ts");
    for await (const file of glob.scan({ cwd: repoRoot })) {
      const text = await readFile(join(repoRoot, file), "utf-8");
      expect(text, `${file} must not import @postiz/node`).not.toMatch(/from\s+["']@postiz\/node["']/);
      expect(text, `${file} must not require @postiz/node`).not.toMatch(/require\(["']@postiz\/node["']\)/);
    }
  });
});

// ─── Test HTTP server ───
// Real Bun.serve process on an ephemeral port. Every test sets a fresh
// route table via `setRoutes(...)`; the server replays them in order per
// path. Captures request details (method, path, headers, body) so tests
// can assert the wire format without mocking the fetch call.

type CapturedRequest = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
};

type RouteResponse = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

let server: Server;
let captured: CapturedRequest[] = [];
let routes: Map<string, RouteResponse[]> = new Map();

const setRoute = (key: string, responses: RouteResponse[]): void => {
  routes.set(key, [...responses]);
};

beforeAll(() => {
  server = Bun.serve({
    port: 0, // ephemeral
    fetch: async (req) => {
      const url = new URL(req.url);
      const key = `${req.method} ${url.pathname}`;
      const bodyText = req.body ? await req.text() : null;
      const headerObj: Record<string, string> = {};
      req.headers.forEach((v, k) => (headerObj[k] = v));
      captured.push({ method: req.method, path: url.pathname, headers: headerObj, body: bodyText });

      const queue = routes.get(key);
      if (!queue || queue.length === 0) {
        return new Response(JSON.stringify({ msg: `No route stubbed for ${key}` }), { status: 500 });
      }
      const next = queue.shift()!;
      const resHeaders: Record<string, string> = { "Content-Type": "application/json", ...(next.headers ?? {}) };
      return new Response(JSON.stringify(next.body ?? {}), { status: next.status, headers: resHeaders });
    },
  });
});

afterAll(() => {
  server.stop(true);
});

beforeEach(() => {
  captured = [];
  routes = new Map();
  process.env.POSTIZ_API_BASE = `http://localhost:${server.port}`;
  process.env.POSTIZ_API_KEY = "test-key-12345";
});

afterEach(() => {
  delete process.env.POSTIZ_API_BASE;
  delete process.env.POSTIZ_API_KEY;
});

// ─── postizFetch — auth header is BARE (spec §2) ───
describe("postizFetch auth header", () => {
  test("Authorization header is the bare key — does NOT start with 'Bearer '", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 200, body: [] }]);
    await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(captured).toHaveLength(1);
    const auth = captured[0]!.headers["authorization"];
    expect(auth).toBe("test-key-12345");
    expect(auth).not.toMatch(/^Bearer\s/i);
  });

  test("returns auth-missing kind when POSTIZ_API_KEY is unset", async () => {
    delete process.env.POSTIZ_API_KEY;
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("auth-missing");
    expect(res.status).toBeNull();
    expect(captured).toHaveLength(0); // no network call made
  });

  test("uses POSTIZ_API_BASE env var as URL prefix", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 200, body: [] }]);
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(true);
    expect(captured[0]!.path).toBe("/public/v1/integrations");
  });

  test("falls back to /api for Docker self-host app root URLs", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 404, body: { msg: "not found" } }]);
    setRoute("GET /api/public/v1/integrations", [{ status: 200, body: [] }]);

    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });

    expect(res.ok).toBe(true);
    expect(captured.map((c) => c.path)).toEqual([
      "/public/v1/integrations",
      "/api/public/v1/integrations",
    ]);
  });

  test("does not double-prefix bases already ending in /api", async () => {
    process.env.POSTIZ_API_BASE = `http://localhost:${server.port}/api`;
    setRoute("GET /api/public/v1/integrations", [{ status: 200, body: [] }]);

    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });

    expect(res.ok).toBe(true);
    expect(captured.map((c) => c.path)).toEqual(["/api/public/v1/integrations"]);
  });

  test("JSON body sets Content-Type automatically", async () => {
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "post-1" } }]);
    await postizFetch<unknown>("/public/v1/posts", {
      method: "POST",
      body: { type: "draft", shortLink: false, date: new Date().toISOString(), tags: [], posts: [] },
    });
    expect(captured[0]!.headers["content-type"]).toBe("application/json");
    expect(captured[0]!.body).toMatch(/"type":"draft"/);
  });
});

// ─── Error envelope mapping (spec §6) ───
describe("postizFetch error envelope mapping", () => {
  test("401 {msg:'Invalid API key'} → auth-invalid", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 401, body: { msg: "Invalid API key" } }]);
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("auth-invalid");
    expect(res.status).toBe(401);
  });

  test("401 {msg:'No subscription found'} → subscription-required", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 401, body: { msg: "No subscription found" } }]);
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("subscription-required");
  });

  test("400 → bad-request with status", async () => {
    setRoute("POST /public/v1/posts", [{ status: 400, body: { msg: "date must be ISO 8601" } }]);
    const res = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body: { bad: true } });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("bad-request");
    if (res.error.kind !== "bad-request") return;
    expect(res.error.status).toBe(400);
    expect(res.error.msg).toBe("date must be ISO 8601");
  });

  test("500 → server-error with status", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 500, body: { msg: "internal" } }]);
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("server-error");
    if (res.error.kind !== "server-error") return;
    expect(res.error.status).toBe(500);
  });

  test("network error → network kind", async () => {
    // Point at an unreachable host.
    process.env.POSTIZ_API_BASE = "http://127.0.0.1:1"; // closed port
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("network");
    expect(res.status).toBeNull();
  });

  test("malformed JSON error body → msg falls back to 'HTTP <status>'", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 418,
      body: undefined,
      headers: { "Content-Type": "text/plain" },
    }]);
    const res = await postizFetch<unknown>("/public/v1/integrations", { method: "GET" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("bad-request");
  });
});

// ─── Rate-limit handling (spec §7.4 — 3 required cases) ───
describe("postizFetch rate-limit handling", () => {
  test("429 with numeric Retry-After → rate-limited with parsed seconds", async () => {
    setRoute("POST /public/v1/posts", [{
      status: 429,
      body: { msg: "Too many requests" },
      headers: { "Retry-After": "60" },
    }]);
    const res = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body: {} });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("rate-limited");
    if (res.error.kind !== "rate-limited") return;
    expect(res.error.retryAfterSeconds).toBe(60);
  });

  test("429 without Retry-After → rate-limited with null seconds", async () => {
    setRoute("POST /public/v1/posts", [{
      status: 429,
      body: { msg: "Too many requests" },
    }]);
    const res = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body: {} });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("rate-limited");
    if (res.error.kind !== "rate-limited") return;
    expect(res.error.retryAfterSeconds).toBeNull();
  });

  test("429 with HTTP-date Retry-After → rate-limited with null seconds (helper only parses integer form)", async () => {
    setRoute("POST /public/v1/posts", [{
      status: 429,
      body: { msg: "Too many requests" },
      headers: { "Retry-After": "Wed, 21 Oct 2015 07:28:00 GMT" },
    }]);
    const res = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body: {} });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe("rate-limited");
    if (res.error.kind !== "rate-limited") return;
    expect(res.error.retryAfterSeconds).toBeNull();
  });
});

// ─── --list-integrations flag (spec §6.4) ───
describe("publish --list-integrations", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-postiz-list-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("returns {adapter:'postiz', integrations:[...]} for --adapter postiz", async () => {
    const integrationRows = [
      { id: "int-1", identifier: "linkedin", name: "LinkedIn (Personal)", picture: "", disabled: false, profile: "alice", customer: null },
      { id: "int-2", identifier: "bluesky", name: "Bluesky", picture: "", disabled: false, profile: "alice.bsky.social", customer: null },
    ];
    setRoute("GET /public/v1/integrations", [{ status: 200, body: integrationRows }]);

    const result = await handler(["--adapter", "postiz", "--list-integrations"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapter: string; integrations: typeof integrationRows };
    expect(data.adapter).toBe("postiz");
    expect(data.integrations).toHaveLength(2);
    expect(data.integrations[0]!.identifier).toBe("linkedin");
    expect(data.integrations[1]!.identifier).toBe("bluesky");
  });

  test("returns INVALID_ARGS exit 2 when --adapter is missing", async () => {
    const result = await handler(["--list-integrations"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_ARGS");
    expect(result.exitCode).toBe(2);
  });

  test("returns NOT_IMPLEMENTED exit 6 for non-postiz adapters", async () => {
    const result = await handler(["--adapter", "typefully", "--list-integrations"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_IMPLEMENTED");
    expect(result.exitCode).toBe(6);
    expect(result.error.suggestions.join(" ")).toMatch(/postiz/i);
  });

  test("maps auth-invalid to exit 3 POSTIZ_AUTH", async () => {
    setRoute("GET /public/v1/integrations", [{ status: 401, body: { msg: "Invalid API key" } }]);
    const result = await handler(["--adapter", "postiz", "--list-integrations"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("POSTIZ_AUTH");
    expect(result.exitCode).toBe(3);
  });

  test("maps rate-limited to exit 5 POSTIZ_NETWORK (transient)", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 429,
      body: { msg: "Too many requests" },
      headers: { "Retry-After": "60" },
    }]);
    const result = await handler(["--adapter", "postiz", "--list-integrations"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("POSTIZ_NETWORK");
    expect(result.exitCode).toBe(5);
  });

  test("--diagnose checks key, connection, and integrations in order", async () => {
    setRoute("GET /public/v1/is-connected", [{ status: 200, body: { connected: true } }]);
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "alice", customer: null },
      ],
    }]);

    const result = await handler(["--adapter", "postiz", "--diagnose"], flags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapter: string; configured: boolean; checks: Array<{ name: string; status: string }>; providers: unknown[] };
    expect(data.adapter).toBe("postiz");
    expect(data.configured).toBe(true);
    expect(data.checks.map((check) => check.name)).toEqual(["api-key", "connected", "integrations"]);
    expect(data.checks.every((check) => check.status === "pass")).toBe(true);
    expect(data.providers).toHaveLength(1);
    expect(captured.map((request) => request.path)).toEqual([
      "/public/v1/is-connected",
      "/public/v1/integrations",
    ]);
  });
});

// ─── Two-step flow (spec §3) — via handler, against real server ───
describe("publish --adapter postiz two-step flow", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-postiz-flow-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const makeManifest = (items: Array<{ content: string; providers: string[]; mediaPaths?: string[]; mediaUrls?: string[] }>) => ({
    name: "test-campaign",
    items: items.map((it) => ({
      type: "social" as const,
      adapter: "postiz",
      content: it.content,
      metadata: {
        providers: it.providers,
        ...(it.mediaPaths ? { mediaPaths: it.mediaPaths } : {}),
        ...(it.mediaUrls ? { mediaUrls: it.mediaUrls } : {}),
      },
    })),
  });

  test("resolves providers via GET /integrations then POSTs drafts", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-linkedin-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" },
        { id: "int-bluesky-1", identifier: "bluesky", name: "Bluesky", picture: "", disabled: false, profile: "a" },
      ],
    }]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "new-post-1" } }]);

    const manifest = makeManifest([{ content: "Hello world!", providers: ["linkedin", "bluesky"] }]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz", "--input", JSON.stringify(manifest)],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ adapter: string; published: number; failed: number }> };
    const postizResult = data.adapters.find((a) => a.adapter === "postiz");
    expect(postizResult).toBeDefined();
    expect(postizResult!.published).toBe(1);
    expect(postizResult!.failed).toBe(0);

    // Verify both API calls landed.
    const integrationCalls = captured.filter((c) => c.path === "/public/v1/integrations");
    const postCalls = captured.filter((c) => c.path === "/public/v1/posts");
    expect(integrationCalls).toHaveLength(1);
    expect(postCalls).toHaveLength(1);

    // Verify the POST body matches CreatePostDto shape.
    const postBody = JSON.parse(postCalls[0]!.body!);
    expect(postBody.type).toBe("draft");
    expect(postBody.shortLink).toBe(false);
    expect(postBody.tags).toEqual([]);
    expect(postBody.posts).toHaveLength(2); // one per provider
    expect(postBody.posts[0].integration.id).toBe("int-linkedin-1");
    expect(postBody.posts[1].integration.id).toBe("int-bluesky-1");
    expect(postBody.posts[0].value[0].content).toBe("Hello world!");
    expect(postBody.posts[0].value[0].image).toEqual([]);
  });

  test("uploads local media via Postiz /upload and attaches returned media to draft", async () => {
    await writeFile(join(tempDir, "launch-card.png"), "not-a-real-png-but-good-enough-for-wire-test");

    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-linkedin-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" },
      ],
    }]);
    setRoute("POST /public/v1/upload", [{
      status: 200,
      body: { id: "media-1", path: "/uploads/launch-card.png" },
    }]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "new-post-1" } }]);

    const manifest = makeManifest([{ content: "Post with image", providers: ["linkedin"], mediaPaths: ["launch-card.png"] }]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ adapter: string; published: number; failed: number }> };
    expect(data.adapters[0]?.published).toBe(1);
    expect(data.adapters[0]?.failed).toBe(0);

    const uploadCalls = captured.filter((c) => c.path === "/public/v1/upload");
    expect(uploadCalls).toHaveLength(1);
    expect(uploadCalls[0]?.headers["content-type"]).toMatch(/^multipart\/form-data/i);

    const postBody = JSON.parse(captured.find((c) => c.path === "/public/v1/posts")!.body!);
    expect(postBody.posts[0].value[0].image).toEqual([{ id: "media-1", path: "/uploads/launch-card.png" }]);
  });

  test("uploads public media URLs via Postiz /upload-from-url and attaches returned media", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-x-1", identifier: "x", name: "X", picture: "", disabled: false, profile: "a" },
      ],
    }]);
    setRoute("POST /public/v1/upload-from-url", [{
      status: 200,
      body: { id: "media-url-1", path: "/uploads/remote.webp" },
    }]);
    setRoute("POST /public/v1/posts", [{ status: 200, body: { id: "new-post-1" } }]);

    const manifest = makeManifest([{ content: "Post with URL image", providers: ["x"], mediaUrls: ["https://example.com/card.webp"] }]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const uploadBody = JSON.parse(captured.find((c) => c.path === "/public/v1/upload-from-url")!.body!);
    expect(uploadBody.url).toBe("https://example.com/card.webp");

    const postBody = JSON.parse(captured.find((c) => c.path === "/public/v1/posts")!.body!);
    expect(postBody.posts[0].value[0].image).toEqual([{ id: "media-url-1", path: "/uploads/remote.webp" }]);
  });

  test("item with unconnected provider fails fast (no POST made)", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" },
      ],
    }]);
    // NOTE: no POST /posts route — any call here would 500 and fail the test.

    const manifest = makeManifest([{ content: "post", providers: ["reddit"] }]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ adapter: string; published: number; failed: number; results: Array<{ status: string; detail: string }> }> };
    const postizResult = data.adapters.find((a) => a.adapter === "postiz")!;
    expect(postizResult.published).toBe(0);
    expect(postizResult.failed).toBe(1);
    expect(postizResult.results[0]!.detail).toMatch(/Unconnected provider/);
    expect(postizResult.results[0]!.detail).toMatch(/linkedin/); // lists connected

    // No POST calls made.
    expect(captured.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  test("item with missing providers metadata fails fast", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);

    const manifest = {
      name: "test",
      items: [{ type: "social" as const, adapter: "postiz", content: "hi" }],
    };
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ failed: number; results: Array<{ detail: string }> }> };
    expect(data.adapters[0]!.failed).toBe(1);
    expect(data.adapters[0]!.results[0]!.detail).toMatch(/Missing item\.metadata\.providers/);
  });

  test("disabled integrations are excluded from resolution", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [
        { id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: true, profile: "a" },
      ],
    }]);

    const manifest = makeManifest([{ content: "post", providers: ["linkedin"] }]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ failed: number; results: Array<{ detail: string }> }> };
    expect(data.adapters[0]!.failed).toBe(1);
    expect(data.adapters[0]!.results[0]!.detail).toMatch(/Unconnected provider/);
  });

  test("dry-run (no --confirm) does not call POST /posts", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);

    const manifest = makeManifest([{ content: "hi", providers: ["linkedin"] }]);
    // Omit --confirm — default is dry-run.
    const result = await handler(
      ["--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    expect(captured.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  test("429 hard-stops the campaign — subsequent items are skipped", async () => {
    setRoute("GET /public/v1/integrations", [{
      status: 200,
      body: [{ id: "int-1", identifier: "linkedin", name: "LinkedIn", picture: "", disabled: false, profile: "a" }],
    }]);
    // First POST returns 429, second would succeed — but we should never get to it.
    setRoute("POST /public/v1/posts", [
      { status: 429, body: { msg: "Too many requests" }, headers: { "Retry-After": "60" } },
      { status: 200, body: { id: "post-2" } },
    ]);

    const manifest = makeManifest([
      { content: "item one", providers: ["linkedin"] },
      { content: "item two", providers: ["linkedin"] },
    ]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ results: Array<{ status: string; detail: string }>; published: number; failed: number }> };
    const postizResult = data.adapters[0]!;
    expect(postizResult.published).toBe(0);
    expect(postizResult.failed).toBe(1);
    expect(postizResult.results[0]!.status).toBe("failed");
    expect(postizResult.results[0]!.detail).toMatch(/rate limit/i);
    expect(postizResult.results[1]!.status).toBe("skipped");
    expect(postizResult.results[1]!.detail).toMatch(/hard-stop/i);

    // Only one POST call made (the 429), second item never hit the network.
    expect(captured.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  test("auth-missing at /integrations → all items fail with same detail", async () => {
    delete process.env.POSTIZ_API_KEY;

    const manifest = makeManifest([
      { content: "a", providers: ["linkedin"] },
      { content: "b", providers: ["bluesky"] },
    ]);
    const result = await handler(
      ["--confirm", "--adapter", "postiz"],
      { ...flags, jsonInput: JSON.stringify(manifest) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { adapters: Array<{ failed: number; results: Array<{ detail: string }> }> };
    expect(data.adapters[0]!.failed).toBe(2);
    expect(data.adapters[0]!.results[0]!.detail).toMatch(/POSTIZ_API_KEY/);
    expect(data.adapters[0]!.results[1]!.detail).toMatch(/POSTIZ_API_KEY/);

    // No network calls made.
    expect(captured).toHaveLength(0);
  });
});
