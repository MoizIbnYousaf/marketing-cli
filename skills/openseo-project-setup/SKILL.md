---
name: openseo-project-setup
description: >-
  Bind this repo to an OpenSEO project and prepare the local SEO state
  directories. Use this skill when starting SEO work on a fresh project, when
  `.seo/openseo.json` does not exist yet, when the OpenSEO project id is
  unknown, or when Google Search Console needs connecting before keyword or
  rank work can start. Triggers: "set up openseo", "link seo project",
  "connect gsc", "start seo for this site", "openseo project id".
category: seo
tier: nice-to-have
layer: foundation
reads:
  - brand/keyword-plan.md
writes:
  - brand/keyword-plan.md
env_vars:
  - OPENSEO_API_KEY
  - OPENSEO_API_BASE
triggers:
  - set up openseo
  - link seo project
  - connect gsc
  - start seo for this site
  - openseo project id
allowed-tools:
  - Bash(mktg catalog *)
  - Bash(mktg doctor *)
  - Bash(mktg run *)
---

# OpenSEO Project Setup

Bind the current repo to an OpenSEO project so every other `openseo-*` skill has a stable project id, and prepare mktg's local SEO state contract. This is a one-time-per-repo handshake, not an audit and not research.

## On Activation

Run these steps in order. Each has a fallback; never block on missing context.

### Step 1 — Check catalog readiness

```bash
mktg catalog info openseo --json --fields configured,missing_envs,mcp
```

- Exit 1 → the openseo catalog is missing; upgrade marketing-cli. Stop.
- `configured: false` → name the missing envs from `missing_envs`. Hosted path: sign up at openseo.so, connect the MCP in the user's agent client (root `.mcp.json` ships the `openseo` server), and/or set `OPENSEO_API_KEY` for non-interactive automation. Without any connection, stop after writing the gap note — research skills will fall back to Exa with metrics `unknown`.

### Step 2 — Read brand grounding

Read `brand/keyword-plan.md` and `brand/positioning.md` if they exist (tolerate missing). The domain, audience, and positioning facts go into the project record. If `brand/` is all templates, note it and recommend `/cmo` foundation first — SEO inputs without positioning are guesses.

### Step 3 — Resolve the OpenSEO project

Via the OpenSEO MCP tools: `whoami` (if available) then `list_projects`. Match the project to the user's domain. If the list is ambiguous, ask which project. If MCP is unavailable but `OPENSEO_API_KEY` is set, note that interactive MCP steps are deferred and record what is known.

Do NOT call research tools to test connectivity — `whoami`/`list_projects` are the only probes allowed here (they are free; research calls spend DataForSEO credit).

### Step 4 — Write the binding + state directories

Create or update `.seo/openseo.json`:

```json
{ "version": 1, "projectId": "<id>", "domain": "<domain>", "mcpUrl": "https://app.openseo.so/mcp", "linkedAt": "<iso>", "updatedAt": "<iso>" }
```

Create `.seo/` with `rank-snapshots/` if rank tracking is in scope. If `brand/keyword-plan.md` is a template, leave it alone — the first research run populates it; do not pre-fill with placeholders.

### Step 5 — Google Search Console

GSC is the richest first-party signal (striking-distance terms, cannibalization).

- **Hosted preferred**: point the user at the OpenSEO project's Integrations page to connect GSC natively; later skills read it live via `get_search_console_performance`.
- **Fallback (self-host / file preference)**: ask for CSV exports into `.seo/gsc/` (`queries-last-3-months.csv`, `pages-last-3-months.csv`, 16-month variants when available).

Never claim GSC is connected unless `get_search_console_performance` confirms it — it returns a "not connected" message otherwise.

### Step 6 — Recommend the next skill

| Situation | Next |
|---|---|
| No keyword plan yet | `openseo-keyword-research` |
| Has keyword list / GSC data | `openseo-keyword-clustering` |
| Market unclear | `openseo-competitive-landscape` |
| Known competitor | `openseo-competitor-analysis` |

## Anti-Patterns

- **Running research calls as a connectivity test** — because every OpenSEO research call can spend DataForSEO credit, and a setup handshake has no business spending money. `whoami` and `list_projects` are free; use only those.
- **Claiming GSC is connected without proof** — because downstream skills (keyword research's striking-distance strategy) silently change behavior based on that claim; a false positive turns first-party data into invented data. Verify with `get_search_console_performance` or say "not connected."
- **Pre-filling `brand/keyword-plan.md` with placeholder keywords** — because template-detection (SHA-256) and `mktg plan` health read placeholder content as "populated," and every downstream skill then trusts fake keywords. Leave the template until real research lands.
- **Forking state into a second project file** — because two project ids drift and every skill has to guess which is canonical. `.seo/openseo.json` is the single binding; update it, never duplicate it.
- **Asking the user 15 questions before writing anything** — because setup should orient, not assign homework. Capture what is known, mark the rest `unknown`, and let research skills fill gaps on demand.

## Progressive Enhancement

| Level | Behavior |
|---|---|
| L0 (no envs, no MCP) | Gap note only; point at Exa-backed `keyword-research` with metrics `unknown` |
| L1 (`OPENSEO_API_KEY`) | Binding written; MCP-dependent steps documented as deferred |
| L2 (MCP connected) | Full project resolution + GSC live check |
| L3 (GSC connected) | `.seo/gsc/` or live GSC feeds keyword research + clustering directly |

---

*Adapted from [every-app/open-seo](https://github.com/every-app/open-seo) `.agents/skills/seo-project-setup` (MIT). Upstream workflow by the OpenSEO maintainers; mktg state contract, brand grounding, and cost discipline added here.*
