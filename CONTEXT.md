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
| `--json` | Structured JSON output (auto-enabled when piped). Compact single-line by default | `mktg status --json` |
| `--pretty` | Indent JSON output (2 spaces) for humans; agents should omit it | `mktg status --json --pretty` |
| `--format` | Success-output encoding: `json` (default) or `toon` (AXI principle 1, ~40% fewer tokens). Errors stay JSON | `mktg list --format toon` |
| `--dry-run` | Preview mutations without writing | `mktg init --dry-run` |
| `--fields` | Dot-notation field selection | `--fields "brandSummary.populated,skills.installed"` |
| `--input` | Raw JSON payload for mutating commands (global) | `mktg brand append-learning --input '{...}'` |
| `--ndjson` | Newline-delimited JSON for list commands (per-command) | `mktg list --ndjson` |
| `--confirm` | Required for destructive operations (per-command) | `mktg brand import --confirm` |
| `--verbose` | Full item shape on list commands (`list`, `catalog list`); default items are minimal (3–5 fields) | `mktg list --verbose --json` |
| `--full` | Full schema dump for bare `mktg schema` / `mktg <group> --help --json` (default is a compact index) | `mktg schema --full --json` |
| `--cwd` | Override working directory (must exist; otherwise `INVALID_ARGS`, exit 2) | `--cwd /path/to/project` |

## Response conventions

- **Compact JSON.** Every JSON response is one line (`JSON.stringify` with no indentation). Parse it; never assert on whitespace. `--pretty` restores 2-space indentation.
- **TOON output.** `--format toon` opts a *successful* response into [TOON](https://toonformat.dev/) (AXI principle 1): uniform arrays become `key[N]{f1,f2}:` + one comma-joined row per item (values with commas/newlines/quotes are double-quoted, embedded quotes doubled), scalars/objects become `key: value` lines nested 2 spaces, a top-level array carries `count: N`, and `help[]` renders as a trailing `help[N]:` block. JSON stays the default contract: **errors are always JSON** (the structured error envelope is machine-parsed), `--fields` applies before encoding, and `--pretty` is a no-op. An unknown `--format` value is `INVALID_ARGS`, exit 2.
- **`help[]`.** Success responses may carry a top-level `help` array of concrete next-command templates (e.g. `"mktg run <skill> --json"`, `"mktg brand freshness --json"`). `status`, `init`, `doctor`, `plan`, `skill info`, `list`, `compete list`, `catalog list`, `setup` populate it. It is selectable via `--fields help` and printed as a `Next:` footer in TTY. Prose fields (`nextActions`, `setup.nextSteps`) stay for compat.
- **Home view.** Bare `mktg` (no command) returns a live snapshot, not static help: `{bin, description, cwd, version, health, brand:{populated,total}, skills:{installed,total}, help[]}` (`bin`/`cwd` collapse `$HOME` to `~`). `mktg --help` keeps the full command list.
- **Ambient context.** `mktg setup --json` idempotently installs a Claude Code `SessionStart` hook (`./.claude/settings.json`; `--global` for `~/.claude/settings.json`) that runs `mktg status --fields health,brandSummary,nextActions --json`. Re-runs report `{installed:true, changed:false}`; `--dry-run` previews the settings file.

## Exit codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success — including **findings that are not failures**: `ship-check` verdict `pass`/`warn`, `skill check-upstream` drift (`ok:false`, `summary.drifted>0`), `verify --dry-run` | Proceed; branch on the data fields, not `$?` |
| 1 | Not found (e.g. `skill check-upstream <name>` with no upstream.json) | Check resource name, use `mktg list` |
| 2 | Invalid args (incl. `UNKNOWN_FLAG` for unrecognised `--flags`, `UNKNOWN_FIELD` for bad `--fields`, `UNSUPPORTED_FLAG` when a flag exists but the selected `--adapter` does not support it) | Check `mktg schema <cmd> --json` for valid flags; follow the `Did you mean` / `Supported adapters` hint |
| 3 | Dependency missing | Run `mktg doctor --json` for install hints |
| 4 | Execution failed — skill failed, `mktg cmo` TIMEOUT, `verify` SUITE_FAILED, `ship-check` verdict `block` (full report on stdout, `blockers[]` populated) | Check skill prerequisites; for TIMEOUT raise `--timeout`; for ship-check resolve `blockers[]` |
| 5 | Network error | Retry or check connectivity |
| 6 | Not implemented | Command exists in schema but isn't built yet (never used for "adapter doesn't support this flag" — that is exit 2 `UNSUPPORTED_FLAG`) |

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
mktg setup --json
# Installs the SessionStart hook so every Claude Code session opens with live mktg status
```

### 2. Check project health before acting

```bash
mktg doctor --json --fields "passed,checks"
mktg status --json --fields "brandSummary.populated,skills.installed"
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
# and backing catalogs. --strict exits 3 (MISSING_DEPENDENCY) when any are
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
mktg context --json --fields "summary,files"
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
# non-interactive automation. Hosted OAuth is negotiated by the MCP client.

mktg seo status --json
# SEO readiness: catalog config, .seo/openseo.json binding, .seo inventory,
# and named readiness (not_configured | hosted_oauth_ready |
# hosted_api_key_ready | selfhost_ready). This is configuration state, not a
# network health probe; verify access with OpenSEO's free `whoami` MCP tool.

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

**OpenSEO self-host (advanced).** Hosted MCP (`https://app.openseo.so/mcp`) is the default and supports OAuth; `OPENSEO_API_KEY` is the headless alternative. To self-host, run OpenSEO's Docker image (`ghcr.io/every-app/open-seo`) with your own DataForSEO key and set `OPENSEO_MCP_URL` to the actual MCP endpoint (`https://<your-host>/mcp`, or loopback-only `http://localhost:<port>/mcp`). `mktg seo status` distinguishes hosted OAuth, hosted API-key, self-host, and unconfigured readiness. WARNING: Docker `local_noauth` disables auth — never expose it beyond loopback or a trusted authenticated proxy. Studio shows readiness + deep link on the Pulse tab (`GET /api/seo/status`).

### 5c. The SEO loop end to end

```text
mktg doctor → mktg seo status (readiness)
  → mktg seo link-project (bind .seo/openseo.json)
  → openseo-keyword-research (measured KD/volume → brand/keyword-plan.md)
  → openseo-keyword-clustering (marketing/seo/clusters/)
  → seo-content / seo-machine (pages from validated targets)
  → mktg seo sync-keywords --confirm (saved keywords → atomic plan section)
  → off-page-seo + openseo-link-prospecting (.seo/backlink-targets.json)
```

No OpenSEO? Same loop on Exa/Firecrawl with every metric marked `unknown`. Never invented, either way.

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

# Adapter-scoped flags: --list-integrations (mktg-native, postiz) and
# --diagnose (postiz). Any other --adapter returns UNSUPPORTED_FLAG, exit 2,
# with the supported list in suggestions — an argument error, not exit 6.
mktg publish --adapter typefully --list-integrations --json   # → exit 2 UNSUPPORTED_FLAG
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
| Agent wants a release go/no-go verdict | `mktg ship-check --dry-run --json` first, then fresh run if approved. Branch on `data.verdict` (`pass`/`warn` → exit 0, `block` → exit 4 with `blockers[]`) |
| Agent wants upstream-skill drift status | `mktg skill check-upstream --dry-run --json` (plan, no network), then `mktg skill check-upstream --json` — exit 0 even on drift; read `summary.drifted` / `skills[].in_sync` |
| Agent wants the competitor watch list | bare `mktg compete --json` (offline, same as `compete list`); `mktg compete scan --json` to actually fetch |
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
