---
name: brainstorm
description: |
  Structured marketing brainstorming when direction is unclear. Use when the agent doesn't know which skill to run, the user's request has multiple valid interpretations, or campaign/content/channel strategy needs exploration before execution. Produces a structured marketing brief that feeds back into /cmo for skill routing.
allowed-tools: []
---

# /brainstorm — Marketing Brainstorm

Structured exploration when marketing direction is unclear. You produce a brief that tells /cmo where to route next.

For brand memory protocol, see /cmo [rules/brand-memory.md](../cmo/rules/brand-memory.md).

## On Activation

1. Read `brand/` files if they exist (voice-profile.md, audience.md, positioning.md, learnings.md). They enhance but never gate.
2. Assess the user's request clarity level.

## Phase 0: Assess Clarity

Gate check. If the request is already specific, skip brainstorming:

| Signal | Action |
|--------|--------|
| "Write a landing page for X" | Skip. Route to `direct-response-copy`. |
| "Do SEO for my blog" | Skip. Route to `keyword-research`. |
| "I want to market my app" | Proceed. Multiple valid paths. |
| "What should I do next?" | Proceed. No clear direction. |
| "Help me think through our launch" | Proceed. Needs exploration. |

If skipping: "Your request is specific enough to execute directly. Routing to `/<skill>` instead of brainstorming."

## Phase 1: Understand the Challenge

Ask ONE question at a time. Prefer multiple choice when natural options exist.

**Questions to cover (in order, stop when clear):**

1. **Goal** — What are you trying to achieve? (awareness / leads / revenue / retention / launch)
2. **Product** — What are you marketing? (Brief description if not obvious from project context)
3. **Audience** — Who buys this? (If `brand/audience.md` exists, confirm or refine)
4. **Channels** — Where does your audience hang out? (search / social / email / communities / paid)
5. **Constraints** — Budget, timeline, team size, tools available?
6. **Competition** — Who else does this? What makes you different?

Stop as soon as you have enough to propose approaches. 3-4 questions is usually enough.

## Phase 2: Explore Approaches

Present 2-3 concrete strategic directions. For each:

```
### Approach [N]: [Name]

**Core angle:** [One sentence positioning]
**Channels:** [Primary → Secondary]
**Audience fit:** [Why this resonates with the target]
**Timeline:** [Quick win vs. long play]
**Pros:** [2-3 bullet points]
**Cons:** [1-2 bullet points]
**Best when:** [Conditions that make this the right choice]
```

Ask the user to pick one, combine elements, or explore further.

## Phase 3: Capture Marketing Brief

Write a structured brief to `marketing/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`:

```markdown
---
type: marketing-brainstorm
date: YYYY-MM-DD
topic: [kebab-case topic]
goal: [awareness|leads|revenue|retention|launch]
chosen-approach: [N]
---

# Marketing Brief: [Topic]

## Context
[What we're marketing and why now]

## Chosen Approach
[Selected direction with rationale]

## Target Audience
[Who we're reaching]

## Channels
[Primary and secondary channels]

## Key Messages
[3-5 core messages]

## Constraints
[Budget, timeline, tools]

## Success Metrics
[How we'll measure impact]

## Structured Handoff
next-skill: [skill-name]
confidence: [high|medium|low]
context-summary: "[One line summary for /cmo routing]"
```

The `next-skill` field is critical — it tells /cmo where to route after brainstorming.

## Phase 4: Route Back to /cmo

After writing the brief:

"The brainstorm is complete. Brief saved to `marketing/brainstorms/[filename]`. Run `/cmo` to execute the next step (`/[next-skill]`), or invoke `/<next-skill>` directly."

Do not list all 27 skills. Recommend the ONE next skill based on the brief.

## Anti-Patterns

| Anti-pattern | Instead |
|-------------|---------|
| Asking 5+ questions at once | One question at a time, multiple choice |
| Jumping straight to tactics | Explore the strategic direction first |
| Proposing 5+ approaches | 2-3 focused options, not a menu |
| Generic advice ("build an audience") | Specific to their product and context |
| Brainstorming when direction is clear | Skip to the execution skill |
| Leaving the user without a next step | Always include `next-skill` in the brief |

## YAGNI Principles

- Resist adding channels you can't actually execute on
- One campaign well-executed beats three half-started
- If the user has no audience data, start with `audience-research`, not guessing
- Don't brainstorm pricing, launches, or SEO strategy — those have dedicated skills
- The brief is a compass, not a bible. It should fit on one page.
