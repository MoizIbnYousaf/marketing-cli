// tests/e2e/global-teardown.ts — stop the server + next dev started in globalSetup.

import { existsSync, readFileSync, unlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PID_FILE = join(tmpdir(), "mktg-studio-e2e.pids");
const PROJECT_ROOT_FILE = join(tmpdir(), "mktg-studio-e2e.project-root");
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800");
const NEXT_DIST_DIR = `.next-e2e-${DASHBOARD_PORT}`;

export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_SKIP_GLOBAL_STACK === "1") return;

  if (existsSync(PID_FILE)) {
    const pids = readFileSync(PID_FILE, "utf-8")
      .split("\n")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGINT");
      } catch {
        /* already gone */
      }
    }

    // Give graceful shutdown a beat, then harden.
    await new Promise((r) => setTimeout(r, 500));

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }

    try {
      unlinkSync(PID_FILE);
    } catch {
      /* fine */
    }
  }

  if (existsSync(PROJECT_ROOT_FILE)) {
    try {
      const projectRoot = readFileSync(PROJECT_ROOT_FILE, "utf-8").trim();
      if (projectRoot) {
        rmSync(projectRoot, { recursive: true, force: true });
      }
    } catch {
      /* fine */
    }
    try {
      unlinkSync(PROJECT_ROOT_FILE);
    } catch {
      /* fine */
    }
  }

  try {
    rmSync(join(REPO_ROOT, NEXT_DIST_DIR), { recursive: true, force: true });
  } catch {
    /* fine */
  }
}
