# mktg — Agent-Native Marketing Playbook CLI

## Vision

I (Moiz) work across many projects — CEO app, Halaali, HalalScreen, SkillCreator, and more. Every one of them needs marketing but I don't have time to manually do it all. The idea: **one install gives my agent a complete CMO brain** that can autonomously handle end-to-end marketing for any project.

The problem I'm solving: I have 38 proven marketing skills spread across two repos (my deep skills-v2 system + Corey Haines' marketingskills). They're powerful individually but there's no unified way to install them, orchestrate them, or have an agent use them autonomously. I want to `bun install -g mktg`, run `mktg init` in any project, and have my agent be able to:

- Build complete branding from scratch (or ingest existing brand assets)
- Generate a full launch package — landing page copy, email sequences, SEO content, social posts, lead magnets, videos
- Post to social platforms via Playwright CLI, send emails via gws, generate videos via Remotion
- Compound learnings over time so marketing gets smarter per-project
- Do all of this autonomously with minimal human input

The skills and the CLI are two separate things that work in perfect unison:
- **Skills** = marketing knowledge (SKILL.md files) the agent reads to know HOW to do marketing
- **CLI** = infrastructure tool the agent runs for setup, health checks, distribution, and testing
- **`/cmo` skill** = the glue that teaches the agent how to orchestrate skills + CLI together

This needs to work on any machine — my Mac, a fresh VPS, anywhere. `mktg init` self-bootstraps everything: installs skills into the agent's config, scaffolds `brand/` and `marketing/` directories, runs doctor to verify. No manual setup.

The CLI is built agent-first (JSON output, structured errors, --dry-run, schema introspection, input hardening). The first real test is the CEO app — full marketing package from brand kit to launch content.

## What This Is

`mktg` is a TypeScript/Bun CLI that gives AI agents full CMO capabilities. One install = full marketing department.

**Three components:**
1. `mktg` CLI — infrastructure tool (init, doctor, post, test, update)
2. `/cmo` skill — the brain (teaches agents how to orchestrate everything)
3. `brand/` directory — the memory (compounds across sessions)
4. 38 marketing skills — the knowledge (SKILL.md files agents read for domain expertise)

## Architecture

- **Brainstorm:** `docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md` (source of truth)
- **Skills source:** Two repos merged — skills-v2 (11 deep) + marketingskills (27 breadth)
- **Agent-first:** JSON output, structured errors, exit codes, --dry-run, schema introspection
- **CLI-only integrations:** gws, playwright-cli, Remotion, ffmpeg, Exa MCP

## Key Principles

1. **Context Paradox** — Don't dump all brand context into every skill. Selective context matrix.
2. **Progressive Enhancement** — Every skill works at zero context. Brand memory enhances, never gates.
3. **Agent-native** — Built for agents to run, not humans. Predictability over discoverability.
4. **Self-bootstrapping** — `mktg init` installs everything on any machine.
5. **Package deal** — CLI + /cmo skill + brand/ memory install together.

## Commands

```
mktg init       — Detect project + build brand/ + install /cmo skill
mktg doctor     — Health checks + skill update check
mktg launch     — Full launch package
mktg content    — Generate specific content types
mktg social     — Generate social content
mktg post       — Publish via Playwright CLI
mktg email      — Generate + send via gws
mktg calendar   — 30-day content calendar
mktg audit      — Marketing analysis + scoring
mktg test       — Full e2e pipeline test (real data, no mocks)
mktg update     — Force-update skills
mktg list       — Show available skills
mktg schema     — Introspect command schemas
```

## Dev Notes

- Use `bun` for all package operations
- Functional patterns, no classes
- Named exports only
- Keep files under 300 lines
