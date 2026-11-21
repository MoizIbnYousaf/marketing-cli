// tests/integration/launcher-env.test.ts
//
// The launcher (bin/mktg-studio.ts) is where a project's .env.local first
// meets Studio. These tests run the real launcher against a temp project and
// check the real API server it starts. Each launcher runs in its own process
// group so the server and Next children it spawns are stopped with it.

import { afterAll, describe, expect, test } from "bun:test"
import { spawn as spawnChild, type ChildProcess } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const STUDIO_ROOT = join(import.meta.dir, "..", "..")
const LAUNCHER = join(STUDIO_ROOT, "bin", "mktg-studio.ts")
const BUN = process.execPath
const SHELL_TOKEN = "t".repeat(64)
const PLANTED_TOKEN = "p".repeat(40)

const started: ChildProcess[] = []
const dirs: string[] = []

afterAll(async () => {
  for (const child of started) {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) continue
    try {
      process.kill(-child.pid, "SIGTERM")
    } catch {
      // already gone
    }
  }
  await Bun.sleep(1_000)
  for (const child of started) {
    if (!child.pid || child.exitCode !== null) continue
    try {
      process.kill(-child.pid, "SIGKILL")
    } catch {
      // already gone
    }
  }
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const makeProject = (envLocal: string): { project: string; home: string } => {
  const project = mkdtempSync(join(tmpdir(), "mktg-launcher-env-"))
  const home = mkdtempSync(join(tmpdir(), "mktg-launcher-env-home-"))
  dirs.push(project, home)
  writeFileSync(join(project, ".env.local"), envLocal, "utf8")
  return { project, home }
}

const childEnv = (home: string, project: string, studioPort: number, dashboardPort: number) => {
  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: home,
    MKTG_PROJECT_ROOT: project,
    MKTG_STUDIO_DB: join(home, "marketing.db"),
    MKTG_STUDIO_TOKEN: SHELL_TOKEN,
    STUDIO_PORT: String(studioPort),
    DASHBOARD_PORT: String(dashboardPort),
    MKTG_STUDIO_OPEN: "false",
  }
  // bun test sets NODE_ENV=test, which makes Bun auto-load .env.test.local
  // instead of .env.local. Clear it so the launcher sees what a user's
  // shell would give it.
  delete env.NODE_ENV
  for (const key of ["MKTG_STUDIO_AUTH", "DASHBOARD_HOST", "STUDIO_API_BASE", "MKTG_BRAND_DIR"]) delete env[key]
  return env
}

type Outcome =
  | { kind: "exited"; code: number | null; stderr: string }
  | { kind: "serving" }
  | { kind: "timeout" }

const launch = (argv: string[], cwd: string, env: Record<string, string | undefined>) => {
  const child: ChildProcess = spawnChild(BUN, argv, { cwd, env: env as NodeJS.ProcessEnv, detached: true, stdio: ["ignore", "pipe", "pipe"] })
  started.push(child)
  let stderr = ""
  child.stderr?.setEncoding("utf8")
  child.stderr?.on("data", (chunk: string) => { stderr += chunk })
  child.stdout?.resume()
  const exited = new Promise<number | null>((resolve) => child.once("exit", (code: number | null) => resolve(code)))
  return { child, exited, stderr: () => stderr }
}

const waitForOutcome = async (
  run: ReturnType<typeof launch>,
  studioPort: number,
  timeoutMs: number,
): Promise<Outcome> => {
  let done: number | null | undefined
  void run.exited.then((code) => { done = code })
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (done !== undefined) return { kind: "exited", code: done, stderr: run.stderr() }
    try {
      if ((await fetch(`http://127.0.0.1:${studioPort}/api/health`)).ok) return { kind: "serving" }
    } catch {
      // not up yet
    }
    await Bun.sleep(200)
  }
  return { kind: "timeout" }
}

describe("launcher and a project's .env.local", () => {
  test("started without --no-env-file from a project that disables auth, it refuses to start", async () => {
    const { project, home } = makeProject("MKTG_STUDIO_AUTH=disabled\n")
    const run = launch(["run", LAUNCHER, "--no-open"], project, childEnv(home, project, 4025, 4026))
    const outcome = await waitForOutcome(run, 4025, 90_000)
    if (outcome.kind === "serving") {
      // Before the fix: the server came up with auth off.
      const anon = await fetch("http://127.0.0.1:4025/api/activity")
      expect(`serving, anonymous /api/activity -> ${anon.status}`).toBe("refused to start")
      return
    }
    expect(outcome.kind).toBe("exited")
    if (outcome.kind !== "exited") return
    expect(outcome.code).toBe(1)
    expect(outcome.stderr).toContain("MKTG_STUDIO_AUTH")
    expect(outcome.stderr).toContain("--no-env-file")
  }, 120_000)

  test("started as `mktg studio` starts it, refused project keys never reach the server", async () => {
    const { project, home } = makeProject(
      `MKTG_STUDIO_AUTH=disabled\nMKTG_STUDIO_TOKEN=${PLANTED_TOKEN}\n`,
    )
    const config = join(STUDIO_ROOT, "bin", "child-bunfig.toml")
    const run = launch(
      ["--no-env-file", `--config=${config}`, "run", LAUNCHER, "--no-open"],
      project,
      childEnv(home, project, 4027, 4028),
    )
    const outcome = await waitForOutcome(run, 4027, 90_000)
    expect(outcome.kind).toBe("serving")
    const anon = await fetch("http://127.0.0.1:4027/api/activity")
    expect(anon.status).toBe(401)
    const planted = await fetch("http://127.0.0.1:4027/api/activity", {
      headers: { Authorization: `Bearer ${PLANTED_TOKEN}` },
    })
    expect(planted.status).toBe(401)
    const real = await fetch("http://127.0.0.1:4027/api/activity", {
      headers: { Authorization: `Bearer ${SHELL_TOKEN}` },
    })
    expect(real.status).toBe(200)
  }, 120_000)

  test("stopping the launcher during startup also stops the server it started", async () => {
    const { project, home } = makeProject("")
    const config = join(STUDIO_ROOT, "bin", "child-bunfig.toml")
    const run = launch(
      ["--no-env-file", `--config=${config}`, "run", LAUNCHER, "--no-open"],
      project,
      childEnv(home, project, 4029, 4030),
    )
    // The server answers before Next does, so the launcher is still waiting
    // for the dashboard here.
    expect((await waitForOutcome(run, 4029, 90_000)).kind).toBe("serving")
    run.child.kill("SIGTERM")
    await run.exited
    let stillServing = true
    const start = Date.now()
    while (Date.now() - start < 15_000) {
      try {
        await fetch("http://127.0.0.1:4029/api/health")
      } catch {
        stillServing = false
        break
      }
      await Bun.sleep(250)
    }
    expect(stillServing).toBe(false)
  }, 120_000)
})
