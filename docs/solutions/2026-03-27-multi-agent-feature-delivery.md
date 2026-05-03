---
date: 2026-03-27
topic: multi-agent-feature-delivery
tags: [agents, orchestration, review, skills, workflow]
---

# Multi-Agent Feature Delivery: Patterns from the landscape.md Session

## Problem

Shipping a 50-file, 2000-line feature (landscape.md + /landscape-scan) across type system, commands, manifest, skills, CMO integration, brand schema, tests, and docs — in one session, with zero regressions.

## What We Learned

### 1. Phase the work by dependency, parallelize by file ownership

The feature had 8 implementation phases. Phases 1 (types) had to go first because everything depended on it. But Phases 2 (manifest), 3 (commands), 4 (schema), 5 (skill), and 6 (CMO) could all run in parallel because they touched different files. Dispatching 4-6 Opus agents simultaneously on non-overlapping files cut implementation time significantly.

**Key insight:** Parallelism is safe when agents own different files. It breaks when two agents edit the same file — the Edit tool's string matching fails on stale content.

### 2. Test fixing is the long tail — plan for it

Implementation took ~30% of the session. Test fixing took ~50%. The remaining 20% was review and polish. Next time, budget agent capacity for tests from the start — don't treat it as an afterthought.

The most effective pattern: one agent per failure category (brand count agent, skill count agent, fixture agent) rather than one agent trying to fix all failures sequentially.

### 3. 4-agent code review surfaced 8 findings but 3 were wrong

The review agents (security, architecture, simplicity, typescript) found real issues: dead code, missing manifest reads, YAGNI redirects. But 3 of 8 findings were wrong:
- "Remove dead competitors.md entry" → should have been "ADD competitors.md to the array"
- "Remove premature redirects" → redirects aid discoverability for a new skill
- "Trim SKILL.md Output Presentation" → working skill, don't optimize what works

**Pattern:** Review agents optimize for local correctness. Always verify deletions against the full system intent before acting. The human caught "delete → add" because they understood the product goal; agents only saw the code.

### 4. /ce:plan → /ce:work skill chain is production-grade

The Compound Engineering workflow (/ce:brainstorm → /ce:plan → /ce:work → /ce:review) handled this entire feature end-to-end. The plan file at `docs/plans/` served as the single source of truth throughout implementation. Checking boxes as phases completed kept progress visible.

### 5. External skill chaining is an underexplored superpower

The /last30days skill from github.com/mvanhorn/last30days-skill was chained into landscape-scan as its research engine. This was a manual discovery — the maintainer knew the skill existed. The compound skill should surface these connections automatically by scanning ~/.claude/skills/ against manifest needs.

**136 skills installed locally.** Most of them are untapped integration points for mktg.

### 6. The DX audit (21/21) is now a verified, repeatable quality gate

Running /agent-dx-cli-scale with a background Opus agent produced a comprehensive 7-axis scorecard with file:line evidence. This should run automatically before every PR merge — not manually.

## How to Apply

1. **Start every multi-file feature by mapping file ownership** — which files can be edited in parallel vs. which require sequential phases.
2. **Budget 50% of agent capacity for test fixing** — not 10%.
3. **When review agents recommend deletion, verify against product intent** — "dead code" may be "incomplete code."
4. **Use /ce:plan for any feature touching 5+ files** — the structured plan prevents missed touchpoints.
5. **After shipping, scan ~/.claude/skills/ for integration opportunities** — 136 skills is a large untapped surface.
