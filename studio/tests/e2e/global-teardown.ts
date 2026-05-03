// tests/e2e/global-teardown.ts — stop the server + next dev started in globalSetup.

import { existsSync, readFileSync, unlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PID_FILE = join(tmpdir(), "mktg-studio-e2e.pids");
const PROJECT_ROOT_FILE = join(tmpdir(), "mktg-studio-e2e.project-root");

export default async function globalTeardown(): Promise<void> {
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
}
