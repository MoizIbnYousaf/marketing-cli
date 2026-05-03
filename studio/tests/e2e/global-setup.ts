// tests/e2e/global-setup.ts — spawn server.ts + next dev on scratch ports
// before any Playwright spec runs. Writes pids to a temp file so the teardown
// hook can stop them cleanly.
//
// Note: Playwright runs this under Node, so we can't use Bun APIs here.
// The child processes themselves are `bun run ...` — that's the only Bun.

import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const PID_FILE = join(tmpdir(), "mktg-studio-e2e.pids");
const PROJECT_ROOT_FILE = join(tmpdir(), "mktg-studio-e2e.project-root");

const STUDIO_PORT = Number(process.env.E2E_STUDIO_PORT ?? "4801");
const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800");

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status >= 200 && res.status < 500) return true;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  return false;
}

function killPortSync(port: number): void {
  try {
    const probe = spawn("sh", ["-c", `lsof -ti:${port} 2>/dev/null || true`], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    probe.stdout!.on("data", (chunk) => (out += chunk.toString()));
    // Wait synchronously — small cost, runs only at test-suite boot.
    return new Promise<void>((resolve) => {
      probe.on("close", () => {
        const pids = out.trim().split("\n").filter(Boolean);
        for (const pid of pids) {
          try {
            process.kill(Number(pid), "SIGKILL");
          } catch {
            /* already dead */
          }
        }
        resolve();
      });
    }) as unknown as void;
  } catch {
    /* fine */
  }
}

export default async function globalSetup(): Promise<void> {
  await killPortSync(STUDIO_PORT);
  await killPortSync(DASHBOARD_PORT);
  await sleep(300);

  const projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-e2e-project-"));
  mkdirSync(join(projectRoot, "brand"), { recursive: true });
  writeFileSync(PROJECT_ROOT_FILE, projectRoot, "utf-8");

  // Next.js refuses to boot if a stale lock is present from a prior aborted run.
  try {
    rmSync(join(REPO_ROOT, ".next", "dev", "lock"), { force: true });
  } catch {
    /* fine */
  }

  mkdirSync(join(REPO_ROOT, "docs", "screenshots"), { recursive: true });

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    STUDIO_PORT: String(STUDIO_PORT),
    DASHBOARD_PORT: String(DASHBOARD_PORT),
    MKTG_PROJECT_ROOT: projectRoot,
    NEXT_PUBLIC_STUDIO_DEMO: "1",
    NEXT_PUBLIC_STUDIO_API_BASE:
      process.env.NEXT_PUBLIC_STUDIO_API_BASE ?? `http://127.0.0.1:${STUDIO_PORT}`,
  };

  const server: ChildProcess = spawn("bun", ["run", "server.ts"], {
    cwd: REPO_ROOT,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const next: ChildProcess = spawn(
    "bun",
    ["run", "next", "dev", "-p", String(DASHBOARD_PORT)],
    {
      cwd: REPO_ROOT,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  // Stream child output to the Playwright runner so CI logs stay useful.
  server.stdout?.on("data", (c) => process.stderr.write(`[server] ${c}`));
  server.stderr?.on("data", (c) => process.stderr.write(`[server!] ${c}`));
  next.stdout?.on("data", (c) => process.stderr.write(`[next] ${c}`));
  next.stderr?.on("data", (c) => process.stderr.write(`[next!] ${c}`));

  writeFileSync(
    PID_FILE,
    `${server.pid ?? ""}\n${next.pid ?? ""}\n`,
  );

  const [serverReady, nextReady] = await Promise.all([
    waitFor(`http://127.0.0.1:${STUDIO_PORT}/api/health`, 30_000),
    waitFor(`http://127.0.0.1:${DASHBOARD_PORT}/`, 60_000),
  ]);

  if (!serverReady || !nextReady) {
    server.kill("SIGKILL");
    next.kill("SIGKILL");
    throw new Error(
      `E2E boot failed — server:${serverReady} next:${nextReady}`,
    );
  }

  console.log(
    `[e2e] studio ready on :${STUDIO_PORT}, dashboard ready on :${DASHBOARD_PORT}`,
  );
}
