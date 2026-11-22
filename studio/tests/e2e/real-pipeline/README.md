# Real-Pipeline E2E Harness

Zero mocks. Zero fake data. Zero fake API calls. Every test in this directory exercises the full production pipeline against real APIs, real brand files on disk, real SQLite writes, and a real mktg-studio server — spawned, probed, torn down per test file.

This harness is the **proof-of-correctness layer** for the mktg-studio launch. The existing `tests/unit/`, `tests/integration/`, `tests/server/`, and `tests/dx/` suites probe code paths; this harness proves end-to-end behavior.

## Why it lives at `tests/e2e/real-pipeline/`

- `tests/e2e/` already exists for Playwright browser journeys (`user-journey.e2e.ts`). This harness is distinct — it exercises the backend pipeline without a browser, so the pattern is "e2e of the pipeline", not "e2e of the UI".
- Keeping it isolated from `tests/integration/` lets `bun test` skip it by default — these tests need real API keys and take real time, so they don't run in the tight feedback loop.

## Directory layout

```
tests/e2e/real-pipeline/
├── README.md (this file)
├── setup.ts orchestration: spawn server + provision brand/ + tear down
├── setup.test.ts validates the harness itself runs clean
├── lib/
│ ├── probe.ts probeHealthUntilReady — wait for a booted server
│ ├── capture.ts captureApiResponse — timestamped ad-hoc captures (gitignored)
│ ├── schema.ts captureAndAssertFullShape — deep-equal against expected
│ ├── env.ts requireEnv — structured skip-with-reason for missing keys
│ └── replay.ts replayOrCapture — 3-mode (live/capture/replay) fixture wrapper
├── fixtures/
│ └── captured/ timestamped API response captures (gitkeep'd; content ignored)
├── flow-brand-refresh.test.ts J1 — brand refresh loop
├── flow-publish.test.ts J2 — publish loop draft→scheduled→published
├── flow-cmo-live.test.ts J3 — /cmo live-driving soak (scaled smoke)
└── flow-signals.test.ts J4 — signal collection + actions
```

**Task → file map** is the contract: each suite file targets one named task. When a suite lands, its owning task can be marked complete and the matching downstream task (if any) unblocks.

## Running the harness

```bash
cd studio # from the marketing-cli repo root

# 1. Validate the harness itself is healthy
bun test tests/e2e/real-pipeline/setup.test.ts

# 2. Run everything
bun test tests/e2e/real-pipeline/
```

## Required environment variables

Only the keys for the APIs a given suite exercises are required. Suites that need keys should `test.skipIf(!process.env.POSTIZ_API_KEY)(...)` so a developer can run a subset without holding every credential.

| Variable | Used by | Purpose |
|---|---|---|
| `POSTIZ_API_KEY` | e2e-postiz, e2e-pipeline, e2e-publish | Real test-account postiz instance |
| `POSTIZ_API_BASE` | same | Override if self-hosted; defaults to `https://api.postiz.com` |
| `RESEND_API_KEY` | e2e-resend | Real test-domain Resend key |
| `RESEND_TEST_DOMAIN` | e2e-resend | Sending domain for test emails |
| `EXA_API_KEY` | e2e-exa-firecrawl | Real Exa MCP key |
| `FIRECRAWL_API_KEY` | e2e-exa-firecrawl | Firecrawl CLI / API key |
| `TYPEFULLY_API_KEY` | e2e-exa-firecrawl, e2e-publish | Real Typefully account |
| `STUDIO_TEST_PORT` | all suites | Port for the spawned test server. Defaults to `31801`. Change if your dev server is running. |
| `DASHBOARD_TEST_PORT` | suites that exercise UI endpoints | Defaults to `31800`. |
| `CAPTURE_FIXTURES` | optional | `"true"` to write every API response to `fixtures/captured/`; `"false"` to skip. Default: `"true"`. |
| `HARNESS_LIVE` | optional | `"1"` forces every `replayOrCapture()` call to hit the live API without consulting goldens. Use for "is the real service still alive?" checks. |
| `HARNESS_CAPTURE` | optional | `"1"` hits the live API AND writes/refreshes the golden fixture. Use when intentionally refreshing committed goldens. |

### The three harness modes (default vs live vs capture)

`replayOrCapture()` in `lib/replay.ts` governs how suites interact with external APIs. Mode resolution:

| Env | Behavior |
|---|---|
| (default — neither set) | **Replay** from `fixtures/golden/<api>/<key>.json` if present AND <24h old. If missing or stale, the call returns `{ kind: "skipped", reason }` — the suite should detect this via `goldenAvailable()` at `describe.skipIf()` time and skip the block. |
| `HARNESS_CAPTURE=1` | **Capture** — hit the live API AND write/refresh the golden with a fresh timestamp. This is how you refresh committed goldens. Requires real API keys. |
| `HARNESS_LIVE=1` | **Live** — always hit the live API, do NOT read or write the golden. Use when validating a real service status or when you deliberately want to bypass goldens (e.g., debugging a schema drift). |

**Golden files are committed** at `fixtures/golden/<api>/<key>.json` (NOT gitignored — `.gitignore` excludes only `fixtures/captured/`). They serve as the deterministic contract surface.

**24h TTL is the default**; per-call override via `ReplayOptions.ttlMs` if a specific endpoint changes faster or slower. TTL is stored inside the fixture itself (not derived from file mtime) so a recently `git checkout`'d golden with a 3-day-old `capturedAt` still expires correctly.

### Using requireEnv + replayOrCapture together

```typescript
// tests/e2e/real-pipeline/e2e-postiz.test.ts
import { describe, test, expect } from "bun:test";
import { requireEnv } from "./lib/env";
import { replayOrCapture, goldenAvailable } from "./lib/replay";
import { captureAndAssertFullShape } from "./lib/schema";

const env = requireEnv(["POSTIZ_API_KEY", "POSTIZ_API_BASE"]);
const hasGolden = goldenAvailable("postiz", "integrations");
const canRun = env.ok || hasGolden;
const skipReason = env.ok ? undefined : env.reason;

describe.skipIf(!canRun)(`postiz live coverage — ${skipReason ?? "ready"}`, () => {
 test("GET /public/v1/integrations returns the declared shape", async () => {
 const res = await replayOrCapture<PostizIntegration[]>(
 { api: "postiz", goldenKey: "integrations", method: "GET", endpoint: "/public/v1/integrations" },
 async () => fetch(
 `${env.ok ? env.values.POSTIZ_API_BASE : ""}/public/v1/integrations`,
 { headers: { Authorization: env.ok ? env.values.POSTIZ_API_KEY : "" } },
 ),
 );
 if (res.kind === "skipped") return; // golden gone/stale AND no live key
 captureAndAssertFullShape(res.body, POSTIZ_INTEGRATIONS_SCHEMA);
 });
});
```

Key pattern: `canRun = env.ok || hasGolden` — the suite is runnable either with a real key (live/capture mode) OR with a fresh golden (replay mode). If neither, `describe.skipIf` silently excludes the block.

## The no-mocks discipline

Every test in this directory must obey these five rules:

1. **No mock functions.** If a suite needs to isolate a module, use a real instance. If that instance needs a backing store, use a real SQLite temp DB. If it needs a network call, make the network call.
2. **No fake data.** Fixture data is either (a) real production responses captured at runtime, or (b) seeded from the same code paths the product uses (e.g., `mktg init` for `brand/`). Hand-rolled JSON blobs that approximate real responses are disallowed.
3. **No trapping external calls.** If a test needs postiz not to actually post, use the real `type: "draft"` payload — don't intercept the request.
4. **No skipping on convenience.** `test.skipIf(missingCred)` is allowed; `test.skip(...)` without a reason is not.
5. **Assert the full shape.** Use `captureAndAssertFullShape` (`lib/schema.ts`) rather than hand-rolled `expect(x.ok).toBe(true)`. If an API response has 40 fields, the test validates all 40. If any field's name or type changes, the test fails.

## Fixture capture

When `CAPTURE_FIXTURES=true` (default), every external API response lands at:

```
tests/e2e/real-pipeline/fixtures/captured/<api>-<endpoint>-<isoTimestamp>.json
```

Example: `postiz-integrations-2026-04-21T17-30-12.json`.

These are regression artifacts, not committed fixtures — `.gitignore` excludes everything under `fixtures/captured/` except the `.gitkeep`. The point is that a failed test leaves a fresh capture behind that you can diff against a known-good run.

If you need a committed golden fixture for schema comparison, place it at `fixtures/golden/` and call `captureAndAssertFullShape(response, goldenSchema)` — the golden dir IS committed.

## Ports

Default test ports are `31800` (dashboard) and `31801` (server) — non-standard to avoid clashing with a developer's live dev server. Override via `STUDIO_TEST_PORT` / `DASHBOARD_TEST_PORT`.

## Teardown discipline

Every suite's `afterAll` hook must:
- Kill the spawned server (SIGINT, then SIGKILL after 2s if still alive).
- Remove the temp brand/ directory.
- Close any SQLite handles.
- Flush pending SSE subscribers.

If a suite leaves orphan processes behind, the next run will fail on the port bind. `setup.ts` exports a single `teardown()` that does all of this; suites should use it.

## Agent DX contract

This harness is itself held to the 21/21 contract: helper utilities return structured data, `probeHealthUntilReady` has a schema-introspectable shape, fixture captures are machine-readable JSON, and the README (this file) is the agent-knowledge surface.

## Status

- **2026-04-21** — the maintainer's scaffolded the harness (setup.ts, probe, capture, schema, README) per E1 (#16).
- Downstream suites (J1, J2, J3, J4) land on top of this scaffold per their respective tasks.
