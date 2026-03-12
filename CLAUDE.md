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

**Four components:**
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

## Discovering Commands

**Before implementing or testing any command, run `--help` to confirm the exact interface.** The CLI is self-documenting:

```bash
mktg --help                    # List all commands
mktg <command> --help          # Show flags and usage for a command
mktg schema <command>          # Introspect expected inputs/outputs
mktg list                      # Show all available skills
```

Do not memorize commands. Always check `--help` or `mktg schema` for the current interface.

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

## Dev Workflow

```bash
bun install              # Install dependencies
bun run build            # Build the CLI
bun run typecheck        # Type check
bun run lint             # Lint code
bun test                 # Run tests
```

## PR Guardrails

Before opening or updating a PR, always run:

```bash
bun run typecheck
bun run lint
bun test
```

If command help text or schemas changed, verify with `mktg schema` and `mktg --help`.

## Dev Notes

- Use `bun` for all package operations
- Functional patterns, no classes
- Named exports only
- ESM modules with `.js` extensions in imports
- `node:` prefix for built-in modules
- Keep files under 300 lines
- Handle errors at boundaries, not deep in utilities
- Never swallow errors silently

## Debugging Principles

- **Reproduce first**: Before fixing, run the failing test locally to confirm the issue. Don't assume you understand the bug.
- **One change at a time**: Make one small fix, verify it works, then move to the next. Don't batch multiple changes.
- **Re-run after each fix**: Re-run the specific failing test after each fix before running the full suite.
- **One logical change per commit**: Keep commits narrowly scoped and reviewable.
- **Never bypass checks**: Don't use `--no-verify`, don't push directly to `main`, don't skip tests.
- **Verify before claiming done**: Run the specific failing test again to confirm it's fixed.

## Definition of Done

A change is done when:
1. All checks pass (`typecheck`, `lint`, `test`)
2. Key scenarios are validated (not just happy paths)
3. The PR description includes what was changed, why, and what was tested

For CLI behavior changes (flags, output, errors):
- Add tests that assert both valid and invalid usage
- Test structured JSON output by parsing it, not string matching
- Verify `--dry-run` behavior for any command that has side effects

## Agent Explainability

For each substantial change, include:
- Why this approach was chosen
- One to two alternatives considered and trade-offs
- Expected invocation examples and outputs
- Edge cases and failure modes tested

A change is not done if a reviewer cannot understand the behavior and trade-offs from the PR description.

## References

Detailed guidance on specific topics (only read when needed):

- **Original brainstorm**: `docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md`
- **Implementation plans**: `docs/plans/`
- **Research & analysis**: `docs/research/`
- **LLM quick-reference**: `llms.txt`
