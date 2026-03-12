---
name: audience-research
description: >
  Build detailed buyer personas and audience profiles from research. Use when
  starting a project, when content feels unfocused, or when you need to know
  who you're selling to before writing anything. Three approaches — Community
  Mining (find where the audience lives online), Persona Build (demographics +
  psychographics + jobs-to-be-done), or Quick Profile (5 questions, instant
  persona). Uses Exa MCP for web research when available. Triggers on: who are
  my users, audience research, buyer persona, target market, who am I selling
  to, define my audience, customer profile, ideal customer. Outputs a structured
  audience profile saved to ./brand/audience.md that 8+ content skills reference.
  Dependencies: none (foundation skill). Reads: voice-profile.md, competitors.md.
  Writes: audience.md.
---

# /audience-research -- Know Who You're Talking To

Every marketing skill gets better when you know your audience. Generic copy
happens when you write for "everyone." Specific copy that converts happens
when you write for a real person with real problems.

This skill builds that audience profile. It's the foundation — 8 of 11 content
skills read `audience.md` to shape their output. Running this first makes
everything downstream sharper.

No SaaS tools needed. Systematic research plus web search.

---

## Brand Memory Integration

On every invocation, check for existing brand context.

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/voice-profile.md | Brand tone, personality | Confirms audience-voice alignment — a playful brand implies a different audience than an enterprise one |
| ./brand/competitors.md | Named competitors, their positioning | Seeds audience discovery — look at who competitors target, find underserved segments |

### Writes

| File | What it contains |
|------|-----------------|
| ./brand/audience.md | Complete audience profile with personas, pain points, watering holes (profile file, create-or-overwrite) |
| ./brand/learnings.md | Appends audience research insights and surprising findings |

### Context Loading Behavior

1. Check whether `./brand/` exists.
2. If it exists, read `voice-profile.md` and `competitors.md` if present.
3. If loaded, show the user what you found:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓ "{tone summary}"
   └── Competitors     ✓ "{N competitors found}"

   Using this to shape audience research.
   ```
4. If files are missing, proceed without them. Note at the end:
   ```
   Tip: Run /brand-voice and /competitive-intel to enrich future audience updates.
   ```

### Returning Visit Behavior

If `./brand/audience.md` already exists:
- Read it and display the current primary persona
- Ask: "You already have an audience profile. Do you want to refine it with fresh research, add a new segment, or start from scratch?"
- **Refine** — keep existing personas, run fresh web search, update with new findings
- **Add segment** — add a new persona to the existing profile
- **Start fresh** — full process below

---

## The core job

Build a complete picture of who buys this product, why they buy it, where they
hang out, and what language they use. The output is structured enough for other
skills to parse but human enough to be useful for strategy.

---

## Approach selection

Choose based on what's available:

### Quick Profile (L0 — zero context)

When no brand files exist and minimal information is provided. Ask 5 key questions:

1. **What does your product do?** (one sentence)
2. **Who currently uses it?** (or who do you want to use it?)
3. **What problem does it solve?** (the pain before, the relief after)
4. **What alternatives exist?** (what would they do without you?)
5. **What's the price point?** (free, $10/mo, $500/mo, enterprise?)

From these 5 answers, generate a working persona. It won't be perfect but it
gives every downstream skill something to work with.

### Persona Build (L1-L2 — some context)

When you have basic product info or existing brand files. Systematic persona
construction using demographics, psychographics, and jobs-to-be-done.

### Community Mining (L3-L4 — full research)

When Exa MCP or web search is available. Deep research into where the audience
lives online, what language they use, what they complain about, and what they
aspire to.

---

## The audience research process

### Step 1: Identify the transformation

Same as positioning — start with the outcome, not the product.

- What does the customer's life look like BEFORE? (the pain state)
- What does it look like AFTER? (the desired state)
- What's the gap between those two states?

The gap defines who your audience is: people stuck in the BEFORE state who want
the AFTER state but haven't found a good way to get there.

### Step 2: Build buyer personas

For each distinct audience segment (usually 1-3), build:

**Demographics** (who they are):
- Role/title, company size, industry
- Age range, income level, location
- Technical sophistication

**Psychographics** (how they think):
- Goals and aspirations
- Fears and frustrations
- Values and beliefs about this category
- How they make decisions (data-driven, social proof, gut feel)

**Jobs-to-be-done** (why they hire your product):
- Functional job: What task are they trying to accomplish?
- Emotional job: How do they want to feel?
- Social job: How do they want to be perceived?

**Language patterns** (how they talk):
- Words they use to describe their problem
- Jargon level (none, industry-standard, expert)
- Tone they respond to (casual, professional, irreverent)

### Step 3: Find watering holes

Where does this audience already gather? This is where you'll distribute content.

**Search process** (use Exa MCP when available):
1. Search for "[problem/topic] + reddit/forum/community"
2. Search for "[job title/role] + newsletter/podcast/blog"
3. Search for "[competitor name] + reviews/alternatives"
4. Look at who engages with competitor content on social platforms

**Map the landscape:**

```
──────────────────────────────────────────────────

  AUDIENCE WATERING HOLES

──────────────────────────────────────────────────

  Online Communities
  ├── r/[subreddit] — [activity level, relevance]
  ├── [Forum/Discord] — [activity level, relevance]
  └── [Facebook Group] — [activity level, relevance]

  Content They Consume
  ├── [Newsletter] — [subscriber count if known]
  ├── [Podcast] — [relevance]
  └── [Blog/Publication] — [relevance]

  Social Platforms
  ├── [Platform] — [how they use it]
  └── [Platform] — [how they use it]

  Events & Conferences
  └── [Event] — [relevance]

──────────────────────────────────────────────────
```

### Step 4: Map pain points and objections

For each persona, identify:

**Pain points** (what hurts today):
- What triggers the search for a solution?
- What's the cost of NOT solving this? (time, money, stress)
- What have they tried before that didn't work?

**Objections** (what stops them from buying):
- Price objections: "Is it worth the money?"
- Trust objections: "Will this actually work for me?"
- Effort objections: "Is this going to be hard to implement?"
- Timing objections: "Is now the right time?"
- Alternative objections: "Can I just do this myself?"

### Step 5: Identify language mines

Search for actual quotes from the audience — Reddit posts, review sites, forum
threads, social media. These are gold for copywriting.

Look for:
- How they describe their problem (use their exact words)
- Emotional language they use (frustrated, overwhelmed, stuck)
- Aspirational language (wish I could, dream of, finally)
- Comparison language (better than, unlike, switch from)

---

## Output format

Write `./brand/audience.md` with this structure:

```markdown
---
title: Audience Profile
type: audience-research
skill: audience-research
date: [ISO date]
personas: [number]
primary_persona: [name]
---

# Audience Profile — [Product/Project Name]

## Primary Persona: [Name]

**One-liner:** [Who they are and what they want in one sentence]

### Demographics
- **Role:** [title/role]
- **Company:** [size/type]
- **Technical level:** [low/medium/high]

### Psychographics
- **Goals:** [what they want]
- **Fears:** [what keeps them up at night]
- **Values:** [what they believe about this category]

### Jobs-to-be-Done
- **Functional:** [task they need done]
- **Emotional:** [how they want to feel]
- **Social:** [how they want to be perceived]

### Pain Points
1. [Pain point with emotional context]
2. [Pain point with emotional context]
3. [Pain point with emotional context]

### Objections
1. [Objection] → [How to address it]
2. [Objection] → [How to address it]

### Language Mines
> "[Actual quote or representative language]"
> "[Actual quote or representative language]"

---

## Watering Holes

[Community map from Step 3]

---

## Secondary Persona: [Name] (if applicable)

[Same structure, abbreviated]
```

---

## Progressive enhancement levels

| Level | Context Available | Output Quality |
|-------|------------------|---------------|
| L0 | Nothing — 5 questions only | Working persona, generic watering holes |
| L1 | Product info + basic brand files | Targeted persona, category-specific insights |
| L2 | + competitor data from competitors.md | Differentiated personas, competitive gaps |
| L3 | + web research via Exa MCP | Real quotes, verified watering holes, data-backed |
| L4 | + existing audience.md (refinement) | Evolved personas with historical learning |

---

## Safety rules

- Never fabricate quotes — mark web-sourced language as "representative" if paraphrased
- Never assume demographics without evidence — ask or research
- Never write audience data from one project into another project's brand/
- Always check `--cwd` context if provided — audience is project-specific
- If Exa MCP is unavailable, skip web research steps and note the limitation
