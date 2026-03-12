# ASC CLI Testing & CI/CD Patterns — Research

> Research for mktg issue #14. Analyzed [asc-cli](https://github.com/MoizIbnYousaf/asc-cli) testing philosophy, CI/CD workflows, and quality gates.

## Test Structure

### Three-Tier Testing

ASC CLI uses three distinct test tiers, each with a clear purpose:

| Tier | Flag | When | What |
|------|------|------|------|
| Unit (short) | `go test -short ./...` | Every PR, pre-commit | Fast, no network, no secrets |
| Full | `go test ./...` | Post-merge to main | Includes slower tests, still no external deps |
| Integration | `go test -tags=integration` | Weekly schedule + manual | Real API calls with secrets |

**Takeaway for mktg:** We should adopt the same tiering. `bun test` for unit, a separate script for integration tests that hit real services.

### Key Testing Patterns

1. **Helper Process Pattern** — Instead of mocking external CLIs, tests re-invoke the test binary with special env vars to simulate subprocess behavior. Avoids mock libraries entirely.

2. **Dependency Injection via Module Variables** — Functions like `lookPathFn`, `commandContextFn` are package-level vars that tests can override. Restored via `t.Cleanup()`. The TypeScript equivalent: export functions that tests can mock via module-level overrides.

3. **Output Capture** — Tests capture stdout/stderr by replacing `os.Stdout` with pipes. We already do this in mktg's CLI tests with `Bun.spawn`.

4. **Exit Code Semantics** — Comprehensive tests map every error type to a specific exit code (0=success, 1=error, 2=usage, 3=auth, 4=not-found, 5=conflict). Exit codes are a contract, not an afterthought.

5. **Test Isolation** — Every test uses temp dirs, filters env vars, and cleans up after itself. No test depends on another test's state.

### Benchmark Testing

- Benchmarks measure CLI startup performance (`--version` flag latency)
- Use `b.ReportAllocs()` for memory profiling
- CI runs benchmarks on both base and PR branches, posts comparison to PR comments
- Uses `benchstat` for statistical comparison (5 runs per branch)

**Takeaway for mktg:** We could benchmark skill loading time and CLI startup. Not critical now but the pattern is worth knowing.

## CI/CD Pipeline

### PR Checks (pr-checks.yml)

Three parallel jobs that must all pass:

1. **format-and-lint** — Formatting check + linting + custom validations (docs sync, app list)
2. **unit-tests** — Short tests only (`-short` flag), no secrets needed
3. **build** — Multi-platform build to catch compilation issues

Key details:
- Concurrency group per PR number — cancels in-progress runs when new commits push
- `macos-latest` runners (needed for Xcode-dependent code)
- Tool caching based on Makefile hash

### Post-Merge (main-branch.yml)

Same as PR checks but:
- Runs **full** test suite (no `-short` flag)
- Has access to secrets for integration-adjacent tests
- Generates SHA256 checksums for build artifacts
- No concurrency limits (every merge gets a full run)

### Release (release.yml)

Triggered by version tags (`[0-9]*.[0-9]*.[0-9]*`):
1. Full guardrails: format + lint + test
2. Multi-platform build with version injection via ldflags
3. macOS code signing with Apple Developer ID
4. SHA256 checksums
5. GitHub Release creation
6. Homebrew tap update

### Security Scanning

| Tool | Trigger | Purpose |
|------|---------|---------|
| CodeQL | PR + weekly | Static analysis (Go, JS, Python, Actions) |
| govulncheck | PR + weekly | Known vulnerability scanning in dependencies |

Both run on schedule (weekly) AND on PRs. Weekly catches new CVEs between PRs.

### Benchmark Comparison (bench-compare.yml)

Runs on every PR:
1. Checks out base branch, runs benchmarks (5 iterations)
2. Checks out PR branch, runs benchmarks (5 iterations)
3. Compares with `benchstat`
4. Posts results as PR comment (updates existing comment, doesn't spam)

**Takeaway for mktg:** We don't have benchmarks yet, but when we do, this pattern is ready to adopt. For now, a simpler "test count" or "coverage delta" comment would be useful.

## Build System (Makefile)

The Makefile serves as the developer interface. Key targets:

```
make dev        # format + lint + test + build (full local check)
make test       # unit tests
make lint       # golangci-lint or fallback to go vet
make format     # auto-format code
make build      # compile with version injection
make tools      # install dev dependencies
make install-hooks  # set up git hooks
```

Design principles:
- **`make dev` is the one command** — runs everything a developer needs before pushing
- **Colored output** — visual feedback for pass/fail
- **Tool installation** — `make tools` installs linters and formatters
- **Version injection** — build-time variables from git describe

**Takeaway for mktg:** We should have equivalent scripts in package.json or a Makefile. `make dev` = typecheck + lint + test + build.

## Pre-Commit Hooks

The `.githooks/pre-commit` hook runs three checks:

1. **Format** — Runs formatter, fails if files changed (forces re-stage)
2. **Lint** — Full lint pass
3. **Short tests** — Quick test suite

Installed via `make install-hooks` which sets `git config core.hooksPath .githooks`.

**Takeaway for mktg:** We should add a pre-commit hook that runs typecheck + lint. Tests might be too slow for pre-commit but could be optional.

## Linting Philosophy

ASC CLI uses `golangci-lint` with a deliberate configuration:

- **disable-all + selective enable** — Only 8 linters enabled (govet, staticcheck, errcheck, ineffassign, unused, misspell, unparam, errorlint)
- **Documented exclusions** — Every suppressed warning has a comment explaining why
- **Tests are linted too** — `tests: true` in config
- **Domain-specific spelling** — Apple terminology (cancelled/cancelling) added to ignore list

**Takeaway for mktg:** Our equivalent is `tsc --noEmit` (type checking) + a linter. We should configure one if we don't have it.

## What mktg Should Adopt

### Immediate (this PR)

| Pattern | Implementation |
|---------|---------------|
| CI on PRs | `.github/workflows/pr-checks.yml` — typecheck, lint, test, build |
| Build scripts | `Makefile` with `dev`, `test`, `lint`, `typecheck`, `build` targets |
| Concurrency control | Cancel in-progress CI runs on new pushes |

### Next Steps (future PRs)

| Pattern | Priority | Notes |
|---------|----------|-------|
| Pre-commit hooks | Medium | Typecheck + lint on commit |
| Security scanning | Medium | CodeQL for TypeScript, `bun audit` for deps |
| Test tiering | Medium | Separate unit vs integration (skill installation tests) |
| Coverage tracking | Low | `bun test --coverage` with threshold |
| Benchmark comparison | Low | CLI startup time, skill loading time |
| Release workflow | Low | When we're ready for `bun publish` |

### What We Skip

- **Multi-platform builds** — We're Bun-first, not distributing compiled binaries yet
- **Code signing** — No native binaries to sign
- **Homebrew tap** — Premature, we use `bun install -g`
- **benchstat** — No benchmarks to compare yet
