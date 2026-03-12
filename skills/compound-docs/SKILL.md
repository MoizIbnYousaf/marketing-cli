---
name: compound-docs
description: Document marketing solutions and learnings to compound knowledge over time — what worked, what didn't, audience insights, channel performance
disable-model-invocation: true
allowed-tools:
  - Read # Parse conversation context
  - Write # Create learning docs
  - Bash # Create directories
  - Grep # Search existing docs
preconditions:
  - Marketing insight, result, or learning has been confirmed
  - Campaign, content, or strategy outcome is known
---

# compound-docs Skill

**Purpose:** Capture marketing learnings immediately after confirmation to build searchable institutional knowledge — what worked, what flopped, audience reactions, channel performance, and strategic insights.

## Overview

Marketing compounds when you document outcomes. This skill captures campaign results, content performance, audience insights, and strategy learnings as structured docs so future sessions start smarter.

**Organization:** Each learning is one markdown file in its category directory (e.g., `docs/learnings/campaign-results/black-friday-email-blast-20260312.md`). Files use YAML frontmatter for metadata and searchability.

---

<critical_sequence name="learning-capture" enforce_order="strict">

## 7-Step Process

<step number="1" required="true">
### Step 1: Detect Learning

**Auto-invoke after phrases:**

- "that campaign crushed it"
- "the numbers are in"
- "that content performed well"
- "we learned that..."
- "that didn't work"
- "here's what happened"
- "the results show"

**OR manual:** `/compound` command

**Worth documenting when:**

- Campaign or content produced measurable results
- Audience behavior surprised you
- A channel outperformed or underperformed expectations
- Strategy pivot led to different outcomes
- A/B test revealed insights
- Something failed and the failure is instructive

**Skip documentation for:**

- Routine posts with expected performance
- Minor copy tweaks with no measurable difference
- Obvious best practices everyone knows
</step>

<step number="2" required="true" depends_on="1">
### Step 2: Gather Context

Extract from conversation history:

**Required information:**

- **Project**: Which project this learning applies to
- **Learning type**: Campaign result, content insight, audience discovery, channel finding, or strategy learning
- **What happened**: Specific outcome with numbers if available
- **Why it matters**: What this teaches us going forward
- **What to do differently**: Actionable takeaway

**Performance details (when available):**

- Metrics (open rates, CTR, conversions, traffic, engagement)
- Audience segment affected
- Channel and format used
- Time period and context
- Comparison to baseline or previous attempts

**BLOCKING REQUIREMENT:** If critical context is missing (project, what happened, or actionable takeaway), ask user and WAIT for response before proceeding to Step 3:

```
I need a few details to document this properly:

1. Which project is this for?
2. What specifically happened? (include numbers if you have them)
3. What's the actionable takeaway?

[Continue after user provides details]
```
</step>

<step number="3" required="false" depends_on="2">
### Step 3: Check Existing Docs

Search docs/learnings/ for similar learnings:

```bash
# Search by topic keywords
grep -r "keyword" docs/learnings/

# Search by category
ls docs/learnings/[category]/
```

**IF similar learning found:**

THEN present decision options:

```
Found similar learning: docs/learnings/[path]

What's next?
1. Create new doc with cross-reference (recommended)
2. Update existing doc (only if same topic with new data)
3. Other

Choose (1-3): _
```

WAIT for user response, then execute chosen action.

**ELSE** (no similar learning found):

Proceed directly to Step 4 (no user interaction needed).
</step>

<step number="4" required="true" depends_on="2">
### Step 4: Generate Filename

Format: `[sanitized-topic]-[project]-[YYYYMMDD].md`

**Sanitization rules:**

- Lowercase
- Replace spaces with hyphens
- Remove special characters except hyphens
- Truncate to reasonable length (< 80 chars)

**Examples:**

- `email-open-rate-spike-ceoapp-20260312.md`
- `tiktok-outperformed-instagram-halaali-20260315.md`
- `pricing-page-ab-test-skillcreator-20260320.md`
- `seo-longtail-strategy-halalscreen-20260401.md`
</step>

<step number="5" required="true" depends_on="4" blocking="true">
### Step 5: Validate YAML Schema

**CRITICAL:** All docs require validated YAML frontmatter with enum validation.

<validation_gate name="yaml-schema" blocking="true">

**Validate against schema:**
Classify the learning against the enum values defined in [yaml-schema.md](./references/yaml-schema.md). Ensure all required fields are present and match allowed values exactly.

**BLOCK if validation fails:**

```
YAML validation failed

Errors:
- learning_type: must be one of schema enums, got "blog_post"
- severity: must be one of [breakthrough, significant, incremental, negative], got "invalid"
- metrics: must be array with 1-5 items, got string

Please provide corrected values.
```

**GATE ENFORCEMENT:** Do NOT proceed to Step 6 (Create Documentation) until YAML frontmatter passes all validation rules.

</validation_gate>
</step>

<step number="6" required="true" depends_on="5">
### Step 6: Create Documentation

**Determine category from learning_type:** Use the category mapping defined in [yaml-schema.md](./references/yaml-schema.md).

**Choose the correct template:**
- Campaign results, A/B tests, launch outcomes → `assets/campaign-template.md`
- Content strategy, SEO findings, audience insights, channel learnings → `assets/content-template.md`

**Create documentation file:**

```bash
LEARNING_TYPE="[from validated YAML]"
CATEGORY="[mapped from learning_type]"
FILENAME="[generated-filename].md"
DOC_PATH="docs/learnings/${CATEGORY}/${FILENAME}"

# Create directory if needed
mkdir -p "docs/learnings/${CATEGORY}"

# Write documentation using the appropriate template
# (Content populated with Step 2 context and validated YAML frontmatter)
```

**Result:**
- Single file in category directory
- Enum validation ensures consistent categorization
</step>

<step number="7" required="false" depends_on="6">
### Step 7: Cross-Reference & Pattern Detection

If similar learnings found in Step 3:

**Update existing doc:**

```bash
# Add Related Learnings link to similar doc
echo "- See also: [$FILENAME]($REAL_FILE)" >> [similar-doc.md]
```

**Update patterns if applicable:**

If this represents a recurring pattern (3+ similar learnings):

```bash
# Add to docs/learnings/patterns/marketing-patterns.md
cat >> docs/learnings/patterns/marketing-patterns.md << 'EOF'

## [Pattern Name]

**What we keep seeing:** [Description]
**Why it happens:** [Explanation]
**Playbook:** [What to do every time]

**Evidence:**
- [Link to learning 1]
- [Link to learning 2]
- [Link to learning 3]
EOF
```

**Critical Pattern Detection (Optional Proactive Suggestion):**

If this learning has indicators suggesting it's a breakthrough:
- Impact: `breakthrough` in YAML
- Applies across multiple projects
- Contradicts conventional wisdom
- Reveals a repeatable growth lever

Then in the decision menu (Step 8), add a note:
```
This might be worth adding to the Marketing Playbook (Option 2)
```

But **NEVER auto-promote**. User decides via decision menu (Option 2).
</step>

</critical_sequence>

---

<decision_gate name="post-documentation" wait_for_user="true">

## Decision Menu After Capture

After successful documentation, present options and WAIT for user response:

```
Solution documented

File created:
- docs/learnings/[category]/[filename].md

What's next?
1. Continue workflow (recommended)
2. Add to Marketing Playbook - Promote to critical patterns (marketing-patterns.md)
3. Link related learnings - Connect to similar findings
4. Add to brand memory - Update brand/ with this insight
5. Create new skill - Extract into new marketing skill
6. View documentation - See what was captured
7. Other
```

**Handle responses:**

**Option 1: Continue workflow**

- Return to calling skill/workflow
- Documentation is complete

**Option 2: Add to Marketing Playbook**

User selects this when:
- This insight applies across all projects
- It's a non-obvious growth lever that should be repeated
- It contradicts conventional marketing wisdom

Action:
1. Extract pattern from the documentation
2. Format as "WRONG vs RIGHT" with examples
3. Add to `docs/learnings/patterns/marketing-patterns.md`
4. Add cross-reference back to this doc
5. Confirm: "Added to Marketing Playbook. Future marketing sessions will use this pattern."

**Option 3: Link related learnings**

- Prompt: "Which learning to link? (provide filename or describe)"
- Search docs/learnings/ for the doc
- Add cross-reference to both docs
- Confirm: "Cross-reference added"

**Option 4: Add to brand memory**

User selects this when the learning should update the project's brand context:

Action:
1. Determine which brand file to update (audience.md, voice.md, positioning.md, etc.)
2. Add the insight to the relevant section
3. Confirm: "Updated brand/[file] with this insight"

**Option 5: Create new skill**

User selects this when the learning represents a new marketing capability:

Action:
1. Prompt: "What should the new skill be called?"
2. Create skill directory with SKILL.md
3. Include this learning as the first reference
4. Confirm: "Created new [skill-name] skill with this learning as first reference"

**Option 6: View documentation**

- Display the created documentation
- Present decision menu again

**Option 7: Other**

- Ask what they'd like to do

</decision_gate>

---

<integration_protocol>

## Integration Points

**Invoked by:**
- `/compound` command (primary interface)
- Manual invocation after marketing results are confirmed
- Can be triggered by detecting confirmation phrases like "that campaign crushed it", "the numbers are in", etc.

**Invokes:**
- None (terminal skill - does not delegate to other skills)

**Handoff expectations:**
All context needed for documentation should be present in conversation history before invocation.

</integration_protocol>

---

<success_criteria>

## Success Criteria

Documentation is successful when ALL of the following are true:

- YAML frontmatter validated (all required fields, correct formats)
- File created in docs/learnings/[category]/[filename].md
- Enum values match schema exactly
- Specific metrics or outcomes included (not vague)
- Actionable takeaway clearly stated
- Cross-references added if related learnings found
- User presented with decision menu and action confirmed

</success_criteria>

---

## Error Handling

**Missing context:**

- Ask user for missing details
- Don't proceed until critical info provided

**YAML validation failure:**

- Show specific errors
- Present retry with corrected values
- BLOCK until valid

**Similar learning ambiguity:**

- Present multiple matches
- Let user choose: new doc, update existing, or link as related

---

## Execution Guidelines

**MUST do:**
- Validate YAML frontmatter (BLOCK if invalid per Step 5 validation gate)
- Include specific numbers and metrics when available
- Include actionable takeaway in every doc
- Create directories before writing files (`mkdir -p`)
- Ask user and WAIT if critical context missing

**MUST NOT do:**
- Skip YAML validation (validation gate is blocking)
- Use vague descriptions ("marketing went well")
- Omit actionable takeaways
- Document without specifying which project

---

## Quality Guidelines

**Good marketing documentation has:**

- Specific metrics (open rate 42%, CTR 3.2%, 500 signups)
- Clear cause and effect (we did X, which led to Y)
- Audience context (who responded, who didn't)
- Channel specifics (platform, format, timing)
- Actionable takeaway (do more of X, stop doing Y)
- Cross-references to related learnings

**Avoid:**

- "The campaign did well" (how well? what metric?)
- "People liked the content" (which people? how do you know?)
- "We should do more social" (which platform? what format? what worked?)
- Generic advice with no project-specific evidence
- Theory without data

---

## Example Scenario

**User:** "The numbers are in — that email sequence crushed it for CEO App."

**Skill activates:**

1. **Detect learning:** "The numbers are in" triggers auto-invoke
2. **Gather context:**
   - Project: CEO App
   - Learning type: Campaign result
   - What happened: 5-email welcome sequence achieved 62% open rate (vs 28% industry avg), 12% CTR, 340 trial signups in first week
   - Why it matters: Personalized subject lines using CEO's name + pain point drove 3x engagement
   - Actionable takeaway: Always personalize subject lines with recipient role + specific pain point
3. **Check existing:** No similar learning found
4. **Generate filename:** `welcome-sequence-high-engagement-ceoapp-20260312.md`
5. **Validate YAML:**
   ```yaml
   project: CEO App
   date: 2026-03-12
   learning_type: campaign_result
   channel: email
   content_format: email_sequence
   metrics:
     - "62% open rate (vs 28% industry average)"
     - "12% CTR across 5 emails"
     - "340 trial signups in first week"
   impact: breakthrough
   tags: [email, welcome-sequence, personalization, subject-lines]
   ```
   Valid
6. **Create documentation:**
   - `docs/learnings/campaign-results/welcome-sequence-high-engagement-ceoapp-20260312.md`
7. **Cross-reference:** None needed (no similar learnings)

**Output:**

```
Learning documented

File created:
- docs/learnings/campaign-results/welcome-sequence-high-engagement-ceoapp-20260312.md

What's next?
1. Continue workflow (recommended)
2. Add to Marketing Playbook - Promote to critical patterns (marketing-patterns.md)
3. Link related learnings - Connect to similar findings
4. Add to brand memory - Update brand/ with this insight
5. Create new skill - Extract into new marketing skill
6. View documentation - See what was captured
7. Other
```
