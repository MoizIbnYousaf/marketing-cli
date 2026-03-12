---
name: lead-magnet
version: 7.0
description: >
  Generate compelling lead magnet concepts AND build the actual lead magnet
  content. Use when someone needs top-of-funnel ideas, wants to grow their
  email list, or asks what should I give away for free. Triggers on: lead
  magnet ideas for X, how do I build my list, what freebie should I create,
  top of funnel for X, opt-in ideas, grow my email list, create a lead
  magnet, build my checklist, write a guide. Outputs 3-5 lead magnet
  concepts with hooks, formats, and clear bridges to the paid offer. After
  user selects a concept, enters BUILD MODE and writes the full lead magnet
  content -- checklists, templates, guides, quiz questions, swipe files.
  Writes output to ./campaigns/{magnet-name}/lead-magnet.md. Uses web
  search to research competitor lead magnets in the same space. Reads:
  voice-profile.md, positioning.md, audience.md. Writes:
  ./campaigns/{magnet-name}/lead-magnet.md, ./campaigns/{magnet-name}/brief.md,
  assets.md, learnings.md. Chains to: /direct-response-copy for landing
  page, /email-sequences for delivery + welcome sequence,
  /content-atomizer for social promotion.
---

# Lead Magnet Ideation + Build

The best lead magnets aren't about what you want to give away. They're about what your prospect desperately wants to consume -- and how that consumption naturally leads them toward your paid offer.

This skill generates lead magnet concepts that actually convert. And then it builds them.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

---

## Brand Memory Integration

This skill reads brand context to ensure every lead magnet concept aligns with the user's positioning, speaks to their actual audience, and sounds like their brand. It also checks for existing campaigns and lead magnets to avoid duplication.

**Reads:** `voice-profile.md`, `positioning.md`, `audience.md` (all optional)

On invocation, check for `./brand/` and load available context:

1. **Load `voice-profile.md`** (if exists):
   - Match the brand's tone and vocabulary in all lead magnet copy
   - Apply voice DNA to titles, hooks, and body content
   - A "direct, proof-heavy" voice writes different hooks than a "warm, story-driven" voice
   - Show: "Your voice is [tone summary]. Lead magnet copy will match that register."

2. **Load `positioning.md`** (if exists):
   - Use the chosen positioning angle to inform the lead magnet's frame
   - The positioning determines how the lead magnet bridges to the paid offer
   - Use differentiation points to ensure the lead magnet is unique vs competitors
   - Show: "Your positioning angle is '[angle]'. Concepts will build on that frame."

3. **Load `audience.md`** (if exists):
   - Know who this lead magnet is for: awareness level, sophistication, pain points
   - Match format complexity to audience preference (video people vs readers vs doers)
   - Use audience language in hooks and titles
   - Show: "Writing for [audience summary]. Awareness: [level]."

4. **Check for existing lead magnets** (if `./campaigns/*/brief.md` or `./brand/assets.md` references a lead magnet):
   - If a lead magnet already exists, note it and ask whether to create a new one or iterate
   - Show: "Found existing lead magnet: '[name]'. Want to create a new one or improve this?"

5. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Proceed without it -- this skill works standalone.
   - The concepts will be well-structured either way; brand memory makes them more targeted.
   - Note: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

### Context Loading Display

Show the user what was loaded using the standard tree format:

```
Brand context loaded:
├── Voice Profile     ✓ "{tone summary}"
├── Positioning       ✓ "{primary angle}"
├── Audience          ✓ "{audience summary}"
└── Learnings         ✓ {N} entries

Using this to shape lead magnet concepts and copy.
```

If files are missing, show them as ✗ with a suggestion:

```
├── Voice Profile     ✗ not found
│   → /brand-voice to create one (~10 min)
```

---

## Competitive Research

Before generating concepts, use web search to understand what competitors are already offering as lead magnets in the same space. This prevents creating something generic and reveals gaps to exploit.

### Research Process

1. **Identify the niche/market** from user input and brand memory (positioning.md, audience.md).

2. **Search for competitor lead magnets** using web search:
   - Search: "[niche] free download" or "[niche] lead magnet"
   - Search: "[competitor name] free resource" for known competitors
   - Search: "[niche] opt-in freebie" or "[niche] email list building"
   - Check competitor websites for opt-in offers visible on homepages, blog sidebars, and popups

3. **Analyze what you find:**
   - What formats are competitors using? (PDF, quiz, template, challenge)
   - What hooks are they leading with?
   - What gaps exist? (Formats no one is using, angles no one has taken)
   - What is overdone? (If everyone has a "complete guide," avoid that format)

4. **Show the research in the output:**
   ```
   COMPETITIVE LANDSCAPE

   Competitor lead magnets found:
   ├── [Competitor A]   "The Complete X Guide" (PDF)
   ├── [Competitor B]   "X Calculator" (interactive tool)
   ├── [Competitor C]   "X Checklist" (PDF checklist)
   └── [Competitor D]   "What's Your X Type?" (quiz)

   Gap: No one is offering a template/swipe file
   Overdone: PDF guides (3 of 4 competitors)
   Opportunity: Interactive format or template
   ```

5. **Use findings to differentiate:**
   - If everyone has PDFs, suggest a quiz or calculator
   - If everyone is broad, go narrow and specific
   - If no one uses a particular hook type, exploit it
   - Reference competitive gaps in the concept rationale

### When Web Search Is Not Available

If web search is unavailable or returns insufficient results:
- Note: "I wasn't able to research competitor lead magnets. Concepts are based on industry patterns and best practices."
- Proceed with concept generation using the reference files and framework knowledge.
- Still apply the differentiation mindset -- just without specific competitive data.

---

## Iteration Detection

Before starting, check if a lead magnet already exists for this project.

### If campaign lead magnet files exist in `./campaigns/*/`

Do not start from scratch. Instead:

1. Read the existing lead magnet files.
2. Present a summary of what exists:
   ```
   Existing lead magnet found:

   Campaign: {name}
   ├── lead-magnet.md    ✓  ({format}, {title})
   ├── brief.md          ✓  (created {date})
   └── landing-page.md   {✓/✗}

   "{Lead magnet title}"
   Format: {format}
   Hook: "{hook}"
   ```
3. Ask: "Do you want to revise this magnet, create a new one, or generate additional concepts?"
   - **Revise** -- load existing content, identify weak spots, rewrite sections
   - **New** -- create an entirely different lead magnet for a different audience segment or offer
   - **Additional concepts** -- generate more options alongside the existing one

### If no lead magnet files exist

Proceed directly to concept generation using the methodology below.

---

## The Core Job

When someone asks for lead magnet ideas, the goal is to surface **multiple compelling concepts** they can choose from -- each with a clear hook, format, and bridge to their paid offer.

Every business has several valid lead magnet approaches. The question is which one best matches their audience, business model, and offer.

Output format: **3-5 distinct lead magnet concepts**, each with:
- The concept (what it is, in one sentence)
- The format (quiz, PDF, calculator, challenge, template, etc.)
- The hook (why someone would want this badly enough to give their email)
- The bridge (how it naturally leads to the paid offer)
- Implementation notes (difficulty level, resources needed)

---

## Before Generating: Understand the Context

### Step 1: Identify the business type

Different business types have different optimal lead magnet formats:

**Info Products (courses, memberships, coaching):**
- Quizzes and assessments work exceptionally well
- Challenges (5-day, 7-day) build momentum and community
- PDF frameworks that solve one specific problem
- Video series that demonstrate teaching style
- Free chapters or modules as taste of full product

**SaaS (software, tools, apps):**
- Free tools or constrained versions of the product
- ROI calculators that quantify the value
- Templates that work with the product
- Checklists and implementation guides
- Free trials (not technically a "lead magnet" but same function)

**Services (agencies, consultants, freelancers):**
- Audits that reveal problems the service solves
- Assessments that diagnose the prospect's situation
- Case studies that prove capability
- Strategy sessions or consultations
- Templates that showcase methodology

### Step 2: Identify what they sell

Not the product. The transformation.

What does the customer's life look like AFTER? What pain disappears? What capability appears? What status changes?

The lead magnet should deliver a MICRO-VERSION of that same transformation.

### Step 3: Identify who they're targeting

- What's the prospect's current situation?
- What have they already tried?
- What do they believe about the problem?
- What would make them say "this is exactly what I needed"?

If `audience.md` exists in brand memory, use it. If not, ask these questions before generating concepts.

---

## The Lead Magnet Framework

### The Specificity Principle

**Narrow beats broad. Every time.**

"5-Step Framework to Land Your First 10 Clients in 30 Days (Even If You Hate Networking)" converts dramatically better than "Marketing Guide for Freelancers."

Why? Specificity signals:
1. This was made for someone exactly like me
2. The creator deeply understands my situation
3. This isn't generic advice I could find anywhere

When generating concepts, always push toward specificity:
- Specific outcome (not "grow your business" but "add $10k MRR")
- Specific timeframe (not "eventually" but "in 30 days")
- Specific audience (not "entrepreneurs" but "B2B SaaS founders")
- Specific method (not "marketing tips" but "The LinkedIn DM Framework")

### The Bridge Principle

**The lead magnet must logically connect to the paid offer.**

If someone downloads a lead magnet about Instagram growth and you sell SEO services, there's no bridge. You've attracted people interested in the wrong thing.

The best lead magnets are "Step 1" of what you sell:
- Course on copywriting -> Lead magnet: "The Headline Formula" (first skill taught in course)
- Agency doing SEO audits -> Lead magnet: Free mini-audit (demonstrates what full audit reveals)
- Coach on productivity -> Lead magnet: "Morning Routine Builder" (taste of coaching methodology)

The bridge should be obvious: "If you liked this free thing, the paid thing is more/deeper/complete."

### The Quick Win Principle

**Solve one specific problem completely.**

Prospects want immediate, actionable value. A lead magnet that requires weeks of study before generating results feels like homework, not a gift.

The best lead magnets deliver a quick win:
- A checklist they can complete in 10 minutes that reveals gaps
- A template they can customize in an hour for their business
- An assessment that gives them a score and action items immediately
- A calculator that shows them their specific numbers right now

Quick wins create reciprocity. When someone thinks "I couldn't have created this myself," they're primed to value your paid offer.

### The Value Equation

Apply Hormozi's value equation to lead magnet concepts:

**Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort)**

Maximize:
- **Dream Outcome:** What's the transformation this lead magnet promises?
- **Perceived Likelihood:** Why will THIS work when other things haven't?

Minimize:
- **Time Delay:** How fast do they see results? (Immediate beats weeks)
- **Effort:** How easy is it to consume and implement? (5-minute checklist beats 50-page guide)

---

## The Format Selection Framework

### When to use each format:

**Quizzes/Assessments**
Best for: Personalization, segmentation, transformation-focused offers
Examples: "What's Your Marketing Personality?", "Find Your Ideal Client Avatar"
Why it works: People love learning about themselves; provides segmentation data
Difficulty: Medium (needs quiz tool, logic branching)

**PDF Guides/Frameworks**
Best for: Establishing authority, comprehensive solutions, complex topics
Examples: "The Ultimate Guide to X", "7-Step Framework for Y"
Why it works: Perceived high value, easy to create, works across all business types
Difficulty: Low (just need content and design)

**Checklists/Templates**
Best for: Quick wins, immediate utility, showcasing methodology
Examples: "Launch Day Checklist", "Content Calendar Template"
Why it works: Immediate actionability, low friction to consume
Difficulty: Low

**Calculators/Tools**
Best for: SaaS, financial services, ROI-focused offers
Examples: "ROI Calculator", "Pricing Calculator", "Savings Estimator"
Why it works: Personalized output, demonstrates tangible value
Difficulty: Medium-High (needs development)

**Challenges (5-day, 7-day, etc.)**
Best for: Community building, transformation offers, coaching
Examples: "5-Day List Building Challenge", "7-Day Productivity Sprint"
Why it works: Creates engagement, builds habit, demonstrates results
Difficulty: Medium (needs email sequence, possibly community)

**Video Series/Mini-Courses**
Best for: Demonstrating teaching style, complex topics, high-ticket offers
Examples: "3-Part Video Training", "Free Masterclass"
Why it works: Builds relationship, showcases expertise deeply
Difficulty: Medium (needs video production)

**Free Audits/Assessments**
Best for: Services, agencies, consultants
Examples: "Free Website Audit", "Marketing Assessment"
Why it works: Reveals problems you solve, demonstrates expertise
Difficulty: Medium (needs time investment per lead)

**Swipe Files/Resource Lists**
Best for: Creative industries, marketing, copywriting
Examples: "50 High-Converting Headlines", "The Ultimate Tool Stack"
Why it works: Massive perceived value, immediately useful
Difficulty: Low

---

## The Hook Generators

Every lead magnet needs a hook -- the reason someone would want it badly enough to give their email.

### Hook Type 1: The Shortcut
"Get the [outcome] without [usual pain/time/effort]"
> "The 5-Minute Morning Routine That Replaced My 2-Hour Gym Sessions"

### Hook Type 2: The Secret
"The [hidden thing] that [impressive result]"
> "The Pricing Secret That Doubled My Agency's Revenue"

### Hook Type 3: The System
"The [named method] for [specific outcome]"
> "The PASTOR Framework: Write Sales Pages in 30 Minutes"

### Hook Type 4: The Specific Number
"[Number] [things] to [outcome]"
> "7 Email Subject Lines That Get 40%+ Open Rates"

### Hook Type 5: The Assessment
"Discover your [type/score/level]"
> "What's Your Entrepreneur Personality Type? Take the 2-Minute Quiz"

### Hook Type 6: The Transformation
"How to go from [painful current state] to [desired outcome]"
> "From Stuck at $5k/month to Consistent $20k Months: The Roadmap"

### Hook Type 7: The Case Study
"How [specific person/company] achieved [specific result]"
> "How Sarah Built a 10,000-Person Email List in 90 Days (And You Can Too)"

---

## Concept Output Format

When generating lead magnet concepts, present them using the numbered options template from `_system/output-format.md`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  LEAD MAGNET CONCEPTS
  Generated {Month Day, Year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BRAND CONTEXT

  ├── Voice Profile     {✓/✗} {summary}
  ├── Positioning       {✓/✗} {summary}
  ├── Audience          {✓/✗} {summary}
  └── Learnings         {✓/✗} {summary}

  ──────────────────────────────────────────────

  COMPETITIVE LANDSCAPE

  Competitor lead magnets found:
  ├── {Competitor A}  "{title}" ({format})
  ├── {Competitor B}  "{title}" ({format})
  └── {Competitor C}  "{title}" ({format})

  Gap: {what no one is offering}
  Overdone: {what everyone is doing}
  Opportunity: {where to differentiate}

  ──────────────────────────────────────────────

  ① {CONCEPT NAME}                  ★ recommended
  "{The hook headline}"
  Format: {format type}
  Bridge: {how it connects to paid offer}
  Effort: {low/medium/high} ({what's needed})
  → Best for: {situation or channel}

  ──────────────────────────────────────────────

  ② {CONCEPT NAME}
  "{The hook headline}"
  Format: {format type}
  Bridge: {how it connects to paid offer}
  Effort: {low/medium/high} ({what's needed})
  → Best for: {situation or channel}

  ──────────────────────────────────────────────

  ③ {CONCEPT NAME}
  "{The hook headline}"
  Format: {format type}
  Bridge: {how it connects to paid offer}
  Effort: {low/medium/high} ({what's needed})
  → Best for: {situation or channel}

  ──────────────────────────────────────────────

  ...continue for 3-5 total concepts...

  ──────────────────────────────────────────────

  QUICK PICK
  ★ Concept ①: "{Recommended concept name}"
    → Format: {format type}
    → Why: {one-sentence rationale}

  All concepts detailed above. Pick one to build.

  ──────────────────────────────────────────────

  WHAT'S NEXT

  Pick a concept and I'll build it:

  → "Build ①"    I'll write the full lead magnet
  → "Build ②"    I'll write the full lead magnet
  → "Tweak ③"    Adjust before building
  → "More ideas"  Generate 3 more concepts

  Or tell me what you're working on and
  I'll route you.
```

---

## Build Mode

This is the v2 upgrade. After the user selects a concept, this skill enters BUILD MODE and actually writes the lead magnet content. Not just the idea -- the thing itself.

### Build Mode Activation

Build mode activates when the user says:
- "Build 1" / "Build ①" / "Let's go with concept 1"
- "Write the checklist" / "Create the template" / "Build the guide"
- Any clear selection of a concept from the options presented

### Build Process

1. **Confirm the selection** -- restate the concept, hook, and format.
2. **Gather any missing details** -- if the concept requires specific inputs the user has not provided (industry data, product details, pricing tiers), ask now.
3. **Write the content** -- produce the full lead magnet content based on format type.
4. **Save to disk** -- write to `./campaigns/{magnet-name}/lead-magnet.md`.
5. **Create campaign brief** -- write `./campaigns/{magnet-name}/brief.md`.
6. **Update assets registry** -- append to `./brand/assets.md`.
7. **Offer funnel chain** -- suggest the next skills in the funnel.

### Build Output by Format Type

#### Checklists

Write the complete checklist with:
- Title and subtitle with the hook
- Introduction paragraph (2-3 sentences) explaining what this checklist covers and why it matters
- Numbered or grouped checklist items (aim for 10-25 items)
- Each item has: the action, a one-sentence explanation of why it matters, and a quick-tip or gotcha
- Items grouped by phase or category with section headers
- A "quick start" callout: which 3 items to do first for immediate results
- A bridge section at the end: "Now that you've completed this checklist, here's the next step..."
- CTA that connects to the paid offer

**Example structure:**
```markdown
# [Checklist Title]: [Hook Subtitle]

[2-3 sentence intro explaining the value]

## Phase 1: [Category Name]

- [ ] **[Action item]**
  [Why this matters + quick tip]

- [ ] **[Action item]**
  [Why this matters + quick tip]

...

## Quick Start

If you only do 3 things right now:
1. [Most impactful item]
2. [Second most impactful]
3. [Quick win]

## What's Next

[Bridge paragraph connecting to paid offer]
[Soft CTA]
```

#### Templates

Write the complete template with:
- Title and instructions for how to use it
- The actual template with fill-in sections using [BRACKETS] for user input
- Example fills showing what good responses look like
- Section-by-section guidance explaining what to put in each field
- A completed example showing the template fully filled out
- Bridge section connecting to the paid offer

#### Guides (Mini-Guides / Frameworks)

Write the complete guide with:
- Title and hook subtitle
- Executive summary / TL;DR (3-5 bullet points)
- 3-7 sections, each covering one key concept or step
- Each section includes: the principle, why it matters, how to implement it, and an example
- Actionable takeaways after each section
- A "put it all together" section showing how the pieces connect
- Bridge section connecting to the paid offer

#### Quizzes

Write the complete quiz with:
- Quiz title and description
- 7-15 questions, each with 3-5 answer options
- Scoring logic: how to calculate the result
- 3-5 result profiles/types with:
  - Profile name and description
  - Key characteristics
  - Specific recommendations based on the profile
  - Bridge to paid offer tailored to each profile
- Implementation notes for quiz tools (Typeform, ScoreApp)

#### Swipe Files / Resource Collections

Write the complete swipe file with:
- Title and hook
- Introduction explaining how to use the swipe file
- 20-50+ items organized by category
- Each item includes: the example, source/context, and why it works
- Usage tips for adapting each example
- Bridge section connecting to the paid offer

#### Challenges (Multi-Day)

Write the complete challenge outline with:
- Challenge title, hook, and promise
- Day-by-day breakdown including:
  - Daily topic/theme
  - Daily action/task (specific and completable in 15-30 minutes)
  - Key teaching point for the day
  - Success metric (how they know they did it right)
- Community engagement prompts for each day
- Day-by-day email subject lines
- Final day bridge to paid offer
- Note: The actual daily emails should be created with /email-sequences

#### Calculators / Tools

Write the specification with:
- Calculator title and purpose
- Input fields: what the user enters, with labels, placeholders, and validation rules
- Calculation logic: the formulas, step by step
- Output format: what the user sees, how results are displayed
- Interpretation guide: what different results mean
- Bridge: how different result ranges connect to the paid offer
- Implementation notes: recommended tools (spreadsheet formula, web calculator)
- A spreadsheet-ready version with formulas if applicable

---

## File Output

Every lead magnet is written to disk in the campaign directory structure.

### Directory Structure

```
./campaigns/{magnet-name}/
  lead-magnet.md                 <- The actual lead magnet content
  brief.md                       <- Campaign brief
```

### Magnet Name Convention

Use lowercase-kebab-case derived from the concept name:
- "The Cold Email Kit" -> `cold-email-kit`
- "7-Step Launch Checklist" -> `7-step-launch-checklist`
- "What's Your Marketing Type? Quiz" -> `marketing-type-quiz`

### Lead Magnet File Format

```markdown
---
title: "{Lead Magnet Title}"
subtitle: "{Hook subtitle}"
format: {checklist/template/guide/quiz/swipe-file/challenge/calculator}
hook: "{The one-line hook}"
bridge_to: "{Paid offer name}"
target_audience: "{Who this is for}"
estimated_consumption_time: "{5 min / 15 min / 30 min}"
status: draft
created_by: /lead-magnet
created_date: {YYYY-MM-DD}
---

# {Lead Magnet Title}

{Full lead magnet content here -- varies by format type}
```

### Campaign Brief Format

Every lead magnet gets a `brief.md` in the campaign directory. This follows the standard campaign brief format from `_system/brand-memory.md`:

```markdown
# Campaign: {Magnet Name}

## Goal
{What this lead magnet accomplishes, with a metric if possible}

## Format
{Checklist / Template / Guide / Quiz / Swipe File / Challenge / Calculator}

## Hook
"{The headline/promise}"

## Target Audience
{Who this is for -- from ./brand/audience.md or user input}

## Bridge to Paid Offer
{How consuming this lead magnet naturally leads to wanting the paid product}

## Paid Offer
{What we are eventually selling, at what price}

## Competitive Differentiation
{How this differs from competitor lead magnets found in research}

## Distribution Plan
{Where this lead magnet will be promoted -- landing page, social, ads, content upgrades}

## Status
draft

## Voice Notes
{Any lead-magnet-specific voice adjustments from ./brand/voice-profile.md}
```

---

## Build Mode Output Template

After building the lead magnet content, display the full output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  LEAD MAGNET BUILT
  Generated {Month Day, Year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "{Lead Magnet Title}"
  Format: {format}
  Hook: "{hook headline}"
  Audience: {target audience}
  Consumption time: {estimated time}

  ──────────────────────────────────────────────

  CONTENT SUMMARY

  {Format-specific summary, e.g.:}

  For checklists:
  ├── {N} items across {N} categories
  ├── Quick-start section (top 3 items)
  └── Bridge section to paid offer

  For guides:
  ├── {N} sections covering {topics}
  ├── Executive summary included
  └── Bridge section to paid offer

  For quizzes:
  ├── {N} questions with {N} answer options each
  ├── {N} result profiles
  ├── Scoring logic defined
  └── Per-profile bridge to paid offer

  ──────────────────────────────────────────────

  BRIDGE LOGIC

  Lead magnet delivers: {micro-transformation}
  This creates desire for: {paid offer}
  Bridge: "{one-sentence connection}"

  ──────────────────────────────────────────────

  FILES SAVED

  ./campaigns/{name}/lead-magnet.md    ✓ (new)
  ./campaigns/{name}/brief.md          ✓ (new)
  ./brand/assets.md                    ✓ (appended)

  ──────────────────────────────────────────────

  WHAT'S NEXT

  Your lead magnet is written. Before distributing:

  → /creative              Build it — PDF layout, cover
                           design, or template (~15 min)
  → "Skip visuals"         Continue to funnel ↓

  ──────────────────────────────────────────────

  → /direct-response-copy  Write the landing page
                           to capture emails (~20 min)
  → /email-sequences       Build the delivery +
                           welcome sequence (~15 min)
  → /content-atomizer      Create social content to
                           promote the magnet (~15 min)
  → "Revise"               Edit specific sections

  Or tell me what you're working on and
  I'll route you.

  ──────────────────────────────────────────────

  FEEDBACK

  Before I close out:

  1. Does this lead magnet feel genuinely valuable?
     (Would your audience actually want this?)

  2. Does the bridge to your paid offer feel natural?
     (If forced, I can adjust the angle.)

  3. Is the scope right?
     (Too long? Too short? Wrong depth?)
```

---

## Funnel Chain

After building a lead magnet, the natural next steps form a funnel. Always suggest chaining to these skills:

### Chain 1: Landing Page

**Skill:** `/direct-response-copy`
**Why:** The lead magnet needs a landing page to capture emails. The landing page copy should be built around the lead magnet's hook, target audience, and value proposition.
**Handoff:** Pass the lead magnet title, hook, format, target audience, and bridge logic.
**Prompt:** "Your lead magnet is ready, but it needs a landing page to capture emails. Want me to write the opt-in page? Just say /direct-response-copy."

### Chain 2: Email Sequence

**Skill:** `/email-sequences`
**Why:** After someone downloads the lead magnet, they need a welcome sequence that delivers it, builds trust, and bridges to the paid offer.
**Handoff:** Pass the lead magnet name, format, bridge logic, and paid offer details. The email sequence skill will check for this lead magnet in `./brand/assets.md`.
**Prompt:** "Now you need emails to deliver the lead magnet and convert subscribers. Want me to build the welcome sequence? Just say /email-sequences."

### Chain 3: Social Promotion

**Skill:** `/content-atomizer`
**Why:** The lead magnet needs traffic. The content atomizer can turn the lead magnet's value proposition into social posts that drive opt-ins.
**Handoff:** Pass the lead magnet content file as source material.
**Prompt:** "Your lead magnet needs subscribers. Want me to create social content to promote it? Just say /content-atomizer."

### Chain Sequence Display

After building, show the funnel chain:

```
  FUNNEL CHAIN

  You have the lead magnet. Here is the full
  funnel if you want to build it end-to-end:

  ① Lead Magnet        ✓ built (this step)
  ② Landing Page       → /direct-response-copy
  ③ Email Sequence     → /email-sequences
  ④ Social Promotion   → /content-atomizer

  Build the next piece or run them all in order.
```

---

## Example: Lead Magnets for a Copywriting Course

### Context
- Product: $997 copywriting course for freelancers
- Transformation: Go from struggling writer to $10k+/month copywriter
- Audience: Aspiring or early-stage freelance copywriters
- Business type: Info product

### Lead Magnet Options

**Concept 1: The Headline Swipe File**
- The concept: Collection of 100+ proven headlines organized by type with analysis of why each works
- Format: PDF swipe file
- The hook: "100 Proven Headlines That Generated Millions (Steal Them)"
- The bridge: Headlines are the first skill taught in the course; demonstrates the "why behind what works" teaching style
- Implementation: Low difficulty; compile and design

**Concept 2: The Copywriter Income Quiz**
- The concept: 10-question assessment that diagnoses what's holding them back from higher income
- Format: Interactive quiz
- The hook: "Why Aren't You Making $10k/Month as a Copywriter? Take the 2-Minute Quiz"
- The bridge: Quiz results reveal specific gaps the course addresses; segmentation enables personalized follow-up
- Implementation: Medium difficulty; needs quiz tool (Typeform, ScoreApp)

**Concept 3: The First Client Framework**
- The concept: Step-by-step PDF showing exactly how to land the first (or next) $1,000 client
- Format: PDF framework
- The hook: "The 5-Step Framework to Land Your First $1,000 Client This Week"
- The bridge: Getting clients is a key module; this is the "quick start" version that proves the methodology
- Implementation: Low difficulty; write and design

**Concept 4: The 5-Day Copy Challenge**
- The concept: Daily email challenge where they write one piece of copy each day with feedback
- Format: Email challenge
- The hook: "5 Days to Better Copy: A Free Challenge for Aspiring Copywriters"
- The bridge: Challenge demonstrates teaching style, builds relationship, ends with course offer
- Implementation: Medium difficulty; needs 5 emails + daily prompts

**Concept 5: The Pricing Calculator**
- The concept: Tool that helps them calculate what to charge based on project type, experience, and market
- Format: Interactive calculator/spreadsheet
- The hook: "Stop Undercharging: The Copywriter Pricing Calculator"
- The bridge: Pricing is a major pain point; calculator demonstrates expertise on business side of copywriting
- Implementation: Medium difficulty; needs spreadsheet or simple tool

**Recommended starting point:** Concept 1 (Headline Swipe File) for fastest implementation with high perceived value, or Concept 2 (Income Quiz) if segmentation and personalized follow-up is a priority.

---

## Example: Build Mode Output for a Checklist

If the user selects a checklist concept, here is what the build output looks like. This demonstrates the full content that gets written to `./campaigns/{name}/lead-magnet.md`.

### Context
- Concept selected: "The Launch Day Checklist"
- Hook: "The 27-Point Launch Checklist That Turned My Last 3 Launches Into $50k+ Days"
- Bridge: Checklist covers launch basics -> course covers the full launch system

### Built Content (abbreviated)

```markdown
---
title: "The Launch Day Checklist"
subtitle: "27 Points That Turned My Last 3 Launches Into $50k+ Days"
format: checklist
hook: "The 27-Point Launch Checklist That Turned My Last 3 Launches Into $50k+ Days"
bridge_to: "The Launch System ($997)"
target_audience: "Course creators and coaches planning their first or next launch"
estimated_consumption_time: "15 min to read, 2-4 hours to complete"
status: draft
created_by: /lead-magnet
created_date: 2026-02-16
---

# The Launch Day Checklist
## 27 Points That Turned My Last 3 Launches Into $50k+ Days

You are about to launch something. That means you are about to feel the urge to "just one more thing" your way into paralysis. This checklist exists to prevent that. Every item here is something I verify before every launch. Miss any of them and you leave money on the table.

## Quick Start

If your launch is in 48 hours and you are reading this in a panic, do these three things first:

1. Verify your checkout page works end-to-end (item 15)
2. Confirm your email sequence is loaded and tested (item 8)
3. Test your primary CTA link on mobile (item 16)

Everything else matters, but those three prevent launch-day disasters.

## Pre-Launch Foundation (7 days before)

- [ ] **Sales page is live and reviewed by someone who is NOT you**
  Fresh eyes catch what you can't. Send it to one person and ask "what's confusing?" Not "what do you think?" -- that gets you compliments, not corrections.

- [ ] **Pricing finalized and tested in checkout**
  Change your price after launch and you erode trust. Decide now. Test a real transaction (refund yourself after).

- [ ] **Email sequence loaded into ESP with correct triggers**
  Every email, every delay, every link. Send yourself through the entire sequence. Open every link. Reply to at least one email to make sure replies work.

...

## What's Next

You have launched. You have data. The checklist got you to launch day -- but the difference between a $10k launch and a $100k launch is the system behind it.

The Launch System covers everything this checklist touches on, but deeper: audience building, pre-launch runway, cart-open sequences, objection handling, and post-launch follow-up.

If this checklist helped, the full system is here: [LINK]
```

---

## How This Skill Gets Invoked

This skill activates when:
- User asks "what lead magnet should I create for X"
- User asks "how do I build my email list"
- User asks for "top of funnel ideas" or "freebie ideas"
- User asks "what should I give away for free"
- User needs to grow their audience before launching
- User asks to "create a lead magnet" or "build a checklist"
- User asks to "write a template" or "create a guide"
- Landing page skill needs a lead magnet offer to convert to
- Email sequence skill needs a lead magnet to deliver

When another skill needs a lead magnet, this skill can provide the concept AND the built content that informs downstream work.

---

## What This Skill Does (v2)

This skill generates lead magnet CONCEPTS and then BUILDS the selected one:

Phase 1 -- Concept Generation:
- Research competitor lead magnets via web search
- Generate 3-5 distinct concepts with hooks, formats, and bridges
- Score and recommend the best starting point

Phase 2 -- Build Mode:
- Write the actual lead magnet content (not just the idea)
- For checklists: write the checklist items with explanations
- For templates: write the template with fill-in sections and examples
- For guides: write the guide sections with principles and examples
- For quizzes: write the questions, scoring logic, and result profiles
- For swipe files: write the curated collection with analysis
- For challenges: write the day-by-day outline with actions
- For calculators: write the specification with formulas

Phase 3 -- File Output:
- Save lead magnet content to ./campaigns/{magnet-name}/lead-magnet.md
- Save campaign brief to ./campaigns/{magnet-name}/brief.md
- Append to ./brand/assets.md

Phase 4 -- Funnel Chain:
- Offer to chain to /direct-response-copy for landing page
- Offer to chain to /email-sequences for delivery + welcome
- Offer to chain to /content-atomizer for social promotion

---

## The Test

Before delivering concepts, verify each one:

1. **Is it specific?** Vague lead magnets (like "Marketing Tips") fail. Specific ones convert.

2. **Does it solve one problem completely?** Not a teaser -- a genuine quick win.

3. **Is the bridge obvious?** Can you see how consuming this leads to wanting the paid offer?

4. **Would the target audience actually want this?** Not "should want" -- ACTUALLY want, right now.

5. **Is it feasible to create?** Match implementation difficulty to available resources.

Before delivering built content, also verify:

6. **Is the content genuinely valuable?** Would someone share this with a colleague?

7. **Does it deliver the promised quick win?** Can someone get results within the estimated consumption time?

8. **Is the bridge section natural, not forced?** The transition to paid offer should feel like a logical next step, not a sales pitch.

9. **Is the voice consistent?** If brand voice was loaded, does every section match it?

10. **Is it the right length?** Long enough to be valuable, short enough to be consumed. Checklists: 10-25 items. Guides: 1500-3000 words. Quizzes: 7-15 questions.

---

## Recording Feedback

After delivering the built lead magnet, present the feedback prompt from the build mode output template. Process responses per `_system/brand-memory.md`:

### If "Great -- shipped as-is"
- Log to `./brand/learnings.md` under "What Works":
  ```
  - [YYYY-MM-DD] [/lead-magnet] {format} lead magnet shipped as-is. Title: "{title}". Hook: "{hook}". Angle: {angle used}.
  ```
- Confirm the entry in `./brand/assets.md`.

### If "Good -- minor edits"
- Ask: "What did you change? Even small details help me improve next time."
- Log the change to `./brand/learnings.md`:
  ```
  - [YYYY-MM-DD] [/lead-magnet] User edited {format} magnet. Change: {description}. Note: {implication for future magnets}.
  ```
- If edits reveal a voice mismatch, suggest: "Sounds like the voice might need tuning. Want to re-run /brand-voice?"

### If "Rewrote significantly"
- Ask: "Can you share what you changed or paste the final version? I'll learn from the diff."
- If they share, analyze the differences and log specific findings.
- If the rewrite reveals a pattern, suggest re-running /brand-voice.
  ```
  - [YYYY-MM-DD] [/lead-magnet] User rewrote {format} magnet significantly -- shifted from {original approach} to {new approach}. Voice profile may need update.
  ```

### If "Haven't used yet"
- Note it. Do not log anything to learnings.md yet.
- Optionally remind them next time: "Last time I created a {format} lead magnet for you. Did you ever launch it? I'd love to know how it performed."

---

## How This Connects to Other Skills

**lead-magnet uses:**
- **brand-voice** -- Ensures lead magnet copy matches brand tone
- **positioning-angles** -- The positioning angle informs the hook and bridge
- **audience-research** -- Audience data shapes format choice and language
- **competitive-intel** -- Competitor data from brand memory supplements web research

**lead-magnet feeds:**
- **direct-response-copy** -- The landing page is built around the lead magnet's hook and value proposition
- **email-sequences** -- The welcome sequence delivers the lead magnet and bridges to the offer
- **content-atomizer** -- Social content promotes the lead magnet to drive opt-ins
- **newsletter** -- Lead magnet insights can inform newsletter content strategy

**The flow:**
1. **lead-magnet** generates concepts and builds the asset
2. **direct-response-copy** writes the opt-in landing page
3. **email-sequences** builds the delivery + welcome + conversion path
4. **content-atomizer** creates social promotion content
5. Subscriber opts in -> receives lead magnet -> gets nurtured -> becomes customer

---

## References

For deeper frameworks, see the `references/` folder:
- `format-examples.md` -- Best-in-class examples by format type
- `info-product-magnets.md` -- Russell Brunson, Amy Porterfield, and info product approaches
- `saas-magnets.md` -- HubSpot, Ahrefs, and SaaS-specific patterns
- `services-magnets.md` -- Agency and consulting lead magnet strategies
- `psychology.md` -- The psychology behind why lead magnets convert

---
---

# Appendix: Quick-Reference Checklists

## Pre-Generation Checklist

Before generating concepts, confirm:

- [ ] Brand memory loaded (or noted as absent)
- [ ] Business type identified (info product, SaaS, services)
- [ ] Paid offer identified (product, price, transformation)
- [ ] Target audience identified (from brand memory or user input)
- [ ] Competitive research completed (web search for competitor magnets)
- [ ] Existing lead magnet check done (iteration detection)

## Per-Concept Checklist

For each concept generated, verify:

- [ ] Specific outcome named (not vague)
- [ ] Format selected with rationale
- [ ] Hook uses one of the 7 hook types
- [ ] Bridge to paid offer is obvious and natural
- [ ] Implementation difficulty is realistic
- [ ] Differentiates from competitor magnets found in research
- [ ] Matches audience preference from brand memory

## Build Mode Checklist

Before delivering built content, verify:

- [ ] Content is genuinely valuable (not a teaser)
- [ ] Quick win is achievable within estimated consumption time
- [ ] Voice matches brand profile (if loaded)
- [ ] Bridge section feels natural, not forced
- [ ] Length is appropriate for format type
- [ ] Frontmatter is complete and accurate
- [ ] File saved to ./campaigns/{magnet-name}/lead-magnet.md
- [ ] Campaign brief saved to ./campaigns/{magnet-name}/brief.md
- [ ] assets.md updated with lead magnet entry
- [ ] FILES SAVED section lists every file
- [ ] WHAT'S NEXT section offers funnel chain options
- [ ] Feedback prompt presented

## Post-Build Funnel Checklist

After building, verify funnel chain was offered:

- [ ] /direct-response-copy suggested for landing page
- [ ] /email-sequences suggested for delivery + welcome sequence
- [ ] /content-atomizer suggested for social promotion
- [ ] Funnel chain visualization displayed
- [ ] Each chain includes estimated time
