// tests/e2e/pulse/harness.ts
//
// Lane 5 E2E harness. Boots a real Bun server.ts with auth ENABLED (no
// MKTG_STUDIO_AUTH=disabled escape hatch), seeds the harness DB by running
// the real seeder script, and exposes auth helpers + raw DB access for the
// per-section staleSections tests.
//
// Pattern mirrors ironmint's tests/e2e/security/harness.ts so the suite
// boots quickly and tears down clean. Token comes from the server's
// MKTG_STUDIO_TOKEN_PATH file at boot, read back from disk.

import { spawn, type Subprocess } from "bun"
import { Database } from "bun:sqlite"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..")
const BOOT_TIMEOUT_MS = 20_000
const BOOT_POLL_MS = 100

export interface PulseHarness {
  /** Studio token written by the server on boot; required for every fetch. */
  readonly token: string
  /** Listening port (allocated per-suite). */
  readonly port: number
  /** `http://127.0.0.1:<port>` */
  readonly baseUrl: string
  /** Per-test temp project root. */
  readonly tempDir: string
  /** Absolute path to the per-test SQLite DB. */
  readonly dbPath: string
  /** Server child process. */
  readonly proc: Subprocess
  /** Spawn the seeder script against this harness's DB. */
  seed(args?: { reset?: boolean }): { stdout: string; stderr: string; status: number }
  /** Run a callback with a fresh DB handle on the harness DB. */
  withDb<T>(fn: (db: Database) => T): T
  /** Authed GET. Pulse only uses GET; POST helpers can be added later. */
  fetchAuthed(path: string, init?: RequestInit): Promise<Response>
  /** Build a `?token=` URL (for SSE-style consumers without headers). */
  withToken(path: string): string
  /** Bearer header. */
  bearer(): { Authorization: string }
  /** Teardown: kill server, remove temp dir. Idempotent. */
  teardown(): Promise<void>
}

export interface HarnessOptions {
  readonly port: number
  /** Skip the brand/ seed (default: minimal 10-file seed). */
  readonly skipBrandSeed?: boolean
  /** Skip the funnel-data seeder run (default: run it once at boot). */
  readonly skipFunnelSeed?: boolean
}

const BRAND_SEED: ReadonlyArray<readonly [string, string]> = [
  ["voice-profile.md", "# Brand voice\n\nDirect, plain-language. Test seed.\n"],
  ["audience.md",      "# Audience\n\nSolo builders shipping SaaS. Test seed.\n"],
  ["positioning.md",   "# Positioning\n\nTest seed.\n"],
  ["competitors.md",   "# Competitors\n\nTest seed.\n"],
  ["landscape.md",     "# Landscape\n\n## Claims Blacklist\n\n(empty)\n"],
  ["keyword-plan.md",  "# Keyword plan\n\nTest seed.\n"],
  ["creative-kit.md",  "# Creative kit\n\nTest seed.\n"],
  ["stack.md",         "# Stack\n\nTest seed.\n"],
  ["assets.md",        "# Assets\n\n"],
  ["learnings.md",     "# Learnings\n\n"],
]

export async function startPulseHarness(options: HarnessOptions): Promise<PulseHarness> {
  const tempDir = await mkdtemp(join(tmpdir(), "mktg-pulse-e2e-"))
  const tokenPath = join(tempDir, "studio-token")
  const dbPath = join(tempDir, "studio.sqlite")
  const brandDir = join(tempDir, "brand")

  if (!options.skipBrandSeed) {
    await mkdir(brandDir, { recursive: true })
    for (const [name, content] of BRAND_SEED) {
      await writeFile(join(brandDir, name), content)
    }
  }

  const env: Record<string, string> = {
    ...process.env,
    STUDIO_PORT: String(options.port),
    MKTG_STUDIO_TOKEN_PATH: tokenPath,
    MKTG_STUDIO_DB: dbPath,
    MKTG_PROJECT_ROOT: tempDir,
    MKTG_BRAND_DIR: brandDir,
  }
  // Critical: do NOT inherit MKTG_STUDIO_AUTH=disabled. The whole point of
  // this suite is to verify the real auth gate against the same handler the
  // production launcher hits.
  delete env.MKTG_STUDIO_AUTH
  delete env.MKTG_STUDIO_TOKEN

  const proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: REPO_ROOT,
    env,
    stdout: "pipe",
    stderr: "pipe",
  })

  const baseUrl = `http://127.0.0.1:${options.port}`
  const start = Date.now()
  let healthy = false
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    try {
      const r = await fetch(`${baseUrl}/api/health`)
      if (r.ok) {
        healthy = true
        break
      }
    } catch {
      // retry
    }
    await Bun.sleep(BOOT_POLL_MS)
  }
  if (!healthy) {
    const stderr = await new Response(proc.stderr).text().catch(() => "<stderr unreadable>")
    proc.kill("SIGKILL")
    await rm(tempDir, { recursive: true, force: true })
    throw new Error(`pulse harness: server did not come up on :${options.port}.\nStderr:\n${stderr}`)
  }

  const token = (await readFile(tokenPath, "utf-8")).trim()
  if (!token || token.length < 32) {
    proc.kill("SIGKILL")
    throw new Error(`studio-token not generated at ${tokenPath} (len=${token.length})`)
  }

  function fetchAuthed(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {})
    headers.set("Authorization", `Bearer ${token}`)
    return fetch(`${baseUrl}${path}`, { ...init, headers })
  }

  function withToken(path: string): string {
    const sep = path.includes("?") ? "&" : "?"
    return `${baseUrl}${path}${sep}token=${encodeURIComponent(token)}`
  }

  function bearer(): { Authorization: string } {
    return { Authorization: `Bearer ${token}` }
  }

  function seed(args: { reset?: boolean } = {}): { stdout: string; stderr: string; status: number } {
    const seederPath = join(REPO_ROOT, "scripts", "seed-pulse-series.ts")
    const cliArgs = ["run", seederPath, "--db", dbPath]
    if (args.reset !== false) cliArgs.push("--reset")
    const r = spawnSync("bun", cliArgs, { encoding: "utf-8", timeout: 30_000 })
    return {
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
      status: r.status ?? -1,
    }
  }

  function withDb<T>(fn: (db: Database) => T): T {
    const db = new Database(dbPath)
    try {
      return fn(db)
    } finally {
      db.close()
    }
  }

  let torn = false
  const teardown = async (): Promise<void> => {
    if (torn) return
    torn = true
    proc.kill("SIGINT")
    try {
      await Promise.race([proc.exited, Bun.sleep(2_000)])
    } catch {
      // ignored
    }
    if (proc.exitCode === null) proc.kill("SIGKILL")
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // ignored
    }
  }

  // Optional auto-seed at boot. Cheaper than running the spawn once per test
  // when the suite reads the snapshot in many tests.
  if (!options.skipFunnelSeed) {
    const r = seed({ reset: true })
    if (r.status !== 0) {
      await teardown()
      throw new Error(`pulse harness: seeder failed status=${r.status}\nstderr:\n${r.stderr}`)
    }
  }

  return {
    token,
    port: options.port,
    baseUrl,
    tempDir,
    dbPath,
    proc,
    seed,
    withDb,
    fetchAuthed,
    withToken,
    bearer,
    teardown,
  }
}

/** Per-suite ports. Bump when adding new files. */
export const PORTS = {
  snapshot:       38301,
  staleSections:  38302,
  playwright:     38303,
} as const
