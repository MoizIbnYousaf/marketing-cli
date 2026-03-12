# Workflow: Plan a Product Launch

<objective>
Build a complete, phased launch plan for any product — from internal validation through full public launch. Produces a timeline, channel strategy, asset checklist, and success metrics tailored to the specific product and audience.
</objective>

<required_reading>
**Read these reference files NOW:**
1. references/launch-timeline.md — Master timeline across all five phases
2. references/launch-checklist.md — Exhaustive checklists by phase and channel
</required_reading>

<process>
## Step 1: Gather Launch Context

Collect these inputs before planning. Check `brand/` directory for existing files first.

**Required inputs:**
- What is being launched? (new product, feature, version, pivot)
- Who is the target audience? (load `brand/audience.md` if exists)
- What channels does the founder already own? (email list size, social followers, community)
- What is the timeline? (ideal launch date, or "as soon as possible")
- Has anything been launched before? (prior experience level)
- Is Product Hunt part of the strategy? (yes/no)

**Optional inputs (load from brand/ if available):**
- `brand/voice-profile.md` — For consistent messaging across all launch assets
- `brand/positioning.md` — For validated value proposition
- `brand/audience.md` — For audience segmentation

If critical files are missing, note which skills should run first:
- No voice profile → run `/brand-voice` first
- No positioning → run `/positioning-angles` first
- No audience research → run `/audience-research` first

## Step 2: Assess Current State

Map the founder's current assets to launch readiness:

```
Distribution:
- Email list: [size] subscribers
- Twitter/X: [count] followers
- LinkedIn: [count] connections
- Other channels: [list]

Content:
- Published pieces: [count]
- SEO rankings: [any existing rankings?]

Social Proof:
- Testimonials: [count]
- Case studies: [count]
- Beta users: [count]

Product:
- Stage: [idea / prototype / alpha / beta / production]
- Onboarding: [exists? tested?]
- Pricing: [defined? page built?]
```

## Step 3: Select Timeline Template

Based on context, choose the right timeline:

**90-Day Full Launch** — Choose when:
- New product with no existing audience
- Founder wants maximum impact
- Product Hunt is a priority

**30-Day Sprint** — Choose when:
- Existing audience (500+ email subscribers)
- Product already validated with users
- Time-sensitive opportunity

**14-Day Blitz** — Choose when:
- Large existing audience (5000+ email or social)
- Product is ready and tested
- Competitive pressure requires speed

**Continuous Launch** — Choose when:
- SaaS product shipping features regularly
- Existing user base to announce to
- Focus is on feature adoption, not awareness

## Step 4: Build the Phase Plan

For each phase in the selected timeline, create:

```markdown
## Phase [N]: [Name] (Days [X] to [Y])

**Goal:** [One sentence]

**Key Activities:**
1. [Activity] — Owner: [who] — Due: [date]
2. [Activity] — Owner: [who] — Due: [date]
...

**Deliverables:**
- [ ] [Concrete output]
- [ ] [Concrete output]

**Phase Gate (must be true to proceed):**
- [ ] [Metric or condition]
- [ ] [Metric or condition]
```

## Step 5: Define Channel Strategy

For each owned, rented, and borrowed channel:

**Owned channels** (you control these — invest the most):
- Email: Welcome sequence, launch blast, post-launch nurture
- Blog/SEO: Long-form content, comparison pages, tutorials
- Community: Discord/Slack if applicable

**Rented channels** (you have presence, platform controls reach):
- Twitter/X: Thread strategy, daily engagement
- LinkedIn: Personal narrative posts
- Product Hunt: Listing, community engagement
- Reddit: Only if already an active member

**Borrowed channels** (someone else's audience):
- Guest posts on relevant blogs
- Podcast appearances
- Newsletter sponsorships or features
- Partner cross-promotions

For each channel, specify:
- Content format and cadence
- Key messages (adapted to platform voice)
- Success metric
- Owner

## Step 6: Create Asset List

Generate a complete list of assets needed, organized by phase:

For each asset:
```
- [Asset name]
  - Format: [email / social post / landing page / etc.]
  - Due: [date]
  - Skill to generate: [/direct-response-copy, /email-sequences, /seo-content, etc.]
  - Dependencies: [what must exist first]
```

## Step 7: Define Success Metrics

Set metrics for three timeframes:

**Launch Day (Day 0):**
- Signups: [target]
- Product Hunt ranking: [target if applicable]
- Social shares: [target]

**First Week (Days +1-7):**
- Total signups: [target]
- Activation rate: [target %]
- Email open rate: [target %]

**First Month (Days +1-30):**
- Total users: [target]
- Retention (week 2): [target %]
- Revenue (if applicable): [target]
- Content pieces published: [target]
- Backlinks earned: [target]

## Step 8: Save the Plan

Save the complete launch plan to `marketing/launch/plan.md` with this structure:

```markdown
---
product: [name]
launch_date: [YYYY-MM-DD]
timeline: [90-day / 30-day / 14-day / continuous]
created: [YYYY-MM-DD]
---

# Launch Plan: [Product Name]

## Overview
[2-3 sentence summary of launch strategy]

## Timeline
[Phase-by-phase plan from Step 4]

## Channel Strategy
[From Step 5]

## Asset Checklist
[From Step 6]

## Success Metrics
[From Step 7]

## Launch Readiness Score
[Score card from launch-checklist.md reference]
```

Also save the checklist to `marketing/launch/checklist.md` — pull the relevant items from references/launch-checklist.md based on the selected channels and timeline.
</process>

<anti_patterns>
## What NOT To Do

- **Don't launch without distribution.** If email list is 0 and social following is 0, the priority is audience building, not launch planning. Redirect to `/audience-research` and `/email-sequences` first.
- **Don't plan every channel.** Pick 2-3 channels max for launch, do them well. Trying to launch on Twitter, LinkedIn, Product Hunt, Reddit, HackerNews, and 5 communities simultaneously means doing all of them poorly.
- **Don't skip phase gates.** Each phase has exit criteria. Moving to the next phase without meeting them compounds problems.
- **Don't write launch copy without voice profile.** Generic launch copy converts 2-5x worse than voiced copy. Run `/brand-voice` first if `brand/voice-profile.md` doesn't exist.
- **Don't set vanity metrics.** "Go viral" is not a success metric. "200 signups from Product Hunt" is.
</anti_patterns>

<success_criteria>
- Complete launch plan saved to `marketing/launch/plan.md`
- Checklist saved to `marketing/launch/checklist.md`
- Every phase has concrete deliverables with dates and owners
- Channel strategy covers owned + rented + borrowed
- Asset list maps each asset to the skill that generates it
- Success metrics are specific numbers, not vague goals
- Plan accounts for the founder's actual distribution (not assumed)
</success_criteria>
