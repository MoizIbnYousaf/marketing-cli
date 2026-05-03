# CONTEXT.md: Agent Cheatsheet

Quick reference for agents. Read this before calling any `mktg` command.

## Rules of engagement

1. **Always use `--json`**: TTY output is for humans. JSON is the agent contract.
2. **Run `mktg doctor --json` first**: Know what's installed and what's broken before acting.
3. **Never hardcode skill or agent counts**: Read from `skills-manifest.json` or use `mktg list --json`.
4. **Runtime schema wins**: use `mktg schema --json` and `mktg schema <command> --json` when docs drift.

## Core syntax

```
mktg <command> [subcommand] [--json] [--dry-run] [--fields <dot.path>]
```

## Key flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--json` | Structured JSON output (auto-enabled when piped) | `mktg status --json` |
| `--dry-run` | Preview mutations without writing | `mktg init --dry-run` |
| `--fields` | Dot-notation field selection | `--fields "brand.populated,skills.count"` |
| `--ndjson` | Newline-delimited JSON for list commands | `mktg list --ndjson` |
| `--confirm` | Required for destructive operations | `mktg brand import --confirm` |
| `--cwd` | Override working directory | `--cwd /path/to/project` |

## Exit codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Proceed |
| 1 | Not found | Check resource name, use `mktg list` |
| 2 | Invalid args | Check `mktg schema --json` for valid flags |
| 3 | Dependency missing | Run `mktg doctor --json` for install hints |
| 4 | Skill failed | Check skill prerequisites |
| 5 | Network error | Retry or check connectivity |
| 6 | Not implemented | Command exists in schema but isn't built yet |

## Usage patterns

### 0. Discover the runtime command surface

```bash
mktg schema --json --fields "commands.name,commands.flags,commands.subcommands"
mktg schema publish --json
mktg publish --list-adapters --json
```

The `/cmo` skill keeps deeper indexes in
`skills/cmo/rules/cli-runtime-index.md`, `skills/cmo/rules/publish-index.md`,
and `skills/cmo/rules/studio-api-index.md`.

### 1. Bootstrap a new project

```bash
mktg init --json
# Creates brand/, installs skills + agents, runs doctor
```

### 2. Check project health before acting

```bash
mktg doctor --json --fields "checks,summary"
mktg status --json --fields "brand.populated,skills.installed"
```

### 3. Load a skill for execution

```bash
mktg run brand-voice --json
# Returns skill content + metadata + brand context
```

### 4. Get token-budgeted brand context

```bash
mktg context --json --fields "voice,positioning,audience"
# Returns only the brand files you need, within token limits
```

### 5. Manage upstream catalogs

Upstream catalogs are external OSS projects mktg builds on via REST API (postiz = 30+ social providers; future: cal.com, listmonk, etc.). Registered in `catalogs-manifest.json`, parallel to skills and agents.

```bash
mktg catalog list --json
# Registered catalogs with per-catalog configured/installed state.

mktg catalog info postiz --json --fields name,license,version_pinned,auth.credential_envs,configured,missing_envs
# Full CatalogEntry for postiz plus computed runtime state.
# `configured: true` iff every auth.credential_envs entry is set in process.env.

mktg catalog status --json
# Fleet-wide health check across all registered catalogs.

mktg catalog sync --dry-run --json
# Diff local version_pinned against upstream tags. v1 is read-only; --dry-run is parity-only.

mktg catalog add <name> --confirm --json
# Register a new catalog entry. Mutating, destructive-guarded.
```

### 6. Launch the studio dashboard

Thin launcher for the bundled Studio dashboard (Bun API server + Next.js UI). The studio is a workspace member at `studio/` in this repo and ships inside the marketing-cli tarball, so `mktg studio` works on any machine that has the CLI installed. The launcher resolves `<repoRoot>/studio/bin/mktg-studio.ts` first, then a sibling `mktg-studio/` checkout, then `MKTG_STUDIO_BIN`, then `mktg-studio` on PATH.

```bash
mktg studio
# Launch server (port 3001) + dashboard (port 3000) in the foreground.

mktg studio --open
# Same, plus open the dashboard in the default browser.

mktg studio --open --intent cmo --session <id>
# Preferred CMO startup path. Opens /dashboard?mode=cmo&session=<id>.

mktg studio --dry-run --json --intent cmo --session <id>
# Preview envelope: { mode, binary, version, argv, env, urls }. Zero side effects.

mktg studio --json
# Same as --dry-run --json (preview). Agent self-discovery mode.
```

Missing launcher returns `MISSING_DEPENDENCY` (exit 3) with install hints. Ports are overridden via `STUDIO_PORT` / `DASHBOARD_PORT` env vars.

### 7. Use the native publish backend

The native backend is local-first. It stores a workspace account, connected
provider records, and queue/history state under `.mktg/native-publish/`.
Initial provider identifiers are `x`, `tiktok`, `instagram`, `reddit`, and
`linkedin`.

```bash
mktg publish --native-account --json
mktg publish --native-upsert-provider --input '{"identifier":"linkedin","name":"Acme LinkedIn","profile":"acme"}' --json
mktg publish --adapter mktg-native --list-integrations --json
mktg publish --adapter mktg-native --dry-run --input '<publish-manifest-json>' --json
mktg publish --adapter mktg-native --confirm --input '<publish-manifest-json>' --json
mktg publish --native-list-posts --json
```

Use Postiz or a browser profile when the user needs actual external network
posting and the native backend is only acting as the local queue.

## When to use `/cmo` vs direct commands

| Situation | Use |
|-----------|-----|
| User says "help me with marketing" | `/cmo`; it routes to the right skill |
| Agent needs project state | `mktg status --json` |
| Agent needs health check | `mktg doctor --json` |
| Agent needs a specific skill loaded | `mktg run <skill> --json` |
| Agent needs brand context for a skill | `mktg context --json` |
| Updating skills after package upgrade | `mktg update --json` |
| Agent needs to check a specific catalog's readiness | `mktg catalog info <name> --json --fields configured,missing_envs` |
| Agent needs health across all catalogs at once | `mktg catalog status --json` |
| Agent needs the full catalog registry | `mktg catalog list --json` |
| User wants to see the studio dashboard | `mktg studio` |
| Agent wants to preview the studio launch envelope | `mktg studio --dry-run --json` |
| Agent wants to preview verification suites | `mktg verify --dry-run --json` |
| Agent wants a release go/no-go verdict | `mktg ship-check --dry-run --json` first, then fresh run if approved |
| Agent wants headless `/cmo` invocation | `mktg cmo --dry-run --json` first |

## Brand files

All in `brand/` at the project root. Skills read these on activation.

| File | Purpose | Stale after |
|------|---------|-------------|
| `voice-profile.md` | How the brand sounds | 30 days |
| `positioning.md` | Why the product is different | 30 days |
| `audience.md` | Who the users are | 30 days |
| `competitors.md` | Competitive landscape | 30 days |
| `landscape.md` | Market snapshot | 30 days |
| `keyword-plan.md` | SEO target keywords | 90 days |
| `creative-kit.md` | Visual identity rules | 90 days |
| `stack.md` | Marketing tools in use | 90 days |
| `assets.md` | Created assets log | Never (append-only) |
| `learnings.md` | What worked and didn't | Never (append-only) |
