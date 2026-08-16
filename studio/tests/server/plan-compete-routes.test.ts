// tests/server/plan-compete-routes.test.ts — GET /api/plan, /api/plan/next,
// /api/compete, /api/compete/scan bridge the mktg CLI through wrapRoute.
// Boots the real server against a temp project dir (no mocks).

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bridgeMktgResult } from "../../server/routes/plan.ts";

const TEST_PORT = 3994;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ROOT = join(import.meta.dir, "..", "..");

let proc: ReturnType<typeof spawn> | null = null;
let projectDir = "";

beforeAll(async () => {
  projectDir = mkdtempSync(join(tmpdir(), "studio-plan-compete-"));
  proc = spawn({
    cmd: ["bun", "run", join(ROOT, "server.ts")],
    cwd: projectDir,
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
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
  if (projectDir) rmSync(projectDir, { recursive: true, force: true });
});

describe("plan + compete bridge routes", () => {
  test("GET /api/plan returns the mktg plan envelope", async () => {
    const res = await fetch(`${BASE}/api/plan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { tasks: unknown[]; health: string } };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.tasks)).toBe(true);
    expect(["ready", "incomplete", "needs-setup"]).toContain(body.data.health);
  });

  test("GET /api/plan/next returns {task} (PlanTask or null)", async () => {
    const res = await fetch(`${BASE}/api/plan/next`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { task: { id: string; action: string } | null } };
    expect(body.ok).toBe(true);
    expect("task" in body.data).toBe(true);
    if (body.data.task) {
      expect(typeof body.data.task.id).toBe("string");
      expect(typeof body.data.task.action).toBe("string");
    }
  });

  test("GET /api/compete returns the watchlist (empty in a fresh project)", async () => {
    const res = await fetch(`${BASE}/api/compete`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { urls: unknown[]; total: number } };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.urls)).toBe(true);
    expect(body.data.total).toBe(body.data.urls.length);
  });

  test("GET /api/compete/scan returns scan counters (no network with empty watchlist)", async () => {
    const res = await fetch(`${BASE}/api/compete/scan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { results: unknown[]; total: number; changed: number } };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.results)).toBe(true);
    expect(typeof body.data.changed).toBe("number");
  });

  test("all four routes appear in /api/schema", async () => {
    const schema = (await (await fetch(`${BASE}/api/schema`)).json()) as { routes: { path: string; method: string }[] };
    for (const p of ["/api/plan", "/api/plan/next", "/api/compete", "/api/compete/scan"]) {
      expect(schema.routes.some((r) => r.path === p && r.method === "GET")).toBe(true);
    }
  });

  test("bridgeMktgResult maps CLI codes to studio codes", () => {
    const bad = bridgeMktgResult({ ok: false, exitCode: 2, error: { code: "INVALID_ARGS", message: "x", suggestions: ["fix it"] } });
    expect(bad).toMatchObject({ ok: false, code: "BAD_INPUT", status: 400, fix: "fix it" });
    const up = bridgeMktgResult({ ok: false, exitCode: 1, error: { code: "SPAWN_ERROR", message: "x", suggestions: [] } });
    expect(up).toMatchObject({ ok: false, code: "UPSTREAM_FAILED", status: 502 });
    const good = bridgeMktgResult({ ok: true, exitCode: 0, data: { a: 1 } });
    expect(good).toEqual({ ok: true, data: { a: 1 } });
  });
});
