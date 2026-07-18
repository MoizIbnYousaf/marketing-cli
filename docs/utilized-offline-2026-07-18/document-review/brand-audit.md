# Brand Document Audit — marketing-cli (mktg)

**Skill:** `/document-review`  
**Date:** 2026-07-18  
**Scope:** Full `brand/` audit (read-only; no brand files modified)  
**Overall health:** **Partial / Campaign-ready with gaps** — strong enough for problem-aware launch copy; not yet L4 CMO-grade.

---

## Executive summary

Core positioning, voice, audience, and landscape are populated with usable, on-voice content. Several SCHEMA contracts are incomplete (archetypes, keyword long-tail/difficulty, creative-kit visual brand style, richer competitor rows). Append-only `assets.md` is healthy; `learnings.md` has early dogfood signal. Freshness is fine for a same-day audit window. Highest leverage next skills: `/audience-research`, `/keyword-research`, `/competitive-intel`, then `/brand-voice` polish for sentence-pattern gaps.

---

## Phase 1 — Completeness

| File | Score | Notes |
|---|---|---|
| `voice-profile.md` | **partial** | Personality, tone, vocabulary, example lines present. SCHEMA asks for "Sentence patterns" — missing as a labeled section. No extended do/don't examples beyond vocab lists. |
| `positioning.md` | **complete** | One-liner, category, differentiation, anti-positioning, concrete differentiators. Matches SCHEMA spirit (Angle ≈ differentiation; Proof ≈ differentiators). |
| `audience.md` | **partial** | Primary ICP, jobs, watering holes, messaging angles present. Missing SCHEMA contract `## Archetypes` with six fields per persona. Studio archetype cards will be empty. |
| `competitors.md` | **partial** | Table has named adjacent players + where we win + claims blacklist. Rows are thin (no strengths/weaknesses depth). Acceptable for honesty; weak for comparison pages. |
| `landscape.md` | **partial → near-complete** | Snapshot, claims blacklist, implications present. SCHEMA mentions Players/Trends as landscape sections — partially covered inside Snapshot, not fully structured. |
| `keyword-plan.md` | **partial** | Primary + secondary + content pillars. Missing long-tail list and priority/difficulty table expected by document-review skill checklist. |
| `creative-kit.md` | **partial** | Visual direction, motifs, do-nots present. Missing explicit color tokens/hex list and `## Visual Brand Style` block SCHEMA recommends for image-gen. |
| `stack.md` | **partial** | Product + distribution present. Light on "marketing tools in use" (email ESP, analytics, social schedulers) that stack writers usually list. |
| `assets.md` | **complete** | Multiple dated entries (images/videos) with skill attribution. |
| `learnings.md` | **complete** (early) | Two dated rows including dogfood install + Show HN messaging lesson. |

**Profile completeness score:** ~6.5 / 10 toward L4.  
**Progressive enhancement level:** **L2–L3** — voice + positioning + audience + some competitors/landscape; not full L4.

---

## Phase 2 — Consistency

### Aligned (good)
- One-liner matches across `positioning.md` and user-facing messaging guidance.
- Voice prefer/avoid lists match anti-hype stance in landscape/competitor blacklists.
- ICP consistent: solo founders / agent builders on Claude Code, Cursor, Codex.
- Concrete counts (64 skills, 6 agents) align with current dogfood learning (64/64 skills install).
- Anti-positioning (not scheduler SaaS, not prompt pack, not opaque AI CMO) consistent across positioning + competitors.

### Contradictions / drift risks
| Issue | Detail | Severity |
|---|---|---|
| Skill/agent counts in older assets | `assets.md` historical notes mention "50 skills / 5 agents" in April video creatives; current brand says 64 / 6 | **Medium** — do not reuse old creatives without updating counts |
| Creative palette language | `creative-kit.md` says emerald/mint on near-black; some `assets.md` entries describe graphite + lime `#d8ff3c` | **Low–Medium** — pick one token set before new image-gen |
| SCHEMA section titles vs files | Files use workable headings but not always SCHEMA names (e.g. Archetypes missing; Sentence patterns missing) | **Medium** for Studio consumers |
| Stack vs ecosystem | `stack.md` omits Postiz/Exa/Firecrawl tooling called out in landscape/positioning | **Low** — documentation drift, not messaging conflict |

### Claims blacklist compliance (this audit session)
Launch/content produced under `marketing/` for this session should avoid "only marketing CLI for agents" and invented market-size dollars — brand landscape blacklist is clear. Competitors blacklist (no enterprise team replacement claim; no "posts everywhere without setup") remains in force.

---

## Phase 3 — Freshness

Audit date: 2026-07-18. Content timestamps in files point to 2026-07 snapshot / same-day edits.

| File | Window (SCHEMA) | Status |
|---|---|---|
| voice, positioning, audience, competitors | 30 days | **Fresh** |
| landscape | 14 days content-grounding / 90 general | **Fresh** (2026-07 snapshot) |
| keyword-plan | 90 days | **Fresh** |
| creative-kit, stack | 180 days | **Fresh** |
| assets, learnings | never stale | **OK** (append-only) |

No staleness flags. Re-audit landscape before any "state of agent marketing" public claim older than two weeks from next publish.

---

## Phase 4 — Recommended next skills (priority order)

| Priority | Skill | Why | Writes |
|---|---|---|---|
| P0 | `/audience-research` | Add `## Archetypes` with six fields; deepen JTBD quotes | `brand/audience.md` |
| P0 | `/keyword-research` | Add long-tail + priority/difficulty table around "agent marketing cli" | `brand/keyword-plan.md` |
| P1 | `/competitive-intel` | Flesh competitor strengths/weaknesses; keep claims blacklist | `brand/competitors.md` |
| P1 | `/brand-voice` | Add Sentence patterns + fuller do/don't examples | `brand/voice-profile.md` |
| P2 | `/creative` or visual pass | Unify hex tokens; add Visual Brand Style section | `brand/creative-kit.md` |
| P2 | Manual stack update | List ESP, analytics, native publish, Postiz envs | `brand/stack.md` |
| P3 | `/landscape-scan` | Expand Players/Trends structure before next major launch wave | `brand/landscape.md` |
| Ongoing | All skills | Append assets/learnings after each campaign ship | `assets.md`, `learnings.md` |

### Campaign readiness verdict
| Use case | Ready? |
|---|---|
| Problem-aware launch landing + ads | **Yes** (with count-accurate creatives) |
| SEO pillar on "agent marketing cli" | **Yes**, improve after keyword-research |
| Comparison / alternatives pages | **Not yet** — competitors too thin |
| Persona-specific Studio pulses | **Not yet** — archetypes missing |
| Full L4 multi-skill orchestration | **Almost** — fill P0 gaps first |

---

## Per-file detail (quick reference)

### voice-profile.md
- Strengths: Clear prefer/avoid; example lines are campaign-ready.
- Gaps: Sentence patterns section; more negative examples (what "sounds off").

### positioning.md
- Strengths: Anti-positioning + falsifiable differentiators.
- Gaps: None blocking. Optional: add explicit "Proof points" heading alias for SCHEMA readers.

### audience.md
- Strengths: ICP and watering holes match GTM plan.
- Gaps: Archetypes contract; demographic detail; language quotes.

### competitors.md
- Strengths: Category framing + blacklist discipline.
- Gaps: Depth per player; no indirect/substitute section beyond table.

### keyword-plan.md
- Strengths: Right primary term for SEO article.
- Gaps: Volumes/difficulty/priority; long-tail map to pillars.

### creative-kit.md
- Strengths: Strong "do not" list (no robot mascots, no purple AI glow).
- Gaps: Token precision; conflict with older lime/graphite asset notes.

### stack.md
- Strengths: Accurate product/distribution.
- Gaps: Operator toolchain for email/ads/analytics.

### assets.md / learnings.md
- Strengths: Real entries; dogfood learning about templates blocking prereqs is critical for onboarding emails.
- Action for humans (not done by this skill): retire or relabel outdated 50/5 creatives before boosting ads.

---

## Audit metadata
- Auditor: `/document-review` offline run
- Brand files modified: **none**
- Related outputs this session: see `marketing/UTILIZATION.md`
