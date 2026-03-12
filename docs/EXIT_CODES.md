# mktg Exit Codes

Every `mktg` command exits with a structured code that tells agents (and humans) exactly what happened. Agents should parse exit codes to decide their next action — retry, fix input, escalate, or move on.

## Exit Code Table

| Code | Name | Meaning | Agent action |
|------|------|---------|-------------|
| 0 | Success | Command completed successfully | Continue |
| 1 | Error | Generic / unclassified error | Log and investigate |
| 2 | Usage | Invalid flags, missing args, unknown command | Fix invocation and retry |
| 3 | Auth | Authentication failure (missing, invalid, expired) | Re-authenticate |
| 4 | NotFound | Resource not found (file, skill, brand dir) | Check resource exists |
| 5 | Conflict | Resource already exists / conflict | Skip or use --force |
| 6 | DependencyMissing | Required tool not installed (bun, playwright-cli, gws) | Install dependency |
| 7 | SkillFailed | A marketing skill errored during execution | Check skill logs |
| 8 | Network | Fetch failed, timeout, DNS error | Retry with backoff |
| 9 | NotImplemented | Command exists but isn't built yet | Use alternative |
| 10 | Config | Invalid config file or bad brand directory state | Fix config and retry |
| 11 | Permission | File system permission denied, API quota, rate limit | Check permissions |
| 12 | Timeout | Operation exceeded time limit | Retry or increase timeout |
| 13 | Validation | Content failed schema or business rule validation | Fix input data |
| 14 | IO | File read/write failure | Check file system |
| 130 | Interrupted | User cancelled or SIGINT received | Respect cancellation |

## Design Principles

1. **Distinct codes** — Every failure mode gets its own exit code. No overloading.
2. **Agent-parseable** — Agents use exit codes to make retry/abort decisions without parsing stderr.
3. **Ranges reserved** — Codes 0-9 are CLI-level. Codes 10-14 are operational. 130 is POSIX SIGINT convention. Codes 15-59 are reserved for future use.
4. **Paired with error codes** — JSON output includes a string `error.code` (e.g., `MISSING_DEPENDENCY`) alongside the numeric exit code for richer context.

## JSON Error Format

When `mktg` exits non-zero, stderr (or JSON output with `--json`) contains a structured error:

```json
{
  "ok": false,
  "error": {
    "code": "MISSING_DEPENDENCY",
    "message": "Required dependency not found: playwright-cli",
    "suggestions": ["Run: bun install -g playwright-cli"]
  },
  "exitCode": 6
}
```

## Error Code Strings

String codes provide richer context than numeric exit codes alone. Multiple string codes can map to the same exit code (e.g., `INVALID_USAGE`, `INVALID_ARGS`, and `UNKNOWN_COMMAND` all exit with code 2).

| Error Code | Exit Code | Description |
|-----------|-----------|-------------|
| `UNKNOWN` | 1 | Unclassified error |
| `INVALID_USAGE` | 2 | Bad CLI invocation |
| `INVALID_ARGS` | 2 | Invalid argument values |
| `UNKNOWN_COMMAND` | 2 | Command not recognized |
| `MISSING_INPUT` | 2 | Required input not provided |
| `MISSING_AUTH` | 3 | No credentials configured |
| `AUTH_EXPIRED` | 3 | Credentials expired |
| `AUTH_FORBIDDEN` | 3 | Insufficient permissions |
| `NOT_FOUND` | 4 | Resource not found |
| `CONFLICT` | 5 | Operation conflicts with existing state |
| `ALREADY_EXISTS` | 5 | Resource already exists |
| `MISSING_DEPENDENCY` | 6 | Required tool not installed |
| `SKILL_FAILED` | 7 | Skill execution error |
| `SKILL_NOT_FOUND` | 4 | Skill not in manifest |
| `NETWORK_ERROR` | 8 | Network request failed |
| `TIMEOUT` | 12 | Operation timed out |
| `IO_ERROR` | 14 | File I/O failure |
| `PERMISSION_DENIED` | 11 | Access denied |
| `VALIDATION_ERROR` | 13 | Input validation failed |
| `CONFIG_ERROR` | 10 | Configuration invalid |
| `NOT_IMPLEMENTED` | 9 | Feature not yet built |
| `INTERRUPTED` | 130 | SIGINT / user cancellation |

## Comparison with ASC CLI

mktg's exit code system is inspired by [ASC CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI)'s approach:

- **ASC** uses codes 0-5 for CLI-level errors, then maps HTTP 4xx to 10-59 and 5xx to 60-99
- **mktg** uses codes 0-14 for CLI/operational errors since it doesn't wrap a single HTTP API
- Both use a central `ExitCodeFromError` / `errorCodeToExitCode` function as single source of truth
- Both pair numeric codes with string error codes for richer agent context

## Source

Exit codes are defined in `src/lib/exit-codes.ts`.
