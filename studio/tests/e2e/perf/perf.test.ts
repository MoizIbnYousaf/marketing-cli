// Lane 7 E2E perf assertions. Reads the Lighthouse JSON outputs that
// `tests/e2e/perf/run-lighthouse.ts` writes, asserts the four Web Vitals
// thresholds the team-lead set in the task brief, and inspects the
// production .next chunks for per-route bundle byte budgets and
// optimizePackageImports tree-shaking evidence.
//
// Run order (no mocks anywhere — real Chrome, real `next build`, real
// `next start`, real chunks on disk):
//
//   1. bun run tests/e2e/perf/run-lighthouse.ts
//   2. bun test tests/e2e/perf/perf.test.ts
//
// The split exists because spawning 15 sequential Chrome instances inside
// the bun:test runtime crashed the test process on macOS without writing
// any output. A standalone Bun script is more resilient.

import { describe, test, expect, beforeAll } from "bun:test"
import { spawnSync } from "node:child_process"
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

const STUDIO_ROOT = resolve(import.meta.dir, "..", "..", "..")
const RUNS_DIR = resolve(import.meta.dir, "runs")

const ROUTES = [
  { path: "/", name: "root" },
  { path: "/onboarding", name: "onboarding" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/settings", name: "settings" },
  { path: "/skills", name: "skills" },
] as const

const VITAL_THRESHOLDS = {
  fcp_ms: 1500,
  lcp_ms: 2500,
  tbt_ms: 300,
  cls: 0.1,
}

// Per-route raw uncompressed byte budgets. Numbers sit ~25% above the
// observed post-Wave-B baseline so a regression catches before it ships.
// Pre-Wave-A baseline /dashboard was 524.6 kB, post-Wave-B is 404.0 kB.
const BUNDLE_BUDGETS = {
  "/": { jsKb: 320, cssKb: 200 },
  "/onboarding": { jsKb: 420, cssKb: 200 },
  "/dashboard": { jsKb: 480, cssKb: 200 },
  "/settings": { jsKb: 480, cssKb: 200 },
  "/skills": { jsKb: 480, cssKb: 200 },
} as const

// =====================================================================
// Lighthouse Web Vitals
// =====================================================================

function safeName(routePath: string): string {
  return routePath === "/" ? "root" : routePath.replace(/^\//, "").replace(/\//g, "_")
}

function readLighthouse(routePath: string, mode: "cold" | "warm" | "cache"): {
  fcp_ms: number
  lcp_ms: number
  tbt_ms: number
  cls: number
  perfScore: number
  runtimeError: string | null
} {
  const fp = join(RUNS_DIR, `${safeName(routePath)}-${mode}-1.json`)
  if (!existsSync(fp)) {
    throw new Error(
      `Lighthouse JSON missing at ${fp}. ` +
      `Run \`bun run tests/e2e/perf/run-lighthouse.ts\` before invoking this suite.`,
    )
  }
  const raw = JSON.parse(readFileSync(fp, "utf-8")) as {
    runtimeError?: { code?: string; message?: string }
    audits?: Record<string, { numericValue?: number }>
    categories?: { performance?: { score?: number } }
  }
  const audits = raw.audits ?? {}
  return {
    fcp_ms: audits["first-contentful-paint"]?.numericValue ?? -1,
    lcp_ms: audits["largest-contentful-paint"]?.numericValue ?? -1,
    tbt_ms: audits["total-blocking-time"]?.numericValue ?? -1,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? -1,
    perfScore: (raw.categories?.performance?.score ?? 0) * 100,
    runtimeError: raw.runtimeError?.code ?? null,
  }
}

describe("Lane 7 perf — Lighthouse Web Vitals (real Chrome via run-lighthouse.ts)", () => {
  for (const route of ROUTES) {
    for (const mode of ["cold", "warm", "cache"] as const) {
      test(`${route.path} ${mode} run meets vital thresholds`, () => {
        const r = readLighthouse(route.path, mode)
        if (r.runtimeError) {
          throw new Error(`Lighthouse PageLoadError on ${route.path} (${mode}): ${r.runtimeError}`)
        }
        expect(r.fcp_ms).toBeGreaterThan(0)
        expect(r.fcp_ms).toBeLessThan(VITAL_THRESHOLDS.fcp_ms)
        expect(r.lcp_ms).toBeLessThan(VITAL_THRESHOLDS.lcp_ms)
        expect(r.tbt_ms).toBeLessThan(VITAL_THRESHOLDS.tbt_ms)
        expect(r.cls).toBeLessThan(VITAL_THRESHOLDS.cls)
      })
    }
  }
})

// =====================================================================
// Bundle byte budgets (real .next/server/app/<route>/page_client-reference-manifest.js)
// =====================================================================

type BundleNumbers = { chunks: number; jsBytes: number; cssBytes: number; chunkPaths: string[] }

function balancedJson(input: string): string {
  let depth = 0
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "{") depth++
    else if (input[i] === "}") {
      depth--
      if (depth === 0) return input.slice(0, i + 1)
    }
  }
  throw new Error("unbalanced JSON object")
}

// The orchestrator builds into .next-perf to dodge a concurrent `next dev`
// in another teammate's lane that wipes .next/server/ mid-test.
const PERF_DIST = process.env.NEXT_DIST_DIR || ".next-perf"

function chunkSize(relPath: string): number {
  const p = join(STUDIO_ROOT, PERF_DIST, relPath)
  try { return statSync(p).size } catch { return 0 }
}

function readBundle(routePath: string): BundleNumbers {
  const manifestPathByRoute: Record<string, string> = {
    "/": "page",
    "/onboarding": "onboarding/page",
    "/dashboard": "(dashboard)/dashboard/page",
    "/settings": "(dashboard)/settings/page",
    "/skills": "(dashboard)/skills/page",
  }
  const tail = manifestPathByRoute[routePath]
  if (!tail) throw new Error(`No manifest mapping for ${routePath}`)
  const fp = join(STUDIO_ROOT, PERF_DIST, "server", "app", `${tail}_client-reference-manifest.js`)
  const content = readFileSync(fp, "utf-8")
  const idx = content.indexOf('"entryJSFiles":')
  if (idx === -1) throw new Error(`No entryJSFiles in ${fp}`)
  const block = balancedJson(content.slice(idx + '"entryJSFiles":'.length))
  const obj = JSON.parse(block) as Record<string, string[]>
  const allJs = new Set<string>()
  for (const arr of Object.values(obj)) for (const c of arr) allJs.add(c)

  const cssIdx = content.indexOf('"entryCSSFiles":')
  let allCss = new Set<string>()
  if (cssIdx !== -1) {
    const cssBlock = balancedJson(content.slice(cssIdx + '"entryCSSFiles":'.length))
    const cssObj = JSON.parse(cssBlock) as Record<string, Array<{ path: string; inlined: boolean }>>
    for (const arr of Object.values(cssObj)) for (const c of arr) if (c.path) allCss.add(c.path)
  }

  let jsBytes = 0
  for (const c of allJs) jsBytes += chunkSize(c)
  let cssBytes = 0
  for (const c of allCss) cssBytes += chunkSize(c)
  return { chunks: allJs.size, jsBytes, cssBytes, chunkPaths: [...allJs] }
}

describe("Lane 7 perf — per-route bundle byte budgets (real .next chunks)", () => {
  for (const [routePath, budget] of Object.entries(BUNDLE_BUDGETS)) {
    test(`bundle for ${routePath} stays within budget`, () => {
      const b = readBundle(routePath)
      expect(b.chunks).toBeGreaterThan(0)
      expect(b.jsBytes / 1024).toBeLessThanOrEqual(budget.jsKb)
      expect(b.cssBytes / 1024).toBeLessThanOrEqual(budget.cssKb)
    })
  }

  test("bundle snapshot recorded for REPORT.md", () => {
    const snapshot: Record<string, unknown> = { recordedAt: new Date().toISOString(), routes: {} }
    for (const route of ROUTES) {
      try {
        const b = readBundle(route.path)
        ;(snapshot.routes as Record<string, unknown>)[route.path] = {
          chunks: b.chunks,
          jsKb: +(b.jsBytes / 1024).toFixed(1),
          cssKb: +(b.cssBytes / 1024).toFixed(1),
        }
      } catch (e) {
        ;(snapshot.routes as Record<string, unknown>)[route.path] = { error: String(e) }
      }
    }
    Bun.write(join(RUNS_DIR, "bundle-snapshot.json"), JSON.stringify(snapshot, null, 2))
    expect(Object.keys(snapshot.routes as object).length).toBe(ROUTES.length)
  })
})

// =====================================================================
// Tree-shake assertions: optimizePackageImports must elide un-imported
// icons / chart primitives. Probe sets are verified absent from source
// before being checked against compiled chunks.
// =====================================================================

function readAllChunkBytes(): string {
  const dir = join(STUDIO_ROOT, PERF_DIST, "static", "chunks")
  let combined = ""
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue
    combined += readFileSync(join(dir, f), "utf-8")
  }
  return combined
}

function readSourceImports(): string {
  const dirs = [
    join(STUDIO_ROOT, "components"),
    join(STUDIO_ROOT, "app"),
    join(STUDIO_ROOT, "lib"),
  ]
  let combined = ""
  for (const root of dirs) walk(root, (p) => {
    if (p.endsWith(".ts") || p.endsWith(".tsx")) combined += readFileSync(p, "utf-8")
  })
  return combined
}

function walk(dir: string, fn: (p: string) => void): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fp = join(dir, entry.name)
    if (entry.isDirectory()) walk(fp, fn)
    else fn(fp)
  }
}

describe("Lane 7 perf — optimizePackageImports tree-shake verification", () => {
  let chunks = ""
  let source = ""

  beforeAll(() => {
    chunks = readAllChunkBytes()
    source = readSourceImports()
  })

  // 8 lucide-react icons that are NOT in the studio source (verified at
  // task-pickup time via grep across components/, app/, lib/).
  const probeLucide = ["Anchor", "Anvil", "Caravan", "Cherry", "Donut", "Drumstick", "Pyramid", "Volcano"]

  test("studio source does not import the probe-set lucide icons", () => {
    for (const icon of probeLucide) {
      const iconRe = new RegExp(`[{,\\s]${icon}[,\\s}]`)
      if (iconRe.test(source)) {
        throw new Error(`probe icon "${icon}" is imported in source — pick a different probe`)
      }
    }
  })

  test("compiled chunks do not contain un-imported lucide icons", () => {
    const found: string[] = []
    for (const icon of probeLucide) {
      const re = new RegExp(`displayName\\s*[:=]\\s*['"]${icon}['"]|\\b${icon}\\b\\s*[=]\\s*\\(\\s*\\(\\s*ref`, "")
      if (re.test(chunks)) found.push(icon)
    }
    if (found.length > 0) {
      throw new Error(`lucide-react tree-shake failed — un-imported icons in chunks: ${found.join(", ")}`)
    }
  })

  test("compiled chunks do not contain un-imported recharts components", () => {
    const probe = ["BarChart", "PieChart", "RadarChart", "Treemap", "Sankey"]
    const found: string[] = []
    for (const sym of probe) {
      const importRe = new RegExp(`from\\s+["']recharts["'][^]*?\\b${sym}\\b`)
      if (importRe.test(source)) continue
      const re = new RegExp(`function\\s+${sym}\\s*\\(|\\b${sym}\\$1\\s*=`, "")
      if (re.test(chunks)) found.push(sym)
    }
    if (found.length > 0) {
      throw new Error(`recharts tree-shake failed — un-imported components in chunks: ${found.join(", ")}`)
    }
  })

  test("next.config.ts optimizePackageImports list contains all 6 packages from Wave A", () => {
    const cfg = readFileSync(join(STUDIO_ROOT, "next.config.ts"), "utf-8")
    for (const pkg of ["framer-motion", "lucide-react", "recharts", "react-markdown", "cmdk", "radix-ui"]) {
      expect(cfg.includes(`"${pkg}"`)).toBe(true)
    }
  })
})
