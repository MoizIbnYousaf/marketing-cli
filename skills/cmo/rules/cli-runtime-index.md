# CLI Runtime Index

This is the /cmo operator index for the `mktg` CLI. Runtime schema wins:
if this file conflicts with `mktg schema --json`, trust the live schema and
update this file.

## Refresh Commands

Use these at the start of any deep CLI wiring task:

```bash
mktg schema --json --fields commands.name,commands.flags,commands.subcommands
mktg status --json --fields health,brandSummary,integrations,nextActions
mktg doctor --json --fields passed,checks
mktg list --routing --json --fields skills.name,skills.triggers,skills.requires,skills.unlocks
```

Use command-specific schema before constructing a new payload:

```bash
mktg schema publish --json
mktg schema studio --json
mktg schema verify --json
mktg schema ship-check --json
mktg schema cmo --json
```

For Studio startup, prefer the CMO-aware launcher:

```bash
mktg studio --dry-run --json --intent cmo --session <id>
mktg studio --open --intent cmo --session <id>
```

The launcher resolves the sibling Studio checkout first, then
`MKTG_STUDIO_BIN`, then PATH. The dry-run response's `urls.dashboard` is the
canonical URL to show or open.

## Top-Level Commands

Current runtime command set:

| Command | /cmo use |
|---|---|
| `schema` | Discover command flags, subcommands, response shapes, and examples. |
| `init` | Bootstrap brand files, skills, agents, and optional website import. |
| `doctor` | Check local tools, skills, brand state, and integrations. |
| `status` | Read the project marketing state and next setup actions. |
| `list` | Inspect installed skills and routing metadata. |
| `update` | Reinstall bundled skills, agents, catalogs, and docs. |
| `skill` | Inspect, validate, register, add, log, and analyze skills. |
| `brand` | Read/write/export/import/diff/reset brand memory. |
| `run` | Load a skill for agent consumption and record execution. |
| `transcribe` | Download and transcribe audio/video sources. |
| `context` | Compile token-budgeted brand context. |
| `plan` | Get or persist the prioritized execution loop. |
| `publish` | Route content to native, Postiz, Typefully, Resend, or file adapters. |
| `compete` | Watch, scan, list, and diff competitor pages. |
| `dashboard` | Read typed dashboard contracts for local command-center views. |
| `catalog` | Inspect and sync upstream service catalogs such as Postiz. |
| `studio` | Launch or preview the companion local Studio, including CMO startup sessions. |
| `verify` | Run ecosystem verification suites. |
| `ship-check` | Aggregate go/no-go verdicts for release readiness. |
| `cmo` | Invoke headless `/cmo` through the CLI with timeout and dry-run safety. |

## Subcommand Families

| Family | Subcommands |
|---|---|
| `skill` | `info`, `validate`, `graph`, `check`, `register`, `evaluate`, `unregister`, `add`, `history`, `log` |
| `brand` | `export`, `import`, `update`, `freshness`, `diff`, `append-learning`, `claims`, `kit`, `delete`, `reset` |
| `plan` | `next`, `complete` |
| `compete` | `scan`, `watch`, `list`, `diff` |
| `dashboard` | `snapshot`, `action`, `plan`, `outputs`, `publish`, `system`, `compete` |
| `catalog` | `list`, `info`, `sync`, `status`, `add` |

## Discovery Discipline

- Prefer `--json` for every command. TTY output is for humans.
- Prefer `--fields` when the response is only for routing decisions.
- Prefer `--dry-run` before every mutation.
- Use `--ndjson` for long list or batch operations where incremental progress matters.
- Never hardcode command counts, skill counts, route counts, or tab enums in agent logic.
- If a static rule and runtime schema disagree, treat that as doc drift and follow runtime.

## Safe Startup Sequence

1. `mktg status --json --fields health,brandSummary,integrations,nextActions`
2. `mktg doctor --json --fields passed,checks`
3. `mktg list --routing --json --fields skills.name,skills.triggers,skills.requires,skills.unlocks`
4. `mktg schema --json --fields commands.name,commands.flags,commands.subcommands`

This gives /cmo the project state, broken dependencies, routing map, and
current CLI contract before it takes action.
