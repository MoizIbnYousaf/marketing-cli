import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_PORT = 3994;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ROOT = join(import.meta.dir, "..", "..");

let proc: ReturnType<typeof spawn> | null = null;
let projectRoot: string;

beforeAll(async () => {
  projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-content-routes-"));
  mkdirSync(join(projectRoot, "brand"), { recursive: true });
  mkdirSync(join(projectRoot, "assets"), { recursive: true });
  writeFileSync(
    join(projectRoot, "brand", "assets.md"),
    [
      "# Assets Log",
      "",
      "| Date | Type | Location | Skill | Notes |",
      "| --- | --- | --- | --- | --- |",
      "| 2026-04-26 | Image | assets/hero.png | imagegen | Launch hero |",
      "| 2026-04-26 | Video | assets/demo.mp4 | video | Demo reel |",
    ].join("\n"),
    "utf-8",
  );
  writeFileSync(join(projectRoot, "assets", "hero.png"), "fake-png", "utf-8");
  writeFileSync(join(projectRoot, "assets", "demo.mp4"), "0123456789", "utf-8");

  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: ROOT,
    env: {
      ...process.env,
      STUDIO_PORT: String(TEST_PORT),
      MKTG_PROJECT_ROOT: projectRoot,
      MKTG_STUDIO_AUTH: "disabled",
    },
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
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("content workspace routes", () => {
  test("returns a manifest built from project-local markdown and media", async () => {
    const res = await fetch(`${BASE}/api/cmo/content/manifest`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: true;
      data: { stats: { images: number; videos: number }; assets: { relativePath: string; mediaUrl?: string }[] };
    };
    expect(body.ok).toBe(true);
    expect(body.data.stats.images).toBe(1);
    expect(body.data.stats.videos).toBe(1);
    expect(body.data.assets.some((asset) => asset.relativePath === "brand/assets.md")).toBe(true);
    expect(body.data.assets.find((asset) => asset.relativePath === "assets/hero.png")?.mediaUrl).toContain(
      "/api/cmo/content/media",
    );
  });

  test("reads and writes project-local markdown artifacts", async () => {
    const read = await fetch(`${BASE}/api/cmo/content/file?path=${encodeURIComponent("brand/assets.md")}`);
    expect(read.status).toBe(200);
    const readBody = (await read.json()) as { ok: true; data: { content: string; mtime: string } };
    expect(readBody.data.content).toContain("Launch hero");

    const write = await fetch(`${BASE}/api/cmo/content/file`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: "brand/assets.md",
        content: `${readBody.data.content}\n<!-- checked -->\n`,
        expectedMtime: readBody.data.mtime,
      }),
    });
    expect(write.status).toBe(200);
    const writeBody = (await write.json()) as { ok: true; data: { path: string } };
    expect(writeBody.data.path).toBe("brand/assets.md");
  });

  test("serves media with range support for native video seeking", async () => {
    const res = await fetch(`${BASE}/api/cmo/content/media?path=${encodeURIComponent("assets/demo.mp4")}`, {
      headers: { range: "bytes=0-3" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-3/10");
    expect(await res.text()).toBe("0123");
  });
});
