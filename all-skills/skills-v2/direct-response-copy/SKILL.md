---
name: direct-response-copy
version: 7.0
description: "Write copy that converts. Use when writing landing pages, emails, sales copy, headlines, CTAs, social posts, or any persuasive content. Triggers on: make this convert, write copy for X, help me sell X, punch this up, write a landing page, write sales copy, score this copy, generate headline variants. Produces internet-native copy that sounds like a smart friend explaining something while quietly deploying every persuasion principle in the book. Loads brand voice and positioning from memory, generates multiple variants for testing, scores copy on 7 dimensions, and suggests A/B tests. Includes complete reference material from Schwartz, Hopkins, Ogilvy, Halbert, Caples, Sugarman, and Collier. Reads: voice-profile.md, positioning.md, audience.md, creative-kit.md. Writes: ./campaigns/{name}/*.md, assets.md."
---

# Direct Response Copy

Here's what separates copy that converts from copy that just exists: the good stuff sounds like a person talking to you. Not a marketing team. Not a guru. Not a robot. A person who figured something out and wants to share it.

That's what this skill does. It writes copy that feels natural while deploying the persuasion principles that actually work. The reader shouldn't notice the technique. They should just find themselves nodding along and clicking the button.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

---

## Brand Memory Integration

This skill reads brand context to make every piece of copy consistent with the brand's established identity.

**Reads:** `voice-profile.md`, `positioning.md`, `audience.md`, `creative-kit.md` (all optional)

On invocation, check for `./brand/` and load available context:

1. **Load `voice-profile.md`** (if exists):
   - Match the brand's tone, vocabulary, rhythm in all copy output
   - Apply the voice DNA: sentence length patterns, jargon level, formality register
   - Show: "Your voice is [tone summary]. All copy will match that register."

2. **Load `positioning.md`** (if exists):
   - Use the chosen angle as the copy's foundation
   - The positioning angle determines the lead, the proof hierarchy, the CTA framing
   - Show: "Your positioning angle is '[angle]'. Building copy around that frame."

3. **Load `audience.md`** (if exists):
   - Know who you are writing to: their awareness level, sophistication, pain points
   - Match Schwartz awareness level to headline approach (see methodology below)
   - Show: "Writing for [audience summary]. Awareness level: [level]."

4. **Load `creative-kit.md`** (if exists):
   - Visual consistency for landing pages: color palette, typography, image style
   - Ensure copy references match the visual system
   - Show: "Creative kit loaded -- copy will reference your visual system."

5. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Proceed without it -- this skill works standalone.
   - The copy will be excellent either way; brand memory makes it consistent.
   - Note: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

---

## What Are We Writing?

Before diving into frameworks, establish the format. Ask the user or infer from context:

  ①  LANDING PAGE
     Hero, problem, solution, proof, CTA sections.
     Typically 800-2000 words.
     Structure: The Full Sequence (see methodology below).
     Constraints: Mobile-first formatting, scannable, one primary CTA.

  ②  SALES PAGE
     Long-form. Full objection handling.
     Story-driven. Typically 2000-5000 words.
     Structure: Extended Full Sequence with founder story, extended proof, FAQ.
     Constraints: Multiple CTA placements, risk reversal prominent.

  ③  EMAIL
     Single idea, single CTA.
     Subject line + body. Under 500 words.
     Structure: Hook, value, CTA. That is it.
     Constraints: Subject line is the headline. Preview text matters. No images required.

  ④  AD COPY
     Platform-specific (Meta, Google, LinkedIn, TikTok).
     Character limits apply. Hook-focused.
     Constraints by platform:
       Meta primary text: 125 chars (visible), 1000 max
       Google responsive: 30-char headlines, 90-char descriptions
       LinkedIn: 150 chars intro, 600 max
       TikTok: 100 chars overlay, hook in first 2 seconds

  ⑤  SOCIAL POST
     Platform-native. Under 300 words typically.
     Hook + value + CTA.
     Constraints by platform:
       LinkedIn: 1300 chars for engagement, 3000 max
       Twitter/X: 280 chars, or thread format
       Instagram: 2200 chars caption max

  ⑥  GENERAL / OTHER
     Any persuasive writing. Custom format.
     Apply methodology below with user-specified constraints.

Each mode applies the SAME methodology below but with format-specific
constraints on length, structure, and CTA placement. State which mode
you are using before generating copy.

---

## Iteration Detection

Before starting, check if copy already exists for this project:

### If campaign files exist in `./campaigns/{name}/`

Do not start from scratch. Instead:

1. Read the existing copy files.
2. Present a summary of what exists:
   ```
   Existing copy found:
   ├── landing-page.md    ✓  (1,247 words, last updated Feb 10)
   ├── emails/            ✓  (3 emails in sequence)
   └── ads/               ✗  (none yet)
   ```
3. Ask: "Do you want to revise the existing copy, add a new piece, or start fresh?"
   - **Revise** -- load existing copy, apply scoring rubric, identify weak spots, rewrite
   - **Add new** -- use existing copy as context for consistency, write new piece
   - **Start fresh** -- run the full process below as if nothing exists

### If no campaign files exist

Proceed directly to copy generation using the methodology below.

---

## The core principle

Write like you're explaining to a smart friend who's skeptical but curious. Back up every claim with specifics. Make the transformation viscerally clear.

That's it. Everything else flows from there.

---

## Headlines

The headline does 80% of the work. One headline can outpull another by 19.5x. Same product, same offer, different headline.

### The master formula

> **[Action verb] + [specific outcome] + [timeframe or contrast]**

- "Ship your startup in days, not weeks"
- "Save 4 hours per person every single week"
- "Build a $10K/month business in 90 days"

The contrast version ("days, not weeks") creates before/after in six words.

### The story headline

John Caples wrote the most famous ad headline ever:

> "They Laughed When I Sat Down at the Piano... But When I Started to Play!"

It's a complete story in 15 words. Embarrassment, then triumph. Universal emotion. You have to know what happened next.

**The pattern:** "They [doubted] when I [action]... But when I [result]..."

### The specificity headline

Ogilvy's Rolls-Royce:

> "At 60 miles an hour, the loudest noise in this new Rolls-Royce comes from the electric clock."

Doesn't say "quiet car." Shows you with specific detail. The reader concludes "this must be quiet" themselves. Self-persuasion is stronger than being told.

**The pattern:** [Specific number/metric] + [Unexpected comparison or detail]

### The question headline

> "Do You Make These Mistakes in English?"

This ran for 40 years. Works because the reader immediately thinks "what mistakes?" and self-selects.

**The pattern:** "Do you [common struggle]?" or "What if you could [desirable outcome]?"

### The transformation headline

> "From Broke Musician to $100K/Year Music Teacher"

Before and after in one line. The reader sees themselves in the "before."

**The pattern:** "From [bad state] to [good state]"

### What makes headlines fail

- Trying to be clever instead of clear
- Forgetting self-interest (what's in it for them?)
- Vague claims instead of specific benefits
- No curiosity gap (tells everything, nothing left to discover)

---

## Opening lines

The first sentence has one job: get them to read the second sentence.

### The direct challenge

> "You've been using Claude wrong."

Stops the scroll. Creates tension. Self-selects readers who suspect you might be right.

### The story opening

> "Last Tuesday, I opened my laptop and saw a number I couldn't believe: $47,329 in one day."

The reader is IN the scene before they know they're reading sales copy.

### The confession

> "I'll be honest with you. I almost gave up on this business three times."

Vulnerability disarms skepticism. They think "they're like me."

### The specific result

> "In 9 months, we did $400k+ on a vibe-coded website using these exact methods."

Specific numbers create credibility. Reader wants to know how.

### The question

> "Have you ever stared at a blank page, knowing you need to write something that sells... and just froze?"

If the question matches their reality, they're hooked.

### The short sentence (Sugarman's approach)

> "It's simple."

> "Here's the truth."

> "This works."

No friction to start reading. They're into paragraph two before they realize it.

### Openings to avoid

- "In today's fast-paced world..."
- "Are you ready to take your business to the next level?"
- "Welcome! I'm so glad you're here."
- "In this article, you'll learn..."
- "Let's dive in!"

These are generic. They could be about anything. They don't demonstrate understanding.

---

## Curiosity gaps and open loops

The human brain craves closure. Open a loop, and they'll keep reading to close it.

### What's an open loop?

Incomplete information that creates psychological tension. You tease something without revealing it.

TV shows end every episode with a cliffhanger. You can't NOT watch the next one. Same principle in copy.

### Creating the gap

**Weak (no gap):** "10 Tips for Better Writing"

**Strong (gap):** "I tested 47 headlines. One pattern beat everything else by 3x."

The weak version tells you exactly what you'll get. The strong version creates a question: which pattern?

### Seeds of curiosity

End paragraphs with hooks that pull into the next section:

- "But that's not even the best part."
- "Here's where it gets interesting."
- "Let me explain why."
- "Which brings me to the real secret."
- "Now here's the thing..."

Use 2-4 per page. Every paragraph ending with "but there's more" gets tiresome.

### The partial reveal

> "The formula has three parts. The first one is obvious. The third one is counterintuitive. But the second one? That's where the magic happens."

Now they need to know the second part.

### Closing loops

You must close every loop you open. Tease "the one thing that changed everything" and never deliver? They'll never trust you again.

Small loops: close within 1-3 paragraphs. Big loops: close by the end of the piece.

---

## Flow techniques: the slippery slide

Sugarman: "Your readers should be so compelled to read your copy that they cannot stop reading until they read all of it as if sliding down a slippery slide."

Once they start, they can't stop. Every element pulls them to the next.

### Bucket brigades

Short phrases that smooth transitions between paragraphs:

- And
- So
- Now
- But
- Look
- Here's why
- Truth is
- Turns out
- The result?
- Think about it

**Without:** "Most landing pages focus on features. Benefits are what customers care about."

**With:** "Most landing pages focus on features. Here's the thing: Benefits are what customers care about."

The transition phrase smooths entry into the second paragraph.

### The stutter technique

Repeat a word from the last sentence in the first sentence of the next paragraph:

> "Now we're going to look at a more sophisticated technique.
>
> A technique used by professional writers, but often overlooked by copywriters."

"Technique" bridges the gap. Smoother than starting fresh.

### Short first sentences

The first sentence of any section should be stupidly easy to read:

> "It's simple."

> "Here's the problem."

> "This works."

Low friction to start. Momentum builds from there.

### Vary paragraph length

Same-length paragraphs = monotonous reading.

Short.

Then a medium paragraph that expands with more detail.

Then short again.

This creates rhythm. The eye moves easily.

### Momentum killers

- Jargon they have to pause to understand
- Long paragraphs with no breaks
- Tangents that don't connect to the main thread
- Weak transitions that jar the reader
- Same sentence structure repeated too many times

---

## Pain quantification

Vague problems feel overwhelming. Quantified problems feel solvable.

Don't just describe the pain. Do the math:

> "4 hrs to set up emails + 6 hrs designing a landing page + 4 hrs to handle Stripe webhooks + 2 hrs for SEO tags + ∞ hrs overthinking...
>
> = 22+ hours of headaches.
>
> There's an easier way."

When readers see "22+ hours," they calculate whether that's worth paying to eliminate. You've turned abstract frustration into a number they can weigh against your price.

Another approach: the scenario that makes them feel it:

> "Imagine the scene: you and your team get an urgent email, so you rapidly reply. But just after you hit send, your team replies as well. In the best case, you look disorganized. In the worst case, you contradict each other."

They've been there. Now they feel the problem instead of just acknowledging it.

---

## The So What? Chain

AI stops at the first layer of benefit. "Saves time." "Increases productivity." "Helps you grow." Weak.

For every feature, ask "so what?" until you hit something emotional or financial:

> **Feature:** Fast database
> "So what?"
> **Functional:** Queries load in milliseconds
> "So what?"
> **Financial:** Users don't bounce, revenue doesn't leak
> "So what?"
> **Emotional:** You stop waking up stressed about churn

The bottom of the chain is where the copy lives. Not "saves 4 hours" but "close your laptop at 5pm instead of 9pm." Not "automates outreach" but "wake up to replies instead of a blank inbox."

Three levels deep. Then write from there.

---

## Rhythm: alternation

Here's where most AI-generated copy fails. It's either all choppy fragments or all flowing paragraphs. Real human writing alternates.

Short sentence. Impact. Then a longer one that breathes, adds context, feels like actual conversation.

Watch how Hormozi does it:

> "Customers do NOT buy code. Customers buy a life transformation."

Punchy. Declarative. Repeated structure.

Now Justin Welsh:

> "Once upon a time, you had a job. You traded hours for dollars, clocked in and out, and waited for the weekend. Your skills were confined to a cubicle and your ambitions to an annual review and a 4% raise."

Longer. Conversational. Building through parallel structure.

Both work. The key is knowing when to punch and when to breathe.

**The pattern:**
- Hook (short, sharp)
- Expand (breathe, add context)
- Land it (kicker that punctuates)

Then repeat.

---

## The founder story

Almost every high-converting creator page includes a first-person story. The format: humble origins, struggle, discovery, success, offer.

> "Hey, it's Marc 👋 In 2018, I believed I was Mark Zuckerberg, built a startup for 1 year, and got 0 users... A few years after my burnout, I restarted the journey differently: I shipped like a madman. 16 startups in 2 years. Now I'm happy and earn $45,000 a month."

Why this works:
- Self-deprecating humor ("I believed I was Mark Zuckerberg") disarms skepticism
- Specific numbers ("16 startups in 2 years," "$45,000 a month") prove results
- The implicit message: I was where you are. I found the answer. Here it is.

The arc is always: **vulnerability → credibility → shared journey**

If you're writing for a founder, get their story. This isn't optional. It's the highest-trust element on the page.

---

## Testimonials

Generic testimonials ("Great product!") carry zero persuasive weight. Structure them as mini case studies:

> **[Before state] + [action taken] + [specific outcome] + [timeframe] + [emotional reaction]**

Examples:
- "I shipped in 6 days as a noob coder. It would have taken me months. I wanna cry 🥲"
- "I managed to exit and sell for 5 figures in a few weeks. Best investment I've made in so long."
- "We were able to buy our first business within 4 months of joining."

The specifics are everything. "4 months" is believable. "Helped me succeed" is not.

**Authority stacking:** If you have recognizable names, lead with them. Borrowed credibility creates instant trust transfer.

---

## Disqualification

This feels counterintuitive but works consistently. Tell certain people they're not a fit:

> "You're a good fit for this if:
> ✅ You know this is a tool, and you'll need to use it
> ✅ You're willing to reassess your existing ideas
>
> You're NOT a good fit if:
> ❌ You equate success with just buying a course
> ❌ You're not willing to do the unsexy work required"

Why this converts: It flips from "please buy" to "prove you're worthy." Velvet rope effect. Also pre-filters customers likely to complain.

Even simpler, for handling objections:

> "Couldn't I just do this myself with all the free content out there?"
>
> "If you could, you would have already. 🤷🏻"

---

## CTAs

Weak CTAs command action. Strong CTAs describe the benefit:

| Weak | Strong |
|------|--------|
| "Sign Up" | "Get ShipFast" |
| "Learn More" | "See the exact template I used" |
| "Subscribe" | "Send me the first lesson free" |
| "Buy Now" | "Start building" |

Below the CTA, add friction reducers:

> "$199 once. Join 2,600+ marketers. 2 minutes to install."

Pattern: **[Risk reversal] + [Social proof] + [Speed/ease]**

---

## Internet-native voice markers

Patterns that signal "written by someone who lives online, not a marketing team":

**Revenue transparency:**
- "Now I'm happy and earn $45,000 a month"
- Specific numbers that would make corporate uncomfortable

**Honest limitations:**
- "One note: 3D model generation isn't great yet"
- Acknowledging imperfection builds authenticity

**Strategic emoji:**
- "I wanna cry 🥲"
- Use sparingly but deliberately

**In-group language:**
- "Ship like a madman"
- "Indie hacker" / "solopreneur"
- Language your audience uses with each other

---

## The full sequence

When building a complete landing page:

1. **Hook** — Outcome headline with specific number or timeframe
2. **Problem** — Quantify the pain (hours wasted, money lost)
3. **Agitate** — Scenario or story that makes the problem vivid
4. **Credibility** — Founder story, authority endorsements, or proof numbers
5. **Solution** — What the product does, framed as transformation
6. **Proof** — Testimonials with specific outcomes
7. **Objections** — FAQ or "fit/not fit" section
8. **Offer** — Pricing with value justification
9. **Urgency** — Only if authentic
10. **Final CTA** — Benefit-oriented, friction reducers below

You don't need all ten every time. But this is the complete arc when you need it.

---

## AI tells to avoid

Readers are getting better at spotting AI-generated content. These patterns destroy trust instantly.

**Overused words:**
- "delve" / "dive into" / "dig into"
- "comprehensive" / "robust" / "cutting-edge"
- "utilize" (just say "use")
- "leverage" (as a verb)
- "crucial" / "vital" / "essential"
- "unlock" / "unleash" / "supercharge"
- "game-changer" / "revolutionary"
- "landscape" / "navigate" / "streamline"

**Overused phrases:**
- "In today's fast-paced world..."
- "It's important to note that..."
- "When it comes to..."
- "In order to..." (just say "to")
- "Whether you're a... or a..."
- "Are you ready to take your X to the next level?"
- "Let's dive in" / "Without further ado"

**Punctuation tells:**
- Too many em-dashes (limit to 1-2 per piece, use periods instead)
- Long sentences with 4+ commas (break them up)
- Colons in titles repeatedly
- Semicolons where periods would work

**Structural tells:**
- Every paragraph is the same length
- Every bullet point starts the same way
- Overly organized with too many headings
- Bold on every key term
- Numbered lists where the numbers don't matter

**Voice tells:**
- Passive voice throughout
- No "I" or "you" anywhere
- Hedging: "some may find," "it's possible that," "can potentially"
- No contractions
- Perfectly grammatical but lifeless

**The fix:**

Read your copy out loud. If you stumble, a reader will too. If it sounds like a textbook, rewrite it.

Real humans:
- Use contractions
- Write sentence fragments sometimes
- Have opinions without hedging
- Use "I" and "you" freely
- Make unexpected word choices

---

## Example transformation

**Generic:**
> "Our comprehensive SaaS boilerplate helps developers launch faster with cutting-edge features and best practices built in."

**Internet-native:**
> "Ship your startup in days, not weeks.
>
> You know the drill. You've got an idea, you're excited, and then you spend the next month setting up authentication, payment processing, email templates, and DNS records. By the time the boring stuff is done, you've lost momentum. Or worse, someone else shipped first.
>
> ShipFast is everything you need to launch, nothing you don't. Stripe, emails, SEO, auth. Done. You write your features, we handle the infrastructure.
>
> 2,894 makers ship faster with ShipFast. The next one could be you.
>
> Get ShipFast →"

The second version: specific numbers, pain quantification, transformation focus, social proof, benefit-oriented CTA. And it sounds like a person wrote it.

---

## The test

Before you ship, read it out loud. Ask:

1. Does it sound like someone talking, or someone "writing copy"?
2. Would I actually say this to a friend?
3. Is every claim backed by a specific number or proof?
4. Does the rhythm alternate (punchy moments, then breathing room)?
5. Is it about THEM (their transformation) or about ME (my product)?
6. Are there open loops pulling them forward?
7. Does it end with momentum?

If any answer is no, rewrite that part.

The goal isn't to hide that you're selling. It's to sell like a human, with honesty, specificity, and respect for the reader's intelligence.

---

## Reference Material

For deep-dive frameworks, headline formulas, opening line patterns, curiosity gap techniques, flow methods, and modern internet-native examples, read `references/COPYWRITING_PLAYBOOK.md`.

Load the playbook when:
- Writing long-form copy (landing pages, sales pages) — load the full playbook
- Writing headlines — load the Headlines and Opening Lines sections
- Scoring or reviewing copy — the methodology above is sufficient
- Quick copy tasks (social posts, short emails) — the methodology above is sufficient

---
---

# Variant Generation Protocol

Great copy is never one-shot. Generate variants for testing.

---

## Headlines: Generate 5-10

For every copy project, generate a minimum of 5 headline variants using
different frameworks from the methodology above:

  ①  The Direct Benefit headline
     Uses the master formula: [Action verb] + [Specific outcome] + [Timeframe/contrast]
     Straight value proposition. No cleverness. Maximum clarity.

  ②  The Curiosity Gap headline
     Opens a loop the reader must close. Implies hidden knowledge.
     Uses specificity to create a credible gap.

  ③  The Social Proof headline
     Leads with a number, a name, or a result from someone else.
     Borrowed credibility. "2,894 makers ship faster with..."

  ④  The Contrarian headline
     Challenges conventional wisdom. Creates a "wait, what?" moment.
     Must be genuinely counterintuitive, not contrarian for its own sake.

  ⑤  The Story headline
     Uses Caples' pattern: setup, tension, resolution implied.
     "They [doubted] when I [action]... But when I [result]..."

Plus 2-5 additional variants mixing frameworks:
  - Question + Benefit hybrid
  - Specificity + Transformation
  - How-To + Timeframe
  - Warning/Mistake + Curiosity
  - News/Newsjacking + Direct Benefit

Present as a numbered list. Mark the recommended pick with ★.

Always lead with a QUICK PICK summary so the user can grab the top choice immediately:

```
  QUICK PICK
  ★ "{Recommended headline}"
    → Best for: {audience awareness level}
    → Why: {one-sentence rationale}

  See all {N} variants below.
```

Example output:

```
Headlines for [Project Name]:

1. Ship your SaaS in a weekend, not a quarter.
2. I tested 12 launch strategies. One outperformed the rest by 4x.
3. ★ 2,894 founders launched faster. Here's what they used.
4. Stop building features. Start shipping products.
5. "They said I couldn't launch in a week. I launched in 3 days."
6. How to go from idea to paying customers in 7 days
7. Warning: Your competitors are shipping while you're still setting up auth.

Recommended: #3 — combines social proof (2,894 is specific and credible)
with a curiosity gap (what did they use?). Best for Solution-Aware audiences
who know they need a tool but haven't picked one yet.
```

---

## Body Copy: Generate 2-3 Variants

For landing pages and sales pages, generate at least 2 complete body
copy variants. Each uses the same core methodology but leads from a
different angle.

### Variant A: Control

The strongest version of the primary angle. Plays it straight.
Uses the most proven framework for the format.

- If landing page: follows The Full Sequence (Hook → Problem → Agitate → Credibility → Solution → Proof → Objections → Offer → CTA)
- If email: Hook → Single value point → CTA
- If ad: Hook → Benefit → CTA within character limits

This is the version you would ship if you could only ship one.

### Variant B: Contrarian

Leads with a counterintuitive or challenging take. Uses the enemy
or contrarian angle from positioning (if loaded from brand memory).

Opens with a pattern interrupt or direct challenge. The body reframes
the problem in a way the reader has not considered. Same offer, different
entry point.

Best for: Audiences showing skepticism, saturated markets where the
"straight" version blends in, or when brand voice is edgy/provocative.

### Variant C: Proof-Led

Opens with the strongest evidence. No warmup. Testimonial, case study,
or specific result upfront. The first thing the reader sees is proof
that this works.

Structure:
1. Lead with the single most compelling proof point
2. Context: who achieved this, how, timeframe
3. Bridge to the product/offer
4. Additional proof stack
5. CTA

Best for: Product-Aware or Most-Aware audiences (Schwartz levels 4-5)
who do not need to be sold on the problem. They need to be sold on
THIS solution.

### Presentation format

Present each variant as a complete piece. After each, include a note:

```
--- Variant Notes ---
Angle: [Control / Contrarian / Proof-Led]
Best for: [Audience type, awareness level, market condition]
Tone: [Matches voice profile / adjusted for this angle]
Recommended test: [What to test this against and why]
```

---

## Email Subject Lines: Generate 5-7

When writing emails, always generate 5-7 subject line variants:

1. Direct benefit subject
2. Curiosity gap subject
3. Story teaser subject
4. Question subject
5. Contrarian subject
6. (Optional) Personalized subject using audience data
7. (Optional) Urgency subject (only if authentic)

Mark the recommended pick with ★. Note expected open rate impact.

---
---

# Copy Scoring Rubric

When asked to evaluate existing copy OR to self-score generated copy,
rate on these 7 dimensions (1-10 each).

---

## The 7 Dimensions

| # | Dimension | What It Measures | 10 Looks Like |
|---|-----------|-----------------|---------------|
| 1 | Clarity | Can a 12-year-old understand the core message? | Crystal clear in one read. Zero re-reading required. |
| 2 | Specificity | Real numbers, details, concrete proof? | Every claim has a specific number or example attached. |
| 3 | Voice | Sounds like a person, not a brand? | Unmistakably human. Distinctive. Could not be anyone else. |
| 4 | Desire | Does it make them WANT the thing? | Reader feels FOMO by paragraph 2. Visceral pull toward CTA. |
| 5 | Proof | Is there evidence for every claim? | Specific testimonials, data, case studies. Nothing unsubstantiated. |
| 6 | Urgency | Is there a reason to act now? | Time-bound offer + clear consequence of inaction. Authentic, not manufactured. |
| 7 | Flow | Does each line pull to the next? | Impossible to stop reading. Slippery slide from headline to CTA. |

---

## Score Format

Present scores in this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  COPY SCORECARD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Clarity:      8/10   "Clear on the offer, vague on the mechanism"
  Specificity:  6/10   "Uses 'many customers' instead of actual numbers"
  Voice:        7/10   "Conversational but could be any SaaS brand"
  Desire:       5/10   "Lists benefits but doesn't make them visceral"
  Proof:        4/10   "One testimonial, no data, no case study"
  Urgency:      3/10   "No reason to act now vs next month"
  Flow:         7/10   "Good transitions, but paragraph 3 is a wall of text"

  ────────────────────────────────────────────────
  TOTAL:       40/70   (57%)

  Verdict: Needs rewrite. Below 70% threshold.

  Priority fixes:
  1. Add 2-3 specific testimonials with numbers (Proof: 4 → 7)
  2. Quantify the pain -- do the math for them (Desire: 5 → 8)
  3. Add authentic urgency (limited spots, price increase) (Urgency: 3 → 6)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Scoring Thresholds

| Range | Percentage | Verdict |
|-------|-----------|---------|
| 63-70 | 90-100% | Exceptional. Ship it. Minor polish only. |
| 56-62 | 80-89% | Strong. Ship with small tweaks noted. |
| 49-55 | 70-79% | Passing. Functional but leaving performance on the table. |
| 42-48 | 60-69% | Weak. Rewrite priority areas before shipping. |
| Below 42 | Below 60% | Needs full rewrite. Core issues in multiple dimensions. |

---

## When to Score

- **Before rewriting:** Score existing copy first. Show the user what is weak and why.
  This builds trust and makes the rewrite feel justified.
- **After generating:** Optionally self-score generated copy. Be honest.
  If a dimension scores below 7, note what would improve it and offer to revise.
- **On request:** When user says "score this" or "rate this copy" or "how good is this."

---
---

# A/B Testing Suggestions

After generating copy, suggest 3-5 specific tests to optimize performance.

---

## Test Suggestion Format

For each test, provide:

```
  Test [N]: [Element] — [Version A] vs [Version B]
  Why:     [Hypothesis based on copywriting principles from methodology]
  Metric:  [Which metric this targets: CTR, conversion, engagement, etc.]
  Impact:  [Expected direction and magnitude]
  Priority: [HIGH / MEDIUM / LOW] — [Reasoning]
```

---

## What to Test (Priority Order)

### HIGH priority (test these first)

**1. Headlines**
The headline is 80% of the work (Caples). One headline can outpull another
by 19.5x. Always test headline first.

Typical test: Direct Benefit vs Story vs Curiosity Gap
Expected impact: +15-50% CTR difference between best and worst

**2. Opening line / Hook**
The first sentence determines whether they read the rest.
Typical test: Story opening vs Direct challenge vs Specific result
Expected impact: +10-30% scroll depth

**3. CTA copy and placement**
Benefit-oriented vs command. Above fold vs below proof.
Typical test: "Get ShipFast" vs "Start building today"
Expected impact: +5-20% click-through on CTA

### MEDIUM priority

**4. Proof structure**
Lead with testimonial vs lead with data vs lead with founder story.
Expected impact: +5-15% conversion rate

**5. Length**
Short (500 words) vs long (2000 words) for landing pages.
Depends on awareness level. Less aware = longer copy needed.
Expected impact: +5-25% conversion (varies by audience)

### LOW priority (optimize after the above)

**6. Body copy angle**
Control vs Contrarian vs Proof-Led (the 3 variants above).
Expected impact: +3-10% conversion, but learnings are high-value

**7. Friction reducer copy**
Test different risk reversals, social proof numbers, speed claims.
Expected impact: +2-8% CTA clicks

---

## Example Test Suggestions

```
After generating landing page copy for [Product]:

  Test 1: Headline — Story vs Direct Benefit
  Why:     Your audience shows skepticism (competitors over-promise).
           Story may build trust faster than straight benefit claim.
  Metric:  CTR from ad → landing page, and scroll depth
  Impact:  +15-30% CTR if story resonates with skeptical audience
  Priority: HIGH — headline is 80% of the work

  Test 2: Opening — Pain quantification vs Founder story
  Why:     Two strongest hooks for Solution-Aware audiences.
           Math makes it rational; story makes it emotional.
  Metric:  Scroll depth past fold, time on page
  Impact:  +10-20% engagement
  Priority: HIGH — determines if they read past the first screen

  Test 3: CTA — "Start building" vs "See what's inside"
  Why:     First is action-oriented (confident buyers). Second is
           curiosity-oriented (researchers still evaluating).
  Metric:  CTA click rate
  Impact:  +5-15% clicks
  Priority: MEDIUM — meaningful but smaller than headline/hook

  Test 4: Social proof — Testimonial-first vs Data-first
  Why:     Testimonials create emotional proof. Data creates
           rational proof. Test which your audience responds to.
  Metric:  Conversion rate (sign-up or purchase)
  Impact:  +5-12% conversion
  Priority: MEDIUM — refines an already-working page

  Test 5: Body length — 800 words vs 1,500 words
  Why:     Your audience is Solution-Aware (level 3). They need
           enough to differentiate but not a full education.
  Metric:  Conversion rate, bounce rate
  Impact:  +5-20% conversion
  Priority: LOW — test after headline and hook are optimized
```

---
---

# File Output Protocol

Write completed copy to the campaign directory structure.

---

## Directory Structure

```
./campaigns/{campaign-name}/
├── landing-page.md
├── sales-page.md
├── emails/
│   ├── welcome-sequence-1.md
│   ├── welcome-sequence-2.md
│   └── {subject-slug}.md
├── ads/
│   ├── meta-benefit-v1.md
│   ├── meta-story-v1.md
│   ├── google-responsive-v1.md
│   └── {platform}-{variant}.md
└── social/
    ├── linkedin-launch-post.md
    ├── twitter-thread-v1.md
    └── {platform}-{description}.md
```

---

## File Naming

| Format | Naming Pattern | Example |
|--------|---------------|---------|
| Landing page | `landing-page.md` | `landing-page.md` |
| Sales page | `sales-page.md` | `sales-page.md` |
| Email | `emails/{subject-slug}.md` | `emails/welcome-to-the-crew.md` |
| Ad copy | `ads/{platform}-{variant}.md` | `ads/meta-benefit-v1.md` |
| Social post | `social/{platform}-{description}.md` | `social/linkedin-launch-post.md` |

---

## File Frontmatter

Every copy file includes frontmatter:

```yaml
---
type: [landing-page | sales-page | email | ad | social]
campaign: {campaign-name}
target_audience: [from brand memory or stated by user]
positioning_angle: [from brand memory or stated by user]
awareness_level: [unaware | problem-aware | solution-aware | product-aware | most-aware]
variant: [control | contrarian | proof-led | (custom label)]
platform: [web | meta | google | linkedin | tiktok | twitter | instagram]
word_count: [number]
date: [YYYY-MM-DD]
status: draft
score: [total/70 if scored]
---
```

---

## After Writing

1. **Save the file(s)** to the campaign directory.
2. **Update `./brand/assets.md`** with the new asset entry:
   ```
   ## [Date] — [Campaign Name]
   - [Type]: ./campaigns/{name}/{filename}.md ([word count] words, [variant])
   ```
3. **Report what was saved** in the output (see Output Formatting below).

---
---

# Output Formatting

Follow `_system/output-format.md` -- all 4 required sections.

---

## Section 1: Header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  DIRECT RESPONSE COPY
  Generated [Month Day, Year]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Section 2: Content

The copy itself, beautifully formatted. Structure depends on format:

**Landing page / Sales page:**
Present the full copy in reading order. Use section dividers between
major sections (hero, problem, solution, proof, CTA).

**Email:**
Present subject line, preview text, then body.

**Ad copy:**
Present per-platform with character counts noted.

**Headlines / Variants:**
Present as numbered list with ★ recommendation.

**Copy Scorecard:**
Present the scoring rubric output (see Scoring section above).

---

## Section 3: Files Saved

```
──────────────────────────────────────────────────
  Files saved
──────────────────────────────────────────────────

  ✓ ./campaigns/{name}/landing-page.md
  ✓ ./brand/assets.md (updated)
```

---

## Section 4: What's Next

Suggest logical follow-up skills:

```
──────────────────────────────────────────────────
  What's next
──────────────────────────────────────────────────

  Your copy is saved. Before moving on:

  → /creative            Build this — landing page,
                         ad creative, or visual
                         assets (~15 min)
  → "Skip visuals"       Continue to distribution ↓

  ──────────────────────────────────────────────

  → /email-sequences     Build a nurture sequence
                         around this page (~15 min)
  → /content-atomizer    Break into social posts,
                         email snippets, ad hooks (~10 min)
  → /lead-magnet         Create a lead magnet for the
                         top of this funnel (~10 min)
  → /keyword-research    Find search terms to drive
                         organic traffic here (~15 min)
```

Tailor suggestions to what was just created:
- After landing page → suggest email sequences, content atomizer, creative
- After email → suggest A/B test the subject lines, write landing page if none exists
- After ad copy → suggest landing page if none exists, creative for ad visuals
- After social post → suggest content atomizer for more formats, email to capture leads

---
---

# Feedback Collection

After delivering copy, collect feedback to improve future output.

---

## Standard Feedback Prompt

After presenting the copy and files-saved summary, ask:

```
──────────────────────────────────────────────────
  Feedback
──────────────────────────────────────────────────

  Before I close out, two quick questions:

  1. Does this sound like you / your brand?
     (If not, what feels off? I'll adjust.)

  2. Which variant or headline direction resonates most?
     (I'll note this in your brand learnings for next time.)
```

---

## Recording Feedback

If the user provides feedback:

1. **Voice adjustments** → Note in `./brand/voice-profile.md` under a "Copy Feedback" section (append, do not overwrite the profile).
2. **Angle/variant preferences** → Note in `./brand/learnings.md`:
   ```
   ## [Date] — Copy preference
   - Preferred [variant type] over [other variant type]
   - Reason: [user's stated reason or inferred reason]
   - Context: [what was being written]
   ```
3. **Specific edits** → Apply immediately and re-save the file.

This feedback accumulates over time, making each subsequent copy generation
better tuned to the brand.

---
---

# Appendix: Quick-Reference Checklists

## Pre-Generation Checklist

Before writing any copy, confirm:

- [ ] Format established (landing page, email, ad, social, sales page, other)
- [ ] Brand memory loaded (or noted as absent)
- [ ] Audience awareness level identified (Schwartz 1-5)
- [ ] Core transformation identified (not features -- the "so what?" chain result)
- [ ] Proof inventory taken (testimonials, data, case studies available)
- [ ] Positioning angle clear (from brand memory or stated)

## Post-Generation Checklist

Before delivering copy, verify:

- [ ] Read it out loud -- does it sound human?
- [ ] Every claim has a specific number or proof point
- [ ] Rhythm alternates (short punchy + longer breathing room)
- [ ] Open loops are all closed
- [ ] CTA is benefit-oriented with friction reducers
- [ ] No AI tells (check the avoid list)
- [ ] Voice matches brand profile (if loaded)
- [ ] Headlines: minimum 5 variants generated
- [ ] Body: minimum 2 variants for landing/sales pages
- [ ] Files saved to correct campaign directory
- [ ] assets.md updated
