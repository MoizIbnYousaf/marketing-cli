# Research: ASC CLI Architecture

Analysis of the [App Store Connect CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI) architecture patterns, focused on what mktg should adopt for agent-native CLI design.

## 1. Exit Code System

**Files:** `cmd/exit_codes.go`, `docs/EXIT_CODES.md`

ASC uses a structured exit code system designed for CI/CD and agent consumption:

```
0    = Success
1    = Generic error
2    = Usage (invalid flags/commands)
3    = Auth (missing, unauthorized, forbidden)
4    = Not found
5    = Conflict
10-59 = HTTP 4xx mapped (10 + status - 400)
60-99 = HTTP 5xx mapped (60 + status - 500)
```

**Key pattern:** `ExitCodeFromError()` is the single source of truth. Every error flows through this function — it checks sentinel errors (`ErrMissingAuth`, `ErrNotFound`, etc.), then falls back to HTTP status mapping, then defaults to 1.

**What mktg adopts:**
- Central `errorCodeToExitCode()` function as single mapping point
- Distinct codes per failure class (no overloading)
- Codes are documented and machine-readable
- We skip the HTTP mapping (mktg doesn't wrap a single API) but keep the 0-9 CLI-level pattern

## 2. Error Handling Patterns

**Files:** `internal/cli/shared/errors.go`, `internal/cli/shared/errfmt/errfmt.go`

ASC has three error handling layers:

### Layer 1: Sentinel errors
Well-known errors as package-level vars: `ErrMissingAuth`, `ErrNotFound`, `ErrConflict`, etc. Commands return these and the exit code mapper catches them.

### Layer 2: Error classification + hints
`errfmt.Classify()` takes an error, matches it against known types, and returns a `ClassifiedError` with a human message + actionable hint:
```
Error: missing authentication
Hint: Run `asc auth login` or `asc auth init`
```

### Layer 3: ReportedError wrapper
Errors that have already been printed to stderr get wrapped in `ReportedError`. The main run loop checks for this to avoid duplicate output.

**What mktg adopts:**
- Structured errors with `code`, `message`, and `suggestions` (our equivalent of hints)
- Error constructors: `notFound()`, `invalidArgs()`, `missingDep()`, etc.
- Never throw — return `CommandResult` with error data

## 3. CLI Root & Command Structure

**Files:** `cmd/root.go`, `cmd/root_usage.go`

### Command tree
ASC uses `ffcli` (a Go CLI library) with a tree of `*ffcli.Command` nodes. Commands are registered via a `registry.Subcommands()` function.

### Unknown command handling
When an unknown command is passed, ASC:
1. Sanitizes the input (terminal escape prevention)
2. Runs fuzzy suggestion matching
3. Prints "Did you mean: ..."
4. Returns `flag.ErrHelp` (exit code 2)

### Custom usage/help
`RootUsageFunc` renders grouped help (like `gh`):
- Commands are organized into semantic groups (GETTING STARTED, APP MANAGEMENT, etc.)
- Each group has a header with bold ANSI formatting
- Tabwriter for aligned columns
- Hidden deprecated commands (by ShortHelp prefix `DEPRECATED:`)
- Ungrouped commands fall into "ADDITIONAL COMMANDS"

**What mktg adopts:**
- Grouped help output (foundation, strategy, execution, distribution)
- Command suggestion on typos
- Terminal input sanitization for security

## 4. Internal Package Structure

**Directory:** `internal/`

ASC separates concerns cleanly:

```
internal/
  asc/          — API client, HTTP, JSON serialization
  auth/         — Credential management, keychain, profiles
  cli/
    shared/     — Shared CLI utilities (output, flags, errors, sanitization)
    registry/   — Command registration
    shared/
      errfmt/   — Error formatting/classification
      suggest/  — Command suggestion (fuzzy matching)
  config/       — Configuration file management
  validation/   — Input validation
  ...
```

**Key insight:** `shared/` is the glue layer. It handles output formatting (JSON, table, markdown), flag binding, credential resolution, and progress spinners. Every command imports from `shared/`.

**What mktg adopts:**
- We already have `src/core/` as our shared layer
- `src/lib/` for standalone utilities (like exit codes) that don't import command logic
- Keep business logic (skills, brand) separate from CLI plumbing

## 5. Output Formatting

ASC supports three output formats: `json`, `table`, `markdown`. The format is controlled by:
1. `--output` flag per command
2. `ASC_DEFAULT_OUTPUT` env var
3. Auto-detect: table for TTY, JSON for pipes

Key patterns:
- `--pretty` flag for indented JSON
- Output validation happens before command execution (via `WrapCommandOutputValidation`)
- NDJSON streaming with `--stream --paginate` for large result sets

**What mktg adopts:**
- We already have `--json` flag for JSON output
- TTY detection for format switching is a good pattern to adopt
- Output validation before execution prevents side effects on bad flags

## 6. Agent-First Patterns

Patterns that make ASC particularly agent-friendly:

### Structured everything
- Exit codes are numeric and documented
- Errors have machine-readable codes
- Output is JSON by default in non-TTY
- JUnit report format for CI (`--report junit --report-file`)

### Predictable behavior
- `--version` fast path (avoids building entire command tree)
- Signal handling (SIGINT via context cancellation)
- Temp file cleanup on exit (`CleanupTempPrivateKeys`)
- Progress output goes to stderr only (never pollutes stdout)

### Security
- `SanitizeTerminal()` on user input before printing (prevents terminal escape injection)
- Private key temp files get 0600 permissions
- Prototype pollution-style checks aren't needed in Go but mktg has them for JSON

### Schema introspection
ASC has a `schema` command that dumps the command tree structure. This lets agents discover available commands and their flags programmatically.

**What mktg adopts:**
- `mktg schema` for command introspection (already planned)
- stderr-only for non-data output (progress, hints, warnings)
- Signal handling and cleanup
- JSON-by-default in non-TTY contexts

## 7. Configuration & Flags

ASC handles configuration through multiple layers:
1. **Flags** — highest priority, per-command
2. **Environment variables** — `ASC_*` prefix
3. **Config file** — `~/.config/asc/config.json`
4. **Keychain** — macOS keychain for credentials

Root-level flags (`--profile`, `--debug`, `--strict-auth`) are bound once and read globally via `shared.SelectedProfile()` etc.

**What mktg adopts:**
- We use `--json`, `--dry-run`, `--fields` as global flags (already implemented)
- Brand directory as our "config" layer
- Consider env var support for CI (`MKTG_*` prefix)

## Summary: What mktg Takes from ASC

| Pattern | ASC Implementation | mktg Adoption |
|---------|-------------------|---------------|
| Exit codes | `ExitCodeFromError()` + HTTP mapping | `errorCodeToExitCode()` + CLI-level codes |
| Error format | `ClassifiedError` with hints | `MktgError` with suggestions |
| Error flow | Sentinel errors + central mapper | Error constructors + `CommandResult` |
| Help output | Grouped by category, tabwriter | Same pattern for skill categories |
| Output format | json/table/markdown with TTY detect | json flag + TTY detection |
| Security | Terminal sanitization, file perms | JSON proto pollution checks, path sandbox |
| Agent support | Schema introspection, JUnit reports | `mktg schema`, structured JSON errors |
| Config layers | Flags > env > config > keychain | Flags > brand dir |
