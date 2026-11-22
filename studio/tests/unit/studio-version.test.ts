// tests/unit/studio-version.test.ts
//
// The launcher and /api/health must report the same version: the
// marketing-cli package Studio ships in. Real files in temp directories and
// the real launcher binary.

import { afterAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { studioVersion } from "../../lib/studio-version.ts"

const STUDIO_ROOT = join(import.meta.dir, "..", "..")
const dirs: string[] = []

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const layout = (root: Record<string, unknown> | null, studio: Record<string, unknown> | null): string => {
  const pkg = mkdtempSync(join(tmpdir(), "mktg-studio-version-"))
  dirs.push(pkg)
  mkdirSync(join(pkg, "studio"))
  if (root) writeFileSync(join(pkg, "package.json"), JSON.stringify(root))
  if (studio) writeFileSync(join(pkg, "studio", "package.json"), JSON.stringify(studio))
  return join(pkg, "studio")
}

describe("studioVersion", () => {
  test("reads the marketing-cli package that contains studio/", () => {
    const dir = layout({ name: "marketing-cli", version: "9.9.9" }, { name: "mktg-studio", version: "0.5.4" })
    expect(studioVersion(dir)).toBe("9.9.9")
  })

  test("falls back to studio/package.json when the parent is not marketing-cli", () => {
    const dir = layout({ name: "someone-else", version: "3.0.0" }, { name: "mktg-studio", version: "0.5.4" })
    expect(studioVersion(dir)).toBe("0.5.4")
  })

  test("returns unknown when neither file can be read", () => {
    expect(studioVersion(layout(null, null))).toBe("unknown")
  })
})

describe("mktg-studio --version", () => {
  test("prints the marketing-cli version, the same one /api/health reports", async () => {
    const rootVersion = (JSON.parse(readFileSync(join(STUDIO_ROOT, "..", "package.json"), "utf8")) as { version: string }).version
    const proc = Bun.spawn({
      cmd: [process.execPath, "--no-env-file", "run", join(STUDIO_ROOT, "bin", "mktg-studio.ts"), "--version"],
      stdout: "pipe",
      stderr: "pipe",
    })
    const stdout = await new Response(proc.stdout).text()
    expect(await proc.exited).toBe(0)
    expect(stdout.trim()).toBe(`mktg-studio ${rootVersion}`)
  }, 60_000)
})
