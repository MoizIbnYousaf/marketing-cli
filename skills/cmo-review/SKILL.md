---
name: cmo:review
description: "Review marketing output for quality, brand consistency, and conversion effectiveness. Use when the user wants to evaluate marketing content, audit campaign assets, or quality-check deliverables before publishing. Triggers on 'review the content', 'check the copy', 'audit the campaign', 'is this ready to publish', or any request to evaluate marketing quality."
argument-hint: "[file path, directory, or 'latest' to review most recent campaign output]"
metadata:
  version: 1.0.0
category: workflow
tier: orchestration
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
  - marketing/content/
  - marketing/social/
  - marketing/email/
writes:
  - marketing/reviews/
triggers:
  - review content
  - check copy
  - audit campaign
  - ready to publish
  - quality check
---

# /cmo:review — Marketing Quality Review

Review marketing output for brand consistency, conversion effectiveness, audience alignment, and publish-readiness.

## Introduction

Perform thorough quality reviews of marketing content and campaign assets. This catches issues before they reach your audience — off-brand messaging, weak CTAs, misaligned positioning, or inconsistent tone.

This is step 3 of the marketing workflow cycle: **plan** -> **work** -> **review** -> **compound**.

## Review Target

<review_target> #$ARGUMENTS </review_target>

## Main Tasks

### 1. Determine Review Scope

**If a specific file/directory is provided:**
- Read the file(s) and identify the content type (copy, email, social, SEO, etc.)

**If "latest" or empty:**
- Check recent campaign output:
  ```bash
  mktg status --json
  ls -lt marketing/content/ marketing/social/ marketing/email/ 2>/dev/null | head -20
  ```
- Find the most recent plan and its associated output:
  ```bash
  ls -lt marketing/plans/*.md 2>/dev/null | head -5
  ```
- Identify all files produced by the most recent `/cmo:work` execution

**Load brand context (required):**
- Read `brand/voice-profile.md` — voice guidelines are the review baseline
- Read `brand/positioning.md` — positioning frames what claims are valid
- Read `brand/audience.md` — audience determines if messaging resonates

### 2. Brand Voice Audit

Review every piece of content against `brand/voice-profile.md`:

| Check | What to Look For |
|-------|-----------------|
| **Tone** | Does it match the brand's tone attributes? (e.g., confident but not arrogant) |
| **Vocabulary** | Uses brand-approved terminology? Avoids banned words? |
| **Personality** | Reads like the brand would speak, not generic marketing? |
| **Consistency** | Same voice across all pieces? No jarring shifts? |

**Severity:**
- Tone mismatch across multiple pieces = P1 (blocks publish)
- Occasional off-brand phrasing = P2 (should fix)
- Minor style inconsistencies = P3 (nice to fix)

### 3. Conversion Effectiveness Review

Evaluate each content piece for marketing effectiveness:

**For landing pages / sales copy:**
- [ ] Clear value proposition above the fold
- [ ] Specific benefits, not vague claims
- [ ] Social proof present (testimonials, logos, numbers)
- [ ] Single clear CTA per section
- [ ] Objection handling present
- [ ] Urgency or scarcity elements (if appropriate)
- [ ] Mobile-friendly structure (short paragraphs, scannable)

**For email sequences:**
- [ ] Subject lines are specific and curiosity-driven (not clickbait)
- [ ] Each email has one clear goal
- [ ] Sequence builds progressive trust
- [ ] Unsubscribe path is clear
- [ ] Personalization tokens used correctly
- [ ] CTA placement is prominent

**For SEO content:**
- [ ] Target keyword in title, H1, and first paragraph
- [ ] Search intent matches content type (informational, commercial, transactional)
- [ ] Comprehensive coverage of the topic
- [ ] Internal links to related content
- [ ] Meta description is compelling and includes keyword
- [ ] Content is better than current top 3 results for the keyword

**For social content:**
- [ ] Hook in first line (stops the scroll)
- [ ] Platform-native format (not copy-pasted across platforms)
- [ ] Clear CTA or engagement prompt
- [ ] Hashtags/mentions are relevant (not spammy)
- [ ] Visual description or alt text included

### 4. Audience Alignment Check

Cross-reference all content against `brand/audience.md`:

- [ ] Speaks to the audience's pain points (not the product's features)
- [ ] Uses language the audience uses (not industry jargon they wouldn't know)
- [ ] Addresses the audience's stage in the buyer journey
- [ ] Emotional resonance appropriate for the segment
- [ ] Examples and analogies are relevant to the audience's world

### 5. Positioning Accuracy Check

Cross-reference against `brand/positioning.md`:

- [ ] Claims are consistent with stated positioning
- [ ] Competitive differentiation is accurate (no outdated competitor info)
- [ ] Value propositions match what the product actually delivers
- [ ] No positioning contradictions across content pieces
- [ ] Category language is consistent

### 6. Technical Quality Check

- [ ] No placeholder text or TODO markers
- [ ] YAML front-matter present and correct on all files
- [ ] Links are valid (no broken references)
- [ ] Images/visuals referenced exist or have clear descriptions
- [ ] Formatting is clean (no double spaces, orphaned bullets, etc.)
- [ ] Content length matches the channel (not a blog post in a tweet)

### 7. Findings Synthesis

Categorize all findings:

**P1 — Blocks Publish (must fix):**
- Brand voice violations across multiple pieces
- Factually incorrect claims
- Missing or broken CTAs
- Content that could damage brand reputation
- Legal or compliance issues

**P2 — Should Fix (important):**
- Weak conversion elements
- Audience misalignment
- Positioning inconsistencies
- Missing social proof or objection handling
- SEO gaps

**P3 — Nice to Fix (enhancement):**
- Minor style inconsistencies
- Additional social proof opportunities
- Formatting improvements
- Additional internal link opportunities

### 8. Write Review Report

Save the review to `marketing/reviews/`:

```bash
mkdir -p marketing/reviews/
```

Write to `marketing/reviews/YYYY-MM-DD-review-<campaign-name>.md`:

```markdown
---
title: "Review: [Campaign Name]"
date: YYYY-MM-DD
plan: marketing/plans/[associated plan]
status: [pass|needs-fixes|blocked]
p1_count: [number]
p2_count: [number]
p3_count: [number]
---

# Marketing Review: [Campaign Name]

## Summary
- **Overall:** [PASS / NEEDS FIXES / BLOCKED]
- **Brand Voice:** [Consistent / Minor Issues / Major Issues]
- **Conversion:** [Strong / Adequate / Weak]
- **Audience Fit:** [Aligned / Partially / Misaligned]

## P1 Findings (Blocks Publish)
[Detailed findings with file paths and specific text to fix]

## P2 Findings (Should Fix)
[Findings with suggestions]

## P3 Findings (Enhancements)
[Nice-to-have improvements]

## Content Scorecard

| Asset | Voice | Conversion | Audience | Overall |
|-------|-------|------------|----------|---------|
| [file] | [score] | [score] | [score] | [score] |

## Recommended Actions
1. [Specific action items in priority order]
```

### 9. Present Results

Show the user a summary:

```markdown
## Marketing Review Complete

**Status:** [PASS / NEEDS FIXES / BLOCKED]

**Findings:**
- P1 (Blocks Publish): [count]
- P2 (Should Fix): [count]
- P3 (Enhancements): [count]

**Review saved to:** marketing/reviews/[filename]
```

Use the **AskUserQuestion tool**:

**Question:** "Review complete. What would you like to do?"

**Options:**
1. **Fix P1 issues** — Address blocking issues immediately
2. **Fix all issues** — Address P1 + P2 findings
3. **Publish as-is** — Accept current state (only if no P1s)
4. **Run `/cmo:compound`** — Document learnings from this campaign
5. **Re-run `/cmo:work`** — Regenerate specific deliverables

Based on selection:
- **Fix P1/all** -> Apply fixes using the Edit tool, re-run affected checks
- **Publish** -> Confirm with `mktg post --dry-run` then proceed
- **`/cmo:compound`** -> Call /cmo:compound with campaign context
- **Re-run work** -> Call /cmo:work for specific deliverables

## Key Principles

### Voice Is the First Filter
- If it doesn't sound like the brand, nothing else matters.
- Brand voice issues are always P1 if they're systemic.

### Review Before Publish, Always
- No content goes live without a review pass.
- Even a quick scan catches embarrassing mistakes.
- `/cmo:review` is not optional — it's the quality gate.

### Conversion Is Measurable
- Don't just check if copy "sounds good."
- Check if it has the structural elements that drive action.
- Every page needs a clear CTA. Every email needs a goal.

### Audience > Product
- Great marketing talks about the audience's problems, not the product's features.
- If content is feature-heavy, flag it.
- The audience file is your empathy guide.

## Related Commands

- `/cmo:work` — Execute the plan (previous step)
- `/cmo:compound` — Document learnings (next step)
- `/cmo:plan` — Plan a campaign (start of cycle)
- `/cmo` — Full CMO orchestration
