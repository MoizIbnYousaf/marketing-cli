// mktg — Typefully adapter (API v2) wire-format tests.
//
// Real HTTP against a real Bun.serve on an ephemeral port, reached through
// TYPEFULLY_API_BASE. No fetch replacement: the adapter makes genuine
// requests and the server records exactly what arrived.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Server } from "bun";
import { buildTypefullyDraft, publishTypefully } from "../../src/core/publish/typefully";
import type { PublishItem } from "../../src/core/publish/types";

type Captured = { method: string; path: string; headers: Record<string, string>; body: unknown };
type Reply = { status: number; body?: unknown };

let server: Server;
let captured: Captured[] = [];
let replies: Map<string, Reply> = new Map();
const saved = { ...process.env };

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const url = new URL(req.url);
      const text = req.body ? await req.text() : "";
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => { headers[key] = value; });
      captured.push({ method: req.method, path: url.pathname, headers, body: text ? JSON.parse(text) : null });
      const reply = replies.get(`${req.method} ${url.pathname}`) ?? { status: 404, body: { error: "no route" } };
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
});

afterAll(() => {
  server.stop(true);
});

beforeEach(() => {
  captured = [];
  replies = new Map();
  process.env.TYPEFULLY_API_BASE = `http://127.0.0.1:${server.port}/v2`;
  process.env.TYPEFULLY_API_KEY = "test-key-not-real";
  delete process.env.TYPEFULLY_SOCIAL_SET_ID;
});

afterEach(() => {
  for (const key of ["TYPEFULLY_API_BASE", "TYPEFULLY_API_KEY", "TYPEFULLY_SOCIAL_SET_ID"]) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const social = (content: string, metadata?: PublishItem["metadata"]): PublishItem => ({
  type: "social",
  adapter: "typefully",
  content,
  ...(metadata ? { metadata } : {}),
});

describe("buildTypefullyDraft", () => {
  test("defaults to X and wraps content in the v2 platforms shape", () => {
    expect(buildTypefullyDraft(social("hello"))).toEqual({
      platforms: { x: { enabled: true, posts: [{ text: "hello" }] } },
    });
  });

  test("splits a thread on four newlines and targets every requested platform", () => {
    const draft = buildTypefullyDraft(
      social("first\n\n\n\nsecond", { platforms: ["x", "linkedin"], publish_at: "next-free-slot" }),
    );
    expect(draft).toEqual({
      platforms: {
        x: { enabled: true, posts: [{ text: "first" }, { text: "second" }] },
        linkedin: { enabled: true, posts: [{ text: "first" }, { text: "second" }] },
      },
      publish_at: "next-free-slot",
    });
  });
});

describe("publishTypefully (v2)", () => {
  test("posts to the social set from the environment with bearer auth", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";
    replies.set("POST /v2/social-sets/12345/drafts", { status: 201, body: { id: "d1" } });

    const result = await publishTypefully([social("ship it")], true, false);

    expect(result.published).toBe(0); // a plain draft is staged, not published
    expect(result.drafts).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0]?.status).toBe("draft-external");
    expect(captured).toHaveLength(1);
    expect(captured[0]?.headers.authorization).toBe("Bearer test-key-not-real");
    expect(captured[0]?.headers["x-api-key"]).toBeUndefined();
    expect(captured[0]?.body).toEqual({ platforms: { x: { enabled: true, posts: [{ text: "ship it" }] } } });
  });

  test("looks up the social set when the account has exactly one", async () => {
    replies.set("GET /v2/social-sets", { status: 200, body: { results: [{ id: 777 }] } });
    replies.set("POST /v2/social-sets/777/drafts", { status: 200, body: { id: "d2" } });

    const result = await publishTypefully([social("auto")], true, false);

    expect(result.published).toBe(0); // a plain draft is staged, not published
    expect(result.drafts).toBe(1);
    expect(captured.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /v2/social-sets",
      "POST /v2/social-sets/777/drafts",
    ]);
  });

  test("refuses to guess between several social sets", async () => {
    replies.set("GET /v2/social-sets", { status: 200, body: { results: [{ id: 1 }, { id: 2 }] } });

    const result = await publishTypefully([social("which account?")], true, false);

    expect(result.published).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("TYPEFULLY_SOCIAL_SET_ID");
    expect(captured.some((c) => c.method === "POST")).toBe(false);
  });

  test("item metadata overrides the environment social set", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";
    replies.set("POST /v2/social-sets/999/drafts", { status: 201, body: { id: "d9", status: "draft" } });

    const result = await publishTypefully([social("override", { social_set_id: "999" })], true, false);

    expect(result.published).toBe(0); // a plain draft is staged, not published
    expect(result.drafts).toBe(1);
    expect(captured[0]?.path).toBe("/v2/social-sets/999/drafts");
  });

  test("rejects a social set id that could change the request path", async () => {
    const result = await publishTypefully([social("x", { social_set_id: "1/../../me" })], true, false);

    expect(result.failed).toBe(1);
    expect(captured).toHaveLength(0);
  });

  test("reports the HTTP status and response body on failure", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";
    replies.set("POST /v2/social-sets/12345/drafts", { status: 401, body: { detail: "Invalid API key" } });

    const result = await publishTypefully([social("nope")], true, false);

    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("HTTP 401");
    expect(result.errors[0]).toContain("Invalid API key");
  });

  test("dry run makes no request", async () => {
    const result = await publishTypefully([social("preview only")], false, false);

    expect(result.results[0]?.status).toBe("skipped");
    expect(captured).toHaveLength(0);
  });
  test("a scheduled post is reported as sent, not as a draft", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";
    replies.set("POST /v2/social-sets/12345/drafts", { status: 201, body: { id: "d3", status: "scheduled", scheduled_date: null } });

    const result = await publishTypefully([social("later", { publish_at: "next-free-slot" })], true, false);

    expect(result.results[0]?.status).toBe("sent");
    expect(result.results[0]?.detail).toContain("next free slot");
    expect(result.published).toBe(1);
    expect((captured[0]?.body as { publish_at?: string }).publish_at).toBe("next-free-slot");
  });

  test("share is sent as a boolean whether the manifest used a boolean or a string", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";
    replies.set("POST /v2/social-sets/12345/drafts", { status: 201, body: { id: "d4", status: "draft" } });
    const asBoolean = { share: true } as unknown as PublishItem["metadata"];

    await publishTypefully([social("a", asBoolean), social("b", { share: "true" })], true, false);

    expect(captured.map((c) => (c.body as { share?: unknown }).share)).toEqual([true, true]);
  });

  test("rejects a platform whose body this adapter cannot build", async () => {
    process.env.TYPEFULLY_SOCIAL_SET_ID = "12345";

    const result = await publishTypefully([social("long form", { platforms: ["x_article"] })], true, false);

    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("x_article");
    expect(captured).toHaveLength(0);
  });
});
