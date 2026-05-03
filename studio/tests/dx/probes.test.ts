// tests/dx/probes.test.ts — Agent DX probe suite
//
// Pure probe functions + a small default run. Task #4 will import these
// probes, feed them the full route list from ROUTE_SCHEMA, and emit the
// scorecard. The probes return `{pass, note}` so the caller can render
// a per-axis grid.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

const TEST_PORT = 3998;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PROJECT_ROOT = join(import.meta.dir, "..", "..");

export interface ProbeResult {
  pass: boolean;
  note: string;
}

export interface ErrorEnvelope {
  ok: false;
  error: { code: string; message: string; fix?: string };
}

function isStrictErrorEnvelope(body: unknown): body is ErrorEnvelope {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.ok !== false) return false;
  const err = b.error;
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

// ---------------------------------------------------------------------------
// Axis probes — each takes a base URL + route and returns ProbeResult.
// Intentionally free of `expect` so callers can compose them into a grid.
// ---------------------------------------------------------------------------

export async function probeMachineReadable(url: string): Promise<ProbeResult> {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json") && !ct.includes("text/event-stream")) {
    return { pass: false, note: `content-type=${ct}` };
  }
  if (ct.includes("application/json")) {
    try {
      await res.clone().json();
    } catch (error) {
      return { pass: false, note: `invalid JSON: ${(error as Error).message}` };
    }
  }
  return { pass: true, note: `content-type=${ct}` };
}

export async function probeRawPayload(url: string, body: unknown): Promise<ProbeResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status >= 500) return { pass: false, note: `status=${res.status}` };
  return { pass: true, note: `status=${res.status}` };
}

export async function probeSchemaIntrospection(baseUrl: string): Promise<ProbeResult> {
  const res = await fetch(`${baseUrl}/api/schema`);
  if (!res.ok) return { pass: false, note: `status=${res.status}` };
  const body = (await res.json()) as { ok?: boolean; routes?: unknown[] };
  if (!body.ok || !Array.isArray(body.routes) || body.routes.length === 0) {
    return { pass: false, note: "routes missing or empty" };
  }
  return { pass: true, note: `${body.routes.length} routes registered` };
}

export async function probeFieldMask(url: string, path: string): Promise<ProbeResult> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}fields=${encodeURIComponent(path)}`);
  if (!res.ok) return { pass: false, note: `status=${res.status}` };
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return { pass: false, note: `non-JSON response (${ct})` };
  }
  // Presence of a body is enough for the probe — the scorecard caller
  // makes the structural assertion with domain knowledge of the endpoint.
  await res.clone().text();
  return { pass: true, note: `fields=${path} accepted` };
}

export async function probeInputHardening(
  url: string,
  fieldKey: string,
): Promise<ProbeResult> {
  const hostileInputs: Record<string, unknown> = {
    "NULL byte": `${fieldKey}-\x00`,
    "path traversal": "../../etc/passwd",
    "double-encoded": "%25../etc/passwd",
  };

  const failures: string[] = [];

  for (const [label, value] of Object.entries(hostileInputs)) {
    const payload: Record<string, unknown> = { [fieldKey]: value };
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status < 400 || res.status >= 500) {
      failures.push(`${label} → ${res.status}`);
      continue;
    }
    const body = await res.json().catch(() => null);
    if (!isStrictErrorEnvelope(body)) {
      failures.push(`${label} error shape`);
    }
  }

  if (failures.length > 0) {
    return { pass: false, note: failures.join("; ") };
  }
  return { pass: true, note: `rejected ${Object.keys(hostileInputs).length} hostile inputs` };
}

export async function probeSafetyRails(
  url: string,
  body: Record<string, unknown>,
  opts: { destructive?: boolean } = {},
): Promise<ProbeResult> {
  // Dry-run must succeed without writes.
  const sep = url.includes("?") ? "&" : "?";
  const dryRes = await fetch(`${url}${sep}dryRun=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!dryRes.ok) return { pass: false, note: `dryRun=${dryRes.status}` };
  const dryBody = (await dryRes.json()) as { dryRun?: boolean; ok?: boolean };
  if (!dryBody.ok || !dryBody.dryRun) {
    return { pass: false, note: "dryRun did not set `dryRun: true`" };
  }

  if (opts.destructive) {
    const bareRes = await fetch(url, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (bareRes.ok) return { pass: false, note: "destructive call without ?confirm=true succeeded" };
    const bareJson = await bareRes.json().catch(() => null);
    if (!isStrictErrorEnvelope(bareJson) || bareJson.error.code !== "CONFIRM_REQUIRED") {
      return { pass: false, note: "destructive error envelope missing CONFIRM_REQUIRED" };
    }
  }

  return { pass: true, note: "dryRun + confirm gates enforced" };
}

export async function probeErrorEnvelope(url: string): Promise<ProbeResult> {
  // Trigger a 404 or validation error depending on verb.
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json at all",
  });
  if (res.ok) return { pass: false, note: `expected error, got ${res.status}` };
  const body = await res.json().catch(() => null);
  if (!isStrictErrorEnvelope(body)) {
    return { pass: false, note: "error envelope not {ok:false, error:{code, message}}" };
  }
  return { pass: true, note: `code=${body.error.code}` };
}

// ---------------------------------------------------------------------------
// Default probe run — exercises the baseline endpoints that should always
// work. Task #4 extends this per-route.
// ---------------------------------------------------------------------------

let proc: ReturnType<typeof spawn> | null = null;

async function waitForHealth(): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await Bun.sleep(100);
  }
  return false;
}

beforeAll(async () => {
  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: PROJECT_ROOT,
    env: { ...process.env, STUDIO_PORT: String(TEST_PORT) },
    stdout: "pipe",
    stderr: "pipe",
  });
  const ready = await waitForHealth();
  if (!ready) {
    proc?.kill();
    throw new Error("server failed to boot");
  }
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
});

describe("Agent DX baseline probes", () => {
  test("axis 1 — /api/health is JSON", async () => {
    const r = await probeMachineReadable(`${BASE_URL}/api/health`);
    expect(r.pass).toBe(true);
  });

  test("axis 3 — /api/schema lists routes", async () => {
    const r = await probeSchemaIntrospection(BASE_URL);
    expect(r.pass).toBe(true);
  });

  test("axis 4 — /api/activity accepts ?fields=", async () => {
    const r = await probeFieldMask(`${BASE_URL}/api/activity`, "id");
    expect(r.pass).toBe(true);
  });

  test("axis 7 — /api/schema response has a stable shape", async () => {
    const res = await fetch(`${BASE_URL}/api/schema`);
    const body = (await res.json()) as { routes: { path: string }[] };
    const paths = new Set(body.routes.map((r) => r.path));
    expect(paths.has("/api/health")).toBe(true);
    expect(paths.has("/api/schema")).toBe(true);
  });
});
