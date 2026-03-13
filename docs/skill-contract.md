# mktg Skill Contract

The definitive reference for the mktg skill format. Every skill in the playbook follows this contract.

---

## Directory Structure

```
skills/<skill-name>/
├── SKILL.md              # Required — the skill definition
├── templates/            # Optional — reusable output templates
├── workflows/            # Optional — step-by-step procedures
└── references/           # Optional — supporting knowledge, examples, data
```

- The directory name MUST match the `name` field in SKILL.md frontmatter
- Names are kebab-case, 1-3 words (max 4 if needed)
- Only SKILL.md is required — subdirectories are optional

---

## Frontmatter (Required)

Every SKILL.md begins with YAML frontmatter:

```yaml
---
name: <skill-name>
description: |
  <Multi-line description used for routing. Structure:
  First sentence: what the skill does.
  Second sentence: when to use it.
  Remaining: trigger phrases separated by commas or listed naturally.>
allowed-tools: []
---
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Kebab-case name, must match directory name |
| `description` | string (multi-line) | Yes | Routing description with trigger phrases |
| `allowed-tools` | array | Yes | Always `[]` for marketing skills |

### Description Best Practices

The `description` field is critical — Claude uses it to decide when to invoke the skill. Write it like you're telling an agent when to use this tool:

```yaml
# Good — specific, includes triggers
description: |
  Create high-quality, SEO-optimized content that ranks AND reads like a human
  wrote it. Use when someone needs a blog post, article, or SEO page. Triggers on
  'SEO content', 'blog post', 'article', 'write a post about', 'rank for'.

# Bad — vague, no triggers
description: |
  Helps with content marketing.
```

---

## Manifest Entry

Every skill must also have an entry in `skills-manifest.json`:

```json
"<skill-name>": {
  "source": "new",
  "category": "<category>",
  "layer": "<layer>",
  "tier": "<tier>",
  "reads": ["<brand-file>.md"],
  "writes": ["<brand-file>.md"],
  "depends_on": ["<skill-name>"],
  "triggers": ["<phrase>"],
  "review_interval_days": 60
}
```

### Manifest Fields

| Field | Values | Description |
|-------|--------|-------------|
| `source` | `new`, `v1`, `v2` | Origin — `new` for skills created from scratch |
| `category` | `foundation`, `strategy`, `copy-content`, `distribution`, `creative`, `seo`, `conversion`, `growth`, `knowledge` | Functional grouping |
| `layer` | `foundation`, `strategy`, `execution`, `orchestrator` | Stack position |
| `tier` | `must-have`, `nice-to-have`, `experimental` | Installation priority |
| `reads` | string[] | Brand files the skill reads for context |
| `writes` | string[] | Brand files the skill creates or appends to |
| `depends_on` | string[] | Skills that should run before this one |
| `triggers` | string[] | Phrases that invoke this skill (must match SKILL.md) |
| `review_interval_days` | number | Freshness check interval (30, 60, or 90) |

---

## Body Structure

After the frontmatter, the SKILL.md body follows this structure:

### 1. Title Line

```markdown
# /<skill-name> — <Short Description>
```

### 2. Opening Paragraph

2-3 sentences explaining what the skill does, why it matters, and what makes it different.

### 3. Brand Memory Reference

```markdown
For brand memory protocol, see /cmo [rules/brand-memory.md](../cmo/rules/brand-memory.md).
```

### 4. On Activation

The first thing that runs when the skill is invoked:

1. **Load brand context** — Read relevant `brand/` files
2. **Show what loaded** — Visual tree with checkmarks
3. **Assess the request** — Understand what the user needs
4. **Gate check** — Verify this is the right skill

```markdown
## On Activation

1. Read `brand/` directory: load `voice-profile.md`, `audience.md` if present.
2. Show what loaded:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓ "{tone summary}"
   ├── Audience        ✓ "{audience summary}"
   └── Learnings       ✗ (run /cmo to build)
   ```
3. Assess the user's request.
```

### 5. Phase 0: Gate Check

A routing table that determines whether to proceed or redirect:

```markdown
## Phase 0: Gate Check

| Signal | Action |
|--------|--------|
| Clear match | Proceed. |
| Better skill exists | Skip. Route to `/<other-skill>`. |
| Needs prerequisite | Suggest `/<prereq-skill>` first. |
```

### 6. Phases 1-N: Core Workflow

3-5 phases that walk through the skill's main workflow. Each phase should:
- Have a clear name (Research, Create, Optimize, etc.)
- Describe inputs and outputs
- Include specific instructions, not vague guidance

### 7. Worked Example

One concrete example showing the skill handling a real request. Include the user's input, key decisions, and abbreviated output.

### 8. Anti-Patterns

Table of common mistakes:

```markdown
## Anti-Patterns

| Anti-pattern | Instead |
|-------------|---------|
| <mistake> | <correction> |
```

### 9. YAGNI Principles

Bullet list of what NOT to do:

```markdown
## YAGNI Principles

- Don't add X when Y is sufficient
- Resist the urge to Z
```

---

## Core Principles

### Progressive Enhancement

Skills MUST work with zero brand context. Brand files enhance output but never gate it:

```markdown
# Correct
1. Read `brand/voice-profile.md` if it exists.
2. If not available, use defaults (direct, conversational).

# Wrong
1. Read `brand/voice-profile.md`. Error if not found.
```

### Skills Never Call Skills

Skills read and write files. The `/cmo` orchestrator chains skills together. A skill should never invoke another skill directly.

After completing, offer **chain suggestions**:
```markdown
## Chain Offers

- `/<next-skill>` — <why this follows naturally>
```

### File I/O Conventions

| Type | Location | Format |
|------|----------|--------|
| Brand context | `brand/<file>.md` | Read on activation |
| Campaign output | `campaigns/<type>/<slug>.md` | Skill deliverables |
| Marketing briefs | `marketing/brainstorms/<date>-<topic>.md` | Strategy docs |
| Assets registry | `brand/assets.md` | Append after creating assets |
| Learnings | `brand/learnings.md` | Append after feedback |

### Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Skill name | kebab-case | `seo-content` |
| Directory | matches name | `skills/seo-content/` |
| Frontmatter name | matches directory | `name: seo-content` |
| Trigger command | `/<name>` | `/seo-content` |
| Output files | kebab-case slug | `is-doordash-halal.md` |

---

## Validation

Use the CLI to validate a skill:

```bash
mktg skill validate <skill-name>
```

Checks performed:
- Frontmatter has all required fields
- `name` matches directory name
- `description` is non-empty and includes trigger language
- `allowed-tools` is present
- Manifest entry exists and is consistent
- Referenced brand files are from the known set
- No trigger conflicts with other skills
