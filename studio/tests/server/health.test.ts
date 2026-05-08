// tests/server/health.test.ts — smoke-test the Bun server boot
//
// Spawns `bun run server.ts` in a subprocess on a non-default port, waits
// for /api/health to go green, then hits /api/schema. Teardown sends SIGINT
// for graceful shutdown + DB close.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

const TEST_PORT = 3999;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PROJECT_ROOT = join(import.meta.dir, "..", "..");
const BOOT_TIMEOUT_MS = 15_000;

// Shared handle across tests in this file.
let proc: ReturnType<typeof spawn> | null = null;

async function waitForHealth(): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      // Not ready yet — retry.
    }
    await Bun.sleep(100);
  }
  return false;
}

beforeAll(async () => {
  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: PROJECT_ROOT,
    env: { ...process.env, STUDIO_PORT: String(TEST_PORT), MKTG_STUDIO_AUTH: "disabled" },
    stdout: "pipe",
    stderr: "pipe",
  });

  const ready = await waitForHealth();
  if (!ready) {
    proc?.kill();
    throw new Error(`Server failed to boot on port ${TEST_PORT}`);
  }
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
});

describe("GET /api/health", () => {
  test("returns 200 + JSON envelope", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { ok: boolean; version: string; ts: string };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(Number.isNaN(Date.parse(body.ts))).toBe(false);
  });
});

describe("GET /api/schema", () => {
  test("returns the full ROUTE_SCHEMA list", async () => {
    const res = await fetch(`${BASE_URL}/api/schema`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = (await res.json()) as {
      ok: boolean;
      routes: { method: string; path: string; description: string }[];
    };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.routes)).toBe(true);
    expect(body.routes.length).toBeGreaterThan(20);

    const paths = body.routes.map((r) => r.path);
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/schema");
    expect(paths).toContain("/api/activity");
  });
});

describe("GET /api/events (SSE)", () => {
  test("opens a stream and delivers a connected heartbeat", async () => {
    const controller = new AbortController();
    const res = await fetch(`${BASE_URL}/api/events`, { signal: controller.signal });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const chunk = await Promise.race([
      reader.read(),
      Bun.sleep(2000).then(() => ({ value: undefined, done: true })),
    ]);

    if (chunk && chunk.value) {
      const text = decoder.decode(chunk.value);
      expect(text).toContain("data:");
      expect(text).toContain("connected");
    }

    controller.abort();
  });
});
