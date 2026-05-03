# Marketing CLI Agents

Research and review sub-agents used by `/cmo`.

`mktg init` and `mktg update` install these files to `~/.claude/agents/` with a
`mktg-` prefix to avoid collisions.

## Agent set

- `mktg-brand-researcher`
- `mktg-audience-researcher`
- `mktg-competitive-scanner`
- `mktg-content-reviewer`
- `mktg-seo-analyst`

## Rules

- Agents do not call other agents.
- Agents do not orchestrate. `/cmo` orchestrates.
- Research agents may write only their declared `brand/` files.
- Review agents score and critique; they do not mutate project files.

The source of truth is `../agents-manifest.json`.
