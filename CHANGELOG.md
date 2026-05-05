# Changelog

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
