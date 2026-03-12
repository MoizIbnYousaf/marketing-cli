---
name: cmo:compound
description: "Document marketing campaign learnings to compound knowledge over time. Use after a campaign ships, a review completes, or the user says 'what did we learn', 'document this', 'campaign retrospective', 'what worked', or any request to capture marketing insights for future use."
argument-hint: "[optional: campaign name or brief context about what to document]"
metadata:
  version: 1.0.0
category: workflow
tier: orchestration
reads:
  - marketing/plans/
  - marketing/reviews/
  - marketing/content/
  - brand/learnings.md
writes:
  - marketing/learnings/
  - brand/learnings.md
triggers:
  - what did we learn
  - campaign retrospective
  - document learnings
  - what worked
  - compound marketing
---

# /cmo:compound — Marketing Knowledge Compounding

Capture marketing campaign learnings while context is fresh. Each documented insight compounds your marketing intelligence — what worked, what didn't, and why.

## Purpose

Captures campaign insights, content performance data, and strategic learnings in `marketing/learnings/` for future reference. The first time you run a campaign type takes full research. Document the results, and the next campaign of that type takes half the effort.

**Why "compound"?** Each documented campaign compounds your marketing knowledge. First launch campaign: full research. Document what worked, and the next launch starts from proven patterns. Knowledge compounds.

This is step 4 of the marketing workflow cycle: **plan** -> **work** -> **review** -> **compound**.

## Usage

```bash
/cmo:compound                         # Document the most recent campaign
/cmo:compound [campaign name/context]  # Document specific campaign
```

## Execution Workflow

### Phase 1: Gather Context

1. **Find the campaign to document**

   If no specific campaign is mentioned, find the most recent:

   ```bash
   ls -lt marketing/plans/*.md 2>/dev/null | head -5
   ls -lt marketing/reviews/*.md 2>/dev/null | head -5
   ```

   Read:
   - The campaign plan (`marketing/plans/`)
   - The review report (`marketing/reviews/`) if it exists
   - Key content outputs (`marketing/content/`, `marketing/social/`, `marketing/email/`)

2. **Extract key data points**

   From the plan:
   - Original objective and success metrics
   - Target audience and channels used
   - Skills invoked and in what order
   - Timeline planned vs. actual

   From the review:
   - P1/P2/P3 findings and how they were resolved
   - Brand voice consistency score
   - Conversion effectiveness assessment

   From the conversation:
   - What the user said worked or didn't
   - Any pivots made during execution
   - Unexpected discoveries

### Phase 2: Analyze and Classify

Determine the learning categories:

**What Worked:**
- Which content types performed best?
- Which channels showed the most promise?
- Which skills produced the strongest output?
- What brand voice decisions resonated?

**What Didn't Work:**
- Where did the plan need adjustment?
- What content needed heavy revision?
- Which channels underperformed expectations?
- What assumptions proved wrong?

**Patterns Identified:**
- Reusable templates or structures
- Effective skill invocation sequences
- Audience insights that apply beyond this campaign
- Competitive insights worth remembering

**Process Learnings:**
- Was the plan the right level of detail?
- Did the execution order make sense?
- Were brand files sufficient or did gaps appear?
- How long did each phase actually take?

### Phase 3: Write Learning Document

```bash
mkdir -p marketing/learnings/
```

Classify the learning and write to `marketing/learnings/`:

```markdown
---
title: "[Campaign Type]: [Key Insight]"
date: YYYY-MM-DD
campaign: marketing/plans/[associated plan filename]
type: [launch|content|growth|retention|seo|email|social]
audience: [audience segment]
channels: [channels used]
tags: [relevant tags for future search]
outcome: [success|partial|failed|pivot]
---

# [Campaign Type]: [Key Insight]

## Campaign Summary

[1-2 sentence overview of what was done and why]

## What Worked

[Specific tactics, content types, or approaches that produced results]

### Evidence
[Concrete examples — content that converted, emails that got opens, copy that resonated]

## What Didn't Work

[What underperformed and why]

### Root Cause
[Why it didn't work — wrong audience, wrong channel, wrong timing, weak copy]

## Key Learnings

1. **[Learning 1]** — [Why it matters for future campaigns]
2. **[Learning 2]** — [Why it matters]
3. **[Learning 3]** — [Why it matters]

## Reusable Patterns

[Templates, structures, skill sequences, or approaches worth reusing]

```markdown
# Example: effective [content type] structure
[Template or pattern here]
```

## Brand Voice Notes

[Any voice or tone discoveries — what resonated with the audience, what fell flat]

## Recommendations for Next Time

- [ ] [Specific actionable recommendation]
- [ ] [Specific actionable recommendation]
- [ ] [Specific actionable recommendation]

## Skills Used

| Skill | Effectiveness | Notes |
|-------|--------------|-------|
| [skill name] | [high/medium/low] | [what worked or didn't] |

## Related Learnings

[Links to other learning documents that connect to this one]
```

### Phase 4: Update Brand Learnings

If the campaign surfaced insights that apply broadly (not just this campaign):

1. Read `brand/learnings.md` (create if it doesn't exist)
2. Append new cross-campaign learnings:

```markdown
## [Date] — [Learning Source]

- **Insight:** [What we learned]
- **Evidence:** [From which campaign]
- **Application:** [How to apply in future campaigns]
```

Only add learnings that are:
- Applicable across campaigns (not one-off observations)
- Specific enough to be actionable
- Backed by evidence from this campaign

### Phase 5: Summary

Present to the user:

```markdown
## Campaign Learning Documented

**File created:** marketing/learnings/[filename]
**Campaign:** [campaign name]
**Key insight:** [one-line summary]

### Learnings Captured
- [count] things that worked
- [count] things that didn't
- [count] reusable patterns
- [count] brand voice notes

### Brand Learnings Updated
[Yes/No — what was added to brand/learnings.md]
```

Use the **AskUserQuestion tool**:

**Question:** "Learning documented. What would you like to do next?"

**Options:**
1. **Plan next campaign** — Start `/cmo:plan` informed by these learnings
2. **View all learnings** — Browse `marketing/learnings/` for patterns
3. **Update brand files** — Refine voice, positioning, or audience based on insights
4. **Done** — Wrap up this workflow cycle

## The Compounding Philosophy

This creates a compounding marketing intelligence system:

1. First launch campaign -> Full research, trial and error (days)
2. Document the learnings -> `marketing/learnings/launch-what-worked.md` (minutes)
3. Next launch campaign -> `/cmo:plan` reads learnings, starts from proven patterns (hours, not days)
4. Knowledge compounds -> Each campaign gets smarter

The feedback loop:

```
Plan -> Work -> Review -> Compound -> Plan (informed) -> Work (faster) -> ...
  ^                                                                       |
  └───────────────────────────────────────────────────────────────────────┘
```

**Each marketing campaign should make subsequent campaigns easier — not harder.**

## When to Compound

- After any campaign ships (even partially)
- After a review reveals surprising findings
- When the user says "that worked" or "that bombed"
- After A/B test results come in
- After any marketing experiment, successful or not

## What NOT to Document

- Obvious things (e.g., "emails need subject lines")
- Things already in brand files (don't duplicate)
- Temporary tactical details (e.g., "posted at 2pm on Tuesday")
- Anything without evidence (gut feelings without data)

## Categories for Learning Files

Auto-detect from campaign type:
- `launch/` — Product and feature launch insights
- `content/` — Content creation and SEO learnings
- `email/` — Email marketing insights
- `social/` — Social media learnings
- `conversion/` — CRO and conversion insights
- `growth/` — Growth loop and referral learnings
- `brand/` — Brand voice and positioning discoveries

## Related Commands

- `/cmo:plan` — Plan next campaign informed by learnings (start of next cycle)
- `/cmo:work` — Execute a marketing plan
- `/cmo:review` — Review marketing output quality (previous step)
- `/cmo` — Full CMO orchestration
