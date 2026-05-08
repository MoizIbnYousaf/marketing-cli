// Lane 1 E2E -- malformed Authorization header handling.
//
// The auth gate parses `Authorization: Bearer <token>` with .toLowerCase()
// + .startsWith("bearer ") + .slice(7). Tests here probe odd headers that
// could trip a parser into accepting bad input or throwing.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startSecurityServer, type SecurityHarness, PORTS } from "./harness";

let h: SecurityHarness;

beforeAll(async () => {
  h = await startSecurityServer({ port: PORTS.malformedHeaders });
});

afterAll(async () => {
  await h?.teardown();
});

describe("malformed Authorization headers -- still safe", () => {
  test("FAILURE: 'Bearer' with no token returns 401, no crash", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: "Bearer" },
    });
    expect(r.status).toBe(401);
    const env = (await r.json()) as { ok: false; error: { code: string } };
    expect(env.error.code).toBe("UNAUTHORIZED");
  });

  test("FAILURE: 'Bearer ' with trailing whitespace only returns 401 (empty after slice/trim)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: "Bearer    " },
    });
    expect(r.status).toBe(401);
  });

  test("FAILURE: non-Bearer scheme (Basic) is treated as missing token", async () => {
    // Basic auth header: middleware does not match the bearer prefix, so it
    // falls through to ?token= which is absent -> 401.
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(r.status).toBe(401);
  });

  test("FAILURE: Authorization: Token <hex> is treated as missing (only Bearer matches)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `Token ${h.token}` },
    });
    expect(r.status).toBe(401);
  });

  test("EDGE: 'Bearer  <token>' with double space still authorizes (slice(7) + trim)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `Bearer  ${h.token}` },
    });
    expect(r.status).toBe(200);
  });

  test("EDGE: token with surrounding whitespace via trim still authorizes", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `Bearer ${h.token}   ` },
    });
    expect(r.status).toBe(200);
  });

  test("FAILURE: Authorization: Bearer <token> + Bearer <other> (folded header, last wins per RFC)", async () => {
    // fetch() concatenates duplicate headers with ", "; this exercises the
    // edge case where a malicious proxy might fold two Authorizations.
    // Most fetch impls keep the first; the server sees one header value.
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: new Headers([
        ["Authorization", "Bearer wrong"],
        ["Authorization", `Bearer ${h.token}`],
      ]),
    });
    // Either 200 or 401 is defensible per RFC 7230 (de-dupe behavior is impl-specific).
    // What we MUST NOT see: 5xx (parser crash).
    expect([200, 401]).toContain(r.status);
    expect(r.status).not.toBe(500);
  });

  test("EDGE: Authorization with embedded control char in the token value returns 401", async () => {
    // ASCII 0x01 (SOH) -- not stripped by trim(). Must NOT match valid token.
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `Bearer ${h.token}\x01` } as Record<string, string>,
    }).catch((e: Error) => ({ status: 0, e } as unknown as Response));
    // Some HTTP clients reject control chars in headers entirely (status 0
    // or thrown) -- both are acceptable rejections. If the request goes
    // through, the server compares an extra-byte token and fails.
    if ("status" in r && r.status !== 0) {
      // Either 400 (server rejects malformed header at parse time) or 401
      // (server compares the extra byte and fails the token check). Both
      // are valid rejections; what we MUST NOT see is 200 or 5xx.
      expect([400, 401]).toContain(r.status);
    }
  });
});
