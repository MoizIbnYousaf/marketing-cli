// tests/e2e/onboarding/seed-demo-urls.test.ts
//
// Lane 8 E2E coverage for the demo seed URL audit (Wave B fix #5).
// Real `bun run scripts/seed-demo.ts` against a real ephemeral marketing.db,
// then read back every row that ships a URL and assert:
//   1. No URL points at a real domain (tiktok.com, twitter.com, bain.com,
//      reddit.com, stripe.com, vercel.com, instagram.com, ycombinator.com,
//      google.com, github.com).
//   2. Every URL uses the demo.local sentinel host.
//   3. No row contains the legacy "Parallel" brand-name leak.
// No mocks: real seeder, real bun:sqlite reads.

import { test, expect, beforeEach, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdtempSync, mkdirSync, rmSync, copyFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, "..", "..", "..")
const SCHEMA_SQL = join(REPO_ROOT, "db", "schema.sql")
const SEEDER = join(REPO_ROOT, "scripts", "seed-demo.ts")

let workDir: string
let dbPath: string

const REAL_DOMAIN_HOSTS = [
  "tiktok.com",
  "twitter.com",
  "x.com",
  "bain.com",
  "reddit.com",
  "stripe.com",
  "vercel.com",
  "instagram.com",
  "ycombinator.com",
  "trends.google.com",
  "github.com",
] as const

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), "mktg-seed-"))
  dbPath = join(workDir, "marketing.db")

  // Materialize an empty schema-shaped DB so the seeder can open it.
  // Real schema, not a mock: copies the production schema.sql verbatim.
  const db = new Database(dbPath)
  db.exec("PRAGMA journal_mode=WAL")
  const schema = await Bun.file(SCHEMA_SQL).text()
  db.exec(schema)
  db.close()
})

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true })
})

async function runSeeder(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", SEEDER, "--reset"], {
    cwd: workDir,
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

function readDb<T>(query: string): T[] {
  const db = new Database(dbPath, { readonly: true })
  const rows = db.prepare(query).all() as T[]
  db.close()
  return rows
}

test("Case 1: seeder runs cleanly against a fresh schema", async () => {
  const result = await runSeeder()
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("signals: 20")
  expect(result.stdout).toContain("opportunities: 5")
  expect(result.stdout).toContain("publish: 6")

  const counts = readDb<{ name: string; n: number }>(
    `SELECT 'signals' AS name, COUNT(*) AS n FROM signals
     UNION ALL SELECT 'opportunities', COUNT(*) FROM opportunities
     UNION ALL SELECT 'activity', COUNT(*) FROM activity
     UNION ALL SELECT 'briefs', COUNT(*) FROM briefs
     UNION ALL SELECT 'publish_log', COUNT(*) FROM publish_log`,
  )
  const byName = Object.fromEntries(counts.map((c) => [c.name, c.n]))
  expect(byName.signals).toBe(20)
  expect(byName.opportunities).toBe(5)
  expect(byName.activity).toBe(10)
  expect(byName.briefs).toBe(3)
  expect(byName.publish_log).toBe(6)
})

test("Case 2: every signals.url uses demo.local, no real-domain hosts", async () => {
  const result = await runSeeder()
  expect(result.exitCode).toBe(0)

  const rows = readDb<{ id: number; platform: string; url: string }>(
    "SELECT id, platform, url FROM signals WHERE url IS NOT NULL",
  )
  expect(rows.length).toBe(20)

  for (const row of rows) {
    let parsed: URL
    try {
      parsed = new URL(row.url)
    } catch (e) {
      throw new Error(
        `signals[id=${row.id}, platform=${row.platform}] has unparseable URL: ${row.url}`,
      )
    }
    expect(parsed.hostname, `signals[id=${row.id}] should use demo.local`).toBe("demo.local")
    for (const real of REAL_DOMAIN_HOSTS) {
      expect(parsed.hostname.endsWith(real)).toBe(false)
    }
  }
})

test("Case 3: no row anywhere contains the legacy 'Parallel' brand-name leak", async () => {
  const result = await runSeeder()
  expect(result.exitCode).toBe(0)

  // Sweep every text-bearing column in every seeded table.
  const checks: Array<{ table: string; columns: string[] }> = [
    { table: "signals", columns: ["content", "url"] },
    { table: "opportunities", columns: ["reason"] },
    { table: "activity", columns: ["summary", "files_changed", "meta"] },
    { table: "briefs", columns: ["title", "content"] },
    { table: "publish_log", columns: ["content_preview"] },
  ]

  for (const { table, columns } of checks) {
    const cols = columns.join(", ")
    const rows = readDb<Record<string, string | null>>(
      `SELECT id, ${cols} FROM ${table}`,
    )
    for (const row of rows) {
      for (const col of columns) {
        const value = row[col] ?? ""
        // Word-boundary match to avoid false positives on fragments like
        // "in parallel" (lowercase, used legitimately in copy).
        expect(
          /\bParallel\b/.test(value),
          `${table}[id=${row.id}].${col} contains 'Parallel': ${JSON.stringify(value).slice(0, 200)}`,
        ).toBe(false)
      }
    }
  }
})

test("Case 4: publish_log content_preview names DemoCo (the deliberate fake), not a real brand", async () => {
  // The Wave B fix renamed "Parallel" to "DemoCo" specifically so a viewer
  // who screencaps the dashboard cannot mistake the seed for their own
  // brand. Asserts the rename actually landed in the row that goldthread's
  // audit flagged (seed-demo.ts:167 in the original file).
  await runSeeder()

  const rows = readDb<{ content_preview: string }>(
    "SELECT content_preview FROM publish_log WHERE content_preview LIKE '%newsletter%'",
  )
  expect(rows.length).toBeGreaterThanOrEqual(1)
  const newsletterRow = rows.find((r) => r.content_preview.includes("newsletter"))
  expect(newsletterRow).toBeDefined()
  expect(newsletterRow!.content_preview).toContain("DemoCo")
  expect(newsletterRow!.content_preview).not.toContain("Parallel")
})

test("Case 5: created_at is non-null on every seeded row and survives a 7-day window query", async () => {
  // Cross-lane regression guard: silverspark's seed-pulse-series.ts hit a
  // Bun SQLite bind quirk where `datetime('now', ?)` inside an INSERT's
  // VALUES silently bound NULL when the surrounding values were SQL
  // literals (`0`, `'pending'`, etc.). seed-demo.ts uses `?` for every
  // other column so it does not trip the bug today, but this test pins
  // the contract: if a future refactor mixes literals in, this case fails
  // loudly long before any UI surfaces it. Mirrors the canonical test at
  // tests/unit/pulse-snapshot.test.ts that silverspark added.
  await runSeeder()

  const tables = ["signals", "opportunities", "activity", "briefs", "publish_log"] as const

  for (const t of tables) {
    const nulls = readDb<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${t} WHERE created_at IS NULL`,
    )
    expect(
      nulls[0]!.n,
      `${t} should have zero rows with a NULL created_at; the SQLite bind quirk silently sets created_at=NULL when datetime('now', ?) is mixed with SQL literals`,
    ).toBe(0)
  }

  // Date-windowed query must return a non-zero count for every demo
  // table -- this is exactly the shape that surfaced silverspark's bug
  // in production (the funnel SQL filtered by date, the count came back
  // zero, the cause was NULL created_at on every row). Every demo row is
  // staggered backwards from now by less than 7 days by the seeder.
  const expectedCounts: Record<string, number> = {
    signals: 20,
    opportunities: 5,
    activity: 10,
    briefs: 3,
    publish_log: 6,
  }
  for (const t of tables) {
    const within = readDb<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${t} WHERE created_at >= datetime('now', '-7 days')`,
    )
    expect(
      within[0]!.n,
      `${t} 7-day window should return ${expectedCounts[t]} rows; got ${within[0]!.n}. Smaller-than-expected counts indicate the SQLite datetime-bind regression.`,
    ).toBe(expectedCounts[t]!)
  }
})

test("Case 6: no em-dash (U+2014) in any seeded row", async () => {
  // Independent of the lint hook: the seed flows directly into the live
  // dashboard, so the no-em-dash rule has to hold inside the database too.
  // Wave A's em-dash linter only watches the source tree; this guards the
  // runtime.
  await runSeeder()

  const checks: Array<{ table: string; columns: string[] }> = [
    { table: "signals", columns: ["content", "url"] },
    { table: "opportunities", columns: ["reason"] },
    { table: "activity", columns: ["summary"] },
    { table: "briefs", columns: ["title", "content"] },
    { table: "publish_log", columns: ["content_preview"] },
  ]

  for (const { table, columns } of checks) {
    const cols = columns.join(", ")
    const rows = readDb<Record<string, string | null>>(
      `SELECT id, ${cols} FROM ${table}`,
    )
    for (const row of rows) {
      for (const col of columns) {
        const value = row[col] ?? ""
        expect(
          value.includes("—"),
          `${table}[id=${row.id}].${col} contains em-dash: ${JSON.stringify(value).slice(0, 200)}`,
        ).toBe(false)
      }
    }
  }
})
