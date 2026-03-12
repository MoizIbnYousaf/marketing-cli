---
name: brainstorm
description: "Collaborative marketing brainstorming before planning or execution. Use when exploring campaign concepts, content strategy, channel selection, audience targeting, positioning alternatives, or any marketing decision with multiple valid approaches. Guides structured exploration of WHAT to market and WHY before diving into HOW. Triggers on: let's brainstorm, help me think through, what should we market, explore approaches, how should we position, what campaign, which channels, or when a marketing request has multiple valid interpretations."
category: strategy
tier: foundation
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/positioning.md
  - brand/learnings.md
writes:
  - marketing/brainstorms/
triggers:
  - let's brainstorm
  - help me think through
  - what should we market
  - explore approaches
  - which channels
  - what campaign
  - how should we position this
---


## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`, `audience.md`, `learnings.md`.
3. Apply any loaded brand context to ground brainstorming in real constraints.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

# Marketing Brainstorm

Brainstorming answers **WHAT** to market and **WHY** before diving into **HOW**. It precedes execution skills like `/launch-strategy`, `/direct-response-copy`, or `/content-atomizer`.

## When to Use This Skill

Brainstorming is valuable when:
- Campaign direction is unclear or has multiple valid angles
- Content strategy needs exploration before committing
- Channel selection involves trade-offs (budget, audience reach, effort)
- Audience targeting has multiple viable segments
- Positioning hasn't been decided or needs revisiting
- The user says something vague like "we need to market this" or "what should we do for launch"

Brainstorming can be skipped when:
- The user has specific, detailed marketing requirements
- A positioning angle is already chosen and documented
- The task is executing a well-defined content brief
- Brand context is loaded and the ask is narrow

## Core Process

### Phase 0: Assess Clarity

Before diving in, evaluate whether brainstorming is needed.

**Clear requirements — skip brainstorming:**
- User specified the campaign type, channel, and audience
- User referenced an existing positioning angle or brand doc
- User described exact deliverables needed
- Scope is constrained (e.g., "write 3 tweets about feature X")

**Brainstorming needed:**
- User used vague terms ("promote this", "get more users", "do some marketing")
- Multiple channels, audiences, or angles could work
- Trade-offs haven't been discussed
- User seems unsure about direction

If requirements are clear, suggest: "Your marketing brief seems specific enough to proceed directly. Should I run the relevant execution skill instead?"

### Phase 1: Understand the Marketing Challenge

Ask questions **one at a time** to understand the user's intent. Don't overwhelm.

**Question Techniques:**

1. **Prefer multiple choice when natural options exist**
   - Good: "What's the primary goal? (a) drive signups, (b) build awareness, (c) convert free to paid, (d) re-engage churned users"
   - Avoid: "What are your marketing goals?"

2. **Start broad, then narrow**
   - First: What are you marketing? What's the goal?
   - Then: Who's the audience? What channels are available?
   - Finally: What constraints exist (budget, timeline, tools)?

3. **Validate assumptions explicitly**
   - "I'm assuming your primary audience is developers. Is that right?"

4. **Ask about success metrics early**
   - "What does a successful campaign look like? Signups? Revenue? Awareness?"

**Key Topics to Explore:**

| Topic | Example Questions |
|-------|-------------------|
| Goal | What's the primary objective? Signups, revenue, awareness, retention? |
| Product | What are you marketing? What makes it different? |
| Audience | Who's the ideal customer? What do they care about? |
| Channels | Where does your audience spend time? What channels do you have access to? |
| Constraints | Budget? Timeline? Team bandwidth? Available tools? |
| Competition | Who else targets this audience? How do they position? |
| Context | Any existing brand assets, past campaigns, or learnings to build on? |

**Exit Condition:** Continue until the challenge is clear OR user says "proceed" or "let's move on."

### Phase 2: Explore Marketing Approaches

After understanding the challenge, propose **2-3 concrete approaches**. Each should be a distinct strategic direction, not minor variations.

**Structure for Each Approach:**

```markdown
### Approach A: [Name]

[2-3 sentence description of the strategic direction]

**Core angle:** [The positioning hook or key message]

**Channels:** [Primary channels this approach uses]

**Audience fit:** [Why this resonates with the target audience]

**Pros:**
- [Benefit 1]
- [Benefit 2]

**Cons:**
- [Drawback 1]
- [Drawback 2]

**Best when:** [Circumstances where this approach wins]
```

**Approach Categories to Consider:**

| Category | Options to Explore |
|----------|-------------------|
| Campaign type | Launch, evergreen, seasonal, event-driven, partnership |
| Content strategy | SEO-led, social-first, email nurture, community, paid |
| Positioning angle | Problem-solution, aspirational, contrarian, comparison, storytelling |
| Channel mix | Organic social, paid ads, email, content marketing, partnerships, communities |
| Audience segment | Early adopters, enterprise, prosumers, specific vertical |

**Guidelines:**
- Lead with a recommendation and explain why
- Be honest about trade-offs (budget, effort, timeline, risk)
- Consider what's realistic given the user's constraints
- Reference brand context when available
- Apply YAGNI — don't propose a 12-channel strategy when 2 channels would work

### Phase 3: Capture the Marketing Brief

Summarize key decisions in a structured format.

**Marketing Brief Structure:**

```markdown
---
date: YYYY-MM-DD
topic: <kebab-case-topic>
type: marketing-brainstorm
---

# Marketing Brainstorm: <Topic>

## The Challenge
[What we're trying to achieve — 1-2 paragraphs max]

## Target Audience
[Who we're reaching and what they care about]

## Chosen Approach
[Brief description of the selected direction and why]

## Key Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

## Channel Strategy
- **Primary:** [Main channel(s)]
- **Supporting:** [Secondary channel(s)]

## Success Metrics
- [Metric 1]: [Target]
- [Metric 2]: [Target]

## Open Questions
- [Any unresolved questions before execution]

## Next Steps
- [Specific skill or action to take next]
```

**Output Location:** `marketing/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`

Ensure the `marketing/brainstorms/` directory exists before writing.

**IMPORTANT:** Before proceeding to Phase 4, check if there are Open Questions. If there are, ask the user about each one before offering to proceed. Move resolved questions to a "Resolved Questions" section.

### Phase 4: Handoff

Present clear options for what to do next:

1. **Refine further** — Continue exploring the strategy
2. **Proceed to execution** — Run the appropriate skill (`/launch-strategy`, `/direct-response-copy`, `/seo-content`, `/email-sequences`, etc.)
3. **Done for now** — Return later

## Marketing-Specific Brainstorm Patterns

### Campaign Concept Exploration

When brainstorming campaigns:
- Start with the **one thing** the audience should remember
- Explore emotional vs. rational appeals
- Consider the buyer's journey stage (awareness, consideration, decision)
- Test the concept against: "Would I stop scrolling for this?"

### Content Strategy Exploration

When brainstorming content:
- Map content to funnel stages (TOFU, MOFU, BOFU)
- Consider content-channel fit (long-form for SEO, short-form for social)
- Explore content pillars — 3-5 recurring themes
- Ask: "What can we say that competitors can't?"

### Channel Selection Trade-offs

When brainstorming channels:

| Factor | Questions |
|--------|-----------|
| Audience | Where does the target audience actually spend time? |
| Budget | Paid vs. organic? What's the cost per acquisition ceiling? |
| Timeline | Need results in days (paid) or months (SEO/content)? |
| Bandwidth | Who creates and manages? Agent-automatable or human-required? |
| Compounding | Does effort compound over time (SEO, email list) or reset (ads)? |

### Audience Targeting

When brainstorming audiences:
- Start with the **best customer you already have** and find more like them
- Explore segments by: pain point, job title, company size, behavior
- Consider: who has the budget AND the urgency?
- Test with: "Can we reach 1,000 of these people affordably?"

### Positioning Alternatives

When brainstorming positioning:
- Map the competitive landscape — what positions are taken?
- Explore: category leader, challenger, niche specialist, new category
- Test each angle: is it true, relevant, and differentiated?
- Reference `brand/positioning.md` if it exists

## YAGNI Principles for Marketing

During brainstorming, actively resist complexity:

- **Don't plan a 12-channel strategy** when 2 focused channels would deliver results
- **Choose the simplest campaign** that achieves the stated goal
- **Prefer proven tactics** over trendy ones
- **Ask "Do we really need this?"** when scope creeps
- **Start with one audience segment** before trying to reach everyone
- **Defer channel expansion** until the first channel is working

## Incremental Validation

Keep sections short — 200-300 words max. After each section, pause to validate:

- "Does this match what you had in mind?"
- "Any adjustments before we continue?"
- "Is this the direction you want to go?"

This prevents wasted effort on misaligned strategies.

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Asking 5 questions at once | Ask one at a time |
| Jumping to tactics immediately | Start with strategy and goals |
| Proposing a 20-piece content calendar | Start with 3-5 pieces that prove the concept |
| Ignoring existing brand context | Read brand/ files first |
| Assuming the audience without asking | Validate assumptions explicitly |
| Over-engineering the funnel | Start with one clear CTA |
| Skipping success metrics | Define what "working" looks like early |

## Integration with Other Skills

Brainstorming answers **WHAT** and **WHY**:
- Marketing challenge and goal
- Target audience and positioning
- Chosen approach and channel strategy
- Success metrics

Execution skills answer **HOW**:
- `/launch-strategy` — Full launch package
- `/direct-response-copy` — Landing pages and sales copy
- `/seo-content` — SEO-optimized content
- `/email-sequences` — Email campaigns
- `/content-atomizer` — Multi-platform content
- `/positioning-angles` — Deep positioning work
- `/audience-research` — Detailed persona building

When a brainstorm document exists, execution skills should detect it and use it as input, skipping their own discovery phase.
