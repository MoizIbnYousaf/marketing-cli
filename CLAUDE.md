# mktg — Agent-Native Marketing Playbook CLI

## Workflow Gates

- **Session start:** Always run `/mktg-coding-bar` before any work to internalize coding standards.
- **Before final commits:** Always run `/agent-dx-cli-scale` to verify the 21/21 Agent DX score is maintained.

## Vision

`mktg` gives an AI agent a complete CMO brain: durable brand memory, parallel research, and a packaged marketing playbook that can work across projects and machines.

The skills and the CLI are two separate things that work in perfect unison:
- **Skills** = marketing knowledge (SKILL.md files) the agent reads to know HOW to do marketing
- **CLI** = infrastructure tool the agent runs for setup, health checks, and skill management
- **`/cmo` skill** = the glue that teaches the agent how to orchestrate skills + CLI together

This needs to work on any machine. `mktg init` self-bootstraps everything: installs skills into the agent's config, scaffolds `brand/`, and runs doctor to verify the setup.

## What This Is

`mktg` is a TypeScript/Bun CLI that gives AI agents full CMO capabilities. One install = full marketing department.

**Five components:**
1. `mktg` CLI — infrastructure tool (9 top-level commands: init, doctor, list, status, update, schema, skill, brand, run)
2. `/cmo` skill — the brain (teaches agents how to orchestrate everything)
3. `brand/` directory — the memory (10 files that compound across sessions)
4. 41 marketing skills — the knowledge
5. 5 marketing agents — parallel sub-agents for research and review (installed to `~/.claude/agents/`)

## Architecture

```
src/
├── cli.ts              # Entry point, command router, global flag parsing
├── types.ts            # All shared TypeScript types
├── commands/
│   ├── init.ts         # Scaffold brand/ + install skills
│   ├── doctor.ts       # Health checks (brand, skills, CLIs)
│   ├── list.ts         # Show available skills with status
│   ├── status.ts       # Project marketing state snapshot
│   ├── update.ts       # Re-copy skills from package to agent config
│   ├── schema.ts       # CLI self-discovery
│   ├── skill.ts        # Skill lifecycle subcommands
│   ├── brand.ts        # Brand lifecycle subcommands
│   └── run.ts          # Load a skill for agent consumption
├── core/
│   ├── output.ts       # JSON/TTY formatting, --fields filtering
│   ├── errors.ts       # Structured errors, exit codes 0-6, sandboxPath()
│   ├── brand.ts        # Brand dir management + freshness assessment
│   ├── skills.ts       # Skill registry, install, integrity verification
│   └── agents.ts       # Agent registry, install to ~/.claude/agents/
skills/                  # 41 SKILL.md files installed to ~/.claude/skills/
skills-manifest.json     # Definitive skill list with metadata
agents/                  # 5 agent .md files installed to ~/.claude/agents/
├── research/            # brand-researcher, audience-researcher, competitive-scanner
└── review/              # content-reviewer, seo-analyst
agents-manifest.json     # Definitive agent list with metadata
```

- **Agent-first:** JSON output, structured errors, exit codes, --dry-run, schema introspection
- **CLI-only integrations:** gws, playwright-cli, Remotion, ffmpeg, Exa MCP

## Key Principles

1. **Progressive Enhancement** — Every skill works at zero context. Brand memory enhances, never gates.
2. **Agent-native** — Built for agents to run, not humans. Predictability over discoverability.
3. **Self-bootstrapping** — `mktg init` installs everything on any machine.
4. **Drop-in skills** — Add a skill by dropping SKILL.md + updating `skills-manifest.json`. No CLI code changes.
5. **Drop-in agents** — Add an agent by dropping .md file in `agents/` + updating `agents-manifest.json`.
6. **Skills never call skills** — Skills read/write files. `/cmo` orchestrates. Agents never call agents.
7. **Parallel by default** — Foundation building spawns 3 research agents simultaneously via the Agent tool.
8. **Composable orchestrators** — Skills are Lego blocks, orchestrators are recipes. `/tiktok-slideshow` chains `/slideshow-script` → `/paper-marketing` → `/video-content`. Same blocks reuse for different platforms.

## Commands

```
mktg init       — Detect project + build brand/ + install skills + install agents
mktg doctor     — Health checks (brand files, skills, CLI tools)
mktg list       — Show available skills with install status
mktg status     — Project marketing state snapshot (JSON for agents)
mktg update     — Re-copy bundled skills to agent config
mktg schema     — Introspect commands, flags, and outputs
mktg skill      — Skill lifecycle management
mktg brand      — Brand lifecycle management
mktg run        — Load a skill and log execution
```

**Global flags:** `--json`, `--dry-run`, `--fields`, `--cwd`, `--help`, `--version`

## Skills (41 total)

Skills follow the drop-in contract. See `skills-manifest.json` for the full registry.

**Foundation:** cmo, brand-voice, positioning-angles, audience-research, competitive-intel, brainstorm
**Strategy:** keyword-research, launch-strategy, pricing-strategy
**Copy & Content:** direct-response-copy, seo-content, lead-magnet
**Distribution:** content-atomizer, email-sequences, newsletter
**Creative:** creative, marketing-demo, paper-marketing, slideshow-script, video-content, app-store-screenshots, frontend-slides
**SEO:** seo-audit, ai-seo, competitor-alternatives
**Conversion:** page-cro, conversion-flow-cro
**Growth:** churn-prevention, referral-program, free-tool-strategy, startup-launcher
**Knowledge:** marketing-psychology
**Orchestrators:** tiktok-slideshow (chains slideshow-script → paper-marketing → video-content)

## Security Posture

**The agent is not a trusted operator.** All inputs from agent callers are treated as potentially adversarial:

- `rejectControlChars()` — reject control characters in all text inputs (skill names, brand content)
- `validateResourceId()` — reject `?`, `#`, `%`, spaces, slashes in resource IDs
- `detectDoubleEncoding()` — catch `%25XX` bypass attempts before path resolution
- `validatePathInput()` — combined pipeline: control chars → double encoding → sandboxPath
- `sandboxPath()` — reject absolute paths, `..` traversal, symlink escape
- `parseJsonInput()` — size limits (64KB), prototype pollution detection

All validation functions return `{ ok, message }` — never throw. Error messages explain what's wrong and why.

## Agent DX Score: 21/21 (Agent-First)

Every code change must maintain this score. The 7 axes:

| Axis | Standard | Test proof |
|---|---|---|
| Machine-Readable Output | All commands return valid JSON. Auto-JSON when piped (non-TTY). Consistent error envelope with code + message + suggestions + exitCode. | `tests/integration/machine-readable-output.test.ts` |
| Raw Payload Input | `--input` accepts full JSON payload on brand/skill commands. Zero translation loss. | `tests/integration/raw-payload-input.test.ts` |
| Schema Introspection | `mktg schema` returns responseSchema with typed fields, enums, required markers, nested detection. | `tests/integration/schema-introspection.test.ts` |
| Context Window Discipline | `--fields` works on all commands with dot-notation. 10KB response size warning on stderr. | `tests/integration/context-window-discipline.test.ts` |
| Input Hardening | rejectControlChars, validateResourceId, detectDoubleEncoding, validatePathInput on all inputs. 52 fuzz tests. | `tests/integration/input-hardening.test.ts` |
| Safety Rails | `--dry-run` on ALL mutating commands. `--confirm` on destructive ops (brand import, skill unregister). Response size warnings. | `tests/integration/safety-rails.test.ts` |
| Agent Knowledge Packaging | AGENTS.md, brand/SCHEMA.md, all 41 skills versioned, OpenClaw-compatible frontmatter. | Manual review |

Environment variables: `OUTPUT_FORMAT=json` forces JSON. `NO_COLOR=1` disables ANSI.

## Testing Standards

**NO MOCKS. NO FAKE DATA. Real file I/O in isolated temp dirs.**

```
tests/                    # Unit tests per module
tests/integration/        # Per-command integration tests
tests/integration/cmo/    # CMO coherence tests (orchestrator visibility)
tests/e2e/                # Full pipeline soup-to-nuts tests
```

Rules:
- `bun:test` imports only
- Real file I/O in temp dirs created with `mkdtemp`
- Every assertion checks REAL output from REAL operations
- Zero mocks, zero fake data, zero fake API calls
- Run `bun test` after every change, report results
- Never hardcode skill counts — read from manifest or use `toBeGreaterThanOrEqual`

## CLI Command Standards

Every command handler must:
- Return `CommandResult<T>` with typed data
- Support `--json` (auto-enabled when piped via `!isTTY()`)
- Support `--dry-run` for mutating operations
- Support `--fields` for output filtering (dot-notation)
- Support `--confirm` for destructive operations
- Include `fix` field on error/warning checks
- Have schema documentation in `schema.ts` with responseSchema
- Have NDJSON option for list-like commands (`--ndjson`)

## Skill Standards

Every SKILL.md must:
- Be under 500 lines (offload depth to `references/`)
- Have frontmatter: `name`, `description` (pushy triggers that combat undertriggering)
- Have On Activation section reading brand/ files with fallback behavior
- Have Anti-Patterns with WHY reasoning (not just "don't do X → do Y")
- Have progressive enhancement (work at L0 zero context, better at L4 full brand)
- Use `voice-profile.md` (NEVER `voice.md`)
- Have consistent section ordering matching sibling skills
- All brand file references use `brand/` prefix in frontmatter reads

## Brand File Standards

Per `brand/SCHEMA.md`: 10 files, each with defined required sections.
- `voice-profile.md` is the canonical name
- Template detection via SHA-256 hash comparison in `isTemplateContent()`
- Freshness: 30-day for profiles, 90-day for config, never-stale for append-only
- CONTEXT_MATRIX maps skill layers to required brand files

## Dev Notes

- Use `bun` for all package operations
- Functional patterns, no classes
- Named exports only
- Keep files under 300 lines
- Tests: `bun test` with `bun:test` imports, real file I/O in isolated temp dirs (no mocks)
- Build: `bun build src/cli.ts --outdir dist --target node`
- Type check: `bun x tsc --noEmit`
- Commit frequently during long sessions to protect work
- Never hardcode "39" or "41" — read skill count from manifest dynamically
