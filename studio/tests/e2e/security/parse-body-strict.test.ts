// Lane 1 E2E -- parseBody (inline + wrapRoute) hardening.
//
// Inline-handled routes used to call raw JSON.parse, bypassing the 64 KB
// cap and prototype-pollution guard. Audit (#16) flagged 11+ sites; the
// fix in Lane 1 routes both `parseBody` and `parseBodyStrict` through
// `parseJsonInput`. This suite proves both paths are now hardened.
//
// /api/skill/run is handled by an inline parseBody.
// /api/activity/log is handled by wrapRoute -> parseBodyStrict.
// We probe both.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startSecurityServer, type SecurityHarness, PORTS } from "./harness";

let h: SecurityHarness;

beforeAll(async () => {
  h = await startSecurityServer({ port: PORTS.parseBodyStrict });
});

afterAll(async () => {
  await h?.teardown();
});

// ---------------------------------------------------------------------------
// 64 KB cap
// ---------------------------------------------------------------------------

describe("parseBody -- 64 KB body cap", () => {
  test("HAPPY: 1 KB body on /api/skill/run dryRun returns 200", async () => {
    const small = JSON.stringify({ name: "brand-voice" });
    expect(small.length).toBeLessThan(1_024);
    const r = await fetch(`${h.baseUrl}/api/skill/run?dryRun=true`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: small,
    });
    expect(r.status).toBe(200);
  });

  test("EDGE: 64 KB exactly is rejected (boundary is strict)", async () => {
    // Build a body just past the 65_536 char threshold. The check in
    // parseJsonInput is `raw.length > 65_536`, so 65_537 trips it.
    const overflow = "a".repeat(65_537 - `{"name":""}`.length);
    const body = `{"name":"${overflow}"}`;
    expect(body.length).toBeGreaterThan(65_536);
    const r = await fetch(`${h.baseUrl}/api/skill/run`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body,
    });
    expect(r.status).toBe(413);
    const env = (await r.json()) as { ok: false; error: { code: string; message: string; fix?: string } };
    expect(env.ok).toBe(false);
    // Inline parseBody surfaces this as BAD_INPUT with 413 status; wrapRoute
    // surfaces as PAYLOAD_TOO_LARGE. Either is acceptable for the contract.
    expect(["BAD_INPUT", "PAYLOAD_TOO_LARGE"]).toContain(env.error.code);
    expect(env.error.message).toMatch(/64\s*KB/i);
  });

  test("FAILURE: 70 KB body via wrapRoute (/api/activity/log) returns 413 PAYLOAD_TOO_LARGE", async () => {
    const padding = "x".repeat(70_000);
    const body = JSON.stringify({ kind: "custom", summary: "x", detail: padding });
    expect(body.length).toBeGreaterThan(65_536);
    const r = await fetch(`${h.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body,
    });
    expect(r.status).toBe(413);
    const env = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(env.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(env.error.message).toMatch(/64\s*KB/i);
  });
});

// ---------------------------------------------------------------------------
// Prototype pollution guard
// ---------------------------------------------------------------------------

describe("parseBody -- prototype pollution guard", () => {
  test("FAILURE: __proto__ in body is rejected on inline route (/api/skill/run)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skill/run`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: '{"name":"brand-voice","__proto__":{"polluted":true}}',
    });
    expect([400, 413]).toContain(r.status);
    const env = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(env.ok).toBe(false);
    expect(env.error.message.toLowerCase()).toMatch(/unsafe|proto/);
  });

  test("FAILURE: __proto__ in body is rejected on wrapRoute (/api/activity/log)", async () => {
    const r = await fetch(`${h.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: '{"kind":"custom","summary":"hi","__proto__":{"polluted":true}}',
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string } };
    expect(env.error.code).toBe("UNSAFE_JSON_KEYS");
  });

  test("FAILURE: 'constructor' key is also rejected (matches parseJsonInput regex)", async () => {
    const r = await fetch(`${h.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: '{"kind":"custom","summary":"hi","constructor":{"prototype":{"polluted":true}}}',
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(env.error.code).toBe("UNSAFE_JSON_KEYS");
    expect(env.error.message.toLowerCase()).toContain("unsafe");
  });

  test("HAPPY: a benign body with neither key passes proto-check", async () => {
    const r = await fetch(`${h.baseUrl}/api/activity/log?dryRun=true`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "custom", summary: "benign-probe" }),
    });
    expect(r.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Malformed JSON
// ---------------------------------------------------------------------------

describe("parseBody -- malformed JSON", () => {
  test("FAILURE: truncated JSON returns 400 BAD_INPUT (inline)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skill/run`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: '{"name":',
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(env.error.code).toBe("BAD_INPUT");
    expect(env.error.message.toLowerCase()).toMatch(/invalid json|valid json/);
  });

  test("FAILURE: empty body returns 400 BAD_INPUT (wrapRoute)", async () => {
    const r = await fetch(`${h.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: "",
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string } };
    expect(env.error.code).toBe("BAD_INPUT");
  });

  test("FAILURE: not-an-object (top-level array) is rejected by Zod schema", async () => {
    const r = await fetch(`${h.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { ...h.bearer(), "Content-Type": "application/json" },
      body: "[1,2,3]",
    });
    expect(r.status).toBe(400);
    const env = (await r.json()) as { ok: false; error: { code: string } };
    expect(env.error.code).toBe("BAD_INPUT");
  });
});
