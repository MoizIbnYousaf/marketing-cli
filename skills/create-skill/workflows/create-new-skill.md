# Workflow: Create a New Marketing Skill

Step-by-step procedure for adding a new skill to the mktg playbook.

## Prerequisites

- Access to the `mktg` repository
- Understanding of what marketing capability to add
- Checked that no existing skill covers this capability

---

## Step 1: Name the Skill

Choose a kebab-case name that clearly describes the capability:

- **Good:** `webinar-funnel`, `podcast-marketing`, `influencer-outreach`
- **Bad:** `marketing-stuff`, `new-thing`, `v2-content`

Rules:
- Lowercase kebab-case only
- 1-3 words (max 4 if needed for clarity)
- Must not conflict with existing skill names in `skills-manifest.json`
- Name = directory name = frontmatter `name` field (all must match)

---

## Step 2: Define Triggers

Write 5-8 natural phrases a user or agent would say to invoke this skill:

```yaml
triggers:
  - "exact phrase someone would say"
  - "another trigger phrase"
  - "skill-name"  # always include the name itself
```

Guidelines:
- Include the skill name as a trigger
- Use natural language, not commands
- Cover different ways to ask for the same thing
- Avoid triggers that overlap with existing skills (check manifest)

---

## Step 3: Identify Reads and Writes

Determine which `brand/` files the skill interacts with:

**Available brand files:**
| File | Contains |
|------|----------|
| `voice-profile.md` | Brand voice, tone, personality |
| `audience.md` | Buyer personas, segments |
| `positioning.md` | Market angles, differentiators |
| `competitors.md` | Competitive landscape |
| `keyword-plan.md` | SEO keywords, content briefs |
| `creative-kit.md` | Visual brand assets |
| `stack.md` | Marketing tool stack |
| `assets.md` | Registry of created marketing assets |
| `learnings.md` | What worked, what didn't |

Rules:
- Only list files the skill actually uses — don't list all 9
- `reads` = files loaded for context (never required, always enhance)
- `writes` = files the skill creates or appends to
- Most skills read `voice-profile.md` — it's the baseline brand context

---

## Step 4: Write the SKILL.md

1. Copy the template from `skills/create-skill/templates/marketing-skill.md`
2. Create the directory: `skills/<name>/SKILL.md`
3. Fill in all frontmatter fields:
   ```yaml
   ---
   name: <name>
   description: |
     <What it does. When to use it. Trigger phrases.>
   allowed-tools: []
   ---
   ```
4. Write the skill body following the standard structure:
   - Title: `# /<name> — <Short Description>`
   - Opening paragraph (2-3 sentences)
   - Brand memory reference link
   - On Activation (load brand context, show status, gate check)
   - Phase 0: Gate Check (is this the right skill?)
   - Phases 1-N: Core workflow (3-5 phases)
   - Worked Example (one concrete scenario)
   - Anti-Patterns table
   - YAGNI Principles list
5. Optionally create subdirectories:
   - `templates/` — Reusable output templates
   - `workflows/` — Step-by-step procedures
   - `references/` — Supporting knowledge and examples

---

## Step 5: Register in Manifest

Add an entry to `skills-manifest.json` in the project root:

```json
"<name>": {
  "source": "new",
  "category": "<foundation|strategy|copy-content|distribution|creative|seo|conversion|growth|knowledge>",
  "layer": "<foundation|strategy|execution|orchestrator>",
  "tier": "<must-have|nice-to-have|experimental>",
  "reads": ["voice-profile.md"],
  "writes": [],
  "depends_on": [],
  "triggers": ["trigger1", "trigger2"],
  "review_interval_days": 60
}
```

Field reference:
- `source`: `"new"` for new skills, `"v1"`/`"v2"` for ported skills
- `category`: Functional grouping (see the categories in the manifest)
- `layer`: Where it sits in the marketing stack
- `tier`: Priority level for installation
- `reads`/`writes`: Brand file interactions (must match SKILL.md)
- `depends_on`: Skills that should run before this one
- `triggers`: Must match the triggers in SKILL.md frontmatter
- `review_interval_days`: How often to refresh (30/60/90)

---

## Step 6: Validate

Run validation if the CLI is available:

```bash
mktg skill validate <name>
```

This checks:
- Frontmatter structure is correct
- Name matches directory name
- Required fields are present
- Triggers don't conflict with existing skills
- Referenced brand files are valid

---

## Step 7: Test

1. Invoke the skill: `/<name>`
2. Verify On Activation loads brand context correctly
3. Walk through each phase with a test scenario
4. Confirm output files are written to the correct locations
5. Check that chain offers point to valid skills

---

## Checklist

- [ ] Name is kebab-case and unique
- [ ] Directory created at `skills/<name>/`
- [ ] SKILL.md has valid frontmatter (name, description, allowed-tools)
- [ ] Description includes trigger phrases for routing
- [ ] On Activation loads brand context progressively
- [ ] Gate check routes to correct skill if mismatch
- [ ] 3-5 phases cover the full workflow
- [ ] Worked example demonstrates the skill concretely
- [ ] Anti-patterns table included
- [ ] YAGNI principles listed
- [ ] Entry added to `skills-manifest.json`
- [ ] Validation passes (`mktg skill validate`)
