# Exit Codes

All `mktg` CLI commands return structured exit codes. Errors are returned via `CommandResult` — commands never throw.

## Code Reference

| Code | Label | Constructor | When |
|------|-------|-------------|------|
| 0 | success | `ok(data)` | Command completed. Includes non-failing findings: `ship-check` verdict `pass` or `warn` (warnings are non-blocking), `skill check-upstream` drift (`ok:false`, `summary.drifted>0`, `skills[].in_sync:false`), any `--dry-run` plan |
| 1 | not found | `notFound(what, suggestions?)` | Skill, file, agent, or resource not found (e.g. `skill check-upstream <name>` with no upstream.json) |
| 2 | invalid args | `invalidArgs(message, suggestions?)` / `missingInput(example)` / `unsupportedFlag(flag, selected, supported)` | Bad arguments, missing required input, non-interactive mode without `--json`. Also `UNKNOWN_FLAG` (unrecognised `--flag`, with a `Did you mean` hint), `UNKNOWN_FIELD` (bad `--fields` path), `UNSUPPORTED_FLAG` (flag exists but the selected `--adapter` does not support it — suggestions list the supported adapters), a non-existent `--cwd`, `SETTINGS_PARSE_ERROR` (`mktg setup` found an unparseable `.claude/settings.json`), and `skill check-upstream` when EVERY script crashed (environment error, nothing checked) |
| 3 | dependency missing | `missingDep(dep, suggestions?)` | Required CLI tool or runtime dependency not installed |
| 4 | execution failed | `skillFailed(skill, message)` | Skill execution error; `mktg cmo` `TIMEOUT` (subprocess exceeded `--timeout`); `mktg verify` `SUITE_FAILED`; `mktg ship-check` verdict `block` (the FULL report is returned as data — `verdict:"block"`, `blockers[]` — not an error envelope) |
| 5 | network error | `networkError(message)` | Network request failed |
| 6 | not implemented | `notImplemented(command)` | Command exists in schema but handler not yet built. NOT for "this adapter doesn't support this flag" — that is exit 2 `UNSUPPORTED_FLAG` |

## Findings vs failures

Some commands report a *finding* that an agent must act on, but which is not a process failure. These exit 0 and carry the signal in data:

| Command | Finding | Where to look |
|---|---|---|
| `mktg ship-check` | non-blocking warnings | `verdict:"warn"`, `warnings[]` (exit 0). `verdict:"block"` is exit 4 with `blockers[]` |
| `mktg skill check-upstream` | upstream drift | `ok:false`, `summary.drifted`, `skills[].in_sync:false` (exit 0). `--dry-run` returns the plan (`dry_run:true`, `skills[].script`, `source_count`) with zero network |
| `mktg compete` (bare) | tracked watch list | `urls[]`, `total`, `help[]` (offline; `mktg compete scan --json` performs the network scan) |

## Agent Usage

Agents can check exit codes programmatically:

```bash
mktg doctor --json
# Returns: { "ok": true, "exitCode": 0, ... } or { "ok": false, "exitCode": 3, ... }
```

All commands support `--json` for structured output. The `ok` and `exitCode` fields are always present in JSON responses, including the `UNHANDLED_ERROR` (exit 1) envelope emitted when a handler throws.

## Security Utilities

Related to error handling, `src/core/errors.ts` also exports:

- **`sandboxPath(root, untrusted)`** — Validates a path stays within the project root. Rejects absolute paths, `..` traversal, and symlinks.
- **`parseJsonInput(raw)`** — Parses JSON with size limits (64KB) and prototype pollution detection.

## Source

Defined in `src/core/errors.ts` with types in `src/types.ts` (`ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6`).
