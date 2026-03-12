# mktg — Agent-Native Marketing Playbook CLI

## Vision

I (Moiz) work across many projects — CEO app, Halaali, HalalScreen, SkillCreator, and more. Every one of them needs marketing but I don't have time to manually do it all. The idea: **one install gives my agent a complete CMO brain** that can autonomously handle end-to-end marketing for any project.

The skills and the CLI are two separate things that work in perfect unison:
- **Skills** = marketing knowledge (SKILL.md files) the agent reads to know HOW to do marketing
- **CLI** = infrastructure tool the agent runs for setup, health checks, and skill management
- **`/cmo` skill** = the glue that teaches the agent how to orchestrate skills + CLI together

This needs to work on any machine — my Mac, a fresh VPS, anywhere. `mktg init` self-bootstraps everything: installs skills into the agent's config, scaffolds `brand/` directory, runs doctor to verify. No manual setup.

## What This Is

`mktg` is a TypeScript/Bun CLI that gives AI agents full CMO capabilities. One install = full marketing department.

**Five components:**
1. `mktg` CLI — infrastructure tool (5 commands: init, doctor, list, status, update)
2. `/cmo` skill — the brain (teaches agents how to orchestrate everything)
3. `brand/` directory — the memory (9 files that compound across sessions)
4. 30 marketing skills — the knowledge (27 atomic + 3 orchestrators that chain skills together)
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
│   └── update.ts       # Re-copy skills from package to agent config
├── core/
│   ├── output.ts       # JSON/TTY formatting, --fields filtering
│   ├── errors.ts       # Structured errors, exit codes 0-6, sandboxPath()
│   ├── brand.ts        # Brand dir management + freshness assessment
│   ├── skills.ts       # Skill registry, install, integrity verification
│   └── agents.ts       # Agent registry, install to ~/.claude/agents/
skills/                  # 30 SKILL.md files installed to ~/.claude/skills/
skills-manifest.json     # Definitive skill list with metadata
agents/                  # 5 agent .md files installed to ~/.claude/agents/
├── research/            # brand-researcher, audience-researcher, competitive-scanner
└── review/              # content-reviewer, seo-analyst
agents-manifest.json     # Definitive agent list with metadata
```

- **Plan:** `docs/plans/2026-03-12-001-feat-mktg-cli-full-implementation-plan.md`
- **Brainstorm:** `docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md`
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
```

**Global flags:** `--json`, `--dry-run`, `--fields`, `--cwd`, `--help`, `--version`

## Skills (30 total)

Skills follow the drop-in contract. See `skills-manifest.json` for the full registry.

**Foundation:** cmo, brand-voice, positioning-angles, audience-research, competitive-intel, brainstorm
**Strategy:** keyword-research, launch-strategy, pricing-strategy
**Copy & Content:** direct-response-copy, seo-content, lead-magnet
**Distribution:** content-atomizer, email-sequences, newsletter
**Creative:** creative, marketing-demo, paper-marketing, slideshow-script, video-content
**SEO:** seo-audit, ai-seo, competitor-alternatives
**Conversion:** page-cro, conversion-flow-cro
**Growth:** churn-prevention, referral-program, free-tool-strategy
**Knowledge:** marketing-psychology
**Orchestrators:** tiktok-slideshow (chains slideshow-script → paper-marketing → video-content)

## Dev Notes

- Use `bun` for all package operations
- Functional patterns, no classes
- Named exports only
- Keep files under 300 lines
- Tests: `bun test` with `bun:test` imports, real file I/O in isolated temp dirs (no mocks)
- Build: `bun build src/cli.ts --outdir dist --target node`
- Type check: `bun x tsc --noEmit`
