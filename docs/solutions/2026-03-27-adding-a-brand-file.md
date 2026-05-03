---
date: 2026-03-27
topic: adding-a-brand-file
tags: [architecture, brand-files, cascade, testing]
---

# Adding a Brand File: The Full Cascade

## Problem

Adding landscape.md as the 10th brand file touched 50+ files and broke 107 tests. The type system cascades correctly through some paths (init, doctor, scaffolding) but NOT through hardcoded lists in plan.ts, status.ts, and context.ts.

## What We Learned

### 1. The cascade has two layers

**Auto-cascade (no manual update needed):**
- `scaffoldBrand()` iterates `BRAND_FILES`
- `getBrandStatus()` iterates `BRAND_FILES`
- `exportBrand()` / `importBrand()` iterate `BRAND_FILES`
- `getTemplateHashes()` iterates `BRAND_FILES`
- `checkBrand()` in doctor iterates `BRAND_PROFILE_FILES`

**Manual-cascade (must update by hand):**
- `plan.ts`: `foundationOrder` array + `skillMap` record
- `status.ts`: `foundationFiles` array + `skillMap` record
- `context.ts`: `FILE_PRIORITY` array
- `CONTEXT_MATRIX` in brand.ts
- `skills-manifest.json`: CMO reads, content skill reads, new skill entry, redirects
- `skills/cmo/SKILL.md`: activation protocol, routing table, guardrails, first-30-minutes
- `skills/cmo/rules/brand-memory.md`: directory listing, per-skill reads, enhancement levels
- `brand/SCHEMA.md`: file contract, context matrix table, freshness rules

### 2. Test count hardcoding is a landmine

107 tests failed because counts were hardcoded as `9`, `41`, `7` across 30+ test files. The CLAUDE.md rule says "never hardcode counts" but tests did it anyway. When fixing:
- `toHaveLength(9)` needs context — sometimes 9 is correct (10 total - 1 skipped = 9 created)
- `toBe(9)` on summary.total always needs updating
- Template counts change too (10 total - 3 populated = 7 templates, not 6)
- E2E roundtrip tests need REAL_CONTENT fixture entries for the new file
- Website component tests read from manifest dynamically but some had snapshot assertions

### 3. Agents recommend deletion when the answer is addition

Three review agents flagged `competitors.md` in status.ts skillMap as "dead code — remove it." The actual bug was that `competitors.md` was missing from `foundationFiles` — the entry was right, the array was incomplete. The fix was to ADD competitors.md to the array, not DELETE it from the map. Always verify agent recommendations against intent before acting.

### 4. Parallel agent execution works but needs coordination

Running 8+ Opus agents in parallel is fast but creates race conditions on shared files. When two agents edit the same test file:
- sed-based batch edits are idempotent (safe to overlap)
- Edit tool calls can conflict if both try to match the same string
- Commit early and often to protect work from agent overlap

### 5. The satisfies constraint is your best friend

`BRAND_TEMPLATES` uses `as const satisfies Record<BrandFile, string>`. This means TypeScript will refuse to compile if you add a BrandFile union member without a corresponding template. This is the strongest enforcement in the cascade — it catches mistakes at build time, not runtime.

### 6. 14-day freshness is the right call for market data

landscape.md has the shortest freshness window (14 days) of any brand file. Profile files are 30 days, config files are 90 days, append-only files never stale. Market data decays fast — two weeks is generous.

## How to Apply

Before adding the next brand file (or removing one):
1. Map ALL consumers of `BRAND_FILES` — there are 10+ locations
2. Count hardcoded numbers in tests BEFORE making changes
3. Plan for 30+ test file updates
4. Use parallel agents but commit between phases
5. Verify agent "remove dead code" recommendations against the full context
