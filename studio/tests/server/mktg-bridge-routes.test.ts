import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

const TEST_PORT = 3997;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ROOT = join(import.meta.dir, "..", "..");

let proc: ReturnType<typeof spawn> | null = null;

type Skill = {
  name: string;
  category: string;
  installed: boolean;
};

type Catalog = {
  name: string;
  configured: boolean;
};

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
});

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT");
    await proc.exited;
  }
});

describe("mktg-backed route stubs", () => {
  test("/api/skills and /api/skills/:name return bridged skill data", async () => {
    const listRes = await fetch(`${BASE}/api/skills`);
    expect(listRes.ok).toBe(true);
    const listBody = (await listRes.json()) as { ok: boolean; data: Skill[]; _todo?: string };
    expect(listBody.ok).toBe(true);
    expect(listBody._todo).toBeUndefined();
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const first = listBody.data[0]!;
    expect(typeof first.name).toBe("string");
    expect(typeof first.category).toBe("string");
    expect(typeof first.installed).toBe("boolean");

    const detailRes = await fetch(`${BASE}/api/skills/${first.name}`);
    expect(detailRes.ok).toBe(true);
    const detailBody = (await detailRes.json()) as { ok: boolean; data: Skill; _todo?: string };
    expect(detailBody.ok).toBe(true);
    expect(detailBody._todo).toBeUndefined();
    expect(detailBody.data.name).toBe(first.name);
    expect(detailBody.data.category).toBe(first.category);
  });

  test("/api/catalog/list, /api/catalog/status, and /api/catalog/info/:name return bridged catalog data", async () => {
    const listRes = await fetch(`${BASE}/api/catalog/list`);
    expect(listRes.ok).toBe(true);
    const listBody = (await listRes.json()) as { ok: boolean; data: Catalog[]; _todo?: string };
    expect(listBody.ok).toBe(true);
    expect(listBody._todo).toBeUndefined();
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const statusRes = await fetch(`${BASE}/api/catalog/status`);
    expect(statusRes.ok).toBe(true);
    const statusBody = (await statusRes.json()) as { ok: boolean; data: Catalog[]; _todo?: string };
    expect(statusBody.ok).toBe(true);
    expect(statusBody._todo).toBeUndefined();
    expect(Array.isArray(statusBody.data)).toBe(true);
    expect(statusBody.data.length).toBeGreaterThan(0);

    const first = listBody.data[0]!;
    const detailRes = await fetch(`${BASE}/api/catalog/info/${first.name}`);
    expect(detailRes.ok).toBe(true);
    const detailBody = (await detailRes.json()) as {
      ok: boolean;
      data: Catalog & { missing_envs?: string[] };
      _todo?: string;
    };
    expect(detailBody.ok).toBe(true);
    expect(detailBody._todo).toBeUndefined();
    expect(detailBody.data.name).toBe(first.name);
    expect(typeof detailBody.data.configured).toBe("boolean");
  });
});
