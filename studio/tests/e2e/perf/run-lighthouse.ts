// Orchestrator: builds Studio, boots `next start` in production mode, then
// shells out to Lighthouse three times per route (cold, warm, cache) for
// the five routes named in task #36. Writes JSON outputs into
// tests/e2e/perf/runs/ for the bun:test assertion file to consume.
//
// Lives as a standalone bun script (not a bun:test fixture) because
// running 15 sequential Chrome spawns inside the bun:test runtime made
// the test process silently abort on macOS, leaving no diagnostic output.
// Shelling out from a plain bun script gives us deterministic exit codes
// and full stdout/stderr capture.
//
// Usage: bun run tests/e2e/perf/run-lighthouse.ts [--no-build] [--routes=/]

import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const HERE = import.meta.dir
const STUDIO_ROOT = resolve(HERE, "..", "..", "..")
const REPO_ROOT = resolve(STUDIO_ROOT, "..")
const RUNS_DIR = resolve(HERE, "runs")
const PORT = 4178
const BASE = `http://localhost:${PORT}`
const NEXT_BIN = resolve(REPO_ROOT, "node_modules", ".bin", "next")
const LIGHTHOUSE_BIN = resolve(REPO_ROOT, "node_modules", ".bin", "lighthouse")
const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const ALL_ROUTES = ["/", "/onboarding", "/dashboard", "/settings", "/skills"]

const args = process.argv.slice(2)
const skipBuild = args.includes("--no-build")
const routesFlag = args.find((a) => a.startsWith("--routes="))
const ROUTES = routesFlag
  ? routesFlag.replace("--routes=", "").split(",")
  : ALL_ROUTES

mkdirSync(RUNS_DIR, { recursive: true })

function killPort(port: number): void {
  spawnSync("/bin/sh", ["-c", `lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | xargs -I{} kill -9 {} 2>/dev/null; true`])
}

function safeName(routePath: string): string {
  return routePath === "/" ? "root" : routePath.replace(/^\//, "").replace(/\//g, "_")
}

async function waitForReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/onboarding`, { signal: AbortSignal.timeout(1000) })
      if (res.status === 200) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Studio not ready on ${BASE} within ${timeoutMs}ms`)
}

const PERF_DIST_DIR = ".next-perf"

function build(): void {
  const probe = join(STUDIO_ROOT, PERF_DIST_DIR, "server", "app", "(dashboard)", "dashboard", "page.js")
  if (skipBuild && existsSync(probe)) {
    console.log(`[perf] reusing existing build at ${probe}`)
    return
  }
  console.log(`[perf] running next build (distDir=${PERF_DIST_DIR})...`)
  const res = spawnSync(NEXT_BIN, ["build"], {
    cwd: STUDIO_ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 240_000,
    env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: PERF_DIST_DIR },
  })
  if (res.status !== 0) {
    console.error(res.stdout)
    console.error(res.stderr)
    throw new Error(`next build failed (exit ${res.status})`)
  }
  if (!existsSync(probe)) throw new Error(`build done but ${probe} missing`)
  console.log(`[perf] build ok`)
}

function runLighthouse(routePath: string, mode: "cold" | "warm" | "cache"): void {
  const outPath = join(RUNS_DIR, `${safeName(routePath)}-${mode}-1.json`)
  const userDataDir = join(RUNS_DIR, `chrome-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  const chromeFlags = [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--ignore-certificate-errors",
    `--user-data-dir=${userDataDir}`,
  ].join(" ")
  const lhArgs = [
    `${BASE}${routePath}`,
    "--output=json",
    `--output-path=${outPath}`,
    "--quiet",
    "--preset=desktop",
    "--only-categories=performance",
    `--chrome-flags=${chromeFlags}`,
    "--throttling-method=devtools",
    "--throttling.cpuSlowdownMultiplier=1",
    "--throttling.requestLatencyMs=0",
    "--throttling.downloadThroughputKbps=0",
    "--throttling.uploadThroughputKbps=0",
    "--max-wait-for-load=30000",
  ]
  if (mode === "cache") lhArgs.push("--disable-storage-reset")

  console.log(`[perf] lighthouse ${routePath} (${mode}) ...`)
  const res = spawnSync(LIGHTHOUSE_BIN, lhArgs, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 90_000,
    env: { ...process.env, CHROME_PATH: CHROME_BIN },
  })

  spawnSync("/bin/rm", ["-rf", userDataDir])

  if (!existsSync(outPath)) {
    console.error(`[perf] FAILED to write ${outPath}`)
    console.error(`stderr: ${res.stderr?.slice(0, 500) ?? ""}`)
    return
  }
  let parsed: unknown = null
  try { parsed = JSON.parse(readFileSync(outPath, "utf-8")) } catch {}
  const r = parsed as { runtimeError?: { code?: string; message?: string }; audits?: Record<string, { numericValue?: number }>; categories?: { performance?: { score?: number } } } | null
  if (r?.runtimeError) {
    console.warn(`[perf] PageLoadError ${routePath} (${mode}): ${r.runtimeError.code} — ${r.runtimeError.message ?? ""}`)
    // Pre-warm and retry once
    void fetch(`${BASE}${routePath}`).catch(() => {})
    spawnSync(LIGHTHOUSE_BIN, lhArgs, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 90_000,
      env: { ...process.env, CHROME_PATH: CHROME_BIN },
    })
    return
  }
  const audits = r?.audits ?? {}
  const fcp = audits["first-contentful-paint"]?.numericValue
  const lcp = audits["largest-contentful-paint"]?.numericValue
  const tbt = audits["total-blocking-time"]?.numericValue
  const cls = audits["cumulative-layout-shift"]?.numericValue
  const perf = (r?.categories?.performance?.score ?? 0) * 100
  console.log(`[perf]   FCP=${fcp?.toFixed(0)}ms LCP=${lcp?.toFixed(0)}ms TBT=${tbt?.toFixed(0)}ms CLS=${cls?.toFixed(3)} score=${perf.toFixed(0)}`)
}

async function main(): Promise<void> {
  killPort(PORT)
  build()

  console.log(`[perf] starting next start on :${PORT} (distDir=${PERF_DIST_DIR})`)
  const proc = spawn(NEXT_BIN, ["start", "--port", String(PORT)], {
    cwd: STUDIO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: PERF_DIST_DIR },
  })
  proc.stdout?.on("data", () => {})
  proc.stderr?.on("data", () => {})

  try {
    await waitForReady(45_000)
    console.log(`[perf] server ready, running 3 modes x ${ROUTES.length} routes`)
    for (const route of ROUTES) {
      // Pre-warm before warm + cache modes; default ordering is cold → warm → cache.
      runLighthouse(route, "cold")
      await fetch(`${BASE}${route}`).catch(() => {})
      runLighthouse(route, "warm")
      runLighthouse(route, "cache")
    }
  } finally {
    if (proc && !proc.killed) proc.kill("SIGTERM")
    killPort(PORT)
  }

  // Final summary file the bun:test assertions read.
  const summary: Record<string, unknown> = { runAt: new Date().toISOString(), routes: {} }
  for (const route of ROUTES) {
    const lhRuns: Record<string, unknown> = {}
    for (const mode of ["cold", "warm", "cache"]) {
      const fp = join(RUNS_DIR, `${safeName(route)}-${mode}-1.json`)
      if (existsSync(fp)) {
        try {
          const raw = JSON.parse(readFileSync(fp, "utf-8"))
          lhRuns[mode] = {
            fcp_ms: raw.audits?.["first-contentful-paint"]?.numericValue ?? null,
            lcp_ms: raw.audits?.["largest-contentful-paint"]?.numericValue ?? null,
            tbt_ms: raw.audits?.["total-blocking-time"]?.numericValue ?? null,
            cls: raw.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
            perf_score: (raw.categories?.performance?.score ?? 0) * 100,
            runtimeError: raw.runtimeError?.code ?? null,
          }
        } catch (e) {
          lhRuns[mode] = { error: String(e) }
        }
      } else {
        lhRuns[mode] = { error: "no JSON written" }
      }
    }
    ;(summary.routes as Record<string, unknown>)[route] = lhRuns
  }
  writeFileSync(join(RUNS_DIR, "lighthouse-summary.json"), JSON.stringify(summary, null, 2))
  console.log(`[perf] wrote lighthouse-summary.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
