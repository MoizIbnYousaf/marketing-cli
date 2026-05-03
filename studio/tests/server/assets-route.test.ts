import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_PORT = 3995
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")

let proc: ReturnType<typeof spawn> | null = null
let projectRoot: string

beforeAll(async () => {
  projectRoot = mkdtempSync(join(tmpdir(), "mktg-studio-assets-"))
  mkdirSync(join(projectRoot, "brand"), { recursive: true })
  mkdirSync(join(projectRoot, "marketing", "images"), { recursive: true })
  mkdirSync(join(projectRoot, "marketing", "video"), { recursive: true })
  writeFileSync(join(projectRoot, "brand", "assets.md"), "# Assets Log\n", "utf8")
  writeFileSync(join(projectRoot, "marketing", "images", "hero.png"), "fake-png", "utf8")
  writeFileSync(join(projectRoot, "marketing", "video", "demo.mp4"), "fake-mp4", "utf8")

  proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: ROOT,
    env: {
      ...process.env,
      STUDIO_PORT: String(TEST_PORT),
      MKTG_PROJECT_ROOT: projectRoot,
    },
    stdout: "pipe",
    stderr: "pipe",
  })

  const start = Date.now()
  while (Date.now() - start < 15_000) {
    try {
      const r = await fetch(`${BASE}/api/health`)
      if (r.ok) break
    } catch {
      // retry
    }
    await Bun.sleep(100)
  }
})

afterAll(async () => {
  if (proc) {
    proc.kill("SIGINT")
    await proc.exited
  }
  rmSync(projectRoot, { recursive: true, force: true })
})

describe("GET /api/assets/file", () => {
  test("serves in-project image assets", async () => {
    const res = await fetch(`${BASE}/api/assets/file?path=${encodeURIComponent("marketing/images/hero.png")}`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("image/png")
  })

  test("serves in-project video assets", async () => {
    const res = await fetch(`${BASE}/api/assets/file?path=${encodeURIComponent("marketing/video/demo.mp4")}`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("video/mp4")
  })

  test("rejects traversal outside the project root", async () => {
    const res = await fetch(`${BASE}/api/assets/file?path=${encodeURIComponent("../secrets.txt")}`)
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("PATH_TRAVERSAL")
  })

  test("returns NOT_FOUND for missing files", async () => {
    const res = await fetch(`${BASE}/api/assets/file?path=${encodeURIComponent("marketing/images/missing.png")}`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { ok: false; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("NOT_FOUND")
  })
})
