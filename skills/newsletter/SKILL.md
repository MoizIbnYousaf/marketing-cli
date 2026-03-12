---
name: newsletter
version: 7.0
description: >
  Create best-in-class newsletters that people actually want to read. Use when
  someone needs to write a newsletter edition, develop a newsletter format, or
  improve their newsletter game. Covers multiple formats - roundup, deep-dive,
  personal essay, curated links, news briefing. References patterns from Lenny
  Rachitsky, Morning Brew, Greg Isenberg, Sahil Bloom, The Hustle, and top AI
  newsletters. Triggers on: write newsletter, newsletter format, help with my
  newsletter, newsletter edition about X, weekly roundup, news briefing about,
  curated newsletter, newsletter strategy, newsletter growth, newsletter
  monetization, newsletter platform. Outputs publication-ready newsletter
  content or format templates. Uses web search to pull current news and trends
  for news briefing and curated link formats. Writes newsletter edition to
  ./campaigns/newsletters/{date}-{topic}.md. Reads: voice-profile.md,
  audience.md, learnings.md. Writes:
  ./campaigns/newsletters/{date}-{topic}.md, assets.md, learnings.md.
  Chains to: /content-atomizer for social promotion of the newsletter edition.
category: email
tier: execution
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/creative-kit.md
writes:
  - campaigns/newsletters/{edition}.md
triggers:
  - write newsletter
  - newsletter format
  - newsletter edition
  - newsletter strategy
---


## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`, `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

# Newsletter Skill

Most newsletters are forgettable. Subscribers open them once, skim the first paragraph, delete.

The newsletters that build loyal audiences—and businesses—do something different. They have a format readers can rely on. A voice that's recognizable. Content worth opening.

This skill helps you create newsletters people actually look forward to.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

---

## Brand Memory Integration

This skill reads brand context to ensure every newsletter edition sounds like the user's brand, speaks to their actual audience, and builds on what has worked before. It also checks the learnings journal for send-time data, subject line performance, and format preferences.

**Reads:** `voice-profile.md`, `audience.md`, `learnings.md` (all optional)

On invocation, check for `./brand/` and load available context:

1. **Load `voice-profile.md`** (if exists):
   - Match the brand's tone, vocabulary, and sentence rhythm in every section
   - Apply voice DNA to subject lines, hooks, body copy, and sign-offs
   - A "direct, proof-heavy" voice writes different newsletters than a "warm, story-driven" voice
   - Use vocabulary lists to stay on-brand: preferred words, banned words, signature phrases
   - Show: "Your voice is [tone summary]. Newsletter will match that register."

2. **Load `audience.md`** (if exists):
   - Know who is reading: their awareness level, sophistication, pain points, interests
   - Match content depth to audience sophistication (technical vs general, insider vs newcomer)
   - Use audience language in hooks and subject lines -- mirror how they talk
   - Inform content selection: what topics, what level of detail, what format they prefer
   - Show: "Writing for [audience summary]. Awareness: [level]."

3. **Load `learnings.md`** (if exists):
   - Check for send-time data (e.g., "Tuesday 7am outperforms Thursday 10am by 23%")
   - Check for subject line patterns that have worked or failed
   - Check for format preferences (long vs short, curated vs original)
   - Check for content topic performance data
   - Show: "Found [N] newsletter learnings. Applying: [key insight]."

4. **Check for existing newsletters** (if `./campaigns/newsletters/` exists):
   - Scan previous editions for format consistency and topic coverage
   - Avoid repeating recent topics unless explicitly requested
   - Show: "Found [N] previous editions. Most recent: [title]. Avoiding topic overlap."

5. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Proceed without it -- this skill works standalone.
   - The newsletter will be well-structured either way; brand memory makes it consistent.
   - Note: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

### Context Loading Display

Show the user what was loaded using the standard tree format:

```
Brand context loaded:
├── Voice Profile     ✓ "{tone summary}"
├── Audience          ✓ "{audience summary}"
├── Learnings         ✓ {N} entries
└── Past Editions     ✓ {N} found
```

If items are missing:

```
Brand context loaded:
├── Voice Profile     ✗ not found (run /brand-voice)
├── Audience          ✗ not found (run /start-here)
├── Learnings         ✗ none yet
└── Past Editions     ✗ first edition
```

---

## The core job

Transform your content, curation, or ideas into **publication-ready newsletters** that:
- Get opened (subject line + sender reputation)
- Get read (hook + scannability)
- Get remembered (voice + value)
- Get shared (insight worth passing on)

---

## First: What type of newsletter?

Different formats serve different purposes. Pick your archetype:

### 1. Deep-Dive / Framework (Lenny Rachitsky style)
**Best for:** Expertise, thought leadership, premium positioning
**Frequency:** Weekly
**Length:** 1,500-3,000 words
**Revenue:** Premium subscriptions ($15-30/month)

One topic explored thoroughly. Original frameworks. Actionable templates.

### 2. News Briefing (Morning Brew / Finimize style)
**Best for:** Daily habit formation, broad audience, ad revenue
**Frequency:** Daily or 3x/week
**Length:** 500-1,000 words
**Revenue:** Sponsorships, ads

Quick hits on what happened. Scannable. Gets you up to speed in 5 minutes.

### 3. Curated Links + Commentary (Ben's Bites style)
**Best for:** Niche expertise, building in public, creator economy
**Frequency:** Daily or weekly
**Length:** 500-1,500 words
**Revenue:** Affiliate, sponsorships, community

Hand-picked links with your take on why each matters.

### 4. Personal Essay / Reflection (Sahil Bloom style)
**Best for:** Personal brand, philosophy, coaching/courses
**Frequency:** Weekly
**Length:** 1,000-2,000 words
**Revenue:** Courses, coaching, premium tier

Themed reflections with frameworks for life/work improvement.

### 5. Startup/Builder Updates (Greg Isenberg style)
**Best for:** Founder audience, community building, deal flow
**Frequency:** Weekly
**Length:** 800-1,500 words
**Revenue:** Community, advisory, investments

Ideas, observations, and frameworks from the building trenches.

### 6. Irreverent News + Stories (The Hustle style)
**Best for:** Broad business audience, entertainment + education
**Frequency:** Daily
**Length:** 800-1,200 words
**Revenue:** Sponsorships, subscriptions

News told through narrative with personality and humor.

---

## Format Templates

### Template 1: Deep-Dive Framework Newsletter

```
SUBJECT LINE: [Specific question or problem] — [Hint at framework]

---

[PERSONAL OPENER - 2-3 sentences]
Brief personal context or why this topic is on your mind.

[THE QUESTION - Bold]
**[State the exact question you're answering]**

[CONTEXT - 1-2 paragraphs]
Why this matters. What's at stake. Who this is for.

---

## [FRAMEWORK NAME]

[Framework intro - 2-3 sentences explaining what it is]

### [Component 1]
[Explanation + example]

### [Component 2]
[Explanation + example]

### [Component 3]
[Explanation + example]

---

## How to Apply This

[Specific steps or implementation guidance]

1. [Step 1 with detail]
2. [Step 2 with detail]
3. [Step 3 with detail]

---

## Template / Checklist

[Downloadable or copy-paste resource]

---

## The Bottom Line

[2-3 sentence summary of key insight]

[SIGN-OFF]
[Your name]

P.S. [Personal note, question for readers, or CTA]
```

**Example from Lenny Rachitsky:**
> "How do you make good decisions in situations where you lack perfect information? This question came from three different readers this month, so let me share the frameworks I actually use..."

---

### Template 2: News Briefing Newsletter

```
SUBJECT LINE: [Day/Date]: [Hook about biggest story]

---

[LOGO/HEADER]

[ONE-LINE HOOK]
Today: [Teaser of what's inside]

---

## MARKETS
[Brief market data if relevant to your niche]
↑ [Metric 1] | ↓ [Metric 2] | → [Metric 3]

---

## TODAY'S TOP STORIES

### [STORY 1 HEADLINE - Intriguing, not straight news]

[2-3 sentence explanation of what happened]

**Why it matters:** [1-2 sentences on implications]

---

### [STORY 2 HEADLINE]

[2-3 sentence explanation]

**The bottom line:** [1 sentence takeaway]

---

### [STORY 3 HEADLINE]

[2-3 sentence explanation]

---

## QUICK HITS
• [One-liner news item 1]
• [One-liner news item 2]
• [One-liner news item 3]

---

## [SIGNATURE SECTION - Quiz, poll, or engagement hook]

[Question or interactive element]

---

[FOOTER with social links, referral program]
```

**Morning Brew voice markers:**
- Humor in unexpected places
- Pop culture references
- Relatable analogies ("It's like if Netflix and your credit card had a baby...")
- Bold the surprising part of each story

---

### Template 3: Curated Links + Commentary

```
SUBJECT LINE: [Number] things worth your time: [Hook topic]

---

Hey [First Name] 👋

[1-2 sentence personal opener - what you've been thinking about]

Here's what caught my attention this week:

---

## 🔥 The Big One

**[Link Title](URL)**

[2-3 sentences on why this matters and your take]

---

## 📚 Worth Reading

**[Link 1 Title](URL)**
[1-2 sentence commentary]

**[Link 2 Title](URL)**
[1-2 sentence commentary]

**[Link 3 Title](URL)**
[1-2 sentence commentary]

---

## 🛠️ Tools & Resources

**[Tool Name](URL)** — [What it does + your opinion]

**[Tool Name](URL)** — [What it does + your opinion]

---

## 💭 One Thing I'm Thinking About

[Personal reflection or question - 2-3 sentences]

---

That's it for this week. Hit reply if anything resonated.

[Your name]
```

**Ben's Bites voice markers:**
- Genuine enthusiasm (not performative)
- "I found this and thought you'd like it" energy
- Commentary adds value beyond the link
- Organized by type (reading, tools, news)

---

### Template 4: Personal Essay / Reflection

```
SUBJECT LINE: [Philosophical hook or contrarian take]

---

[OPENING HOOK - Story, observation, or provocative statement]
[2-4 sentences that create intrigue]

---

## [THE CORE IDEA]

[State your thesis clearly - 1-2 sentences]

[Expand on why you believe this - personal experience or observation]

---

## The Framework

[Present your mental model or framework]

**[Element 1]:** [Explanation]

**[Element 2]:** [Explanation]

**[Element 3]:** [Explanation]

---

## Questions to Ask Yourself

1. [Reflection question]
2. [Reflection question]
3. [Reflection question]

---

## The Takeaway

[1-2 sentence distillation of core insight]

[PERSONAL SIGN-OFF]
[Your name]

P.S. [Often includes a template download or resource]
```

**Sahil Bloom voice markers:**
- Opens with philosophical hook or life observation
- Frameworks have memorable names
- Includes reflection questions for reader
- Warm but substantive tone

---

### Template 5: Builder/Startup Update

```
SUBJECT LINE: [Contrarian observation or "here's what I'm seeing"]

---

Look...

[Personal observation or realization that hooks - 2-3 sentences]

---

## The Idea

[Present a concept, framework, or trend you're seeing]

Here's what's working:

**[Pattern 1]** — [Real example with company name]

**[Pattern 2]** — [Real example with company name]

**[Pattern 3]** — [Real example with company name]

---

## Why This Matters Now

[Context on why timing matters - market shifts, technology changes, etc.]

---

## How to Think About This

[Your framework or mental model for the opportunity]

---

## What I'm Doing About It

[Personal application - your projects, investments, experiments]

---

If you're building in this space, I want to hear about it. Reply to this email.

[Your name]

---

📍 [Event or community plug]
🎙️ [Podcast or content plug]
```

**Greg Isenberg voice markers:**
- "Look..." opener
- Peer-to-peer energy, not guru
- Real company examples, named
- Building in public transparency
- Community-focused CTAs

---

### Template 6: Irreverent News + Story

```
SUBJECT LINE: [Unexpected angle on news + emoji]

---

[HOOK HEADLINE - Surprising juxtaposition or question]

[Opening anecdote that humanizes the story - 3-4 sentences]

---

**What happened:** [Factual summary in 2-3 sentences]

**Why it's weird:** [The angle that makes this interesting]

**The bigger picture:** [Business implication]

---

## Also Worth Knowing

**[Story 2 Headline]**
[Brief summary with personality]

**[Story 3 Headline]**
[Brief summary with personality]

---

## The Number of the Day

**[Surprising statistic]**

[1-2 sentence context on why it matters]

---

## One More Thing

[Lighter item, meme-worthy moment, or unexpected angle]

---

See you tomorrow,
[Editor nickname] 🦊
```

**The Hustle voice markers:**
- Irreverent but not trying too hard
- Headlines that create curiosity
- "Why it's weird" — finds the surprising angle
- Editor nicknames/personalities
- Pop culture and meme fluency

---

## Voice & Tone Guide

### The Newsletter Voice Spectrum

```
FORMAL ←————————|————————→ CASUAL
             Newsletter sweet spot
                    ↓
         Professional but personable
         Smart friend, not professor
         Opinions with reasoning
         Direct, not corporate
```

### Voice Principles

**1. Write like you talk (but tighter)**
Read it out loud. If you wouldn't say it, don't write it.

**2. Have opinions**
"I think X because Y" beats "Some experts say X while others say Y."

**3. Be specific**
Not "recently" → "Last Tuesday"
Not "a lot" → "47%"
Not "a company" → "Notion"

**4. Show your work**
Not "this is important" → "I spent 3 hours on this because..."

**5. Admit uncertainty**
"I'm not sure but..." builds more trust than fake confidence.

### Words That Kill Newsletters

**Avoid:**
- "In today's edition..."
- "This week we'll explore..."
- "Without further ado..."
- "It goes without saying..."
- Corporate jargon (leverage, synergy, ecosystem)
- Excessive exclamation marks!!!

**Use instead:**
- Jump straight into content
- "Here's what I found..."
- "The short version:"
- Conversational transitions

---

## Subject Line Formulas

### What Works

**1. Specific + Curiosity**
> "The $47K email mistake (and how to avoid it)"

**2. Question they're asking themselves**
> "Should you raise prices in a recession?"

**3. Contrarian take**
> "Why I stopped using [popular tool]"

**4. Number + Specificity**
> "7 newsletter formats that actually work"

**5. Direct value proposition**
> "The framework I use for every product decision"

### What Doesn't Work

- Clickbait that doesn't deliver
- ALL CAPS
- [NEWSLETTER NAME] in subject
- Vague ("This week's update")
- Too clever (sacrifices clarity)

---

## Scannability Checklist

Before sending, verify:

```
[ ] Headers break content every 200-300 words
[ ] Bold text marks key insights (not everything)
[ ] Short paragraphs (1-3 sentences max)
[ ] Bullet points for lists of 3+
[ ] White space between sections
[ ] Mobile-friendly (preview on phone)
[ ] One clear CTA (not five)
[ ] Above-fold content hooks reader
```

### The 30% Rule

Highlighted/bold text should be <30% of total text. More than that, nothing stands out.

---

## Hook Patterns

### Pattern 1: The Direct Question
> "How do you make decisions when you don't have enough data?"

### Pattern 2: The Contrarian Statement
> "Most SEO advice is wrong. Here's what actually works."

### Pattern 3: The Personal Story
> "Last week I made a $40K mistake. Let me tell you about it."

### Pattern 4: The Surprising Stat
> "73% of newsletters get deleted unread. Here's why yours won't."

### Pattern 5: The Observation
> "I noticed something weird in my analytics..."

### Pattern 6: The Promise
> "By the end of this email, you'll know exactly how to..."

---

## Curation vs. Original Content

### When to Curate
- You're covering a fast-moving space (AI, news)
- Your value is taste/filtering (too much content exists)
- You're building daily habit (can't write 2000 words/day)

### When to Create Original
- You have unique expertise or access
- You're building premium/paid tier
- You want stronger differentiation

### The Hybrid (Best for Most)

```
70% Original insight/commentary
30% Curated links with your take

OR

1 Deep original piece
+ 3-5 curated links with commentary
```

**Never:** Link dump without commentary. That's RSS, not a newsletter.

---

## Content Sourcing with Web Search

For news briefing and curated link formats, this skill uses web search to pull current, relevant content. This ensures every edition references real, timely information -- not stale placeholders.

**This is a research-dependent skill.** When sourcing external content, show the RESEARCH MODE signal per `_system/brand-memory.md`:
- **If web search tools are available:** Show `RESEARCH MODE → Data quality: LIVE` and proceed with real sources.
- **If web search tools are NOT available:** Show `RESEARCH MODE → Data quality: ESTIMATED`. Use conceptual/example content and flag clearly that sources are illustrative, not live. Ask the user whether to proceed or connect web search first.

### When Web Search Activates

Web search is used when the newsletter format requires external content:

1. **News Briefing format (Template 2):** Search for the latest news in the user's niche. Pull 5-10 stories from the past 24-72 hours. Prioritize stories with business implications.

2. **Curated Links format (Template 3):** Search for high-quality articles, tools, and resources relevant to the user's topic. Prioritize original research, actionable guides, and new tools.

3. **Irreverent News format (Template 6):** Search for news stories with surprising angles. Look for the weird, unexpected, or counterintuitive in the user's space.

4. **Any format when the user specifies a topic:** Search for current data, statistics, examples, and trends related to the specified topic to ground the newsletter in reality.

### Search Strategy

```
Step 1: Identify search terms
├── User's niche or topic from the request
├── Audience keywords from audience.md (if loaded)
└── Competitor/industry terms from positioning.md (if loaded)

Step 2: Execute searches
├── "[niche] news this week" (for news formats)
├── "[topic] trends 2026" (for trend pieces)
├── "[topic] tools" (for curated links)
├── "[topic] data statistics" (for deep dives)
└── "[topic] surprising" (for irreverent formats)

Step 3: Filter and rank results
├── Relevance to user's audience
├── Recency (prefer last 7 days for news)
├── Source authority (prefer original reporting)
├── Uniqueness (skip stories everyone has covered)
└── "Would I forward this?" test

Step 4: Integrate into newsletter
├── Summarize each source in your own words
├── Add commentary and analysis (your take)
├── Include source links for attribution
└── Frame each item for the user's audience
```

### Attribution Rules

- Always link to original sources
- Summarize in your own words -- never copy verbatim
- Add the "why it matters" that the source doesn't provide
- Credit the original reporter/author by name when possible
- If a story is from a paywalled source, note it: "(paywalled but worth it)"

### When NOT to Use Web Search

- **Deep-Dive Framework format:** The content is original thought leadership. Web search can inform with data points but should not drive the content.
- **Personal Essay format:** The content is personal reflection. No external sourcing needed.
- **Builder Update format:** The content comes from personal experience. Web search only for specific company examples or data to support claims.

---

## Platform Guidance

Choosing the right newsletter platform matters. Each has strengths, limitations, and sweet spots. Here is an honest assessment to help users pick -- or optimize -- their platform.

### Beehiiv

```
Best for:    Growth-focused creators and media companies
Pricing:     Free (up to 2,500 subs), Scale $39/mo, Max $99/mo
Strengths:
├── Built-in referral program (no third-party needed)
├── Ad network marketplace (monetize from day 1)
├── Website builder with SEO-friendly pages
├── Advanced segmentation and automations
├── Custom domains included on paid plans
├── Recommendation network for cross-growth
└── Analytics dashboard with revenue tracking

Limitations:
├── Newer platform (less third-party integration depth)
├── Templates less polished than Substack's defaults
├── Free plan has Beehiiv branding
└── Less community/social features than Substack

Best for:    Newsletters that want to become media businesses.
             If you care about growth tools, monetization
             options, and running a newsletter like a company,
             Beehiiv is the strongest choice.
```

### Substack

```
Best for:    Writers and individual creators
Pricing:     Free (Substack takes 10% of paid sub revenue)
Strengths:
├── Zero upfront cost (pay only when you earn)
├── Built-in social network (Notes, recommendations)
├── Beautiful default design (no config needed)
├── Podcast and video hosting included
├── Discovery network drives organic subscribers
├── Paid subscriptions built in from day 1
└── Strong brand recognition ("I write on Substack")

Limitations:
├── 10% revenue cut on paid subscriptions
├── Limited design customization
├── No advanced automation or segmentation
├── You are building on their platform, not yours
├── No referral program built in
├── Limited A/B testing capabilities
└── Export is possible but migration is painful

Best for:    Solo writers who want simplicity. If you are
             building a personal essay, deep-dive, or opinion
             newsletter and value the built-in audience
             discovery, Substack is hard to beat. Not ideal
             if you want full control or advanced growth tools.
```

### ConvertKit (now Kit)

```
Best for:    Creators selling digital products
Pricing:     Free (up to 10,000 subs), Creator $25/mo, Pro $50/mo
Strengths:
├── Best-in-class automation and tagging
├── Visual automation builder
├── Commerce features (sell digital products directly)
├── Landing page and form builder
├── Creator network for recommendations
├── Excellent deliverability reputation
└── Integrates with everything (Zapier, Stripe, etc.)

Limitations:
├── Newsletter design is basic/plain
├── No built-in ad marketplace
├── Analytics less detailed than Beehiiv
├── No referral program built in (need third-party)
├── Higher price per subscriber than competitors
└── Not optimized for media-style newsletters

Best for:    Creators who sell courses, ebooks, templates,
             or coaching. If your newsletter is the top
             of a funnel that leads to digital products,
             ConvertKit's commerce and automation features
             are unmatched. Less ideal for pure media plays.
```

### Ghost

```
Best for:    Independent publishers who want full ownership
Pricing:     $9/mo (Starter), $25/mo (Creator), $50/mo (Team), or self-host free
Strengths:
├── Full ownership of your content and data
├── Beautiful, customizable themes
├── Built-in membership and paywall system
├── SEO-optimized website included
├── No platform revenue cut
├── Open source (self-host for free)
├── Native integrations with Stripe for payments
└── Publication-grade design out of the box

Limitations:
├── No built-in discovery or recommendation network
├── No referral program (need third-party)
├── Steeper learning curve than Substack
├── Self-hosting requires technical knowledge
├── Smaller ecosystem of integrations
├── No ad marketplace
└── Less growth-focused tooling

Best for:    Publishers who think long-term. If you want to
             own your platform, have publication-quality
             design, and are willing to drive your own growth
             rather than relying on platform discovery, Ghost
             is the most professional option. Ideal for
             established creators migrating off platforms.
```

### Platform Selection Guide

```
Question                              Recommendation
─────────────────────────────────────────────────────
"I just want to write"               → Substack
"I want to grow fast"                → Beehiiv
"I sell digital products"            → ConvertKit
"I want full ownership"              → Ghost
"I need advanced automations"        → ConvertKit
"I want built-in monetization"       → Beehiiv or Substack
"I'm a solo writer, no tech skills"  → Substack
"I'm building a media company"       → Beehiiv
"I have an existing audience"        → Ghost or Beehiiv
"I want a recommendation network"    → Substack or Beehiiv
```

### Platform-Specific Formatting Notes

When generating newsletter content, adjust formatting based on the user's platform:

- **Beehiiv:** Full HTML support. Use custom headers, buttons, branded sections. Leverage their poll widget for engagement sections.
- **Substack:** Keep it simple. Substack's renderer handles basic markdown well but complex HTML breaks. Use their built-in buttons for CTAs. Podcast embeds work natively.
- **ConvertKit:** Plain text performs best on ConvertKit. Minimal HTML. Focus on the writing, not the design. Use their tag-based personalization for dynamic content.
- **Ghost:** Full editorial design. Use their card system for images, callouts, bookmarks. Leverage members-only sections for paid content gating.

---

## Growth Strategy

Getting subscribers is not about going viral. It is about building consistent, compounding growth through multiple channels that reinforce each other.

### Referral Programs

The single highest-leverage growth tactic for newsletters. Turns every reader into a distribution channel.

**How to structure referral rewards:**

```
Tier 1 (1 referral):     Digital reward
├── Exclusive article or template
├── Access to a resource library
└── "Founding reader" badge

Tier 2 (3-5 referrals):  Community access
├── Private Slack/Discord channel
├── Monthly AMA or Q&A session
└── Early access to new content

Tier 3 (10+ referrals):  Tangible reward
├── Physical merchandise (stickers, shirt)
├── Free month of paid subscription
├── 1:1 consultation or feedback session
└── Featured mention in the newsletter

Tier 4 (25+ referrals):  Premium reward
├── Free annual subscription
├── Co-creation opportunity (guest write)
├── Access to private mastermind
└── Physical gift (book, branded item)
```

**Referral program best practices:**
- Make sharing frictionless (one-click share link)
- Show progress toward next reward tier
- Reward the referrer, not just the referee
- Use rewards that match your audience's identity (Morning Brew's joggers worked because their audience is young professionals)
- Avoid generic rewards (Amazon gift cards feel transactional)
- Place the referral CTA at the end of your best content (when satisfaction is highest)

### Cross-Promotions

Partner with newsletters of similar size and complementary (not competing) audiences.

**Finding cross-promotion partners:**
1. Search for newsletters in adjacent niches (you cover marketing, they cover sales)
2. Look for newsletters with similar subscriber counts (within 2x of your size)
3. Check newsletter directories: Beehiiv's recommendation network, Substack's recommendations, Letterlist, Newsletter Stack
4. Reach out to writers you already read and cite

**Cross-promotion formats:**
- **Swap mentions:** You mention their newsletter, they mention yours. Lowest friction.
- **Co-authored edition:** Write a joint edition together. Highest impact.
- **Guest spotlight:** Feature each other as guest contributors for one edition.
- **Shared resource:** Create a co-branded lead magnet and share the email list.
- **Recommendation page:** Add each other to your "newsletters I recommend" page.

**Template for outreach:**

```
Subject: Cross-promo idea — [Your Newsletter] x [Their Newsletter]

Hey [Name],

I run [Your Newsletter] ([subscriber count] subscribers,
[niche]). I've been reading your work on [specific topic]
and think our audiences would genuinely benefit from
knowing about each other.

Quick idea: mutual recommendation in our next editions.
I'd write a genuine 2-3 sentence recommendation of your
newsletter, and you'd do the same for mine.

No strings. If it doesn't feel right, no worries at all.

[Your name]
[Link to your newsletter]
```

### Lead Magnet Integration

Use your newsletter as the distribution vehicle for lead magnets -- and use lead magnets as the signup incentive for the newsletter.

**Newsletter-to-lead-magnet flow:**
1. Write a newsletter edition about a topic
2. Create a deeper resource on that topic (checklist, template, guide)
3. Offer the resource in the newsletter as a bonus: "Want the full checklist? Grab it here."
4. The resource signup page also subscribes them to the newsletter (if they are not already)

**Lead-magnet-to-newsletter flow:**
1. Create a lead magnet that solves a specific problem
2. Deliver the lead magnet via email
3. The delivery email welcomes them to the newsletter
4. The first 3 newsletter editions reinforce the lead magnet's topic
5. Subscribers stay because the newsletter delivers ongoing value, not just the one-time freebie

**Connection to /lead-magnet skill:** If the user has already run /lead-magnet, reference the existing asset. If not, suggest running it: "A lead magnet would give you a subscriber acquisition engine. Run /lead-magnet to create one."

### Social Proof Tactics

Build credibility signals that make subscribing feel like the obvious choice.

**Subscriber milestones:**
- Celebrate round numbers publicly (1,000 / 5,000 / 10,000)
- Frame growth in terms of community, not vanity metrics: "10,000 marketers now read this every Tuesday"
- Use milestones as content hooks: "What I learned growing to 5K subscribers"

**Testimonial collection:**
- After every edition that gets positive replies, ask: "Mind if I quote that on my signup page?"
- Screenshot and archive positive replies for social proof
- Curate "what readers are saying" for your landing page and social bios

**Authority signals:**
- Open rate statistics (if above average): "45% average open rate" signals quality
- Notable subscribers or companies (with permission): "Read by teams at [Company]"
- Media mentions or citations: "Featured in [Publication]"
- Subscriber growth rate: "Growing 15% month-over-month"

### Growth Channel Matrix

```
Channel               Effort   Timeline    Impact
──────────────────────────────────────────────────
Referral program      Medium   Ongoing     High
Cross-promotions      Low      1-2 weeks   Medium
Social media clips    Medium   Ongoing     Medium
SEO (blog repurpose)  High     3-6 months  High
Podcast appearances   Medium   2-4 weeks   Medium
Lead magnets          Medium   1-2 weeks   High
Paid ads              High     Immediate   Variable
Community presence    Low      Ongoing     Low-Med
Guest writing         High     2-4 weeks   Medium
Product Hunt launch   Low      One-time    Variable
```

---

## Monetization Framework

Newsletters can generate revenue through four primary models. Most successful newsletters combine two or more.

### Model 1: Sponsorships

The most common monetization path. Sell placements within your newsletter.

**Sponsorship placement types:**

```
Placement          Description                CPM Range
──────────────────────────────────────────────────────────
Primary sponsor    Top of newsletter, logo,   $25-75
                   2-3 sentences
Mid-roll           Between sections,          $15-40
                   1-2 sentences
Classified         Bottom section, one-       $5-15
                   liner with link
Dedicated email    Entire edition about       $50-150+
                   the sponsor's topic
```

**Pricing your sponsorship:**

```
Formula: Subscriber count x CPM / 1,000

Example:
├── 10,000 subscribers
├── $40 CPM (mid-range for engaged niche)
├── Primary sponsor: $400 per edition
├── 4 editions/month = $1,600/month potential
└── Annual: ~$19,200

CPM benchmarks by niche:
├── General business:    $15-30
├── Tech/SaaS:           $30-60
├── Finance/investing:   $40-80
├── Marketing:           $25-50
├── AI/emerging tech:    $35-70
├── Developer tools:     $30-65
└── Creator economy:     $20-45
```

**Sponsorship best practices:**
- Only accept sponsors your audience would actually use
- Write the ad copy yourself to match your voice (native integration)
- Label sponsorships clearly ("Today's edition is brought to you by...")
- Limit to 1-2 sponsors per edition (more dilutes trust)
- Negotiate quarterly or annual deals for rate stability
- Track click-through rates and share them with sponsors
- Build a sponsorship page with audience demographics, open rates, and testimonials

### Model 2: Paid Subscriptions

Offer a premium tier with additional content, access, or community.

**Free vs paid content architecture:**

```
Free tier (acquire + retain):
├── Core newsletter edition
├── Frameworks and key insights
├── News coverage and curation
└── Enough value to share and grow

Paid tier ($5-30/month):
├── Deep-dive extras (extended analysis)
├── Templates, checklists, resources
├── Archive access (all past editions)
├── Community access (Slack/Discord)
├── Monthly AMA or office hours
├── Early access to new content
└── Ad-free reading experience
```

**Paid tier pricing strategy:**
- $5-10/month: Low barrier, volume play. Best for broad audiences.
- $10-20/month: Mid-range. Best for professional/business audiences.
- $20-30/month: Premium. Needs high-value content (data, research, tools).
- Annual discount: Offer 20-30% off annual to reduce churn.

**Conversion benchmarks:**
- Free-to-paid conversion: 2-5% is good, 5-10% is excellent
- Monthly churn target: under 5%
- Annual subscriber retention: 70%+ is strong

### Model 3: Native Ad Integration

Write about sponsors' products in your own voice, as part of the editorial content.

**Native ad principles:**
- Must be genuinely useful to your audience (not just highest bidder)
- Clearly labeled but not jarring (subtle disclosure)
- Written in your voice, not the sponsor's marketing copy
- Include your honest take, not just talking points
- Test the product yourself before writing about it

**Native ad format example:**

```
## Tool I've Been Using

[Sponsor Name] — [One-line description]

I've been testing [product] for [timeframe] and
here's what I found: [honest assessment].

The feature that surprised me: [specific feature].

If you're dealing with [problem it solves], it's
worth a look. [Affiliate or tracked link]

[Disclosure: This section is sponsored by
[Sponsor]. All opinions are mine.]
```

### Model 4: Product/Course Funnel

Use the newsletter as the top-of-funnel for your own products.

**Newsletter-to-product funnel:**

```
Stage 1: Free newsletter (build trust)
    ↓
Stage 2: Lead magnet (demonstrate expertise)
    ↓
Stage 3: Low-ticket product ($27-97)
    ↓
Stage 4: Core product/course ($197-997)
    ↓
Stage 5: Premium offer ($1,000+)
```

**Integration rules:**
- Never make the newsletter feel like a sales funnel
- Ratio: 80% value / 20% promotion maximum
- Promote products through case studies and results, not pitches
- Use the P.S. section for soft product mentions
- Hard sell only in dedicated launch sequences (separate from regular editions)

### Revenue Milestone Framework

```
Subscribers   Primary Revenue        Monthly Target
──────────────────────────────────────────────────────
0-1,000       Product funnel         $0-500
1,000-5,000   Sponsorships + product $500-2,500
5,000-10,000  Sponsorships + paid    $2,500-7,500
10,000-25,000 Multi-model            $7,500-25,000
25,000-50,000 Media business         $25,000-75,000
50,000+       Full media company     $75,000+
```

---

## The Newsletter Creation Workflow

### Step 1: Gather
- What happened this week in your space?
- What did you learn/create/notice?
- What questions are readers asking?
- What links are worth sharing?
- **v2: Run web search for current news/trends in niche** (for news briefing and curated formats)

### Step 2: Select
- Pick 1 main topic (deep dive) OR 3-5 items (roundup)
- Ask: "Would I forward this to a friend?"
- Cut anything that's "fine but not great"

### Step 3: Structure
- Choose your template
- Outline before writing
- Front-load the best stuff

### Step 4: Write
- Hook first (spend 25% of time here)
- Get the draft down fast
- Add personality in editing

### Step 5: Polish
- Read out loud
- Cut 20% (newsletters are always too long)
- Check scannability
- Mobile preview

### Step 6: Send
- Best times: Tuesday-Thursday, 6-10am local
- Subject line A/B test if possible
- Personal preview to yourself first

---

## Best-in-Class Examples to Study

| Newsletter | Type | What to Learn |
|------------|------|---------------|
| **Lenny Rachitsky** | Deep-Dive | Framework presentation, credibility anchoring |
| **Morning Brew** | News Briefing | Voice, scannability, referral program |
| **Ben's Bites** | Curated + Commentary | Curation that adds value |
| **Sahil Bloom** | Personal Essay | Reflection frameworks, templates |
| **Greg Isenberg** | Builder Updates | Peer energy, real examples |
| **The Hustle** | Irreverent News | Personality, unexpected angles |
| **Finimize** | Financial Briefing | "Key takeaways" format |
| **The Rundown AI** | AI News | Business implications framing |
| **boringmarketer** | Marketing | Contrarian takes, systems thinking |

See `references/newsletter-examples.md` for detailed breakdowns of each newsletter's structure, voice markers, and sample formats.

---

## File Output

Every newsletter edition is saved to disk for version control, repurposing, and campaign tracking.

### Output Path

```
./campaigns/newsletters/{date}-{topic}.md
```

**Naming convention:**
- Date format: `YYYY-MM-DD`
- Topic: lowercase-kebab-case, 2-4 words
- Examples: `2026-02-16-ai-tools-roundup.md`, `2026-02-16-pricing-framework.md`

### Output File Format

Each saved newsletter file follows this structure:

```markdown
# Newsletter: {Title}

## Metadata
- **Type:** {archetype name}
- **Date:** {YYYY-MM-DD}
- **Subject Line:** {chosen subject line}
- **Subject Line Variants:**
  1. {variant 1}
  2. {variant 2}
  3. {variant 3}
- **Estimated Read Time:** {X} min
- **Platform:** {Beehiiv/Substack/ConvertKit/Ghost/Other}

---

## Subject Line

{Chosen subject line}

---

## Newsletter Content

{Full newsletter body, formatted per the chosen template}

---

## Send Notes

- **Recommended send time:** {day + time}
- **A/B test recommendation:** {which subject lines to test}
- **Segmentation notes:** {if applicable}

---

## Sources

{List of all sources referenced, with links}
```

### Asset Registry Update

After saving the newsletter file, append an entry to `./brand/assets.md`:

```
| {date}-{topic} | Newsletter ({type}) | {date} | newsletters | draft | {subject line} |
```

### Learnings Journal Update

After the user provides feedback (via the standard feedback prompt), append findings to `./brand/learnings.md` under the appropriate section.

---

## How This Connects to Other Skills

**Input from:**
- **brand-voice** → Ensures newsletter voice matches overall brand
- **keyword-research** → Identifies topics your audience searches for
- **positioning-angles** → Provides contrarian angles for content
- **audience-research** → Informs content depth, topic selection, and language

**Uses:**
- **direct-response-copy** → For CTAs and conversion elements
- **seo-content** → When repurposing newsletter into blog posts
- **lead-magnet** → Integrate existing lead magnets into newsletter CTAs

**Chains to:**
- **content-atomizer** → After writing newsletter, atomize for social promotion

**The flow:**
1. brand-voice defines how newsletter should sound
2. keyword-research or audience questions suggest topics
3. **newsletter creates the edition**
4. Content atomized for social distribution via /content-atomizer
5. Performance data fed back to learnings.md

---

## Chain to /content-atomizer

After generating a newsletter edition, offer to atomize it for social promotion. This turns one newsletter into multiple social posts, increasing the reach and driving new subscribers.

### When to Offer Atomization

Always. After every newsletter edition is saved, present this:

```
Newsletter saved. Ready to promote it?

→ /content-atomizer    Atomize this edition for social
                       distribution (~5 min)

This will generate:
├── Twitter/X thread (key insights)
├── LinkedIn post (deep-dive summary)
├── Short-form hooks (for Instagram/TikTok)
└── Pull quotes for social cards
```

### What Gets Passed to /content-atomizer

When the user accepts, pass the following context:

1. **The newsletter file path:** `./campaigns/newsletters/{date}-{topic}.md`
2. **The newsletter type:** (archetype name -- affects atomization strategy)
3. **Key insights:** The 3-5 most shareable points from the edition
4. **Subject line:** Often makes a good social hook
5. **Brand voice:** Already loaded; passed through for consistency

### Atomization Strategy by Newsletter Type

```
Type                  Best Social Formats
──────────────────────────────────────────────────
Deep-Dive Framework   Twitter thread (framework steps),
                      LinkedIn long post (full summary)

News Briefing         Twitter quick hits (one per story),
                      LinkedIn carousel (top 3 stories)

Curated Links         Twitter thread (link + hot take),
                      LinkedIn "5 things" post

Personal Essay        Twitter thread (story arc),
                      Instagram quote cards

Builder Update        Twitter thread (trend + examples),
                      LinkedIn post (contrarian take)

Irreverent News       Twitter individual posts (each
                      with personality), TikTok script
```

---

## The Test

Before hitting send, ask:

1. **Would I open this?** (Subject line test)
2. **Would I read past the first paragraph?** (Hook test)
3. **Would I remember this tomorrow?** (Value test)
4. **Would I forward this to a colleague?** (Share test)
5. **Does this sound like me, not a committee?** (Voice test)

If any answer is no, revise before sending.

---

## Feedback Collection

After delivering the newsletter edition, collect feedback using the standard prompt:

```
How did this perform?

a) Great -- shipped as-is
b) Good -- made minor edits
c) Rewrote significantly
d) Haven't used yet

(You can answer later -- just run this skill again
and tell me.)
```

Process feedback per `_system/brand-memory.md` feedback protocol:
- Log to `./brand/learnings.md` with date, skill tag `[/newsletter]`, and specific findings
- If subject line data is shared, log it: "Subject line '[line]' achieved [X]% open rate"
- If send-time data is shared, log it: "[Day] [time] outperformed [Day] [time] by [X]%"
- If format preference emerges, log it: "Audience prefers [format] over [format]"

---

## Complete Execution Flow

When a user invokes this skill, follow this sequence:

```
1. Load brand context
   ├── Read voice-profile.md, audience.md, learnings.md
   ├── Check ./campaigns/newsletters/ for past editions
   └── Display context loading tree

2. Determine newsletter type
   ├── If user specifies format → use that
   ├── If user describes topic only → recommend format
   └── If unclear → show archetype menu and ask

3. Gather content
   ├── If news/curated format → run web search
   ├── If deep-dive/essay → work from user input
   └── If topic specified → search for supporting data

4. Generate newsletter
   ├── Apply chosen template
   ├── Write in brand voice (or default voice)
   ├── Generate 3 subject line variants
   ├── Include all template sections
   └── Apply scannability checklist

5. Present output
   ├── Show header (NEWSLETTER EDITION)
   ├── Display subject line variants with recommendation
   ├── Show full newsletter content
   ├── Show send-time recommendation
   └── Note any sources used

6. Save to file
   ├── Write to ./campaigns/newsletters/{date}-{topic}.md
   ├── Append to ./brand/assets.md
   └── Confirm files saved

7. Offer next steps
   ├── → /content-atomizer (atomize for social)
   ├── → "Iterate" (revise subject line or sections)
   ├── → "Different format" (try another archetype)
   └── → Feedback prompt
```

### Output Format

Follow `_system/output-format.md` exactly. The newsletter output should use this structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  NEWSLETTER EDITION
  Generated {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  TYPE: {archetype name}
  TOPIC: {topic}

  ──────────────────────────────────────────────

  SUBJECT LINE VARIANTS

  ① "{variant 1}"                    ★ recommended
     → Strength: {why this works}

  ② "{variant 2}"
     → Strength: {why this works}

  ③ "{variant 3}"
     → Strength: {why this works}

  Recommended A/B test: ① vs ②

  ──────────────────────────────────────────────

  NEWSLETTER CONTENT

  {Full newsletter body here, formatted per
  the chosen archetype template}

  ──────────────────────────────────────────────

  SEND RECOMMENDATIONS

  Best time:  {day}, {time} {timezone}
  A/B test:   Subject lines ① vs ②
  Segment:    {if applicable}

  ──────────────────────────────────────────────

  SOURCES

  {List of sources with links, if web search
  was used}

  ──────────────────────────────────────────────

  FILES SAVED

  ./campaigns/newsletters/{file}.md    ✓ (new)
  ./brand/assets.md                    ✓ (1 entry added)

  WHAT'S NEXT

  Your newsletter edition is ready. Before sending:

  → /creative           Build it — HTML template,
                        header design, or visual
                        assets (~15 min)
  → "Skip visuals"      Continue to distribution ↓

  ──────────────────────────────────────────────

  → /content-atomizer   Atomize for social (~10 min)
  → /email-sequences    Build subscriber welcome
                        sequence (~15 min)
  → "Iterate"           Revise sections or subject
  → "Different format"  Try another archetype
  → "Send tips"         Platform-specific send advice

  Or tell me what you're working on and I'll
  route you.
```
