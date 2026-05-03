---
date: 2026-04-05
topic: adding-a-skill-vs-brand-file
tags: [architecture, skills, cascade, playground, iteration]
---

# Adding a Skill vs. Adding a Brand File: The Asymmetry

## Problem

Adding brand-kit-playground as skill #45 (later #46 after rebase with voice-extraction) and iterating it through v1/v2/v3 — all in one session. Needed to understand how the skill addition pattern differs from the brand file addition pattern documented in `2026-03-27-adding-a-brand-file.md`.

## What We Learned

### 1. Adding a skill is O(1), adding a brand file is O(n)

Adding brand-kit-playground required: SKILL.md + manifest entry + CLAUDE.md count + README.md count + CMO routing. Only 2 tests broke (documentation drift checking hardcoded counts). Compare to landscape.md: 50+ files, 107 test failures, 10+ manual-cascade locations.

The drop-in skill contract works as advertised. The only cascade is the skill count in CLAUDE.md, README.md, and CMO description — all simple find-and-replace.

### 2. Single-HTML playgrounds are a new capability class for mktg skills

The /playground plugin pattern (single HTML, inline CSS/JS, vanilla state object, zero deps) creates a new category of skill output: interactive browser tools. Previously mktg skills produced text (copy, SEO, emails) or scaffolded apps (app-store-screenshots). Now they can produce interactive HTML workbenches.

This pattern generalizes: any skill that needs visual feedback could output a single HTML file. Candidates: keyword-research (interactive SERP explorer), competitive-intel (visual competitive matrix), pricing-strategy (interactive pricing calculator).

### 3. Research-then-adapt beats trial-and-error for design polish

v1 was functional but ugly. Instead of iterating blind ("make the gradient nicer"), we researched high-quality reference interfaces and app-store-screenshot tooling for specific adaptable CSS/JS patterns. This produced 9 concrete patterns (oklch glow, grid background, resizable panel, double-pulse flash, etc.) that we applied surgically. Total time: ~30 min research + ~15 min application. Trial-and-error would have taken hours with worse results.

**The pattern**: when quality is the problem, research what excellence looks like BEFORE iterating. Steal the structure, adapt the details.

### 4. Manifest conflicts during parallel development require keeping BOTH entries

Remote added voice-extraction while we added brand-kit-playground. The rebase conflict in skills-manifest.json required manual resolution — keeping both skills, not picking one. The fix was: read the conflict markers, identify what each side added, combine them. The `replace_all` on skill counts then needed updating to the merged total (46, not 45).

## How to Apply

- **Adding a new skill**: Follow the checklist in docs/skill-contract.md. Budget 15 minutes for the manifest + count updates. Tests should pass with zero fixes if counts use `toBeGreaterThanOrEqual`.
- **Interactive skill output**: Use the /playground single-HTML pattern. Read references/html-architecture.md for the blueprint. Read references/design-patterns.md for premium CSS/JS patterns.
- **Design polish iteration**: Research → adapt → apply. Don't iterate blind. Find a tool with the quality bar you want, extract its CSS patterns, adapt them.
- **Manifest conflicts**: Always pull before pushing. When resolving conflicts, keep ALL new entries from both sides. Update counts to the merged total.
