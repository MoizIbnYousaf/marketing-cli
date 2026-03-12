---
name: brand-voice
description: >
  Define or extract a consistent brand voice that other skills can use. Three
  modes — Extract (analyze existing content), Build (construct from scratch),
  or Auto-Scrape (provide a URL, skill does the research). Use when starting
  a project, when copy sounds generic, or when output needs to sound like a
  specific person/brand. Triggers on: what's my voice, analyze my brand, help
  me define my voice, make this sound like me, voice guide, brand personality,
  analyze my website. Outputs a voice profile saved to ./brand/voice-profile.md
  that all content skills reference. Dependencies: none (foundation skill).
  Reads: positioning.md, audience.md. Writes: voice-profile.md.
---

# /brand-voice — Brand Voice Engine

Generic copy converts worse than copy with a distinct voice. Not because the
words are different — because the reader feels like they're hearing from a
PERSON, not a marketing team.

This skill defines that voice. Either by extracting it from existing content,
building it strategically from scratch, or auto-scraping a URL to analyze a
brand's public presence.

Read ./brand/ per _system/brand-memory.md

Follow all output formatting rules from _system/output-format.md

---

## Brand Memory Integration

On every invocation, check for existing brand context:

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/positioning.md | Market angles, differentiators | Informs voice positioning — a rebel brand sounds different from a trusted advisor |
| ./brand/audience.md | Buyer profiles, sophistication level | Jargon tolerance, formality level, cultural references |

### Writes

| File | What it contains |
|------|-----------------|
| ./brand/voice-profile.md | The complete voice profile (markdown + embedded JSON) |

### Context Loading Behavior

1. Check whether `./brand/` exists.
2. If it exists, read `positioning.md` and `audience.md` if present.
3. If loaded, show the user what you found:
   ```
   Brand context loaded:
   ├── Positioning    ✓ "{primary angle summary}"
   └── Audience       ✓ "{audience summary}"

   Using this to shape your voice profile.
   ```
4. If files are missing, proceed without them. Note at the end:
   ```
   → /positioning-angles would sharpen this profile
   → /audience-research would tune jargon level
   ```

---

## Iteration Detection

Before starting any mode, check whether `./brand/voice-profile.md` already
exists.

### If voice-profile.md EXISTS → Update Mode

Do not start from scratch. Instead:

1. Read the existing profile.
2. Present a summary of the current voice:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     EXISTING VOICE PROFILE
     Last updated {date} by {skill}

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Voice summary: {current summary}

     Tone spectrum:
     ├── Formal ↔ Casual:      {position}
     ├── Serious ↔ Playful:    {position}
     ├── Reserved ↔ Bold:      {position}
     ├── Simple ↔ Sophisticated: {position}
     └── Warm ↔ Direct:        {position}

     ──────────────────────────────────────────────

     What would you like to change?

     ① Refine the tone (adjust the spectrum)
     ② Update vocabulary (add/remove words)
     ③ Add new content samples (re-extract)
     ④ Full rebuild (start from scratch)
     ⑤ Auto-scrape my site for fresh data
   ```

3. Process the user's choice:
   - Options ①-② → Targeted update to specific sections
   - Option ③ → Run Extract mode on new content, merge results
   - Option ④ → Full Build or Extract mode from scratch
   - Option ⑤ → Auto-Scrape mode with existing profile as baseline

4. Before overwriting, show a diff of what changed:
   ```
   Changes to voice profile:

   Tone: Formal ↔ Casual
   ├── Was:  "Casual, but not sloppy"
   └── Now:  "Very casual, fragments OK"

   Added to vocabulary:
   ├── "ship it" — action phrase
   └── "real talk" — transition

   Removed from vocabulary:
   └── "comprehensive" — too corporate

   Save these changes? (y/n)
   ```

5. Only overwrite after explicit confirmation.

### If voice-profile.md DOES NOT EXIST → Mode Selection

Proceed to the mode selection flow below.

---

## The Core Job

Create a **voice profile** that other skills can reference to produce on-brand
output.

The profile should be specific enough that anyone (human or AI) could read it
and write in a way that sounds consistent with the brand.

**Output format:** A voice profile document containing:
- Voice summary (2-3 sentences capturing the essence)
- Personality traits (with explanations)
- Tone spectrum (where they land on key dimensions)
- Vocabulary guide (words to use, words to avoid)
- Rhythm and structure patterns
- Example phrases (on-brand vs off-brand)
- Platform adaptation table (how voice flexes across channels)
- Do's and don'ts
- Structured JSON data block (for downstream automation)

---

## Three Modes

### Mode 1: Extract
**Use when:** They have existing content they're proud of — website copy,
emails, social posts, newsletters, video transcripts.

**Process:** Analyze the content for patterns, then codify what makes it
distinctive.

### Mode 2: Build
**Use when:** Starting fresh, existing content is weak/generic, or they want
to evolve their voice strategically.

**Process:** Ask strategic questions, then construct a voice aligned with
their identity, audience, and positioning.

### Mode 3: Auto-Scrape
**Use when:** The user provides a URL or brand name. Available in Claude Code
with web search access.

**Process:** Automatically pull website copy, social bios, and recent posts.
Feed all gathered content into Extract mode without requiring manual paste.

**How to choose:**

Ask:

```
  Do you have existing content that represents
  how you want to sound?

  ① I have content I am proud of
     → Extract mode (paste it in)
  ② No, I am starting fresh
     → Build mode (I will ask questions)
  ③ I have content but want to evolve
     → Build mode (with existing as reference)
  ④ Just give me your URL
     → Auto-Scrape mode (I will research you)
```

If the user provides a URL in their initial message without being asked,
skip mode selection and go directly to Auto-Scrape mode.

---

## Mode 1: Extract

### What to Analyze

Request 3-5 pieces of content they consider "most them":
- Website copy (especially About page, homepage)
- Emails they've sent
- Social posts that performed well
- Newsletter editions
- Video or podcast transcripts
- Anything where they felt "this sounds like me"

### What to Look For

**1. Tone patterns**
- Formal ↔ Casual (contractions? slang? sentence fragments?)
- Serious ↔ Playful (humor? lightness? gravity?)
- Reserved ↔ Bold (hedging? strong claims? confidence?)
- Distant ↔ Intimate (we/they vs I/you? personal stories?)

**2. Vocabulary patterns**
- Industry jargon level (heavy, light, translated?)
- Signature words or phrases they repeat
- Words they seem to avoid
- Curse words or edgy language?
- Formal words vs everyday words

**3. Rhythm patterns**
- Average sentence length
- Paragraph length
- Mix of short punchy vs longer flowing
- Use of fragments
- List usage

**4. Structural patterns**
- How they open (story? question? statement?)
- How they transition
- How they close (CTA style? summary? open loop?)
- Headers and formatting preferences

**5. Personality signals**
- Self-deprecating or confident?
- Teacher or peer?
- Polished or raw?
- Optimistic or realistic?
- References and examples they use

**6. POV patterns**
- First person (I) or plural (we)?
- How they address reader (you? folks? friends?)
- Direct address or general statements?

### Extract Output

After analysis, produce the voice profile (format below). Then proceed to the
Voice Test Loop.

---

## Mode 2: Build

### Strategic Questions to Ask

**Identity:**
1. What are 3-5 words that describe your personality?
2. What do you stand for? What's your core belief about your industry/topic?
3. What's your background? What shaped how you see things?
4. What makes you genuinely different from others in your space?

**Audience:**
5. Who are you talking to? (Be specific)
6. What tone resonates with them? (What do they respond to?)
7. What would make them trust you? What would turn them off?

**Positioning:**
8. Are you the expert, the peer, the rebel, the guide, the insider?
9. Where do you sit on accessible ↔ exclusive?
10. Where do you sit on approachable ↔ authoritative?

**Aspiration:**
11. Name 2-3 brands or people whose voice you admire. What specifically do you like about how they communicate?
12. What do you explicitly NOT want to sound like?

**Practical:**
13. Any words or phrases that are signature to you?
14. Any words or phrases you hate or want to avoid?
15. How do you feel about humor? Profanity? Hot takes?

### Build Process

From the answers, construct voice profile:

1. **Synthesize personality** → Core traits that should come through
2. **Define tone spectrum** → Where they land on key dimensions
3. **Set vocabulary rules** → What to use, what to avoid
4. **Establish rhythm** → Sentence/paragraph patterns that fit
5. **Create examples** → Write sample phrases that embody the voice
6. **Define boundaries** → What's off-brand
7. **Map platform adaptations** → How voice flexes per channel

After building, proceed to the Voice Test Loop.

---

## Mode 3: Auto-Scrape

This is the v2 power mode. The user provides a URL, and the skill does the
research automatically.

### Prerequisites

Auto-Scrape requires web search capability. On Claude Code, use web search
tools to pull content. If web search is not available, fall back gracefully:

```
  Web search is not available in this environment.
  I can still build your voice profile:

  → Paste your website copy and I will extract it
  → Answer 15 questions and I will build it

  Which do you prefer?
```

### Auto-Scrape Process

**Step 1: Gather content**

From the provided URL, search for and pull:

```
  ◑ Scraping brand presence...

  ├── Homepage copy             searching...
  ├── About page                searching...
  ├── Blog posts (recent 3)     searching...
  ├── LinkedIn bio + posts      searching...
  ├── Twitter/X bio + tweets    searching...
  └── Any other public content  searching...
```

Specifically search for:
- `{url}` — Homepage content
- `{url}/about` or `{url}/about-us` — About page
- `{url}/blog` — Recent blog posts (grab 2-3)
- `site:{domain} linkedin.com` — LinkedIn profile/company page
- `site:{domain} twitter.com` OR `site:{domain} x.com` — Twitter/X presence
- `{brand name} {founder name}` — Any podcast appearances, interviews, guest posts

**Step 2: Report what was found**

```
  ✓ Scraping complete

  Content gathered:
  ├── Homepage           ✓ 850 words
  ├── About page         ✓ 420 words
  ├── Blog posts         ✓ 3 posts (2,100 words total)
  ├── LinkedIn           ✓ Bio + 5 recent posts
  ├── Twitter/X          ✗ Not found
  └── Total corpus       3,370+ words

  ──────────────────────────────────────────────

  Analyzing for voice patterns...
```

**Step 3: Feed into Extract mode**

Take all gathered content and run the full Extract analysis (all 6
dimensions: tone, vocabulary, rhythm, structure, personality, POV). The user
does not need to paste anything — the scraping did the work.

**Step 4: Supplement with quick questions**

After the automated extraction, ask 2-3 targeted questions to fill gaps the
scrape could not answer:

```
  I have a solid picture from your public content.
  Three quick questions to fill in the gaps:

  1. Is there anything about your current voice
     you want to change or evolve?
  2. Any words or phrases you love or hate that
     might not show up in your public content?
  3. Who do you admire voice-wise? (a brand,
     creator, or writer)
```

Merge the answers with the extracted data and produce the final voice profile.
Then proceed to the Voice Test Loop.

---

## Voice Test Loop

After generating the voice profile from ANY mode, run this validation step
before saving.

### Step 1: Generate 3 Sample Paragraphs

Using the voice profile you just created, write three pieces of sample content
in the brand's voice:

```
  ──────────────────────────────────────────────

  VOICE TEST — Does this sound like you?

  ──────────────────────────────────────────────

  SAMPLE 1: EMAIL OPENING

  "{A 3-4 sentence email opening paragraph that
  demonstrates the voice. Should feel like a real
  email the brand would send to their list. Include
  the greeting style, sentence rhythm, vocabulary,
  and personality from the profile.}"

  ──────────────────────────────────────────────

  SAMPLE 2: SOCIAL POST

  "{A LinkedIn or Twitter/X post in the brand's
  voice. Match the platform the brand is most
  active on. Demonstrate the social-specific
  adaptations from the platform table.}"

  ──────────────────────────────────────────────

  SAMPLE 3: LANDING PAGE HERO

  "{A landing page hero section — headline +
  subheadline + 1-2 supporting sentences. Show
  the brand's direct-response voice with benefit-
  focused, urgent copy.}"

  ──────────────────────────────────────────────

  Does this sound like you?

  ① Yes, that nails it → Save and finish
  ② Close but needs adjustment → Tell me what
  ③ Not quite right → Show me what is wrong
```

### Step 2: Process Feedback

**If ① "Yes, that nails it":**
- Proceed to file output (save the profile)

**If ② "Close but needs adjustment":**
- Ask: "What feels off? Be as specific as you can — is it the tone, the
  vocabulary, the rhythm, or something else?"
- Take their feedback
- Adjust the relevant sections of the voice profile
- Regenerate the 3 samples with the updated profile
- Present the test again
- Repeat until they confirm

**If ③ "Not quite right":**
- Ask: "Can you show me an example of something you have written that sounds
  right? Or describe specifically what is wrong — too formal? Too casual? Too
  safe? Too aggressive?"
- If they provide examples, run a focused Extract analysis on those examples
- Rebuild the profile sections that were off
- Regenerate all 3 samples
- Present the test again
- Repeat until they confirm

### Step 3: Iteration Limit

If the user goes through 3 rounds without confirming, surface this:

```
  We have been through a few rounds. Sometimes
  the best approach is to save what we have and
  refine it over time as you use other skills.

  ① Save current version (you can always re-run
     /brand-voice to update)
  ② One more round — I think I know what to fix
  ③ Start over with Build mode (answer the 15
     questions instead)
```

---

## The Voice Profile (Output Format)

This is the canonical format for voice-profile.md. Every field is required.
The Platform Adaptations table and the structured JSON block are v2 additions.

```markdown
## Last Updated
{YYYY-MM-DD} by /brand-voice

# {Brand/Person Name} Voice Profile

## Voice Summary
{2-3 sentences capturing the essence. What does this voice FEEL like to
encounter?}

## Core Personality Traits
- **{Trait 1}:** {What this means in practice}
- **{Trait 2}:** {What this means in practice}
- **{Trait 3}:** {What this means in practice}
- **{Trait 4}:** {What this means in practice}

## Tone Spectrum

| Dimension | Position | Notes |
|-----------|----------|-------|
| Formal ↔ Casual | {e.g., "Casual, but not sloppy"} | {specifics} |
| Serious ↔ Playful | {e.g., "Mostly serious, occasional wit"} | {specifics} |
| Reserved ↔ Bold | {e.g., "Bold, makes strong claims"} | {specifics} |
| Simple ↔ Sophisticated | {e.g., "Simple words, sophisticated ideas"} | {specifics} |
| Warm ↔ Direct | {e.g., "Direct but not cold"} | {specifics} |

## Vocabulary

**Words/phrases to USE:**
- {word/phrase} — {why/when}
- {word/phrase} — {why/when}
- {signature phrases if any}

**Words/phrases to AVOID:**
- {word/phrase} — {why}
- {word/phrase} — {why}
- {AI-sounding words to skip}

**Jargon level:** {Heavy / Moderate / Light / Translated}

**Profanity:** {Yes / Occasional / Never}

## Rhythm & Structure

**Sentences:** {e.g., "Mix of short punchy (3-5 words) and medium (10-15
words). Rarely long."}

**Paragraphs:** {e.g., "Short. 1-3 sentences max. Lots of white space."}

**Openings:** {e.g., "Often starts with bold statement or direct challenge.
Rarely asks questions."}

**Formatting:** {e.g., "Uses headers. Bulleted lists. Bold for emphasis.
Minimal emojis."}

## POV & Address

**First person:** {I / We / Mix}
**Reader address:** {You / Direct name / Folks / Friends / etc.}
**Relationship stance:** {Teacher / Peer / Guide / Insider / Rebel}

## Platform Adaptations

| Platform | Tone Shift | Structure | Length |
|----------|-----------|-----------|--------|
| Email | {e.g., "Warmer, more personal"} | {e.g., "Short paragraphs, clear CTA"} | {e.g., "150-300 words"} |
| LinkedIn | {e.g., "More professional, expertise-forward"} | {e.g., "Single-idea posts, line breaks"} | {e.g., "100-200 words"} |
| Twitter/X | {e.g., "Punchier, more opinionated"} | {e.g., "One idea, no fluff"} | {e.g., "Under 280 chars"} |
| Blog/SEO | {e.g., "More thorough, still voiced"} | {e.g., "Headers, lists, longer form"} | {e.g., "1500-2500 words"} |
| Landing Page | {e.g., "More urgent, benefit-focused"} | {e.g., "Short sentences, CTA-heavy"} | {e.g., "Varies by section"} |

## Example Phrases

**On-brand (sounds like us):**
- "{Example phrase}"
- "{Example phrase}"
- "{Example phrase}"

**Off-brand (doesn't sound like us):**
- "{Example phrase}" — {why it's wrong}
- "{Example phrase}" — {why it's wrong}
- "{Example phrase}" — {why it's wrong}

## Do's and Don'ts

**DO:**
- {specific guidance}
- {specific guidance}
- {specific guidance}

**DON'T:**
- {specific guidance}
- {specific guidance}
- {specific guidance}

---

<details>
<summary>Structured Data (JSON)</summary>

```json
{
  "brand_name": "{name}",
  "last_updated": "{YYYY-MM-DD}",
  "updated_by": "/brand-voice",
  "tone": {
    "summary": "{one-sentence tone summary}",
    "spectrum": [
      {
        "dimension": "Formality",
        "left_pole": "Casual",
        "right_pole": "Formal",
        "position": {1-10},
        "notes": "{context}"
      },
      {
        "dimension": "Energy",
        "left_pole": "Serious",
        "right_pole": "Playful",
        "position": {1-10},
        "notes": "{context}"
      },
      {
        "dimension": "Confidence",
        "left_pole": "Reserved",
        "right_pole": "Bold",
        "position": {1-10},
        "notes": "{context}"
      },
      {
        "dimension": "Complexity",
        "left_pole": "Simple",
        "right_pole": "Sophisticated",
        "position": {1-10},
        "notes": "{context}"
      },
      {
        "dimension": "Warmth",
        "left_pole": "Warm",
        "right_pole": "Direct",
        "position": {1-10},
        "notes": "{context}"
      }
    ]
  },
  "vocabulary": {
    "preferred": [
      { "term": "{word}", "context": "{when to use}" }
    ],
    "avoid": [
      { "term": "{word}", "reason": "{why}", "alternative": "{use instead}" }
    ]
  },
  "personality_traits": [
    "{trait 1}",
    "{trait 2}",
    "{trait 3}",
    "{trait 4}"
  ],
  "examples": {
    "on_brand": [
      { "text": "{example}", "source": "{origin}", "why": "{what makes it on-brand}" }
    ],
    "off_brand": [
      { "text": "{example}", "source": "{origin}", "why": "{what makes it off-brand}" }
    ]
  },
  "platform_adaptations": {
    "email": {
      "tone_shift": "{description}",
      "format_preferences": "{structure notes}",
      "length": "{typical length}",
      "dos": ["{do this}"],
      "donts": ["{avoid this}"]
    },
    "linkedin": {
      "tone_shift": "{description}",
      "format_preferences": "{structure notes}",
      "length": "{typical length}",
      "dos": ["{do this}"],
      "donts": ["{avoid this}"]
    },
    "twitter": {
      "tone_shift": "{description}",
      "format_preferences": "{structure notes}",
      "length": "{typical length}",
      "dos": ["{do this}"],
      "donts": ["{avoid this}"]
    },
    "blog": {
      "tone_shift": "{description}",
      "format_preferences": "{structure notes}",
      "length": "{typical length}",
      "dos": ["{do this}"],
      "donts": ["{avoid this}"]
    },
    "landing_page": {
      "tone_shift": "{description}",
      "format_preferences": "{structure notes}",
      "length": "{typical length}",
      "dos": ["{do this}"],
      "donts": ["{avoid this}"]
    }
  },
  "audience_awareness": {
    "sophistication_level": "{beginner|intermediate|advanced|mixed}",
    "jargon_tolerance": "{none|light|moderate|heavy}",
    "reading_level": "{target level}",
    "notes": "{additional context}"
  },
  "signature_phrases": [
    { "phrase": "{catchphrase}", "usage": "{when to use}" }
  ]
}
```

</details>
```

---

## Formatted Output Structure

When presenting the completed voice profile to the user, follow the output
format specification from `_system/output-format.md`. The terminal output
uses the premium formatting system. The markdown file saved to disk uses
standard markdown.

### Terminal Output Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BRAND VOICE PROFILE
  Generated {Mon DD, YYYY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Mode: {Extract | Build | Auto-Scrape}
  Brand: {name}

  {If brand context was loaded:}
  Brand context:
  ├── Positioning    ✓ loaded
  └── Audience       ✓ loaded

  ──────────────────────────────────────────────

  VOICE DNA

  Summary: {2-3 sentence voice summary}

  Personality:
  ├── {Trait 1}: {explanation}
  ├── {Trait 2}: {explanation}
  ├── {Trait 3}: {explanation}
  └── {Trait 4}: {explanation}

  ──────────────────────────────────────────────

  TONE SPECTRUM

  Formal ↔ Casual:      {position}
  Serious ↔ Playful:    {position}
  Reserved ↔ Bold:      {position}
  Simple ↔ Sophisticated: {position}
  Warm ↔ Direct:        {position}

  ──────────────────────────────────────────────

  VOCABULARY

  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✓ On-brand                                  │
  │  "{example phrase}"                          │
  │                                              │
  │  ✗ Off-brand                                 │
  │  "{example phrase}"                          │
  │                                              │
  └──────────────────────────────────────────────┘

  Words to use         Words to avoid
  ├── {word}           ├── {word}
  ├── {word}           ├── {word}
  └── {word}           └── {word}

  Jargon: {level}   Profanity: {level}

  ──────────────────────────────────────────────

  RHYTHM

  Sentences:  {pattern}
  Paragraphs: {pattern}
  Openings:   {pattern}
  Formatting: {pattern}

  ──────────────────────────────────────────────

  POV

  First person:     {I / We / Mix}
  Reader address:   {how they address the reader}
  Stance:           {Teacher / Peer / Guide / etc.}

  ──────────────────────────────────────────────

  PLATFORM ADAPTATIONS

  Platform      Tone Shift       Length
  ─────────────────────────────────────────
  Email         {shift}          {length}
  LinkedIn      {shift}          {length}
  Twitter/X     {shift}          {length}
  Blog/SEO      {shift}          {length}
  Landing Page  {shift}          {length}

  ──────────────────────────────────────────────

  VOICE TEST

  {Present the 3 sample paragraphs here}
  {Then the feedback prompt}

  ──────────────────────────────────────────────

  FILES SAVED

  ./brand/voice-profile.md       ✓

  WHAT'S NEXT

  Your voice profile is set. Every content skill
  will reference it from here on.

  → /positioning-angles   Find your market angle (~10 min)
  → /direct-response-copy Write your first landing
                          page (~15 min)
  → /start-here           See full project status

  Or tell me what you're working on and
  I will route you.
```

---

## Example: Extracted Voice Profile

### Input analyzed:
Website copy, 10 tweets, 3 newsletter editions from a SaaS founder

### Output:

# Marc Lou Voice Profile

## Last Updated
2026-02-16 by /brand-voice

## Voice Summary
Sounds like a friend who's been in the trenches, figured some things out, and
is sharing what actually worked — not what should work in theory.
Self-deprecating but confident. Casual but sharp. Makes you feel like you're
getting the real story, not the polished version.

## Core Personality Traits
- **Self-deprecating confidence:** Admits failures freely ("I believed I was
  Mark Zuckerberg") but backs claims with specific results. Not arrogant, but
  clearly knows what works.
- **Builder energy:** Everything framed around shipping, making, creating.
  Impatient with theory. Values speed and action.
- **Radical transparency:** Shares real numbers ($45K/month), real failures
  (0 users), real timelines. Nothing hidden.
- **Accessible expertise:** Knows a lot but explains simply. Never talks
  down. Peer, not guru.

## Tone Spectrum

| Dimension | Position | Notes |
|-----------|----------|-------|
| Formal ↔ Casual | Very casual | Contractions, fragments, emoji |
| Serious ↔ Playful | Playful with serious points | Humor to disarm, but real substance |
| Reserved ↔ Bold | Bold | Strong claims, specific numbers, no hedging |
| Simple ↔ Sophisticated | Simple | Short words, clear sentences |
| Warm ↔ Direct | Direct but warm | Friendly but doesn't waste words |

## Vocabulary

**Words/phrases to USE:**
- "Ship" — core action verb
- "Madman" — intensity descriptor ("shipped like a madman")
- Specific numbers always ($45K, 16 startups, 2 years)
- "Hey, it's [name]" — signature opener

**Words/phrases to AVOID:**
- "Comprehensive" / "robust" / corporate speak
- "I think" / "maybe" / hedging language
- "Passionate about" / empty descriptors
- Anything that sounds like a LinkedIn post

**Jargon level:** Light — uses "MRR" but explains concepts simply

**Profanity:** Occasional, casual (not aggressive)

## Rhythm & Structure

**Sentences:** Short. Punchy. Often fragments. Longest sentences are lists.

**Paragraphs:** 1-2 sentences. Lots of breathing room.

**Openings:** Personal intro ("Hey, it's Marc") or bold claim.

**Formatting:** Minimal headers. Emoji as punctuation. Numbers stand out.

## POV & Address

**First person:** I (never "we" unless referring to a group)
**Reader address:** You, direct
**Relationship stance:** Peer who's slightly ahead. "I was where you are."

## Platform Adaptations

| Platform | Tone Shift | Structure | Length |
|----------|-----------|-----------|--------|
| Email | Warmest — personal intros, "hey" opener | Short paragraphs, single CTA at end | 150-250 words |
| LinkedIn | Slightly more structured, still casual | Line breaks between sentences, hook first line | 100-200 words |
| Twitter/X | Most punchy, strongest claims, most fragments | One idea per tweet, threads for stories | Under 280 chars |
| Blog/SEO | Same voice, more depth, still short paragraphs | Headers, numbered lists, real examples | 1500-2000 words |
| Landing Page | Proof-heavy, benefit-first, urgency OK | Short sentences, social proof blocks, clear CTA | Varies by section |

## Example Phrases

**On-brand:**
- "I shipped 16 startups in 2 years. Now I'm happy and earn $45,000 a month."
- "If you could, you would have already."
- "I believed I was Mark Zuckerberg, built a startup for 1 year, and got 0 users."

**Off-brand:**
- "Our comprehensive solution helps entrepreneurs optimize their workflow." — Corporate, vague, no personality
- "I'm passionate about helping founders succeed." — Empty, cliche
- "It might potentially help some people in certain situations." — Hedge-y, weak

## Do's and Don'ts

**DO:**
- Lead with specific results and real numbers
- Admit failures and mistakes openly
- Write like you're texting a smart friend
- Use emoji sparingly but naturally
- Keep paragraphs short

**DON'T:**
- Hedge or qualify statements unnecessarily
- Use corporate or marketing-speak
- Write long paragraphs
- Hide behind "we" when you mean "I"
- Sound like you're trying to impress

---

## Example: Built Voice Profile

### Inputs provided:
New coaching business. Personality: direct, warm, no-BS. Audience: overwhelmed
entrepreneurs. Positioning: experienced peer, not guru. Admires: Sahil Bloom's
clarity, James Clear's simplicity. Hates: hustle culture, fake positivity.

### Output:

# [Coach Name] Voice Profile

## Last Updated
2026-02-16 by /brand-voice

## Voice Summary
The supportive friend who's direct enough to tell you what you need to hear,
not what you want to hear. Warm but efficient. Experienced but not preachy.
Makes complex things simple without dumbing them down. Anti-hustle,
pro-sustainable success.

## Core Personality Traits
- **Warm directness:** Cares about you AND will tell you straight. No toxic
  positivity, no harsh criticism. Honest but kind.
- **Calm confidence:** Been through it, figured things out. Doesn't need to
  prove anything. Shares from experience, not theory.
- **Simplifier:** Takes complicated concepts and makes them actionable. Values
  clarity over cleverness.
- **Anti-hustle:** Success doesn't require suffering. Sustainable beats
  unsustainable. Rest is productive.

## Tone Spectrum

| Dimension | Position | Notes |
|-----------|----------|-------|
| Formal ↔ Casual | Casual-professional | Warm, approachable, but not sloppy |
| Serious ↔ Playful | Mostly serious | Occasional lightness, but grounded |
| Reserved ↔ Bold | Measured bold | Clear opinions, not aggressive |
| Simple ↔ Sophisticated | Simple | Everyday words, accessible |
| Warm ↔ Direct | Both | Direct message, warm delivery |

## Vocabulary

**Words/phrases to USE:**
- "Here's the thing" — transition into real talk
- "What actually works" — contrast to theory/hype
- "Sustainable" — key value
- "You don't have to" — permission-giving
- Specific but not hypey numbers

**Words/phrases to AVOID:**
- "Hustle" / "grind" / "crush it"
- "10x" / "scale" / growth-bro language
- "Just" (minimizing: "just do this")
- "Amazing" / "incredible" / empty superlatives
- "Rise and grind" / hustle culture phrases

**Jargon level:** Very light — explains everything in plain language

**Profanity:** Rare, only for emphasis

## Rhythm & Structure

**Sentences:** Medium length. Flows conversationally. Short sentences for
emphasis.

**Paragraphs:** 2-4 sentences. Enough room to develop a thought.

**Openings:** Often reframes a problem. "Most advice about X tells you to Y.
But here's what actually works."

**Formatting:** Clean. Some bold for emphasis. Occasional bullet points.
Minimal emoji.

## POV & Address

**First person:** I (personal, not hiding behind "we")
**Reader address:** You, direct and personal
**Relationship stance:** Experienced peer. Been there, found a path, sharing it.

## Platform Adaptations

| Platform | Tone Shift | Structure | Length |
|----------|-----------|-----------|--------|
| Email | Warmest — "just between us" feel, more personal stories | Short paragraphs, single clear CTA | 200-350 words |
| LinkedIn | More expertise-forward, still warm, fewer contractions | Hook in first line, line breaks for readability | 150-250 words |
| Twitter/X | Most direct, strongest opinions, permission-giving | One reframe per tweet, "you don't have to" energy | Under 280 chars |
| Blog/SEO | Most thorough, teacher voice, still conversational | Headers, subheads, actionable sections, examples | 1800-2500 words |
| Landing Page | Benefit-focused, objection-aware, calm urgency | Problem-agitation-solution flow, proof points | Varies by section |

## Example Phrases

**On-brand:**
- "You don't have to burn out to build something meaningful."
- "Here's the thing about productivity advice: most of it assumes you have
  unlimited energy. You don't."
- "I tried the hustle approach for 3 years. It worked — until it didn't.
  Here's what I do instead."

**Off-brand:**
- "Ready to 10x your productivity and CRUSH your goals?!" — Hustle culture,
  hype-y
- "In this comprehensive guide, you'll learn..." — Corporate, distant
- "Just wake up at 5am!" — Oversimplified, "just" minimizes difficulty

## Do's and Don'ts

**DO:**
- Acknowledge their struggle is real
- Offer permission to do less/differently
- Share what you actually do, not what sounds good
- Keep it simple and actionable
- Speak as a peer who's further down the same path

**DON'T:**
- Promise unrealistic results
- Use hustle/grind language
- Talk down to them
- Overcomplicate with jargon
- Sound like a motivational poster

---

## Example: Auto-Scraped Voice Profile

### Input provided:
URL: `https://sahilbloom.com`

### Auto-Scrape process:

```
  ◑ Scraping brand presence...

  ├── Homepage copy            ✓ 620 words
  ├── About page               ✓ 380 words
  ├── Blog posts (3 recent)    ✓ 4,200 words
  ├── LinkedIn bio + posts     ✓ Bio + 8 posts
  ├── Twitter/X bio + tweets   ✓ Bio + 12 tweets
  └── Newsletter samples       ✓ 2 editions

  Total corpus: 7,400+ words
  Proceeding to extraction...
```

### Supplementary questions asked:
1. "Is there anything about your current voice you want to change?" →
   "No, I like how I sound. Maybe slightly less formal on social."
2. "Any words you love or hate?" →
   "Love 'simple' and 'framework.' Hate 'hack' and 'grind.'"
3. "Who do you admire voice-wise?" →
   "Morgan Housel for clarity. Tim Ferriss for structure."

### Output:

The skill then generates the full voice profile using the same template,
merging scraped content analysis with the supplementary answers. The voice
test loop runs with 3 sample paragraphs. After user confirmation, the profile
is saved to `./brand/voice-profile.md`.

---

## File Output Protocol

After the voice test loop passes (user confirms the voice sounds right),
write the profile to disk.

### Writing the File

1. Create the `./brand/` directory if it does not exist.
2. Write the complete voice profile to `./brand/voice-profile.md`.
3. Include the `## Last Updated` line at the top with today's date and
   `/brand-voice` as the author.
4. Include the structured JSON block at the bottom in a collapsible
   `<details>` section.
5. The JSON must conform to the schema at
   `_system/schemas/voice-profile.schema.json`.

### If Overwriting

Follow the brand memory protocol:
1. Read the existing file first.
2. Show the user what will change (diff the key sections).
3. Ask for confirmation: "Replace the existing file? (y/n)"
4. Only overwrite after explicit confirmation.
5. Confirm what changed: "Updated voice profile. Changes: shifted tone from
   formal to casual, added 3 new signature phrases, updated platform
   adaptations."

### Confirmation Output

After saving:

```
  FILES SAVED

  ./brand/voice-profile.md       ✓
```

---

## Platform Adaptation Guide

This section defines how a brand voice should flex across different channels.
Use this as the basis for filling in the Platform Adaptations table in every
voice profile.

### Email
- **Tone shift:** Warmer, more personal. This is a 1:1 conversation. The
  reader gave you their email address — honor that with intimacy.
- **Structure:** Short paragraphs (1-3 sentences). One clear CTA. Personal
  greetings when appropriate.
- **Length:** 150-300 words for regular sends. Up to 500 for story-driven
  sequences.
- **Adaptations:** More contractions. More "I" and "you." Okay to start
  sentences with "And" or "But." Sign-offs should match personality.

### LinkedIn
- **Tone shift:** More professional, expertise-forward. Not stiff — but the
  audience expects substance. Lead with insight, not personality.
- **Structure:** Single-idea posts. Line breaks between every sentence or
  thought (LinkedIn formatting). Hook in the first line (before "see more").
- **Length:** 100-200 words for regular posts. Up to 300 for deep posts.
- **Adaptations:** Fewer contractions than email. More "framework" language.
  End with a question or CTA for engagement. No hashtag spam.

### Twitter/X
- **Tone shift:** Punchiest version of the voice. More opinionated. Shorter.
  Hot takes welcome (if on-brand). Maximum signal, zero filler.
- **Structure:** One idea per tweet. Threads for longer stories (each tweet
  must stand alone). No fluffy intros.
- **Length:** Under 280 characters per tweet. Threads: 5-15 tweets.
- **Adaptations:** Fragments are fine. Single-sentence tweets. Strong
  opening words. Numbers and specifics always.

### Blog/SEO
- **Tone shift:** Same personality, more depth. The voice is present but
  not performing — it's teaching, sharing, or arguing at length.
- **Structure:** Headers, subheads, bulleted lists. Longer paragraphs OK
  (3-5 sentences). Examples and proof throughout.
- **Length:** 1500-2500 words for standard posts. Up to 4000 for pillar
  content.
- **Adaptations:** Can use more nuance. Okay to be more thorough. Still no
  jargon without explanation. Maintain rhythm even at length.

### Landing Page
- **Tone shift:** Most urgent, most benefit-focused. The voice is selling,
  not chatting. Direct response energy with brand personality.
- **Structure:** Short sentences. Benefit-driven headlines. Social proof
  blocks. Clear, repeated CTAs. Above-the-fold hook must land.
- **Length:** Varies by section. Hero: 20-40 words. Feature sections: 50-100
  words each. Full page: 800-2000 words.
- **Adaptations:** More power words. Stronger CTAs. Pain points more
  explicit. Proof points prominent. Voice stays but urgency increases.

---

## How This Skill Connects to Others

The voice profile becomes an INPUT to other skills:

**direct-response-copy + voice profile:**
"Write landing page copy for [product]. Use the attached voice profile to
match tone, vocabulary, and style."

**lead-magnet + voice profile:**
"Generate lead magnet concepts for [business]. The hook and framing should
align with this voice profile."

**email-sequences + voice profile:**
"Build a 7-email welcome sequence. Match the email-specific adaptations
from the platform table in the voice profile."

**seo-content + voice profile:**
"Write a 2000-word guide on [topic]. Use the blog/SEO adaptations from
the platform table to maintain voice at length."

**content-atomizer + voice profile:**
"Repurpose this blog post into LinkedIn posts and tweets. Reference the
platform-specific adaptations for each channel."

**newsletter + voice profile:**
"Design this week's newsletter edition. The voice should match the email
adaptations with slightly more personality than a standard send."

**creative + voice profile:**
"Generate ad copy variants for [campaign]. The headline voice should match
the landing page adaptations — urgent, benefit-focused, on-brand."

**The workflow:**
1. Run /brand-voice first (Extract, Build, or Auto-Scrape)
2. Confirm the voice through the test loop
3. Profile saves to ./brand/voice-profile.md
4. Every subsequent content skill reads this file automatically
5. Platform adaptations ensure voice flexes correctly per channel

---

## When to Revisit

Voice isn't static. Revisit the profile when:
- The brand evolves or pivots
- Audience changes significantly
- Current voice isn't converting
- New team members need onboarding
- Content starts feeling inconsistent
- Moving into a new platform (add adaptations)
- A/B tests reveal tone preferences
- Feedback from /email-sequences or /direct-response-copy suggests the
  voice profile is off

When the user revisits, the Iteration Detection system kicks in — they
see their current profile and choose what to update rather than starting
from scratch.

---

## The Test

A good voice profile passes this test:

1. **Recognizable:** Could someone identify content as "theirs" without a
   byline?
2. **Actionable:** Could a writer (human or AI) produce on-brand content
   using only the profile?
3. **Differentiated:** Does it sound different from competitors?
4. **Authentic:** Does it feel true to who they are (or want to be)?
5. **Consistent:** Can it be applied across formats (social, email,
   long-form)?
6. **Adaptive:** Does the platform adaptation table give enough guidance
   to shift voice per channel without losing identity?

If any answer is no, the profile needs more specificity.

---

## Feedback Collection

After the voice test loop passes and the profile is saved, present the
standard feedback prompt per brand-memory.md protocol:

```
  How did this land?

  a) Great — this is exactly how I sound
  b) Good — made minor mental adjustments
  c) Needs significant rework
  d) Have not tested it in real content yet

  (You can answer later — just run /brand-voice
  again and tell me.)
```

### Processing Feedback

**If (a) "Great":**
- Log to ./brand/learnings.md under "What Works":
  `- [{date}] [/brand-voice] Voice profile shipped as-is. Mode: {mode}. Key traits: {traits}.`

**If (b) "Good — minor adjustments":**
- Ask: "What would you adjust? Even small details help me improve."
- Log the change to learnings.md.
- Offer to update the profile: "Want me to work those adjustments into the
  profile now?"

**If (c) "Needs significant rework":**
- Ask: "Can you share what feels wrong? Or paste an example of something
  you have written that sounds right?"
- If they share examples, re-run Extract mode on those examples.
- Suggest: "Want to try Build mode instead? The 15 questions might get us
  closer."

**If (d) "Have not tested yet":**
- Note it. Do not log to learnings.md.
- Next time /brand-voice runs, remind: "Last time I built your voice
  profile. Have you used it in real content? I would love to know how
  it went."

---

## Error States

### No content provided in Extract mode

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ NO CONTENT TO ANALYZE                     │
  │                                              │
  │  Extract mode needs existing content to       │
  │  find your voice patterns. Paste in 3-5       │
  │  pieces of content you are proud of.          │
  │                                              │
  │  → Paste website copy, emails, or posts      │
  │  → Switch to Build mode (I will ask           │
  │    questions instead)                         │
  │  → Give me your URL for Auto-Scrape          │
  │                                              │
  └──────────────────────────────────────────────┘
```

### Auto-Scrape finds insufficient content

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ INSUFFICIENT CONTENT FOUND                │
  │                                              │
  │  I searched your web presence but found       │
  │  less than 500 words of content. That is      │
  │  not enough to reliably extract voice          │
  │  patterns.                                    │
  │                                              │
  │  Content found:                               │
  │  ├── Homepage       ✓ 120 words               │
  │  ├── About page     ✗ not found               │
  │  ├── Blog           ✗ not found               │
  │  ├── LinkedIn       ✓ bio only                │
  │  └── Twitter/X      ✗ not found               │
  │                                              │
  │  → Paste additional content manually          │
  │  → Switch to Build mode                       │
  │                                              │
  └──────────────────────────────────────────────┘
```

### Web search not available

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ AUTO-SCRAPE UNAVAILABLE                   │
  │                                              │
  │  Web search tools are not available in        │
  │  this environment. I cannot auto-scrape       │
  │  your website.                                │
  │                                              │
  │  → Paste your website copy (Extract mode)    │
  │  → Answer questions (Build mode)             │
  │                                              │
  └──────────────────────────────────────────────┘
```

---

## Complete Invocation Flow

This is the full decision tree for every /brand-voice invocation:

```
  /brand-voice invoked
  │
  ├── Check ./brand/ directory
  │   ├── Load positioning.md (if exists)
  │   └── Load audience.md (if exists)
  │
  ├── Check ./brand/voice-profile.md
  │   ├── EXISTS → Update Mode
  │   │   ├── Show current profile summary
  │   │   ├── Ask what to change
  │   │   ├── Process changes
  │   │   ├── Run Voice Test Loop
  │   │   ├── Show diff, confirm overwrite
  │   │   └── Save updated profile
  │   │
  │   └── DOES NOT EXIST → Mode Selection
  │       ├── User has content → Extract Mode
  │       │   ├── Analyze 3-5 content pieces
  │       │   ├── Extract across 6 dimensions
  │       │   ├── Generate voice profile
  │       │   ├── Run Voice Test Loop
  │       │   └── Save profile
  │       │
  │       ├── User starting fresh → Build Mode
  │       │   ├── Ask 15 strategic questions
  │       │   ├── Synthesize answers
  │       │   ├── Construct voice profile
  │       │   ├── Run Voice Test Loop
  │       │   └── Save profile
  │       │
  │       └── User provides URL → Auto-Scrape Mode
  │           ├── Scrape web presence
  │           ├── Report findings
  │           ├── Feed into Extract analysis
  │           ├── Ask 2-3 supplementary questions
  │           ├── Generate voice profile
  │           ├── Run Voice Test Loop
  │           └── Save profile
  │
  ├── After save → Feedback Collection
  │   ├── Present feedback prompt
  │   └── Log to learnings.md if applicable
  │
  └── Present WHAT'S NEXT section
      ├── → /positioning-angles
      ├── → /direct-response-copy
      └── → /start-here
```

---

## Implementation Notes for the LLM

When executing this skill, follow these rules precisely:

1. **Never skip the iteration check.** Always look for an existing
   voice-profile.md before starting a new profile.

2. **Never skip the voice test loop.** Every profile must be validated
   with 3 sample paragraphs before saving. The samples must be genuinely
   written in the extracted/built voice — not generic marketing copy.

3. **Show your work.** When loading brand context, say what you loaded.
   When scraping, show what you found. When analyzing, name the patterns.
   The user should feel like they are working with a senior strategist,
   not a black box.

4. **Platform adaptations are mandatory.** Every voice profile must include
   the Platform Adaptations table. This is what makes the profile useful
   across the entire skill system — not just for one channel.

5. **The JSON block is mandatory.** Every saved voice-profile.md must
   include the structured JSON at the bottom. This enables downstream
   automation and schema validation.

6. **Respect the brand memory protocol.** Read before write. Diff before
   overwrite. Confirm before save. Append to learnings.md, never overwrite.

7. **Auto-Scrape is best-effort.** Not every URL will yield rich content.
   If scraping finds less than 500 words, fall back gracefully to Extract
   or Build mode. Never guess at voice patterns from insufficient data.

8. **The voice test loop is a conversation.** Do not rush through it. If
   the user says "close but not quite," take the time to understand what
   is off. The profile is only as good as the user's confirmation.

9. **Fill the platform adaptations table thoughtfully.** Do not copy the
   template defaults. Each brand will have different platform behaviors.
   A casual brand might be MORE formal on LinkedIn. A formal brand might
   be LESS formal on Twitter. Think about each adaptation individually.

10. **Write the file path correctly.** The profile saves to
    `./brand/voice-profile.md`. Not `./voice-profile.md`. Not
    `./brand/voice.md`. The exact path matters for cross-skill references.
