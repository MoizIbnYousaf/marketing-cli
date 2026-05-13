# mktg: Agent-Native Marketing Playbook CLI

> [!IMPORTANT]
> **For runtime CLI usage** (commands, flags, output formats), read `CONTEXT.md` first.
> **For `/cmo` runtime indexes**, read `skills/cmo/rules/cli-runtime-index.md`,
> `skills/cmo/rules/publish-index.md`, and
> `skills/cmo/rules/studio-api-index.md`.
> **For agent/skill contributor guidance**, read `AGENTS.md`.
> This file is the project's development contract: architecture, standards, and rules.

## What This Is

A TypeScript/Bun agent-native marketing playbook CLI. 58 marketing skills, 5 agents, 20 commands, 1 upstream catalog. The Studio dashboard (Next.js + Bun API) ships inside the same tarball and is launched via `mktg studio`.

| Component | Count | Purpose |
|---|---|---|
| `mktg` CLI | 20 commands | Infrastructure: setup, health, skill management, catalog registry, verification, and orchestration |
| `/cmo` skill | 1 orchestrator | Routes every marketing request to the right skill |
| `brand/` directory | 10 memory files (+ SCHEMA.md) | Persistent marketing memory, compounds across sessions |
| Marketing skills | 57 | The playbook, installed to `~/.claude/skills/` |
| Marketing agents | 6 | Parallel sub-agents for research + review, installed to `~/.claude/agents/` |
| Upstream catalogs | 1 | External OSS projects mktg builds on (postiz = 30+ social providers via REST API, AGPL-firewalled) |
| Studio dashboard | 1 | Next.js + Bun API workspace member at `studio/`, bundled in the tarball, launched via `mktg studio` |

## Repo Layout

This is a bun-workspaces monorepo with one publishable package: `marketing-cli`. The `studio/` subfolder is a workspace member; its source ships inside the `marketing-cli` tarball, so `npm i -g marketing-cli` installs the CLI and the dashboard together. The workspace exists because Studio is a Next.js app with its own build pipeline.

| Path | Component | Launched via |
|---|---|---|
| (root) | `marketing-cli` (CLI: skills, agents, brand memory, `/cmo`) | `mktg <command>` |
| `studio/` | Studio dashboard (Next.js + Bun API + Drizzle) | `mktg studio` |

## Architecture

```
src/
├── cli.ts              # Entry point, command router, global flag parsing
├── types.ts            # All shared TypeScript types
├── commands/           # One file per command (init, doctor, status, list, etc.)
├── core/
│   ├── output.ts       # JSON/TTY formatting, --fields filtering
│   ├── errors.ts       # Structured errors, exit codes 0-6, sandboxPath()
│   ├── brand.ts        # Brand dir management + freshness assessment
│   ├── skills.ts       # Skill registry, install, integrity verification
│   ├── skill-add.ts    # External skill chaining (mktg skill add)
│   ├── agents.ts       # Agent registry, install to ~/.claude/agents/
│   └── transcribe.ts   # whisper.cpp + yt-dlp + ffmpeg pipeline
skills/                  # 52 SKILL.md files installed to ~/.claude/skills/
skills-manifest.json     # Definitive skill list with metadata
agents/                  # 5 agent .md files installed to ~/.claude/agents/
agents-manifest.json     # Definitive agent list with metadata
catalogs-manifest.json   # Upstream catalog registry (postiz v1; parallel to skills/agents)
studio/                  # Studio dashboard workspace member (ships inside the tarball)
├── app/                 # Next.js dashboard
├── server.ts            # Bun API server
├── bin/mktg-studio.ts   # Local launcher (mktg studio resolves this first)
├── components/          # React UI
└── package.json         # Workspace package.json: Next.js deps + build scripts (no separate publish)
```

## Key Principles

> [!IMPORTANT]
> These principles are non-negotiable. Every PR, skill, and command must uphold them.

1. **Progressive Enhancement**: Every skill works at zero context. Brand memory enhances, never gates.
2. **Agent-native**: Built for agents to run, not humans. Predictability over discoverability.
3. **Self-bootstrapping**: `mktg init` installs everything on any machine.
4. **Drop-in skills**: Add a skill: drop SKILL.md + update `skills-manifest.json`. No CLI code changes.
5. **Drop-in agents**: Add an agent: drop .md in `agents/` + update `agents-manifest.json`. No CLI code changes.
6. **Skills never call skills**: Skills read/write files. `/cmo` orchestrates. Agents never call agents.
7. **Parallel by default**: Foundation building spawns 3 research agents simultaneously.

## Security Posture

> [!IMPORTANT]
> **The agent is not a trusted operator.** All inputs from agent callers are treated as potentially adversarial.

| Validator | What it catches | Returns |
|---|---|---|
| `rejectControlChars()` | Control characters in skill names, brand content | `{ ok, message }` |
| `validateResourceId()` | `?`, `#`, `%`, spaces, slashes in resource IDs | `{ ok, message }` |
| `detectDoubleEncoding()` | `%25XX` bypass attempts before path resolution | `{ ok, message }` |
| `validatePathInput()` | Combined pipeline: control chars → double encoding → sandboxPath | `{ ok, message }` |
| `sandboxPath()` | Absolute paths, `..` traversal, symlink escape | `{ ok, message }` |
| `parseJsonInput()` | Oversized payloads (>64KB), prototype pollution | `{ ok, message }` |

All validators return `{ ok, message }` and never throw. Error messages explain what failed and why.

## Agent DX Score: 21/21

> [!IMPORTANT]
> Every code change must maintain this score. Tests enforce it.

| Axis | Standard | Test file |
|---|---|---|
| Machine-Readable Output | Valid JSON from all commands. Auto-JSON when piped. Consistent error envelope. | `machine-readable-output.test.ts` |
| Raw Payload Input | `--input` accepts full JSON payload. Zero translation loss. | `raw-payload-input.test.ts` |
| Schema Introspection | `mktg schema` returns responseSchema with typed fields, enums, nested detection. | `schema-introspection.test.ts` |
| Context Window Discipline | `--fields` dot-notation on all commands. 10KB response size warning. | `context-window-discipline.test.ts` |
| Input Hardening | All 6 validators on all inputs. 52 fuzz tests. | `input-hardening.test.ts` |
| Safety Rails | `--dry-run` on ALL mutating commands. `--confirm` on destructive ops. | `safety-rails.test.ts` |
| Agent Knowledge Packaging | AGENTS.md, brand/SCHEMA.md, all skills versioned, OpenClaw frontmatter. | Manual review |

## CLI Command Standards

Every command handler must:

| Requirement | Implementation |
|---|---|
| Typed return | `CommandResult<T>` with typed data |
| JSON output | `--json` flag, auto-enabled when piped via `!isTTY()` |
| Dry run | `--dry-run` for all mutating operations |
| Field filtering | `--fields` with dot-notation |
| Destructive guard | `--confirm` for destructive operations |
| Error guidance | `fix` field on error/warning checks |
| Schema docs | Entry in `schema.ts` with `responseSchema` |
| Streaming | `--ndjson` option for list-like commands |

## Skill Standards

Every SKILL.md must:

| Rule | Why |
|---|---|
| Under 500 lines | Offload depth to `references/` subdirectory |
| Frontmatter with `name`, `description` | Pushy triggers that combat undertriggering |
| On Activation section | Read brand/ files with fallback behavior |
| Anti-Patterns with WHY | Explain why each pattern is wrong; "do Y instead" alone is incomplete |
| Progressive enhancement | Work at L0 (zero context), better at L4 (full brand) |
| Use `voice-profile.md` | NEVER `voice.md` |
| Brand file refs use `brand/` prefix | Consistent path resolution in frontmatter reads |

### Upstream-Mirrored Skills

When a skill mirrors content from an upstream OSS source (the firecrawl pattern, now also Remotion), it MUST ship:
- `upstream.json` provenance manifest (snapshot SHAs, per-file blob SHAs, source list) — the canonical record of which upstream blobs the mirror tracks.
- `scripts/check-upstream.sh` drift detector (emits `{ok, in_sync, sources[].drift}` JSON envelope; exit 0 in sync / 1 drift / 2 error).
- Attribution footer in SKILL.md crediting upstream maintainers and linking the source repo.
- Manifest `source: "new"` plus an `upstream` object recording the source repos and paths (see `remotion-best-practices` for the canonical example). The skill content was curated and mirrored — `"new"` matches the intent (we authored/curated it). The dedicated `upstream` object carries the upstream-mirror semantics: it tracks the source repos, paths, and provenance.

Mirrored content is verbatim. The skill's mktg-adapted SKILL.md is the only file that wraps upstream content with mktg conventions (drop-in frontmatter, brand-ground On Activation section). Drift checks treat adapted files specially via the `note: "adapted-frontmatter"` flag in upstream.json.

See `marketing-cli/skills/remotion-best-practices/` for the canonical example. Phase 2 of /mktg-steal added `mktg skill check-upstream` and `mktg skill upgrade` CLI commands that fan across every skill with an upstream.json.

## Brand File Standards

Per `brand/SCHEMA.md`: 10 memory files (plus the schema file itself), each with defined required sections.

| Rule | Detail |
|---|---|
| Canonical voice file | `voice-profile.md` (never `voice.md`) |
| Template detection | SHA-256 hash comparison in `isTemplateContent()` |
| Freshness: profiles | 30-day staleness window |
| Freshness: config | 90-day staleness window |
| Freshness: append-only | Never stale |
| Skill-to-brand mapping | `CONTEXT_MATRIX` maps skill layers to required brand files |

## Testing Standards

> [!IMPORTANT]
> **NO MOCKS. NO FAKE DATA.** Real file I/O in isolated temp dirs. This is non-negotiable.

```
tests/                    # Unit tests per module
tests/integration/        # Per-command integration tests (all 7 DX axes)
tests/integration/cmo/    # CMO coherence tests (orchestrator visibility)
tests/e2e/                # Full pipeline soup-to-nuts tests
```

| Rule | Detail |
|---|---|
| Test framework | `bun:test` imports only |
| File I/O | Real operations in temp dirs via `mkdtemp` |
| Assertions | Check REAL output from REAL operations |
| Skill counts | Never hardcode; read from manifest or use `toBeGreaterThanOrEqual` |
| Run frequency | `bun test` after every change, report results |

## Dev Notes

| Topic | Rule |
|---|---|
| Package manager | `bun` for all operations |
| Code style | Functional patterns, no classes. Named exports only. |
| File size | Keep under 300 lines |
| Build | `bun build src/cli.ts --outdir dist --target node` |
| Type check | `bun x tsc --noEmit` |
| Commits | Frequently during long sessions to protect work |

## Upstream Catalogs

mktg treats selected OSS projects as **upstream catalogs**: we build *on top of* them via REST API rather than vendoring their code or linking their SDKs. This lets us inherit providers (postiz ships 30+ social channels; future catalogs like cal.com would ship 40+ calendar integrations) without owning the implementation burden or the license inheritance.

The current publish stack also includes `mktg-native`, a local-first
workspace backend for X, TikTok, Instagram, Reddit, and LinkedIn queue/history
state. Native provider/account state lives under `.mktg/native-publish/` and
is documented for /cmo in `skills/cmo/rules/publish-index.md`.

**License firewall.** A catalog's own license never touches mktg's code. For AGPL-licensed upstreams (e.g., postiz), we use `transport: "http"` and raw `fetch`; the upstream's npm package never gets installed. A `package.json` test asserts banned packages stay out of all dependency sections. mktg's license posture stays MIT-clean.

**Runtime model.** Catalogs are **BYO**: the user runs (or subscribes to) the upstream, mktg detects its env vars via `mktg doctor`, and `mktg catalog info <name> --fields configured,missing_envs` reports readiness. Hosted is the default path (less Docker complexity); self-host is documented as advanced.

| Catalog | Upstream | License | Runtime default | Runtime fallback | Env vars |
|---|---|---|---|---|---|
| `postiz` | [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) | AGPL-3.0 (firewalled via raw HTTP) | `https://api.postiz.com` (hosted, Stripe-gated) | Docker self-host (6 containers: Postgres + Redis + Temporal + Elasticsearch + app + worker) | `POSTIZ_API_KEY`, `POSTIZ_API_BASE` |

**Adding a catalog:** see `AGENTS.md` §Drop-in Catalog Contract. Catalogs extend mktg's `publish` adapters (social, email), scheduling (future), and skills catalog without CLI code changes; they drop in via `catalogs-manifest.json`.

**Distinct from Ecosystem.** The `Ecosystem` table below lists **local CLIs** mktg shells out to (ffmpeg, firecrawl, gh). Catalogs are **remote services** with REST APIs. Different trust model, different install story, different version pinning.

## Ecosystem

mktg orchestrates external tools but does not bundle them. `mktg doctor` detects missing tools and surfaces install commands.

| CLI | Role | Install |
|---|---|---|
| `firecrawl-cli` | Web scrape, search, crawl | `npm i -g firecrawl-cli` + `FIRECRAWL_API_KEY` |
| `ffmpeg` | Video assembly, encoding | `brew install ffmpeg` |
| `remotion` | Programmatic React video | `npm i -g @remotion/cli` |
| `playwright-cli` | Browser automation | `npm i -g @playwright/cli` |
| `gh` | GitHub CLI | `brew install gh` |
| `whisper-cli` | Speech-to-text | `brew install whisper-cpp` |
| `yt-dlp` | Media download | `brew install yt-dlp` |
| [`summarize`](https://github.com/steipete/summarize) | Text compression | `npm i -g @steipete/summarize` |
| [`higgsfield`](https://higgsfield.ai/cli) | AI image + video generation (30+ models, Marketing Studio, Soul Characters) | `npm i -g @higgsfield/cli && higgsfield auth login` (paid platform — optional) |

**MCP:** Exa MCP for parallel deep web research (wired via `.mcp.json`).

### Adding a new chained tool

1. Add to the `tools` array in `src/commands/doctor.ts`
2. Add a row to the Ecosystem table above
3. Optionally ship a best-practices skill under `skills/<tool>/` with a `rules/` subdirectory
4. Register the skill in `skills-manifest.json`
