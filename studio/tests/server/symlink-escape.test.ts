// tests/server/symlink-escape.test.ts
//
// Every route that reads or writes a file from a request-supplied path must
// refuse a path whose real location is outside the project root: a symlinked
// file, a symlinked parent directory, and (for writes) a symlinked target.
// Legitimate paths keep working, including a project root that is itself
// reached through a symlink. Real server, real symlinks.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { spawn } from "bun"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const TEST_PORT = 4022
const BASE = `http://127.0.0.1:${TEST_PORT}`
const ROOT = join(import.meta.dir, "..", "..")
const TOKEN = "f".repeat(64)
const AUTH = { Authorization: `Bearer ${TOKEN}` }

let proc: ReturnType<typeof spawn> | null = null
let base: string
let projectRoot: string
let outside: string

const get = (route: string, path: string) =>
  fetch(`${BASE}${route}?path=${encodeURIComponent(path)}`, { headers: AUTH })

const put = (path: string, content: string) =>
  fetch(`${BASE}/api/cmo/content/file`, {
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  })

beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), "mktg-studio-symlink-"))
  const realProject = join(base, "project")
  outside = join(base, "outside")
  mkdirSync(join(realProject, "marketing", "images", "nested"), { recursive: true })
  mkdirSync(outside, { recursive: true })

  writeFileSync(join(outside, "secret.md"), "outside secret\n", "utf8")
  writeFileSync(join(outside, "secret.png"), "outside-png", "utf8")
  writeFileSync(join(realProject, "marketing", "notes.md"), "# Notes\n", "utf8")
  writeFileSync(join(realProject, "marketing", "images", "nested", "hero.png"), "inside-png", "utf8")

  // Escapes: a symlinked file and a symlinked parent directory.
  symlinkSync(join(outside, "secret.md"), join(realProject, "marketing", "leak.md"))
  symlinkSync(join(outside, "secret.png"), join(realProject, "marketing", "images", "leak.png"))
  symlinkSync(outside, join(realProject, "marketing", "linked"))
  mkdirSync(join(realProject, "brand"), { recursive: true })
  symlinkSync(join(outside, "secret.md"), join(realProject, "brand", "voice-profile.md"))
  // A symlink that stays inside the project is fine.
  symlinkSync(join(realProject, "marketing", "notes.md"), join(realProject, "marketing", "alias.md"))

  // The server is given a root reached through a symlink.
  projectRoot = join(base, "project-link")
  symlinkSync(realProject, projectRoot)

  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: base,
    STUDIO_PORT: String(TEST_PORT),
    MKTG_PROJECT_ROOT: projectRoot,
    MKTG_STUDIO_DB: join(base, "marketing.db"),
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
  rmSync(base, { recursive: true, force: true })
})

const expectRefused = async (res: Response) => {
  expect(res.status).toBe(400)
  const body = (await res.json()) as { ok: boolean; error: { code: string } }
  expect(body.ok).toBe(false)
  expect(body.error.code).toBe("PATH_TRAVERSAL")
}

describe("GET /api/cmo/content/file", () => {
  test("refuses a symlinked file pointing outside the project", async () => {
    await expectRefused(await get("/api/cmo/content/file", "marketing/leak.md"))
  })
  test("refuses a file under a symlinked parent directory", async () => {
    await expectRefused(await get("/api/cmo/content/file", "marketing/linked/secret.md"))
  })
  test("reads a normal file and an in-project symlink", async () => {
    const normal = await get("/api/cmo/content/file", "marketing/notes.md")
    expect(normal.status).toBe(200)
    expect(((await normal.json()) as { data: { content: string } }).data.content).toBe("# Notes\n")
    const alias = await get("/api/cmo/content/file", "marketing/alias.md")
    expect(alias.status).toBe(200)
  })
})

describe("refusal reasons", () => {
  test("a path too long to resolve is refused for that reason, not as a symlink", async () => {
    const res = await get("/api/cmo/content/file", `${"a".repeat(5000)}.md`)
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: boolean; error: { code: string; message: string } }
    expect(body.ok).toBe(false)
    expect(body.error.message).not.toContain("symbolic link")
    expect(body.error.message).toContain("cannot be resolved")
  })
})

describe("PUT /api/cmo/content/file", () => {
  test("refuses a write under a symlinked parent directory", async () => {
    await expectRefused(await put("marketing/linked/new.md", "written outside"))
    expect(existsSync(join(outside, "new.md"))).toBe(false)
  })
  test("refuses a write to a symlinked target", async () => {
    await expectRefused(await put("marketing/leak.md", "overwrite"))
    expect(readFileSync(join(outside, "secret.md"), "utf8")).toBe("outside secret\n")
  })
  test("writes a new file in a new nested directory", async () => {
    const res = await put("marketing/drafts/q3/post.md", "# Post\n")
    expect(res.status).toBe(200)
    expect(readFileSync(join(projectRoot, "marketing", "drafts", "q3", "post.md"), "utf8")).toBe("# Post\n")
  })
})

for (const route of ["/api/assets/file", "/api/cmo/content/media"]) {
  describe(`GET ${route}`, () => {
    test("refuses a symlinked file pointing outside the project", async () => {
      await expectRefused(await get(route, "marketing/images/leak.png"))
    })
    test("refuses a file under a symlinked parent directory", async () => {
      await expectRefused(await get(route, "marketing/linked/secret.png"))
    })
    test("serves a file in a nested directory", async () => {
      const res = await get(route, "marketing/images/nested/hero.png")
      expect(res.status).toBe(200)
      expect(await res.text()).toBe("inside-png")
    })
    test("serves a byte range and refuses an unsatisfiable one", async () => {
      const url = `${BASE}${route}?path=${encodeURIComponent("marketing/images/nested/hero.png")}`
      const partial = await fetch(url, { headers: { ...AUTH, Range: "bytes=2-5" } })
      expect(partial.status).toBe(206)
      expect(partial.headers.get("content-range")).toBe("bytes 2-5/10")
      expect(await partial.text()).toBe("side")
      const bad = await fetch(url, { headers: { ...AUTH, Range: "bytes=50-60" } })
      expect(bad.status).toBe(416)
    })
  })
}

// Brand routes already refused symlinked files before this change; kept here
// so every file route is covered in one place.
describe("brand routes", () => {
  test("GET /api/brand/read refuses a symlinked brand file", async () => {
    const res = await fetch(`${BASE}/api/brand/read?file=voice-profile.md`, { headers: AUTH })
    await expectRefused(res)
  })
  test("POST /api/brand/write refuses a symlinked brand file", async () => {
    const res = await fetch(`${BASE}/api/brand/write`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ file: "voice-profile.md", content: "overwrite" }),
    })
    await expectRefused(res)
    expect(readFileSync(join(outside, "secret.md"), "utf8")).toBe("outside secret\n")
  })
  test("GET /api/brand/files reports a symlinked brand file as missing, not the outside file's size", async () => {
    const res = await fetch(`${BASE}/api/brand/files`, { headers: AUTH })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ name: string; exists: boolean; bytes: number; mtime: string }> }
    const entry = body.data.find((file) => file.name === "voice-profile.md")
    expect(entry).toBeDefined()
    expect({ exists: entry!.exists, bytes: entry!.bytes, mtime: entry!.mtime }).toEqual({ exists: false, bytes: 0, mtime: "" })
  })
})
