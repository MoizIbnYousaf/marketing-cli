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
# Returns skill content + prerequisites + prior run context.
# Logs event:"loaded" — a load is NOT work and never unlocks plan distribute steps.

mktg run seo-content --with-context --budget 4000 --json
# One-shot activation: also returns non-template brand context selected from
# the skill's declared reads (layer matrix fallback). Templates are named in
# context.templatesSkipped; budget overflow in context.budgetDropped.

mktg run postiz --strict --json
# Prereqs cover skills, brand files, env vars (manifest env_vars), CLI tools,
# and backing catalogs. --strict exits 3 (DEPENDENCY_MISSING) when any are
# unsatisfied; default stays warn-only (progressive enhancement).
```

### 3b. Record the outcome after doing the work

```bash
mktg run brand-voice --complete --writes brand/voice-profile.md --result success --json
# --writes paths must exist inside the project (validated, exit 2 otherwise).
# Only event:"completed" records count as executed work in `mktg plan`.
# History: mktg skill history <skill> --json (shows loaded vs completed events).
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
# Configured-state across all registered catalogs.
# healthy is always null — reachability probes are not implemented (never guessed).

mktg catalog sync --dry-run --json
# Reports each catalog's pinned version. Upstream drift detection is NOT
# implemented: to_version is always null and every item says so in `error`.

mktg catalog add <name> --confirm --json
# Register a new catalog entry. Mutating, destructive-guarded.

mktg catalog info openseo --json --fields configured,missing_envs,mcp
# SEO data plane (research_adapters capability). mcp.default_url is the hosted
# MCP; OPENSEO_MCP_URL overrides for self-host. OPENSEO_API_KEY enables
# non-interactive automation; without it, SEO metrics are `unknown` (never invented).

mktg seo status --json
# SEO readiness: catalog config, .seo/openseo.json binding, .seo inventory,
# and named readiness (not_configured | mcp_client_only | api_ready | selfhost_ready).

mktg seo link-project --input '{"projectId":"proj_123","domain":"example.com"}' --json
# Bind repo to an OpenSEO project (idempotent; relinking needs --confirm).

mktg seo sync-keywords --dry-run --json   # then --confirm
# Merge .seo/keywords-sync.json into brand/keyword-plan.md as an atomic
# 'OpenSEO Sync' section. Never writes without --confirm.
```

### 5b. Pick the right research backend

| Job | Preferred | Fallback |
|-----|-----------|----------|
| KD / volume / SERP / backlinks / rank tracking / GSC | OpenSEO (catalog + MCP) | none — mark metrics `unknown` |
| Open-web discovery, Reddit/GitHub mining | Exa | — |
| Fetch known-URL content | Firecrawl | — |

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
# Per-item status truth: queued-local (native) | draft-external (typefully,
# postiz) | sent (resend) | written-file (file) | failed | skipped.
# A local queue write is never "sent"; an external draft is never "published".
mktg publish --native-list-posts --json
```

Use Postiz or a browser profile when the user needs actual external network
posting and the native backend is only acting as the local queue.

## When to use `/axi` (AXI catalog router)

`/axi` is the tool-interface orchestrator ([axi.md](https://axi.md)) — parallel to `/cmo` for marketing. Depth lives in `skills/axi/rules/`.

| Situation | Use |
|-----------|-----|
| GitHub issues / PRs / CI / releases | `/axi` → `npx -y gh-axi` (prefer over raw `gh` / GitHub MCP) |
| Browser click/fill/extract | `/axi` → `npx -y chrome-devtools-axi` |
| "AXI vs MCP" / build an agent CLI | `/axi` (principles + build rules) |
| Marketing copy / SEO / publish | `/cmo` (not `/axi`) |

## When to use `/cmo` vs direct commands

| Situation | Use |
|-----------|-----|
| User says "help me with marketing" | `/cmo`; it routes to the right skill |
| Agent needs routing without Claude (CI/Cursor/Codex) | `mktg route "<prompt>" --json` — deterministic, no LLM |
| Agent needs project state | `mktg status --json` |
| Agent needs health check | `mktg doctor --json` |
| Agent needs a specific skill loaded | `mktg run <skill> --json` (logs `event:"loaded"`) |
| Agent needs skill + brand context in one call | `mktg run <skill> --with-context --json` |
| Agent must fail fast on missing prereqs | `mktg run <skill> --strict --json` (exit 3) |
| Agent finished the work and records it | `mktg run <skill> --complete --writes <paths> --result success --json` |
| Agent needs load vs completion history | `mktg skill history <skill> --json` |
| Agent needs brand context for a skill | `mktg context --json` |
| Updating skills after package upgrade | `mktg update --json` |
| Checking whether a newer marketing-cli is on npm | `mktg update --check --json` |
| Upgrading marketing-cli to the latest npm release | `mktg update --upgrade --json` (use `--dry-run` first to preview) |
| Agent needs to check a specific catalog's readiness | `mktg catalog info <name> --json --fields configured,missing_envs` |
| Agent needs health across all catalogs at once | `mktg catalog status --json` |
| Agent needs the full catalog registry | `mktg catalog list --json` |
| User wants to see the studio dashboard | `mktg studio` (the ONE human UI; bare `mktg dashboard` is deprecated) |
| Agent wants a JSON project overview | `mktg dashboard snapshot --json` |
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
