# Contributing to mktg

## Setup

Fork the repo, clone it, and install dependencies:

```bash
git clone https://github.com/<your-username>/marketing-cli.git
cd marketing-cli
bun install
```

Verify everything works:

```bash
bun test              # 2,599 tests across 96 files, real file I/O, no mocks
bun x tsc --noEmit    # Zero type errors
bun run dev -- doctor --json  # All health checks green
```

All three must pass before you write any code. If `doctor` reports a missing dependency, that's fine; those are optional chained-in tools (ffmpeg, firecrawl, etc.), not required for development.

## Development

```bash
bun run dev -- <command> [flags]    # Run from source
bun test                            # Full suite
bun x tsc --noEmit                  # Type check
bun run build                       # Build to dist/
```

> [!TIP]
> Always pass `--json` during development. JSON output shows exactly what the CLI returns, with no formatting ambiguity and no hidden fields.

## Project layout

```
src/cli.ts           Entry point + command router
src/types.ts         All shared types (CommandResult, ExitCode, etc.)
src/commands/        One file per command (20 total)
src/core/            Shared infrastructure: output, errors, brand, skills, agents
skills/              50 SKILL.md files following the drop-in contract
agents/              5 agent .md files (3 research, 2 review)
tests/               Unit + integration + e2e (all real I/O in temp dirs)
```

## Adding a skill

Skills follow a drop-in contract. No CLI code changes needed.

1. Read [`docs/skill-contract.md`](docs/skill-contract.md) (the full spec)
2. Create `skills/<skill-name>/SKILL.md` with the required frontmatter (`name`, `description`)
3. Add the entry to `skills-manifest.json` with category, layer, and tier
4. Run `bun test`; manifest consistency tests will catch mismatches

> [!WARNING]
> Never hardcode skill counts in tests or documentation. Read from `skills-manifest.json` or use `toBeGreaterThanOrEqual`. Hardcoded counts break every time someone adds a skill.

### Skill quality bar

- Under 500 lines. Offload depth to `references/` subdirectories.
- "On Activation" section reads `brand/` files with explicit fallback behavior when files are missing or empty.
- "Anti-Patterns" section explains *why* each anti-pattern is wrong; "what to do instead" alone is incomplete.
- Progressive enhancement: the skill works at zero brand context (L0) and gets better with full brand memory (L4).
- Reference `brand/voice-profile.md`, never `voice.md` or `brand-voice.md`.
- Directory name matches the `name` field in frontmatter. Kebab-case, 1-3 words.

## Adding an agent

1. Create the `.md` file in `agents/research/` or `agents/review/`
2. Add the entry to `agents-manifest.json`
3. Run `bun test`

## Testing

Tests use `bun:test`. Real file I/O in isolated temp dirs. No mocks. No fake data. No fake API calls.

```typescript
import { describe, test, expect } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = await mkdtemp(join(tmpdir(), "mktg-test-"));
// All reads and writes go here. Never touch the repo directory.
```

Every assertion checks real output from a real operation. If a test needs a brand file, create one in the temp dir. If a test needs a skill, point it at the real `skills/` directory.

## Code standards

| Standard | Rule |
|----------|------|
| Patterns | Functional. No classes. |
| Exports | Named only. No default exports. |
| File size | Under 300 lines. Split before it gets there. |
| Error handling | Return `CommandResult` with typed exit codes. Never throw. |
| Output | Every command supports `--json`. Auto-JSON when piped (non-TTY). |
| Mutating ops | Must support `--dry-run`. |
| Destructive ops | Must require `--confirm`. |

## What CI checks

The [PR checks workflow](.github/workflows/pr-checks.yml) runs on every push to `main` and every pull request:

1. `bun test`: full test suite
2. `bun x tsc --noEmit`: type check

Both must pass. There is no way to skip them.

## PR checklist

Before opening a pull request, verify:

- [ ] `bun test` passes locally (all 2,599+ tests)
- [ ] `bun x tsc --noEmit` reports zero errors
- [ ] `bun run dev -- doctor --json` shows no regressions
- [ ] No hardcoded skill or agent counts anywhere
- [ ] New commands have integration tests in `tests/integration/`
- [ ] Mutating commands support `--dry-run`

## Reporting issues

Use the [issue templates](https://github.com/MoizIbnYousaf/marketing-cli/issues/new/choose). Include `mktg doctor --json` output for bug reports; it captures versions, installed skills, and missing dependencies in one shot.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
