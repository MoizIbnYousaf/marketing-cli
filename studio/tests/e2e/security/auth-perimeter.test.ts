// Lane 1 E2E -- auth perimeter coverage.
//
// Real Bun server, real auth gate, real curl-equivalent fetches. The
// server boots WITHOUT MKTG_STUDIO_AUTH=disabled so the perimeter is live.
//
// Covered (3+ cases each):
//   - Authorization: Bearer (happy / wrong / malformed / mixed-case header name)
//   - ?token= query (happy / wrong / no token at all)
//   - Public allowlist: /api/health, /api/schema, /api/help (no token, all 200)
//   - Host header allowlist (localhost / 127.0.0.1 / [::1] vs evil.com)
//   - Mixed: Authorization wins over ?token= (header is canonical)

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startSecurityServer, type SecurityHarness, PORTS } from "./harness";

let h: SecurityHarness;

beforeAll(async () => {
  h = await startSecurityServer({ port: PORTS.authPerimeter });
});

afterAll(async () => {
  await h?.teardown();
});

// ---------------------------------------------------------------------------
// Public allowlist (3+ paths, no token)
// ---------------------------------------------------------------------------

describe("auth perimeter -- public allowlist", () => {
  test("/api/health returns 200 + valid envelope without any token", async () => {
    const r = await fetch(`${h.baseUrl}/api/health`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/json");
    const body = (await r.json()) as { ok: boolean; version: string; ts: string; subscribers: number };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(Number.isNaN(Date.parse(body.ts))).toBe(false);
    expect(typeof body.subscribers).toBe("number");
  });

  test("/api/schema returns route table without any token", async () => {
    const r = await fetch(`${h.baseUrl}/api/schema`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; routes: Array<{ method: string; path: string }> };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.routes)).toBe(true);
    expect(body.routes.length).toBeGreaterThan(30);
    const paths = new Set(body.routes.map((r) => r.path));
    expect(paths.has("/api/health")).toBe(true);
    expect(paths.has("/api/skills")).toBe(true);
  });

  test("/api/help returns the cheat-sheet without any token", async () => {
    const r = await fetch(`${h.baseUrl}/api/help`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; data: { errorCodes: string[] } };
    expect(body.ok).toBe(true);
    expect(body.data.errorCodes).toContain("UNAUTHORIZED");
    expect(body.data.errorCodes).toContain("BAD_INPUT");
  });

  test("/api/auth/bootstrap returns the token to localhost (dev cold-start unblock)", async () => {
    const r = await fetch(`${h.baseUrl}/api/auth/bootstrap`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; data: { token: string } };
    expect(body.ok).toBe(true);
    expect(typeof body.data.token).toBe("string");
    expect(body.data.token.length).toBeGreaterThanOrEqual(64);
    // Critical: the bootstrap endpoint must hand back the SAME token the
    // server uses to validate Bearer headers. Otherwise the dashboard
    // would stash a value that 401s on every fetch.
    expect(body.data.token).toBe(h.token);
  });

  test("/api/auth/bootstrap is REJECTED with evil Host even though it is on the public allowlist", async () => {
    const r = await fetch(`${h.baseUrl}/api/auth/bootstrap`, {
      headers: { Host: "evil.example" },
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(body.error.code).toBe("BAD_INPUT");
    expect(body.error.message).toMatch(/Host header/i);
    // The token MUST NOT appear in the rejected response body.
    const text = JSON.stringify(body);
    expect(text).not.toContain(h.token);
  });
});

// ---------------------------------------------------------------------------
// Authorization: Bearer (4 cases)
// ---------------------------------------------------------------------------

describe("auth perimeter -- Authorization: Bearer", () => {
  test("HAPPY: valid bearer token authorizes a private route", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, { headers: h.bearer() });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; data: unknown };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("FAILURE: wrong-length token returns 401 with UNAUTHORIZED + fix hint", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(r.status).toBe(401);
    const body = (await r.json()) as { ok: false; error: { code: string; message: string; fix?: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message.toLowerCase()).toContain("bearer");
    expect(typeof body.error.fix).toBe("string");
  });

  test("FAILURE: same-length but wrong token returns 401 (timing-safe compare path)", async () => {
    // Build a token of identical length so timingSafeEqual takes the equal-length path.
    const wrong = "0".repeat(h.token.length);
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `Bearer ${wrong}` },
    });
    expect(r.status).toBe(401);
    const body = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toMatch(/Invalid/i);
  });

  test("EDGE: lowercase 'authorization' header still works (HTTP headers are case-insensitive)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { authorization: `Bearer ${h.token}` } as Record<string, string>,
    });
    expect(r.status).toBe(200);
  });

  test("EDGE: lowercase 'bearer' scheme still works (toLowerCase startsWith path)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Authorization: `bearer ${h.token}` },
    });
    expect(r.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// ?token= query (3 cases)
// ---------------------------------------------------------------------------

describe("auth perimeter -- ?token= query (EventSource fallback)", () => {
  test("HAPPY: valid ?token= authorizes a private route (no Authorization header)", async () => {
    const r = await fetch(h.withToken("/api/skills"));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; data: unknown };
    expect(body.ok).toBe(true);
  });

  test("HAPPY: ?token= authorizes the SSE stream (text/event-stream content-type)", async () => {
    // SSE stays open; use AbortController to read one frame and bail.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 800);
    let r: Response | null = null;
    try {
      r = await fetch(h.withToken("/api/events"), { signal: ctrl.signal });
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toContain("text/event-stream");
    } finally {
      clearTimeout(timer);
      try { r?.body?.cancel(); } catch { /* ignored */ }
    }
  });

  test("FAILURE: missing ?token= AND no Authorization returns 401", async () => {
    const r = await fetch(`${h.baseUrl}/api/events`);
    expect(r.status).toBe(401);
    const body = (await r.json()) as { ok: false; error: { code: string; message: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toMatch(/Missing bearer/i);
  });

  test("FAILURE: ?token= with a bogus value returns 401", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills?token=garbage`);
    expect(r.status).toBe(401);
    const body = (await r.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// Authorization wins over ?token= (canonical header)
// ---------------------------------------------------------------------------

describe("auth perimeter -- header precedence", () => {
  test("EDGE: valid Authorization with bogus ?token= still authorizes (header wins)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills?token=garbage`, {
      headers: h.bearer(),
    });
    expect(r.status).toBe(200);
  });

  test("EDGE: bogus Authorization with valid ?token= returns 401 (header is checked first)", async () => {
    // The middleware reads the header first; if present and bearer-prefixed,
    // it does NOT fall back to query. This is the documented precedence.
    const r = await fetch(h.withToken("/api/skills"), {
      headers: { Authorization: "Bearer wrong-but-bearer-prefixed" },
    });
    expect(r.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Host header allowlist (DNS rebinding mitigation)
// ---------------------------------------------------------------------------

describe("auth perimeter -- Host header allowlist", () => {
  test("HAPPY: Host: 127.0.0.1 + valid bearer = 200 (default fetch behavior)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, { headers: h.bearer() });
    expect(r.status).toBe(200);
  });

  test("HAPPY: Host: localhost + valid bearer = 200", async () => {
    const r = await fetch(`http://localhost:${h.port}/api/skills`, { headers: h.bearer() });
    expect(r.status).toBe(200);
  });

  test("FAILURE: Host: evil.example with valid bearer = 400 BAD_INPUT (DNS rebinding guard)", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { ...h.bearer(), Host: "evil.example" },
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { ok: false; error: { code: string; message: string; fix?: string } };
    expect(body.error.code).toBe("BAD_INPUT");
    expect(body.error.message).toMatch(/Host header/i);
    expect(body.error.fix).toMatch(/127\.0\.0\.1|localhost/);
  });

  test("FAILURE: Host: 192.168.1.5 (LAN address) is also rejected even with valid bearer", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { ...h.bearer(), Host: "192.168.1.5" },
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe("BAD_INPUT");
  });

  test("EDGE: Host check applies BEFORE token check -- evil Host returns 400 not 401 even without token", async () => {
    const r = await fetch(`${h.baseUrl}/api/skills`, {
      headers: { Host: "evil.example" },
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe("BAD_INPUT");
  });

  test("EDGE: Host check applies even on PUBLIC allowlist (health rejected from evil host)", async () => {
    // Public paths bypass token, but Host gate is enforced for ALL routes.
    const r = await fetch(`${h.baseUrl}/api/health`, {
      headers: { Host: "attacker.example" },
    });
    expect(r.status).toBe(400);
    const body = (await r.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe("BAD_INPUT");
  });
});
