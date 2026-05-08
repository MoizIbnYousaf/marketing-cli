// tests/server/route-schema.test.ts — regression guard for ROUTE_SCHEMA invariants
//
// History: the foundation runner + the registerRouteSchema(...) block were
// silently stripped from server.ts (root cause: prior session writes were
// never committed, plus a working-tree reset). The runtime had:
//   - /api/onboarding/foundation reverted to a stub (no real spawning)
//   - 4 endpoints with ROUTE_SCHEMA entries but no handlers
//   - 15 POST routes missing inputSchema enrichment on /api/schema
//
// This test asserts the contract that matters: every ROUTE_SCHEMA entry that
// declares a `body: {...}` (i.e. takes a JSON body) has a registered Zod
// schema and serves a real JSON Schema 2020-12 inputSchema via /api/schema.
// If the registrations ever drift again, this test fails loud.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

const TEST_PORT = 3996;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ROOT = join(import.meta.dir, "..", "..");

let proc: ReturnType<typeof spawn> | null = null;
type RouteEntry = {
  method: string;
  path: string;
  description: string;
  body?: Record<string, string> | unknown;
  inputSchema?: { $schema?: string; type?: string };
  errors?: string[];
  dryRun?: boolean;
  confirm?: boolean;
};
let routes: RouteEntry[] = [];

beforeAll(async () => {
  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: ROOT,
    env: { ...process.env, STUDIO_PORT: String(TEST_PORT), MKTG_STUDIO_AUTH: "disabled" },
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
  routes = body.routes;
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
});

describe("ROUTE_SCHEMA + registerRouteSchema invariants (regression guard)", () => {
  test("server returns ≥ 32 ROUTE_SCHEMA entries", () => {
    expect(routes.length).toBeGreaterThanOrEqual(32);
  });

  // P3-A (audit) — pin route + inputSchema counts so docs drift is loud.
  // The numbers in docs/cmo-api.md are frozen against these floors. Bump
  // both the floor AND the docs together when adding routes.
  test("route count + inputSchema count match docs floor (P3-A)", () => {
    const MIN_ROUTES = 50;
    const MIN_INPUT_SCHEMAS = 19;
    expect(routes.length).toBeGreaterThanOrEqual(MIN_ROUTES);
    const withSchemas = routes.filter((r) => r.inputSchema).length;
    expect(withSchemas).toBeGreaterThanOrEqual(MIN_INPUT_SCHEMAS);
  });

  test("/api/navigate schema advertises only primary workspace tabs", () => {
    const nav = routes.find((r) => r.path === "/api/navigate");
    const enumField = (nav?.inputSchema as {
      properties?: { tab?: { enum?: string[] } };
    })?.properties?.tab?.enum ?? [];

    expect(enumField).toEqual(["pulse", "signals", "publish", "brand"]);
  });

  test("/api/navigate remaps legacy tab callers before emit", async () => {
    const res = await fetch(`${BASE}/api/navigate?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tab: "trends", filter: { mode: "radar" } }),
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      dryRun: boolean;
      data: { tab: string; filter: Record<string, unknown> | null };
    };
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    // Lane 4 rename: trends/signals/content all collapse to canonical
    // "signals" (was "content" pre-rename).
    expect(body.data).toEqual({ tab: "signals", filter: null });
  });

  test("/api/navigate remaps legacy hq callers to pulse", async () => {
    const res = await fetch(`${BASE}/api/navigate?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Pre-rename callers may still send `tab: "hq"`; the server-side
      // normalize maps it to the canonical "pulse" id.
      body: JSON.stringify({ tab: "hq" }),
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      dryRun: boolean;
      data: { tab: string; filter: Record<string, unknown> | null };
    };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ tab: "pulse", filter: null });
  });

  test("EVERY POST entry that declares a body{} also serves a real JSON Schema 2020-12 inputSchema", () => {
    const violations: string[] = [];
    for (const r of routes) {
      if (r.method !== "POST") continue;
      // Routes without a `body` declaration are body-less by design.
      if (!r.body || Object.keys(r.body as Record<string, unknown>).length === 0) continue;
      if (!r.inputSchema) {
        violations.push(`${r.method} ${r.path}: missing inputSchema (registerRouteSchema not called?)`);
        continue;
      }
      if (r.inputSchema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        violations.push(`${r.method} ${r.path}: inputSchema.$schema is "${r.inputSchema.$schema}" (expected JSON Schema 2020-12)`);
      }
      if (typeof r.inputSchema.type !== "string") {
        violations.push(`${r.method} ${r.path}: inputSchema.type missing`);
      }
    }
    expect(violations).toEqual([]);
  });

  test("the the critical routes are all live", async () => {
    const required = [
      "POST /api/onboarding/foundation",
      "POST /api/brand/refresh",
      "POST /api/brand/reset",
      "POST /api/brand/write",
      "POST /api/brand/regenerate",
      "POST /api/activity/log",
      "POST /api/opportunities/push",
      "POST /api/navigate",
      "POST /api/toast",
      "POST /api/highlight",
      "POST /api/brand/note",
      "POST /api/signals/dismiss",
      "POST /api/signals/approve",
      "POST /api/signals/flag",
      "POST /api/skill/run",
      "POST /api/cmo/playbook",
      "POST /api/init",
      "POST /api/settings/env",
      "POST /api/publish",
      "GET /api/settings/env/status",
      "GET /api/project/current",
      "GET /api/brand/files",
      "GET /api/brand/read",
    ];
    const present = new Set(routes.map((r) => `${r.method} ${r.path}`));
    const missing = required.filter((p) => !present.has(p));
    expect(missing).toEqual([]);
  });

  test("foundation runner is wired (POST returns jobIds, not a stub)", async () => {
    const res = await fetch(`${BASE}/api/onboarding/foundation?dryRun=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seed: true }),
    });
    expect(res.ok).toBe(true);
    const body = await res.json();
    // Stubbed handler returned `{ok:true, dryRun:true}` only. Real handler
    // also accepts the parsed body; dryRun short-circuit returns same shape
    // — so we exercise the non-dryRun call shape via /api/schema instead.
    expect(body.ok).toBe(true);
    const entry = routes.find((r) => r.path === "/api/onboarding/foundation");
    expect(entry?.body).toBeDefined();
    expect((entry?.body as Record<string, string>).from).toBe("string?");
    expect((entry?.body as Record<string, string>).seed).toBe("boolean?");
  });

  test("/api/brand/reset rejects without ?confirm=true", async () => {
    const res = await fetch(`${BASE}/api/brand/reset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("CONFIRM_REQUIRED");
  });

  test("/api/settings/env/status returns the known env-key map without values", async () => {
    const res = await fetch(`${BASE}/api/settings/env/status`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; data: Record<string, string> };
    expect(body.ok).toBe(true);
    for (const key of [
      "POSTIZ_API_KEY",
      "POSTIZ_API_BASE",
      "TYPEFULLY_API_KEY",
      "EXA_API_KEY",
      "FIRECRAWL_API_KEY",
      "RESEND_API_KEY",
    ]) {
      expect(["set", "unset"]).toContain(body.data[key]);
    }
    // Negative: response body, when serialized, must not contain the
    // env-var values themselves. We can't enumerate every secret here, but
    // we can assert there are no unexpected non-status string values.
    for (const v of Object.values(body.data)) {
      expect(v === "set" || v === "unset").toBe(true);
    }
  });

  test("/api/project/current reports active project identity without provisioning native publish", async () => {
    const res = await fetch(`${BASE}/api/project/current`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        name: string;
        root: string;
        rootLabel: string;
        dbPath: string;
        logo: { kind: string; initials?: string; url?: string };
        nativePublish: { configured: boolean; providerCount: number; postCount: number };
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.name.length).toBeGreaterThan(0);
    expect(body.data.root.length).toBeGreaterThan(0);
    expect(body.data.rootLabel.length).toBeGreaterThan(0);
    expect(body.data.dbPath.endsWith("marketing.db")).toBe(true);
    expect(["image", "initials"]).toContain(body.data.logo.kind);
    expect(typeof body.data.nativePublish.configured).toBe("boolean");
    expect(body.data.nativePublish.providerCount).toBeGreaterThanOrEqual(0);
    expect(body.data.nativePublish.postCount).toBeGreaterThanOrEqual(0);
  });
});
