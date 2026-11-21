// tests/server/env-local-trust.test.ts
//
// A project's .env.local is repository input. Studio must apply the CLI's
// isEnvLocalKeyAllowed rule to it: it cannot switch off auth, and blocked
// keys never reach the `mktg` child process. Real server, real child process.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { run } from "../../lib/mktg.ts"

const TEST_PORT = 4021
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")
const TOKEN = "e".repeat(64)

let proc: ReturnType<typeof spawn> | null = null
let projectRoot: string
let home: string

beforeAll(async () => {
  projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-envtrust-"))
  home = mkdtempSync(join(tmpdir(), "mktg-studio-envtrust-home-"))
  writeFileSync(join(projectRoot, ".env.local"), "MKTG_STUDIO_AUTH=disabled\n", "utf8")

  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: home,
    STUDIO_PORT: String(TEST_PORT),
    MKTG_PROJECT_ROOT: projectRoot,
    MKTG_STUDIO_DB: join(home, "marketing.db"),
    MKTG_STUDIO_TOKEN: TOKEN,
  }
  delete env.MKTG_STUDIO_AUTH
  proc = spawn({ cmd: ["bun", "run", "server.ts"], cwd: ROOT, env, stdout: "pipe", stderr: "pipe" })

  const start = Date.now()
  while (Date.now() - start < 60_000) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) break
    } catch {
      // not up yet
    }
    await Bun.sleep(200)
  }
}, 90_000)

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT")
    await proc.exited
  }
  rmSync(projectRoot, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

describe("project .env.local cannot change Studio auth", () => {
  test("MKTG_STUDIO_AUTH=disabled in the project's .env.local still requires the token", async () => {
    const anon = await fetch(`${BASE}/api/brand/files`)
    expect(anon.status).toBe(401)
    const authed = await fetch(`${BASE}/api/brand/files`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    expect(authed.status).toBe(200)
  })
})

describe("project .env.local keys passed to the mktg child", () => {
  const saved: Record<string, string | undefined> = {}
  // bun test sets NODE_ENV=test, which makes Bun auto-load .env.test.local
  // instead of .env.local in children. Clear it so the child behaves as in
  // a real Studio session, where Bun would auto-load the project's file.
  const KEYS = ["HOME", "NODE_ENV", "POSTIZ_API_KEY", "MKTG_STUDIO_BIN"]
  let childProject: string

  beforeAll(() => {
    for (const key of KEYS) saved[key] = process.env[key]
    childProject = mkdtempSync(join(tmpdir(), "mktg-studio-envtrust-child-"))
    process.env.HOME = home
    Reflect.deleteProperty(process.env, "NODE_ENV")
    delete process.env.POSTIZ_API_KEY
    delete process.env.MKTG_STUDIO_BIN
    const evilLauncher = join(childProject, "evil-launcher.ts")
    writeFileSync(evilLauncher, "console.log('should never be chosen')\n", "utf8")
    writeFileSync(
      join(childProject, ".env.local"),
      `MKTG_STUDIO_BIN=${evilLauncher}\nPOSTIZ_API_KEY=pz_project_key\n`,
      "utf8",
    )
  })

  afterAll(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    rmSync(childProject, { recursive: true, force: true })
  })

  test("a blocked key (MKTG_STUDIO_BIN) does not reach the child", async () => {
    const result = await run<{ binary: string }>(["studio", "--dry-run"], { cwd: childProject })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.binary).not.toContain("evil-launcher")
    expect(result.data.binary).toBe(join(ROOT, "bin", "mktg-studio.ts"))
  }, 120_000)

  test("an allowed provider key still reaches the child", async () => {
    const result = await run<{ configured: boolean; missing_envs: string[] }>(
      ["catalog", "info", "postiz"],
      { cwd: childProject },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.configured).toBe(true)
    expect(result.data.missing_envs).toEqual([])
  }, 120_000)
})

describe("a project's bunfig.toml does not run code in the mktg child", () => {
  let bunfigProject: string
  const savedHome = process.env.HOME

  beforeAll(() => {
    bunfigProject = mkdtempSync(join(tmpdir(), "mktg-studio-envtrust-bunfig-"))
    process.env.HOME = home
    writeFileSync(join(bunfigProject, "bunfig.toml"), 'preload = ["./pwn.ts"]\n', "utf8")
    writeFileSync(
      join(bunfigProject, "pwn.ts"),
      `require("node:fs").writeFileSync(${JSON.stringify(join(bunfigProject, "preload-ran"))}, process.argv.join(" "))\n`,
      "utf8",
    )
  })

  afterAll(() => {
    if (savedHome === undefined) delete process.env.HOME
    else process.env.HOME = savedHome
    rmSync(bunfigProject, { recursive: true, force: true })
  })

  test("preload from the project's bunfig.toml never runs", async () => {
    const result = await run(["list", "--routing"], { cwd: bunfigProject })
    expect(result.ok).toBe(true)
    expect(existsSync(join(bunfigProject, "preload-ran"))).toBe(false)
  }, 120_000)
})
