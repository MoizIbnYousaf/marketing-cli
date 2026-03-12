# Workflow: Create a New Marketing Skill

Follow these steps to create a new skill for the mktg system.

## Step 1: Gather Requirements

**If the user provided context** (e.g., "build a skill for email onboarding"):
- Analyze what's stated, what can be inferred, what's unclear
- Skip to asking about genuine gaps only

**If the user just invoked without context:**
- Ask what marketing problem this skill solves

### Questions to Resolve

Answer these before proceeding — ask the user if unclear:

1. **What does this skill do?** — One sentence: "This skill helps agents ___."
2. **What triggers it?** — When should an agent activate this? What would a user say?
3. **What does it produce?** — Specific output: a document, a file, a plan, analysis?
4. **Where does output go?** — Does it write to `brand/`? To `marketing/`? Stdout only?
5. **What brand context does it need?** — Which `brand/` files improve its output?
6. **What category?** — brand, content, growth, analytics, or meta?
7. **What tier?** — Does it work standalone (foundation), benefit from brand context
   (growth), or orchestrate other skills (advanced)?

### Decision Gate

After gathering requirements, confirm with the user:
"Here's what I'll build: [summary]. Ready to proceed?"

## Step 2: Choose Structure

**Simple skill** — Use when:
- Single workflow, under 200 lines
- No domain knowledge that needs separate reference files
- One clear process from start to finish

→ Create only `skills/{name}/SKILL.md`

**Complex skill** — Use when:
- Multiple distinct modes or workflows
- Significant domain knowledge that would bloat SKILL.md
- Templates needed for consistent output
- Skill will likely grow over time

→ Create the full directory:
```
skills/{name}/
├── SKILL.md
├── workflows/
│   └── {workflow-name}.md
├── references/
│   └── {reference-name}.md
└── templates/
    └── {template-name}.md
```

Most marketing skills are simple. Only use complex structure when genuinely needed.

## Step 3: Create the Skill

### 3a: Write the Frontmatter

```yaml
---
name: {skill-name}
description: >
  {What it does}. Use when {trigger conditions}.
  Outputs {what it produces}. Dependencies: {deps or "none"}.
  Reads: {brand files}. Writes: {brand files}.
category: {brand | content | growth | analytics | meta}
tier: {foundation | growth | advanced}
reads:
  - brand/{file}.md
writes:
  - brand/{file}.md
triggers:
  - {phrase 1}
  - {phrase 2}
  - {phrase 3}
---
```

**Checklist for frontmatter:**
- [ ] Name is lowercase-with-hyphens, matches directory name
- [ ] Description includes WHAT it does and WHEN to use it
- [ ] Category and tier are set correctly
- [ ] Reads/writes accurately reflect brand file usage
- [ ] 3-5 natural language triggers

### 3b: Write the On Activation Section

If the skill produces marketing content, include the brand context loader:

```markdown
## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`,
   `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.
```

### 3c: Write the Body

Use the template from `templates/marketing-skill.md`. Key sections:

1. **Title + hook** — Why this skill exists (1-3 sentences)
2. **Quick Start** — First 3-5 actions
3. **Core Process** — Step-by-step with decision points
4. **Output Format** — Exactly what the skill produces
5. **Guidelines** — Rules and constraints
6. **Success Criteria** — How to know it's done

### 3d: Write Supporting Files (if complex)

- **Workflows** — Step-by-step procedures. Include required reading at top.
- **References** — Domain knowledge. Facts, patterns, examples.
- **Templates** — Output structures to copy and fill.

## Step 4: Validate

Run through this checklist:

- [ ] SKILL.md has valid YAML frontmatter
- [ ] Name matches directory name
- [ ] Description is specific (not "helps with marketing")
- [ ] Category and tier are correct
- [ ] Brand context loading is present (if content-producing)
- [ ] Skill works without `brand/` directory (progressive enhancement)
- [ ] All referenced files exist
- [ ] SKILL.md is under 500 lines
- [ ] Triggers use natural language the user would actually say
- [ ] Output format is clearly specified
- [ ] Success criteria are measurable

## Step 5: Test

1. Invoke the skill directly with `/skill-name`
2. Test with zero brand context (no `brand/` directory)
3. Test with full brand context
4. Verify output matches the specified format
5. Check that triggers would match reasonable user requests

## Success Criteria

Skill creation is complete when:
- [ ] All validation checklist items pass
- [ ] Skill tested with real invocation
- [ ] User has confirmed the output meets their needs
