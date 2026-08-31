import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 4017;
const BASE = `http://127.0.0.1:${PORT}`;
const STUDIO_ROOT = join(import.meta.dir, "..", "..");
const projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-project-mutations-"));
let server: ReturnType<typeof spawn>;

beforeAll(async () => {
  server = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: STUDIO_ROOT,
    env: {
      ...process.env,
      STUDIO_PORT: String(PORT),
      MKTG_PROJECT_ROOT: projectRoot,
      MKTG_STUDIO_AUTH: "disabled",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      // Server is still starting.
    }
    await Bun.sleep(100);
  }
  throw new Error("Studio test server did not become healthy");
});

afterAll(async () => {
  server.kill("SIGINT");
  await server.exited;
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("project-scoped mutations", () => {
  test("settings writes .env.local atomically with private permissions", async () => {
    const response = await fetch(`${BASE}/api/settings/env?confirm=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ POSTIZ_API_KEY: "key with # and spaces" }),
    });
    expect(response.status).toBe(200);

    const path = join(projectRoot, ".env.local");
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readFileSync(path, "utf8")).toContain('POSTIZ_API_KEY="key with # and spaces"');
  });

  test("init job runs in the selected project root", async () => {
    const response = await fetch(`${BASE}/api/init`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(202);
    const started = (await response.json()) as { jobId: string };

    const deadline = Date.now() + 20_000;
    let status = "queued";
    while (Date.now() < deadline) {
      const jobResponse = await fetch(`${BASE}/api/jobs/${started.jobId}`);
      const jobBody = (await jobResponse.json()) as { data?: { status?: string }; status?: string };
      status = jobBody.data?.status ?? jobBody.status ?? status;
      if (status === "success" || status === "failed") break;
      await Bun.sleep(100);
    }

    expect(status).toBe("success");
    expect(readFileSync(join(projectRoot, "brand", "voice-profile.md"), "utf8")).toContain("# Brand Voice Profile");
  });
});
