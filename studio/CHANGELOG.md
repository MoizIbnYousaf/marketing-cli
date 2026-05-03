# Changelog

All notable changes to mktg-studio. Format per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); project adheres to [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.5.4] - 2026-05-03

Version-aligned with `marketing-cli@0.5.4`. Studio surface unchanged. The CLI side ships TypeScript inside the published tarball so Next.js no longer auto-spawns pnpm install on the first `mktg studio` invocation, and `studio/package.json` now declares `pnpm.onlyBuiltDependencies: ["unrs-resolver"]` to silence the "Ignored build scripts" warning on cold boot. First-launch UX is fast and quiet.

## [0.5.3] - 2026-05-03

Version-aligned with `marketing-cli@0.5.3`. Studio surface unchanged. The CLI side splits the `/mktg-setup` Step 1 identity question into a setup-mode picker (URL vs local vs pre-launch) plus a follow-up that captures the URL or sentence; `brand/cmo-preferences.md` now records `Setup mode` and `URL` under `## Identity`. Studio reads those fields via the existing brand watcher — no new endpoints, no schema migration.

## [0.5.2] - 2026-05-03

Version-aligned with `marketing-cli@0.5.2`. Studio surface unchanged. The CLI side updates the README and npm description ahead of the public repo flip; nothing on the Studio runtime changed.

## [0.5.1] - 2026-05-03

Version-aligned with `marketing-cli@0.5.1`. Studio surface unchanged. The CLI side now records a `studio_enabled` opt-in during first-run setup and `/cmo` respects it — Studio is in beta, and users who opt out won't see auto-launches. When the file's `studio_enabled` is `yes`, every existing entry point (mktg studio, /cmo end-of-foundation, "show me the dashboard") works exactly as before.

## [0.5.0] - 2026-05-03

Version-aligned with `marketing-cli@0.5.0`. Studio surface unchanged in this release; the CLI side ships the new first-run setup wizard (`/mktg-setup`) which records preferences to `brand/cmo-preferences.md` — Studio reads this file alongside the other brand files via the existing brand watcher, so populated preferences flow into the dashboard without a Studio code change.

### Added

- Studio reads `brand/cmo-preferences.md` (new file written by the CLI's `/mktg-setup` wizard) the same way it reads other brand files. No new endpoints, no schema change.

## [0.4.0] - 2026-05-03

Version-aligned with `marketing-cli@0.4.0` now that `mktg-studio` ships as a workspace member of the `marketing-cli` monorepo rather than as a sibling package.

### Added

- Studio source ships inside the `marketing-cli` tarball as `studio/`. `mktg studio` resolves the in-repo bundle first; Brand memory under `brand/` is shared with the CLI.

### Fixed

- Tightened the parent package's published file allowlist and added `studio/.npmignore` as defense-in-depth so future tarballs ship only intended Studio files.

### Internal

- Codename cleanup in source comments. Version bumped from `0.2.1` to `0.4.0` to track the parent package.

## [0.2.1] - 2026-04-27

### Changed

- Collapsed the primary navigation contract to **Pulse, Signals, Publish,
  Brand, Settings**. Trend radar now lives inside Signals; Audience summary and
  recommended next actions live inside Pulse.
- Updated the visual system toward the graphite Marketing Studio command-center
  direction used on `marketing-cli.com`.
- Reworked medium-width layouts found through in-app-browser testing: Signals
  now stays single-column until wide desktop, and Settings no longer overflows
  horizontally at the Codex IAB viewport.
- Replaced obsolete seven-tab planning docs with current-state docs.

### Fixed

- Hardened Pulse spike rendering against missing `metrics` payloads from
  normalized server data.
- Removed a fragile persisted resizable split from Brand so the editor does not
  collapse behind the Activity rail.

### Documentation

- Added `LICENSE` (MIT 2026 Moiz Ibn Yousaf), `SECURITY.md`, `CONTRIBUTING.md`,
  and `CODE_OF_CONDUCT.md` to close governance gaps surfaced by the public-
  readiness audit (`docs/PUBLIC-READINESS.md`).
- `package.json`: add `license`, `repository`, `homepage`, `bugs`, `description`,
  and `author` fields. Bump version `0.1.0` -> `0.2.1` so the package version
  aligns with the changelog narrative. Stays `private: true` until the public-
  readiness audit punch list is closed and the GitHub repo is flipped public.
- Added defensive `.gitignore` patterns for `*.pem`, `*.key`, `id_rsa*`,
  `secrets/`, `credentials.json`, and `.env.production`.
- Removed `docs/AUDIT_PROMPT.md` (8 hardcoded maintainer-machine paths;
  re-runnable internal audit prompt with no public consumer).
- Reverted `docs/architecture.md` tab name from "Content" to "Signals" so the
  README, screenshots, and architecture doc all converge on a single canonical
  IA name. Legacy `?tab=content` redirects retained for compatibility.

## [0.2.0] - 2026-04-21 (launch)

First public launch alongside `marketing-cli@0.3.0`. Full audit-surface shipped; every launch-blocking P0 closed and regression-guarded. 170+ tests green, four real-pipeline flow tests covering brand refresh, publish, /cmo soak, and signals. Agent DX 21 / 21 on the in-repo rubric with live curl receipts.

### Added

- **Onboarding wizard** (5 steps) with three parallel foundation agents. Post-A17 the wizard blocks advance on silent `/api/init` failure and times out the SSE connect at 15 s with a Retry / Skip fallback.
- **Launch-era workspace tabs**: Pulse, Trends, Signals, Audience, Opportunities, Publish, Brand. Each with SWR-backed data + SSE live updates. Current navigation is smaller; see the Unreleased section.
- **Activity panel** streaming every /cmo action in real time over `/api/events`.
- **Brand editor** (markdown): file list + editor + diff-before-clobber merge UI (A13). Atomic writes via `/api/brand/write` with optimistic mtime locks + 409 CONFLICT + structured fix suggestions.
- **Publish tab** with Postiz integration for 30+ providers, draft / schedule / now modes, rate-limit badge, provider-preview cards. Toast reads server-resolved post-type (A16) rather than requested mode; no "published" lie.
- **Reset brand** with backup-zip before delete + typed-DELETE confirmation (A15) so destructive actions never lose data silently.
- **Server-side zombie /cmo skill-run sweeper** (A14) marks abandoned rows `abandoned` instead of leaving them `running` forever.
- **ErrorBoundary at root layout** (A9) + `Array.isArray` guards on every SWR consumer + `dataFetcher` that throws on `ok:false` envelopes. Bad responses no longer crash the dashboard.
- **21 / 21 agent-DX HTTP API**: JSON in / JSON out, `?dryRun=true` safety rail on every mutation, `?fields=` projection on every read, `?confirm=true` on destructive actions, stable error envelope with `code`/`message`/`fix`, runtime `/api/schema` for self-discovery, 57+ routes registered.
- **Pre-hydration theme script** defaults to `prefers-color-scheme` (A11) so dark-mode users don't flash light on first paint.
- **PageTitle component + proper h1 per route** (A12 / G5-01). Global `h1 { text-transform: uppercase }` removed; Publish h1 deduplicated.
- **Landmark structure** via `<main>` / `<aside>` / `<nav>` / `<section aria-labelledby>` wrappers (A12 / A29). Every tab is a rotor-accessible region.
- **Signals `<select>` accessible name** (A12 / G5-02). Closes axe critical.
- **MKTG_BRAND_DIR + MKTG_STUDIO_DB env var support** on `/api/brand/*` + SQLite path (A30) so the E1 real-pipeline harness runs in true isolation.
- **Four full-flow E2Es**: J1 brand-refresh, J2 publish, J3 /cmo live soak (Bug #8 regression guard), J4 signals. All with hand-driven walkthroughs at `docs/FLOW-*.md`. Env knobs (`J3_SOAK_SECONDS`) let the same test suite run as CI-fast (60 s) or K4-production (600 s).

### Fixed

- **Bug #8** (A2 / A3 / A5). SSE subscription silently dropped within seconds of connect. Root cause was a client-layer remount cascade in a Provider subtree. Fix hoisted `<SSEBridge />` to root layout + hardened `EventSource.onerror` to recover from stuck CONNECTING states. 10-minute live soak verification in `docs/BUG8-VERIFICATION.md`.
- **Settings page render timeout at wide viewports** (A6). `BrandHealthSection` was an async server component fs-stat'ing every brand file at render time; split behind Suspense with a 3 s fs budget.
- **Undefined `--color-primary` / `--color-secondary` tokens** (A7). Every `<Button variant="default">` was rendering un-styled. Tokens now defined; em-dash lint rule added.
- **Dashboard crashes on 500 responses or shape-mismatched JSON** (A9 / G4-65 / G4-66). 7 of 8 tabs previously full-page-crashed with `TypeError: rows.filter is not a function`. ErrorBoundary + fetcher + `Array.isArray` guards now catch every error path.
- **Trends Relevance Radar panel hardcoded #0e141a / #FE2C55 / #25F4EE** (A11 / G6-03). Moved to theme tokens that adapt light / dark.
- **Mobile tab dock overran + Pulse tab occluded by Sonner avatar** (A19 / G2-01). Collapsed to icon-only under 480 px + 44 px touch floor enforced.
- **Mobile Publish tab body empty below header on iPhone SE + iPhone 15** (A18 / G2-02). Layout fixed.
- **Brand editor Reload clobbered unsaved edits** (A13 / H1-45). Diff UI now offers Keep / Take / Merge before any destructive reload.
- **Onboarding advanced on silent failure** (A17 / H1-01 / H1-02). Blocks advance on `/api/init` failure; 15 s SSE connect timeout + visible Retry.
- **"Post now" toast lied "published" when Postiz forced draft** (A16 / H1-55). Toast now reads actual resolved type from the server response.
- **RefreshChip < 44 × 44** (G2-03). Touch target size fixed.
- **Brand-workspace double-`<main>` regression** from A12 (A29). Outer wrapper switched to `<section aria-labelledby>`.

### Security

- **AGPL firewall** preserved across 0.2.0. Studio never imports `@postiz/*`; every Postiz interaction is raw fetch with a bare `Authorization` header across the network boundary. Test asserts no `@postiz/*` import.
- **Path traversal hardening** on `/api/brand/write` + `/api/brand/read`. `..`, URL-encoded traversal, absolute paths, and control characters all rejected with `PATH_TRAVERSAL` / `BAD_INPUT`.
- **Destructive routes require `?confirm=true`**. Reset additionally backs up `brand/` to a timestamped zip before any deletion.

### Tests

- **267 studio tests** (`bun test`): unit + server + integration + DX audit. Zero fails on clean runs.
- **4 full-flow E2Es** (J-stream) against real Bun server + real SQLite + real SSE:
  - J1 brand-refresh: 6 pass / 46 expects
  - J2 publish: 8 pass + 2 skip live-gated / 34 expects
  - J3 /cmo live soak: 3 pass + 1 skip live-gated / 56 expects (default 60 s soak)
  - J4 signals: 12 pass / 47 expects
- **Playwright harnesses** for every audit: `scripts/g1-audit.mjs` (desktop 66 captures), `scripts/g2-mobile.mjs` (4 profiles × 9 tabs), `scripts/g3-motion.mjs`, `scripts/g4-states.mjs`, `scripts/g5-a11y.mjs` (axe-core), `scripts/g6-theme.mjs`. Re-runnable on every commit.

### Audit artifacts (all committed to `docs/`)

- `docs/VISUAL-AUDIT-DESKTOP.md` (G1, 62 findings)
- `docs/VISUAL-AUDIT-MOBILE.md` (G2, 44 findings)
- `docs/MOTION-AUDIT.md` (G3, 42 findings + live ms measurements)
- `docs/STATE-CATALOG.md` (G4, 66 findings, 112 state cells graded)
- `docs/A11Y-AUDIT.md` (G5, 51 findings + axe rollup)
- `docs/THEME-AUDIT.md` (G6, 38 findings + force-dark evidence)
- `docs/ADVERSARIAL-UX.md` (H1, 132 findings across 16 flows)
- `docs/SHIP-IT-P0-P1-P2.md` (L1 master priority list)
- `docs/LAUNCH-READINESS.md` (F3 cross-artifact coherence)
- `docs/SUPPORT-RUNBOOK.md` + `docs/FAQ.md` (K2 user-facing)
- `docs/LAUNCH-DAY-RUNBOOK.md` (K4 operator-facing)
- `docs/LAUNCH-COPY.md` (C3 PH / HN / X / LinkedIn / email / Discord)
- Real-pipeline flow tests under `tests/e2e/real-pipeline/` (brand-refresh, publish, /cmo soak, signals)

### Known at launch

- **Open P1s** tracked in `docs/SHIP-IT-P0-P1-P2.md`: A8 `DataSurface<T>` wrapper, A10 Framer Motion reduced-motion, A20 PageTitle migration across every tab, A21 theme token collapse, A22 layout coherence (sidebar / tabs order, tablet breakpoint), A23 mobile polish (safe-area utility, iOS-zoom input, editor flow), A24 Publish integrity (per-provider chars, draft persist, undo), A25 /cmo resilience (heartbeat, atomic writes, long-run progress), A26 network resilience (SWR retry, fetch timeouts, server-down banner), A27 a11y per-tab fixes (ARIA tablist, severity glyphs, kb resize).
- **Open P2s** rolled up by audit; not launch-blocking. See `docs/SHIP-IT-P0-P1-P2.md` for the full inventory.

### License

MIT. Postiz (AGPL-3.0) is kept at arm's length via the network boundary.
