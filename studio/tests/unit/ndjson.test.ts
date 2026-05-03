// tests/unit/ndjson.test.ts — streamNdjson + parseNdjson round-trip

import { describe, expect, test } from "bun:test";
import { streamNdjson, parseNdjson, wantsNdjson, NDJSON_CONTENT_TYPE } from "../../lib/ndjson.ts";

describe("wantsNdjson", () => {
  test("true when Accept header includes application/x-ndjson", () => {
    const req = new Request("http://x/", { headers: { accept: "application/x-ndjson" } });
    expect(wantsNdjson(req)).toBe(true);
  });

  test("false when Accept header is missing or json", () => {
    expect(wantsNdjson(new Request("http://x/"))).toBe(false);
    expect(wantsNdjson(new Request("http://x/", { headers: { accept: "application/json" } }))).toBe(false);
  });

  test("true even when other types are present", () => {
    const req = new Request("http://x/", {
      headers: { accept: "text/html, application/x-ndjson;q=0.9" },
    });
    expect(wantsNdjson(req)).toBe(true);
  });
});

describe("streamNdjson", () => {
  test("sets the right content type and no-store cache", () => {
    const res = streamNdjson([{ id: 1 }, { id: 2 }]);
    expect(res.headers.get("content-type")).toBe(NDJSON_CONTENT_TYPE);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("round-trips an array through parseNdjson", async () => {
    const items = [{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 3 }];
    const res = streamNdjson(items);
    const parsed = await parseNdjson<{ id: number }>(res.body);
    expect(parsed).toEqual(items);
  });

  test("round-trips an async iterable", async () => {
    async function* gen() {
      yield { id: 1 };
      yield { id: 2 };
    }
    const res = streamNdjson(gen());
    const parsed = await parseNdjson<{ id: number }>(res.body);
    expect(parsed).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("emits zero items for an empty iterable", async () => {
    const res = streamNdjson([]);
    const parsed = await parseNdjson(res.body);
    expect(parsed).toEqual([]);
  });

  test("writes an error line when iteration throws", async () => {
    async function* fail() {
      yield { id: 1 };
      throw new Error("boom");
    }
    const res = streamNdjson(fail());
    const parsed = await parseNdjson<{ id?: number; error?: string }>(res.body);
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual({ id: 1 });
    expect(parsed[1]).toEqual({ error: "boom" });
  });

  test("each item is exactly one newline-terminated JSON line", async () => {
    const items = [{ a: "with \"quotes\"" }, { b: "newline\nembed" }];
    const res = streamNdjson(items);
    const text = await new Response(res.body).text();
    const lines = text.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(items.length);
    for (const line of lines) JSON.parse(line); // must all be valid JSON
  });
});
