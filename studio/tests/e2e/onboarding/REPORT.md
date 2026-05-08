# Lane 8 E2E Report: onboarding + copy + demo

**Owner:** neonpulse · **Task:** #37 · **Wave:** post-Wave-B verification
**Test plan ref:** `~/Desktop/marketing-cli-audit-findings/TEST-PLAN.md` Lane 8
**Hard rules ack:** no mocks, no fake data, no fake API calls. Studio harness
is the real Bun server + real Next.js dev (`tests/e2e/global-setup.ts`).
External APIs (Postiz, Higgsfield) are not exercised here -- Lane 8 is
internal-surface coverage; Tier 2 fixtures are out of scope until Moiz
signs off.

---

## Files added

| Path | Runner | Purpose | Cases |
|---|---|---|---|
| `tests/e2e/onboarding/wizard-error.e2e.ts` | Playwright | Wave B fix #1: silent-error-swallow regression guard. Drives the wizard with a real bad URL + real control-char-injected key against the real `/api/init` and `/api/settings/env` endpoints. Asserts inline AlertTriangle UI, "Continue without saving" path, and that the wizard NEVER silently advances past a failed save. | 5 |
| `tests/e2e/onboarding/wizard-success.e2e.ts` | Playwright | Wave B fix #2 + #3 + Wave C #9: walks the full happy-path wizard in DEMO mode, lands on `step-done.tsx`, asserts the middle icon card is "Audience" (not "Signals"), the headline is "Your brand files are live." (not "Your marketing brain is live."), the secondary CTA renders an `<svg>` instead of a `→` glyph, and US "Initializing" replaces British "Initialising". Also verifies `localStorage` is cleared on the dashboard nav. | 5 |
| `tests/e2e/onboarding/seed-demo-urls.test.ts` | bun:test | Wave B fix #5 + cross-lane regression guard: runs the real `scripts/seed-demo.ts` against an ephemeral DB seeded from the real `db/schema.sql`, then reads back every URL- and copy-bearing column to assert (a) every URL hostname is `demo.local`, (b) no row contains the legacy "Parallel" leak, (c) the deliberate "DemoCo" rename landed on the publish-log newsletter row, (d) every `created_at` is non-null and lands inside a 7-day window query (silverspark's SQLite-bind regression guard), and (e) no em-dash (U+2014) survives in any seeded row. | 6 |
| `tests/e2e/onboarding/em-dash-lint.test.ts` | bun:test | Wave A + CI hook regression guard. Spawns the real `scripts/check-no-em-dash.ts` via `Bun.spawn`, writes a real em-dash sentinel into each watched directory in turn (`app/`, `components/`, `lib/`), asserts non-zero exit + stderr message, and confirms the IGNORED_SEGMENTS list still excludes `tests/`. | 5 |
| `tests/e2e/onboarding/audience-archetypes.test.ts` | bun:test | Wave C: parser for the Lane 10 `## Archetypes` schema. Real file I/O on temp brand/ dirs, real markdown matching the audience-research skill contract. Covers happy-path, "not measured" markers, missing-field detection, empty-section template state, and malformed input. | 5 |
| `lib/audience-archetypes.ts` | (production lib) | New parser for `## Archetypes` blocks. See "Wave C scope change" below. | -- |

**Total cases:** 26.

---

## Run results

### bun:test suites (run on macOS arm64, bun 1.3.8)

```
$ bun test tests/e2e/onboarding/audience-archetypes.test.ts
 5 pass · 0 fail · 31 expect() calls · 24ms

$ bun test tests/e2e/onboarding/em-dash-lint.test.ts
 5 pass · 0 fail · 13 expect() calls · 286ms

$ bun test tests/e2e/onboarding/seed-demo-urls.test.ts
 6 pass · 0 fail · 420 expect() calls · 273ms
```

All 16 backend cases pass. The seed-demo suite fires 420 individual
`expect()` calls because every URL field, every text column, every
`created_at` value in every seeded table is asserted -- no spot-check.

### Playwright suites (run via `bun x playwright test`, harness on
ports 4800/4801)

| Suite | Result | Notes |
|---|---|---|
| `wizard-error.e2e.ts` (5 cases) | All 5 pass individually; 4/5 pass on a single full-file run. Case 5 flakes intermittently late in a run due to a Turbopack cache-corruption issue that is observable across multiple Lane 5 + Lane 7 runs too (see "Known flake" below). | `bun x playwright test tests/e2e/onboarding/wizard-error.e2e.ts -g "Case 5"` -> green every time. |
| `wizard-success.e2e.ts` (5 cases) | All 5 pass individually; 4/5 pass on a single full-file run. Same flake on the trailing case. | `bun x playwright test tests/e2e/onboarding/wizard-success.e2e.ts -g "Case 5"` -> green every time. |

Total Playwright cases: 10. Pass when run individually: 10/10. Pass on a
single full-file invocation: 8/10 due to Turbopack flake (see below).
Real failure count attributable to Lane 8 code: 0.

---

## Coverage table -- what each case proves

| File | Case | What it proves |
|---|---|---|
| wizard-error | 1 | `/api/init` rejects `not-a-url` with BAD_INPUT and the wizard renders the inline error block, NOT the next step. Headline uses "Couldn't initialize the project" (US spelling). |
| wizard-error | 2 | Editing the URL after error clears the error block. The wizard's `onChange` -> `setProjectError(null)` wire is live. |
| wizard-error | 3 | Postiz step rejects a control-char-tainted key with a real BAD_INPUT envelope. Inline error block "Couldn't save the Postiz key" appears. CTA flips to "Try again" + "Continue without saving". Wizard does NOT auto-advance to Step 2. |
| wizard-error | 4 | Clicking "Continue without saving" advances to Step 2 WITHOUT firing another POST. Confirms the explicit-skip path is wired distinct from the save path. |
| wizard-error | 5 | Optional-keys step shows a differentiated error headline ("Couldn't save the optional keys", not the Postiz one). Wizard does NOT auto-advance to Step 3 ("Writing your brand files…"). |
| wizard-success | 1 | Step 0 button text uses US "Initializing" exclusively. Error path uses "Couldn't initialize the project". British forms gone. |
| wizard-success | 2 | Step 3 (building) headline reads "Writing your brand files…". The "Building your marketing brain" string is not in the DOM. |
| wizard-success | 3 | Step 4 (done) middle icon card reads "Audience". Order is Voice profile / Audience / Competitors. Literal "Signals" is not in the card list. |
| wizard-success | 4 | Step 4 secondary CTA contains a real `<svg>` child (lucide ArrowRight). Label does not contain the unicode `→` glyph. |
| wizard-success | 5 | "Open dashboard" click clears `localStorage["mktg-studio:onboarding"]` and navigates to /dashboard. Re-opening the wizard from a half-closed tab now works. |
| seed-demo-urls | 1 | Real seeder against fresh schema -> exactly 20+5+10+3+6 rows. Counts asserted via direct SQL. |
| seed-demo-urls | 2 | Every signal URL parses with `hostname === "demo.local"`. None of the 11 real-domain hosts (tiktok.com, twitter.com, x.com, bain.com, reddit.com, stripe.com, vercel.com, instagram.com, ycombinator.com, trends.google.com, github.com) appear. |
| seed-demo-urls | 3 | Word-boundary `\bParallel\b` regex returns zero hits across signals/opportunities/activity/briefs/publish_log content columns. The Wave B rename actually landed everywhere. |
| seed-demo-urls | 4 | The newsletter publish-log row (the original "Parallel now ships..." leak) now reads "DemoCo now ships...". Specific row, specific string. |
| seed-demo-urls | 5 | Every `created_at` is non-null and falls inside a `datetime('now', '-7 days')` window. Pins seed-demo against the SQLite `datetime('now', ?)` bind regression silverspark hit in seed-pulse-series.ts. |
| seed-demo-urls | 6 | Em-dash (U+2014) absent from every text column in every seeded table. Database-level guarantee, not just source-level. |
| em-dash-lint | 1 | Real `scripts/check-no-em-dash.ts` against the real studio tree exits 0 and reports "scanned N file(s)". |
| em-dash-lint | 2 | Em-dash in `app/` -> exit != 0, stderr names the file and lists the watched dirs. |
| em-dash-lint | 3 | Em-dash in `components/` -> exit != 0. |
| em-dash-lint | 4 | Em-dash in `lib/` -> exit != 0. Specifically guards Wave A's WATCHED_DIRS expansion (pre-Wave-A this dir was unwatched). |
| em-dash-lint | 5 | Em-dash in `tests/` -> exit 0. The IGNORED_SEGMENTS list correctly excludes test trees so test fixtures keep their freedom. |
| audience-archetypes | 1 | Two-archetype audience.md matching the real Lane 10 contract parses every required field exactly. |
| audience-archetypes | 2 | "not measured" markers from the skill contract are preserved verbatim in the parsed output. |
| audience-archetypes | 3 | A single missing field (language_quote omitted) yields one `errors[]` entry naming the field, while the sibling healthy archetype still parses. |
| audience-archetypes | 4 | A template audience.md with no `## Archetypes` section returns `{archetypes: [], errors: []}` -- callers can show their own empty state. |
| audience-archetypes | 5 | Empty / non-string / `undefined` input never throws. |

---

## Wave C scope change: archetype-pulse-cards rewiring

The team-lead's task description for #37 included this sentence:

> archetype-pulse-cards reads real brand/audience.md (real file written by
> audience-research skill run earlier in test) and renders the exact
> archetypes from the ## Archetypes block.

I cannot verify that exact assertion because the component is gone.
silverspark's Wave B Pulse rebuild
(`components/workspace/pulse/pulse-page.tsx`) deleted
`archetype-pulse-cards.tsx` along with the rest of the legacy
`pulse/empty-state.tsx`/`spike-stack.tsx`/etc. tree (verified by `find
components/workspace/pulse -type f` -> only `pulse-page.tsx` and
`sparkline.tsx` remain). The new Pulse hero is the funnel ribbon
(silverspark's "Slot A" choice -- coordinated by DM today); archetype cards
were dropped in favor of letting the funnel data carry the page.

What I shipped instead:
- A standalone parser at `lib/audience-archetypes.ts` that reads the Lane
  10 `## Archetypes` schema. Lane 10 (frostbyte) shipped the schema in
  `skills/audience-research/SKILL.md:248`+ and `brand/SCHEMA.md:11, 22`.
  The parser is tested against five real-shape fixtures
  (`audience-archetypes.test.ts`) so any future surface (Skill Browser
  persona view, brainstorm card stack, document-review panel) can call
  it without re-parsing.
- Documented the deprecation in `lib/audience-archetypes.ts:13-21`.

If archetypes return to the dashboard in a later wave, the parser is
ready and tested; only the rendering component is missing.

---

## Known flakes / non-determinism

**Turbopack cache corruption mid-run.** Late in some full-file Playwright
runs Next.js panics with messages like:

```
Persisting failed: Unable to write SST file 00000027.sst
Caused by: No such file or directory (os error 2)
```

When this fires, subsequent `page.goto()` calls in the same suite return
`ERR_CONNECTION_REFUSED` or `ERR_EMPTY_RESPONSE`. Re-running the same
test in isolation always passes. Observed across:

- this lane's `wizard-error.e2e.ts` Case 5 (1/N runs)
- this lane's `wizard-success.e2e.ts` Case 5 (1/N runs)
- in development boot during Wave B verification (independent of tests)

This is a Next.js 16.1.5 + Turbopack issue, not a Lane 8 code issue.
Mitigations explored: clearing `.next/` between runs, killing stale
processes pre-suite. Neither eliminates the flake. Recommend the final
synthesis suite (Task #29) run each Playwright file in isolation if it
trips the flake, or downgrades to webpack mode for CI stability.

**Cross-lane: token-aware fetcher.** Existing dashboard SWR consumers
through `lib/fetcher.ts` 401 in the browser when Lane 1 auth is enabled
because the fetcher does not pass `studioAuthHeaders()`. Lane 8 wired the
header into the wizard, env-section, and the publish-error helper, so the
onboarding paths covered here all work end to end. The full dashboard
fetcher fix is ironmint's lane (DM sent earlier today).

---

## What is NOT covered (deliberate)

- Real Postiz API calls (Tier 2, blocked on Moiz sign-off).
- Higgsfield image gen (Tier 2).
- Resend email send (Tier 2).
- The seeder's `--reset` semantics across multiple runs (the test always
  starts from an empty DB).
- The `MKTG_STUDIO_AUTH=enabled` path through the wizard. The harness
  pins auth disabled so existing journey tests can share the boot. A
  follow-up suite that exercises the auth perimeter through the wizard
  belongs in Lane 1's E2E (ironmint).

---

## Run command reference

```bash
# Full Lane 8 backend coverage (deterministic, fast)
cd studio
bun test tests/e2e/onboarding/audience-archetypes.test.ts \
         tests/e2e/onboarding/em-dash-lint.test.ts \
         tests/e2e/onboarding/seed-demo-urls.test.ts

# Lane 8 wizard coverage (slower, boots Bun + Next via globalSetup)
bun x playwright test tests/e2e/onboarding/wizard-error.e2e.ts
bun x playwright test tests/e2e/onboarding/wizard-success.e2e.ts

# Single-case escape hatch when Turbopack flakes
bun x playwright test tests/e2e/onboarding/wizard-error.e2e.ts -g "Case 5"
```
