# /cmo skill changelog

## 2026-04-21 — D1: Studio-era upgrade

Full audit + upgrade of the /cmo skill surface. Shipped as three passes to keep each commit reviewable.

### Pass 1 — Additive scope (`a6a2a86`, `9af7a2f`, `722cf8d`)

New rule files:
- `rules/studio-integration.md` — the five studio verbs (schema-fetch, activity, navigate, toast, brand-refresh), mirror-vs-hide decision tree, order-of-operations for combined writes, fire-and-forget failure handling, schema introspection via `/api/schema`.
- `rules/monorepo.md` — sibling project guidance for marketing-cli, mktg-studio, the marketing site, and optional private notes, pointer to `ORCHESTRATOR.md` as authoritative file-ownership map, cross-sibling `--cwd` protocol, red flags.

New playbooks in `rules/playbooks.md`:
- #11 Studio Launch Playbook — `mktg init` → `mktg studio` → foundation research → tabs light up → dashboard live.
- #12 Agent Team Coordination Playbook — parallel sub-agent spawn in a single message, synthesis, learnings compounding.

New command reference rows in `rules/command-reference.md`:
- `mktg studio`, `mktg studio --open`, `mktg studio --dry-run --json`.

Top-level `SKILL.md` references the two new rule files.

Corrections shipped as separate commits:
- `9af7a2f` — fixed monorepo sibling names and added `ORCHESTRATOR.md` pointer per team broadcast.
- `722cf8d` — added schema-fetch as the 5th studio verb (previous draft had 4 POSTs; the read-only GET `/api/schema` is the boot-time handshake).

### Pass 2 — Routing table cross-reference (`6437435`)

Methodology: parsed `skills-manifest.json` programmatically, grep-verified each of the 50 skill names against `skills/cmo/SKILL.md` + `rules/*.md`.

Findings:
- All 50 manifest skills have surface in cmo rules. No orphans.
- All playbook skill references resolve (only unknown token was `mktg-studio`, which is the binary name referenced from the new Studio Launch playbook).
- postiz, brand-kit-playground, content-atomizer triggers all match the manifest.

One gap fixed: `firecrawl` had no positive routing row — only appeared as NOT-THIS in disambiguation. Added a routing row + three disambiguation rows clarifying the `firecrawl` / Exa MCP / `/last30days` decision tree.

### Pass 3 — Error recovery, ecosystem axis, quality gate verification (`e34bfe6`, `95b67e1`, this commit)

`rules/error-recovery.md`: four new rows.
- Studio offline: revert to standalone mode, skip all studio POSTs, no backfill on reconnect.
- SSE drop: hashed activity POSTs vs rendered UI lag detection, 60-second backoff, tied to the studio reconnect fix.
- Postiz rate limit (30/hour): three-tier fallback chain (typefully for the platforms it covers, then file adapter for the rest, then pause + persist + resume). Never silently wait the hour.
- Postiz instance unreachable (non-rate-limit): degrade with honesty, name the failing base URL.

`rules/progressive-enhancement.md`: added the E0-E4 ecosystem axis as a complement (not replacement) to the existing L0-L4 brand axis.
- E0 CLI only, E1 +brand, E2 +studio, E3 +postiz, E4 +full ecosystem.
- Two-axis routing section: L4/E0 ships polished copy to files, L1/E3 distributes thin content loudly, sweet spot is L3+/E2+.

`rules/quality-gate.md`: verified against current skill surface. The 4-gate chain (editorial-first-pass → ai-check → mktg-content-reviewer → mktg-seo-analyst) is current. No new review skills have landed since the rule was written. No edit required.

### Summary by the numbers

- 2 new rule files (studio-integration, monorepo)
- 2 new playbooks (Studio Launch, Agent Team Coordination)
- 1 new routing row + 3 disambiguation rows (firecrawl)
- 4 new error-recovery rows (studio offline, SSE drop, postiz rate limit, postiz unreachable)
- 1 new progressive-enhancement axis (E0-E4)
- ~450 lines added across 7 commits
- 0 destructive rebases, 0 stale skill references, 0 orphan manifest entries

Next: F2 (#20) — cross-check marketing-cli + new studio command against `/agent-dx-cli-scale`.
