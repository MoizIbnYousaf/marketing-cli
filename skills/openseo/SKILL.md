---
name: openseo
description: >-
  Use OpenSEO (open-source Semrush/Ahrefs alternative) as the SEO data plane —
  keyword difficulty, search volume, SERP results, ranked keywords, backlinks,
  rank tracking, and Google Search Console. Use this skill whenever someone
  asks for keyword difficulty, KD, search volume, SERP positions, domain
  rankings, backlink data, rank tracking, or GSC performance. ALWAYS prefer
  OpenSEO's measured data over estimated metrics when the catalog is
  configured; fall back to Exa-backed keyword-research (with an explicit gap
  note) when it is not. Triggers: "keyword difficulty", "search volume",
  "SERP results", "ranked keywords", "backlinks", "rank tracker", "GSC".
category: seo
tier: nice-to-have
layer: strategy
reads:
  - brand/keyword-plan.md
writes:
  - brand/keyword-plan.md
env_vars:
  - OPENSEO_API_KEY
  - OPENSEO_API_BASE
triggers:
  - keyword difficulty
  - search volume
  - serp results
  - ranked keywords
  - backlinks
  - rank tracker
  - gsc performance
allowed-tools:
  - Bash(mktg catalog *)
  - Bash(mktg doctor *)
  - Bash(mktg run *)
---

# OpenSEO — SEO Data Plane

You connect mktg's SEO playbooks to a running OpenSEO instance (hosted at openseo.so or self-hosted Docker). You do NOT invent metrics. You do NOT call DataForSEO directly. You route measured data (KD, volume, SERP, ranked keywords, backlinks, rank tracking, GSC) into mktg artifacts like `brand/keyword-plan.md`.

OpenSEO is a **data plane**, not a playbook. The SEO methodology lives in `keyword-research`, `seo-content`, `seo-audit`, `off-page-seo`, `ai-seo`, and `seo-machine` — this skill is how those playbooks stop guessing.

## North Star

1. Measured data beats estimated data. When OpenSEO is configured, metrics come from OpenSEO's MCP tools. When it is not, you say so explicitly and fall back to Exa-backed qualitative research — metrics marked `unknown`.
2. mktg never calls DataForSEO directly. OpenSEO owns the vendor relationship; mktg talks to OpenSEO only.
3. Expensive calls (bulk research, `save_keywords`) follow dry-run/confirm discipline — DataForSEO credit is real money.
4. OpenSEO project state syncs into `.seo/` and `brand/keyword-plan.md`; it never becomes a competing second source of truth.

## On Activation

Run these steps before anything else. Each has a fallback that keeps the skill useful when OpenSEO is absent.

### Step 1 — Verify the catalog is registered and configured

```bash
mktg catalog info openseo --json --fields configured,missing_envs,auth.credential_envs,mcp
```

- Exit code 1 → the openseo catalog is not registered (upgrade marketing-cli). Stop.
- `configured: false` → env vars are missing. Build the fix string from `missing_envs`. Canonical envs: `OPENSEO_API_KEY` (required for non-interactive automation) and `OPENSEO_API_BASE` (REST base; self-host override). The MCP URL is `mcp.default_url` (`https://app.openseo.so/mcp`) unless `OPENSEO_MCP_URL` overrides it for self-host.
- `configured: true` → proceed. If only the MCP client is connected (OAuth login in the user's agent client) but no API key exists, treat readiness as `mcp_client_only`: MCP tools work interactively, headless automation does not.

### Step 2 — Establish the data-plane connection

Preferred: OpenSEO MCP tools via the agent's MCP client (root `.mcp.json` ships an `openseo` server entry — the user connects it once in their client). Hosted MCP uses OAuth login; self-host uses its own base URL via `OPENSEO_MCP_URL`.

If no MCP connection and no `OPENSEO_API_KEY`: state the gap and downgrade to the Exa/Firecrawl path (Step 3 fallback). Do not fabricate a connection.

### Step 3 — Route to the playbook with measured inputs

Hand the measured data to the SEO playbooks instead of running parallel research:

| Job | Route | Data you supply |
|---|---|---|
| Keyword opportunity discovery | `keyword-research` | KD, volume, intent from OpenSEO research tools |
| Programmatic SEO inputs | `seo-machine` | Validate KD/competition before page generation |
| Backlink gaps | `off-page-seo` | OpenSEO backlink overview for the domain |
| Rank drops / striking distance | `ai-seo`, `seo-audit` | Rank tracker + GSC snapshots |

**Fallback (no OpenSEO):** run the Exa-backed `keyword-research` path and mark every metric `unknown`. Say plainly: "OpenSEO is not configured — these are qualitative findings, not measured KD/volume. Set `OPENSEO_API_KEY` (or connect the MCP) to upgrade this run."

## Cost Discipline

- Research calls in small batches are fine. Bulk pulls (hundreds of keywords) and `save_keywords` writes REQUIRE user confirmation first — say the estimated call count out loud.
- Default to conservative result limits; widen only when asked.
- Log surprises (unexpected credit spend, rate limits) to `brand/learnings.md` via `mktg run openseo --learning '{...}'`.

## State Contract

| OpenSEO concept | mktg home |
|---|---|
| Project id / domain | `.seo/openseo.json` (`{ projectId, domain, mcpUrl, updatedAt }`) — create on first link |
| Saved keywords | Merge into `brand/keyword-plan.md` (confirm before overwriting) |
| Rank snapshots | `.seo/rank-snapshots/<date>.json` + short summary md |
| Backlink overview | `.seo/backlink-overview.json` (input for off-page-seo) |

One resume protocol per long-arc SEO effort: `docs/seo-machine.md` stays the single tracker; OpenSEO data feeds it, it does not fork it.

## Anti-Patterns

- **Inventing KD/volume numbers** — because agents hallucinate plausible metrics and downstream decisions (content priorities, page generation) get built on fiction. If OpenSEO is not configured, the metric is `unknown`, full stop.
- **Calling DataForSEO directly from mktg** — because it bypasses OpenSEO's project state, caching, and cost controls, and duplicates the vendor integration mktg deliberately does not own. Always go through OpenSEO.
- **Saving keywords or running bulk research without confirmation** — because every call can spend DataForSEO credit; silent bulk spends are how budgets blow up. Confirm first, state the call count.
- **Treating the OpenSEO web UI as required** — because the MCP/API surface is the agent path; the UI is a human convenience. Never block an agent run waiting for a human to click something in a dashboard.
- **Forking SEO state into a second system of record** — because two keyword lists drift and agents stop trusting both. Sync INTO `.seo/` + `brand/keyword-plan.md`; OpenSEO stays the measurement backend, mktg stays the playbook brain.

## Progressive Enhancement

| Level | Behavior |
|---|---|
| L0 (no envs, no MCP) | Gap note + Exa-backed `keyword-research` fallback; metrics `unknown` |
| L1 (`OPENSEO_API_KEY` set) | Non-interactive research calls where REST exists; MCP still preferred |
| L2 (MCP connected) | Full tool surface: research, SERP, ranked keywords, backlinks, GSC |
| L3 (project linked + synced) | `.seo/` snapshots feed `seo-machine` and `off-page-seo` automatically |

---

*Integration shape follows the postiz catalog pattern: raw HTTP/MCP over the network boundary, never vendored code. OpenSEO is MIT-licensed ([every-app/open-seo](https://github.com/every-app/open-seo)).*
