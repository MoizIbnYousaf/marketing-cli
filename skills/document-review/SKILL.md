---
name: document-review
description: "Review marketing documents (brand guides, content calendars, campaign briefs, launch plans, positioning docs) for completeness, clarity, and actionability. Use when a marketing document exists and needs refinement before execution."
metadata:
  version: 1.0.0
category: strategy
tier: meta
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
triggers:
  - review document
  - review plan
  - review brief
  - check document
  - refine plan
---

# Document Review — Marketing Document Refinement

Improve marketing documents through structured review, ensuring they are clear, complete, and ready for execution.

## Step 1: Get the Document

**If a document path is provided:** Read it, then proceed to Step 2.

**If no document is specified:** Ask which document to review, or look for the most recent marketing document in:
- `marketing/` — campaign briefs, content calendars, email sequences
- `brand/` — brand guides, voice profiles, positioning docs
- `docs/plans/` — marketing plans, launch plans

## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`, `audience.md`.
3. Use brand context to evaluate whether the document aligns with established brand direction.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

## Step 2: Identify Document Type

Classify the document to apply the right review criteria:

| Document Type | Key Review Focus |
|---|---|
| **Brand guide** | Consistency, completeness of voice/visual/messaging sections |
| **Content calendar** | Coverage across channels, realistic cadence, variety |
| **Campaign brief** | Clear objective, defined audience, measurable success criteria |
| **Launch plan** | Timeline feasibility, channel coverage, pre/during/post phases |
| **Positioning doc** | Differentiation clarity, audience alignment, proof points |
| **Email sequence** | Flow logic, CTA progression, value-to-ask ratio |
| **Landing page copy** | Headline clarity, benefit focus, objection handling |
| **SEO content plan** | Keyword coverage, intent mapping, content gaps |

## Step 3: Assess

Read through the document and ask:

**Clarity:**
- Is the goal or objective crystal clear?
- Would someone executing this know exactly what to do?
- Are there vague phrases ("consider," "explore," "possibly") that need to be concrete?

**Completeness:**
- Are all required sections present for this document type?
- Is the target audience defined specifically (not just "our users")?
- Are success metrics defined and measurable?
- Are timelines or deadlines specified?
- Are channels and tactics named, not just categories?

**Actionability:**
- Can someone execute this tomorrow without asking clarifying questions?
- Are deliverables specific (not "create content" but "write 3 LinkedIn posts targeting X")?
- Are dependencies and prerequisites called out?

**Brand Alignment** (if `brand/` context is loaded):
- Does the messaging match the brand voice profile?
- Is the positioning consistent with the positioning doc?
- Does the audience match the defined buyer personas?

**Marketing Effectiveness:**
- Is there a clear value proposition or hook?
- Are there conversion points defined?
- Is there a follow-up or nurture strategy?
- Is the content-to-promotion ratio reasonable?

These questions surface issues. Don't fix yet — just note what you find.

## Step 4: Evaluate

Score the document against these criteria:

| Criterion | What to Check |
|---|---|
| **Clarity** | Goal is explicit, no vague language, audience is specific |
| **Completeness** | All sections for this doc type present, metrics defined, timeline set |
| **Actionability** | Specific enough to execute — deliverables, channels, owners, dates |
| **Brand Consistency** | Aligns with voice, positioning, and audience (if brand/ exists) |
| **YAGNI** | No hypothetical campaigns, simplest approach chosen, focused scope |

Rate each criterion: Strong / Adequate / Needs Work / Missing

## Step 5: Identify the Critical Improvement

Among everything found in Steps 3-4, does one issue stand out? Common critical issues in marketing documents:

- **No clear objective** — The doc describes activities but not the goal
- **Undefined audience** — Generic targeting that leads to generic content
- **Missing metrics** — No way to know if the marketing worked
- **No conversion path** — Content strategy without CTAs or next steps
- **Unrealistic scope** — Too much for the timeline or resources available
- **Brand disconnect** — Messaging doesn't match established positioning

Highlight the single most impactful improvement prominently.

## Step 6: Make Changes

Present your findings, then:

1. **Auto-fix** minor issues without asking:
   - Vague language → specific language
   - Missing metric placeholders → add "[define metric]" markers
   - Formatting inconsistencies
   - Unclear timelines → add "[specify date]" markers

2. **Ask approval** before substantive changes:
   - Restructuring sections
   - Removing content
   - Changing the target audience or positioning
   - Altering the campaign strategy or channel mix

3. **Update** the document inline — no separate files, no metadata sections

### Simplification Guidance

**Simplify when:**
- Content serves hypothetical future campaigns, not the current one
- Sections repeat information already in `brand/` files
- Detail exceeds what's needed to start execution
- Multiple channels are listed "just in case" without commitment

**Don't simplify:**
- Audience segmentation that affects messaging
- Rationale for why a channel or tactic was chosen
- Competitive context that informs positioning
- Open questions that need resolution before execution

### Marketing-Specific Checks

Run these additional checks based on document type:

**For content calendars:**
- Is there variety in content types (not all blog posts)?
- Are promotional vs. value posts balanced?
- Are key dates and events incorporated?
- Is the cadence sustainable?

**For email sequences:**
- Does the first email deliver immediate value?
- Is there a clear escalation toward the CTA?
- Are subject lines specific (not generic)?
- Is there a re-engagement path for non-openers?

**For launch plans:**
- Are pre-launch, launch day, and post-launch phases defined?
- Is there a specific ask or CTA for launch day?
- Are distribution channels listed with specific actions?
- Is there a contingency if the primary channel underperforms?

**For landing pages:**
- Is the headline benefit-focused (not feature-focused)?
- Are objections addressed?
- Is social proof or credibility included?
- Is there exactly one clear CTA?

## Step 7: Suggest mktg CLI Commands

Where relevant, suggest `mktg` commands that could enhance the document:

- `mktg audit` — If the document lacks competitive context or market data
- `mktg content` — If the document needs specific content pieces generated
- `mktg calendar` — If the content calendar section needs fleshing out
- `mktg social` — If social media tactics need specific post examples
- `mktg email` — If email sequences need drafting
- `mktg doctor` — If brand context seems incomplete or outdated

## Step 8: Offer Next Action

After changes are complete, ask:

1. **Refine again** — Another review pass
2. **Deepen** — Run `/deepen-plan` to add research depth
3. **Review complete** — Document is ready for execution

### Iteration Guidance

After 2 refinement passes, recommend completion — diminishing returns are likely. But if the user wants to continue, allow it.

Return control to the caller (workflow or user) after selection.

## What NOT to Do

- Do not rewrite the entire document
- Do not add new campaigns or channels the user didn't discuss
- Do not over-engineer or add complexity
- Do not create separate review files or add metadata sections
- Do not add generic marketing advice — be specific to this document
- Do not remove competitive context or rationale sections
