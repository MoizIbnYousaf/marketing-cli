# Lane 5 -- Pulse E2E REPORT

End-to-end coverage for `GET /api/pulse/snapshot` + the rebuilt Pulse surface. Every test boots a real Bun `server.ts` with the auth perimeter ENABLED (no `MKTG_STUDIO_AUTH=disabled` escape hatch), runs against a per-suite SQLite + per-suite seeded `brand/`, and drives the canonical seeder script to populate funnel data. No mocks, no shimmed validators, no fake API responses.

## Suite layout (per TEST-PLAN.md Lane 5)

```
studio/tests/e2e/pulse/
├── harness.ts            -- spawns real server.ts with auth ENABLED, seeds DB
├── snapshot.test.ts      -- 11 tests: full PulseSnapshot shape × 5 seed states + auth + ?fields=
├── staleSections.test.ts -- 5 tests: per-section fallback when DB tables drop
├── playwright.e2e.ts     -- 6 Playwright tests: page render + chart paint + SSE-without-reload
├── fixtures/             -- 7 raw snapshot JSON dumps from each state
└── REPORT.md             -- this file
```

## Latest run

```
$ bun test tests/e2e/pulse/snapshot.test.ts tests/e2e/pulse/staleSections.test.ts

 16 pass
 0 fail
 1126 expect() calls
Ran 16 tests across 2 files. [639.00ms]
```

`bun x tsc --noEmit`: clean across all 5 Pulse files (`lib/types/pulse.ts`, `lib/pulse-snapshot.ts`, `components/workspace/pulse/pulse-page.tsx`, `components/workspace/pulse/sparkline.tsx`, `scripts/seed-pulse-series.ts`).

## harness.ts

Pattern mirrors `tests/e2e/security/harness.ts` (ironmint's Lane 1 reference). Critical properties:

- Auth ENABLED: server boots without `MKTG_STUDIO_AUTH=disabled`. Token is read from disk via `MKTG_STUDIO_TOKEN_PATH=<tempDir>/studio-token` (length-validated >= 32 chars). Tests authorize via `Authorization: Bearer <token>` OR `?token=<token>` query param.
- Per-suite ports: `snapshot=38301`, `staleSections=38302`, `playwright=38303`. No clashes with other E2E suites in the repo.
- Per-suite temp dir: `mkdtemp(...mktg-pulse-e2e-...)` cleaned by `teardown()`.
- DB at `<tempDir>/studio.sqlite`; brand seed at `<tempDir>/brand/*.md` (10 canonical files); `MKTG_PROJECT_ROOT` + `MKTG_BRAND_DIR` pointed at the temp dir so the running server stays inside the harness.
- `harness.seed({ reset: true })` spawns `bun run scripts/seed-pulse-series.ts --db <dbPath> --reset`. Status non-zero throws.
- `harness.fetchAuthed(path, init)` always sends the bearer header. Helpers `withToken(path)` and `bearer()` cover the two auth paths the production launcher exercises.
- Auto-runs the funnel seeder once at boot unless `skipFunnelSeed: true` is passed (used by `staleSections.test.ts` so each test composes its own seed).

## snapshot.test.ts (11 tests)

| # | Name | Coverage |
|---|---|---|
| 1 | auth perimeter: unauthed GET is rejected | Plain `fetch(.../api/pulse/snapshot)` returns 401 |
| 2 | auth perimeter: bearer header authorizes | Returns 200 with the harness token |
| 3 | auth perimeter: `?token=` query param authorizes (SSE / EventSource path) | Returns 200 |
| 4 | [state 1] empty DB returns canonical envelope | Full-shape pass, all funnel zeros, `staleSections: []` |
| 5 | [state 2] single-day seed -- today at series[6] | `series[6] === 1` for every funnel node |
| 6 | [state 3] 14-day flat seed -- both windows equal | `deltaPct === 0` for every node |
| 7 | [state 4] heavy current vs light prior | `signals.deltaPct > 100` |
| 8 | [state 5] real seeder script populates the funnel | All 4 funnel totals > 0, all `deltaPct > 0` |
| 9 | [state 6] activity-log POST surfaces in next snapshot | New `activity[]` row with `kind/skill/summary` preserved |
| 10 | `?fields=` projection masks the snapshot envelope | Sibling top-level keys absent |
| 11 | repeated identical fetch returns the same shape | Top-level key set + node count + node keys stable across requests |

`assertFullShape()` walks every field on every section per call. Asserted invariants:

- Top-level keys: exact set match (`actions / activity / brandHealth / funnel / generatedAt / recentMedia / recentPublish / staleSections`).
- `generatedAt`: ISO string parseable by `new Date(...)`.
- `staleSections`: array of allowed keys (`funnel | brandHealth | actions | activity | media | publish`).
- `funnel.windowEnd`: parseable ISO. `funnel.nodes`: 4 entries in fixed order; each has `key | label | series (length 7) | total | deltaPct (number | null)`. Every series value is finite, non-negative.
- `brandHealth`: `score in [0, 100]`, `totalSlots > 0`, `readyCount in [0, totalSlots]`. Every file has `name | bytes | mtime`.
- `actions`: each action has `id | title | detail | href (starts with /) | icon (one of 6) | tone (one of 4)`.
- `activity`: each row has `id (number) | summary (string) | createdAt (string)`. `kind` is one of the 6 allowed values.
- `recentMedia[]`: `kind` is `image` or `video`, `mtimeMs` is numeric.
- `recentPublish[]`: `id | adapter | providers (array) | contentPreview | itemsPublished | itemsFailed | createdAt`.

## staleSections.test.ts (5 tests)

| # | Name | Coverage |
|---|---|---|
| 1 | dropped publish_log: `publish` AND `funnel` stale, signals/briefs/drafts populate | Per-table fallback in `buildFunnel` proves out |
| 2 | dropped activity table: `activity` stale, signals funnel survives | Activity drop scoped only to its section |
| 3 | dropped briefs only: `funnel` stale, briefs node zeros, others survive | Single-table-only fallback within funnel |
| 4 | multiple tables dropped: `funnel` + `publish` both stale, signals still populate | Multi-failure path |
| 5 | no drops: `staleSections` empty, every section serves fresh data | Negative control |

Each test re-runs migrations 001 + 002 in `beforeEach` so the next test starts against a complete schema.

## playwright.e2e.ts (6 tests)

Rides on the existing `tests/e2e/global-setup.ts` harness which boots `server.ts` on `E2E_STUDIO_PORT=4801` and `next dev` on `E2E_DASHBOARD_PORT=4800` against `MKTG_PROJECT_ROOT/marketing.db`. The Playwright `beforeAll` hook spawns the real seeder pointed at the harness DB, then sanity-probes `/api/pulse/snapshot` to confirm the funnel populated before any browser test runs.

| # | Name | Coverage |
|---|---|---|
| 1 | Pulse hero chip + funnel ribbon render with real data | Mounts on `/dashboard?tab=pulse`, asserts `Pulse` chip + 4 funnel labels |
| 2 | 4 sparklines paint as svg `<linearGradient>` defs | One def per tone (`pulse-spark-blue/violet/amber/green`) |
| 3 | delta pills render positive percentages | `text=/\\+\\d+%/` finds at least one positive pill |
| 4 | bottom strip renders 3 sub-panels | `Brand health / Recent media / Recent publishes` headings visible |
| 5 | **SSE invalidation: activity-log POST triggers snapshot re-fetch + UI update WITHOUT reload** | Captures every `/api/pulse/snapshot` request via `requestfinished`, posts an activity, waits for the next snapshot fetch, asserts the new summary text appears in the DOM, asserts `page.url()` never changed |
| 6 | page reload refetches the snapshot (smoke for SSR fallback) | After `page.reload()`, hero + Brand health heading still visible |

The SSE-without-reload test is the load-bearing case the brief asked for. It instruments Playwright's `page.on("requestfinished")` to count every snapshot fetch, then drives the activity log endpoint via Playwright's `request` API, then awaits the next snapshot fetch via `page.waitForResponse()`. The page must DOM-update with the new summary text without `page.reload()` ever firing -- proven by the URL invariant assertion at the end.

Run: `bun x playwright test tests/e2e/pulse/playwright.e2e.ts`

(Naming note: the file uses `.e2e.ts` not `.test.ts` so the existing `playwright.config.ts` `testMatch: /.*\\.e2e\\.ts$/` picks it up. Switching the matcher would conflict with the bun:test discovery convention used by `snapshot.test.ts` and `staleSections.test.ts` in the same directory.)

## Captured fixtures (`fixtures/*.json`)

Real responses from the running Bun server. Hand-edited zero. Each one is the snapshot the dashboard would receive in that DB state.

| Fixture | State | Funnel totals | Notable |
|---|---|---|---|
| `state-1-empty.json` | empty DB | `[0, 0, 0, 0]` | `staleSections: []`, all `deltaPct: null` |
| `state-2-single-day.json` | 1 row per table at daysAgo=0 | `[1, 1, 1, 1]` | `series[6]: 1`, `recentPublish.length: 1` |
| `state-3-14day-flat.json` | 1 row/day for 14 days, all 4 tables | `[7, 7, 7, 7]` | `deltaPct: 0` everywhere |
| `state-4-heavy-current.json` | 1/day prior + 3/day current (signals only) | `[21, 0, 0, 0]` | `deltaPct: +200%` for signals |
| `state-5-real-seeder.json` | `bun run scripts/seed-pulse-series.ts --reset` | `[78, 20, 36, 18]` | `deltaPct`: +86 / +100 / +125 / +200 |
| `state-6-after-activity.json` | empty + POST /api/activity/log | unchanged funnel | `activity[].summary` includes the snap-e2e marker |
| `state-7-publish-table-dropped.json` | 2 signals + DROP publish_log | `[2, 0, 0, 0]` | `staleSections: ["publish", "funnel"]`, signals node survives |

State 5 (real seeder) condensed:

```json
{
  "funnel": [
    {"key":"signals",  "total":78, "deltaPct":85.71},
    {"key":"briefs",   "total":20, "deltaPct":100},
    {"key":"drafts",   "total":36, "deltaPct":125},
    {"key":"publishes","total":18, "deltaPct":200}
  ],
  "brandHealth": {"score":44, "readyCount":2, "totalSlots":10},
  "actionCount": 1,
  "activityCount": 0,
  "recentMediaCount": 0,
  "recentPublishCount": 3,
  "staleSections": []
}
```

## Hard-rules compliance

| Rule | Status |
|---|---|
| NO mocks (fetch / fs / child_process / db) | Pass -- real Bun spawn, real SQLite, real HTTP fetch, real `spawnSync` for the seeder |
| NO fake data | Pass -- harness brand seed is minimal but real markdown; funnel rows come from the canonical seeder script |
| NO fake API calls | Pass -- HTTP roundtrips through the real `server.ts` running in a child process with auth ENABLED |
| Auth ENABLED on server | Pass -- harness deletes `MKTG_STUDIO_AUTH` env, reads token from `MKTG_STUDIO_TOKEN_PATH` file |
| Real seeder run before tests | Pass -- `harness.seed({ reset: true })` invokes `bun run scripts/seed-pulse-series.ts --db <temp> --reset` |
| Granular field coverage | Pass -- `assertFullShape` walks every field on every section, 1126 expect() calls per `bun test` invocation |
| Multiple test cases per surface (>= 3) | Pass -- 11 snapshot + 5 staleSections + 6 Playwright = 22 total |
| Self-contained boot + teardown | Pass -- per-suite harness with its own port, tempDir, and idempotent teardown |
| REPORT.md with run output | This file |

## Reproducibility

```bash
# auth-enabled bun:test side
bun test tests/e2e/pulse/snapshot.test.ts tests/e2e/pulse/staleSections.test.ts

# Playwright UI side (boots its own server + next via tests/e2e/global-setup.ts)
bun x playwright test tests/e2e/pulse/playwright.e2e.ts

# Full unit + integration regression check (must stay green)
bun test tests/unit tests/integration
```

## Known caveats

- **`brandHealth.readyCount` is lower-bound only.** The harness seeds minimal markdown; freshness-window heuristics in `lib/brand-files.ts` do not score every minimal file as "fresh". Asserted as `[0, totalSlots]` rather than an exact count -- the bug-class would be a stale freshness function, not a snapshot regression.
- **`recentMedia` is `[]` in current builds.** The content-manifest scanner is server-side and not yet wired into the snapshot aggregator. The Playwright `Recent media` panel renders the EmptyState. Wiring is a Wave C polish; not a Lane 5 blocker.
- **Test-suite SSE assertion via Playwright** is the deterministic part of the SSE invalidation contract. The full activity-live `EventSource` -> SWR `mutate` -> SWR refetch chain is exercised in the rebuilt `pulse-page.tsx:144-156` and inside the activity-live store; a long-form chaos test is parked for Wave C alongside the rest of `e2e-chaos.test.ts`.
