# Marketing CLI Skills

Skill files that teach an AI agent how to run a full marketing operating system.

`npm install -g marketing-cli` installs the CLI. A global install also copies
these skills to `~/.claude/skills/`. `mktg init` or `mktg update` refreshes them
from the package at any time.

## How agents should use this

Start with `/cmo`. It is the orchestrator that reads project state, checks brand
memory, and routes requests to the right skill.

For direct CLI operation, read:

- `../CONTEXT.md`
- `cmo/rules/cli-runtime-index.md`
- `cmo/rules/publish-index.md`
- `cmo/rules/studio-api-index.md`

## What ships

- 50 marketing skills across foundation, strategy, creative, distribution,
  conversion, growth, review, and infrastructure.
- Brand-memory reads and writes through `brand/*.md`.
- Runtime discovery through `mktg schema --json`, `mktg list --routing --json`,
  and `mktg status --json`.

The agent does not need to memorize the CLI. It should discover the runtime
surface with `mktg schema --json` and use `--json`, `--fields`, and `--dry-run`
before mutating commands.
