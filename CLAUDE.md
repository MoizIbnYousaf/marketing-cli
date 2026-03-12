# mktg — Agent-Native Marketing Playbook CLI

## What This Is

`mktg` is a TypeScript/Bun CLI that gives AI agents full CMO capabilities. One install = full marketing department.

**Three components:**
1. `mktg` CLI — the toolbox (38 marketing skills as CLI commands)
2. `/cmo` skill — the brain (teaches agents how to orchestrate the CLI)
3. `brand/` directory — the memory (compounds across sessions)

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
