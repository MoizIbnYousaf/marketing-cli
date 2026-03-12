---
name: positioning-angles
description: "Find the angle that makes something sell. Use when launching a product, creating a lead magnet, writing a landing page, crafting an offer, or when marketing isn't converting. Searches competitor messaging to map the saturated landscape, loads brand memory for context-aware positioning, then generates 3-5 distinct angles with a starred recommendation. Writes chosen angle to ./brand/positioning.md and optionally seeds a 12-ad testing matrix. Triggers on: find angles for X, how should I position X, what's the hook, why isn't this selling, make this stand out, differentiate this, or when copy/landing page work needs a strong angle first."
---

# Positioning & Angles

The same product can sell 100x better with a different angle. Not a different product. Not better features. Just a different way of framing what it already does.

This skill finds those angles.

---

## Brand memory integration

Read `./brand/` per `_system/brand-memory.md`

**Reads:** `audience.md`, `competitors.md` (if they exist)

On invocation, check for `./brand/` and load available context:

1. **Check for `./brand/positioning.md`** -- if it exists, this is an update session:
   - Read the existing positioning file
   - Display the current primary angle and any saved alternatives
   - Ask: "You already have positioning on file. Do you want to refine it with fresh data, or start from scratch?"
   - "Refine" -- load existing angles, run competitive search for new data, suggest adjustments to current positioning based on what has changed in the market
   - "Start fresh" -- run the full process below as if no positioning exists

2. **Load `audience.md`** (if exists):
   - Use audience segments, pain points, and language patterns to inform angle generation
   - Show: "I see your audience profile -- [brief summary]. Using that to shape angles."

3. **Load `competitors.md`** (if exists):
   - Use known competitors as starting seeds for the competitive web search step
   - Show: "I found [N] competitors in your brand memory. Starting search from there."

4. **Load `voice-profile.md`** (if exists):
   - Use voice DNA to ensure angle language matches brand tone
   - Show: "Your voice is [tone summary]. Angles will match that register."

5. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Note in opening message: "No brand profile found — this skill works standalone. I'll ask what I need. You can run /start-here or /brand-voice later to unlock personalization."

---

## The core job

When someone asks about positioning or angles, the goal is not to find THE answer. It is to surface **multiple powerful options** they can choose from.

Every product has several valid angles. The question is which one resonates most with the specific audience at the specific moment.

Output format: **3-5 distinct angle options**, numbered with circled numbers, each with:
- Statement (one sentence positioning)
- Psychology (why this works with this audience)
- Headline direction (how it would sound in copy)
- Best for (market conditions, audience segments)
- One option marked with ★ recommended

---

## The angle-finding process

### Step 1: Identify what they are actually selling

Not the product. The transformation.

Ask: What does the customer's life look like AFTER? What pain disappears? What capability appears? What status changes?

A fitness program does not sell workouts. It sells "fit into your old jeans" or "keep up with your kids" or "look good naked."

A SaaS tool does not sell features. It sells "close your laptop at 5pm" or "never lose a lead" or "stop the spreadsheet chaos."

**The transformation is the raw material for angles.**

---

### Step 2: Map the competitive landscape

What would customers do if this did not exist? Not competitors -- alternatives.

- Do nothing (live with the problem)
- DIY (cobble together a solution)
- Hire someone (consultant, freelancer, agency)
- Buy a different category (different approach entirely)
- Buy a direct competitor

Each alternative has weaknesses. Those weaknesses become angle opportunities.

**Angle opportunity:** What is frustrating about each alternative that this solves?

---

### Step 2.5: Competitive web search (live data)

Before generating angles, search the web for real competitor messaging. This grounds the angle work in current market reality rather than assumptions.

**Search process:**

1. **Identify search targets:**
   - If `./brand/competitors.md` exists, start with those competitor names and URLs
   - If the user named competitors, search those
   - Otherwise, search for "[product category] + [target market]" to find the top players

2. **Pull messaging data from competitor sites:**
   - Homepage headlines and hero copy
   - Taglines and value propositions
   - Key claims on feature/pricing pages
   - Social proof framing (how they present testimonials)
   - CTA language

3. **Map the landscape:**
   - What claims appear on 3+ competitor sites (saturated territory)
   - What angles only 1 competitor uses (partially claimed)
   - What angles NO competitor uses (white space)
   - What proof/mechanism language dominates the space

4. **Present findings as a competitive landscape map:**

```
──────────────────────────────────────────────────

  COMPETITIVE MESSAGING LANDSCAPE

──────────────────────────────────────────────────

  Competitors Analyzed
  ├── [Competitor 1] -- "[their headline]"
  ├── [Competitor 2] -- "[their headline]"
  ├── [Competitor 3] -- "[their headline]"
  └── [Competitor 4] -- "[their headline]"

  ──────────────────────────────────────────────

  Saturated Claims (everyone says this)
  ├── "[Claim 1]"
  ├── "[Claim 2]"
  └── "[Claim 3]"

  Partially Claimed (1-2 competitors)
  ├── "[Claim]" -- used by [Competitor]
  └── "[Claim]" -- used by [Competitor]

  Underexploited Territory
  ├── Nobody is talking about [gap 1]
  ├── The [specific angle] is wide open
  └── [Niche audience] has no champion

──────────────────────────────────────────────────
```

**Why this matters:** Angles built on white space outperform angles that echo the market. If every competitor says "all-in-one platform," that phrase is dead. The competitive search reveals what NOT to say and where opportunity lives.

---

### Step 3: Find the unique mechanism

The mechanism is HOW the product delivers results differently.

Not "we help you lose weight" (that is the promise).
"We help you lose weight through intermittent fasting optimized for your metabolic type" (that is the mechanism).

The mechanism makes the promise believable. It answers: "Why will this work when other things have not?"

**Questions to surface the mechanism:**
- What is the proprietary process, method, or system?
- What do you do differently than the obvious approach?
- What is the counterintuitive insight that makes this work?
- What is the "secret" ingredient, step, or element?

Even if nothing is truly proprietary, there is always a mechanism. Name it.

---

### Step 4: Assess market sophistication

Where is the market on Schwartz's awareness scale?

**Stage 1 (New category):** The market has not seen this before.
  Angle: Simple announcement. "Now you can [do thing]."

**Stage 2 (Growing awareness):** Competition exists, market is warming.
  Angle: Claim superiority. "The fastest/easiest/most complete way to [outcome]."

**Stage 3 (Crowded):** Many players, similar claims, skepticism rising.
  Angle: Explain the mechanism. "Here is WHY this works when others do not."

**Stage 4 (Jaded):** Market has seen everything, needs new frame.
  Angle: Identity and belonging. "For people who [identity marker]."

**Stage 5 (Iconic):** Established leaders, brand loyalty matters.
  Angle: Exclusive access. "Join the [tribe/movement]."

**The market stage determines which angle TYPE will work.**

---

### Step 5: Run the angle generators

Now generate options using multiple frameworks. Each generator is a lens -- run the product through several and keep the 3-5 strongest options.

#### The Contrarian Angle
What does everyone in this market believe that might not be true?
Challenge that assumption directly.

> "Everything you've been told about [topic] is wrong."
> "Stop [common practice]. Here's what actually works."

Works when: Market is frustrated with conventional approaches. Audience sees themselves as independent thinkers.

#### The Unique Mechanism Angle
Lead with the HOW, not just the WHAT.
Name the proprietary process or insight.

> "The [Named Method] that [specific result]"
> "How [mechanism] lets you [outcome] without [usual sacrifice]"

Works when: Market is sophisticated (Stage 3+). Similar promises exist. Need to differentiate.

#### The Transformation Angle
Before and after. The gap between current state and desired state.

> "From [painful current state] to [desired outcome]"
> "Go from [specific bad metric] to [specific good metric] in [timeframe]"

Works when: The transformation is dramatic and specific. Market is problem-aware.

#### The Enemy Angle
Position against a common enemy (not a competitor -- a problem, a mindset, an obstacle).

> "Stop letting [enemy] steal your [valuable thing]"
> "The [enemy] is lying to you. Here's the truth."

Works when: Audience has shared frustrations. There is a clear villain to rally against.

#### The Speed/Ease Angle
Compress the time or reduce the effort.

> "[Outcome] in [surprisingly short time]"
> "[Outcome] without [expected sacrifice]"

Works when: Alternatives require significant time or effort. Speed/ease is genuinely differentiated.

#### The Specificity Angle
Get hyper-specific about who it is for or what it delivers.

> "For [very specific avatar] who want [very specific outcome]"
> "The [specific number] [specific things] that [specific result]"

Works when: Competing with generic offerings. Want to signal "this is built for YOU."

#### The Social Proof Angle
Lead with evidence, not claims.

> "[Specific result] for [number] [type of people]"
> "How [credible person/company] achieved [specific outcome]"

Works when: Have strong proof. Market is skeptical. Trust is the primary barrier.

#### The Risk Reversal Angle
Make the guarantee the headline.

> "[Outcome] or [dramatic consequence for seller]"
> "Try it for [time period]. [Specific guarantee]."

Works when: Risk is the primary objection. Confidence in delivery is high.

---

## Output format

Follow `_system/output-format.md` strictly. All output uses the four required sections: Header, Content, Files Saved, What's Next.

### Header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  POSITIONING ANGLES
  [Product/Offer Name]
  Generated [Month Day, Year]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Content: Competitive Landscape Map

Present the competitive search findings first (see Step 2.5 format above).

### Content: Market Assessment

```
  MARKET ASSESSMENT

  Sophistication: Stage [N] -- [stage name]
  Transformation: [one sentence]
  Mechanism: [the unique how]
  Primary alternative: [what they do instead]
```

### Content: Angle Options

Use numbered options with ★ recommendation per `output-format.md`:

```
  ANGLE OPTIONS

  ①  [ANGLE NAME]                     ★ recommended
     Statement: [one sentence positioning]
     Psychology: [why this works with this audience]
     Headline: "[example headline]"
     Best for: [market conditions, audience segments]

  ──────────────────────────────────────────────

  ②  [ANGLE NAME]
     Statement: [one sentence positioning]
     Psychology: [why this works with this audience]
     Headline: "[example headline]"
     Best for: [market conditions, audience segments]

  ──────────────────────────────────────────────

  ③  [ANGLE NAME]
     Statement: [one sentence positioning]
     Psychology: [why this works with this audience]
     Headline: "[example headline]"
     Best for: [market conditions, audience segments]

  ──────────────────────────────────────────────

  ④  [ANGLE NAME]
     Statement: [one sentence positioning]
     Psychology: [why this works with this audience]
     Headline: "[example headline]"
     Best for: [market conditions, audience segments]

  ──────────────────────────────────────────────

  ⑤  [ANGLE NAME]
     Statement: [one sentence positioning]
     Psychology: [why this works with this audience]
     Headline: "[example headline]"
     Best for: [market conditions, audience segments]
```

Present 3-5 options. Place ★ recommended on the single best option for their situation. After the options, include a brief rationale:

```
  ──────────────────────────────────────────────

  Why ★ [Angle Name]: [1-2 sentences explaining
  why this is the strongest fit for their market
  stage, audience, and competitive white space]
```

Then ask: "Which angle resonates? Pick a number, or tell me to combine elements from multiple."

### Files Saved

After the user selects an angle, write to `./brand/positioning.md`:

```
  FILES SAVED

  ./brand/positioning.md             ✓
```

If the file already existed and was updated:

```
  FILES SAVED

  ./brand/positioning.md             ✓ (updated)
```

### What's Next

```
  WHAT'S NEXT

  Your positioning is set. Every downstream
  skill will use this angle. Recommended moves:

  → /direct-response-copy  Write copy with your
                           winning angle (~15 min)
  → /lead-magnet           Build a lead gen
                           asset (~10 min)
  → /keyword-research      Map your content
                           territory (~15 min)

  Or tell me what you're working on and
  I'll route you.
```

---

## File output protocol

When the user selects an angle (or confirms the recommended one), write `./brand/positioning.md` with this format:

```markdown
## Last Updated
[Date] by /positioning-angles

## Primary Positioning

Angle: [Selected angle name]
Statement: [One sentence positioning]
Psychology: [Why this works]
Headline direction: "[Example headline]"
Best for: [Market conditions]

## Competitive Landscape Summary

Sophistication: Stage [N] -- [stage name]
Primary alternative: [what customers do instead]

Saturated claims:
- [Claim 1]
- [Claim 2]
- [Claim 3]

White space identified:
- [Gap 1]
- [Gap 2]

## All Angles Explored

### Angle 1: [Name] (selected)
- Statement: [...]
- Headline: "[...]"

### Angle 2: [Name]
- Statement: [...]
- Headline: "[...]"

### Angle 3: [Name]
- Statement: [...]
- Headline: "[...]"

[Continue for all angles generated]
```

**If `./brand/positioning.md` already exists:**
1. Read the existing file
2. Show the user what will change: "Your current positioning focuses on '[current angle].' The new version shifts to '[new angle].' Key changes: ..."
3. Ask for confirmation: "Replace the existing file? (y/n)"
4. Only overwrite after explicit confirmation
5. Confirm: "Updated your positioning at ./brand/positioning.md"

---

## 12-ad matrix seed (optional)

After the user selects an angle, offer:

"Want me to generate a testing matrix for this angle? I'll map 4 hooks across 3 formats for a 12-ad testing grid."

If yes, produce the matrix:

```
──────────────────────────────────────────────────

  AD TESTING MATRIX
  Angle: [selected angle name]

──────────────────────────────────────────────────

       │ Format A        │ Format B       │ Format C
       │ (Static Image)  │ (Video)        │ (Carousel)
  ─────┼─────────────────┼────────────────┼──────────────
  H1   │ MA-H1-A         │ MA-H1-B        │ MA-H1-C
       │ [hook 1 + fmt]  │ [hook 1 + fmt] │ [hook 1 + fmt]
  ─────┼─────────────────┼────────────────┼──────────────
  H2   │ MA-H2-A         │ MA-H2-B        │ MA-H2-C
       │ [hook 2 + fmt]  │ [hook 2 + fmt] │ [hook 2 + fmt]
  ─────┼─────────────────┼────────────────┼──────────────
  H3   │ MA-H3-A         │ MA-H3-B        │ MA-H3-C
       │ [hook 3 + fmt]  │ [hook 3 + fmt] │ [hook 3 + fmt]
  ─────┼─────────────────┼────────────────┼──────────────
  H4   │ MA-H4-A         │ MA-H4-B        │ MA-H4-C
       │ [hook 4 + fmt]  │ [hook 4 + fmt] │ [hook 4 + fmt]

──────────────────────────────────────────────────
```

**Matrix structure:**
- 4 rows = 4 different hooks derived from the selected angle
  - H1: The direct statement hook (lead with the claim)
  - H2: The question hook (lead with curiosity)
  - H3: The proof hook (lead with evidence)
  - H4: The contrarian hook (lead with a challenge)

- 3 columns = 3 ad formats
  - Format A: Static image (single visual + headline)
  - Format B: Video (talking head or motion + headline)
  - Format C: Carousel (multi-slide story)

**Each cell contains:**
- Cell ID (e.g., MA-H1-A) for tracking
- Hook text tailored to the format
- Visual concept (1 sentence)
- Primary text (ad body, 1-2 sentences)
- CTA text

**After generating the matrix:**
- Ask which cells to develop first
- Suggest: "Pick 3-4 cells and I can hand them to /creative for production"
- Note: "The cell IDs let you track performance back to specific hook/format combos"

---

## Example: Finding angles for a "Claude Skills Pack"

### Context
- Product: 10 marketing skills for Claude Code
- Transformation: Better marketing output without becoming a marketer
- Alternatives: Generic prompting, hiring copywriters, learning marketing yourself
- Mechanism: Skills transfer expertise through principles, not just prompts

### Competitive Landscape (example)

```
──────────────────────────────────────────────────

  COMPETITIVE MESSAGING LANDSCAPE

──────────────────────────────────────────────────

  Competitors Analyzed
  ├── PromptBase -- "Find the best prompts"
  ├── Jasper -- "AI copilot for enterprise
  │   marketing teams"
  ├── Copy.ai -- "GTM AI platform"
  └── Generic prompt packs on Gumroad

  ──────────────────────────────────────────────

  Saturated Claims
  ├── "Save hours on content creation"
  ├── "AI-powered marketing"
  └── "Generate copy in seconds"

  Partially Claimed
  ├── "Enterprise-grade" -- Jasper only
  └── "Marketplace model" -- PromptBase only

  Underexploited Territory
  ├── Nobody frames it as expertise transfer
  │   (not just prompt shortcuts)
  ├── The "methodology-inside" angle is
  │   wide open (prompts vs. principles)
  └── Solo founders/builders have no
  │   champion in this space

──────────────────────────────────────────────────
```

### Market Assessment

```
  MARKET ASSESSMENT

  Sophistication: Stage 3 -- mechanism needed
  Transformation: Better marketing output
                  without becoming a marketer
  Mechanism: Skills encode marketing
             principles, not just prompts
  Primary alternative: Generic AI prompting
                       or hiring a copywriter
```

### Angle Options

```
  ①  THE CAPABILITY TRANSFER              ★ recommended
     Statement: Give Claude marketing
     superpowers so you don't need them
     yourself
     Psychology: Buyers want the outcome
     without the learning curve
     Headline: "Turn Claude into a marketing
     team that actually sells."
     Best for: Technical/builder audience,
     not marketing-focused

  ──────────────────────────────────────────────

  ②  THE ANTI-GENERIC
     Statement: Stop getting generic AI output
     that sounds like everyone else
     Psychology: Universal frustration with AI
     output quality -- taps into existing pain
     Headline: "Same Claude. Different playbook.
     10x output."
     Best for: Audience that has tried Claude
     and been disappointed with results

  ──────────────────────────────────────────────

  ③  THE METHODOLOGY TRANSFER
     Statement: Packaged expertise from $400k+
     in real results
     Psychology: Credibility through specific
     proof, not theory
     Headline: "The marketing methodology behind
     $400k+ in 9 months -- now packaged for
     Claude."
     Best for: Results-focused audience that
     values proven systems over promises

  ──────────────────────────────────────────────

  ④  THE TIME RECAPTURE
     Statement: Stop spending hours on AI
     babysitting
     Psychology: Quantifies the hidden cost of
     the current approach
     Headline: "You're burning 10+ hours a month
     on AI babysitting. Skills fix this."
     Best for: Time-constrained audience,
     values efficiency over features

  ──────────────────────────────────────────────

  ⑤  THE SPECIALIST UNLOCK
     Statement: Access copywriter/marketer
     expertise without hiring one
     Psychology: Positions against the expensive
     alternative
     Headline: "Specialist marketing output
     without specialist costs."
     Best for: Audience that has considered
     hiring but balked at price

  ──────────────────────────────────────────────

  Why ★ The Capability Transfer: At Stage 3,
  the market needs a mechanism. This angle
  frames skills as expertise transfer (not
  prompt shortcuts), which is the white space
  no competitor occupies. It also matches the
  builder audience who wants outcomes without
  learning marketing themselves.
```

---

## How this skill gets invoked

This skill activates when:
- User asks "how should I position X"
- User asks "what's the angle for X"
- User asks "why isn't this selling"
- User asks to "find the hook" or "make this stand out"
- User is about to write copy/landing page but has not established positioning
- Direct-response-copy skill needs an angle to write from
- Landing-page skill needs a core positioning to build around

When another skill needs an angle, run this first. The angle informs everything downstream.

---

## What this skill is NOT

This skill finds positioning and angles. It does NOT:
- Write the actual copy (that is direct-response-copy)
- Build the landing page structure (that is landing-page)
- Research the audience from scratch (assumes you know who you are selling to, or loads audience.md)
- Pick a single "right" answer (it gives options to choose from)
- Replace deep competitive intelligence (that is competitive-intel -- this does a messaging-focused scan)

The output is strategic direction, not finished marketing.

---

## The test

Before delivering angles, verify each one:

1. **Is it specific?** Vague angles ("better results") fail. Specific angles ("20 lbs in 6 weeks") convert.

2. **Is it differentiated?** Could a competitor claim the same thing? If yes, sharpen it. Cross-reference against the competitive landscape map -- if a competitor already says it, it fails this test.

3. **Is it believable?** Does the mechanism or proof support the claim?

4. **Is it relevant to THIS audience?** An angle that works for beginners fails for experts. If audience.md is loaded, verify alignment with known segments and pain points.

5. **Does it lead somewhere?** Can you imagine the headline, the landing page, the copy? If not, it is too abstract.

---

## Iteration and update mode

When `./brand/positioning.md` already exists, the skill enters update mode:

### Display current state

```
  CURRENT POSITIONING

  Primary angle: [angle name from file]
  Statement: [current statement]
  Last updated: [date from file]

  ──────────────────────────────────────────────

  Options: Refine this, or start fresh?
```

### Refine mode

1. Load existing angles from positioning.md
2. Run fresh competitive web search to see what has changed
3. Compare new landscape to the landscape saved in positioning.md
4. Identify shifts: new competitors, new saturated claims, new white space
5. Suggest specific adjustments to the existing angle:
   - "Your current angle still has white space. No changes needed."
   - "Two competitors now use similar messaging. Consider sharpening to [suggestion]."
   - "New white space opened up around [topic]. Consider pivoting to [suggestion]."
6. Present 1-3 refined angle variations alongside the original
7. Let the user choose to keep, tweak, or replace

### Start fresh mode

Run the complete process from Step 1 as if no positioning exists. Previous positioning.md is preserved until the user explicitly confirms the replacement.

---

## Feedback collection

After delivering the final angle selection and writing to positioning.md, present the standard feedback prompt per `_system/brand-memory.md`:

```
  How did this perform?

  a) Great -- using this angle as-is
  b) Good -- tweaked the language slightly
  c) Rewrote significantly
  d) Haven't used yet

  (You can answer later -- just run
  /positioning-angles again and tell me.)
```

**Processing feedback:**

- **(a) Great:** Log to `./brand/learnings.md` under "What Works" with the angle name and context.
  Example: `- [2026-02-16] [/positioning-angles] "The Capability Transfer" angle shipped as-is. Stage 3 market, builder audience.`

- **(b) Good -- tweaked:** Ask what changed. Log the adjustment to learnings.md. If the tweak reveals a voice mismatch, suggest re-running /brand-voice.

- **(c) Rewrote significantly:** Ask for the final version. Analyze differences. Log findings. If the rewrite suggests fundamentally different positioning, offer to update positioning.md with their version.

- **(d) Haven't used yet:** Note it. Do not log. Optionally remind next time.

---

## References

For deeper frameworks, see the `references/` folder:
- `dunford-positioning.md` -- April Dunford's 5-component positioning methodology
- `schwartz-sophistication.md` -- Eugene Schwartz's market awareness levels
- `unique-mechanism.md` -- How to find and name your mechanism
- `angle-frameworks.md` -- Halbert, Ogilvy, Hopkins, Bencivenga, Kennedy approaches
- `hormozi-offer.md` -- Value equation and Grand Slam Offer thinking
