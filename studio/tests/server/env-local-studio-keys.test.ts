// tests/server/env-local-studio-keys.test.ts
//
// Studio's own control keys (token, project root, brand dir, DB) are operator
// settings. A project's .env.local must not set them, and for any key both
// the shell and the project file define, the shell wins. Real server, real
// files, and a real local Bun.serve standing in for the Postiz host.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_PORT = 4023
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")
const SHELL_TOKEN = "r".repeat(64)
const PROJECT_TOKEN = "k".repeat(40)

let proc: ReturnType<typeof spawn> | null = null
let recorder: ReturnType<typeof Bun.serve> | null = null
const seenAuth: string[] = []
let base: string
let projectRoot: string
let outside: string
let home: string

beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), "mktg-studio-studiokeys-"))
  projectRoot = join(base, "project")
  outside = join(base, "outside")
  home = join(base, "home")
  mkdirSync(projectRoot)
  mkdirSync(join(outside, "brand"), { recursive: true })
  mkdirSync(home)
  writeFileSync(join(outside, "secret.md"), "# SECRET OUTSIDE\n", "utf8")
  writeFileSync(join(outside, "brand", "secret.md"), "# SECRET BRAND OUTSIDE\n", "utf8")

  recorder = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      seenAuth.push(req.headers.get("authorization") ?? "")
      return Response.json([])
    },
  })

  writeFileSync(
    join(projectRoot, ".env.local"),
    [
      `MKTG_STUDIO_TOKEN=${PROJECT_TOKEN}`,
      `MKTG_PROJECT_ROOT=${base}`,
      `MKTG_BRAND_DIR=${join(outside, "brand")}`,
      `MKTG_STUDIO_DB=${join(outside, "planted.db")}`,
      "POSTIZ_API_KEY=decoy-from-project",
      "",
    ].join("\n"),
    "utf8",
  )

  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: home,
    STUDIO_PORT: String(TEST_PORT),
    MKTG_PROJECT_ROOT: projectRoot,
    MKTG_STUDIO_TOKEN: SHELL_TOKEN,
    POSTIZ_API_KEY: "SHELL_SECRET",
    POSTIZ_API_BASE: `http://127.0.0.1:${recorder.port}`,
  }
  delete env.MKTG_STUDIO_AUTH
  delete env.MKTG_BRAND_DIR
  delete env.MKTG_STUDIO_DB
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
  rmSync(base, { recursive: true, force: true })
})

const shellAuth = { Authorization: `Bearer ${SHELL_TOKEN}` }
// Whichever token the server accepts. Before the fix that was the project's,
// so the path checks below must not depend on the shell token being live.
const TOKENS = [SHELL_TOKEN, PROJECT_TOKEN]
const fetchEach = async (path: string, init: RequestInit = {}): Promise<string[]> => {
  const bodies: string[] = []
  for (const token of TOKENS) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
    })
    bodies.push(`${res.status} ${await res.text()}`)
  }
  return bodies
}

describe("project .env.local cannot set Studio's control keys", () => {
  test("the shell token is accepted and the project's token is not", async () => {
    expect((await fetch(`${BASE}/api/activity`, { headers: shellAuth })).status).toBe(200)
    const planted = await fetch(`${BASE}/api/activity`, {
      headers: { Authorization: `Bearer ${PROJECT_TOKEN}` },
    })
    expect(planted.status).toBe(401)
  })

  test("MKTG_BRAND_DIR from the project file does not move the brand directory", async () => {
    const reads = await fetchEach("/api/brand/read?file=secret.md")
    expect(reads.join("\n")).not.toContain("SECRET BRAND OUTSIDE")
    await fetchEach("/api/brand/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "planted.md", content: "# planted\n" }),
    })
    expect(existsSync(join(outside, "brand", "planted.md"))).toBe(false)
  })

  test("MKTG_PROJECT_ROOT from the project file does not widen the served root", async () => {
    const reads = await fetchEach(`/api/cmo/content/file?path=${encodeURIComponent("outside/secret.md")}`)
    expect(reads.join("\n")).not.toContain("SECRET OUTSIDE")
    await fetchEach("/api/cmo/content/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "outside/put.md", content: "x\n" }),
    })
    expect(existsSync(join(outside, "put.md"))).toBe(false)
  })

  test("MKTG_STUDIO_DB from the project file does not move the database", () => {
    expect(existsSync(join(outside, "planted.db"))).toBe(false)
  })
})

describe("shell env wins over the project file", () => {
  test("an allowed key defined in both uses the shell's value", async () => {
    seenAuth.length = 0
    await fetchEach("/api/publish/postiz/diagnostics")
    expect(seenAuth.length).toBeGreaterThan(0)
    expect(seenAuth).not.toContain("decoy-from-project")
    expect(seenAuth.every((auth) => auth === "SHELL_SECRET")).toBe(true)
  }, 60_000)
})
