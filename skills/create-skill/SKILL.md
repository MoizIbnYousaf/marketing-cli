---
name: create-skill
description: |
  Create new marketing skills for the mktg playbook. Use when the agent needs to add a new capability, someone says 'create a skill', 'new skill', 'add a marketing skill', 'extend the playbook', or 'I need a skill for X'. Reads the skill contract, generates SKILL.md with correct frontmatter and structure, creates the directory, and reminds the agent to register in the manifest.
allowed-tools: []
---

# /create-skill — Skill Creator

Meta-skill for extending the mktg marketing playbook. You create new skills that follow the drop-in contract so they work immediately with `/cmo`, `mktg doctor`, and the full skill ecosystem.

For brand memory protocol, see /cmo [rules/brand-memory.md](../cmo/rules/brand-memory.md).

## On Activation

1. Read the skill contract: [workflows/create-new-skill.md](workflows/create-new-skill.md)
2. Read the template: [templates/marketing-skill.md](templates/marketing-skill.md)
3. Read `skills-manifest.json` in the project root to understand existing skills and avoid overlap.
4. Ask: **What marketing capability should this skill add?**

## Phase 0: Validate the Need

Gate check. Before creating a new skill, verify it doesn't already exist:

| Signal | Action |
|--------|--------|
| Capability covered by existing skill | Skip. Point to the existing skill. |
| Slight variation of existing skill | Skip. Suggest extending the existing skill instead. |
| Genuinely new marketing capability | Proceed. |
| Orchestrator chaining existing skills | Proceed. Mark as orchestrator layer. |

Check `skills-manifest.json` for the full list. Common near-misses:
- "social media copy" → `/content-atomizer` already handles this
- "brand guidelines" → `/brand-voice` covers this
- "SEO strategy" → `/keyword-research` + `/seo-audit` cover this

## Phase 1: Gather Requirements

Ask these questions (one at a time, stop when clear):

1. **Name** — What should the skill be called? (kebab-case, e.g., `webinar-funnel`)
2. **Trigger phrases** — What would someone say to invoke this? (5-8 natural phrases)
3. **Category** — Where does it fit? (foundation / strategy / copy-content / distribution / creative / seo / conversion / growth / knowledge)
4. **Layer** — What layer? (foundation / strategy / execution / orchestrator)
5. **Tier** — How essential? (must-have / nice-to-have / experimental)
6. **Brand reads** — Which `brand/` files does it need? (voice-profile.md, audience.md, etc.)
7. **Brand writes** — Which `brand/` files does it update?
8. **Dependencies** — Which skills should run first? (e.g., `brand-voice`, `audience-research`)
9. **Core workflow** — What are the main phases? (3-5 phases typical)

## Phase 2: Generate the Skill

1. Copy the template from [templates/marketing-skill.md](templates/marketing-skill.md).
2. Fill in all frontmatter fields from Phase 1 answers.
3. Write the skill body following this structure:
   - **Title line** — `# /<name> — <Short Description>`
   - **Opening paragraph** — What this skill does and why it matters (2-3 sentences)
   - **Brand memory reference** — Link to `/cmo` brand-memory rules
   - **On Activation** — Steps to load context and assess the request
   - **Phases 1-N** — The core workflow (3-5 phases)
   - **Worked Example** — One concrete example showing the skill in action
   - **Anti-Patterns** — Table of common mistakes and corrections
   - **YAGNI Principles** — What NOT to add
4. Write the description field carefully — it's used for routing. Include:
   - What the skill does (first sentence)
   - When to use it (second sentence)
   - Trigger phrases (remaining text)

## Phase 3: Create the Directory

```
skills/<name>/
├── SKILL.md              # Required — the skill itself
├── templates/            # Optional — reusable templates
├── workflows/            # Optional — step-by-step procedures
└── references/           # Optional — supporting knowledge
```

Only create subdirectories if the skill genuinely needs them. Most skills are a single SKILL.md.

## Phase 4: Register and Validate

1. **Remind** the agent (or user) to add an entry to `skills-manifest.json`:
   ```json
   "<name>": {
     "source": "new",
     "category": "<category>",
     "layer": "<layer>",
     "tier": "<tier>",
     "reads": ["<file1>.md"],
     "writes": ["<file1>.md"],
     "depends_on": ["<skill1>"],
     "triggers": ["<phrase1>", "<phrase2>"],
     "review_interval_days": 60
   }
   ```
2. **Validate** with `mktg skill validate <name>` if the CLI is available.
3. **Test** by invoking `/<name>` and verifying the On Activation flow works.

Do NOT modify `skills-manifest.json` directly in this skill — that's a separate step to avoid merge conflicts.

---

## Key Principles

### Frontmatter Contract

Every SKILL.md must have this exact frontmatter structure:

```yaml
---
name: <kebab-case-name>
description: |
  <Multi-line description. First sentence: what it does.
  Second sentence: when to use it. Remaining: trigger phrases.>
allowed-tools: []
---
```

- `name` must match the directory name
- `description` is used by Claude for skill routing — be specific and include trigger phrases
- `allowed-tools` is always `[]` for marketing skills (they use the agent's default tools)

### The On Activation Pattern

Every skill starts with On Activation — the first thing that runs when invoked:

1. Load brand context (read `brand/` files)
2. Show what loaded (visual tree with checkmarks)
3. Assess the request
4. Gate check (skip if wrong skill)

This is non-negotiable. It ensures progressive enhancement — skills work at zero context but get better with brand memory.

### Progressive Enhancement

Skills must NEVER gate on brand files. They enhance output but are never required:

```
# Good
1. Read `brand/voice-profile.md` if it exists. Adapt tone accordingly.
2. If not available, use defaults (direct, conversational).

# Bad
1. Read `brand/voice-profile.md`. ERROR if not found.
```

---

## Anti-Patterns

| Anti-pattern | Instead |
|-------------|---------|
| Creating a skill that overlaps with an existing one | Check manifest first, extend existing skill |
| Skipping the description field or writing it vaguely | Description IS routing — be specific, include triggers |
| Making brand files required | Progressive enhancement — enhance, never gate |
| Adding 10+ phases | 3-5 phases. If more, split into multiple skills |
| Hardcoding file paths outside `brand/` and `campaigns/` | Use the standard directories |
| Skills that call other skills | Skills read/write files. `/cmo` orchestrates |
| Forgetting the worked example | Every skill needs one concrete example |

## YAGNI Principles

- Don't create orchestrator skills unless you have 3+ skills to chain
- Don't add references/ directory for a simple skill — one SKILL.md is fine
- Don't over-specify the workflow — leave room for the agent's judgment
- Don't duplicate knowledge that lives in another skill
- The skill contract is the source of truth, not this skill — if they diverge, update this skill
