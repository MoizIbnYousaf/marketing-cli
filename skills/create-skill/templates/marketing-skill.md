# Marketing Skill Template

Copy this template when creating a new mktg skill. Replace all `{{PLACEHOLDER}}`
values with your skill's specifics.

---

```markdown
---
name: {{skill-name}}
description: >
  {{What this skill does in 1-2 sentences}}. Use when {{trigger conditions —
  be specific about when the agent should activate this}}. Outputs {{what it
  produces}}. Dependencies: {{other skills or "none"}}.
  Reads: {{brand files it reads, e.g., "positioning.md, audience.md"}}.
  Writes: {{brand files it writes, e.g., "content-calendar.md"}}.
category: {{brand | content | growth | analytics | meta}}
tier: {{foundation | growth | advanced}}
reads:
  - brand/{{file-it-reads}}.md
writes:
  - brand/{{file-it-writes}}.md
triggers:
  - {{trigger phrase 1}}
  - {{trigger phrase 2}}
  - {{trigger phrase 3}}
---


## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`,
   `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

# /{{skill-name}} — {{Skill Title}}

{{1-3 sentences explaining WHY this skill exists. What problem does it solve?
What's the insight that makes this approach better than the obvious one?}}

## Quick Start

{{Immediate actionable guidance. What should the agent do FIRST when this
skill is invoked? Keep it to 3-5 steps.}}

1. {{First action}}
2. {{Second action}}
3. {{Third action}}

## Core Process

### Step 1: {{Phase Name}}

{{Detailed instructions for this phase. Be specific — agents follow
instructions literally.}}

### Step 2: {{Phase Name}}

{{Next phase. Include decision points and branching logic if needed.}}

### Step 3: {{Phase Name}}

{{Final phase. Include output format expectations.}}

## Output Format

{{Describe exactly what the skill should produce. Include a markdown template
if the output is a document.}}

```markdown
# {{Output Title}}

## {{Section 1}}
{{What goes here}}

## {{Section 2}}
{{What goes here}}
```

## Guidelines

- {{Rule 1 — what to always do}}
- {{Rule 2 — what to never do}}
- {{Rule 3 — quality standard}}

## Success Criteria

{{Skill name}} is complete when:
- [ ] {{First measurable outcome}}
- [ ] {{Second measurable outcome}}
- [ ] {{Third measurable outcome}}
- [ ] Output saved to {{where it goes}}
```

---

## Template Notes

**Category definitions:**
- `brand` — Skills that define or extract brand identity (voice, positioning, audience)
- `content` — Skills that produce marketing content (copy, emails, SEO, social)
- `growth` — Skills that drive acquisition or retention (launch, referral, pricing)
- `analytics` — Skills that measure or analyze (audit, competitive intel, CRO)
- `meta` — Skills about the system itself (create-skill, cmo)

**Tier definitions:**
- `foundation` — Works standalone, no dependencies on other skills
- `growth` — Enhanced by foundation skill outputs (e.g., better with voice profile)
- `advanced` — Orchestrates multiple skills or requires significant brand context

**Trigger best practices:**
- Use natural language phrases the user would actually say
- Include 3-5 triggers covering different phrasings
- Include both action phrases ("write email sequence") and problem phrases
  ("my emails aren't converting")
