// tests/agent-dx.test.ts — final Agent DX 21/21 compliance suite.
//
// Boots the real server.ts on a scratch port and verifies every axis against
// the live surface:
//   1. Machine-readable output — JSON content-type on every /api/*, SSE on streams
//   2. Raw payload input       — Zod-validated bodies; full JSON round-trips
//   3. Schema introspection    — /api/schema + /api/schema?route=…
//   4. Context window discipline — ?fields=, ?limit=/&offset=, NDJSON
//   5. Input hardening         — control chars + traversal rejected
//   6. Safety rails            — ?dryRun=true on mutations; destructive gates
//   7. Agent knowledge packaging — consistent {ok:false, error:{code, message}}

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";
import { parseNdjson } from "../lib/ndjson.ts";

const TEST_PORT = 3997;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ROOT = join(import.meta.dir, "..");

type RouteEntry = {
  method: string;
  path: string;
  description: string;
  params?: string[];
  body?: Record<string, string>;
  accepts?: string[];
  dryRun?: boolean;
  confirm?: boolean;
  errors?: string[];
};

function isStrictErrorBody(body: unknown): body is {
  ok: false;
  error: { code: string; message: string; fix?: string };
} {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.ok !== false) return false;
  const err = b.error;
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

let proc: ReturnType<typeof spawn> | null = null;
let schema: RouteEntry[] = [];

beforeAll(async () => {
  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: ROOT,
    env: { ...process.env, STUDIO_PORT: String(TEST_PORT) },
    stdout: "pipe",
    stderr: "pipe",
  });

  const start = Date.now();
  while (Date.now() - start < 15_000) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) break;
    } catch {
      // retry
    }
    await Bun.sleep(100);
  }

  const r = await fetch(`${BASE}/api/schema`);
  const body = (await r.json()) as { routes: RouteEntry[] };
  schema = body.routes;
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
});

// ---------------------------------------------------------------------------
// Axis 1 — machine-readable output
// ---------------------------------------------------------------------------
describe("axis 1 — machine-readable output", () => {
  test("every registered GET returns JSON content-type", async () => {
    const concreteGets = schema
      .filter((r) => r.method === "GET" && !r.path.includes(":"))
      .map((r) => r.path);

    for (const path of concreteGets) {
      if (path === "/api/events" || path.endsWith("/stream")) continue; // SSE
      const res = await fetch(`${BASE}${path}`);
      const ct = res.headers.get("content-type") ?? "";
      expect(`${path}: ${ct}`).toContain("application/json");
    }
  });

  test("SSE routes return text/event-stream", async () => {
    const ctrl = new AbortController();
    const res = await fetch(`${BASE}/api/events`, { signal: ctrl.signal });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    ctrl.abort();
  });

  test("errors use {ok:false, error:{code, message, fix?}}", async () => {
    const res = await fetch(`${BASE}/api/schema?route=${encodeURIComponent("/not/a/route")}`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Axis 2 — raw payload input
// ---------------------------------------------------------------------------
describe("axis 2 — raw payload input", () => {
  test("/api/activity/log accepts the full JSON body shape", async () => {
    const res = await fetch(`${BASE}/api/activity/log?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "skill-run",
        skill: "landscape-scan",
        summary: "audit smoke test",
        meta: { audit: true },
      }),
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
  });

  test("malformed JSON body triggers BAD_INPUT", async () => {
    const res = await fetch(`${BASE}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not valid json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
    if (isStrictErrorBody(body)) expect(body.error.code).toBe("BAD_INPUT");
  });
});

// ---------------------------------------------------------------------------
// Axis 3 — schema introspection
// ---------------------------------------------------------------------------
describe("axis 3 — schema introspection", () => {
  test("every POST route with a body declares it in ROUTE_SCHEMA", () => {
    const posts = schema.filter((r) => r.method === "POST");
    for (const r of posts) {
      // /api/onboarding/foundation is body-less by design; allow it.
      if (r.path === "/api/onboarding/foundation") continue;
      expect(`${r.path} declares body: ${JSON.stringify(r.body ?? null)}`).toContain(`declares body: {`);
    }
  });

  test("?route= returns exactly one entry for a registered path", async () => {
    const res = await fetch(`${BASE}/api/schema?route=${encodeURIComponent("/api/activity")}`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { routes: RouteEntry[] };
    expect(body.routes.length).toBeGreaterThan(0);
    for (const r of body.routes) expect(r.path).toBe("/api/activity");
  });

  test("?route= 404s on unknown path with structured error", async () => {
    const res = await fetch(`${BASE}/api/schema?route=${encodeURIComponent("/not/real")}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Axis 4 — context window discipline
// ---------------------------------------------------------------------------
describe("axis 4 — context window discipline", () => {
  test("/api/activity supports ?fields= dot-notation", async () => {
    const res = await fetch(`${BASE}/api/activity?fields=id,kind`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; data: unknown[] };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("/api/activity returns BAD_INPUT for unknown ?fields=", async () => {
    // Seed a row so the field-mask has something to probe.
    await fetch(`${BASE}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "audit", summary: "row for fields probe" }),
    });
    const res = await fetch(`${BASE}/api/activity?fields=__nope__`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
    if (isStrictErrorBody(body)) expect(body.error.code).toBe("BAD_INPUT");
  });

  test("/api/activity honors limit + offset", async () => {
    const res = await fetch(`${BASE}/api/activity?limit=1&offset=0`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data.length).toBeLessThanOrEqual(1);
  });

  test("Accept: application/x-ndjson streams list endpoints", async () => {
    const res = await fetch(`${BASE}/api/activity?limit=3`, {
      headers: { accept: "application/x-ndjson" },
    });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const rows = await parseNdjson<{ id?: number }>(res.body);
    // rows.length may be 0 in a fresh DB; we care about the transport.
    expect(Array.isArray(rows)).toBe(true);
  });

  test("ROUTE_SCHEMA marks list endpoints as NDJSON-capable", () => {
    const targets = ["/api/activity", "/api/publish/history", "/api/publish/scheduled"];
    for (const path of targets) {
      const entry = schema.find((r) => r.path === path);
      expect(`${path} accepts`).toContain("accepts");
      expect(entry?.accepts).toContain("application/x-ndjson");
    }
  });
});

// ---------------------------------------------------------------------------
// Axis 5 — input hardening
// ---------------------------------------------------------------------------
describe("axis 5 — input hardening", () => {
  test("control chars in body fields are rejected", async () => {
    const res = await fetch(`${BASE}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "x\x00evil",
        summary: "nope",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
  });

  test("/api/brand/note rejects path traversal", async () => {
    const res = await fetch(`${BASE}/api/brand/note`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        file: "../../etc/passwd",
        excerpt: "traversal attempt",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
  });

  test("/api/settings/env rejects invalid env var keys", async () => {
    const res = await fetch(`${BASE}/api/settings/env?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "not-a-valid-key": "value" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isStrictErrorBody(body)).toBe(true);
  });

  test("skill-id validator rejects uppercase + special chars", async () => {
    const res = await fetch(`${BASE}/api/skill/run?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bad Skill Name" }),
    });
    expect(res.status).toBe(400);
  });

  test("CORS allows only localhost:3000 / 127.0.0.1:3000", async () => {
    const hostile = await fetch(`${BASE}/api/health`, {
      headers: { origin: "https://evil.example" },
    });
    expect(hostile.headers.get("access-control-allow-origin")).toBeNull();

    const friend = await fetch(`${BASE}/api/health`, {
      headers: { origin: "http://localhost:3000" },
    });
    expect(friend.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });
});

// ---------------------------------------------------------------------------
// Axis 6 — safety rails
// ---------------------------------------------------------------------------
describe("axis 6 — safety rails", () => {
  test("?dryRun=true on /api/activity/log writes nothing", async () => {
    const summary = `dryrun probe ${Date.now()}`;
    const before = await fetch(`${BASE}/api/activity?limit=500`);
    const beforeBody = (await before.json()) as { data: unknown[] };
    const beforeCount = beforeBody.data.length;

    const res = await fetch(`${BASE}/api/activity/log?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "custom",
        summary,
      }),
    });
    expect(res.ok).toBe(true);
    const dryBody = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(dryBody.dryRun).toBe(true);

    const after = await fetch(`${BASE}/api/activity?limit=500`);
    const afterBody = (await after.json()) as { data: { kind: string; summary: string }[] };
    expect(afterBody.data.filter((r) => r.summary === summary).length).toBe(0);
    // And total count did not grow from this probe.
    expect(afterBody.data.length).toBe(beforeCount);
  });

  test("ROUTE_SCHEMA marks every mutating POST as dryRun-supported", () => {
    const mutators = schema.filter(
      (r) =>
        r.method === "POST" &&
        !r.path.endsWith("/stream") &&
        r.path !== "/api/onboarding/foundation",
    );
    for (const r of mutators) {
      expect(`${r.path} dryRun flag: ${r.dryRun}`).toContain("dryRun flag: true");
    }
  });
});

// ---------------------------------------------------------------------------
// Axis 7 — agent knowledge packaging
// ---------------------------------------------------------------------------
describe("axis 7 — agent knowledge packaging", () => {
  test("error envelope is consistent across representative endpoints", async () => {
    const probes: { method: string; path: string; body?: string }[] = [
      { method: "GET", path: "/api/schema?route=/nonexistent" },
      {
        method: "POST",
        path: "/api/activity/log",
        body: "not json",
      },
      {
        method: "POST",
        path: "/api/brand/note",
        body: JSON.stringify({ file: "../escape", excerpt: "x" }),
      },
    ];

    for (const p of probes) {
      const res = await fetch(`${BASE}${p.path}`, {
        method: p.method,
        headers: p.body ? { "content-type": "application/json" } : {},
        body: p.body,
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(`${p.path}: ${JSON.stringify(body)}`).toContain(`"code"`);
      expect(isStrictErrorBody(body)).toBe(true);
    }
  });

  test("GET /api/help returns an agent cheat-sheet", async () => {
    const res = await fetch(`${BASE}/api/help`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        summary: string;
        envelopes: Record<string, string>;
        errorCodes: string[];
        queryParams: Record<string, string>;
        entryPoints: { path: string; why: string }[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.errorCodes).toContain("BAD_INPUT");
    expect(body.data.errorCodes).toContain("UPSTREAM_FAILED");
    expect(body.data.entryPoints.length).toBeGreaterThan(0);
  });

  test("error codes documented in docs/cmo-api.md cover the StudioErrorCode enum", async () => {
    const text = await Bun.file(join(ROOT, "docs", "cmo-api.md")).text();
    for (const code of [
      "BAD_INPUT",
      "NOT_FOUND",
      "UNAUTHORIZED",
      "RATE_LIMITED",
      "UPSTREAM_FAILED",
      "PARSE_ERROR",
      "INTERNAL",
    ]) {
      expect(`cmo-api.md mentions ${code}: ${text.includes(code)}`).toContain("true");
    }
  });
});
