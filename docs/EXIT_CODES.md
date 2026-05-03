# Exit Codes

All `mktg` CLI commands return structured exit codes. Errors are returned via `CommandResult` — commands never throw.

## Code Reference

| Code | Label | Constructor | When |
|------|-------|-------------|------|
| 0 | success | — | Command completed successfully |
| 1 | not found | `notFound(what, suggestions?)` | Skill, file, agent, or resource not found |
| 2 | invalid args | `invalidArgs(message, suggestions?)` / `missingInput(example)` | Bad arguments, missing required input, non-interactive mode without `--json` |
| 3 | dependency missing | `missingDep(dep, suggestions?)` | Required CLI tool or runtime dependency not installed |
| 4 | skill failed | `skillFailed(skill, message)` | Skill execution error |
| 5 | network error | `networkError(message)` | Network request failed |
| 6 | not implemented | `notImplemented(command)` | Command exists in schema but handler not yet built |

## Agent Usage

Agents can check exit codes programmatically:

```bash
mktg doctor --json
# Returns: { "ok": true, "exitCode": 0, ... } or { "ok": false, "exitCode": 3, ... }
```

All commands support `--json` for structured output. The `exitCode` field is always present in JSON responses.

## Security Utilities

Related to error handling, `src/core/errors.ts` also exports:

- **`sandboxPath(root, untrusted)`** — Validates a path stays within the project root. Rejects absolute paths, `..` traversal, and symlinks.
- **`parseJsonInput(raw)`** — Parses JSON with size limits (64KB) and prototype pollution detection.

## Source

Defined in `src/core/errors.ts` with types in `src/types.ts` (`ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6`).
