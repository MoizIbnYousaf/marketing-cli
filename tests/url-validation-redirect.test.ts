// mktg — fetchWithSizeCap redirect ceiling (SSRF hardening)
// The validator only checks the initial host; redirects are followed
// manually for exactly one hop and the target is re-validated.
// Uses a stubbed global fetch so no network / DNS is involved.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fetchWithSizeCap, validatePublicUrl } from "../src/core/url-validation";

const ORIGIN = "https://example.com/start";
const PUBLIC_TARGET = "https://cdn.example.org/final";
const PRIVATE_TARGET = "http://127.0.0.1:8080/secret";
const SECOND_HOP = "https://another.example.net/again";

type Route = () => Response;
let routes: Record<string, Route> = {};
let calls: string[] = [];
const realFetch = globalThis.fetch;

const redirect = (to: string): Route => () => new Response(null, { status: 302, headers: { location: to } });
const body = (text: string): Route => () => new Response(text, { status: 200 });

const asPublic = (raw: string) => {
  const v = validatePublicUrl(raw);
  if (!v.ok) throw new Error(v.message);
  return v.url;
};

beforeEach(() => {
  calls = [];
  const stub = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    const route = routes[url];
    if (!route) return Promise.reject(new Error(`unexpected fetch ${url}`));
    return Promise.resolve(route());
  }) as unknown as typeof fetch;
  globalThis.fetch = stub;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  routes = {};
});

describe("fetchWithSizeCap redirect ceiling", () => {
  test("302 -> public host: follows one hop and returns the body", async () => {
    routes = { [ORIGIN]: redirect(PUBLIC_TARGET), [PUBLIC_TARGET]: body("hello") };
    const res = await fetchWithSizeCap(asPublic(ORIGIN));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.text).toBe("hello");
    expect(calls).toEqual([ORIGIN, PUBLIC_TARGET]);
  });

  test("302 -> private host: rejected before the second request is made", async () => {
    routes = { [ORIGIN]: redirect(PRIVATE_TARGET), [PRIVATE_TARGET]: body("leak") };
    const res = await fetchWithSizeCap(asPublic(ORIGIN));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Redirect rejected/);
    expect(calls).toEqual([ORIGIN]);
  });

  test("302 -> 302: second hop is rejected (one-hop ceiling)", async () => {
    routes = {
      [ORIGIN]: redirect(PUBLIC_TARGET),
      [PUBLIC_TARGET]: redirect(SECOND_HOP),
      [SECOND_HOP]: body("too far"),
    };
    const res = await fetchWithSizeCap(asPublic(ORIGIN));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Redirect chain longer than one hop/);
    expect(calls).toEqual([ORIGIN, PUBLIC_TARGET]);
  });

  test("3xx without Location is rejected", async () => {
    routes = { [ORIGIN]: () => new Response(null, { status: 302 }) };
    const res = await fetchWithSizeCap(asPublic(ORIGIN));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/without Location/);
  });
});
