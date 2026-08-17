# `mktg` Command Reference (CMO-facing)

Full CLI surface /cmo uses to inspect state, route skills, and orchestrate catalogs. Every command supports `--json` and most support `--dry-run`, `--fields`, `--confirm` per project DX standards.

Use these commands **deliberately**. At activation, run the minimum set to know what's possible (status + doctor). During playbook execution, re-invoke per-step as needed.

Runtime schema is authoritative. If this hand-written reference differs from
`mktg schema --json`, trust the live schema and update this file. For the full
runtime command index, see `rules/cli-runtime-index.md`; for distribution
routing, see `rules/publish-index.md`.

---

## Core state + health

| Command | CMO uses this when… |
|---|---|
| `mktg status --json` | Always at activation. Returns brand state, health (`ready`/`incomplete`/`needs-setup`), integrations configured. This is the first read. |
| `mktg status --json --fields brandSummary.populated,brandSummary.missing,brandSummary.stale` | To snap to the progressive enhancement ladder (see `rules/progressive-enhancement.md`). |
| `mktg <command> --format toon` | Opt into TOON output (AXI principle 1, ~40% fewer tokens than JSON) for large successful reads like `mktg list` / `mktg catalog list`. Errors stay JSON; `--fields` applies first; `--pretty` is a no-op. Default remains JSON. |
| `mktg status --json --fields health,help` | `help[]` carries copy-ready next-command templates (mirrors `nextActions` prose). Most commands emit `help[]`; JSON is compact single-line (`--pretty` to indent). |
| `mktg setup --json` | Once per project (idempotent): installs a Claude Code `SessionStart` hook that injects `mktg status --fields health,brandSummary,nextActions --json` into every session. `--global` for `~/.claude/settings.json`, `--dry-run` to preview. |
| `mktg doctor --json` | On setup + whenever a skill fails unexpectedly (missing tools, broken integrations). |
| `mktg doctor --fix --dry-run --json` | Preview auto-remediations before running them. |
| `mktg doctor --fix --json` | Auto-create missing brand files, install missing skills, patch integrations. |

---

## Brand memory

| Command | CMO uses this when… |
|---|---|
| `mktg context --json` | Compile all brand files into one token-budgeted artifact before running a multi-skill chain (saves context window). |
| `mktg context --layer <foundation\|strategy\|execution\|distribution> --json` | Pull only the brand slice the skill needs. |
| `mktg context --budget <tokens> --json` | Truncate to fit a specific token ceiling. |
| `mktg brand freshness --json` | Before running content skills — confirm brand files aren't stale. |
| `mktg brand kit --json` | Structured brand tokens (colors, typography, visual style) — used by `image-gen`, `creative`, `paper-marketing`. |
| `mktg brand kit get <section> --json` | Addressable section — `colors`, `typography`, `visual`, `visualBrandStyle`. |
| `mktg brand claims --json` | Extract Claims Blacklist from `landscape.md`. **Read this before every piece of content.** |
| `mktg brand append-learning --input '{...}'` | Log what worked/didn't after a session — compounds future routing. |
| `mktg brand export --json` | Snapshot brand state for backup or hand-off. |
| `mktg brand diff --json` | Show brand changes since last baseline. |
| `mktg brand delete <file> --confirm` | Destructive — only when user explicitly asks. |
| `mktg brand reset --confirm` | Nuclear — wipes `.mktg/` execution state. User must explicitly request. |

---

## Planning + execution loop

| Command | CMO uses this when… |
|---|---|
| `mktg plan --json` | Returning user — show the prioritized task queue. |
| `mktg plan next --json` | Single highest-priority task. Default for "what should I do?" after session start. |
| `mktg plan complete <id> --json` | After a skill successfully finishes — persists progress across sessions via `.mktg/plan.json`. |
| `mktg plan --save --json` | Stream-persist the plan for long-running orchestration. |
| `mktg run <skill> --json` | Direct skill invocation (bypasses the usual Claude Code slash-command flow). Use when the orchestration layer needs programmatic control. Logs `event:"loaded"` — a load is NOT work; `mktg plan` ignores loads for execute/distribute gates. |
| `mktg run <skill> --with-context --budget 4000 --json` | One-shot activation: skill body + non-template brand context (declared reads win, layer matrix fallback) in a single call. Prefer this over separate `run` + `context` calls. |
| `mktg run <skill> --strict --json` | Fail fast (exit 3 MISSING_DEPENDENCY) when skills/brand/envs/tools/catalogs are unsatisfied. Default is warn-only. |
| `mktg run <skill> --complete --writes <paths> --result success --json` | Record a completed run after the agent actually produced files. Writes are validated to exist (exit 2 otherwise). Only `completed` events count as work. |
| `mktg run <skill> --learning '{...}'` | Run a skill + record the learning atomically. |
| `mktg skill history <skill> --json` | Load vs completion history for a skill. |
| `mktg route "<prompt>" --json` | Deterministic skill routing without an LLM — returns `{skill, playbook, confidence, rationale, nextCommand}`. Use for CI/Cursor/Codex or when the `claude` binary is missing; /cmo remains the richer LLM router. |

---

## Distribution

| Command | CMO uses this when… |
|---|---|
| `mktg publish --list-adapters --json` | Show available adapters (`mktg-native`, `postiz`, `typefully`, `resend`, `file`) + configured status. |
| `mktg publish --native-account --json` | Show or auto-provision the local mktg-native workspace account. |
| `mktg publish --native-upsert-provider --input '{...}' --json` | Create/update an X, TikTok, Instagram, Reddit, or LinkedIn native provider. |
| `mktg publish --adapter mktg-native --list-integrations --json` | List local native providers before targeting them in a manifest. |
| `mktg publish --native-list-posts --json` | Read local native queue/history state. |
| `mktg publish --adapter postiz --list-integrations --json` | List connected Postiz providers before creating external drafts. |
| `mktg publish --adapter postiz --diagnose --json` | Verify hosted or self-hosted Postiz auth, `/api` routing, and active provider state. |
| `mktg publish --adapter <name> --dry-run --input '<json>' --json` | Preview before any real send. Always dry-run first. |
| `mktg publish --adapter <name> --confirm --input '<json>' --json` | Execute publishing. Only with user approval. |
| `mktg publish --ndjson` | Streaming progress for multi-item campaigns. |

---

## Competitive intelligence

| Command | CMO uses this when… |
|---|---|
| `mktg compete --json` | Bare command = the watch list (same as `compete list`; offline, no fetch). `help[]` points at `mktg compete scan --json` for the real scan. |
| `mktg compete list --json` | See all tracked competitor URLs. |
| `mktg compete watch <url> --json` | Add a competitor to the monitoring loop. |
| `mktg compete scan --json` | Run the scan — detect changes since last snapshot. |
| `mktg compete scan --ndjson` | Streaming scan for large watchlists. |
| `mktg compete diff <url> --json` | Detailed change report for one competitor. |

---

## Upstream catalogs (NEW — post-Phase B)

Catalogs extend mktg via external REST APIs (postiz = 30+ social providers; future: cal.com, listmonk, etc.). Registered in `catalogs-manifest.json`.

| Command | CMO uses this when… |
|---|---|
| `mktg catalog list --json` | Survey registered catalogs. |
| `mktg catalog info <name> --json --fields configured,missing_envs` | Per-catalog readiness check. Returns full `CatalogEntry` plus computed `configured`, `missing_envs`, `resolved_base`. |
| `mktg catalog status --json` | Fleet-wide health across all registered catalogs (`configured`, `healthy`, `detail` per catalog). |
| `mktg catalog sync --dry-run --json` | Reports each catalog's pinned version. Upstream drift detection is NOT implemented in v1: `to_version` is always `null`, `changed: false`, and each item carries `error: "upstream version check not yet implemented"`. Read-only. |
| `mktg catalog add <name> --confirm --json` | Register a new catalog. Destructive-guarded. |

**Routing impact:** before routing to any skill backed by a catalog (e.g., `postiz`), CMO runs `catalog info <name>` to confirm `configured: true`. If not, surface the exact fix using `missing_envs`.

---

## Agent self-discovery

| Command | CMO uses this when… |
|---|---|
| `mktg list --json` | Skill registry, compact items ({name, category, tier, installed}). Add `--verbose` for layer, triggers, versions. |
| `mktg list --routing --json` | Routing fields — triggers, requires, unlocks, precedence (implies --verbose). Used to verify routing decisions. |
| `mktg schema --json` | All commands with response shapes. Used when the orchestrator needs to programmatically understand the CLI surface. |
| `mktg schema <command> --json` | Detailed schema for one command including `responseSchema` + examples. |
| `mktg skill info <name> --json` | Skill metadata: dependencies, reverse dependencies, install status. |
| `mktg skill validate <path> --json` | Validate a SKILL.md against platform + mktg specs (used by `create-skill`). |
| `mktg skill graph --json` | Dependency DAG across all skills. Used when planning a multi-skill chain. |
| `mktg skill check <name> --json` | Check if a skill's prerequisites are satisfied (brand files present, deps installed). |

---

## Setup + lifecycle

| Command | CMO uses this when… |
|---|---|
| `mktg init --yes` | Fresh project. Creates `brand/` + installs all skills + agents + catalogs. |
| `mktg init --from <url> --yes` | Zero-to-CMO in 90 seconds. Scrapes URL, auto-populates `voice-profile.md`, `positioning.md`, `audience.md`, `competitors.md` with real data. Use when the project has a live website. |
| `mktg update --json` | Refresh skills/agents/catalogs from the package. Run after `npm update`. |
| `mktg update --check --json` | Read-only probe: ask the npm registry for the latest `marketing-cli` version and compare to the installed one. Returns `{ current, latest, upgradeAvailable, upgradeCommand }`. Use this before suggesting an upgrade. |
| `mktg update --upgrade --dry-run --json` | Preview the npm upgrade command without spawning. Returns the planned `upgradeCommand`. |
| `mktg update --upgrade --json` | Run `npm i -g marketing-cli@latest`. Surfaces EACCES guidance when the npm prefix is root-owned (suggest `sudo` or a user-owned prefix via nvm/fnm/volta). The package's postinstall re-syncs skills/agents automatically. |
| `mktg transcribe <url\|path> --json` | Audio/video → transcript. Wraps `whisper-cli` (whisper.cpp) + `yt-dlp` + `ffmpeg`. Used before `content-atomizer` for podcast/video source material. |
| `mktg studio` | Launch the studio dashboard (Bun API + Next.js UI). Prefers sibling `mktg-studio/bin/mktg-studio.ts`, then `MKTG_STUDIO_BIN`, then PATH. |
| `mktg studio --open` | Same, plus open the dashboard in the default browser. |
| `mktg studio --open --intent cmo --session <id>` | Launch Studio into a CMO-aware dashboard session at `/dashboard?mode=cmo&session=<id>`. Use this for visual command-center startup. |
| `mktg studio --dry-run --json --intent cmo --session <id>` | Structured preview envelope: resolved launcher, version, forwarded argv, ports, URLs. Zero side effects. Agent-safe for self-discovery. |
| `mktg verify --dry-run --json` | Preview ecosystem verification suites before running them. |
| `mktg verify --suite <name> --json` | Run a targeted verification suite. |
| `mktg ship-check --dry-run --json` | Preview the release go/no-go checks. |
| `mktg ship-check --fresh true --json` | Run the fresh aggregate ship verdict. Branch on `data.verdict`: `pass`/`warn` exit 0 (warnings are non-blocking), `block` exit 4 with `blockers[]` in the same report. |
| `mktg skill check-upstream --dry-run --json` | Plan only: which upstream skills + scripts would run, source/file counts. Zero network. |
| `mktg skill check-upstream --json` | Run drift detection. Exit 0 even when drift is found — read `summary.drifted` / `skills[].in_sync`. Exit 1 only for a named skill with no upstream.json. |
| `mktg cmo --dry-run --json` | Preview headless `/cmo` invocation without launching Claude. |
| `mktg cmo --timeout <seconds> --json` | Run `/cmo` through the CLI with a hard wall-clock cap. |

---

## External tools (chained via `mktg doctor` detection)

Not `mktg` subcommands, but /cmo knows when to suggest them (see `CLAUDE.md` §Ecosystem):

| Tool | When CMO suggests it |
|---|---|
| Browser profile | Browser automation for Instagram/TikTok/Facebook/YouTube when no API path is configured. |
| `/last30days` | Quick claim verification — "is this still true?" Ground truth before a content piece. |
| `/landscape-scan` (chained skill) | Full ecosystem snapshot when brand/landscape.md is missing or stale. |
| `firecrawl` CLI | Single-page scrape (invoked through `/firecrawl` skill). |
| Exa MCP / `EXA_API_KEY` | Semantic search + Agent research via `/exa-search`, `/company-research`, `/lead-generation`. |
| `summarize` CLI | Compress long text. Invoked through `/summarize` skill. |
| `gh` | GitHub operations when publishing to GitHub (releases, READMEs). |

---

## Invocation patterns

**Always use `--json`.** TTY output is for humans; JSON is the orchestrator contract.

**Always `--dry-run` before mutating.** Every destructive command (`brand delete`, `brand reset`, `skill unregister`, `publish`, `catalog add`) requires either `--dry-run` to preview or `--confirm` to execute. Never skip this.

**Use `--fields` aggressively.** Most commands return rich responses; CMO only needs the slice relevant to the current routing decision. Example: `mktg status --json --fields brandSummary,integrations` trims 20KB down to 500 bytes.

**Stream when it's a list.** `--ndjson` on `mktg plan`, `mktg compete scan`, `mktg publish` — lets CMO react to each item without waiting for the batch.

See `CONTEXT.md` at the repo root for the full agent-facing CLI cheatsheet.
