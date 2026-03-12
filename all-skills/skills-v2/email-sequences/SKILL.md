---
name: email-sequences
version: 7.0
description: >
  Build email sequences that convert subscribers into customers. Use when you
  have a lead magnet and need a welcome sequence, nurture sequence, or sales
  sequence. Covers welcome, nurture, conversion, launch, re-engagement, and
  post-purchase sequences. Triggers on: write welcome emails, email sequence
  for, nurture sequence, convert my list, onboarding emails, launch sequence,
  drip campaign, email funnel, write a welcome series, follow-up emails,
  autoresponder sequence, cart abandonment emails. Outputs complete email
  sequences with subject lines (3 A/B variants per email), timing, full copy,
  and send-day recommendations. Writes each email as an individual file in
  ./campaigns/{sequence-name}/emails/ with naming convention {nn}-{purpose}.md.
  Detects Mailchimp, ConvertKit, and HubSpot API keys in .env and offers
  direct automation setup if found. Loads brand voice and positioning from
  memory, reads lead-magnet output if available, generates campaign summary
  overview. Reads: voice-profile.md, positioning.md, audience.md,
  creative-kit.md. Writes: ./campaigns/{name}/emails/*.md,
  ./campaigns/{name}/brief.md, assets.md, learnings.md. Chains to:
  /content-atomizer for social promotion of the lead magnet.
---

# Email Sequences

Most lead magnets die in the inbox. Someone downloads your thing, gets one "here's your download" email, and never hears from you again. Or worse -- they get blasted with "BUY NOW" emails before you've earned any trust.

The gap between "opted in" and "bought" is where money is made or lost. This skill builds sequences that bridge that gap.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

---

## Brand Memory Integration

This skill reads brand context to make every email sound like your brand and align with your positioning. It also checks whether a lead magnet has already been created, so it can build the sequence around specific deliverable details rather than generic placeholders.

**Reads:** `voice-profile.md`, `positioning.md`, `audience.md`, `creative-kit.md` (all optional)

On invocation, check for `./brand/` and load available context:

1. **Load `voice-profile.md`** (if exists):
   - Match the brand's tone, vocabulary, sentence rhythm in every email
   - Apply the voice DNA: sentence length patterns, jargon level, formality register
   - A "direct, proof-heavy" voice writes different emails than a "warm, story-driven" voice
   - Show: "Your voice is [tone summary]. All emails will match that register."

2. **Load `positioning.md`** (if exists):
   - Use the chosen angle as the narrative spine of the sequence
   - The positioning angle determines how the bridge emails frame the gap
   - Show: "Your positioning angle is '[angle]'. Building the sequence around that frame."

3. **Load `audience.md`** (if exists):
   - Know who is receiving these emails: their awareness level, sophistication, pain points
   - Match sophistication level to email complexity and jargon tolerance
   - Use audience data to inform send timing recommendations (B2B vs B2C, timezone, habits)
   - Show: "Writing for [audience summary]. Awareness: [level]."

4. **Load `creative-kit.md`** (if exists):
   - Pull brand colors for HTML email templates if ESP integration is active
   - Reference visual identity for any image or banner suggestions
   - Show: "Creative kit loaded -- brand colors and visual identity available for templates."

5. **Check for lead magnet output** (if `./campaigns/*/brief.md` or `./brand/assets.md` references a lead magnet):
   - If /lead-magnet was already run, use the actual lead magnet name, format, and delivery URL
   - Pull the specific value proposition and quick-start instructions from the lead magnet brief
   - Show: "Found lead magnet: '[name]'. Building delivery email around the actual asset."

6. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Proceed without it -- this skill works standalone.
   - The emails will be well-structured either way; brand memory makes them consistent.
   - Note: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

### Context Loading Display

Show the user what was loaded using the standard tree format:

```
Brand context loaded:
├── Voice Profile     ✓ "{tone summary}"
├── Positioning       ✓ "{primary angle}"
├── Audience          ✓ "{audience summary}"
├── Creative Kit      ✓ loaded
├── Lead Magnet       ✓ "{lead magnet name}" (from /lead-magnet)
└── Learnings         ✓ {N} entries

Using this to shape email voice, sequence angle,
and send timing.
```

If files are missing, show them as ✗ with a suggestion:

```
├── Voice Profile     ✗ not found
│   → /brand-voice to create one (~10 min)
```

---

## ESP Detection

Before generating the sequence, check for email service provider integrations. This determines the output format.

### Detection Order

1. **Check `./brand/stack.md`** (if exists) -- look for ESP entries in the Connected Tools table.
2. **Check `.env`** -- scan for these environment variables:
   - `MAILCHIMP_API_KEY` or `MAILCHIMP_SERVER_PREFIX` -- Mailchimp
   - `CONVERTKIT_API_KEY` or `CONVERTKIT_API_SECRET` -- ConvertKit
   - `HUBSPOT_API_KEY` or `HUBSPOT_ACCESS_TOKEN` -- HubSpot
   - `SENDGRID_API_KEY` -- SendGrid
   - `ACTIVECAMPAIGN_API_KEY` -- ActiveCampaign
3. **Check for MCP servers** -- query available MCP tools for email-related capabilities.

### Output Based on Detection

**If ESP detected:**
```
ESP Detection
├── Mailchimp         ✓ connected (API key found)
│   List size:        [if queryable]
│
│   I can create this automation directly in
│   Mailchimp. Want me to set it up, or output
│   copy-paste-ready files?
│
│   → "Set it up"     Create automation via API
│   → "Just the copy" Output as markdown files
```

**If no ESP detected:**
```
ESP Detection
├── Mailchimp         ✗ not found
├── ConvertKit        ✗ not found
├── HubSpot           ✗ not found
└── No ESP connected

Outputting in copy-paste-ready format.
Each email saved as a separate .md file you
can paste into any email platform.

→ To connect an ESP, add your API key to .env
  and run /start-here to configure.
```

If the user chooses "Set it up" and an ESP is detected, create the automation using the platform API after generating the copy. Always generate the local .md files regardless -- they serve as the source of truth.

---

## Iteration Detection

Before starting, check if an email sequence already exists for this project.

### If campaign email files exist in `./campaigns/{name}/emails/`

Do not start from scratch. Instead:

1. Read the existing email files.
2. Present a summary of what exists:
   ```
   Existing sequence found:

   Campaign: {name}
   ├── 01-delivery.md       ✓  (Day 0, subject: "...")
   ├── 02-connection.md     ✓  (Day 2, subject: "...")
   ├── 03-quick-win.md      ✓  (Day 4, subject: "...")
   ├── 04-value.md          ✓  (Day 6, subject: "...")
   ├── 05-bridge.md         ✓  (Day 8, subject: "...")
   ├── 06-soft-pitch.md     ✓  (Day 10, subject: "...")
   └── 07-direct-pitch.md   ✓  (Day 12, subject: "...")

   7 emails, welcome sequence, last updated Feb 10
   ```
3. Ask: "Do you want to revise this sequence, add emails, or start a new one?"
   - **Revise** -- load existing emails, identify weak spots, rewrite specific emails
   - **Add** -- add emails to the existing sequence (e.g., extend with re-engagement)
   - **New** -- create a different sequence type (e.g., add a conversion sequence after welcome)

### If no campaign email files exist

Proceed directly to sequence generation using the methodology below.

---

## The Core Job

Transform a lead magnet subscriber into a customer through a **strategic email sequence** that:
- Delivers immediate value (the lead magnet)
- Builds trust and relationship
- Creates desire for the paid offer
- Converts without being sleazy

**Output format:** Complete email sequences with subject line A/B variants, preview text, full copy, send timing with specific day/time recommendations, and CTAs. Each email saved as an individual file.

---

## Sequence Types

| Sequence | Purpose | Length | When to Use |
|----------|---------|--------|-------------|
| **Welcome** | Deliver value, build relationship | 5-7 emails | After opt-in |
| **Nurture** | Provide value, build trust | 4-6 emails | Between welcome and pitch |
| **Conversion** | Sell the product | 4-7 emails | When ready to pitch |
| **Launch** | Time-bound campaign | 6-10 emails | Product launch |
| **Re-engagement** | Win back cold subscribers | 3-4 emails | Inactive 30+ days |
| **Post-Purchase** | Onboard, reduce refunds, upsell | 4-6 emails | After purchase |

---

## Before Starting: Gather Context

Get these inputs before writing any sequence:

1. **What's the lead magnet?** (What did they opt in for?)
   - Check `./brand/assets.md` and `./campaigns/*/brief.md` for existing lead magnet details
   - If /lead-magnet was already run, use those specifics instead of asking
2. **What's the paid offer?** (What are you eventually selling?)
3. **What's the price point?** (Affects how much trust-building needed)
4. **What's the bridge?** (How does free to paid make logical sense?)
5. **What voice/brand?** (Load from `./brand/voice-profile.md` or ask)
6. **What objections?** (Why might they NOT buy?)

If brand memory provides answers to any of these, confirm them with the user rather than re-asking: "Your lead magnet is '[name]' and your paid offer is '[product]' at $[price]. Sound right, or has anything changed?"

---

## The Welcome Sequence (5-7 emails)

This is the most important sequence. First impressions compound.

### Purpose
- Deliver the lead magnet
- Set expectations
- Begin the relationship
- Identify engaged subscribers
- Plant seeds for the offer

### The Framework: DELIVER -> CONNECT -> VALUE -> BRIDGE

```
Email 1: DELIVER -- Give them what they came for
Email 2: CONNECT -- Share your story, build rapport
Email 3: VALUE -- Teach something useful (quick win)
Email 4: VALUE -- Teach something else (builds authority)
Email 5: BRIDGE -- Show what's possible with more help
Email 6: SOFT PITCH -- Introduce the offer gently
Email 7: DIRECT PITCH -- Make the ask
```

### Email 1: Delivery (Send immediately)

**Purpose:** Deliver the lead magnet, set expectations, get first micro-engagement.

**Subject line formulas:**
- "[Lead magnet name] is inside"
- "Your [lead magnet] + quick start guide"
- "Here's [what they asked for]"

**Structure:**
```
[Greeting -- keep it simple]

[Deliver the goods -- link to lead magnet]

[Quick start -- one action they can take in next 5 minutes]

[Set expectations -- what emails are coming]

[Micro-CTA -- hit reply, answer a question, or take one action]

[Sign off]
```

**Example:**
```
Hey,

Your positioning skill is attached. Here's how to use it in 60 seconds:

1. Download the .md file
2. Add it to Claude Code (or paste into any Claude conversation)
3. Ask Claude: "Find positioning angles for [your product]"

That's it. Try it on whatever you're working on right now.

Over the next week, I'll send you a few emails showing how to get the most out of this skill -- and what else is possible when Claude has real methodology instead of generic prompts.

Quick question: What are you hoping to use this for? Hit reply and let me know. I read every response.

-- James
```

**Timing:** Immediately after opt-in

---

### Email 2: Connection (Day 2)

**Purpose:** Build rapport through vulnerability and shared experience.

**Subject line formulas:**
- "Why I created [lead magnet]"
- "The mistake that led to this"
- "Quick story about [topic]"

**Structure:**
```
[Story hook -- specific moment or realization]

[The struggle -- what you went through]

[The insight -- what you learned]

[The connection -- how this relates to them]

[Soft forward reference -- hint at what's coming]

[Sign off]
```

**Example:**
```
Quick story:

Two years ago, I spent $2,400 on a brand strategist. She was smart. She delivered a 47-page PDF. It sat in my Google Drive for six months.

Not because it was bad. Because I didn't know how to USE it.

That's when I realized: frameworks without implementation are just expensive decoration.

So I started building something different. Not strategy decks. Not consulting. Something you could actually use, immediately, every time you needed it.

That's what the positioning skill is -- strategy that executes itself.

Tomorrow I'll show you what Sarah found when she ran it on her SaaS product. (Her exact words: "I've been explaining this wrong for two years.")

-- James
```

**Timing:** Day 2

---

### Email 3: Value (Day 4)

**Purpose:** Teach something useful. Demonstrate expertise. Create a quick win.

**Subject line formulas:**
- "The [X] mistake everyone makes"
- "Try this: [specific tactic]"
- "What [person] discovered about [topic]"

**Structure:**
```
[Hook -- insight or observation]

[The problem -- what most people get wrong]

[The solution -- what to do instead]

[Example or proof -- show it working]

[Action step -- what they can do right now]

[Sign off]
```

**Timing:** Day 4

---

### Email 4: More Value (Day 6)

**Purpose:** Continue building trust. Different angle or topic.

**Subject line formulas:**
- "[Number] things that [outcome]"
- "The question I get most"
- "This changed how I think about [topic]"

**Structure:** Same as Email 3, different topic.

**Timing:** Day 6

---

### Email 5: Bridge (Day 8)

**Purpose:** Show the gap between where they are and where they could be. Introduce concept of the paid offer without pitching.

**Subject line formulas:**
- "You can [do X] now. But can you [do Y]?"
- "The next step most people miss"
- "What [lead magnet] doesn't do"

**Structure:**
```
[Acknowledge progress -- what they can now do with the lead magnet]

[Reveal the gap -- what they still can't do]

[Paint the picture -- what's possible with the full solution]

[Soft mention -- the offer exists, no hard sell]

[Sign off]
```

**Example:**
```
By now you've probably run the positioning skill on at least one project.

You can find angles. That's the foundation.

But here's what you can't do with just one skill:

- Turn that angle into a landing page that converts
- Write emails that get opened and clicked
- Create content that ranks AND reads well
- Build sequences that turn subscribers into customers

The positioning skill is 1 of 9 in the full system.

Each skill handles a different piece: copy, content, newsletters, lead magnets, email sequences, content distribution.

Together they give Claude a complete marketing methodology -- not prompts, but the actual frameworks behind $400k+ in revenue.

I'll tell you more about it tomorrow. For now, keep using the positioning skill. It's yours forever.

-- James
```

**Timing:** Day 8

---

### Email 6: Soft Pitch (Day 10)

**Purpose:** Introduce the offer properly. Handle objections. Let them self-select.

**Subject line formulas:**
- "The full system (if you want it)"
- "Should you get [product]? Let's see."
- "This isn't for everyone"

**Structure:**
```
[Transition -- building on bridge email]

[The offer -- what it is, what's included]

[Who it's for -- specific situations]

[Who it's NOT for -- disqualification]

[Social proof -- if available]

[The ask -- soft CTA, no urgency yet]

[Sign off]
```

**Timing:** Day 10

---

### Email 7: Direct Pitch (Day 12)

**Purpose:** Make the clear ask. Create urgency if authentic.

**Subject line formulas:**
- "Last thing about [product]"
- "[Product] -- yes or no?"
- "Quick decision"

**Structure:**
```
[Direct opener -- no buildup]

[Restate core value -- one sentence]

[Handle remaining objection -- the big one]

[Urgency -- if real (price increase, bonus deadline, limited)]

[Clear CTA -- exactly what to do]

[Final thought -- personal note]

[Sign off]
```

**Timing:** Day 12

---

## The Conversion Sequence (4-7 emails)

For when you're ready to pitch -- either after welcome sequence or as a standalone campaign.

### The Framework: OPEN -> DESIRE -> PROOF -> OBJECTION -> URGENCY -> CLOSE

```
Email 1: OPEN -- Introduce the offer, core promise
Email 2: DESIRE -- Paint the transformation, show the gap
Email 3: PROOF -- Testimonials, case studies, results
Email 4: OBJECTION -- Handle the biggest "but..."
Email 5: URGENCY -- Why now matters (if authentic)
Email 6: CLOSE -- Final push, clear CTA
Email 7: LAST CALL -- Deadline reminder (if applicable)
```

### Timing
- Standard: Every 2 days
- Launch: Daily or every other day
- Deadline: Final 3 emails in 3 days

---

## The Launch Sequence (6-10 emails)

For time-bound campaigns: product launches, promotions, cohort opens.

### The Framework: SEED -> OPEN -> VALUE -> PROOF -> URGENCY -> CLOSE

**Pre-Launch (Optional, 1-2 emails):**
- Seed interest, build anticipation
- "Something's coming" without revealing

**Cart Open (2-3 emails):**
- Announcement, full details
- Value deep-dive, transformation
- Social proof, testimonials

**Mid-Launch (2-3 emails):**
- Objection handling
- Case study or story
- FAQ or "is this for me?"

**Cart Close (2-3 emails):**
- Urgency (24-48 hours)
- Final testimonial
- Last call (deadline day)

### Launch Email Timing
```
Day -3: Seed (optional)
Day -1: Coming tomorrow
Day 0: Cart open (morning)
Day 0: Cart open (evening, different angle)
Day 2: Deep-dive on value
Day 4: Social proof
Day 5: Objection handling
Day 6: 48-hour warning
Day 7: 24-hour warning (morning)
Day 7: Final hours (evening)
Day 7: Last call (before midnight)
```

---

## The Re-engagement Sequence (3-4 emails)

For subscribers who haven't opened in 30+ days.

### The Framework: PATTERN INTERRUPT -> VALUE -> DECISION

```
Email 1: Pattern interrupt -- different subject line style, acknowledge absence
Email 2: Pure value -- best content, no ask
Email 3: Direct question -- do you want to stay?
Email 4: Final -- removing from list (creates urgency)
```

### Subject Line Examples
- "Did I do something wrong?"
- "Should I stop emailing you?"
- "Breaking up is hard to do"
- "You're about to miss [thing]"
- "[First name], still there?"

---

## Subject Line Formulas

### What Gets Opens

**1. Curiosity Gap**
- "The [X] mistake that cost me [Y]"
- "Why [surprising thing] actually works"
- "I was wrong about [topic]"

**2. Direct Benefit**
- "How to [outcome] in [timeframe]"
- "[Number] ways to [benefit]"
- "The fastest way to [result]"

**3. Personal/Story**
- "Quick story about [topic]"
- "What happened when I [action]"
- "The email I almost didn't send"

**4. Question**
- "Can I ask you something?"
- "What would you do with [outcome]?"
- "Are you making this mistake?"

**5. Urgency (when real)**
- "[X] hours left"
- "Closing tonight"
- "Last chance: [offer]"

**6. Pattern Interrupt**
- "." (just a period)
- "So..."
- "Bad news"
- "[First name]"

### What Kills Opens

- ALL CAPS
- Excessive punctuation!!!
- "Newsletter #47"
- "[COMPANY NAME] Weekly Update"
- Clickbait that doesn't deliver
- Same format every time

---

## Subject Line A/B Variants

For every email in the sequence, generate exactly 3 subject line variants with rationale. This is a core differentiator of the v2 skill -- never output a single subject line.

### The Three-Variant Framework

For each email, produce:

**Variant A -- The Safe Bet:**
The subject line most likely to perform well across all audiences. Uses a proven formula. Optimized for open rate.

**Variant B -- The Bold Play:**
Higher risk, higher reward. Uses pattern interrupt, curiosity, or emotion. May polarize but will stand out in a crowded inbox.

**Variant C -- The Personal Touch:**
Feels like a message from a friend. Uses first name, lowercase, conversational tone. Optimized for trust and reply rate.

### Output Format for Subject Lines

For each email, present subject lines using the numbered options template:

```
SUBJECT LINE VARIANTS -- Email {N}: {Purpose}

  ①  "{Subject line A}"                    ★ recommended
     → Safe bet: {rationale}
     → Preview text: "{first 60 chars}"

  ──────────────────────────────────────────────

  ②  "{Subject line B}"
     → Bold play: {rationale}
     → Preview text: "{first 60 chars}"

  ──────────────────────────────────────────────

  ③  "{Subject line C}"
     → Personal: {rationale}
     → Preview text: "{first 60 chars}"

  ──────────────────────────────────────────────

  Recommended A/B test: ① vs ②
  Reason: {why these two will reveal something
  useful about the audience}
```

### Subject Line Rules

- Maximum 50 characters (displays fully on mobile)
- No emoji unless brand voice explicitly calls for it
- No ALL CAPS
- Preview text must complement, not repeat, the subject
- Always include preview text -- it accounts for 24% of open rate decisions
- Each variant must use a DIFFERENT formula category (do not generate 3 curiosity gaps)

---

## Email Copy Principles

### The P.S. Is Prime Real Estate
40% of people read the P.S. first. Use it for:
- The core CTA
- A second hook
- Personal note
- Deadline reminder

### One CTA Per Email
Multiple CTAs = no CTAs. Every email should have ONE clear action.

Exception: Delivery email can have "download" + "reply with question"

### Short Paragraphs
1-3 sentences max. Email is scanned, not read.

### Preview Text Matters
First 40-90 characters appear in inbox preview. Make them count.

**Bad:** "Having trouble viewing this email?"
**Good:** "[Continuation of subject line curiosity]"

### Open Loops
Create curiosity within emails:
- "I'll explain why tomorrow."
- "But that's not even the interesting part."
- "The third one surprised me."

### Specificity Creates Credibility
- Not "made money" -- "$47,329 in one day"
- Not "many customers" -- "2,847 customers"
- Not "recently" -- "Last Tuesday"

---

## Sequence Architecture Patterns

### The Straight Line
```
Email 1 -> Email 2 -> Email 3 -> Email 4 -> Pitch
```
Simple. Works for short sequences. No branches.

### The Branch
```
Email 1 -> Email 2 -> [Clicked?] -> YES: Pitch sequence
                                 -> NO: More value sequence
```
Behavior-based. More sophisticated. Requires automation.

### The Hybrid
```
Welcome (5 emails) -> [Wait 7 days] -> Conversion (5 emails) -> [No purchase] -> Nurture (ongoing)
```
Full lifecycle. Most complete.

---

## Send Timing Recommendations

### Timing by Sequence Type

| Sequence | Frequency | Notes |
|----------|-----------|-------|
| Welcome | Days 0, 2, 4, 6, 8, 10, 12 | Front-load value |
| Nurture | Weekly or 2x/week | Consistent rhythm |
| Conversion | Every 2 days | Enough touch without annoying |
| Launch | Daily or every other day | Intensity justified by deadline |
| Re-engagement | Days 0, 3, 7, 10 | Give time to respond |

### Best Send Times by Audience Type

**B2B audiences (SaaS, agencies, professional services):**
- Best days: Tuesday, Wednesday, Thursday
- Best times: 9:00-10:30 AM recipient's timezone
- Avoid: Monday before 10 AM (inbox clearing), Friday after 2 PM (mentally gone)
- Second window: 1:00-2:00 PM (post-lunch scan)

**B2C audiences (consumers, creators, freelancers):**
- Best days: Tuesday, Wednesday, Thursday
- Best times: 7:00-9:00 AM (morning routine) or 7:00-9:00 PM (evening wind-down)
- Avoid: Monday morning, Saturday (varies by niche)
- Weekend exception: Lifestyle, hobby, and wellness niches can send Saturday 9-11 AM

**Creator/solopreneur audiences:**
- Best days: Tuesday, Wednesday
- Best times: 7:00-8:30 AM (before deep work starts)
- They check email in bursts, not continuously
- Shorter emails perform better for this segment

**Ecommerce audiences:**
- Best days: Thursday, Friday (pre-weekend shopping), Sunday (browse mode)
- Best times: 10:00 AM or 8:00 PM
- Cart abandonment: Send within 1 hour, then 24 hours, then 72 hours

### Specific Timing for Each Sequence Email

When generating the sequence, assign a specific send day and time to each email based on:

1. **Audience type** from `./brand/audience.md` (or ask if not available)
2. **Sequence type** (welcome sequences are daily/every-other-day; nurture is weekly)
3. **Price point** (higher price = more value emails before pitch)
4. **Learnings data** from `./brand/learnings.md` (if send time performance data exists, use it)

Output timing in the format: `Day {N}, {Day of Week} at {time} {timezone}`

Example: `Day 0, Tuesday at 9:00 AM ET` or `Day 2, Thursday at 7:30 AM PT`

If timezone is unknown, output in the user's local timezone with a note to adjust for their audience.

### When to Start Selling
- Low price (<$100): After 3-5 value emails
- Medium price ($100-500): After 5-7 value emails
- High price (>$500): After 7-10 value emails or sales call

Trust required scales with price.

---

## Individual File Output

Every email in the sequence is saved as a separate file. This is non-negotiable -- it enables the user to iterate on individual emails, import them one at a time into ESPs, and maintain version control.

### Directory Structure

```
./campaigns/{sequence-name}/
  brief.md                           <- Campaign overview
  emails/
    01-delivery.md                   <- Email 1
    02-connection.md                 <- Email 2
    03-quick-win.md                  <- Email 3
    04-value-story.md                <- Email 4
    05-bridge.md                     <- Email 5
    06-soft-pitch.md                 <- Email 6
    07-direct-pitch.md               <- Email 7
```

### Naming Convention

Files use the pattern: `{nn}-{purpose}.md`

- `{nn}` -- Two-digit number, zero-padded (01, 02, 03...)
- `{purpose}` -- Lowercase kebab-case description of the email's job
- Always use descriptive names, not generic "email-1"

Standard purpose names by sequence type:

**Welcome sequence:**
- 01-delivery, 02-connection, 03-quick-win, 04-value-story, 05-bridge, 06-soft-pitch, 07-direct-pitch

**Conversion sequence:**
- 01-open, 02-desire, 03-proof, 04-objection, 05-urgency, 06-close, 07-last-call

**Launch sequence:**
- 01-seed, 02-announcement, 03-value-dive, 04-social-proof, 05-objection, 06-48hr-warning, 07-24hr-warning, 08-final-hours, 09-last-call

**Re-engagement sequence:**
- 01-pattern-interrupt, 02-pure-value, 03-direct-question, 04-final-notice

**Post-purchase sequence:**
- 01-welcome-aboard, 02-quick-start, 03-first-win, 04-advanced-tip, 05-community, 06-upsell

### Individual Email File Format

Each email .md file must contain this frontmatter and structure:

```markdown
---
email: {N}
sequence: {sequence-name}
purpose: {one-line purpose}
send_day: {N}
send_time: "{Day, Time TZ}"
subject_line_a: "{Subject A}"
subject_line_b: "{Subject B}"
subject_line_c: "{Subject C}"
recommended_subject: "a"
preview_text: "{preview text for recommended subject}"
cta: "{what action you want}"
status: draft
---

# Email {N}: {Purpose Title}

## Subject Line Variants

### A: "{Subject A}" -- recommended
{Rationale for why this is the safe bet}

### B: "{Subject B}"
{Rationale for the bold play}

### C: "{Subject C}"
{Rationale for the personal touch}

**Recommended A/B test:** A vs B
**Reason:** {why testing these two is informative}

## Preview Text
"{preview text -- first 60-90 characters}"

## Send Timing
Day {N} -- {Day of Week} at {Time} {TZ}
{Rationale for this timing}

---

## Email Copy

{FULL EMAIL COPY HERE}

---

**P.S.** {If applicable}
```

---

## Campaign Brief

Every sequence gets a `brief.md` in the campaign directory. This follows the standard campaign brief format from `_system/brand-memory.md`:

```markdown
# Campaign: {Sequence Name}

## Goal
{What this sequence accomplishes, with a metric if possible}

## Sequence Type
{Welcome / Nurture / Conversion / Launch / Re-engagement / Post-Purchase}

## Emails
{N} emails over {N} days

## Angle
{The positioning angle being used -- from ./brand/positioning.md}

## Audience Segment
{Who receives this sequence -- from ./brand/audience.md}

## Lead Magnet
{What they opted in for -- from ./brand/assets.md or user input}

## Paid Offer
{What we are eventually selling, at what price}

## Bridge Logic
{How free -> paid makes logical sense}

## Timeline
Day 0 through Day {N}

## ESP
{Connected ESP or "manual / copy-paste"}

## Status
draft

## Voice Notes
{Any sequence-specific voice adjustments}
```

---

## Campaign Summary Output

After generating the full sequence, display a summary overview using the Sequence Overview template. This gives the user a bird's-eye view of the entire sequence.

### Summary Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {N}-EMAIL {SEQUENCE TYPE} SEQUENCE
  Generated {Month Day, Year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SEQUENCE OVERVIEW

  Day 0    "{Subject line A -- recommended}"
           {Purpose in one line}
           CTA: {action}
           Send: {Day} at {time}

  Day 2    "{Subject line A -- recommended}"
           {Purpose in one line}
           CTA: {action}
           Send: {Day} at {time}

  Day 4    "{Subject line A -- recommended}"
           {Purpose in one line}
           CTA: {action}
           Send: {Day} at {time}

  ...continue for all emails...

  ──────────────────────────────────────────────

  SEQUENCE ARCHITECTURE

  {Straight Line / Branch / Hybrid}

  {Visual representation:}
  01-delivery -> 02-connection -> 03-quick-win
  -> 04-value-story -> 05-bridge -> 06-soft-pitch
  -> 07-direct-pitch

  ──────────────────────────────────────────────

  ESP STATUS

  {ESP name}    ✓ connected / ✗ not connected
  {Status message about automation setup}

  ──────────────────────────────────────────────

  FILES SAVED

  ./campaigns/{name}/brief.md              ✓
  ./campaigns/{name}/emails/01-delivery.md ✓
  ./campaigns/{name}/emails/02-connection.md ✓
  ./campaigns/{name}/emails/03-quick-win.md ✓
  ./campaigns/{name}/emails/04-value-story.md ✓
  ./campaigns/{name}/emails/05-bridge.md   ✓
  ./campaigns/{name}/emails/06-soft-pitch.md ✓
  ./campaigns/{name}/emails/07-direct-pitch.md ✓
  ./brand/assets.md                        ✓ (appended)

  ──────────────────────────────────────────────

  WHAT'S NEXT

  Your sequence is ready. Before distributing:

  → /creative           Build it — HTML email
                        templates, header graphics,
                        or visual assets (~15 min)
  → "Skip visuals"      Continue to next step ↓

  ──────────────────────────────────────────────

  → /content-atomizer   Promote the lead magnet on
                        social (~15 min)
  → /direct-response-copy  Write the landing page
                           for the offer (~20 min)
  → /lead-magnet        Create the opt-in asset if
                        you haven't yet (~15 min)
  → "Iterate"           Revise specific emails

  Or tell me what you're working on and
  I'll route you.
```

---

## Example: Welcome Sequence for Skills Pack Lead Magnet

### Context
- Lead magnet: Free positioning-angles skill
- Paid offer: 9-skill marketing pack ($149)
- Bridge: One skill -> want the other 8
- Audience: Founders/marketers using Claude

### Email 1: Delivery

**Send:** Immediately
**Subject:** Your positioning skill is inside
**Preview:** Here's how to use it in 60 seconds

Hey,

Your positioning skill is attached. [LINK]

Here's how to use it in 60 seconds:

1. Download the .md file
2. Add it to Claude Code (or paste into a Claude conversation)
3. Ask: "Find positioning angles for [your product]"

That's it. Try it right now on whatever you're working on.

Over the next week, I'll send you a few emails showing how to get more out of this -- plus what happens when Claude has an entire marketing methodology instead of one skill.

Quick question: What project are you hoping to use this for? Hit reply and tell me. I read every one.

-- James

---

### Email 2: Connection

**Send:** Day 2
**Subject:** Why I built this (quick story)
**Preview:** $2,400 on a strategist and nothing to show for it

Quick story:

Two years ago I hired a brand strategist. $2,400. She delivered a 47-page PDF.

It sat in my Google Drive for six months.

Not because it was bad. Because I had no idea how to implement it. Every time I tried to write a landing page or position an offer, I'd open the PDF, get overwhelmed, and close it.

That's when I realized: Frameworks without implementation are expensive decoration.

So I started building something different.

Not strategy decks. Not consulting. Something you could actually USE -- every time you needed to write copy, find an angle, plan content, or build a sequence.

The positioning skill you downloaded? That's one piece.

Tomorrow I'll show you what happened when Sarah ran it on her SaaS product. (Her words: "I've been explaining this wrong for two years.")

-- James

---

### Email 3: Value/Proof

**Send:** Day 4
**Subject:** What Sarah found in 12 minutes
**Preview:** "I've been explaining this wrong for two years"

Sarah runs a SaaS tool for freelancers. Revenue had plateaued.

She'd tried:
- New features (users didn't care)
- Price changes (didn't move the needle)
- More content (traffic but no conversions)

Then she ran the positioning skill.

12 minutes later, she had 5 distinct angles she'd never considered.

The winner: Stop positioning as "invoicing software." Start positioning as "get paid faster without awkward follow-ups."

Same product. Different angle. Her landing page conversion went from 2.1% to 4.7%.

The skill didn't write her landing page. It found the angle that made everything else easier.

That's what methodology does -- it changes what you see.

Try it again today. Pick something that's not converting the way you want. Find the angle you've been missing.

-- James

P.S. Tomorrow: the one thing the positioning skill can't do (and why it matters).

---

### Email 4: Bridge

**Send:** Day 6
**Subject:** You can find angles now. But can you do this?
**Preview:** What one skill doesn't cover

By now you've probably found a few angles using the skill.

That's the foundation. Positioning is where everything starts.

But here's what you can't do with just one skill:

- Turn that angle into a landing page that converts
- Write an email sequence that turns subscribers into customers
- Create content that ranks AND reads well
- Build a lead magnet that actually gets downloaded
- Atomize one piece of content into 15 platform-native posts

The positioning skill is 1 of 9.

Together they give Claude a complete marketing methodology. Not prompts -- methodology. The frameworks behind $400k+ in 9 months.

I'll tell you more about the full system tomorrow.

For now, keep finding angles. The skill is yours forever.

-- James

---

### Email 5: Soft Pitch

**Send:** Day 8
**Subject:** The full system (if you want it)
**Preview:** 9 skills, one methodology, $149

You've been using the positioning skill for a week.

If you're finding it useful, here's what else is available:

**The Vibe Marketing Skills Pack -- $149**

9 skills that give Claude a complete marketing methodology:

| Skill | What It Does |
|-------|--------------|
| brand-voice | Defines how you sound |
| positioning-angles | Finds angles that sell (you have this) |
| keyword-research | Identifies what to write about |
| lead-magnet | Creates opt-in offer concepts |
| direct-response-copy | Writes pages that convert |
| seo-content | Writes content that ranks |
| newsletter | Creates email editions |
| email-sequences | Builds sequences that convert |
| content-atomizer | Turns 1 piece into 15 |

Plus the orchestrator -- a meta-skill that tells you which skill to run and in what order.

**This is for you if:**
- You use Claude for marketing but get generic output
- You know methodology matters but don't have time to learn it all
- You want a system, not random prompts

**This is NOT for you if:**
- You've never used Claude (start there first)
- You want someone to do it for you (this is a tool, not a service)
- You don't do your own marketing

$149 once. All 9 skills. All future updates.

[GET THE FULL SYSTEM]

No pressure. The positioning skill is yours either way.

-- James

---

### Email 6: Direct Pitch

**Send:** Day 10
**Subject:** Last thing about the skills pack
**Preview:** Then I'll stop talking about it

Last email about this, then I'll leave you alone.

The skills pack is $149. That's $16.55 per skill.

For context:
- A brand strategist charges $2,000-5,000
- A positioning consultant charges $3,000-10,000
- A copywriter charges $500-2,000 per page

You get methodology that handles all of it. Reusable. Forever.

The question isn't "is $149 a lot?" It's "what's one good landing page worth?"

If a better angle, clearer copy, or smarter content strategy gets you even ONE extra customer, you've made the money back.

[GET THE SKILLS PACK -- $149]

If you have questions, hit reply. I answer everything.

-- James

P.S. 200+ marketers are using this system. Join them: [LINK]

---

### Email 7: Final

**Send:** Day 12
**Subject:** Quick question
**Preview:** And then back to regularly scheduled programming

Quick question:

Did you decide on the skills pack?

Either answer is fine. But if something's holding you back, I'd love to know what it is. Hit reply and tell me.

After this, I'll go back to regular emails -- tactics, strategies, things I'm learning. No more pitching.

If you want the skills pack later, it'll be here: [LINK]

-- James

---

## Example: Subject Line A/B Variants for the Welcome Sequence

This demonstrates the 3-variant approach applied to each email in the example sequence above.

### Email 1: Delivery

```
SUBJECT LINE VARIANTS -- Email 1: Delivery

  ①  "Your positioning skill is inside"         ★ recommended
     → Safe bet: Direct, tells them exactly
       what they will find. Highest open rate
       for delivery emails because it matches
       the expectation set at opt-in.
     → Preview: "Here's how to use it in
       60 seconds"

  ──────────────────────────────────────────────

  ②  "Open this before you forget"
     → Bold play: Creates mild urgency.
       Pattern interrupt -- does not mention
       the lead magnet name. Works if inbox
       is crowded.
     → Preview: "Your positioning skill +
       a 60-second quick start"

  ──────────────────────────────────────────────

  ③  "hey -- here's that skill you wanted"
     → Personal: Lowercase, casual, feels like
       a message from a friend. High trust
       signal for creator audiences.
     → Preview: "Plus one question for you"

  ──────────────────────────────────────────────

  Recommended A/B test: ① vs ③
  Reason: Tests whether your audience responds
  better to professional clarity or personal
  warmth. Result informs voice for the rest
  of the sequence.
```

### Email 2: Connection

```
SUBJECT LINE VARIANTS -- Email 2: Connection

  ①  "Why I built this (quick story)"           ★ recommended
     → Safe bet: Curiosity gap + specificity.
       "Quick story" sets a low time commitment
       expectation. High open for day-2 emails.
     → Preview: "$2,400 on a strategist and
       nothing to show for it"

  ──────────────────────────────────────────────

  ②  "$2,400 mistake"
     → Bold play: Opens with the pain. Specific
       number creates immediate curiosity.
       Polarizing -- some will open fast, some
       may find it clickbaity.
     → Preview: "The 47-page PDF that sat in
       my Drive for six months"

  ──────────────────────────────────────────────

  ③  "quick story about a $2,400 lesson"
     → Personal: Lowercase, story-forward,
       includes the specific dollar amount for
       credibility. Feels conversational.
     → Preview: "And why I started building
       something different"

  ──────────────────────────────────────────────

  Recommended A/B test: ① vs ②
  Reason: Tests curiosity-based ("why I built
  this") against number-based ("$2,400 mistake")
  openness. Reveals whether your list responds
  to story hooks or specific financial stakes.
```

---

## Example: Individual Email File (01-delivery.md)

This shows exactly what a saved email file looks like:

```markdown
---
email: 1
sequence: skills-pack-welcome
purpose: Deliver the positioning skill and set expectations
send_day: 0
send_time: "Immediately after opt-in"
subject_line_a: "Your positioning skill is inside"
subject_line_b: "Open this before you forget"
subject_line_c: "hey -- here's that skill you wanted"
recommended_subject: "a"
preview_text: "Here's how to use it in 60 seconds"
cta: "Download the skill and try it on your product"
status: draft
---

# Email 1: Delivery

## Subject Line Variants

### A: "Your positioning skill is inside" -- recommended
Direct, tells them exactly what they will find. Highest open rate for delivery emails because it matches the expectation set at opt-in.

### B: "Open this before you forget"
Creates mild urgency. Pattern interrupt -- does not mention the lead magnet name. Works if inbox is crowded.

### C: "hey -- here's that skill you wanted"
Lowercase, casual, feels like a message from a friend. High trust signal for creator audiences.

**Recommended A/B test:** A vs C
**Reason:** Tests whether your audience responds better to professional clarity or personal warmth. Result informs voice for the rest of the sequence.

## Preview Text
"Here's how to use it in 60 seconds"

## Send Timing
Day 0 -- Immediately after opt-in
Delivery emails must go out within seconds of the opt-in. Any delay erodes trust and reduces open rates. This is the one email with near-100% open rate -- make it count.

---

## Email Copy

Hey,

Your positioning skill is attached. [LINK]

Here's how to use it in 60 seconds:

1. Download the .md file
2. Add it to Claude Code (or paste into a Claude conversation)
3. Ask: "Find positioning angles for [your product]"

That's it. Try it right now on whatever you're working on.

Over the next week, I'll send you a few emails showing how to get more out of this -- plus what happens when Claude has an entire marketing methodology instead of one skill.

Quick question: What project are you hoping to use this for? Hit reply and tell me. I read every one.

-- James

---

**P.S.** If you're not sure where to start, try it on your homepage headline. That's where most people see the biggest "aha" moment.
```

---

## Full Output Template

When generating a complete sequence, the skill output follows this exact structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {N}-EMAIL {SEQUENCE TYPE} SEQUENCE
  Generated {Month Day, Year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BRAND CONTEXT

  ├── Voice Profile     {✓/✗} {summary}
  ├── Positioning       {✓/✗} {summary}
  ├── Audience          {✓/✗} {summary}
  ├── Creative Kit      {✓/✗} {summary}
  ├── Lead Magnet       {✓/✗} {summary}
  └── Learnings         {✓/✗} {summary}

  ──────────────────────────────────────────────

  ESP STATUS

  {ESP detection results}

  ──────────────────────────────────────────────

  SEQUENCE OVERVIEW

  Day 0    "{Recommended subject line}"
           {Purpose}
           CTA: {action}
           Send: {Day} at {time}

  Day 2    "{Recommended subject line}"
           {Purpose}
           CTA: {action}
           Send: {Day} at {time}

  ... (all emails) ...

  ──────────────────────────────────────────────

  SUBJECT LINE VARIANTS -- Email 1: {Purpose}

  ①  "{Subject A}"                    ★ recommended
     → {type}: {rationale}
     → Preview: "{text}"

  ──────────────────────────────────────────────

  ②  "{Subject B}"
     → {type}: {rationale}
     → Preview: "{text}"

  ──────────────────────────────────────────────

  ③  "{Subject C}"
     → {type}: {rationale}
     → Preview: "{text}"

  ──────────────────────────────────────────────

  Recommended A/B test: {N} vs {N}
  Reason: {rationale}

  ... (repeat for each email) ...

  ──────────────────────────────────────────────

  EMAIL COPY -- Email 1: {Purpose}

  {Full email copy}

  ... (repeat for each email) ...

  ──────────────────────────────────────────────

  SEQUENCE ARCHITECTURE

  {Pattern name}
  {Visual flow diagram}

  ──────────────────────────────────────────────

  SEND TIMING SUMMARY

  Email  Day   Day of Week   Time     Purpose
  ──────────────────────────────────────────────
  01     0     {day}         {time}   {purpose}
  02     2     {day}         {time}   {purpose}
  03     4     {day}         {time}   {purpose}
  ...
  ──────────────────────────────────────────────

  Based on: {audience type}, {sequence type}
  {Any learnings data that informed timing}

  ──────────────────────────────────────────────

  FILES SAVED

  ./campaigns/{name}/brief.md              ✓
  ./campaigns/{name}/emails/01-{name}.md   ✓
  ./campaigns/{name}/emails/02-{name}.md   ✓
  ./campaigns/{name}/emails/03-{name}.md   ✓
  ...
  ./brand/assets.md                        ✓ (appended)

  ──────────────────────────────────────────────

  WHAT'S NEXT

  Your {N}-email {type} sequence is ready.
  Before distributing:

  → /creative           Build it — HTML email
                        templates, header graphics,
                        or visual assets (~15 min)
  → "Skip visuals"      Continue to next step ↓

  ──────────────────────────────────────────────

  → /content-atomizer   Promote lead magnet on
                        social (~15 min)
  → /direct-response-copy  Write the offer
                           landing page (~20 min)
  → /lead-magnet        Build the opt-in asset
                        (~15 min)
  → "Iterate"           Revise any email by
                        number

  Or tell me what you're working on and
  I'll route you.

  ──────────────────────────────────────────────

  FEEDBACK

  Before I close out:

  1. Do these emails sound like you / your brand?
     (If not, what feels off? I'll adjust.)

  2. Which subject line direction resonated most?
     (I'll note preferences in your learnings.)

  3. Did I get the timing right for your audience?
     (I can adjust send days/times.)
```

---

## How This Connects to Other Skills

**email-sequences uses:**
- **brand-voice** -- Ensures email voice matches brand
- **positioning-angles** -- The angle informs the pitch
- **lead-magnet** -- The sequence delivers the lead magnet
- **direct-response-copy** -- Individual emails use copy principles
- **audience-research** -- Informs send timing and sophistication level

**email-sequences feeds:**
- **content-atomizer** -- Best emails can become social content; lead magnet can be promoted
- **newsletter** -- Sequence insights inform newsletter strategy

**The flow:**
1. **lead-magnet** creates the opt-in offer
2. **email-sequences** builds the welcome -> conversion path
3. **direct-response-copy** principles inform each email
4. Subscriber becomes customer
5. **content-atomizer** promotes the lead magnet on social channels

### Chain to /content-atomizer

After generating the sequence, always suggest chaining to /content-atomizer for social promotion of the lead magnet that feeds the sequence. The atomizer can:

- Turn the lead magnet value proposition into social posts
- Create "what you'll learn" teaser content for each platform
- Build a distribution plan that drives opt-ins into the sequence

Prompt: "Your sequence is built, but it needs subscribers. Want me to create social content to promote your lead magnet and drive opt-ins? Just say /content-atomizer."

---

## Recording Feedback

After delivering the sequence, present the feedback prompt from the output template above. Process responses per `_system/brand-memory.md`:

### If "Great -- shipped as-is"
- Log to `./brand/learnings.md` under "What Works":
  ```
  - [YYYY-MM-DD] [/email-sequences] {N}-part {type} sequence shipped as-is. Angle: {angle}. Tone: {tone}. Subject line style: {style that was chosen}.
  ```
- Append entries to `./brand/assets.md` for the sequence.

### If "Good -- minor edits"
- Ask: "What did you change? Even small details help me improve."
- Log the change to `./brand/learnings.md`:
  ```
  - [YYYY-MM-DD] [/email-sequences] User {description of change}. Note: {what this implies for future sequences}.
  ```
- If edits reveal a voice mismatch, suggest: "Sounds like the voice might need tuning. Want to re-run /brand-voice?"

### If "Rewrote significantly"
- Ask: "Can you share what you changed or paste the final version? I'll learn from the diff."
- If they share, analyze the differences and log specific findings.
- If the rewrite reveals a pattern, suggest re-running /brand-voice.
  ```
  - [YYYY-MM-DD] [/email-sequences] User rewrote {type} sequence -- shifted from {original approach} to {new approach}. Voice profile may need update.
  ```

### If "Haven't used yet"
- Note it. Do not log anything to learnings.md yet.
- Optionally remind them next time: "Last time I created a {type} sequence for you. Did you ever ship it? I'd love to know how it went."

### Subject Line Performance Tracking

If the user reports back on which subject line variant won an A/B test:
- Log to `./brand/learnings.md` under "What Works" or "What Doesn't Work":
  ```
  - [YYYY-MM-DD] [/email-sequences] Subject line A/B test: "{winner}" beat "{loser}" ({open rate difference if known}). Pattern: {what the winner had that the loser didn't}.
  ```
- This data accumulates over time and directly informs which variant types to recommend as the "safe bet" in future sequences.

---

## The Test

A good email sequence:

1. **Delivers value before asking** -- At least 3-5 value emails before pitch
2. **Has clear purpose per email** -- Each email does ONE job
3. **Sounds human** -- Not corporate, not guru, not AI
4. **Creates momentum** -- Each email makes them want the next
5. **Handles objections** -- Addresses the "but..." before they think it
6. **Has one CTA** -- Every email drives one action
7. **Respects the reader** -- Can unsubscribe easily, not manipulative
8. **Has subject line options** -- 3 variants per email, not a single guess
9. **Has specific timing** -- Day, time, and rationale, not just "Day 2"
10. **Lives in individual files** -- Each email standalone, importable, iterable

If the sequence feels like "content, content, content, BUY NOW BUY NOW" -- it failed.

---
---

# Appendix: Quick-Reference Checklists

## Pre-Generation Checklist

Before writing any sequence, confirm:

- [ ] Sequence type established (welcome, nurture, conversion, launch, re-engagement, post-purchase)
- [ ] Brand memory loaded (or noted as absent)
- [ ] Lead magnet identified (from brand memory or user input)
- [ ] Paid offer identified (product, price, bridge logic)
- [ ] Audience type identified (B2B, B2C, creator -- informs timing)
- [ ] Objections listed (at least top 3)
- [ ] ESP detection completed (connected or copy-paste mode)
- [ ] Existing sequence check done (iteration detection)

## Per-Email Checklist

For each email in the sequence, verify:

- [ ] 3 subject line variants generated (safe bet, bold play, personal)
- [ ] Each variant uses a DIFFERENT formula category
- [ ] Preview text written (complements, does not repeat, subject)
- [ ] Single CTA identified
- [ ] Email has ONE clear purpose
- [ ] P.S. used strategically (or omitted intentionally)
- [ ] Open loop to next email (except final email)
- [ ] Specific send day and time assigned with rationale
- [ ] Voice matches brand profile (if loaded)
- [ ] Saved as individual file with correct naming convention

## Post-Generation Checklist

After delivering the complete sequence, verify:

- [ ] Campaign brief written to ./campaigns/{name}/brief.md
- [ ] All emails saved as individual files in ./campaigns/{name}/emails/
- [ ] File naming follows {nn}-{purpose}.md convention
- [ ] Campaign summary displayed with sequence overview
- [ ] Send timing summary displayed with specific days/times
- [ ] ESP status shown
- [ ] assets.md updated with sequence entry
- [ ] FILES SAVED section lists every file
- [ ] WHAT'S NEXT section offers 2-4 concrete actions
- [ ] /content-atomizer suggested for lead magnet promotion
- [ ] Feedback prompt presented

## Subject Line Quality Checklist

For each subject line variant:

- [ ] Under 50 characters (full mobile display)
- [ ] No emoji (unless brand voice explicitly uses them)
- [ ] No ALL CAPS
- [ ] Different formula from the other two variants
- [ ] Preview text written and paired
- [ ] A/B test recommendation with rationale
- [ ] Clear which is safe bet, bold play, personal
