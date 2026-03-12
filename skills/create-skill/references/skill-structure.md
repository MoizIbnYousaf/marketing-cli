# Skill Structure Reference

This document defines the format and conventions for mktg marketing skills.

## Directory Layout

Every skill lives in `skills/{skill-name}/` with at minimum a `SKILL.md` file:

```
skills/{skill-name}/
├── SKILL.md              # Entry point (required)
├── workflows/            # Step-by-step procedures (optional)
│   └── {workflow}.md
├── references/           # Domain knowledge (optional)
│   └── {reference}.md
└── templates/            # Output structures (optional)
    └── {template}.md
```

**Rules:**
- Directory name must match the `name` field in frontmatter
- Use lowercase-with-hyphens for all names
- Keep SKILL.md under 500 lines
- Keep supporting files one level deep from SKILL.md
- Use forward slashes in all file paths

## Frontmatter Format

### Standard Claude Code Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Lowercase letters, numbers, hyphens. Max 64 chars. Defaults to directory name. |
| `description` | Yes | What it does AND when to use it. Max 1024 chars. |
| `argument-hint` | No | Hint for autocomplete, e.g., `[url]` |
| `disable-model-invocation` | No | `true` to prevent auto-loading. For side-effect skills. |
| `user-invocable` | No | `false` to hide from `/` menu. For background knowledge. |
| `allowed-tools` | No | Tools without permission prompts. |
| `model` | No | `haiku`, `sonnet`, or `opus` |
| `context` | No | `fork` for isolated subagent execution |
| `agent` | No | Subagent type when using `context: fork` |

### mktg Extension Fields

| Field | Required | Description |
|-------|----------|-------------|
| `category` | Yes | `brand`, `content`, `growth`, `analytics`, or `meta` |
| `tier` | Yes | `foundation`, `growth`, or `advanced` |
| `reads` | No | List of `brand/` files this skill reads |
| `writes` | No | List of `brand/` files this skill writes |
| `triggers` | Yes | Natural language phrases that should activate this skill |

### Category Definitions

- **brand** — Define or extract brand identity (voice, positioning, audience)
- **content** — Produce marketing content (copy, emails, SEO, social posts)
- **growth** — Drive acquisition or retention (launch, referral, pricing, lead magnets)
- **analytics** — Measure or analyze (audit, competitive intel, CRO)
- **meta** — Skills about the system itself (create-skill, cmo)

### Tier Definitions

- **foundation** — Works standalone, zero dependencies. Entry point skills.
- **growth** — Enhanced by foundation outputs (voice profile, positioning, audience).
- **advanced** — Orchestrates multiple skills or requires significant brand context.

## Body Structure

### Required Sections

Every mktg skill must have:

1. **On Activation** — Brand context loading instructions
2. **Title + Hook** — Why this skill exists (under the `# /skill-name` heading)
3. **Quick Start** — First 3-5 actions when invoked
4. **Core Process** — Step-by-step instructions
5. **Success Criteria** — Measurable completion checklist

### On Activation Pattern

Every content-producing skill must include this exact pattern:

```markdown
## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`,
   `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.
```

### Heading Convention

Use standard markdown headings (`##`, `###`). The SKILL.md body follows this
hierarchy:

```
## On Activation
# /skill-name — Skill Title        (H1 — only one per file)
## Quick Start
## Core Process
### Step 1: ...
### Step 2: ...
## Output Format
## Guidelines
## Success Criteria
```

## Description Best Practices

The description is how Claude discovers and activates skills. It must include:

1. **What it does** — Concrete action, not vague ("Define brand voice" not "Help with branding")
2. **When to use it** — Trigger conditions ("Use when starting a project, when copy sounds generic")
3. **What it produces** — Output type ("Outputs a voice profile saved to brand/voice-profile.md")
4. **Dependencies** — What other skills enhance it ("Dependencies: none" or "Dependencies: brand-voice")

**Good:**
```yaml
description: >
  Build email sequences that convert subscribers into customers. Use when
  setting up onboarding, nurture, or launch email flows. Outputs complete
  email sequences with subject lines, body copy, and send timing.
  Dependencies: brand-voice, audience-research. Reads: voice-profile.md,
  audience.md. Writes: none (outputs to marketing/emails/).
```

**Bad:**
```yaml
description: Helps write emails
```

## Trigger Best Practices

Triggers should be natural language phrases a user would actually say:

- Include 3-5 triggers per skill
- Mix action phrases ("write email sequence") and problem phrases ("my emails aren't converting")
- Use lowercase
- Be specific enough to avoid false matches

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do This Instead |
|---|---|---|
| Vague description | Agent can't decide when to activate | Include what, when, and output |
| No On Activation | Brand context never loads | Always include the pattern |
| Gates on brand context | Skill fails without `brand/` | Progressive enhancement — works at zero context |
| Over 500 lines | Agent loads too much context | Split into references/workflows |
| Generic triggers | False activations | Be specific to the skill's domain |
| Hard-coded paths | Breaks in different project structures | Use relative paths from project root |

## Validation Checklist

Before finalizing any skill:

- [ ] YAML frontmatter is valid
- [ ] `name` matches directory name (lowercase-with-hyphens)
- [ ] `description` includes what, when, output, and dependencies
- [ ] `category` is one of: brand, content, growth, analytics, meta
- [ ] `tier` is one of: foundation, growth, advanced
- [ ] `triggers` has 3-5 natural language phrases
- [ ] On Activation section present (if content-producing)
- [ ] Works without `brand/` directory
- [ ] SKILL.md under 500 lines
- [ ] All referenced files exist and are properly linked
- [ ] Success criteria are measurable
- [ ] Tested with real invocation
