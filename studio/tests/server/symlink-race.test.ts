// tests/server/symlink-race.test.ts
//
// The path check and the read must concern the same file. A real child
// process swaps a project path between a regular file and a symlink to a file
// outside the project while the test reads it through the real server; no
// response may carry the outside content. This is a race, so a pass before
// the fix was possible in principle; on this machine the unfixed server
// leaked on every run tried.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_PORT = 4031
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")
const TOKEN = "q".repeat(64)
const AUTH = { Authorization: `Bearer ${TOKEN}` }
const ROUNDS = 400

let server: ReturnType<typeof spawn> | null = null
let swapper: ReturnType<typeof spawn> | null = null
let base: string

// Swap `target` between an inside file and a symlink to an outside file,
// each time by renaming a prepared entry over it, until killed.
const SWAPPER = `
const { renameSync, symlinkSync, writeFileSync, rmSync } = require("node:fs")
const [target, insideBody, outsideFile] = process.argv.slice(1)
let i = 0
for (;;) {
  const tmp = target + ".swap" + (i++ % 2)
  rmSync(tmp, { force: true })
  if (i % 2) symlinkSync(outsideFile, tmp)
  else writeFileSync(tmp, insideBody)
  renameSync(tmp, target)
}
`

beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), "mktg-studio-race-"))
  const project = join(base, "project")
  const outside = join(base, "outside")
  mkdirSync(join(project, "notes"), { recursive: true })
  mkdirSync(join(project, "marketing", "images"), { recursive: true })
  mkdirSync(outside)
  writeFileSync(join(outside, "secret.md"), "OUTSIDE SECRET\n", "utf8")
  writeFileSync(join(outside, "secret.png"), "OUTSIDE-PNG", "utf8")
  writeFileSync(join(project, "notes", "race.md"), "inside\n", "utf8")
  writeFileSync(join(project, "marketing", "images", "race.png"), "INSIDE-PNG", "utf8")

  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: base,
    STUDIO_PORT: String(TEST_PORT),
    MKTG_PROJECT_ROOT: project,
    MKTG_STUDIO_DB: join(base, "marketing.db"),
    MKTG_STUDIO_TOKEN: TOKEN,
  }
  delete env.MKTG_STUDIO_AUTH
  server = spawn({ cmd: ["bun", "run", "server.ts"], cwd: ROOT, env, stdout: "pipe", stderr: "pipe" })
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
  if (swapper) {
    swapper.kill("SIGKILL")
    await swapper.exited
  }
  if (server) {
    server.kill("SIGINT")
    await server.exited
  }
  rmSync(base, { recursive: true, force: true })
})

const race = async (target: string, insideBody: string, outsideFile: string, url: string, marker: string) => {
  swapper = spawn({
    cmd: [process.execPath, "--no-env-file", "-e", SWAPPER, target, insideBody, outsideFile],
    stdout: "ignore",
    stderr: "ignore",
  })
  await Bun.sleep(300)
  let leaked = 0
  let served = 0
  for (let i = 0; i < ROUNDS; i++) {
    const res = await fetch(url, { headers: AUTH })
    const text = await res.text()
    if (res.status === 200) served++
    if (text.includes(marker)) leaked++
  }
  swapper.kill("SIGKILL")
  await swapper.exited
  swapper = null
  return { leaked, served }
}

describe("check-then-open race", () => {
  test("GET /api/cmo/content/file never returns the outside file", async () => {
    const project = join(base, "project")
    const result = await race(
      join(project, "notes", "race.md"),
      "inside\n",
      join(base, "outside", "secret.md"),
      `${BASE}/api/cmo/content/file?path=${encodeURIComponent("notes/race.md")}`,
      "OUTSIDE SECRET",
    )
    expect(result.leaked).toBe(0)
  }, 120_000)

  test("GET /api/assets/file never serves the outside file", async () => {
    const project = join(base, "project")
    const result = await race(
      join(project, "marketing", "images", "race.png"),
      "INSIDE-PNG",
      join(base, "outside", "secret.png"),
      `${BASE}/api/assets/file?path=${encodeURIComponent("marketing/images/race.png")}`,
      "OUTSIDE-PNG",
    )
    expect(result.leaked).toBe(0)
  }, 120_000)
})
