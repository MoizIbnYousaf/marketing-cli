---
name: cmo:plan
description: "Plan a marketing campaign, content strategy, or growth initiative. Use when the user wants to plan marketing work — campaigns, content calendars, launch sequences, channel strategies, or any marketing initiative that needs structure before execution."
argument-hint: "[campaign idea, marketing goal, or initiative description]"
metadata:
  version: 1.0.0
category: workflow
tier: orchestration
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
  - brand/competitors.md
  - marketing/learnings/
writes:
  - marketing/plans/
triggers:
  - plan campaign
  - marketing plan
  - content strategy
  - plan launch
  - campaign plan
---

# /cmo:plan — Marketing Campaign Planning

Plan marketing campaigns, content strategies, and growth initiatives into structured, actionable documents.

## Introduction

Transform marketing ideas into well-structured campaign plans. This is the starting point of the marketing workflow cycle: **plan** -> **work** -> **review** -> **compound**.

## Campaign Description

<campaign_description> #$ARGUMENTS </campaign_description>

**If the campaign description above is empty, ask the user:** "What marketing initiative would you like to plan? Describe the campaign, content strategy, or growth goal you have in mind."

Do not proceed until you have a clear description from the user.

### 0. Idea Refinement

**Check for existing marketing context first:**

Before asking questions, check what brand context exists:

```bash
mktg status --json
```

Also look for recent marketing plans or brainstorms:

```bash
ls -la marketing/plans/*.md 2>/dev/null | head -10
ls -la marketing/learnings/*.md 2>/dev/null | head -10
```

**If relevant brand context exists:**
1. Read available brand files (`brand/voice-profile.md`, `brand/positioning.md`, `brand/audience.md`, `brand/competitors.md`)
2. Announce: "Found existing brand context. Using as foundation for planning."
3. Extract and carry forward positioning, audience segments, voice guidelines, and competitive landscape
4. **Skip basic brand questions** — the brand files already answered WHO and WHY

**If no brand context found:**
1. Note the gap. Suggest running `/cmo` first to build foundation.
2. Proceed with what you have — ask targeted questions about the marketing goal.

**Run idea refinement (if needed):**

Refine the idea through collaborative dialogue using the **AskUserQuestion tool**:

- Ask questions one at a time to understand the initiative
- Prefer multiple choice questions when natural options exist
- Focus on: objective, target audience, channels, budget constraints, timeline, success metrics
- Continue until the initiative is clear OR user says "proceed"

**Skip option:** If the description is already detailed, offer:
"Your description is clear. Should I proceed with research, or would you like to refine it further?"

## Main Tasks

### 1. Marketing Research (Parallel)

Run these research tasks **in parallel** to gather context:

**Internal research:**
- Scan `marketing/learnings/` for past campaign insights that might apply
- Check `brand/` files for positioning, audience, and competitive context
- Look at `marketing/` for existing content and campaigns to build on

**External research (conditional):**
- If the campaign involves SEO: research keyword opportunities
- If the campaign involves competitors: check competitive landscape
- If the campaign involves a new channel: research channel best practices

### 2. Campaign Planning & Structure

**Title & Categorization:**

- [ ] Draft clear campaign title (e.g., `Q2 Product Launch Campaign`, `SEO Content Blitz`, `Email Nurture Sequence`)
- [ ] Determine campaign type: launch, content, growth, retention, brand-awareness
- [ ] Convert to filename: date prefix, sequence number, kebab-case, `-plan` suffix
  - Scan `marketing/plans/` for files matching today's date pattern
  - Example: `2026-03-12-001-launch-ceo-app-campaign-plan.md`

**Audience Analysis:**

- [ ] Define primary audience segment (from `brand/audience.md` or new research)
- [ ] Identify audience pain points this campaign addresses
- [ ] Map audience to channels where they're active

**Channel Strategy:**

- [ ] Select channels based on audience + objective (use ORB framework from `launch-strategy`)
  - **Owned:** Email, blog, podcast, community
  - **Rented:** Social platforms, marketplaces, app stores
  - **Borrowed:** Guest content, partnerships, influencer outreach
- [ ] Define channel-specific tactics
- [ ] Set content volume per channel

### 3. Choose Detail Level

Select how comprehensive the plan should be:

#### MINIMAL (Quick Campaign)

**Best for:** Single-channel pushes, content pieces, simple promotions

```markdown
---
title: [Campaign Title]
type: [launch|content|growth|retention|awareness]
status: active
date: YYYY-MM-DD
audience: [primary segment]
channels: [channel list]
---

# [Campaign Title]

[Brief campaign description and objective]

## Target Audience

[Who and why]

## Tactics

- [ ] Tactic 1
- [ ] Tactic 2

## Success Metrics

[How we measure success]

## Skills Needed

[Which mktg skills to invoke during /cmo:work]
```

#### STANDARD (Most Campaigns)

**Best for:** Multi-channel campaigns, content strategies, launch sequences

```markdown
---
title: [Campaign Title]
type: [launch|content|growth|retention|awareness]
status: active
date: YYYY-MM-DD
audience: [primary segment]
channels: [channel list]
duration: [timeframe]
---

# [Campaign Title]

## Objective

[What we're trying to achieve and why]

## Target Audience

[Detailed segment description, pain points, where they are]

## Channel Strategy

### Owned Channels
[Tactics for email, blog, etc.]

### Rented Channels
[Tactics for social, marketplaces, etc.]

### Borrowed Channels
[Partnerships, guest content, etc.]

## Content Plan

| Asset | Skill | Channel | Timeline |
|-------|-------|---------|----------|
| [asset] | [mktg skill] | [channel] | [when] |

## Execution Phases

### Phase 1: [Foundation]
- [ ] Tasks and deliverables

### Phase 2: [Launch/Distribution]
- [ ] Tasks and deliverables

### Phase 3: [Optimization]
- [ ] Tasks and deliverables

## Success Metrics

[KPIs and measurement methods]

## Skills Needed

[Which mktg skills to invoke during /cmo:work, in order]

## Dependencies & Risks

[What could block or complicate this]
```

#### COMPREHENSIVE (Major Initiatives)

**Best for:** Product launches, rebrand campaigns, multi-month strategies

Includes everything from STANDARD plus:
- Detailed competitive positioning
- Budget allocation across channels
- A/B testing plan
- Attribution and tracking setup
- Team/resource requirements
- Content calendar with specific dates
- Fallback strategies per channel

### 4. Plan Validation

Before writing, validate the plan:

- [ ] Every tactic maps to a measurable outcome
- [ ] Skills needed are realistic (check with `mktg list --json`)
- [ ] Timeline accounts for content creation time (not just publishing dates)
- [ ] Budget is allocated (even if $0 — document it)
- [ ] Brand voice and positioning are consistent throughout

### 5. Write Plan File

**REQUIRED: Write the plan file to disk.**

```bash
mkdir -p marketing/plans/
```

Use the Write tool to save the complete plan to `marketing/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.md`.

Confirm: "Plan written to marketing/plans/[filename]"

## Output Format

```
marketing/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.md
```

Examples:
- `marketing/plans/2026-03-12-001-launch-ceo-app-campaign-plan.md`
- `marketing/plans/2026-03-15-001-content-seo-blitz-q2-plan.md`
- `marketing/plans/2026-04-01-001-growth-referral-program-plan.md`

## Post-Generation Options

After writing the plan file, use the **AskUserQuestion tool** to present these options:

**Question:** "Plan ready at `marketing/plans/[filename]`. What would you like to do next?"

**Options:**
1. **Review and refine** — Improve the plan through self-review
2. **Start `/cmo:work`** — Begin executing this marketing plan
3. **Create GitHub Issue** — Track this campaign as an issue
4. **Adjust scope** — Change detail level or add/remove sections

Based on selection:
- **Review and refine** -> Re-read and improve the plan
- **`/cmo:work`** -> Call the /cmo:work command with the plan file path
- **Create Issue** -> `gh issue create --title "<type>: <title>" --body-file <plan_path>`
- **Adjust scope** -> Accept feedback and regenerate

## Key Principles

### Marketing Plans Are Living Documents
- Plans get checked off as `/cmo:work` executes them
- Update the plan when strategy shifts mid-campaign
- Plans reference specific mktg skills for each tactic

### Brand Context Is Your Advantage
- Always load brand files before planning
- Positioning and audience data make plans sharper
- Past learnings prevent repeated mistakes

### 30/70 Rule
- Plan 30% content creation, 70% distribution
- Most campaigns under-distribute and over-create
- Every content asset should have 3+ distribution channels mapped

### Skills Are Your Execution Layer
- Map every tactic to a specific mktg skill
- `/cmo:work` will invoke these skills in order
- If no skill exists for a tactic, note it as manual work

## Related Commands

- `/cmo:work` — Execute this plan (next step)
- `/cmo:review` — Review marketing output quality (after work)
- `/cmo:compound` — Document campaign learnings (after review)
- `/cmo` — Full CMO orchestration (routes to the right skill)
