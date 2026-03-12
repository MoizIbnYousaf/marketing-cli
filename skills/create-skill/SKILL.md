---
name: create-skill
description: >
  Create new marketing skills for the mktg system. Use when building a new
  skill from scratch, when porting an existing workflow into a skill, or when
  the user says "create a skill", "new skill", "build a marketing skill".
  Guides through requirements gathering, structure decisions, content writing,
  and validation. Produces a complete skill directory with SKILL.md and
  optional supporting files. Dependencies: none (meta-skill).
category: meta
tier: foundation
triggers:
  - create a skill
  - new skill
  - build a marketing skill
  - add a skill
  - make a skill
---

## On Activation

1. Read `references/skill-structure.md` for the required format and fields.
2. Read `templates/marketing-skill.md` for the output template.
3. Read `workflows/create-new-skill.md` for the step-by-step process.

# /create-skill — Marketing Skill Creator

Every skill in the mktg system follows a consistent pattern. This meta-skill
teaches you how to create new marketing skills that integrate seamlessly with
the existing system — proper frontmatter, brand context loading, progressive
disclosure, and the right level of actionable detail.

## Quick Start

When the user wants to create a new marketing skill:

1. **Gather requirements** — What marketing problem does this skill solve? What are
   the inputs and outputs? Does it read from or write to `brand/`?
2. **Choose structure** — Simple (single SKILL.md) or complex (with workflows,
   references, templates)?
3. **Write the skill** — Use the template from `templates/marketing-skill.md`
4. **Validate** — Run through the checklist in `references/skill-structure.md`

## What Would You Like To Do?

1. **Create a new marketing skill** — Build from scratch following the mktg pattern
2. **Port an existing workflow** — Convert a manual process into a reusable skill
3. **Get guidance** — Understand how mktg skills work before building

For option 1 or 2, follow `workflows/create-new-skill.md`.
For option 3, read `references/skill-structure.md`.

## Key Principles

### Brand Context Pattern

Every mktg skill follows the same brand context loading pattern:

```markdown
## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`,
   `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.
```

This is **required** for any skill that produces marketing content. Skills that
are purely analytical (audit, research) should still read brand context but note
that it's optional.

### Progressive Enhancement

Every skill must work at zero context. Brand memory enhances output quality but
never gates functionality. A user with no `brand/` directory should still get
useful output.

### Frontmatter Conventions

mktg skills use extended frontmatter beyond the standard Claude Code fields:

| Field | Required | Description |
|-------|----------|-------------|
| `category` | Yes | One of: brand, content, growth, analytics, meta |
| `tier` | Yes | One of: foundation, growth, advanced |
| `reads` | No | Brand files this skill reads from |
| `writes` | No | Brand files this skill writes to |
| `triggers` | Yes | Phrases that should activate this skill |

### File Size Rule

Keep SKILL.md under 500 lines. If a skill needs more detail, split into:
- `references/` — Domain knowledge the skill needs
- `workflows/` — Step-by-step procedures
- `templates/` — Output structures to copy and fill

## Reference Files

- [skill-structure.md](references/skill-structure.md) — Complete format reference
- [marketing-skill.md](templates/marketing-skill.md) — Template for new skills
- [create-new-skill.md](workflows/create-new-skill.md) — Step-by-step workflow

## Success Criteria

A new skill is complete when:
- [ ] SKILL.md has valid frontmatter with all required mktg fields
- [ ] Description includes what it does AND trigger conditions
- [ ] Brand context loading pattern is present (if content-producing)
- [ ] Skill works standalone without `brand/` directory
- [ ] All referenced files exist and are properly linked
- [ ] SKILL.md is under 500 lines
- [ ] Tested with a real invocation
