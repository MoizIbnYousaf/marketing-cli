---
name: deepen-plan
description: "Enhance a marketing plan with parallel research agents for each section to add depth, best practices, and implementation details. Use when a marketing plan, launch plan, content calendar, or campaign brief exists and needs deeper research — audience insights, competitive analysis, keyword data, channel-specific best practices."
argument-hint: "[path to plan file]"
metadata:
  version: 1.0.0
category: strategy
tier: meta
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
  - brand/learnings.md
writes: []
triggers:
  - deepen plan
  - research plan
  - enhance plan
  - add depth
---

# Deepen Plan — Marketing Research Enhancement

**Note: The current year is 2026.** Use this when searching for recent marketing data and best practices.

This command takes an existing marketing plan and enhances each section with parallel research agents. Each major element gets its own dedicated research sub-agent to find:
- Audience insights and buyer psychology
- Competitive positioning and differentiation opportunities
- Keyword and SEO data for content sections
- Channel-specific best practices (email, social, landing pages)
- Conversion optimization patterns
- Real-world marketing examples and benchmarks

The result is a deeply grounded, execution-ready marketing plan with concrete tactics and data.

## Plan File

<plan_path> #$ARGUMENTS </plan_path>

**If the plan path above is empty:**
1. Check for recent plans: `ls -la marketing/` and `ls -la docs/plans/`
2. Ask the user: "Which marketing plan would you like to deepen? Please provide the path."

Do not proceed until you have a valid plan file path.

## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`, `audience.md`, `learnings.md`.
3. Use brand context to ground all research in the project's specific positioning.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

## Main Tasks

### 1. Parse and Analyze Plan Structure

Read the plan file and extract:
- [ ] Goal or objective statement
- [ ] Target audience sections
- [ ] Channel strategy (email, social, SEO, ads, etc.)
- [ ] Content deliverables (landing pages, emails, blog posts, etc.)
- [ ] Timeline or phases
- [ ] Success metrics or KPIs
- [ ] Budget or resource constraints
- [ ] Competitive context

**Create a section manifest:**
```
Section 1: [Title] — [What marketing research would strengthen this]
Section 2: [Title] — [What marketing research would strengthen this]
...
```

### 2. Discover and Apply Available Marketing Skills

**Step 1: Discover marketing skills from the mktg installation**

```bash
# Check for mktg skills
mktg list 2>/dev/null || true

# Check local skills directory
ls skills/

# Check installed skill locations
ls ~/.claude/skills/ 2>/dev/null
```

**Step 2: Match skills to plan sections**

For each section in the plan, identify which marketing skills could enhance it:

| Plan Section | Relevant Skills |
|---|---|
| Audience/personas | `audience-research`, `marketing-psychology` |
| Positioning | `positioning-angles`, `competitive-intel` |
| Content strategy | `seo-content`, `keyword-research`, `content-atomizer` |
| Email campaigns | `email-sequences`, `direct-response-copy` |
| Landing pages | `page-cro`, `direct-response-copy` |
| Launch timeline | `launch-strategy` |
| Pricing | `pricing-strategy` |
| Social media | `content-atomizer` |
| SEO | `seo-audit`, `ai-seo`, `keyword-research` |
| Lead generation | `lead-magnet`, `free-tool-strategy` |
| Retention | `churn-prevention`, `referral-program` |
| Conversion | `conversion-flow-cro`, `page-cro` |

**Step 3: Spawn a sub-agent for EVERY matched skill**

For each matched skill, spawn a separate sub-agent:

```
Task general-purpose: "You have the [skill-name] skill available at skills/[skill-name]/SKILL.md.

YOUR JOB: Use this skill to research and enhance this section of the marketing plan.

1. Read the skill: cat skills/[skill-name]/SKILL.md
2. Apply the skill's domain expertise to this content:

[relevant plan section]

3. Return concrete recommendations, examples, and data points.

Do NOT execute the full skill workflow — just use its expertise to provide research insights for the plan."
```

**Spawn ALL skill sub-agents in PARALLEL.** One sub-agent per matched skill, all running simultaneously.

### 3. Launch Per-Section Research Agents

For each major section in the plan, spawn dedicated research sub-agents:

**Audience Research Agent:**
```
Task Explore: "Research audience insights for [target audience].
Find:
- Demographics and psychographics
- Pain points and motivations
- Where they spend time online
- What content formats they prefer
- Buying behavior patterns
Return concrete, data-backed insights."
```

**Competitive Research Agent:**
```
Task Explore: "Research competitors in the [market/niche] space.
Find:
- How competitors position themselves
- Their content strategy and channels
- Pricing and packaging approaches
- Gaps and differentiation opportunities
- What's working for them (and what isn't)
Return actionable competitive intelligence."
```

**Keyword Research Agent:**
```
Task Explore: "Research keywords and search intent for [topic/product].
Find:
- High-intent keywords with reasonable competition
- Long-tail opportunities
- Content gaps in search results
- Questions people ask (PAA, forums, Reddit)
- Trending topics in this space
Return keyword clusters with intent mapping."
```

**Channel Best Practices Agent:**
```
Task Explore: "Research current best practices for [channels mentioned in plan].
Find:
- Platform-specific tactics (2025-2026)
- Optimal posting times, formats, lengths
- Algorithm changes and how to adapt
- High-performing examples in this niche
Return channel-by-channel playbook."
```

**Also use web search for current marketing data:**
Search for recent (2025-2026) benchmarks, case studies, and tactics relevant to the plan's channels and audience.

### 4. Check Brand Learnings

If `brand/learnings.md` exists, read it and check for:
- Past campaign results that inform this plan
- What has worked or failed before
- Audience preferences discovered from prior marketing
- Channel performance data

Incorporate relevant learnings into the research synthesis.

### 5. Synthesize All Research

**Collect outputs from ALL sources:**

1. **Skill-based sub-agents** — Domain expertise from matched marketing skills
2. **Audience research** — Demographics, psychographics, behavior data
3. **Competitive research** — Positioning gaps, differentiation opportunities
4. **Keyword research** — SEO data, content gaps, search intent
5. **Channel research** — Platform-specific best practices
6. **Brand learnings** — Historical performance data

**For each agent's findings, extract:**
- [ ] Concrete recommendations (actionable tactics)
- [ ] Data points and benchmarks (numbers to target)
- [ ] Examples and templates (copy-paste ready)
- [ ] Anti-patterns to avoid (common mistakes)
- [ ] Channel-specific optimizations
- [ ] Audience insights that affect messaging

**Deduplicate and prioritize:**
- Merge similar recommendations from multiple agents
- Prioritize by expected impact on plan goals
- Flag conflicting advice for human review
- Group by plan section

### 6. Enhance Plan Sections

**Enhancement format for each section:**

```markdown
## [Original Section Title]

[Original content preserved]

### Research Insights

**Audience Data:**
- [Insight backed by research]
- [Behavioral pattern discovered]

**Competitive Landscape:**
- [Gap or opportunity identified]
- [Differentiation angle]

**Best Practices:**
- [Concrete tactic with supporting data]
- [Platform-specific optimization]

**Recommended Tactics:**
- [Specific action item with expected outcome]
- [Template or example to follow]

**Benchmarks:**
- [Industry metric to target]
- [Realistic KPI based on research]

**References:**
- [Source 1]
- [Source 2]
```

### 7. Add Enhancement Summary

At the top of the plan, add:

```markdown
## Enhancement Summary

**Deepened on:** [Date]
**Sections enhanced:** [Count]
**Research agents used:** [List]

### Key Improvements
1. [Major improvement 1]
2. [Major improvement 2]
3. [Major improvement 3]

### New Opportunities Discovered
- [Finding 1]
- [Finding 2]
```

### 8. Update Plan File

Write the enhanced plan:
- Preserve original filename
- Add `-deepened` suffix if user prefers a new file
- Update any timestamps or metadata

## Output Format

Update the plan file in place (or create a `-deepened` variant if requested).

## Quality Checks

Before finalizing:
- [ ] All original content preserved
- [ ] Research insights clearly marked and attributed
- [ ] Recommendations are specific and actionable (not generic advice)
- [ ] Data points include sources where possible
- [ ] No contradictions between sections
- [ ] Enhancement summary accurately reflects changes
- [ ] Brand context applied consistently (if available)

## Post-Enhancement Options

After writing the enhanced plan, ask:

**Question:** "Plan deepened at `[plan_path]`. What would you like to do next?"

**Options:**
1. **View diff** — Show what was added/changed
2. **Review document** — Run `/document-review` on the enhanced plan
3. **Start executing** — Begin implementing the marketing plan
4. **Deepen further** — Run another round of research on specific sections
5. **Revert** — Restore original plan

## mktg CLI Integration

Where relevant, reference these `mktg` commands in recommendations:
- `mktg audit` — Run marketing analysis on the project
- `mktg content` — Generate specific content types from the plan
- `mktg social` — Generate social content
- `mktg email` — Generate email sequences
- `mktg calendar` — Create a 30-day content calendar from the plan
- `mktg launch` — Execute the full launch package

NEVER CODE! Just research and enhance the marketing plan.
