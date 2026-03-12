---
name: seo-content
description: >
  Create high-quality, SEO-optimized content that ranks AND reads like a human
  wrote it. Use when turning keyword research into actual content pieces. Takes a
  target keyword/cluster and produces a complete article optimized for search
  while avoiding AI-sounding output. Performs live SERP analysis, integrates
  People Also Ask questions, generates Article + FAQ JSON-LD schema markup, and
  writes publication-ready content to disk. Supports content refresh mode for
  updating existing articles based on SERP changes. Triggers on: write SEO
  content for X, create article for keyword, write blog post about X, SEO
  article, content for keyword cluster, refresh article, update blog post.
  Outputs publication-ready content with proper structure, optimization, human
  voice, and schema markup saved to ./campaigns/content/{keyword-slug}.md.
  Dependencies: none (but enhanced by brand context and keyword plan). Reads:
  voice-profile.md, keyword-plan.md, audience.md. Writes: content files,
  assets.md, learnings.md. Chains to: /content-atomizer for social distribution.
---

# /seo-content -- Publication-Ready SEO Content

SEO content has a reputation problem. Most of it is garbage -- keyword-stuffed,
AI-sounding, says nothing new. It ranks for a month, then dies.

This skill creates content that ranks AND builds trust. Content that sounds like
an expert sharing what they know, not a content mill churning out filler.

The goal: Would someone bookmark this? Would they share it? Would they come back?

If yes, Google will reward it. If no, no amount of optimization saves it.

Read ./brand/ per _system/brand-memory.md

Follow all output formatting rules from _system/output-format.md

---

## Brand Memory Integration

On every invocation, check for existing brand context.

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/voice-profile.md | Tone, personality, vocabulary, rhythm | Directly shapes the writing style -- a "direct, proof-heavy" voice writes differently than a "warm, story-driven" voice |
| ./brand/keyword-plan.md | Prioritized keywords, content briefs, SERP data | Provides target keyword, cluster, intent, content type, and any pre-gathered SERP analysis |
| ./brand/audience.md | Buyer profiles, sophistication level, pain points | Informs how technical to write, what examples to use, what pain points to address |
| ./brand/positioning.md | Market angles, differentiators | Shapes the unique angle for the piece -- how your perspective differs from everyone else ranking |
| ./brand/competitors.md | Named competitors, their positioning | Identifies what angle competitors take so you can differentiate |
| ./brand/learnings.md | Past performance data | Reveals what content approaches worked before -- long-form vs short, story-driven vs data-driven |

### Writes

| File | What it contains |
|------|-----------------|
| ./campaigns/content/{keyword-slug}.md | The publication-ready article with frontmatter |
| ./brand/assets.md | Appends entry for the created content piece |
| ./brand/learnings.md | Appends findings after feedback collection |

### Context Loading Behavior

1. Check whether `./brand/` exists.
2. If it exists, read `voice-profile.md`, `keyword-plan.md`, `audience.md`,
   `positioning.md`, `competitors.md`, and `learnings.md` if present.
3. If loaded, show the user what you found:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓ "{tone summary}"
   ├── Keyword Plan    ✓ {N} pillars, {N} briefs
   ├── Audience        ✓ "{audience summary}"
   ├── Positioning     ✓ "{primary angle}"
   ├── Competitors     ✓ {N} competitors profiled
   └── Learnings       ✓ {N} entries

   Using this to shape content strategy and voice.
   ```
4. If files are missing, proceed without them. Note at the end:
   ```
   → /brand-voice would let me match your exact tone
   → /keyword-research would provide a content brief
   → /positioning-angles would sharpen the angle
   ```
5. If no brand directory exists at all:
   ```
   No brand profile found — this skill works standalone.
   I'll ask what I need as we go. Run /start-here or
   /brand-voice later to unlock personalization.
   ```

---

## Iteration Detection

Before starting, check whether a content file already exists for this keyword.

### If content file EXISTS --> Content Refresh Mode

Do not start from scratch. Instead:

1. Read the existing article at `./campaigns/content/{keyword-slug}.md`.
2. Present a summary of the current content:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     EXISTING CONTENT FOUND
     "{article title}"
     Published {date from frontmatter}

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Target keyword: {keyword}
     Word count: {N}
     Sections: {N}
     Last updated: {date}

     ──────────────────────────────────────────────

     What would you like to do?

     ① Refresh -- analyze SERP changes and update
     ② Rewrite -- full rewrite with new angle
     ③ Expand -- add new sections or depth
     ④ Start fresh -- ignore existing, write new
   ```

3. **If Refresh (option 1) -- Content Refresh Mode:**
   - Search the target keyword to get current SERP state
   - Compare current SERP against the article:
     - New competitors that appeared since publication?
     - New PAA questions not covered in the article?
     - Has the Featured Snippet format changed?
     - Are newer articles outranking with different angles?
     - Has search intent shifted?
   - Present specific refresh recommendations:
     ```
     SERP CHANGES SINCE PUBLICATION

     New competitors:
     ├── {new result 1} -- {angle they took}
     └── {new result 2} -- {angle they took}

     New PAA questions not in your article:
     ├── "{question 1}"
     └── "{question 2}"

     Recommended updates:
     ├── Add section on {topic} -- 3 new results
     │   cover this, you do not
     ├── Update {section} -- data is now outdated
     ├── Add FAQ for {question} -- new PAA
     └── Update schema markup -- add FAQ entries

     Apply these updates? (y/n)
     ```
   - If confirmed, apply the updates and save the refreshed article.
   - Update the frontmatter `last_updated` date.

4. Before overwriting, show what changed and confirm.

### If content file DOES NOT EXIST --> Full Creation Mode

Proceed to the full workflow below.

---

## The Core Job

Transform a keyword target into **publication-ready content** that:
- Answers the search intent completely
- Sounds like a knowledgeable human wrote it
- Is structured for both readers and search engines
- Includes proper on-page optimization
- Passes the "would I actually read this?" test
- Includes Article + FAQ JSON-LD schema markup
- Is saved to disk with proper frontmatter

---

## Required Inputs

Before writing, gather:

1. **Target keyword** -- Primary keyword to rank for
2. **Keyword cluster** -- Related keywords to include naturally
3. **Search intent** -- Informational / Commercial / Transactional
4. **Content type** -- Pillar guide / How-to / Comparison / Listicle / etc.
5. **Brand voice profile** -- (from voice-profile.md, if available)
6. **Unique angle** -- What perspective makes this different?

If coming from /keyword-research skill, most of this is already defined in
the content brief at `./campaigns/content-plan/{keyword-slug}.md`.

### Pre-Fill from Brand Memory

When brand memory files exist, pre-fill inputs automatically:

```
  From your brand profile and keyword plan:

  ├── Keyword      "{from keyword-plan.md or content brief}"
  ├── Cluster      {N} supporting keywords loaded
  ├── Intent       {from content brief}
  ├── Content type {from content brief}
  ├── Voice        "{tone summary from voice-profile.md}"
  ├── Angle        "{from positioning.md}"
  └── Audience     "{from audience.md}"

  Does this look right? Anything to adjust
  before I start researching?
```

If no content brief exists, ask the user for the target keyword and gather
the rest through conversation or inference.

---

## The Workflow

```
RESEARCH --> BRIEF --> OUTLINE --> DRAFT --> HUMANIZE --> OPTIMIZE --> SCHEMA --> REVIEW --> SAVE
```

---

## Phase 1: Research

Before writing a word, understand what you are competing against.

**This is a research-dependent skill.** Phase 1 requires live web search to
perform SERP analysis, capture People Also Ask questions, and identify
competitor gaps. Show the RESEARCH MODE signal per `_system/brand-memory.md`
before beginning research:

- **If web search tools are available:** Show `RESEARCH MODE → Data quality: LIVE`
  and proceed with full SERP analysis.
- **If web search tools are NOT available:** Show the `RESEARCH MODE → Data
  quality: ESTIMATED` block. Flag this to the user explicitly and ask whether
  to proceed with conceptual analysis or set up web search first. If the user
  proceeds, prefix all SERP-derived claims with `~` to indicate estimates, and
  skip to Phase 2 (Content Brief) using brand context and the user's input
  instead of live data.

### SERP Analysis (LIVE -- v2 Enhancement)

Search the target keyword using web search tools and analyze the top 5 results.

**For each result, capture:**
- Title and URL
- Content type (guide, listicle, tool page, etc.)
- Approximate word count
- Structure (headers, sections)
- Unique angles or data
- What they do well
- What they miss or get wrong
- How recent (publish/update date)
- Domain type (major publication, niche site, personal blog)

**Extract from SERP features:**
- People Also Ask questions (answer ALL of these)
- Featured Snippet format (match it to win it)
- AI Overview presence (what it includes/excludes)

**Present SERP findings to the user:**

```
  ──────────────────────────────────────────────

  SERP ANALYSIS: "{target keyword}"

  Top 5 results:
  ├── 1. {Title} -- {domain}
  │      {content type}, ~{N} words, {date}
  │      Angle: {their angle}
  │      Gap: {what they miss}
  │
  ├── 2. {Title} -- {domain}
  │      {content type}, ~{N} words, {date}
  │      Angle: {their angle}
  │      Gap: {what they miss}
  │
  ├── 3. {Title} -- {domain}
  │      {content type}, ~{N} words, {date}
  │      Angle: {their angle}
  │      Gap: {what they miss}
  │
  ├── 4. {Title} -- {domain}
  │      {content type}, ~{N} words, {date}
  │      Angle: {their angle}
  │      Gap: {what they miss}
  │
  └── 5. {Title} -- {domain}
         {content type}, ~{N} words, {date}
         Angle: {their angle}
         Gap: {what they miss}

  ──────────────────────────────────────────────

  SERP FEATURES

  ├── Featured Snippet    {format or "none"}
  ├── People Also Ask     {N} questions captured
  └── AI Overview         {present/absent, summary}

  ──────────────────────────────────────────────

  OPPORTUNITY ASSESSMENT

  {1-3 sentence summary of the gap your content
  will fill and why it can win}

  ──────────────────────────────────────────────
```

### People Also Ask Integration (v2 Enhancement)

Pull ALL People Also Ask questions for the target keyword via web search.
These become mandatory sections in your content.

**How to capture PAA:**
1. Search the target keyword
2. Record every PAA question shown
3. Click/expand each PAA to get second-level questions
4. Record those too
5. Search 2-3 keyword variations to find additional PAA questions

**How PAA shapes the content:**
- Each PAA question becomes an H2 or FAQ entry
- Answer PAA questions directly (Featured Snippet format)
- PAA phrasing is used in headers (matches how people search)
- Questions that deserve depth become full sections
- Questions that need brief answers go in the FAQ section

**PAA output:**

```
  PEOPLE ALSO ASK

  Full sections (answer as H2):
  ├── "{question 1}" -- high search signal
  ├── "{question 2}" -- aligns with content type
  └── "{question 3}" -- competitive gap

  FAQ entries (answer briefly):
  ├── "{question 4}"
  ├── "{question 5}"
  ├── "{question 6}"
  └── "{question 7}"
```

### Gap Analysis

After reviewing competitors and PAA, identify:

1. **What is missing?** -- Questions unanswered, angles unexplored
2. **What is outdated?** -- Old information, deprecated methods
3. **What is generic?** -- Surface-level advice anyone could give
4. **What is your edge?** -- Unique data, experience, perspective (informed by positioning.md)

Your content should fill these gaps.

---

## Phase 2: Content Brief

Before drafting, create a brief. If a content brief already exists from
/keyword-research (at `./campaigns/content-plan/{keyword-slug}.md`), load it
and enhance with live SERP data from Phase 1.

```
# Content Brief: [Title]

## Target Keyword
Primary: [keyword]
Secondary: [keyword], [keyword], [keyword]

## Search Intent
[Informational / Commercial / Transactional]

## Content Type
[Pillar Guide / How-To / Comparison / Listicle / etc.]

## Target Word Count
[Based on competitor analysis]

## Audience
Who is searching this? What do they need?
[Enhanced by audience.md if loaded]

## Unique Angle
What makes our take different?
[Informed by positioning.md if loaded]

## Key Points to Cover
- [Point 1]
- [Point 2]
- [Point 3]

## Questions to Answer (from PAA)
- [Question 1]
- [Question 2]
- [Question 3]

## Competitor Gaps to Fill
- [Gap 1]
- [Gap 2]

## Internal Links
- Link to: [related content on site]
- Link from: [existing content that should link here]

## CTA
What action should readers take?
```

---

## Phase 3: Outline

Structure the content based on type:

### Pillar Guide Structure (5,000-8,000 words)

```
1. Hook Intro (150-250 words)
   - Answer the title question immediately
   - Why this matters NOW
   - Who this is for (and who it's not for)

2. Quick Answer Section (200-300 words)
   - Direct answer for Featured Snippet
   - TL;DR for skimmers

3. Core Sections (3-5 major sections)
   - Each 800-1,500 words
   - Each answers a major sub-question
   - H2 headers with keyword variations
   - PAA questions as H2s where appropriate

4. Implementation / How to Apply (300-500 words)
   - Specific actionable steps
   - Decision framework if applicable

5. FAQ Section (5-10 questions)
   - From PAA research
   - Schema-ready format (used for JSON-LD)

6. Conclusion with CTA (150-200 words)
   - Summarize key takeaway
   - Clear next action
```

### How-To Tutorial Structure (2,000-3,000 words)

```
1. What You'll Achieve (150-200 words)
   - End result shown first
   - Time estimate
   - Prerequisites

2. Why This Method (200-300 words)
   - Context and alternatives
   - Why this approach works

3. Step-by-Step Instructions (1,200-2,000 words)
   - Numbered steps
   - One action per step
   - Troubleshooting inline

4. Variations / Advanced Tips (300-400 words)

5. Common Mistakes (200-300 words)

6. FAQ (3-5 questions from PAA)

7. Next Steps with CTA (100-150 words)
```

### Comparison Structure (2,500-4,000 words)

```
1. Quick Verdict (200-300 words)
   - Bottom line recommendation
   - "Choose X if... Choose Y if..."

2. Comparison Table
   - 8-12 key differentiators
   - Pricing, best for, key features

3. Deep Dive: Option A (800-1,000 words)
   - What it is
   - Key features
   - Pros/cons
   - Best for
   - Real example

4. Deep Dive: Option B (800-1,000 words)
   - Same structure

5. Head-to-Head Comparison (300-500 words)
   - Specific scenarios
   - When to pick each

6. FAQ (3-5 questions from PAA)

7. Final Recommendation with CTA
```

### Listicle Structure (2,000-3,000 words)

```
1. Intro with Context (150-200 words)
   - Why this list matters
   - How items were selected

2. Quick Summary Table/List
   - All items at a glance
   - For skimmers

3. Individual Items (150-300 words each)
   - What it is
   - Why it's included
   - Best for / Use case
   - Limitations (honesty builds trust)

4. How to Choose (200-300 words)
   - Decision framework

5. FAQ (3-5 questions from PAA)

6. Conclusion with CTA
```

---

## Phase 4: Draft

Write the first draft following these principles:

### Voice Calibration from Brand Memory

If voice-profile.md is loaded, calibrate the writing to match:

- **Tone:** Match the documented tone (direct, warm, technical, casual, etc.)
- **Personality:** Write as the persona described in the profile
- **Pacing:** Follow the documented rhythm patterns
- **Vocabulary:** Use the "words to use" list, avoid the "words to avoid" list
- **Examples:** Match the on-brand example style

If voice-profile.md is NOT loaded, default to: direct, conversational, specific,
opinionated. The kind of writing a smart friend who happens to be an expert
would produce.

### The First Paragraph Rule

Answer the search query in the first 2-3 sentences. Do not make them scroll.

**Bad:**
> "In today's rapidly evolving digital landscape, marketers are increasingly turning to artificial intelligence to streamline their workflows and enhance productivity..."

**Good:**
> "AI marketing tools can automate 60-80% of repetitive marketing tasks. Here are the 10 that actually work, based on testing them across 50+ client accounts."

### The "So What?" Chain

For every point you make, ask "so what?" until you hit something the reader actually cares about:

> Feature: "Automated email sequences"
> So what? "Sends follow-ups without you remembering"
> So what? "You wake up to replies instead of a blank inbox"
> So what? "Close deals while you sleep"

Write from the bottom of the chain, not the top.

### Specificity Over Generality

**Weak:** "This tool saves time."
**Strong:** "This tool cut our email outreach from 4 hours to 15 minutes per day."

**Weak:** "Many marketers struggle with content."
**Strong:** "73% of marketers publish less than once per week. Here's why."

Numbers, examples, specifics. Always.

### Show Your Work

Do not just make claims. Show how you know:

> "After testing 23 AI writing tools over 6 months, three stood out..."

> "We analyzed 147 high-ranking articles in this space. The pattern was clear..."

> "When I implemented this for [client], the results were..."

Experience signals beat assertions.

### Positioning-Informed Angle

If positioning.md is loaded, use the brand's positioning to shape the angle:

- **"The Anti-Agency"** angle: Write from the perspective of someone who has
  seen the agency model fail and found a better way
- **"Practitioner, Not Theorist"** angle: Lead with real implementation stories,
  not abstract advice
- **"Data-First"** angle: Lead every section with numbers and evidence

The positioning does not change WHAT you write about (the keyword dictates that).
It changes HOW you write about it -- your perspective, examples, and framing.

---

## Phase 5: Humanize

AI-generated content has tells. Remove them ruthlessly.

The goal is not "sounds okay." It is "sounds like a specific person wrote this based on real experience."

### The AI Detection Patterns

AI content fails in predictable ways. Learn to spot them:

**1. Word-Level Tells**

Kill these immediately:
- delve, dive into, dig into
- comprehensive, robust, cutting-edge
- utilize (just say "use")
- leverage (as a verb)
- crucial, vital, essential
- unlock, unleash, supercharge
- game-changer, revolutionary
- landscape, navigate, streamline
- tapestry, multifaceted, myriad
- foster, facilitate, enhance
- realm, paradigm, synergy
- embark, journey (for processes)
- plethora, myriad, bevy
- nuanced, intricate, seamless

**2. Phrase-Level Tells**

These scream "AI wrote this":
- "In today's fast-paced world..."
- "In today's digital age..."
- "It's important to note that..."
- "When it comes to..."
- "In order to..." (just say "to")
- "Whether you're a... or a..."
- "Let's dive in" / "Let's explore"
- "Without further ado"
- "At the end of the day"
- "It goes without saying"
- "In conclusion" (especially at the end)
- "This comprehensive guide will..."
- "Are you looking for..." (fake questions)
- "Look no further"

**3. Structure-Level Tells**

AI has recognizable structural patterns:

- **The Triple Pattern**: Everything in threes. Three benefits. Three examples. Three subpoints. Humans are messier.
- **Perfect Parallelism**: Every bullet point same length, same structure. Too clean.
- **The Hedge Stack**: "While X, it's important to consider Y, but also Z." Never commits.
- **Fake Objectivity**: "Some experts say... others believe..." without taking a position.
- **Summary Sandwich**: Intro summarizes, body covers, conclusion summarizes again. Boring.
- **Empty Transitions**: "Now that we've covered X, let's move on to Y." Adds nothing.

**4. Voice-Level Tells**

The hardest to fix:

- **No Opinions**: Everything balanced, nothing claimed. Real experts have takes.
- **No Mistakes Mentioned**: Never wrong about anything, ever. Suspicious.
- **Generic Examples**: "For example, a business might..." instead of a real story.
- **Distance from Subject**: Writing about, not from experience of.
- **Uniform Certainty**: Every statement equally confident. Humans hedge where uncertain, commit where sure.

### Before/After Examples

**AI Version:**
> "Email marketing remains a crucial component of any comprehensive digital marketing strategy. When it comes to improving open rates, it's important to consider several key factors. First, crafting compelling subject lines is essential. Second, segmenting your audience allows for more targeted messaging. Third, timing plays a vital role in engagement."

**Human Version:**
> "I ignored email for two years. Social media was sexier. Then I looked at the numbers: email drove 3x the revenue of all social combined. Here's what actually moves open rates--the stuff that worked when we tested it across 12 client accounts."

---

**AI Version:**
> "In today's fast-paced business landscape, professionals are increasingly turning to automation tools to streamline their workflows and enhance productivity. These comprehensive solutions offer a myriad of benefits for organizations of all sizes."

**Human Version:**
> "Most automation tools are shelfware. You buy them, set them up, use them twice, forget they exist. Here are the three that actually stuck after a year of testing--and the 14 I wasted money on."

---

**AI Version:**
> "Whether you're a seasoned marketer or just starting your journey, understanding SEO fundamentals is crucial for success. Let's dive into the essential strategies that can help you navigate the complex landscape of search engine optimization."

**Human Version:**
> "SEO advice is 90% outdated garbage. The tactics that worked in 2019 will get you penalized now. I'm going to show you what's actually ranking in December 2024--pulled from 300+ sites we analyzed last month."

### Voice Injection Points

Human content has these. AI content does not. Add them:

**Personal experience with specifics:**
> "I made this mistake for two years. Cost me roughly $40K in lost revenue before someone on Twitter pointed out what I was doing wrong."

**Opinion with reasoning:**
> "Honestly, most SEO advice is written by people who've never ranked anything. They're regurgitating what they read somewhere else. Here's what I've actually seen work..."

**Admission of limitations:**
> "This won't work for everyone. If you're in YMYL niches, ignore this entirely--different rules apply. If you're B2B enterprise, probably not either."

**Specific examples from real work:**
> "When we implemented this for [specific client--an e-commerce brand selling outdoor gear], their organic traffic went from 12K to 89K monthly in four months. Not because of any trick--because we fixed the structural issues killing their crawlability."

**Uncertainty where honest:**
> "I'm not 100% sure why this works. Best guess: the semantic density signals topical authority. But I've seen it work across 40+ sites, so I stopped questioning it."

**Tangents and asides:**
> "This is the part where most guides tell you to 'create quality content.' (Useless advice.) What does that actually mean? Here's the specific bar to clear..."

### Rhythm Variation

AI writes in monotonous rhythm--similar sentence lengths, parallel structures, predictable patterns. Fix it:

- Vary sentence length. Short punch. Then longer explanatory sentences that build out the context and add nuance that could not fit in a shorter form.
- Use fragments. For emphasis. Or drama.
- Start sentences with "And" or "But" when natural. Grammar rules exist to serve clarity, not the other way around.
- Include parenthetical asides (the kind of thing you would say out loud if explaining to a friend).
- Ask questions. Then answer them. Or do not -- leave some things hanging.
- One-word paragraphs.

Really.

### The Detection Checklist

Before publishing, run through:

```
[ ] No AI words (delve, comprehensive, crucial, leverage, landscape)
[ ] No AI phrases (in today's world, it's important to note, let's dive in)
[ ] Not everything in threes
[ ] At least one personal opinion stated directly
[ ] At least one specific number from real experience
[ ] At least one admission of limitation or uncertainty
[ ] Sentence lengths vary (some under 5 words, some over 20)
[ ] Would I say this out loud to a smart friend?
[ ] Does it sound like a specific person, or a committee?
[ ] Can I identify whose voice this is?
```

### The Read-Aloud Test

Read your draft out loud. If you stumble, readers will too. If it sounds like a textbook, rewrite it. If you would be embarrassed to read it to a colleague, it is not ready.

---

## Phase 6: Optimize

### On-Page SEO Checklist

```
[ ] Primary keyword in title (front-loaded if possible)
[ ] Primary keyword in H1 (can match title)
[ ] Primary keyword in first 100 words
[ ] Primary keyword in at least one H2
[ ] Secondary keywords in H2s naturally
[ ] Primary keyword in meta description
[ ] Primary keyword in URL slug
[ ] Image alt text includes relevant keywords
[ ] Internal links to related content (4-8 per piece)
[ ] External links to authoritative sources (2-4 per piece)
```

### Title Optimization

**Format:** [Primary Keyword]: [Benefit or Hook] ([Year] if relevant)

**Examples:**
- "AI Marketing Tools: 10 That Actually Work (2025)"
- "What is Agentic AI Marketing? The Complete Guide"
- "n8n vs Zapier: Which Automation Tool is Right for You?"

**Title rules:**
- Under 60 characters (or it gets cut off)
- Front-load the keyword
- Include a hook or differentiator
- Match search intent

### Meta Description

**Format:** [Direct answer to query]. [Proof/credibility]. [CTA or hook].

**Example:**
> "AI marketing tools can automate 60-80% of repetitive tasks. We tested 23 tools over 6 months to find the 10 that actually deliver. See the results."

**Meta rules:**
- 150-160 characters
- Include primary keyword
- Compelling enough to click
- Match what the content delivers

### Header Structure

```
H1: Main title (one per page)
  H2: Major section (keyword variation)
    H3: Subsection
    H3: Subsection
  H2: Major section (keyword variation)
    H3: Subsection
  H2: FAQ (if included)
    H3: Question 1
    H3: Question 2
```

Use headers for structure, not decoration. Each H2 should be a scannable summary of what follows.

### Featured Snippet Optimization

**For definition snippets:**
- Put definition in first paragraph
- Format: "[Keyword] is [definition in 40-50 words]"

**For list snippets:**
- Use H2 for the question
- Immediately follow with numbered or bulleted list
- Keep list items concise (one line each)

**For table snippets:**
- Use actual HTML tables
- Include clear headers
- Keep data concise

### Internal Linking Strategy

**Link TO this content from:**
- Related pillar content
- Blog posts on similar topics
- Resource pages

**Link FROM this content to:**
- Deeper dives on subtopics mentioned
- Related tools or resources
- Conversion pages (where appropriate)

**Anchor text:**
- Use descriptive text, not "click here"
- Vary anchor text naturally
- Include keywords where natural

---

## Phase 7: Schema Markup Generation (v2 Enhancement)

After the article is drafted and optimized, generate JSON-LD schema markup.
This is output alongside the article content.

### Article Schema

Generate Article schema for every content piece:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{SEO-optimized title}",
  "description": "{meta description}",
  "author": {
    "@type": "Person",
    "name": "{author name from brand context or user input}"
  },
  "datePublished": "{YYYY-MM-DD}",
  "dateModified": "{YYYY-MM-DD}",
  "publisher": {
    "@type": "Organization",
    "name": "{brand name from brand context or user input}"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{URL placeholder -- user fills in}"
  },
  "keywords": ["{primary keyword}", "{secondary 1}", "{secondary 2}"]
}
```

### FAQ Schema

If the article has an FAQ section (it should), generate FAQPage schema:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{FAQ question 1 from PAA}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Answer text}"
      }
    },
    {
      "@type": "Question",
      "name": "{FAQ question 2 from PAA}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Answer text}"
      }
    }
  ]
}
```

### HowTo Schema (for how-to content)

If the content type is a how-to tutorial, also generate HowTo schema:

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{title}",
  "description": "{meta description}",
  "step": [
    {
      "@type": "HowToStep",
      "name": "{Step 1 title}",
      "text": "{Step 1 description}"
    },
    {
      "@type": "HowToStep",
      "name": "{Step 2 title}",
      "text": "{Step 2 description}"
    }
  ]
}
```

### Schema Output Location

Schema markup is included in the article's frontmatter as a code block so
the user can copy it directly into their CMS:

```markdown
---
schema_article: |
  {Article JSON-LD}
schema_faq: |
  {FAQ JSON-LD}
---
```

---

## Phase 8: Quality Review

### Content Quality Checklist

```
[ ] Answers title question in first 300 words
[ ] At least 3 specific examples or numbers
[ ] At least 1 personal experience or unique insight
[ ] Unique angle present (not just aggregation)
[ ] All claims supported by evidence or experience
[ ] No generic advice (could apply to anyone)
[ ] Would I bookmark this? Would I share it?
[ ] PAA questions answered (all of them)
[ ] SERP gaps addressed (from Phase 1 analysis)
```

### Voice Quality Checklist

```
[ ] Reads naturally out loud
[ ] No AI-isms (delve, landscape, comprehensive)
[ ] No corporate speak (leverage, synergy)
[ ] Sentence length varies
[ ] Personality present
[ ] Would I actually say this to someone?
[ ] Matches voice-profile.md (if loaded)
[ ] Positioning angle visible (if loaded)
```

### SEO Quality Checklist

```
[ ] Primary keyword in title, H1, first paragraph
[ ] Secondary keywords in H2s naturally
[ ] Meta description compelling and <160 chars
[ ] Internal links included (4-8)
[ ] External citations for claims (2-4)
[ ] Alt text on all images
[ ] Headers create logical structure
[ ] FAQ section with schema-ready format
[ ] Schema markup generated (Article + FAQ)
```

### E-E-A-T Signals Checklist

```
[ ] Experience shown (real examples, specific results)
[ ] Expertise demonstrated (depth, accuracy, nuance)
[ ] Author credentials visible
[ ] Sources cited for factual claims
[ ] Updated date visible
[ ] No misleading claims
```

---

## File Output Format (v2 Enhancement)

All content is saved to disk as a markdown file with YAML frontmatter.

### File Location

```
./campaigns/content/{keyword-slug}.md
```

**Slug rules:**
- Lowercase kebab-case
- "What is AI marketing" --> `what-is-ai-marketing.md`
- "Best marketing automation tools 2026" --> `best-marketing-automation-tools-2026.md`
- Remove stop words from slug if over 60 characters

### Frontmatter Format

```yaml
---
title: "{SEO-Optimized Title}"
meta_description: "{150-160 character meta description}"
primary_keyword: "{target keyword}"
secondary_keywords:
  - "{keyword 1}"
  - "{keyword 2}"
  - "{keyword 3}"
content_type: "{pillar-guide / how-to / comparison / listicle / etc.}"
search_intent: "{informational / commercial / transactional}"
target_word_count: {number}
actual_word_count: {number}
author: "{author name}"
date_created: "{YYYY-MM-DD}"
last_updated: "{YYYY-MM-DD}"
status: "draft"
serp_snapshot_date: "{YYYY-MM-DD}"
paa_questions_answered: {number}
schema_article: |
  {Article JSON-LD here}
schema_faq: |
  {FAQ JSON-LD here}
---
```

### Article Body

After the frontmatter, the full article content in markdown:

```markdown
# {SEO-Optimized Title}

{Full article content with proper H2/H3 structure}

---

## Frequently Asked Questions

### {PAA Question 1}
{Answer}

### {PAA Question 2}
{Answer}

### {PAA Question 3}
{Answer}

---

**Internal links included:**
- {Link 1 to related content}
- {Link 2 to related content}
```

### Directory Creation

If `./campaigns/content/` does not exist, create it before saving.

---

## Formatted Terminal Output

When presenting the completed content to the user, use the premium terminal
formatting from `_system/output-format.md`.

### Terminal Output Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SEO CONTENT ARTICLE
  Generated {Mon DD, YYYY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {If brand context was loaded:}
  Brand context:
  ├── Voice          ✓ "{tone summary}"
  ├── Positioning    ✓ "{angle used}"
  ├── Audience       ✓ "{audience summary}"
  └── Keyword Plan   ✓ content brief loaded

  ──────────────────────────────────────────────

  SERP ANALYSIS

  Target: "{primary keyword}"
  Top results analyzed: {N}
  PAA questions captured: {N}
  Featured snippet: {format or "none"}

  Opportunity: {1-sentence assessment}

  ──────────────────────────────────────────────

  ARTICLE SUMMARY

  Title: {title}
  Word count: {N}
  Sections: {N}
  FAQ questions: {N}
  Internal links: {N}
  External citations: {N}

  ──────────────────────────────────────────────

  SCHEMA MARKUP

  ├── Article schema    ✓ generated
  ├── FAQ schema        ✓ {N} questions
  └── HowTo schema     {✓ generated / ○ not applicable}

  ──────────────────────────────────────────────

  QUALITY CHECKS

  ├── Content quality   ✓ {N}/{N} checks passed
  ├── Voice quality     ✓ {N}/{N} checks passed
  ├── SEO quality       ✓ {N}/{N} checks passed
  └── E-E-A-T signals   ✓ {N}/{N} checks passed

  ──────────────────────────────────────────────

  FILES SAVED

  ./campaigns/content/{slug}.md         ✓ (new)
  ./brand/assets.md                     ✓ (1 entry added)

  WHAT'S NEXT

  Your article is ready for review and publishing.
  Before distributing:

  → /creative           Build it — featured image,
                        social cards, or visual
                        assets (~15 min)
  → "Skip visuals"      Continue to distribution ↓

  ──────────────────────────────────────────────

  → /content-atomizer   Distribute across social —
                        LinkedIn, Twitter, Instagram,
                        TikTok, and more (~10 min)
  → /newsletter         Feature this article in your
                        next newsletter edition (~15 min)
  → /email-sequences    Nurture readers who find this
                        into subscribers (~15 min)
  → /seo-content        Write the next article from
                        your keyword plan (~20 min)
  → "Refresh" to update this article later

  Or tell me what you are working on and
  I will route you.
```

---

## Content Refresh Mode (v2 Enhancement -- Detailed)

Content refresh mode is triggered when:
1. The user points to an existing article (`./campaigns/content/{slug}.md`)
2. The user says "refresh" or "update" referring to a published article
3. The iteration detection finds an existing file for the target keyword

### The Refresh Process

1. **Read the existing article** -- Load the frontmatter and content.

2. **Re-run SERP analysis** -- Search the target keyword again with web search.

3. **Compare SERP state** -- Identify what changed since the article was
   published (using `serp_snapshot_date` from frontmatter):

   **New signals to check:**
   - New competitors in top 5 that were not there before
   - New PAA questions not covered in the article
   - Featured Snippet format changes
   - New content angles appearing in results
   - Search intent shifts (informational --> commercial, etc.)
   - New related topics Google associates with this keyword
   - AI Overview changes (new information included/excluded)

4. **Generate update recommendations** -- Specific, actionable changes:

   ```
   CONTENT REFRESH ANALYSIS

   Article: "{title}"
   Published: {date}
   Days since: {N}

   SERP changes detected:

   New competitors (not in original SERP):
   ├── {new URL 1} -- {what they cover that you do not}
   └── {new URL 2} -- {what they cover that you do not}

   New PAA questions:
   ├── "{new question 1}" -- not in your FAQ
   └── "{new question 2}" -- not in your FAQ

   Content gaps opened:
   ├── {topic/section competitors now cover}
   ├── {outdated stat or claim in your article}
   └── {new angle that is gaining traction}

   Recommended updates:
   ├── ① Add section: "{new H2}"
   │      Reason: {why}
   │      Placement: after "{existing H2}"
   ├── ② Update section: "{existing H2}"
   │      Reason: {what changed}
   │      Specific: {what to update}
   ├── ③ Add FAQ: "{new PAA question}"
   │      Answer: {brief answer to add}
   ├── ④ Update stats: {specific claim}
   │      Old: {old stat}
   │      New: {updated stat}
   └── ⑤ Update schema: add {N} new FAQ entries

   Apply these updates? (y/n)
   ```

5. **Apply and save** -- If confirmed, make the changes, update the
   `last_updated` and `serp_snapshot_date` in frontmatter, and save.

---

## Chain to /content-atomizer (v2 Enhancement)

After content creation, offer to atomize the article into social distribution
assets. This is the natural next step -- one article becomes 5-10 social posts.

### Chain Prompt

```
  ──────────────────────────────────────────────

  DISTRIBUTE THIS CONTENT

  Your article is {N} words of original content.
  That is enough raw material for:

  ├── 3-5 LinkedIn posts
  ├── 8-12 Twitter/X posts
  ├── 2-3 Instagram carousel concepts
  ├── 1 email newsletter excerpt
  └── 1 thread (Twitter or LinkedIn)

  → "Atomize" to run /content-atomizer now
  → "Not yet" to save the article and stop here

  ──────────────────────────────────────────────
```

### Handoff Data

If the user says "atomize" or similar, hand off to /content-atomizer with:
- The article file path: `./campaigns/content/{slug}.md`
- The article title and primary keyword
- Brand voice context (already loaded)
- The key takeaways and quotable passages from the article

---

## Example: Creating SEO Content from Keyword Research

### Input from /keyword-research skill:

```
Target: "what is agentic AI marketing"
Cluster: agentic AI, AI marketing agents, autonomous marketing
Intent: Informational
Content type: Pillar guide
Priority: Critical (category definition opportunity)
Content brief: ./campaigns/content-plan/what-is-agentic-ai-marketing.md
```

### Brand memory loaded:

```
  Brand context loaded:
  ├── Voice Profile   ✓ "Direct, proof-heavy, zero jargon"
  ├── Keyword Plan    ✓ 5 pillars, 12 briefs
  ├── Audience        ✓ "Funded startups, 10-50 employees"
  ├── Positioning     ✓ "Practitioner, not theorist"
  └── Competitors     ✓ 3 competitors profiled
```

### SERP analysis findings:

```
  SERP ANALYSIS: "what is agentic AI marketing"

  Top 5 results:
  ├── 1. "What is Agentic AI?" -- techcrunch.com
  │      Definition article, ~800 words, 2024
  │      Angle: General AI explainer
  │      Gap: No marketing application depth
  │
  ├── 2. "Agentic AI in Business" -- forbes.com
  │      Listicle, ~1,200 words, 2025
  │      Angle: Enterprise use cases
  │      Gap: No how-to, no specific tools
  │
  ├── 3. "AI Marketing Agents" -- hubspot.com
  │      Product page, ~600 words, 2025
  │      Angle: Selling their tool
  │      Gap: Biased, not comprehensive
  │
  ├── 4. Reddit thread -- r/marketing
  │      Discussion, various, 2025
  │      Angle: Practitioner questions
  │      Gap: No structured answer
  │
  └── 5. "AI Marketing Automation" -- neilpatel.com
         Guide, ~2,000 words, 2024
         Angle: General automation
         Gap: Not specific to agentic AI

  SERP FEATURES
  ├── Featured Snippet    definition format
  ├── People Also Ask     8 questions captured
  └── AI Overview         present, thin

  OPPORTUNITY ASSESSMENT
  Reddit in top 5 confirms major content gap.
  No comprehensive practitioner guide exists.
  Category definition opportunity is real.
```

### Content brief created:
- 5,000+ word pillar guide
- Unique angle: Practitioner perspective with real implementations
- Include: Definition, examples, tools, how to implement, future outlook
- Answer all 8 PAA questions
- Target Featured Snippet with clear definition

### Draft following pillar guide structure:
- Hook: "AI agents can now run marketing campaigns without you. Here's what that actually means."
- Quick answer section for snippet
- Deep sections on: What it is, How it works, Real examples, Tools, Implementation
- FAQ from PAA research (8 questions)
- CTA to community/resources

### Humanized with:
- Personal experience running AI marketing campaigns
- Specific metrics from real implementations
- Honest limitations acknowledged
- Conversational tone matching voice-profile.md ("direct, proof-heavy, zero jargon")

### Optimized with:
- Keyword in title, H1, first paragraph
- Secondary keywords in H2s
- Internal links to related content
- FAQ schema ready

### Schema generated:
- Article JSON-LD with full metadata
- FAQPage JSON-LD with 8 questions and answers

### Saved to:
- `./campaigns/content/what-is-agentic-ai-marketing.md` (with frontmatter)
- `./brand/assets.md` (entry appended)

---

## How This Connects to Other Skills

**Input from:**
- **keyword-research** --> Provides target keyword, cluster, intent, content type, and content briefs
- **positioning-angles** --> Provides unique angle for differentiation
- **brand-voice** --> Provides voice profile for consistent tone
- **audience-research** --> Provides audience context for appropriate depth and examples
- **competitive-intel** --> Provides competitor landscape for differentiation

**Uses:**
- **direct-response-copy** --> For CTAs and conversion elements within content

**Chains to:**
- **content-atomizer** --> Turns the article into social posts, email excerpts, threads

**The flow:**
1. /keyword-research identifies the opportunity and creates content briefs
2. /positioning-angles finds the unique angle
3. /brand-voice defines how it should sound
4. **/seo-content creates the actual piece** (you are here)
5. /content-atomizer distributes it across channels
6. /direct-response-copy punches up CTAs

---

## Reference: E-E-A-T Examples

See `references/eeat-examples.md` for 20 best-in-class examples of human-written content across verticals:

**Marketing/Business:**
- Paul Graham, Wait But Why, Stratechery, James Clear, Backlinko, Lenny's Newsletter, Derek Sivers

**Finance/Economics:**
- Matt Levine (Money Stuff), Morgan Housel (Psychology of Money)

**Technical/Engineering:**
- Julia Evans, Dan Luu, Shopify Engineering Blog

**Healthcare/Science:**
- Dr. Peter Attia, Dr. Siddhartha Mukherjee

**Enterprise/B2B:**
- First Round Review, Rosalyn Santa Elena (RevOps)

**Specialized Verticals:**
- Brian Krebs (Cybersecurity), Ken White (Legal), Katrina Kibben (HR/Recruiting), J. Kenji Lopez-Alt (Food Science)

Study these patterns. The goal is content that reads like these writers -- not like AI trained on generic web content.

---

## Complete Invocation Flow

This is the full decision tree for every /seo-content invocation:

```
  /seo-content invoked
  |
  +-- Check ./brand/ directory
  |   +-- Load voice-profile.md (if exists)
  |   +-- Load keyword-plan.md (if exists)
  |   +-- Load audience.md (if exists)
  |   +-- Load positioning.md (if exists)
  |   +-- Load competitors.md (if exists)
  |   +-- Load learnings.md (if exists)
  |
  +-- Check for existing content file
  |   +-- EXISTS --> Content Refresh Mode
  |   |   +-- Read existing article
  |   |   +-- Present summary + options
  |   |   +-- If Refresh: re-run SERP, compare, recommend
  |   |   +-- If Rewrite: full process with new angle
  |   |   +-- If Expand: add sections, keep existing
  |   |   +-- If Fresh: ignore existing, full process
  |   |   +-- Show diff, confirm overwrite
  |   |   +-- Save updated article
  |   |
  |   +-- DOES NOT EXIST --> Full Creation Mode
  |       +-- Gather inputs (pre-fill from brand memory)
  |       |
  |       +-- Phase 1: Research
  |       |   +-- SERP analysis (web search)
  |       |   +-- PAA question capture
  |       |   +-- Gap analysis
  |       |
  |       +-- Phase 2: Content Brief
  |       |   +-- Load from /keyword-research or create new
  |       |
  |       +-- Phase 3: Outline
  |       |   +-- Structure based on content type
  |       |   +-- PAA questions mapped to H2s/FAQ
  |       |
  |       +-- Phase 4: Draft
  |       |   +-- Voice from voice-profile.md
  |       |   +-- Angle from positioning.md
  |       |   +-- Depth from audience.md
  |       |
  |       +-- Phase 5: Humanize
  |       |   +-- AI detection patterns removed
  |       |   +-- Voice injection points added
  |       |   +-- Rhythm variation applied
  |       |
  |       +-- Phase 6: Optimize
  |       |   +-- On-page SEO checklist
  |       |   +-- Title, meta, headers, links
  |       |   +-- Featured snippet optimization
  |       |
  |       +-- Phase 7: Schema Markup
  |       |   +-- Article JSON-LD
  |       |   +-- FAQ JSON-LD
  |       |   +-- HowTo JSON-LD (if applicable)
  |       |
  |       +-- Phase 8: Quality Review
  |           +-- Content quality checklist
  |           +-- Voice quality checklist
  |           +-- SEO quality checklist
  |           +-- E-E-A-T signals checklist
  |
  +-- Save outputs
  |   +-- ./campaigns/content/{keyword-slug}.md
  |   +-- ./brand/assets.md (append entry)
  |
  +-- Present formatted output (output-format.md)
  |   +-- Header
  |   +-- SERP analysis summary
  |   +-- Article summary + quality checks
  |   +-- Schema markup status
  |   +-- FILES SAVED
  |   +-- WHAT'S NEXT (with /content-atomizer chain)
  |
  +-- Chain offer: Atomize into social with /content-atomizer?
  |
  +-- Feedback Collection
      +-- Present feedback prompt
      +-- Log to learnings.md if applicable
```

---

## Error States

### Web search not available

```
  +----------------------------------------------+
  |                                              |
  |  X  SERP ANALYSIS UNAVAILABLE               |
  |                                              |
  |  Web search tools are not available in this  |
  |  environment. I can still write the article  |
  |  using brand context and content brief --    |
  |  but without live SERP analysis, PAA data,   |
  |  or competitor gap validation.               |
  |                                              |
  |  -> Continue without SERP data               |
  |  -> Provide competitor URLs manually         |
  |                                              |
  +----------------------------------------------+
```

When web search is unavailable, skip SERP analysis in Phase 1. Proceed with
the brief-based approach (Phase 2 onward). Note in the output that SERP
validation was not performed and recommend the user manually check top
results for the target keyword.

### No target keyword provided

```
  +----------------------------------------------+
  |                                              |
  |  X  NEED A TARGET KEYWORD                   |
  |                                              |
  |  I need a keyword to write for. Options:     |
  |                                              |
  |  -> Tell me the keyword to target            |
  |  -> /keyword-research to find the right one  |
  |  -> Point me to a content brief              |
  |                                              |
  +----------------------------------------------+
```

### Voice profile not found

```
  +----------------------------------------------+
  |                                              |
  |  X  BRAND VOICE NOT FOUND                   |
  |                                              |
  |  I can write this article, but without your  |
  |  voice profile I will use a default style:   |
  |  direct, conversational, specific.           |
  |                                              |
  |  -> /brand-voice  Build your profile (~10 min|
  |  -> Continue with defaults                   |
  |                                              |
  +----------------------------------------------+
```

### Content directory not writable

```
  +----------------------------------------------+
  |                                              |
  |  X  CANNOT SAVE CONTENT                     |
  |                                              |
  |  Could not write to ./campaigns/content/.    |
  |  The article is generated and displayed      |
  |  above -- you can copy it manually.          |
  |                                              |
  |  -> Check directory permissions              |
  |  -> Save to a different location             |
  |                                              |
  +----------------------------------------------+
```

---

## The Test

Before publishing, ask:

1. **Does it answer the query better than what is ranking?**
2. **Would an expert in this field approve of the accuracy?**
3. **Would a reader bookmark or share this?**
4. **Does it sound like a person, not a content mill?**
5. **Is there at least one thing here they cannot find elsewhere?**
6. **Does it pass the AI detection checklist?** (Phase 5)
7. **Does it match the quality bar of the E-E-A-T examples?**
8. **Does it answer ALL People Also Ask questions?** (v2)
9. **Is the schema markup valid and complete?** (v2)
10. **Is it saved to disk with proper frontmatter?** (v2)

If any answer is no, revise before publishing.

---

## Feedback Collection

After the article is saved and presented, offer the standard feedback prompt
per brand-memory.md protocol:

```
  How did this land?

  a) Great -- ready to publish as-is
  b) Good -- made minor edits
  c) Rewrote significantly
  d) Have not published yet

  (You can answer later -- just run
  /seo-content again and tell me.)
```

### Processing Feedback

**If (a) "Great":**
- Log to ./brand/learnings.md under "What Works":
  `- [{date}] [/seo-content] Article "{title}" shipped as-is. Keyword: "{keyword}". Angle: {angle}. Word count: {N}. Content type: {type}.`

**If (b) "Good -- minor edits":**
- Ask: "What did you change? Even small details help me improve."
- Log the change to learnings.md. If it reveals a voice/tone issue, suggest
  updating voice-profile.md.
- Example entry: `- [{date}] [/seo-content] User softened tone in intro. Note: default opening may be too aggressive for this audience.`

**If (c) "Rewrote significantly":**
- Ask: "Can you share what you changed or paste the final version? I will learn from the diff."
- If they share it, analyze the differences and log specific findings.
- If the rewrite reveals a pattern (e.g., voice is consistently wrong),
  suggest re-running /brand-voice.
- Example entry: `- [{date}] [/seo-content] User rewrote "{title}" -- shifted from data-driven to story-driven. Voice profile may need update.`

**If (d) "Have not published yet":**
- Note it. Do not log anything to learnings.md yet.
- Optionally remind them next time: "Last time I wrote an article on '{keyword}'. Did you ever publish it? I would love to know how it ranked."

---

## Implementation Notes for the LLM

When executing this skill, follow these rules precisely:

1. **Never skip SERP analysis when web search is available.** The v2
   differentiator is live SERP research. Phase 1 is not optional -- it is
   what makes this content better than what a content mill produces. Search
   the target keyword, capture PAA questions, analyze competitors.

2. **Always check for existing content first.** The iteration detection
   enables content refresh mode, which is one of the most valuable features.
   Never start from scratch when an article already exists.

3. **Always generate schema markup.** Article + FAQ JSON-LD is mandatory
   for every piece of content. HowTo schema is mandatory for how-to
   tutorials. Schema markup is included in the frontmatter of the saved file.

4. **Always save to disk.** Content is saved to
   `./campaigns/content/{keyword-slug}.md` with proper YAML frontmatter.
   Create the directory if it does not exist. The saved file IS the
   deliverable -- not the terminal output.

5. **Use brand memory visibly.** When voice-profile.md is loaded, mention
   how it shaped the writing style. When positioning.md is loaded, mention
   the angle used. When audience.md is loaded, mention how it influenced
   depth and examples. The user should see their brand context working.

6. **PAA questions are mandatory sections.** Every People Also Ask question
   captured in Phase 1 MUST appear in the content -- either as an H2 section
   (for questions deserving depth) or in the FAQ section (for brief answers).
   This is non-negotiable.

7. **Preserve the humanization process.** Phase 5 is the soul of this skill.
   Never skip it. Run every draft through the AI detection checklist, inject
   voice points, vary rhythm. The content should sound like a human expert,
   not a language model.

8. **Always offer the /content-atomizer chain.** After creating an article,
   the natural next step is social distribution. Always present the chain
   prompt. One article should become 10+ social assets.

9. **Write the content brief if one does not exist.** If the user provides
   a keyword but no content brief exists from /keyword-research, create one
   as part of Phase 2. It structures the work and ensures nothing is missed.

10. **Respect the file output format exactly.** The frontmatter schema is
    specific. The slug format is specific. The directory location is specific.
    Get these right so other skills (especially /content-atomizer) can find
    and parse the content files.

11. **When web search is unavailable, gracefully degrade.** Fall back to the
    brief-based approach without SERP analysis. Note the limitation. The
    skill should still produce valuable content -- it just will not have
    live competitive data or PAA integration.

12. **Content refresh is about specifics, not generalities.** When refreshing
    an article, do not say "update the content." Say "add a section on
    {specific topic} after the {specific section} because {specific SERP
    evidence}." The refresh recommendations must be actionable.

13. **Feedback closes the loop.** Always present the feedback prompt after
    saving. Always log feedback to learnings.md. The system improves with
    every piece of content created.

14. **Register every content piece.** After saving the article, append an
    entry to ./brand/assets.md with the file path, type, date, and status.
    This keeps the asset registry current for /start-here and other skills.
