---
name: competitive-intel
description: >
  Research and analyze competitors to find positioning gaps and strategic
  opportunities. Use when entering a market, when positioning feels weak, or
  when you need to understand the competitive landscape before creating content.
  Three modes — Quick Scan (identify top competitors fast), Deep Teardown
  (full messaging + strategy analysis), or Gap Finder (find what nobody else
  is doing). Uses Exa MCP for competitor research when available. Triggers on:
  competitive analysis, who are my competitors, competitor research, what are
  my competitors doing, competitive landscape, who am I competing with, market
  analysis, competitor teardown. Outputs a structured competitor profile saved
  to ./brand/competitors.md. Dependencies: none (foundation skill). Reads:
  voice-profile.md, audience.md. Writes: competitors.md.
---

# /competitive-intel -- Know What You're Up Against

You can't differentiate if you don't know what you're differentiating FROM.
Most founders either ignore competitors entirely ("we have no competition") or
obsess over features without understanding messaging.

This skill maps the competitive landscape at the messaging level. Not feature
comparison tables — positioning, angles, language, channels, and gaps. The
output feeds directly into positioning-angles and keyword-research to find
white space.

No SaaS tools needed. Systematic web research.

---

## Brand Memory Integration

On every invocation, check for existing brand context.

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/voice-profile.md | Brand positioning, tone | Frames competitive analysis — compare against your own positioning to find differentiation |
| ./brand/audience.md | Target personas, pain points | Focuses research on competitors targeting the same audience |

### Writes

| File | What it contains |
|------|-----------------|
| ./brand/competitors.md | Complete competitive landscape with teardowns and gaps (profile file, create-or-overwrite) |
| ./brand/learnings.md | Appends competitive insights and strategic observations |

### Context Loading Behavior

1. Check whether `./brand/` exists.
2. If it exists, read `voice-profile.md` and `audience.md` if present.
3. If loaded, show the user what you found:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓ "{positioning summary}"
   └── Audience        ✓ "{primary persona summary}"

   Using this to focus competitive research.
   ```
4. If files are missing, proceed without them. Note at the end:
   ```
   Tip: Run /brand-voice and /audience-research to enrich future competitive analysis.
   ```

### Returning Visit Behavior

If `./brand/competitors.md` already exists:
- Read it and display the known competitors
- Ask: "You already have competitive intel. Do you want to update with fresh research, add new competitors, or start from scratch?"
- **Update** — keep existing competitors, search for new data, refresh findings
- **Add** — add new competitors to the existing analysis
- **Start fresh** — full process below

---

## The core job

Map who you're competing against, how they position themselves, where they're
strong, where they're weak, and where the gaps are. The output is a strategic
asset that positioning-angles and keyword-research build on.

---

## Mode selection

### Quick Scan (5 minutes)

When you just need to know who the competitors are. Identify 5-8 competitors,
capture their headline positioning, and note obvious gaps. Good for early
exploration.

### Deep Teardown (15-20 minutes)

Full analysis of 3-5 key competitors. Messaging, pricing, channels, content
strategy, SEO footprint. Use when preparing for positioning or launch.

### Gap Finder (10 minutes)

Start from the teardown data and focus exclusively on finding underexploited
territory. Use after a Deep Teardown or when competitors.md already exists.

---

## The competitive research process

### Step 1: Identify competitors

Three categories:

**Direct competitors** — solve the same problem for the same audience
- Same product category, same target market
- The ones your customers would name if asked "what else did you consider?"

**Indirect competitors** — solve the same problem differently
- Different approach, same outcome
- Includes DIY, hiring a person, using a different category of tool

**Aspirational competitors** — where you want to be
- Larger companies in adjacent spaces
- Brands whose positioning or execution you admire
- Not necessarily competitive, but instructive

**How to find them:**
1. Ask the user: "Who do you consider your top 3 competitors?"
2. If Exa MCP available: search for "[product category] + [target market]"
3. Search for "[product type] alternatives" and "[product type] vs"
4. Check Product Hunt, G2, Capterra for the product category
5. Look at who ranks for the target keywords

### Step 2: Competitor teardown framework

For each key competitor (3-5), analyze:

**Positioning & Messaging:**
- Homepage headline — what's the primary claim?
- Tagline — how do they summarize their value?
- Hero copy — what transformation do they promise?
- Key differentiator — what makes them "the one that [X]"?

**Pricing & Packaging:**
- Pricing model (free, freemium, subscription, one-time)
- Price points and tier names
- What gates the upgrade? (features, usage, support)

**Content & Channels:**
- Blog: topics, frequency, quality, SEO focus
- Social: which platforms, posting frequency, engagement level
- Email: do they have a newsletter? lead magnets?
- Video: YouTube presence, production quality

**SEO Footprint:**
- What keywords do they appear to target?
- Do they have programmatic SEO pages?
- How strong is their content operation?

**Strengths & Weaknesses:**
- What do they do exceptionally well?
- Where are the obvious gaps in their approach?
- What do their users complain about? (check reviews, Reddit, Twitter)

### Step 3: Build the competitive landscape map

```
──────────────────────────────────────────────────

  COMPETITIVE LANDSCAPE

──────────────────────────────────────────────────

  Direct Competitors
  ├── [Competitor 1]
  │   ├── Positioning: "[their headline]"
  │   ├── Strength: [what they do well]
  │   └── Weakness: [where they fall short]
  ├── [Competitor 2]
  │   ├── Positioning: "[their headline]"
  │   ├── Strength: [what they do well]
  │   └── Weakness: [where they fall short]
  └── [Competitor 3]
      ├── Positioning: "[their headline]"
      ├── Strength: [what they do well]
      └── Weakness: [where they fall short]

  Indirect Competitors
  ├── [Alternative 1] — [how they solve it differently]
  └── [Alternative 2] — [how they solve it differently]

──────────────────────────────────────────────────
```

### Step 4: Find the gaps

This is the payoff. Cross-reference all competitor messaging to find:

**Messaging gaps** — what nobody is saying:
- Claims that are true for your product but no competitor makes
- Audiences that nobody specifically targets
- Pain points that nobody directly addresses
- Angles that are conspicuously absent

**Positioning gaps** — where nobody lives:
- Map competitors on 2x2 matrices (e.g., simple↔complex × cheap↔expensive)
- Find the quadrant with no competitor
- Identify the "anti-positioning" — what would be the opposite of every competitor?

**Channel gaps** — where nobody shows up:
- Platforms where the audience exists but competitors don't post
- Content formats nobody uses (video, podcast, interactive tools)
- Communities nobody engages with

**Pricing gaps** — where nobody charges:
- Price points between existing tiers
- Packaging models nobody offers (lifetime, usage-based, free tier)

### Step 5: Synthesize differentiation opportunities

Rank the gaps by:
1. **Relevance** — does this gap matter to our audience?
2. **Defensibility** — can we own this position long-term?
3. **Clarity** — can we explain this in one sentence?

Present top 3-5 differentiation opportunities with a starred recommendation.

---

## Output format

Write `./brand/competitors.md` with this structure:

```markdown
---
title: Competitive Intelligence
type: competitive-intel
skill: competitive-intel
date: [ISO date]
competitors_analyzed: [number]
primary_gap: [one-line summary of biggest opportunity]
---

# Competitive Intelligence — [Product/Project Name]

## Competitor Teardowns

### [Competitor 1 Name]
- **URL:** [url]
- **Positioning:** "[their headline/tagline]"
- **Pricing:** [model and price points]
- **Strengths:** [what they do well]
- **Weaknesses:** [where they fall short]
- **Content:** [channels and quality]
- **Threat level:** [low/medium/high]

### [Competitor 2 Name]
[Same structure]

---

## Competitive Landscape

### Saturated Claims (everyone says this)
- "[Claim]"
- "[Claim]"

### Partially Claimed (1-2 competitors)
- "[Claim]" — used by [Competitor]

### Underexploited Territory
- [Gap 1]
- [Gap 2]
- [Gap 3]

---

## Differentiation Opportunities

1. ★ **[Top opportunity]** — [why this is the best gap to own]
2. **[Second opportunity]** — [reasoning]
3. **[Third opportunity]** — [reasoning]

---

## 2x2 Positioning Map

[Simple/Complex] × [Affordable/Premium]

| | Simple | Complex |
|---|---|---|
| **Premium** | [Competitor] | [Competitor] |
| **Affordable** | ★ **Gap** | [Competitor] |
```

---

## Progressive enhancement levels

| Level | Context Available | Output Quality |
|-------|------------------|---------------|
| L0 | Product name only | Basic competitor list, surface-level analysis |
| L1 | + product description, target market | Focused competitor search, relevant comparisons |
| L2 | + audience.md, voice-profile.md | Audience-aware analysis, positioning-aware gaps |
| L3 | + web research via Exa MCP | Live data, real messaging, verified claims |
| L4 | + existing competitors.md (update) | Evolved intel with trend tracking over time |

---

## Safety rules

- Never fabricate competitor data — if you can't verify a claim, say so
- Never present assumptions as facts — mark unverified information clearly
- Never copy competitor content verbatim beyond short quotes for analysis
- Never write competitive data from one project into another project's brand/
- Always check `--cwd` context if provided — competitors are project-specific
- If Exa MCP is unavailable, skip live research steps and note the limitation
- Focus on messaging and positioning, not feature-by-feature comparisons
