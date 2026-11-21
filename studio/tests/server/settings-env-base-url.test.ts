// tests/server/settings-env-base-url.test.ts
//
// POST /api/settings/env must apply the same rule as a project's .env.local:
// a provider base URL may not be pointed somewhere new while the provider key
// in use is the operator's shell key. Real server, real local Bun.serve as the
// provider host.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_PORT = 4024
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")
const TOKEN = "s".repeat(64)
const AUTH = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }

let proc: ReturnType<typeof spawn> | null = null
let recorder: ReturnType<typeof Bun.serve> | null = null
const seenAuth: string[] = []
let projectRoot: string
let home: string

beforeAll(async () => {
  projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-settings-base-"))
  home = mkdtempSync(join(tmpdir(), "mktg-studio-settings-base-home-"))
  recorder = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      seenAuth.push(req.headers.get("authorization") ?? "")
      return Response.json([])
    },
  })
  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: home,
    STUDIO_PORT: String(TEST_PORT),
    MKTG_PROJECT_ROOT: projectRoot,
    MKTG_STUDIO_DB: join(home, "marketing.db"),
    MKTG_STUDIO_TOKEN: TOKEN,
    POSTIZ_API_KEY: "SHELL_SECRET",
  }
  delete env.MKTG_STUDIO_AUTH
  delete env.POSTIZ_API_BASE
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
  recorder?.stop(true)
  rmSync(projectRoot, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

describe("POST /api/settings/env base URLs", () => {
  test("refuses a base URL alone while the shell's key is in use", async () => {
    const res = await fetch(`${BASE}/api/settings/env?confirm=true`, {
      method: "POST",
      headers: AUTH,
      body: JSON.stringify({ POSTIZ_API_BASE: `http://127.0.0.1:${recorder!.port}/caseC` }),
    })
    const body = (await res.json()) as { ok: boolean; error?: { code: string } }
    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error?.code).toBe("BAD_INPUT")
  }, 60_000)

  test("accepts a base URL sent together with its key, and uses that key", async () => {
    const res = await fetch(`${BASE}/api/settings/env?confirm=true`, {
      method: "POST",
      headers: AUTH,
      body: JSON.stringify({
        POSTIZ_API_KEY: "KEY_FROM_REQUEST",
        POSTIZ_API_BASE: `http://127.0.0.1:${recorder!.port}/self-hosted`,
      }),
    })
    expect(res.status).toBe(200)
    seenAuth.length = 0
    await (await fetch(`${BASE}/api/publish/postiz/diagnostics`, { headers: AUTH })).text()
    expect(seenAuth.length).toBeGreaterThan(0)
    expect(seenAuth).not.toContain("SHELL_SECRET")
    expect(seenAuth.every((auth) => auth === "KEY_FROM_REQUEST")).toBe(true)
  }, 60_000)
})
