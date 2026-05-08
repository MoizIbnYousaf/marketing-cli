# Lane 7 — E2E Performance Report

Real Lighthouse runs against a real production-built Studio booted on a real Bun-served port, real Chrome (`--headless=new`), real `.next-perf/` chunk graph on disk, real source-tree grep for tree-shake probes. No mocks. No fake data.

## How to reproduce

```
cd marketing-cli/studio
bun run tests/e2e/perf/run-lighthouse.ts          # builds + boots + runs 15 Lighthouse passes (~3-5 min)
NEXT_DIST_DIR=.next-perf bun test tests/e2e/perf/perf.test.ts
```

Two-step shape because spawning 15 sequential Chrome instances inside the bun:test runtime crashed the test process on macOS without diagnostic output. The orchestrator script (`run-lighthouse.ts`) writes Lighthouse JSON to `tests/e2e/perf/runs/`; the bun:test file (`perf.test.ts`) asserts against those JSONs plus the `.next-perf` bundle on disk.

The orchestrator builds into `.next-perf` rather than the default `.next` because a concurrently running `next dev` (from another lane's E2E suite) was wiping `.next/server/` mid-test. The new `distDir: process.env.NEXT_DIST_DIR || ".next"` in `next.config.ts:31` makes the override clean.

## Test inventory

| Group | Cases | Pass |
|---|---|---|
| Lighthouse Web Vitals | 15 (5 routes × {cold, warm, cache}) | 15/15 |
| Per-route bundle byte budgets | 5 + 1 snapshot | 6/6 |
| optimizePackageImports tree-shake | 4 | 4/4 |
| **Total** | **25** | **25/25** |

`bun test tests/e2e/perf/perf.test.ts` reports 25 pass / 0 fail / 97 expect() calls in 86 ms.

## Lighthouse Web Vitals

Thresholds from task #36 brief: FCP < 1500 ms, LCP < 2500 ms, TBT < 300 ms, CLS < 0.1. All five routes are well below every threshold across all three modes (cold = clean profile, warm = post pre-fetch, cache = `--disable-storage-reset`).

| Route | Mode | FCP ms | LCP ms | TBT ms | CLS | Perf |
|---|---|---|---|---|---|---|
| / | cold | 277 | 591 | 0 | 0.0083 | 100 |
| / | warm | 203 | 543 | 0 | 0.0004 | 100 |
| / | cache | 221 | 573 | 0 | 0.0083 | 100 |
| /onboarding | cold | 113 | 362 | 0 | 0.0000 | 100 |
| /onboarding | warm | 112 | 359 | 0 | 0.0000 | 100 |
| /onboarding | cache | 112 | 357 | 0 | 0.0000 | 100 |
| /dashboard | cold | 172 | 478 | 0 | 0.0083 | 100 |
| /dashboard | warm | 180 | 544 | 0 | 0.0083 | 100 |
| /dashboard | cache | 186 | 538 | 0 | 0.0083 | 100 |
| /settings | cold | 169 | 169 | 0 | 0.0083 | 100 |
| /settings | warm | 169 | 169 | 0 | 0.0083 | 100 |
| /settings | cache | 170 | 170 | 0 | 0.0083 | 100 |
| /skills | cold | 150 | 176 | 0 | 0.0083 | 100 |
| /skills | warm | 142 | 179 | 0 | 0.0083 | 100 |
| /skills | cache | 142 | 161 | 0 | 0.0083 | 100 |

Notes:
- Lighthouse desktop preset, `--throttling-method=devtools` with all throttling disabled (cpuSlowdownMultiplier=1, latency=0, throughput=0). Numbers reflect localhost-served performance, not field conditions.
- TBT is 0 ms across all 15 runs because no main-thread tasks exceeded the 50 ms long-task threshold during the post-load window.
- CLS of 0.0083 on most routes is the dashboard layout's chrome (sidebar transition + activity panel mount). Consistent and below threshold; worth investigating in a follow-up if the budget tightens.
- Each run uses a unique `--user-data-dir` (a freshly mkdtemp'd dir under `runs/chrome-<ts>-<rand>/`) so HSTS, safe-browsing reputation, and interstitial decisions never bleed between runs. Earlier shared-profile attempts failed with `CHROME_INTERSTITIAL_ERROR` on the second invocation against the same localhost URL.

Raw outputs: `tests/e2e/perf/runs/<route>-{cold,warm,cache}-1.json` (15 files, each is a full Lighthouse audit report with traces). Aggregated: `tests/e2e/perf/runs/lighthouse-summary.json`.

## Per-route bundle byte budgets

Real raw uncompressed byte counts from `.next-perf/server/app/<route>/page_client-reference-manifest.js` `entryJSFiles` + `entryCSSFiles`, summed against on-disk file sizes in `.next-perf/`.

| Route | Chunks | JS kB | CSS kB | JS budget | CSS budget |
|---|---|---|---|---|---|
| / | 10 | 261.4 | 162.8 | 320 | 200 |
| /onboarding | 12 | 352.6 | 162.8 | 420 | 200 |
| /dashboard | 15 | 404.4 | 162.8 | 480 | 200 |
| /settings | 15 | 409.2 | 162.8 | 480 | 200 |
| /skills | 15 | 392.0 | 162.8 | 480 | 200 |

Budgets sit ~25% above the post-Wave-B baseline so a regression catches before it ships. All five routes within budget. CSS sits at 162.8 kB on every route, up from the 155.8 kB I reported during Lane 7 closure (deepwave, darkbloom, neonpulse all landed Wave-B token wiring after my Wave A; +7 kB net is fair).

Pre-Wave-A baseline was `/dashboard` 524.6 kB JS + 192.6 kB CSS. Today: 404.4 kB JS + 162.8 kB CSS. Net change `/dashboard`: **-120.2 kB JS, -29.8 kB CSS, -150.0 kB total off the first paint**.

Aggregated: `tests/e2e/perf/runs/bundle-snapshot.json`.

## optimizePackageImports tree-shake verification

`next.config.ts:35-44` after Lane 7 Wave A:

```ts
optimizePackageImports: [
  "framer-motion",
  "lucide-react",
  "recharts",
  "react-markdown",
  "cmdk",
  "radix-ui",
],
```

Probe-set strategy: pick symbols from each barrel package that are NOT imported in `components/`, `app/`, or `lib/`. If the modular-import transform works, those symbols' compiled bytes are absent from `.next-perf/static/chunks/*.js`. If they appear, tree-shaking regressed.

### lucide-react probe set (8 icons)

`Anchor`, `Anvil`, `Caravan`, `Cherry`, `Donut`, `Drumstick`, `Pyramid`, `Volcano`.

- All 8 verified absent from `components/`, `app/`, `lib/` source via regex `[{,\s]<name>[,\s}]`.
- All 8 verified absent from compiled chunks via regex `displayName\s*[:=]\s*['"]<name>['"]|\b<name>\b\s*[=]\s*\(\s*\(\s*ref` (the two shapes the lucide-react compiled module emits per icon).
- **Verdict: tree-shake working** for lucide-react. None of the 8 unused icons ship.

### recharts probe set (5 components)

`BarChart`, `PieChart`, `RadarChart`, `Treemap`, `Sankey`.

- The studio source imports only `Area`, `AreaChart`, `ReferenceLine`, `ResponsiveContainer` from recharts (single use site at `components/workspace/signals/metric-chip.tsx:5`, which was deleted in Wave A; silverspark's Pulse rebuild re-introduced recharts via the new sparkline + funnel hero).
- All 5 probe components verified absent from compiled chunks via regex `function\s+<name>\s*\(|\b<name>\$1\s*=`.
- **Verdict: tree-shake working** for recharts.

### Config sanity

All six packages from Wave A still present in `optimizePackageImports`:

```
✓ "framer-motion"
✓ "lucide-react"
✓ "recharts"
✓ "react-markdown"
✓ "cmdk"
✓ "radix-ui"
```

Test asserts via `readFileSync("next.config.ts")` + literal `includes("\"<pkg>\"")` for each.

## Failure modes encountered (debugging trail)

Documenting the dead-ends so the next person doesn't repeat them:

1. **`bun x next start` ran dev mode**, not production. Swapped to direct binary path `node_modules/.bin/next`.
2. **`bun:test` silently aborted** mid-run after ~4 Chrome spawns — exit code 1 but only "bun test v1.3.8" written to stdout. Splitting Lighthouse into a standalone `run-lighthouse.ts` script fixed it.
3. **`CHROME_INTERSTITIAL_ERROR`** on the second Lighthouse invocation against the same URL. Caused by Chrome's safe-browsing / HSTS state persisting across runs in the default profile dir. Per-invocation unique `--user-data-dir` fixed it.
4. **`.next/server/` wiped mid-test** by another lane's `next dev` process holding `.next/dev/lock`. Added `distDir: process.env.NEXT_DIST_DIR || ".next"` to `next.config.ts:31` so the perf suite builds into `.next-perf/` in isolation.
5. **`/skills` 500 on cold load** when only Next was booted (no Bun API on :3001). greensnow's Lane 4 fix made the skill list an in-process read of `skills-manifest.json` so the page now renders without the API. The Bun API server boot was removed from the orchestrator after that fix landed.
6. **`adjustFontFallback: "Arial"`** on the Archivo font config tripped a TypeScript boolean type. Removed; the explicit `fallback: ["system-ui", ...]` array covers the CLS-mitigation case.

## Files

```
tests/e2e/perf/
├── perf.test.ts            # 25 bun:test assertions (Web Vitals + bundle + tree-shake)
├── run-lighthouse.ts       # standalone orchestrator: build + boot + 15 Lighthouse passes
├── REPORT.md               # this file
└── runs/
    ├── lighthouse-summary.json    # aggregated per-route x per-mode metrics
    ├── bundle-snapshot.json       # per-route chunks/JS/CSS bytes
    └── <route>-{cold,warm,cache}-1.json   # 15 raw Lighthouse audit reports
```

## Sign-off

- All five named routes meet the four Web Vitals thresholds in all three modes (15/15 Lighthouse runs).
- All five named routes stay within the per-route bundle budget (5/5 bundle assertions).
- optimizePackageImports verified actually working for lucide-react and recharts via probe-set absence in compiled chunks.
- Real Chrome, real `next start`, real `.next-perf/` chunks on disk. Zero mocks anywhere in the suite.

Lane 7 E2E perf coverage complete.
