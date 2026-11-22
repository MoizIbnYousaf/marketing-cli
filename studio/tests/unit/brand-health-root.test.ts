// tests/unit/brand-health-root.test.ts
//
// Settings > Brand health must describe the user's project, not the brand/
// directory that ships inside the Studio package. Real files in a temp
// project; the component's own data function.

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readBrandStats } from "../../components/settings/brand-health-section"

let project: string
const saved = { root: process.env.MKTG_PROJECT_ROOT, brand: process.env.MKTG_BRAND_DIR }

beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "mktg-brand-health-"))
  mkdirSync(join(project, "brand"))
  writeFileSync(join(project, "brand", "voice-profile.md"), `# Voice\n\n${"Plain and direct. ".repeat(10)}\n`, "utf8")
  process.env.MKTG_PROJECT_ROOT = project
  delete process.env.MKTG_BRAND_DIR
})

afterAll(() => {
  if (saved.root === undefined) delete process.env.MKTG_PROJECT_ROOT
  else process.env.MKTG_PROJECT_ROOT = saved.root
  if (saved.brand !== undefined) process.env.MKTG_BRAND_DIR = saved.brand
  rmSync(project, { recursive: true, force: true })
})

describe("brand health reads the project's brand directory", () => {
  test("reports the project's files, not studio/brand", async () => {
    const stats = await readBrandStats()
    const byFile = Object.fromEntries(stats.map((s) => [s.spec.file, s.status]))
    expect(byFile["voice-profile.md"]).toBe("populated")
    expect(byFile["audience.md"]).toBe("missing")
    expect(stats.filter((s) => s.status === "missing").length).toBe(stats.length - 1)
  })
})
