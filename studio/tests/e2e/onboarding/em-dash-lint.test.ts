// tests/e2e/onboarding/em-dash-lint.test.ts
//
// Lane 8 E2E coverage for the em-dash CI hook (Wave A).
// Real `bun run scripts/check-no-em-dash.ts` run against the real studio
// tree. Each case writes a real file into a watched directory, invokes the
// real script via `Bun.spawn`, asserts on the real exit code, and cleans
// up. No mocks, no fake stdout.

import { test, expect, beforeEach, afterEach } from "bun:test"
import { writeFileSync, unlinkSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, "..", "..", "..")
const SCRIPT = join(REPO_ROOT, "scripts", "check-no-em-dash.ts")

// Use unique-but-distinctive filenames so a crashed test does not leave
// generic test files lying around. The afterEach hook deletes whichever it
// finds.
const SENTINEL_NAME = "__em-dash-lint-test-sentinel.tsx"
const FILES_TO_CLEAN = [
  join(REPO_ROOT, "app", SENTINEL_NAME),
  join(REPO_ROOT, "components", SENTINEL_NAME),
  join(REPO_ROOT, "lib", SENTINEL_NAME),
  // tests/ is in IGNORED_SEGMENTS, so a sentinel here should NOT trigger.
  join(REPO_ROOT, "tests", SENTINEL_NAME),
]

beforeEach(() => {
  for (const f of FILES_TO_CLEAN) {
    if (existsSync(f)) unlinkSync(f)
  }
})

afterEach(() => {
  for (const f of FILES_TO_CLEAN) {
    if (existsSync(f)) unlinkSync(f)
  }
})

async function runLint(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const exitCode = await proc.exited
  return { exitCode, stdout, stderr }
}

const EM_DASH = "—"

test("Case 1: clean tree (no sentinel files written) lints green", async () => {
  // Pre-condition: Wave A swept the entire production tree. Running the
  // hook against an unmodified studio/ should exit 0 and report a count.
  const result = await runLint()
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("clean")
  // Count is reported in the success line so a regression in the walker
  // (e.g. WATCHED_DIRS resolves to nothing) shows up as 0 files scanned.
  expect(result.stdout).toMatch(/scanned \d+ file\(s\)/)
})

test("Case 2: em-dash in app/ fails the lint", async () => {
  const target = join(REPO_ROOT, "app", SENTINEL_NAME)
  writeFileSync(
    target,
    `// sentinel ${EM_DASH} this file is created by tests and removed in afterEach\n`,
    "utf-8",
  )

  const result = await runLint()
  expect(result.exitCode).not.toBe(0)
  // The script writes the failure summary to stderr.
  expect(result.stderr).toContain("FAIL")
  expect(result.stderr).toContain(SENTINEL_NAME)
  // And the dirs it polices are listed in the failure message.
  expect(result.stderr).toContain("app, components, lib, bin")
})

test("Case 3: em-dash in components/ fails the lint", async () => {
  const target = join(REPO_ROOT, "components", SENTINEL_NAME)
  writeFileSync(
    target,
    `export const NOTE = "comment ${EM_DASH} with em-dash"\n`,
    "utf-8",
  )

  const result = await runLint()
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain(SENTINEL_NAME)
})

test("Case 4: em-dash in lib/ fails the lint (Wave A scope expansion check)", async () => {
  // Pre-Wave A this directory was unwatched. Asserts the Wave A WATCHED_DIRS
  // expansion stuck.
  const target = join(REPO_ROOT, "lib", SENTINEL_NAME)
  writeFileSync(
    target,
    `// lib comment ${EM_DASH} should fail\n`,
    "utf-8",
  )

  const result = await runLint()
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain(SENTINEL_NAME)
})

test("Case 5: em-dash inside tests/ does NOT fail (IGNORED_SEGMENTS preserved)", async () => {
  // The em-dash linter explicitly ignores tests/, e2e/, scripts/, etc.
  // Test-only fixture data and test-only inputs are allowed to use rich
  // punctuation. This test guards against an over-eager scope expansion
  // that would break every existing test fixture.
  const target = join(REPO_ROOT, "tests", SENTINEL_NAME)
  writeFileSync(
    target,
    `// test fixture ${EM_DASH} ignored by walker\n`,
    "utf-8",
  )

  const result = await runLint()
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("clean")
})
