# Changelog

## Unreleased

### feat

- opt-in TOON output via global `--format <json|toon>` (AXI principle 1) — JSON stays the default contract, errors always stay JSON

## v0.7.0

### feat

- agent-contract hardening + AXI alignment + repo-wide drift cleanup
- OpenSEO backend-awareness + onboarding handoff (OpenSEO S5 — native feel)
- Pulse SEO readiness card + /api/seo/status bridge + self-host docs (OpenSEO S4)
- mktg seo command group — binding, named readiness, keyword sync contract (OpenSEO S3)
- adapt 7 OpenSEO workflow skills + Backend Selection rewiring (OpenSEO S2)
- portable mktg route + dashboard JSON-only + studio resolve doctor check (M4)
- research_adapters capability + mcp block + openseo catalog (OpenSEO S1) + sync/status honesty (P9-B)
- per-item status truth enum + Studio label parity
- one-shot activation envelope + rich prerequisites with --strict
- honest run lifecycle — event loaded|completed, --complete/--writes/--result
- add /axi as main AXI catalog router
- first-class Exa agent-skills (search, contents, company, leads)
- add seo-machine + off-page-seo (Exa-native SEO infrastructure) (#35)
- chrome cleanup, IA consolidation, Pulse rebuild, primitives unification, perf hardening
- shared manifest sync, skill count single-source, tarball strip
- localhost-only studio API with token auth

### fix

- bundled skill install by default; ai-agent-skills delegation opt-in via MKTG_USE_AI_AGENT_SKILLS=1
- freshness test uses 91d window; strip em-dashes from UI source (lint guard)
- re-export normalizeSignalRow after signals route extract
- thermo-review follow-ups — studio status type parity, catalog base_default, playbook drift lock, run.ts extraction
- drop em-dash from dx comment (lint guard)
- accept ?fields= masks on empty lists (fresh-DB parity)
- replace em-dash in queue comment for CI lint guard
- validate --writes before dependency lookups
- raise tarball beforeAll timeout for larger skill tree
- sync skill/agent count copy + calendar Today button typecheck
- green CI for Exa port + wire foundation skills
- e2e auth, queue, brand freshness + quality restructure (#36)
- bump marketplace.json plugin versions to 0.6.0
- sync plugin manifest versions to 0.5.7
- cmo orchestration cleanup, frontmatter normalization, archetype schema
- kill silent error swallow, fix success screen lie, clean up demo seed

### refactor

- split postiz adapter into focused modules
- single --fields choke point + peel content/publish studio routes
- extract shared project/brand assessment into project-assess
- finish thermo quick-wins — args/monorepo, OpenSEO contract, SSRF, dead UI
- extract wrapRoute handlers from server.ts
- split publish.ts into focused core/publish modules
- split skill-lifecycle.ts into focused modules
- simplify pass — canonical args helpers, cast-free guard, shared template state, writer index

### docs

- pass-2 audit from 30 Grok reviewers + fix fields test
- link OpenSEO tracker Phase 12 to PR #52
- link OpenSEO tracker rows to PR #51
- link OpenSEO tracker rows to PR #50
- link OpenSEO tracker P5/P6 to PR #49
- link plan tracker P6/P7/P8 to PR #47
- link OpenSEO tracker rows to PR #46
- link OpenSEO integration plan from docs index
- plan OpenSEO as first-class SEO plane in mktg
- link plan tracker P5 to PR #45
- link plan tracker P2/P4 to PR #44
- link plan tracker P1/P3 to PR #43
- link CLI improvement plan from docs index
- add full CLI improvement plan from dogfood findings
- utilize offline skills into a real GTM pack
- exercise all 64 marketing skills with per-skill artifacts
- add launch copy artifacts from skill dogfood run
- note Studio test script and cloud UI proxy gotchas
- bump stale '51 skills' anti-pattern callout to 56

### chore

- drop unused CONTENT_REINDEX_BODY void in content routes
- market mktg with real brand memory + launch artifacts
- v0.6.0 — seo-machine + off-page-seo + Exa-native rebuild
- release v0.5.7

### test

- diagnostic output for activity fields probe in CI
- unique port for agent-dx suite (3993) — 3997 collides with mktg-bridge-routes
- add lane 7 lighthouse + bundle assertions report
- real end-to-end coverage across 9 lanes

### ci

- run studio tests + typecheck in pr-checks; fix time-of-day funnel flake

### other

- skills: add manim-composer, manimce/manimgl best practices, text-to-speech; update manifest
- Merge pull request #54 from MoizIbnYousaf/cursor/thermo-repo-pass2-ccd8
- Merge pull request #53 from MoizIbnYousaf/cursor/thermo-repo-quality-ccd8
- Merge PR #52: feat(plan): OpenSEO backend-awareness + onboarding handoff (OpenSEO S5 — native feel)
- Merge PR #51: feat(studio): Pulse SEO readiness card + /api/seo/status bridge + self-host docs (OpenSEO S4)
- Merge PR #50: feat(seo): mktg seo command group — binding, named readiness, keyword sync contract (OpenSEO S3)
- Merge PR #49: feat(skills): adapt 7 OpenSEO workflow skills + Backend Selection rewiring (OpenSEO S2)
- Merge PR #39: Dogfood: utilize offline marketing skills into a real GTM pack
- Merge PR #48: fix: thermo-review follow-ups + simplify pass
- Merge PR #47: feat(cli): portable mktg route + dashboard JSON-only + studio resolve doctor check (M4)
- Merge PR #46: feat(catalog): research_adapters capability + mcp block + openseo catalog (OpenSEO S1) + sync/status honesty
- Merge PR #45: feat(publish): per-item status truth enum + Studio label parity (M3)
- Merge PR #44: feat(cli): one-shot activation envelope + rich prerequisites with --strict (M2)
- Merge PR #43: feat(cli): honest run lifecycle — event loaded|completed, --complete/--writes/--result (M1)
- Merge PR #42: ci(studio): run studio tests + typecheck in CI; fix time-of-day funnel flake
- Merge branch 'cursor/catalog-research-capability-ccd8' into cursor/portable-route-ccd8
- Merge branch 'cursor/publish-truth-enum-ccd8' into cursor/catalog-research-capability-ccd8
- Merge branch 'cursor/catalog-research-capability-ccd8' into cursor/portable-route-ccd8
- Merge branch 'cursor/publish-truth-enum-ccd8' into cursor/catalog-research-capability-ccd8
- Merge branch 'cursor/run-with-context-ccd8' into cursor/publish-truth-enum-ccd8
- Merge branch 'cursor/honest-run-lifecycle-ccd8' into cursor/run-with-context-ccd8
- Merge pull request #38 from MoizIbnYousaf/cursor/add-axi-router-skill-6c0e
- Merge pull request #37 from MoizIbnYousaf/cursor/add-exa-agent-skills-6c0e

## Unreleased

### fix

- **`mktg init` cold-start: bundled install is now the default** (was: delegate to `ai-agent-skills` whenever it was on PATH). The delegation sparse-cloned the public registry from GitHub (80s+ cold start) and could install a stale skill set when the registry lagged this package. Bundled direct install is sub-second and always version-correct. Set `MKTG_USE_AI_AGENT_SKILLS=1` to opt back into registry delegation.


### feat

- add `/axi` skill — main AXI ([axi.md](https://axi.md)) catalog router (same role as `/cmo` for marketing). Routes GitHub → `gh-axi`, browser → `chrome-devtools-axi`, plus community AXIs; ships the 10 principles, prefer-AXI vs MCP decision tree, build/review checklist, and benchmark snapshot. Upstream provenance from `kunchenguid/axi`.
- `mktg doctor` optional CLI checks for `gh-axi` and `chrome-devtools-axi`.
- `/cmo` ecosystem + disambiguation hand off GitHub/browser/tool-interface questions to `/axi`.
- Port [exa-labs/agent-skills](https://github.com/exa-labs/agent-skills) as first-class mktg skills: `exa-search`, `exa-contents`, `company-research`, `lead-generation`, `build-with-exa` (with `build-with-exa/references/`).
- Ship root `.mcp.json` for Exa MCP (search + fetch + advanced + agent tools); `EXA_API_KEY` on skill manifest surfaces via `mktg doctor`.
- Wire Exa into `/cmo` routing + disambiguation, ecosystem/recency/safety rules, and all research/review agents.
- `mktg run` lifecycle (#43): bare `mktg run <skill>` logs `event:"loaded"`; `--complete --writes <paths> --result success|failure` logs `completed`. `mktg plan` / `mktg status` / dashboard count `completed` events only. `--with-context` returns the activation envelope; `--strict` fails on missing prerequisites.
- `PublishItemStatus` enum (`queued-local | draft-external | sent | written-file | failed | skipped`) as the per-item publish truth; `postType` emitted per item.
- Catalog contract gains `research_adapters` + `mcp` blocks; register the `openseo` catalog (SEO data plane, `OPENSEO_MCP_URL` / `OPENSEO_API_KEY` readiness) — 2 catalogs now.
- Add 7 `openseo-*` skills (project-setup, keyword-research, keyword-clustering, competitive-landscape, competitor-analysis, link-prospecting, coach) plus the `openseo` router skill; root `.mcp.json` ships an `openseo` MCP server entry.
- `mktg route "<request>"` — deterministic manifest-trigger routing without a model; `mktg dashboard` deprecated for humans in favor of `mktg studio` (JSON only); `mktg doctor` studio check.
- `mktg seo` (#50-52): `status` (readiness snapshot), `link-project` (`.seo/openseo.json` binding, `--confirm` only when relinking to a different project), `sync-keywords` (atomic OpenSEO Sync section in `brand/keyword-plan.md`), `open`. Studio `GET /api/seo/status` + Pulse SEO readiness card; `mktg plan` emits `seo-link-project` / `seo-connect-openseo` tasks; `/mktg-setup` hands off to `/openseo-project-setup`.
- Add `text-to-speech` (ElevenLabs voiceover/narration, reads `brand/voice-profile.md`), `manim-composer`, `manimce-best-practices`, `manimgl-best-practices` skills; `/cmo` routes voiceover/narration and explainer/math-animation requests to them.
- `src/cli.ts` HELP lists `route`, `seo`, `release`, and `--input`.

#### Agent contract (breaking where noted)

- JSON output is **compact by default** (one line, fewest tokens); `--pretty` opts into 2-space indentation for humans.
- Success envelopes now carry `help[]` — the next-step hints an agent should read. Selectable via `--fields help`; a payload with its own `help` key is never clobbered.
- Bare `mktg` renders a home view (health, brand summary, next actions) instead of dumping raw help.
- New `mktg setup` — installs a Claude Code `SessionStart` hook (`mktg status --fields health,brandSummary,nextActions --json`) so every session starts with ambient marketing context. Idempotent (`changed:false` on re-run), project-scoped by default, `--global` and `--dry-run` supported.
- **BREAKING** `mktg ship-check` returns `verdict: pass | warn | block` plus an `icon` field (🟢/🟡/🔴). Exit 0 for `pass` and `warn` (was 1), exit 4 for `block` (was 2). `block` returns the FULL report as data (`blockers[]`), not an error envelope.
- **BREAKING** `mktg publish` `UNSUPPORTED_FLAG` (flag exists but the selected `--adapter` does not support it) is exit 2 `invalid args` (was 6 `not implemented`); suggestions list the adapters that do support it.
- `mktg skill check-upstream` gains `--dry-run` (returns the plan — `dry_run:true`, `skills[].script`, `source_count` — with zero network). Detected drift now exits 0 (`ok:false`, `summary.drifted`, `skills[].in_sync:false`) — drift is a finding, not a process failure. New `summary.errored`; exit 2 only when EVERY script crashed.
- Bare `mktg compete` is now `list` (offline watch list: `urls[]`, `total`, `help[]`); the network scan stays behind `mktg compete scan`.
- **BREAKING** Unrecognised flags return `UNKNOWN_FLAG` (exit 2) with a `Did you mean` hint instead of being silently ignored. Bad `--fields` paths return `UNKNOWN_FIELD` (exit 2).
- `mktg list` / `mktg catalog list` return **minimal default items** (`{name, category, tier, installed}` / `{name, version_pinned, license, configured, capabilities}`); `--verbose` restores the full entries.
- `mktg schema` (bare) returns a compact command index; `--full` returns output maps, examples, vocabulary, and every subcommand schema.
- `mktg doctor` returns `summary {total, passed, warned, failed}` + `summaryText` alongside the checks.
- `docs/EXIT_CODES.md` documents the findings-vs-failures split (exit 0 with a signal in data).

#### Skills, scripts, and Studio

- `higgsfield-generate` reads `brand/creative-kit.md` (written by `/visual-style`) so generation inherits brand visual context.
- `scripts/check-brand-io.ts` + `tests/manifest-brand-io.test.ts` — verify every skill's declared `reads`/`writes` brand files match `skills-manifest.json`.
- `/cmo` skill routing table gains rows and disambiguation entries for the new commands and namespaces.
- Studio API: `GET /api/plan`, `GET /api/plan/next`, `GET /api/compete` (watchlist), plus the Content tab war-room view.

### refactor

- Split `src/commands/publish.ts` into `src/core/publish/postiz/{client,markers,media,adapter,admin}` (barrel `src/core/publish/postiz/index.ts`); the command file no longer re-exports Postiz internals. Studio `lib/postiz.ts` imports the same client — one Postiz client, no drift.
- Split skill lifecycle into `src/core/skill-*.ts`; canonical `flagValue`/`flagValues` in `src/core/args.ts`.
- `wrapRoute` rate limiting is perimeter-only (no double-counting on nested routes).

### fix

- SSRF: `fetchWithSizeCap` follows at most one redirect hop and re-validates the target host (private/loopback targets and second hops are rejected). Covered by `tests/url-validation-redirect.test.ts`.
- `mktg skill graph` no longer crashes on skills outside the five layers (new skills mapped to `execution`/`creative`).
- Studio post-composer buckets `postType` on the CLI vocabulary (`schedule`, `update`), so scheduled publishes are no longer reported as drafts.

### counts

- 58 → 76 skills (2 orchestrators `/cmo` + `/axi`, Exa quintet, 8 OpenSEO skills, text-to-speech + 3 manim skills); 1 → 2 catalogs (postiz, openseo); 21 → 24 commands (`route`, `seo`, `release`, `ship-check`, `setup`).

## v0.6.0

### feat

- add `seo-machine` skill — end-to-end organic-traffic engine that ships programmatic landing pages (alternatives, comparisons, use-cases, playbooks) on a persistent multi-phase roadmap (`docs/seo-machine.md`). Two modes auto-detected; Initialize / Resume. Stack-native (Next.js, Astro, Rails+Inertia, markdown fallback).
- add `off-page-seo` skill — backlink + outreach target list generator (directories, listicles, guest-post candidates) with Recipe F referring-domains research. Pairs with the new `mktg-backlink-prospector` agent.
- add `mktg-backlink-prospector` agent — parallel research sub-agent. 6 agents total now (3 research + 1 backlink prospector + 2 review).
- Exa-native research stack: 7 recipes in `seo-machine/references/exa-recipes.md` + 4 compound recipes in `api-stack-recipes.md` (pain-point cluster discovery, OSS competitor teardown, outreach prospect discovery, newcomer surveillance). Ahrefs demoted to a paid-precision footnote, not chained in.
- `/cmo` Playbook #9 (SEO Authority Build) forked into Path A (short-horizon authority push) + Path B (programmatic sprint via seo-machine) with 5 sub-playbooks: weekly maintenance loop, post-launch ignition, AI overview chase, /for/ persona discovery, seasonal replanner.
- DR-cap heuristic + 3-tier confidence labels (`high|medium|estimated`) added to `keyword-research` output schema.

### update

- `competitor-alternatives`: mandatory honesty section (3 honest tradeoffs where the competitor wins) + Anti-Pattern explaining WHY.
- `seo-audit/references/schema-templates.md`: per-page-type schema requirements table.
- `ai-seo`: "Playbook pages = AI-citation surface" section.
- `seo-content`: prioritization cross-reference to seo-machine's publishing order.
- `brand-voice`: new `references/honesty-as-positioning.md`.
- `brand/SCHEMA.md`: `positioning.md` gains Anti-Positioning + Concrete Differentiators required sections.
- `AGENTS.md`: Long-Arc Phase Persistence pattern + Reference-Implementation Traceability convention.

### counts

- 56 → 58 marketing skills (1 orchestrator + 57 playbook skills).
- 5 → 6 agents.

## v0.5.7

### feat

- chrome cleanup, IA consolidation, Pulse rebuild, primitives unification, perf hardening
- shared manifest sync, skill count single-source, tarball strip
- localhost-only studio API with token auth

### fix

- strip em-dashes from launcher banner comments
- cmo orchestration cleanup, frontmatter normalization, archetype schema
- kill silent error swallow, fix success screen lie, clean up demo seed

### docs

- bump stale '51 skills' anti-pattern callout to 56

### test

- add lane 7 lighthouse + bundle assertions report
- real end-to-end coverage across 9 lanes

## v0.5.6

### feat

- auto-install @higgsfield/cli alongside marketing-cli
- add 3 Higgsfield skills (generate, soul-id, product-photoshoot) + chain in CLI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4] - 2026-05-03

### Added

- `mktg update --check` and `mktg update --upgrade` flags. The first does a read-only
  comparison of installed vs. npm-latest. The second runs the upgrade with EACCES
  handling and clear sudo guidance.

### Fixed

- **First-launch cold boot is fast and quiet.** TypeScript now ships in the
  published tarball, so Next.js no longer auto-spawns pnpm install + ~30 lines of
  noise on the first `mktg studio` invocation. New users see a friendly banner +
  go straight to "Ready in Xs."
- **Sudo installs work correctly.** When users `sudo npm i -g marketing-cli`, the
  postinstall now detects `SUDO_USER`, resolves the real user's home directory,
  copies skills + agents there (not `/var/root/.claude/`), and chowns the files
  back to the user. Silent breakage on sudo paths is gone.

### Internal

- studio/package.json declares `pnpm.onlyBuiltDependencies` so the
  "Ignored build scripts: unrs-resolver" warning no longer prints on cold boot.

## [0.5.3] - 2026-05-03

### Changed

- **`/mktg-setup` Step 1 splits identity into two AskUserQuestion calls.** Step 1a asks the setup mode ("From a URL", "Local conversational setup", or "Pre-launch / open source / personal brand"); Step 1b captures the URL only when the user picks the URL path; Step 1c captures a one-sentence description on the local/pre-launch paths. The URL is passed straight to `mktg init --from <url>` without wizard-side validation — the CLI is the single source of truth for URL handling. The local path stays end-to-end functional with no URL required.
- **`brand/cmo-preferences.md` Identity schema** now records `Setup mode: from-url | local | pre-launch`, plus `URL: <captured URL>` when the mode is `from-url`. `/cmo` and Studio read these fields the same way they read every other preference — no schema migration needed for users on the prior shape; the new fields appear on next setup-or-edit.

### Internal

- No CLI code changes. SKILL.md only — frontmatter, `allowed-tools`, and `skills-manifest.json` triggers are untouched, so the manifest test (`bun test tests/manifest.test.ts`) continues to pass.

## [0.5.2] - 2026-05-03

### Changed

- **README rewritten around the new first-run wizard.** Quick Start now reflects the actual zero-install path: `npm i -g marketing-cli` then `/cmo`, which auto-routes to the 4-question wizard. No more `mktg init` step to remember — it's covered by the wizard's foundation flow.
- **npm package description updated** to advertise the wizard, the correct skill count (51), and the Studio (beta) flag, matching the rest of the package's surface.

### Internal

- No code changes — release-readiness polish ahead of the public repo flip.

## [0.5.1] - 2026-05-03

### Added

- **Studio (beta) opt-in question** in the first-run wizard. `/mktg-setup` is now a 4-question flow — identity, posture, distribution, Studio. The Studio question is flagged as beta and asks whether the user wants the dashboard auto-opened. The choice is recorded as `studio_enabled: yes|no` in `brand/cmo-preferences.md`.
- **`/cmo` respects `studio_enabled` on every activation.** If the user opted out, `/cmo` never auto-launches `mktg studio` from foundation flows or recommendations — the user can still launch manually. If they opted in, Studio auto-opens at the end of foundation work and when they ask to "show the dashboard." Returning users without a preferences file get a conservative default (no auto-launch) until they record one.

### Changed

- Wizard step count: 3 → 4 (Studio question added between Distribution and Write Preferences).
- `cmo-preferences.md` schema: new `## Studio` section with `studio_enabled` field.

## [0.5.0] - 2026-05-03

### Added

- **First-run conversational setup wizard (`/mktg-setup`).** Brand-new skill that fires automatically the first time a user invokes `/cmo` in a fresh project. Three AskUserQuestion calls — identity (URL or sentence), posture (aggressive launch / steady authority / founder-led / product-led growth), and distribution preferences — then writes the answers to `brand/cmo-preferences.md` and hands off to `/cmo`'s foundation flow which spawns the 3 research agents in parallel. The skill records a small set of decisions as a persistent contract — the runtime brain — instead of trying to fill every brand file inline.
- **`brand/cmo-preferences.md`** — new persistent file recording the user's posture and distribution preferences. `/cmo` reads it on every activation and uses it to shape skill prioritization (e.g., `aggressive-launch` posture pushes `launch-strategy` and `startup-launcher` to the front of the queue).
- **`/cmo` first-run detection.** Activation flow now checks for `brand/cmo-preferences.md` and routes to `/mktg-setup` automatically when missing. Returning users with populated brand files but no preferences file get a one-time suggestion to record posture for sharper downstream prioritization.

### Changed

- Skill count: 50 → 51 (added `mktg-setup`). Manifest, postinstall, and skill registry updated.
- `SkillRoutingEntry.precedence` type extended to include `"first-run"` so the wizard can declare itself as the very first step in any new project's marketing flow.

## [0.4.0] - 2026-05-03

### Added

- **Single-package monorepo.** `mktg-studio` is now folded into `marketing-cli` as a workspace member at `studio/`. One `npm i -g marketing-cli` installs the CLI and the Studio dashboard together; `mktg studio` boots the bundled Next.js + Bun API surface with no second install. Brand memory under `brand/` continues to persist locally across sessions and now drives both the CLI and the dashboard from the same source of truth.

### Fixed

- **Tightened the published file allowlist.** The npm tarball's `files` array is now an explicit, granular allowlist of exactly what ships, and a `studio/.npmignore` is shipped as defense-in-depth. Prevents stray repo content from being pulled into future tarballs.

### Internal

- Scrubbed internal agent codenames from source comments.
- Added `_drafts/` to `.gitignore` so local verification reports stay out of the repo.

## [0.3.2] - 2026-05-01 (public launch)

### Added

- **Studio dashboard bundled inside the marketing-cli tarball.** The `studio/` workspace member (Next.js dashboard + Bun API) ships in the same npm package as the CLI, so `npm i -g marketing-cli` installs the agent surface and the dashboard surface together. `mktg studio` resolves the in-repo `studio/` subfolder first; sibling-checkout, `MKTG_STUDIO_BIN`, and `mktg-studio` on PATH remain as local-dev fallbacks. No second install command, no separate npm package.
- **Public-launch assets**: `banner.svg` and `explainer.gif` regenerated against the current 50-skill / 5-agent / 20-command surface; launch video re-rendered from the same source-of-truth.

### Changed

- **Root narrative pivot to single-package framing.** `README.md`, `CLAUDE.md`, `AGENTS.md`, and `CONTEXT.md` rewritten so the story is one npm package with two surfaces (CLI for the agent, Studio for the human) instead of the prior two-package framing. README hero tightened, `(TBD)` columns dropped, repo-layout table reframed around `Launched via` rather than `Published as`.
- **Studio-side docs** (`studio/README.md` and `studio/docs/**`) updated to match the bundled-package framing so the CLI and Studio docs read as one coherent product.
- **Repo metadata + community files** prepared for the public flip: `package.json` description, keywords, repository links; `LICENSE`, `CONTRIBUTING.md`, and `SECURITY.md` reviewed and tightened; GitHub repo description and topics aligned with the launch positioning.

### Documentation

- **Sync test counts to live state.** README test badge + 3 prose mentions and CONTRIBUTING bumped from `2,586 tests across 94 files` to `2,599 tests across 96 files`. Counts had drifted ~13 tests behind reality between the 0.3.0 launch and this audit.
- **Drop dead `privacyPolicyURL` from `.codex-plugin/plugin.json`** so the plugin manifest no longer points at a 404. Will be reinstated when an actual privacy page ships.
- **`SECURITY.md`**: add a Disclosure history section documenting the 2026-04-16 commit `2f952f4` that briefly committed Next.js preview-mode keys inside a `website/.next/` build cache. Keys were reverted in `91794de`, are dead build artifacts for a `website/` subdir that was never deployed under those keys, and remain in git history only. No service was ever protected by them; no rotation required.

### Other

- Defensive `.gitignore` polish: add `*.pem`, `*.key`, `id_rsa*`, `secrets/`, `credentials.json` so accidental drops never get tracked.

## [0.3.1] - 2026-04-25

### Fixed

- **Global npm install now installs Claude skills and agents.** `npm install -g marketing-cli` runs a best-effort postinstall that copies the 50 bundled skills into `~/.claude/skills/` and the 5 bundled agents into `~/.claude/agents/`. `mktg init` remains the project bootstrap step for `brand/` memory and health checks.

### Tests

- Added a postinstall regression test that runs the installer with an isolated `HOME` and verifies all 50 skills plus 5 agents are written to disk. Full suite: 2586 pass / 0 fail (verified 2026-04-25).

## [0.3.0] - 2026-04-21 (launch)

### Added

- **`mktg studio` command**. A thin top-level wrapper that boots the mktg-studio dashboard (Bun API on `:3001` + Next.js on `:3000`) with live-tagged streaming, `--open` to autolaunch the browser, `--help` flag, `.env.local` loading. Adds a single install path: `npm i -g marketing-cli` then `mktg studio`. Real-spawn E2E tests cover the happy path + port collision + help output.
- **`mktg verify` command**. One CLI invocation runs every real-data E2E suite against the running studio + returns a structured pass/fail report. Supports `--json`, `--dry-run`, `--suite=<name>`, `--fields=`. Used by the launch-day pre-flight checklist.
- **`mktg ship-check` command**. Aggregated go/no-go verdict computed live from mktg doctor + studio /api/health + open P0 count + latest audit artifact baselines. Structured output so CI + launch ops can gate a release on it.
- **`mktg cmo` command**. Headless `/cmo` spawn via `claude -p`. Lets tooling + tests drive a /cmo session programmatically without opening an interactive Claude Code window. Unlocks the (10-min /cmo live soak) at production scale.
- **/cmo upgraded in three passes**:
  - Pass 1: mktg-studio integration, monorepo sibling rules, two new playbooks, `mktg studio` routing
  - Pass 2: full route audit + firecrawl routing row + 3 disambiguation rules
  - Pass 3: E0-E4 ecosystem-readiness axis (studio-offline, SSE-drop, postiz-rate-limit error-recovery branches)
  - 5th studio verb `schema-fetch` added so /cmo can self-discover route shapes without out-of-band docs

### Changed

- **Component counts bumped to 20 CLI commands** (was 16 in 0.2.0). `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, and `README.md` all reflect the current surface. Test count: 2584 pass / 0 fail (verified 2026-04-23).

### Tests

- **Real-spawn E2E for `mktg studio`** covers the launcher end-to-end (spawns Bun + Next.js, probes health, cleans up on exit).
- **Agent DX 21 / 21 re-verified** post-studio + post-/cmo upgrade. All seven axes × three tiers still pass with live curl receipts against the current CLI surface.

### Known at launch

- `mktg studio` subcommand requires `marketing-cli@0.3.0+`. Users on older globals need `npm i -g marketing-cli@latest`. Tracked as a pre-flight item in the launch checklist.

## [0.2.0] - 2026-04-15

### Added

- **Upstream catalogs** — a new first-class concept for integrating OSS projects mktg builds on top of. Parallel to `skills/` and `agents/`. Shipped with the `postiz` catalog (social scheduling, 30+ providers).
- **`mktg catalog` command** with subcommands `list`, `info <name>`, `sync`, `status`, `add <name>`. Full DX treatment: `--json`, `--dry-run`, `--fields`, `--confirm`, schema entry, typed `CommandResult`.
- **Postiz publish adapter** (`mktg publish --adapter postiz`) — raw-fetch REST API integration, two-step flow (resolve integrations → post drafts), per-campaign sent-marker dedupe at `.mktg/publish/<campaign>-postiz.json`. No `@postiz/node` dependency (AGPL firewall).
- **`--list-integrations` flag** on `mktg publish` — queries connected providers via the adapter, returns structured list for skill "On Activation" feature detection.
- **`postiz` skill** (`skills/postiz/SKILL.md`) — agent-facing entry for platform-scoped distribution ("post to linkedin", "post to reddit", "post to bluesky", "post to mastodon", "post to threads", "schedule via postiz"). Zero trigger collisions with existing skills.
- **`catalogs-manifest.json`** — registry for upstream catalog entries, shipped in the npm package.
- **`/cmo` upgraded to end-to-end orchestrator** — full coverage of all 50 skills, 5 sub-agents, 10 named multi-skill playbooks (Full Product Launch, Content Engine, Founder Voice Rebrand, Conversion Audit, Retention Recovery, Visual Identity, Video Content, Email Infrastructure, SEO Authority Build, Newsletter Launch), L0–L4 progressive enhancement ladder, full `mktg` command reference, brand-file-to-skills reverse index, error recovery + degraded-mode playbook, quality gate integration (`ai-check`, `editorial-first-pass`, `mktg-content-reviewer`, `mktg-seo-analyst`), multi-project awareness, learning loop via `mktg plan --learning`.

### Changed

- **Revised `CatalogEntry` type** — stress-tested against cal.com + listmonk. Uses `capabilities: {publish_adapters, scheduling_adapters, email_adapters}` rather than a flat `adapters: string[]`, `transport: "sdk" | "http"` with nullable `sdk_reference`, and a generalized `auth: {style, base_env, credential_envs[], header_format}` supporting bearer / basic / oauth2 / none.
- **Extended `PublishItem.metadata`** — now `Readonly<Record<string, string | readonly string[] | undefined>>` to support postiz's `providers: string[]` handoff and future catalog adapters.
- **`getNestedValue` (src/core/output.ts)** — now walks arrays, enabling `--fields` traversal of nested arrays like `catalog list --fields catalogs.name`. Fixes a previously flagged audit gap.
- **Publish adapter registry now first-class** — `BUILTIN_PUBLISH_ADAPTERS` exported from `src/commands/publish.ts` for load-time collision detection in `src/core/catalogs.ts`. Catalogs that declare overlapping adapter names fail with `CATALOG_COLLISION` at load time.
- **`social-campaign` Phase 5** — extended with conditional postiz routing. Typefully path (Case A) preserved verbatim for users without postiz; Postiz path (Case B) activates when the catalog is configured. Zero behavior change for existing users.
- **CLAUDE.md / AGENTS.md / CONTEXT.md / README.md** — new "Upstream Catalogs" section (distinct from Ecosystem), Drop-in Catalog Contract (parallel to Skill + Agent contracts), `mktg catalog` usage patterns, and bumped component counts across the board: 50 skills / 16 commands / 1 upstream catalog.
- **Stale test counts replaced** — `cli.test.ts`, `cli-updated.test.ts`, `json-output-contract.test.ts` switched from hardcoded `toHaveLength(15)` / `toHaveLength(49)` to `toBeGreaterThanOrEqual` per the project's "never hardcode counts" testing convention.

### Security

- **AGPL firewall** — `package.json` test asserts `@postiz/node` is never added as a dependency in any of `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. A separate test asserts no source file imports or requires from `@postiz/node`. Mktg stays MIT-clean while integrating with an AGPL-3.0 upstream via REST API.
- **License allowlist on catalog load** — `loadCatalogManifest` rejects catalogs that declare a copyleft license (AGPL, GPL, LGPL) unless `transport === "http"` AND `sdk_reference === null`, enforcing the network-boundary model at load time.

### Tests

- **+106 new passing tests** across 4 new integration files (`catalog-command.test.ts`, `catalog-manifest.test.ts`, `postiz-adapter.test.ts`, `postiz-idempotency.test.ts`). Baseline moved from 2373 → 2479 pass / 0 fail / 14,153 expects / 87 test files.

## [0.1.1] - 2026-04-13

### Fixed

- `mktg init` now succeeds in non-TTY shells (e.g., `npm i -g marketing-cli && mktg init`) by auto-deriving defaults instead of returning `MISSING_INPUT`.
- `DOCS` URLs in `src/core/errors.ts` no longer point at `github.com/moizibnyousaf/mktg` (404). Anchors resolve against the real repo paths (`docs/skill-contract.md`, `brand/SCHEMA.md`, `README#commands`).
- `MKTG_X_AUTH_TOKEN` and `MKTG_X_CT0` docs links in `mktg doctor --json` now point at `skills/mktg-x/SKILL.md`.
- Three pre-existing failing `CLAUDE.md consistency` tests removed. The brittle prose-substring asserts were replaced with the manifest-driven coverage that already existed in the suite. Full test run: 2372 pass / 0 fail.
- Stale skill count ("46 skills") in `package.json` description; now matches the manifest (49).

### Changed

- Added `src/constants.ts` with a single `GITHUB_REPO_URL` constant so future repo renames touch one file.

## [0.1.0] - 2026-03-13

### Added

- Initial public release
- 14 CLI commands: `init`, `doctor`, `status`, `list`, `update`, `schema`, `skill`, `brand`, `run`, `context`, `plan`, `publish`, `compete`, `dashboard`
- 49 marketing skills across 9 categories
- 5 research and review agents
- Brand memory system (10 compounding brand files)
- Skill lifecycle management (dependency DAG, freshness, versioning)
- Integration checks for third-party skills (Typefully, Resend)
- Schema introspection (`mktg schema --json`)
- `/cmo` orchestrator skill with routing table and disambiguation
- Parallel foundation research (3 agents: brand, audience, competitive)
- 1,400+ tests with real file I/O (no mocks)
- GitHub Actions CI (test + typecheck on PR)
- Marketing website (Next.js)
