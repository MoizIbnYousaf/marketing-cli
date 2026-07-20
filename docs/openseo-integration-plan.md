# OpenSEO → marketing-cli Integration Plan

> Ultimate goal: make [every-app/open-seo](https://github.com/every-app/open-seo) the **first-class SEO data + workflow plane** inside `mktg`, while keeping mktg’s playbook/orchestration model (`/cmo`, brand memory, progressive enhancement).
>
> **This document is plan-only.** No implementation in this PR.
> Status: `pending` (plan authored 2026-07-20). Resume by taking the next `pending` phase.

## Reference data (don’t modify without explicit instruction)

| Field | Value |
|---|---|
| Upstream | https://github.com/every-app/open-seo |
| Upstream product | OpenSEO — open-source Semrush/Ahrefs alternative |
| Upstream license | **MIT** (compatible with mktg MIT; no AGPL firewall required) |
| Hosted product | https://openseo.so · MCP `https://app.openseo.so/mcp` |
| Data vendor | DataForSEO (BYO when self-hosting; hosted meters differently) |
| Upstream skills | `.agents/skills/{seo-project-setup,seo-coach,keyword-research,keyword-clustering,competitive-landscape,competitor-analysis,link-prospecting}` (+ internal maintainer skills — **do not steal**) |
| mktg SEO today | Playbook skills: `keyword-research`, `seo-content`, `seo-audit`, `ai-seo`, `off-page-seo`, `seo-machine`, `competitor-alternatives` + agent `mktg-seo-analyst` |
| Closest mktg patterns | **postiz catalog** (remote service), **Exa skill pack** (MCP + HTTP), **firecrawl** (CLI chain), **studio** (bundled UI — last resort) |
| Non-goal | Vendoring OpenSEO’s Cloudflare/Vite/Workers monolith into the `marketing-cli` npm tarball |

---

## Why this belongs in mktg

| Layer | Today (mktg) | Gap OpenSEO fills |
|---|---|---|
| Playbooks | Strong: CMO Path A/B, seo-machine sprint, content/alternatives | Still methodology-first |
| Live SEO metrics | Weak: Exa/Firecrawl SERP scrape, no KD/volume/backlinks/rank tracking | DataForSEO-backed KD, volume, SERP, ranked keywords, backlinks, rank tracker, GSC |
| Agent interface | Skills dump markdown; research via Exa MCP | First-class MCP tool surface designed for agents |
| Human UI | Studio (marketing ops), not SEO suite | Focused SEO UI (hosted or Docker self-host) |

**North star architecture**

```text
                 /cmo  (orchestration — unchanged principle)
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Playbook skills   Brand memory   Distribution
   (seo-content,     brand/         publish / native
    seo-machine,…)   keyword-plan
        │                  ▲
        │   writes plans   │
        ▼                  │
 ┌─────────────────────────┴──────────┐
 │  OpenSEO data plane (first-class)  │
 │  MCP tools + optional hosted/UI    │
 │  catalog: openseo                  │
 └────────────────────────────────────┘
              │
              ▼
         DataForSEO / GSC
```

Playbooks stay in mktg. **Metrics, SERP truth, rank tracking, backlinks, GSC** come from OpenSEO when configured. Exa/Firecrawl remain progressive-enhancement fallbacks (L0 / no OpenSEO).

---

## Critical constraints

1. **Name collisions** — OpenSEO ships skills named `keyword-research`, overlapping mktg’s `keyword-research`. Never install upstream names as-is into `skills-manifest.json`. Namespace as `openseo-*` **or** absorb workflows into existing skills with an OpenSEO backend section.
2. **Two planes** — OpenSEO app ≠ mktg CLI. Do not merge repos. Integrate via catalog + MCP + adapted skills + doctor.
3. **Auth models differ** — Hosted MCP uses OAuth login flow; self-host uses `DATAFORSEO_API_KEY` (+ local_noauth Docker). mktg must document both; agents prefer non-interactive creds where possible.
4. **Cost surface** — Every OpenSEO call can spend DataForSEO credit. Skills must keep dry-run / confirm discipline for expensive bulk calls and `save_keywords`.
5. **State directories** — mktg uses `.seo/` + `docs/seo-machine.md` + `brand/keyword-plan.md`. OpenSEO has its own projects/saved keywords. Plan for **sync contracts**, not competing OSes.
6. **Catalog schema today** — `CatalogCapabilities` only knows publish/scheduling/email. First-class SEO needs a new capability family (see Phase 1).
7. **Agent DX 21/21** — any new commands keep JSON, `--dry-run`, `--fields`, validators, schema entries.

---

## Decision record (resolve before coding the named phase)

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Integration shape | (A) Catalog+MCP (B) Workspace-vendored app (C) Skills-only steal | **A** — catalog + MCP + adapted skills. B only if Studio later embeds an iframe/link, not a code merge. |
| D2 | Skill identity | (A) New `openseo-*` skills (B) Teach existing SEO skills to call OpenSEO (C) Both | **C** — thin `openseo` catalog skill + upgrade Path A/B skills to prefer OpenSEO tools when catalog configured. |
| D3 | Default research backend when OpenSEO configured | OpenSEO always / prompt / Exa still default | **OpenSEO for metrics-heavy SEO**; Exa for open-web discovery & content mining; Firecrawl for known-URL fetch. Document matrix in CMO ecosystem. |
| D4 | Hosted vs self-host default | Hosted MCP first / Docker first | **Hosted MCP first** (matches postiz “hosted default”); Docker documented as advanced BYO DataForSEO. |
| D5 | Ultimate “fully combine” meaning | Bundle UI in tarball / deep product coupling without vendoring | **Deep coupling without vendoring**: `mktg doctor`/`catalog`/`seo`/`studio` treat OpenSEO as the SEO system of record; optional `mktg openseo` launcher for Docker/hosted deep links. |

---

## Phase Status Tracker

| # | Phase | Status | PR | Notes |
|---|---|---|---|---|
| 0 | Plan authored (this doc) | `completed` | — | 2026-07-20 |
| 1 | Catalog model: `openseo` + SEO/MCP capabilities | `pending` | | Schema/types foundation |
| 2 | Doctor + env/MCP readiness | `pending` | | |
| 3 | Root MCP wiring + agent install docs | `pending` | | `.mcp.json` / CONTEXT |
| 4 | First-class `openseo` skill (adapter / coach) | `pending` | | Namespace-safe |
| 5 | Steal & adapt OpenSEO workflow skills (`openseo-*`) | `pending` | | Upstream provenance |
| 6 | Rewire existing SEO skills + `/cmo` Path A/B | `pending` | | Prefer OpenSEO when configured |
| 7 | Brand / `.seo` / OpenSEO project sync contract | `pending` | | |
| 8 | CLI surface: `mktg catalog` / optional `mktg seo` | `pending` | | |
| 9 | Studio: SEO panel / deep links / status | `pending` | | |
| 10 | Self-host launcher + compose helper | `pending` | | Advanced path |
| 11 | Tests, counts, release packaging | `pending` | | |
| 12 | Ultimate hardening: single SEO OS UX | `pending` | | End-state polish |

---

## Target end state (“fully combined”)

When this plan is done, a user/agent should experience:

1. `mktg init` / `mktg update` installs OpenSEO-aware skills.
2. `mktg doctor --json` reports OpenSEO catalog readiness (hosted token/MCP **or** self-host base + DataForSEO).
3. `mktg catalog info openseo --json` shows configured/missing, transport, docs, pinned version.
4. `/cmo` “do SEO” routes through OpenSEO-backed workflows when ready; otherwise falls back to Exa/Firecrawl playbooks with an explicit gap note.
5. `keyword-research` / `seo-audit` / `off-page-seo` / `ai-seo` / `seo-machine` **read live OpenSEO MCP data** into `brand/keyword-plan.md` and `.seo/*` without inventing metrics.
6. OpenSEO-native workflows available as `openseo-keyword-clustering`, `openseo-competitive-landscape`, etc., orchestrated by `/cmo` or `mktg route`.
7. Studio shows SEO readiness + deep link to OpenSEO project (hosted URL or local Docker).
8. Expensive mutations (`save_keywords`, bulk research) respect `--dry-run` / confirm norms.
9. No second conflicting “SEO machine” — one resume protocol, OpenSEO as measurement backend.

---

## Phase 1 — Catalog model extension

**Problem:** Catalogs only express publish/email/scheduling. OpenSEO is a research/MCP service.

### Scope

- Add capability family, e.g. `research_adapters: ["openseo"]` and/or `mcp: { url_env, default_url }`.
- Extend `CatalogEntry` / loader / collision rules / allowlist (MIT + `transport: "http"` or new `transport: "mcp"`).
- Add `catalogs-manifest.json` entry:

```json
"openseo": {
  "name": "openseo",
  "repo_url": "https://github.com/every-app/open-seo",
  "docs_url": "https://openseo.so/docs/mcp",
  "license": "MIT",
  "version_pinned": "<tag or commit>",
  "capabilities": {
    "research_adapters": ["openseo"]
  },
  "transport": "http",
  "sdk_reference": null,
  "auth": {
    "style": "bearer",
    "base_env": "OPENSEO_API_BASE",
    "credential_envs": ["OPENSEO_API_KEY"],
    "header_format": "bearer"
  },
  "skills": ["openseo"]
}
```

**Auth note:** Hosted MCP today is OAuth-in-client. Phase 1 should define the **agent-stable** env contract even if first slice only documents MCP URL + “connected in client”:

| Env | Purpose |
|---|---|
| `OPENSEO_MCP_URL` | Default `https://app.openseo.so/mcp`; self-host override |
| `OPENSEO_API_BASE` | REST/base if/when used beyond MCP |
| `OPENSEO_API_KEY` / project token | Non-interactive automation (may require upstream support — track as dependency) |
| `DATAFORSEO_API_KEY` | Self-host path only (document; usually set in OpenSEO’s env, not mktg’s) |

If upstream lacks a non-interactive API key for MCP, Phase 1 documents **MCP-connected** as the readiness signal (doctor checks config file / explicit `OPENSEO_MCP_CONFIGURED=1` / catalog status probe) and files an upstream ask for token auth.

### Acceptance

- [ ] `mktg catalog list --json` includes `openseo`
- [ ] License/transport validation green (MIT)
- [ ] Schema + AGENTS Drop-in Catalog Contract updated for research/MCP capabilities
- [ ] No publish-adapter collision with postiz

### Invasiveness

**M** — types, catalogs loader, tests, manifest, docs.

---

## Phase 2 — Doctor + readiness

### Scope

- Doctor checks: catalog configured, MCP URL present, optional probe.
- Remediation strings: hosted signup + MCP add commands (Cursor/Claude/Codex), Docker self-host link, DataForSEO docs.
- Distinguish: `not_configured` | `mcp_client_only` | `api_ready` | `selfhost_ready`.

### Acceptance

- [ ] `mktg doctor --json` surfaces OpenSEO in integrations/catalogs
- [ ] Missing OpenSEO does **not** fail core doctor (optional, like Typefully)
- [ ] `--strict` SEO flows (later) can require it

### Invasiveness

**S–M**

---

## Phase 3 — MCP wiring in mktg agent surface

### Scope

- Document OpenSEO MCP in root `.mcp.json` (commented or optional block — don’t break machines without auth).
- CONTEXT.md + `/cmo` `ecosystem.md` + `cli-runtime-index.md`: when to use OpenSEO vs Exa vs Firecrawl.
- Matrix:

| Job | Preferred | Fallback |
|---|---|---|
| KD / volume / CPC / intent | OpenSEO MCP | none (mark `unknown`) |
| Live SERP for a keyword | OpenSEO MCP | Firecrawl/Exa scrape (weaker) |
| Domain ranked keywords / backlinks | OpenSEO MCP | competitive-intel qualitative |
| Open web discovery / Reddit / GitHub | Exa | — |
| Fetch known URL content | Firecrawl | — |
| GSC performance | OpenSEO (connected) | manual export |

### Acceptance

- [ ] Agent reading CONTEXT knows setup order: OpenSEO MCP → skills → `/cmo` SEO
- [ ] No instruction to invent KD/volume

### Invasiveness

**S**

---

## Phase 4 — First-class `openseo` skill

### Scope

Add `skills/openseo/SKILL.md` (catalog companion, like `postiz`):

- On Activation: check catalog readiness; explain hosted vs self-host; never call DataForSEO directly from mktg.
- Routes to workflow skills / existing SEO skills.
- Anti-patterns: inventing metrics; saving keywords without confirm; treating OpenSEO UI as optional if agent has MCP.
- Progressive enhancement: without OpenSEO, point to Exa-backed `keyword-research` and state the gap.

### Acceptance

- [ ] Manifest entry + `mktg list` shows `openseo`
- [ ] `mktg run openseo --json` loads; prereqs mention env/MCP
- [ ] Counts/derive-counts updated

### Invasiveness

**S**

---

## Phase 5 — Adapt OpenSEO workflow skills (`openseo-*`)

Steal **product** skills only (not `papercuts`, `merge-ready`, `webapp-testing`, release-notes):

| Upstream | mktg name | Writes into |
|---|---|---|
| `seo-project-setup` | `openseo-project-setup` | `.seo/openseo-project.md` + links `brand/` |
| `seo-coach` | `openseo-coach` | none (coach) |
| `keyword-research` | `openseo-keyword-research` | feeds `brand/keyword-plan.md` |
| `keyword-clustering` | `openseo-keyword-clustering` | `marketing/seo/clusters/*.md` |
| `competitive-landscape` | `openseo-competitive-landscape` | `brand/landscape.md` / competitors section |
| `competitor-analysis` | `openseo-competitor-analysis` | `brand/competitors.md` |
| `link-prospecting` | `openseo-link-prospecting` | `.seo/backlink-targets.json` (align with off-page-seo) |

### Adaptation requirements (mktg drop-in contract)

- Frontmatter: `name`, pushy `description`, `reads`/`writes` with `brand/` prefix, On Activation, Anti-Patterns with WHY.
- Prefer OpenSEO MCP tool names from upstream; add mktg output paths.
- Provenance: light Exa-style `upstream` in manifest **or** full `upstream.json` + `check-upstream.sh` if we vendor substantial text.
- **Do not** register upstream names that collide with existing skills.

### Acceptance

- [ ] All seven adapted skills install via `mktg update`
- [ ] `/cmo` can route “cluster these keywords” → `openseo-keyword-clustering`
- [ ] Drift strategy documented (manual sync cadence or check-upstream)

### Invasiveness

**M**

---

## Phase 6 — Rewire existing SEO skills + CMO playbooks

**Problem:** Leaving two parallel SEO stacks (`keyword-research` vs `openseo-keyword-research`) confuses agents.

### Scope

For each existing skill, add **Backend selection** section:

1. If OpenSEO catalog ready → call OpenSEO MCP tools; write mktg artifacts.
2. Else → existing Exa/Firecrawl/L0 path; note metrics may be `unknown`.

Update:

- `skills/cmo/rules/playbooks.md` SEO Authority Build (Path A/B)
- `skills/cmo/rules/ecosystem.md`
- `keyword-research`, `seo-audit`, `off-page-seo`, `ai-seo`, `seo-machine`, `competitor-alternatives`
- Disambiguation: “SEO” → check OpenSEO readiness → coach or project-setup if new

### Acceptance

- [ ] Single `/cmo` SEO path; OpenSEO is default data plane when configured
- [ ] Offline/no-key path still works (progressive enhancement)
- [ ] No skill calls another skill; `/cmo` orchestrates

### Invasiveness

**M–L** (playbook edits + tests for routing copy)

---

## Phase 7 — State sync contract

### Scope

Define canonical mapping:

| OpenSEO concept | mktg home |
|---|---|
| Project id / domain | `.seo/openseo.json` `{ projectId, domain, mcpUrl, updatedAt }` |
| Saved keywords | → merge into `brand/keyword-plan.md` (+ optional `.seo/keywords-sync.json`) |
| Rank tracker snapshot | `.seo/rank-snapshots/{date}.json` + summary md |
| Backlink overview | `.seo/backlink-overview.json` for off-page-seo |
| GSC striking distance | input to keyword-research / seo-machine phases |

Commands (sketch):

```bash
mktg seo status --json
mktg seo sync-keywords --dry-run|--confirm --json
mktg seo link-project --input '{"projectId":"..."}' --json
```

(Exact command home: `mktg seo …` vs `mktg catalog …` — prefer `mktg seo` as user-facing SEO namespace once catalog exists.)

### Acceptance

- [ ] Agent can bind a repo to an OpenSEO project idempotently
- [ ] Sync never overwrites brand files without `--confirm`
- [ ] seo-machine resume protocol remains single tracker (`docs/seo-machine.md`)

### Invasiveness

**M**

---

## Phase 8 — CLI surface polish

### Scope

- `mktg catalog info openseo` rich fields: mcp url, auth mode, skills, cost warnings.
- Optional `mktg seo` command group: `status`, `doctor`, `open` (print hosted/self-host URL), `sync-*`.
- Align with CLI improvement plan: `run --with-context`, honest prereqs including OpenSEO envs.

### Acceptance

- [ ] Schema complete; exit codes correct
- [ ] Dry-run on all mutating seo sync commands

### Invasiveness

**M**

---

## Phase 9 — Studio integration

### Scope

- Studio API: SEO readiness card (catalog + last sync).
- Deep link button: hosted project URL or `http://localhost:3001` self-host.
- Do **not** embed OpenSEO’s React app inside Studio in v1.
- Optional later: iframe only if CSP/auth allow (explicit follow-up).

### Acceptance

- [ ] `mktg studio` shows OpenSEO configured/missing with remediation
- [ ] studio-api-index.md updated

### Invasiveness

**M**

---

## Phase 10 — Self-host launcher (advanced)

### Scope

- Document Docker compose path (`ghcr.io/every-app/open-seo`).
- Optional helper: `mktg openseo up --dry-run|--confirm` wrapping compose in project or XDG data dir — **only if** we accept Docker-in-doctor complexity.
- Telemetry: pass through `OPENSEO_TELEMETRY_DISABLED` guidance.
- Auth warning: Docker `local_noauth` must not be exposed publicly.

### Acceptance

- [ ] Advanced docs path works without helper; helper is optional sugar
- [ ] Doctor distinguishes hosted vs self-host readiness

### Invasiveness

**M** (docs-only **S** if no launcher)

---

## Phase 11 — Tests, counts, packaging

### Scope

- Manifest counts / derive-counts / CMO indexes
- Integration: catalog load, doctor optional check, skill frontmatter↔catalog env drift test (like postiz)
- Package.json banned-deps unchanged (still don’t install AGPL SDKs; OpenSEO MIT doesn’t force SDK)
- No bundling of OpenSEO app into npm `files` array
- E2E dogfood script: with mocked MCP or skip-without-creds pattern (like Exa live tests)

### Acceptance

- [ ] `bun test` green; skill counts consistent
- [ ] CI skips live OpenSEO without secrets

### Invasiveness

**S–M**

---

## Phase 12 — Ultimate hardening (“feels native”)

### Scope

- `mktg plan` SEO tasks aware of OpenSEO readiness + artifact sync state.
- `mktg route "keyword research"` → OpenSEO-backed skill when configured.
- Single onboarding: `mktg-setup` / `openseo-project-setup` handoff.
- Cost guardrails: default result limits; confirm on save; learnings log for spend surprises.
- Positioning: mktg = agent marketing OS; OpenSEO = SEO system of record inside that OS.
- Consider upstream collaboration: token auth for agents, stable MCP tool schema versioning, “mktg brand export” partnership — track as external deps, not blockers for Phases 1–6.

### Acceptance

- [ ] Dogfood: new project → doctor → MCP → keyword research → keyword-plan.md → seo-content → seo-machine phase, all without inventing metrics
- [ ] CONTEXT one-pager “SEO with mktg” matches reality

### Invasiveness

**M** (product polish across surfaces)

---

## Suggested shipping milestones

| Milestone | Phases | User-visible win |
|---|---|---|
| **S1 — Catalog foothold** | 1–4 | `openseo` in catalog/doctor/skills; docs for MCP |
| **S2 — Workflow parity** | 5–6 | OpenSEO workflows + CMO prefers OpenSEO data |
| **S3 — System of record** | 7–8 | Project link + keyword sync CLI |
| **S4 — Productized** | 9–11 | Studio card, tests, optional self-host sugar |
| **S5 — Native feel** | 12 | Plan/route/onboarding treat OpenSEO as default SEO backend |

---

## Mapping: OpenSEO workflows ↔ mktg skills (end state)

| OpenSEO workflow | Primary mktg entry | Data backend |
|---|---|---|
| Project setup | `openseo-project-setup` → brand foundation | OpenSEO projects + GSC |
| Coach | `openseo-coach` / `/cmo` | — |
| Keyword research | `keyword-research` (OpenSEO path) + `openseo-keyword-research` | MCP `research_keywords`, metrics, GSC |
| Clustering | `openseo-keyword-clustering` → seo-content / seo-machine | MCP + brand plan |
| Competitive landscape | `landscape-scan` / `openseo-competitive-landscape` | MCP domain/SERP tools; Exa for narrative |
| Competitor analysis | `competitive-intel` + `openseo-competitor-analysis` | MCP ranked keywords/backlinks |
| Link prospecting | `off-page-seo` + `openseo-link-prospecting` | MCP backlinks + Exa outreach research |
| Site audits | `seo-audit` / seo-machine scripts | OpenSEO where APIs exist; local crawl remains |
| AI visibility | `ai-seo` | OpenSEO AI search features when exposed via MCP |
| Rank tracking | new `.seo/rank-*` via sync | OpenSEO rank tracker |
| Content production | `seo-content`, `competitor-alternatives` | unchanged playbooks, better inputs |
| Programmatic SEO | `seo-machine` | OpenSEO validates KD/DR-style inputs before page gen |

---

## Explicit non-goals

- Merging OpenSEO’s Cloudflare Workers app into `studio/` or the npm tarball
- Replacing `/cmo` with OpenSEO’s seo-coach
- Calling DataForSEO **directly** from mktg (always via OpenSEO)
- Dropping Exa/Firecrawl (they cover non-SEO and fallback paths)
- Auto-spending DataForSEO budget without confirms on saves/bulk
- Stealing OpenSEO maintainer-only skills (`papercuts`, greptile, release-notes)

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Skill name collision confuses agents | Namespace `openseo-*`; rewrite CMO routes carefully |
| OAuth MCP hard for headless cloud agents | Document client login; pursue API token with upstream; skip-live tests |
| Dual SEO state drift | Phase 7 sync contract; single resume doc for seo-machine |
| Cost blowups | Confirm on save; limit defaults; doctor cost warning |
| Upstream MCP tool rename | Pin version; optional check-upstream on adapted skills |
| Scope creep to “rebuild Semrush in Studio” | Deep link + status only until S5 |

---

## Upstream dependencies / asks (external)

Track separately; do not block S1:

1. Stable non-interactive auth for MCP/API (agent automation).
2. Documented MCP tool schema version / changelog.
3. Clear self-host MCP URL pattern parity with hosted.
4. Optional: webhook or export API for saved keywords ↔ `brand/keyword-plan.md`.

---

## Resume protocol

1. Read Phase Status Tracker.
2. Implement next `pending` phase as its own PR (`feat(openseo): …`).
3. Update tracker row in the **same commit**.
4. Dogfood with `--json`; if no OpenSEO creds, prove skip/remediation paths.
5. Keep this plan’s north-star diagram accurate — if architecture changes, edit Reference/Decision sections deliberately.

---

## Appendix A — Upstream skill inventory (product)

| Skill | Role |
|---|---|
| `seo-project-setup` | Workspace + MCP verify + GSC |
| `seo-coach` | Beginner routing / coaching |
| `keyword-research` | Opportunity discovery via MCP |
| `keyword-clustering` | Intent clusters → pages |
| `competitive-landscape` | Market map |
| `competitor-analysis` | Single competitor teardown |
| `link-prospecting` | Outreach prospects |

## Appendix B — Why not workspace-vendoring

OpenSEO is a pnpm + Vite + Cloudflare Workers + Drizzle (D1/Postgres) product with its own auth, billing metering, and UI. mktg is a Bun CLI + optional Studio. Vendoring would:

- Explode package size and security surface
- Fork divergence from a fast-moving upstream (5k+ stars)
- Fight Studio’s port/auth model

**First-class** means productized integration, not a git submodule of their monolith.
