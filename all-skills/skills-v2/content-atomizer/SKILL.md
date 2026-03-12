---
name: content-atomizer
version: 7.0
description: >
  Transform one piece of content into platform-optimized assets across LinkedIn,
  Twitter/X, Instagram, TikTok, YouTube, Threads, Bluesky, and Reddit. Use when
  someone has existing content (blog post, newsletter, podcast, video) and wants
  to maximize distribution. Covers format specs, hook formulas, algorithm signals,
  and creator-tested patterns for each platform. Performs live web search for
  recent algorithm changes before generating. Reads brand voice profile and
  platform adaptation table for tone adjustments. Writes per-platform files to
  organized campaign directories. Detects Buffer/Hootsuite API keys for optional
  scheduling. Supports content calendar mode for full-week scheduling across all
  platforms. Triggers on: repurpose this, turn this into social posts, atomize
  this content, create social content from, LinkedIn post from this, thread from
  this, schedule this across platforms, create content calendar from this,
  repurpose for Threads, Bluesky post from this, Reddit strategy for this.
  Outputs platform-specific content ready to publish, saved to organized
  per-platform directories. Dependencies: none (but enhanced by brand context).
  Reads: voice-profile.md, creative-kit.md, learnings.md, stack.md. Writes:
  per-platform content files, assets.md, learnings.md. Chains to: /creative for
  visual assets, /newsletter for email distribution, /seo-content for source
  content.
---

# Content Atomizer Skill

One piece of content should become ten. The best creators don't create more—they distribute better.

This skill transforms any source content into platform-optimized assets. Not generic repurposing. Platform-native content that performs.

**The math:** A single blog post can become 1 LinkedIn carousel + 2 LinkedIn text posts + 1 Twitter thread + 3 single tweets + 2 Instagram carousels + 1 Reel script + 2 TikTok scripts + 1 YouTube Short script + 1 Threads mini-thread + 1 Bluesky post + 1 Reddit value post = 16 pieces of content from one source.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

---

## Brand Memory Integration

This skill reads brand context to ensure every atomized piece sounds like the user's brand, adapts tone per platform, and builds on what has worked before. It also checks the learnings journal for platform performance data and the stack file for scheduling tool availability.

**Reads:** `voice-profile.md`, `creative-kit.md`, `learnings.md`, `stack.md` (all optional)

On invocation, check for `./brand/` and load available context:

1. **Load `voice-profile.md`** (if exists):
   - Extract tone DNA, vocabulary, sentence patterns, and formality level
   - Apply the platform adaptation table (see below) to adjust voice per platform
   - A "direct, proof-heavy" voice sounds different on LinkedIn vs TikTok vs Reddit
   - Use vocabulary lists to stay on-brand: preferred words, banned words, signature phrases
   - Show: "Your voice is [tone summary]. Adapting for each platform."

2. **Load `creative-kit.md`** (if exists):
   - Use brand colors, fonts, and visual identity for carousel slide direction
   - Reference logo placement and design system for visual content notes
   - Show: "Creative kit loaded. Visual notes will reference your brand system."

3. **Load `learnings.md`** (if exists):
   - Check for platform-specific performance data (e.g., "long-form LinkedIn posts outperform short ones")
   - Check for hook patterns that have worked or failed on specific platforms
   - Check for optimal posting times per platform
   - Check for format preferences (carousels vs text, threads vs single tweets)
   - Show: "Found [N] platform learnings. Applying: [key insight]."

4. **Load `stack.md`** (if exists):
   - Check for Buffer, Hootsuite, or other scheduling tool API keys
   - Check for connected social accounts
   - Show: "Scheduling via [tool] available." or "No scheduler detected. Including recommended post times."

5. **If `./brand/` does not exist:**
   - Skip brand loading entirely. Do not error.
   - Proceed without it — this skill works standalone.
   - Note: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

### Context Loading Display

Show the user what was loaded using the standard tree format:

```
Brand context loaded:
├── Voice Profile     ✓ "{tone summary}"
├── Creative Kit      ✓ loaded
├── Learnings         ✓ {N} entries ({M} platform-specific)
├── Stack             ✓ Buffer connected
└── Past Atomizations ✓ {N} found
```

If items are missing:

```
Brand context loaded:
├── Voice Profile     ✗ not found (run /brand-voice)
├── Creative Kit      ✗ not found (run /creative)
├── Learnings         ✗ none yet
├── Stack             ✗ not found
└── Past Atomizations ✗ first run
```

---

## Platform Voice Adaptation Table

The same insight needs different energy per platform. When a voice profile is loaded, apply these adjustments:

| Platform | Formality | Energy | Length Bias | Audience Expectation |
|----------|-----------|--------|-------------|----------------------|
| LinkedIn | Professional, thoughtful | Medium-high | Longer, detailed | Expertise, credibility |
| Twitter/X | Punchy, direct | High | Short, dense | Speed, wit, conviction |
| Instagram | Visual, inspirational | Medium | Caption-length | Visual-first, story |
| TikTok | Casual, energetic | Very high | Spoken-word short | Authenticity, entertainment |
| YouTube | Conversational, thorough | Medium | Script-length | Depth, personality |
| Threads | Conversational, warm | Medium | Medium text | Thoughtful discussion |
| Bluesky | Substantive, measured | Medium-low | Concise text | Nuance, substance |
| Reddit | Detailed, transparent | Low-key | Long-form text | Value, specificity, proof |

**Example — same insight, eight platforms:**

| Platform | Adaptation |
|----------|-----------|
| LinkedIn | "After 10 years in marketing, I've learned that simplicity beats complexity. Here's why:" |
| Twitter/X | "Hot take: Simple marketing > 'sophisticated' marketing. Every time." |
| Instagram | [Image with text: "Simple > Sophisticated" + story in caption] |
| TikTok | "Y'all I need to talk about why everyone's overcomplicating their marketing..." |
| YouTube | "If you've been in marketing for any length of time, you've probably noticed something..." |
| Threads | "Something I keep coming back to: the best marketing strategies are embarrassingly simple. Here's what I mean..." |
| Bluesky | "The complexity fetish in marketing is real. Simple strategies outperform sophisticated ones. A few observations from a decade of data:" |
| Reddit | "I've been in marketing for 10 years and tracked my campaigns. The simple strategies consistently outperform the complex ones. Here's the data and my methodology:" |

---

## Web Search for Algorithm Updates

Before generating content for any platform, perform a live web search to check for recent algorithm changes. This keeps the atomized content aligned with current platform behavior rather than stale playbook data.

### Search Protocol

For each target platform, search for:

```
"{platform name} algorithm update {current month} {current year}"
"{platform name} algorithm changes {current year}"
"{platform name} reach engagement changes {current year}"
```

### What to Look For

1. **New ranking signals** — Any officially announced or widely reported changes to how content is ranked
2. **Format preference shifts** — Are carousels still outperforming? Has video priority changed?
3. **Reach changes** — Reports of organic reach increasing or decreasing
4. **New features** — Features that affect content distribution (e.g., new post types, feed changes)
5. **Policy changes** — New content policies, monetization changes, or API restrictions

### How to Apply Findings

After searching, compare findings against the reference playbook at `./references/platform-playbook.md`:

- **If no changes found:** Proceed with playbook data. Note: "Algorithm check: no significant changes since playbook was written."
- **If changes found:** Flag them explicitly before generating:

```
Algorithm updates detected:

├── LinkedIn    No changes since playbook
├── Twitter/X   ✓ UPDATE: Grok now weights long-form
│               posts higher (Jan 2026 change)
├── Instagram   ✓ UPDATE: Trial Reels get 50% more
│               initial reach (reported Feb 2026)
├── TikTok      No changes since playbook
├── YouTube     No changes since playbook
├── Threads     ✓ UPDATE: Topic tags now affect
│               discovery feed ranking
├── Bluesky     No changes since playbook
└── Reddit      No changes since playbook

Adjusting output for flagged platforms.
```

### Staleness Warning

If the reference playbook is more than 3 months old and web search returns no results (e.g., search fails or is unavailable), warn the user:

```
┌──────────────────────────────────────────────┐
│                                              │
│  ✗ ALGORITHM DATA MAY BE STALE              │
│                                              │
│  The platform playbook was last updated      │
│  [date] and I could not verify current       │
│  algorithm signals via web search.           │
│                                              │
│  Recommendations may not reflect recent      │
│  platform changes. Proceed with playbook     │
│  data, but monitor performance closely.      │
│                                              │
└──────────────────────────────────────────────┘
```

---

## The Core Job

Transform source content into **platform-native assets** that:
- Match each platform's algorithm signals
- Use format-specific best practices
- Include hooks proven to stop the scroll
- Feel native, not repurposed
- Respect brand voice with per-platform adaptation
- Land in organized, publishable file structure

---

## Input Types

### What Can Be Atomized

| Source Type | Best Outputs | Atomization Potential |
|-------------|--------------|----------------------|
| **Blog Post** | All platforms | High (lots of material) |
| **Newsletter** | LinkedIn, Twitter, Instagram, Threads | High |
| **Podcast Episode** | Short-form video, threads, carousels, Reddit | Very High |
| **Long-form Video** | Shorts, Reels, TikToks, carousels | Very High |
| **Webinar/Talk** | All platforms | Very High |
| **Case Study** | LinkedIn, Twitter threads, Reddit | High |
| **Data/Research** | Carousels, threads, single posts, Reddit, Bluesky | Medium-High |
| **Framework/Process** | Carousels, threads, video scripts | High |

### What to Extract

From any source, identify:

1. **The Core Insight** — The one thing someone should remember
2. **Supporting Points** — 3-7 sub-points that build the argument
3. **Stories/Examples** — Concrete illustrations
4. **Data Points** — Stats, numbers, proof
5. **Contrarian Takes** — Opinions that challenge conventional wisdom
6. **Actionable Steps** — What someone can do with this
7. **Quotable Lines** — Punchy phrases that stand alone

---

## Platform Playbooks

### LinkedIn

**Algorithm Signals (December 2025):**
- **Dwell time** — How long people spend reading (still #1)
- **Topic authority** — Consistent niche posting builds algorithmic trust
- **Golden hour** — First 60 minutes determines reach to 2nd/3rd-degree connections
- **Relevance over recency** — Mid-2025 update shows older posts (2-3 weeks) if highly relevant
- **Authentic engagement** — AI detects engagement pods via comment velocity and patterns
- **Native content** — Posts without links get significantly more reach

**2025 Reality Check:** Organic views down ~50%, engagement down ~25% as LinkedIn prioritizes quality over quantity. Post 2-3x/week max, not daily.

**Optimal Specs:**

| Format | Specs | Notes |
|--------|-------|-------|
| Carousel | 5-10 slides, 1080x1350px | Highest dwell time, save-worthy |
| Text Post | 1,200-1,500 chars, 3-line hook | Depth over frequency |
| Document | PDF, 10-15 pages max | Good for frameworks |
| Video | 30-90 seconds, captions required | Lower reach than text/carousels |

#### LinkedIn Carousel Template

**Slide 1: Hook Slide**
```
[BOLD CLAIM OR QUESTION]

(That challenges what they think they know)

Swipe → to learn [specific outcome]
```

**Slide 2-6: Content Slides**
```
[NUMBER]. [POINT HEADLINE]

[2-3 sentences of explanation]

[Visual element or example if possible]
```

**Slide 7: Summary Slide**
```
Quick recap:

1. [Point 1 - 5 words max]
2. [Point 2 - 5 words max]
3. [Point 3 - 5 words max]
4. [Point 4 - 5 words max]
5. [Point 5 - 5 words max]
```

**Final Slide: CTA Slide**
```
Found this useful?

→ Follow for more [topic]
→ Repost to help others
→ Save for later

[Your name/handle]
```

#### LinkedIn Text Post Template

```
[HOOK - First line must stop the scroll]

[Line break]

[CONTEXT - Why this matters, 2-3 lines]

[Line break]

Here's what I learned:

[Line break]

1. [Point with brief explanation]

2. [Point with brief explanation]

3. [Point with brief explanation]

4. [Point with brief explanation]

5. [Point with brief explanation]

[Line break]

[TAKEAWAY - The "so what"]

[Line break]

[CTA - Question or action]

---

[Hashtags - 3-5 max, at the bottom]
```

#### LinkedIn Hook Formulas

**Pattern 1: Contrarian Statement**
> "Stop [thing everyone does]. It's killing your [result]."

**Pattern 2: Story Hook**
> "Last week, I [did something]. What happened next changed how I think about [topic]."

**Pattern 3: List Preview**
> "[Number] [things] that [outcome]. (Number [X] is the one no one talks about.)"

**Pattern 4: Credibility + Insight**
> "After [impressive stat/experience], here's what I know for sure about [topic]:"

**Pattern 5: Question Hook**
> "Why do [surprising thing happen]? I finally figured it out."

**Pattern 6: Bold Claim**
> "[Counterintuitive claim]. Here's the proof:"

---

### Twitter/X

**Algorithm Signals (December 2025):**
- **Replies** — Highest weight, especially from accounts you engage with
- **Quote tweets** — 2x engagement value vs plain retweet
- **Time spent** — On tweet and clicked links
- **Profile clicks** — Curiosity driven by tweet
- **Media boost** — Images/videos/GIFs increase visibility scores
- **Early engagement** — First hours critical for amplification

**2025 Changes:** Following feed now uses **Grok AI** for ranking (based on past interactions and topics)—no longer purely chronological. Users default to For You feed.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Single Tweet | <100 characters optimal | Highest engagement rate |
| Thread | 8-15 tweets | Best for depth + followers |
| Quote Tweet | Add value to original | 2x engagement vs retweet |
| Image Tweet | 1200x675px | 35% more engagement |

#### Twitter Thread Template

**Tweet 1: Hook Tweet**
```
[BOLD CLAIM OR PROMISE]

[What they'll learn in one line]

Thread:
```

**Tweets 2-X: Content Tweets**
```
[NUMBER]. [POINT]

[2-3 sentences of explanation]

[Example or proof if fits]
```

**Final Tweet: Wrap + CTA**
```
TL;DR:

- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4]
- [Point 5]

If this was useful:
1. Follow @[handle] for more
2. RT the first tweet

[Link if relevant]
```

#### Single Tweet Templates

**The Insight Tweet:**
```
[Counterintuitive observation about industry/topic]

Most people think [X].

But [Y] is actually true because [Z].
```

**The List Tweet:**
```
[Number] [things] that [outcome]:

- [Item 1]
- [Item 2]
- [Item 3]
- [Item 4]
- [Item 5]

Which one hits different?
```

**The Hot Take:**
```
Unpopular opinion:

[Contrarian statement]

Here's why: [One-line reasoning]
```

**The Question Tweet:**
```
[Provocative question about industry/topic]?

Genuine question. Reply with your take.
```

**The Proof Tweet:**
```
[Impressive result/stat]

Here's exactly how:

[3-5 bullet points of method]
```

#### Twitter Hook Formulas

**Pattern 1: Bold Opener**
> "[Thing] is dead. Here's what's replacing it:"

**Pattern 2: Numbers + Outcome**
> "I [did X] for [time period]. Here's what happened:"

**Pattern 3: Controversial Take**
> "This will piss off [group], but [claim]."

**Pattern 4: Curiosity Gap**
> "The [industry] secret no one talks about:"

**Pattern 5: Specific Proof**
> "[Specific result] in [timeframe]. No [common excuse]. Here's the playbook:"

---

### Instagram

**Algorithm Signals (December 2025):**
- **DM shares ("sends per reach")** — Now one of the STRONGEST discovery signals
- **Saves** — Still critical for Feed and Explore
- **Watch time & retention** — For Reels, completion rate is king
- **Likes per reach** — Quality signal (not raw likes)
- **Early velocity** — First 30-90 minutes determines push to wider audience
- **Relationship signals** — DMs, profile taps, comment history with account

**2025 Changes:** Photos getting more support in Feed again (Adam Mosseri). Carousels expanded to 20 slides in some regions. Hashtag weighting significantly reduced. New "Your Algorithm" feature lets users see why they're seeing content.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Carousel | 6-10 slides (up to 20), 1080x1350px | Highest engagement, save-worthy |
| Reel | 7-15 sec (viral), 30-45 sec (tutorials) | Best for discovery/reach |
| Single Image | 1080x1350px | Getting more support in 2025 |
| Story | 1080x1920px, <15 sec | Best for DM engagement |

#### Instagram Carousel Template

**Slide 1: Cover (The Hook)**
```
[BOLD STATEMENT OR QUESTION]

in [large, readable font]

[Minimal design, high contrast]
```

**Slide 2: The Problem/Setup**
```
[Why this matters]

or

[What most people get wrong]
```

**Slides 3-8: The Content**
```
[ONE point per slide]

[Large text, minimal words]

[Visual hierarchy: headline + 1-2 supporting lines]
```

**Slide 9: Summary (Optional)**
```
Quick recap:

[Point 1]
[Point 2]
[Point 3]
[Point 4]
[Point 5]
```

**Slide 10: CTA**
```
Save this for later

Follow @[handle] for more

Share with someone who needs this
```

#### Instagram Caption Template

```
[HOOK - First line must work in preview]

.
.
.

[BODY - The value/story/insight]

[2-4 paragraphs max]

[Each paragraph 2-3 sentences]

---

Save this for later
Share with a friend who needs it
Drop a comment if this resonated

---

#[niche hashtag] #[broader hashtag] #[topic hashtag]
```

#### Instagram Reel Script Template (15-30 seconds)

```
[SECONDS 0-3: HOOK]
"[Pattern interrupt or bold claim that stops scroll]"

[SECONDS 3-20: VALUE]
"Here's [what/why/how]:
Point one: [brief]
Point two: [brief]
Point three: [brief]"

[SECONDS 20-30: CTA]
"Follow for more [topic]"
OR
"Save this for later"
OR
"Send to someone who needs this"
```

#### Instagram Story Sequence Template

**Story 1: Hook**
```
[Poll or question sticker]

"Quick question..."
[Poll: Option A / Option B]
```

**Story 2: Setup**
```
"Here's why I ask..."

[Brief context]
```

**Story 3-5: Value**
```
[One point per story]

[Use text animation or stickers for engagement]
```

**Story 6: CTA**
```
"Want the full breakdown?"

[Link sticker to content]

OR

"DM me [word] for [resource]"
```

---

### TikTok

**Algorithm Signals (December 2025):**
- **Watch time (first seconds)** — Completion rate still #1, but early seconds weighted heavily
- **Rewatch rate** — Multiple views = strong signal
- **Shares** — Especially to DMs
- **Niche community alignment** — 2025 favors specialized audiences over broad virality
- **Contextual categorization** — AI distinguishes humor, education, emotion to match interests
- **Video quality** — Lighting, sound, editing now integrated into ranking

**2025 Changes:** Algorithm now favors **longer content (30-60+ seconds) if retention is high**. Niche communities (#BookTok, etc.) get boosted over generic viral attempts. Deeper AI personalization analyzes watch duration, replays, and cross-platform habits.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Short-form | 15-30 seconds | Highest completion rate |
| Medium | 30-60 seconds | Now favored if retention is strong |
| Long-form | 1-3 minutes | Good for depth with engaged audiences |
| Vertical | 1080x1920px (9:16) | Required |

#### TikTok Script Template (15-30 seconds)

```
[HOOK - 0-3 seconds]
"[Visual hook + verbal hook simultaneously]"

Options:
- "Stop scrolling if you [identifier]"
- "POV: You just realized [insight]"
- "The [industry] secret no one tells you:"
- "[Controversial statement]—let me explain"
- "I'm about to save you [time/money/pain]"

[BODY - 3-25 seconds]
"Here's the thing:

[Point 1 - delivered fast]

[Point 2 - keep momentum]

[Point 3 - the payoff]"

[CTA - 25-30 seconds]
"Follow for more [topic]"
OR
"Part 2?" [to boost comments]
OR
"Save this" [drives saves]
```

#### TikTok Hook Formulas

**Pattern 1: Pattern Interrupt**
> "[Unexpected visual or statement that breaks scroll pattern]"

**Pattern 2: Identity Call-Out**
> "This is for my [specific group] who [specific situation]"

**Pattern 3: Proof First**
> "[Show the result immediately, then explain how]"

**Pattern 4: Controversy Spark**
> "I'm going to get hate for this but [take]"

**Pattern 5: Curiosity Gap**
> "I can't believe [industry/brand] doesn't want you to know this"

**Pattern 6: Tutorial Promise**
> "In 30 seconds I'll show you how to [specific outcome]"

#### TikTok Content Patterns That Work

1. **Before/After** — Show transformation immediately
2. **Green Screen** — You + content behind you (tweets, articles, data)
3. **Stitch/Duet** — React to trending content in your niche
4. **Day in the Life** — Niche-specific (day in the life of a marketer, etc.)
5. **POV** — "POV: You're [scenario]" with relatable insight
6. **Listicle** — "3 things [outcome]" with fast delivery
7. **Myth Busting** — "Stop believing [common misconception]"

---

### YouTube

**Algorithm Signals (December 2025):**
- **Click-through rate (CTR)** — How often people click when shown your video
- **Average view duration & % watched** — Raw watch time AND completion percentage
- **Session impact** — Does your video keep people on YouTube longer?
- **Viewer satisfaction** — YouTube now uses surveys + behavior to estimate quality
- **Negative feedback** — "Not interested," skips, very low retention hurt you
- **Topical authority** — Channels focused on clear topics get recommended more

**2025 Changes:** AI-driven hyper-personalization (device, time of day, habits). Older evergreen videos get revived when topics trend again. Stronger emphasis on authority, depth, and "entity-rich" content (aligned with Google Search updates).

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Shorts | 10-35 sec (discovery), up to 60 sec | Highest reach, lower depth |
| Long-form | 8-12 minutes (sweet spot) | Best for monetization + depth |
| Thumbnail | 1280x720px | CTR target: 4-10% (Home), 6-12% strong |

#### YouTube Shorts Script Template

```
[HOOK - 0-2 seconds]
"[Immediate value promise or pattern interrupt]"

Examples:
- "Here's why [common belief] is wrong"
- "[Number] second [topic] lesson"
- "The [industry] hack that changed everything"

[BODY - 2-50 seconds]
[Deliver value fast]

[Each point: 5-10 seconds max]

[Keep visual movement—don't stand still]

[CTA - 50-60 seconds]
"Subscribe for more [topic]"
OR
"Full video on my channel"
OR
End abruptly (drives rewatch for missed content)
```

#### YouTube Long-Form Framework (HIVES)

**H - Hook (0-30 seconds)**
```
[Pattern interrupt or bold claim]
[Quick credibility if needed]
[Preview of what they'll learn]
"By the end of this video, you'll know exactly how to [outcome]"
```

**I - Intro (30 seconds - 1 minute)**
```
[Brief context on why this matters]
[Who this is for]
[What you'll cover]
"Let's dive in"
```

**V - Value (Main content)**
```
[Deliver on the promise]
[Clear sections with verbal signposting]
"First... Second... Third..."
[Examples and proof for each point]
```

**E - Engagement Prompts (Throughout)**
```
[Every 2-3 minutes, insert:]
"Let me know in the comments if [question]"
"Hit like if [relatable statement]"
"If you're finding this useful, subscribe"
```

**S - Strong CTA (Final 30 seconds)**
```
[Summarize key points]
[Clear next action]
"If you want to go deeper on [topic], watch this video next"
[End screen with subscribe + related video]
```

#### YouTube Thumbnail + Title Patterns

**Thumbnail Principles:**
- 3 elements max (face, text, object)
- High contrast colors
- Readable at small size
- Emotion on face (if showing face)
- Curiosity gap (show outcome, not process)

**Title Formulas:**

| Pattern | Example |
|---------|---------|
| How I [result] | "How I Built a 6-Figure Newsletter in 8 Months" |
| [Number] [Things] That [Outcome] | "7 LinkedIn Mistakes Killing Your Reach" |
| Why [Thing] Doesn't Work | "Why Your Content Strategy Isn't Working" |
| The [Adjective] [Thing] | "The Boring Marketing Strategy That Actually Works" |
| I [Did X] For [Time]. Here's What Happened | "I Posted Daily for 90 Days. Here's What Happened" |
| [Year] Guide to [Topic] | "2026 Guide to Growing on LinkedIn" |
| [Thing] vs [Thing] | "Threads vs Twitter: Which One Should You Use?" |

---

### Threads

**Algorithm Signals (February 2026):**
- **Reply depth** — Multi-reply conversations signal high quality
- **Reshares** — Primary amplification mechanism
- **Quote-posts** — Commentary on reshares significantly boosts reach
- **Cross-graph engagement** — Engagement from outside your IG follower graph = broader appeal
- **Topical relevance** — Posts matching trending topics get pushed to discovery
- **Instagram relationship signals** — DMs, follows, and interactions on IG carry over

**Platform characteristics:**
- 500 character limit per post
- Up to 10 images or one 5-minute video per post
- No hashtags initially; limited topic tag system
- Fediverse integration (ActivityPub) — visible on Mastodon
- No DMs — engagement is public only
- No ads (yet) — organic reach is high

**Current Opportunity:** Lower competition than Twitter/X. Instagram cross-posting drives initial distribution. Text-forward format favors thoughtful, opinion-led content. Reply culture is more civil and constructive.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Single Post | 200-400 chars | Highest engagement |
| Mini-Thread | 3-5 posts | Good for depth |
| Quote-Post | Your take + reshare | High amplification |
| Image Post | 1080x1350px | Gets attention in text feed |

#### Threads Post Templates

**The Conversational Take:**
```
[Opinion or observation in plain language]

I've been thinking about this because [context].

The thing nobody mentions: [insight].

What's your experience?
```

**The Mini-Thread:**
```
Post 1: [Bold claim or observation]

Post 2: Here's what I mean:
[Supporting point with example]

Post 3: And the part nobody talks about:
[Deeper insight]

Post 4: Bottom line: [takeaway]
```

**The Quote-Post Commentary:**
```
[Reshare someone else's post]

This is underrated. Here's why:
[Your take in 2-3 sentences]
```

#### Threads Hook Formulas

**Pattern 1: Casual Insight**
> "Something I've noticed about [topic] that I can't stop thinking about:"

**Pattern 2: Friendly Disagreement**
> "I love [person/brand] but I think they're wrong about [thing]. Here's my take:"

**Pattern 3: Behind the Scenes**
> "Okay honest question for [group]: does anyone else [relatable thing]?"

**Pattern 4: IG Cross-Reference**
> "I posted about this on IG but want to go deeper here..."

---

### Bluesky

**Algorithm Signals (February 2026):**
- **Likes** — Basic engagement signal across all feed algorithms
- **Reposts** — Amplification to follower network
- **Reply chains** — Deep conversations surface in algorithmic feeds
- **Custom feed subscriptions** — Users opt into topic feeds that curate content
- **Labeler signals** — Community moderators can surface or suppress content
- **Recency** — Chronological timeline still the default for many users

**Platform characteristics:**
- 300 character limit per post
- Decentralized (AT Protocol) — users can self-host
- No advertising — purely organic distribution
- Custom feeds are the killer feature: curated algorithmic feeds anyone can create
- Domain-as-handle (e.g., yoursite.com) builds credibility
- Growing among tech, media, journalism, and academic communities

**Current Opportunity:** Smaller but highly engaged and educated audience. Disproportionately tech-savvy and media-literate. Strong text culture — thoughtful writing outperforms hot takes. Custom feeds let you target niche audiences with precision.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Single Post | 150-280 chars | Concise, substantive |
| Thread | 3-7 posts | Good for detailed takes |
| Link Post | Context + link | Higher engagement than bare links |
| Image Post | 1200x675px | Breaks up text-heavy feeds |

#### Bluesky Post Templates

**The Thoughtful Observation:**
```
[Nuanced take on industry topic]

The thing that gets lost in the discourse:
[2-3 sentences of substance]
```

**The Link Post:**
```
[Context for why this matters]

[Link to article/resource]

Key takeaway: [one-line summary]
```

**The Community Question:**
```
Genuine question for [group]:

[Specific, thoughtful question]

I've been [context for why you're asking].
Curious what others have experienced.
```

#### Bluesky Hook Formulas

**Pattern 1: Informed Take**
> "[Topic] is more nuanced than people realize. Here's what the data actually shows:"

**Pattern 2: Experience Report**
> "I've been [doing X] for [time]. Here's what surprised me:"

**Pattern 3: Useful Curation**
> "Best [resources/tools/articles] I found this week on [topic]:"

**Pattern 4: Platform Meta**
> "One thing I appreciate about the conversation here vs other platforms:"

---

### Reddit

**Algorithm Signals (February 2026):**
- **Upvote/downvote ratio** — Net karma determines post ranking
- **Velocity of upvotes** — Fast upvotes in first hour critical for reaching Hot
- **Comment count and depth** — Discussion depth is a strong engagement signal
- **Subreddit-specific norms** — Each community has rules, culture, moderators
- **Account age and karma** — Newer/low-karma accounts face restrictions
- **Award signals** — Gilded/awarded posts get visibility boosts

**Platform characteristics:**
- Pseudonymous by default — personal branding secondary to content quality
- Subreddit-specific audiences with strict community rules
- Self-promotion heavily penalized — value-first or get removed
- Long-form text posts perform well in discussion subreddits
- Comments often drive more value than original post
- Google now surfaces Reddit content prominently in search results

**Current Opportunity:** Google's "Reddit results" feature makes subreddit content discoverable in search. High-trust environment for authentic expertise. Longer shelf life than social posts. Strong for B2B thought leadership in niche subreddits.

**Optimal Specs:**

| Format | Specs | Performance |
|--------|-------|-------------|
| Text Post | 500-2000 words, detailed | Highest engagement |
| Link Post | Title + URL | Good for resource sharing |
| AMA | Q&A format, 2-3 hours active | Best for thought leadership |
| Comment | 100-500 words, specific | Often more valuable than posts |

#### Reddit Content Templates

**The Value Post:**
```
Title: [Specific, descriptive title — no clickbait]

Body:
[Context: who you are and why you're qualified]

[The actual value — detailed, specific, no fluff]

[Step-by-step breakdown if applicable]

[Disclaimer if relevant: "I work at X" for transparency]

Edit: [Respond to common questions in edits]
```

**The AMA Strategy:**
```
Title: I'm [credentials]. I [impressive/interesting thing]. AMA.

Body:
[Brief bio — 3-4 sentences]
[What you can answer questions about]
[Proof/verification]

[Spend 2-3 hours answering thoughtfully]
```

**The Comment Strategy:**
```
[Find trending posts in your niche subreddits]
[Add genuinely useful commentary]
[Share specific experience or data]
[Never link to your own content unless asked]
```

#### Reddit-Specific Rules

1. **Read the subreddit rules before posting** — Every subreddit has unique rules
2. **No overt self-promotion** — The 90/10 rule: 90% value, 10% self-reference
3. **Be transparent** — Disclose affiliations or get banned
4. **Long-form wins** — Detailed, well-structured posts outperform short ones
5. **Engage in comments** — The OP should stay active in discussion
6. **Timing matters** — Post when your target subreddit is most active

#### Key Subreddits for Marketing Content

| Subreddit | Audience | Best Content Type |
|-----------|----------|-------------------|
| r/marketing | Marketing professionals | Strategy, case studies |
| r/entrepreneur | Founders, solopreneurs | Growth stories, tactics |
| r/startups | Startup founders | Growth hacking, lessons |
| r/smallbusiness | SMB owners | Practical advice, tools |
| r/SaaS | SaaS founders | Product marketing, growth |
| r/content_marketing | Content marketers | Distribution, SEO |
| r/socialmedia | Social media managers | Platform strategies |
| r/copywriting | Copywriters | Technique, critique |

---

## The Atomization Workflow

### Step 1: Extract

From your source content, pull out:

```
CORE INSIGHT:
[One sentence that captures the main point]

SUPPORTING POINTS:
1. [Point + brief explanation]
2. [Point + brief explanation]
3. [Point + brief explanation]
4. [Point + brief explanation]
5. [Point + brief explanation]

STORIES/EXAMPLES:
- [Story 1]
- [Story 2]

DATA/PROOF:
- [Stat 1]
- [Stat 2]

QUOTABLE LINES:
- "[Quote 1]"
- "[Quote 2]"

CONTRARIAN TAKES:
- [Take 1]
- [Take 2]
```

### Step 2: Search for Algorithm Updates

Before mapping to platforms, run the web search protocol (see above). Flag any changes that affect format choices or hook strategy.

### Step 3: Load Brand Voice + Platform Adaptation

If voice profile exists, load it and apply the platform adaptation table. Each platform version of the content should feel like the same person speaking in a different room.

### Step 4: Map to Platforms

| Content Element | Best Platforms | Best Formats |
|-----------------|----------------|--------------|
| Core insight | All | Single posts, hooks |
| Supporting points (together) | LinkedIn, Twitter, Threads | Carousel, thread, mini-thread |
| Individual points | All | Single posts |
| Stories | Instagram, TikTok, Threads | Reels, Stories, conversational posts |
| Data points | LinkedIn, Twitter, Bluesky, Reddit | Image posts, carousels, detailed posts |
| Quotable lines | Twitter, Instagram, Bluesky | Quote graphics |
| Contrarian takes | Twitter, TikTok, Threads, Reddit | Single tweets, video hooks, value posts |

### Step 5: Transform

For each platform, apply:

1. **Format** — Use the templates above
2. **Hook** — Platform-specific hook formula
3. **Length** — Match platform norms
4. **CTA** — Platform-appropriate action
5. **Voice** — Adjust per platform adaptation table

### Step 6: Sequence

**Optimal posting sequence:**

1. **LinkedIn carousel** — Day 1 (longest shelf life)
2. **Twitter thread** — Day 1-2 (good for discussion)
3. **Threads mini-thread** — Day 2 (conversational take)
4. **Instagram carousel** — Day 2-3 (repurpose LinkedIn design)
5. **Bluesky post** — Day 3 (substantive angle)
6. **TikTok/Reel** — Day 3-4 (needs video production)
7. **YouTube Short** — Day 4-5 (can repurpose TikTok)
8. **Reddit value post** — Day 5-7 (detailed, value-first version)
9. **Single posts** — Ongoing (extract individual points)

---

## Per-Platform File Output

Every atomization writes content to organized directories. The structure ensures each platform's content is easy to find, review, and publish.

### Directory Structure

```
./campaigns/{source-slug}/
  brief.md                    <- Extraction summary
  social/
    linkedin/
      carousel.md             <- Slide-by-slide content
      text-post-01.md         <- First text post
      text-post-02.md         <- Second text post
    twitter/
      thread.md               <- Full thread
      single-01.md            <- Standalone tweet 1
      single-02.md            <- Standalone tweet 2
      single-03.md            <- Standalone tweet 3
    instagram/
      carousel.md             <- Slide content + caption
      carousel-02.md          <- Second carousel variant
      reel-script.md          <- Reel script with timing
      story-sequence.md       <- Story sequence
    tiktok/
      script-01.md            <- First TikTok script
      script-02.md            <- Second TikTok script
    youtube/
      short-script.md         <- YouTube Short script
      long-form-outline.md    <- Long-form video outline (if applicable)
    threads/
      post-01.md              <- Conversational take
      mini-thread.md          <- Multi-post thread
    bluesky/
      post-01.md              <- Substantive post
      thread.md               <- Thread (if applicable)
    reddit/
      value-post.md           <- Detailed subreddit post
      comment-strategy.md     <- Key threads to comment on
  schedule.md                 <- Content calendar with dates and times
```

### Source Slug Convention

The source slug is derived from the source content title:
- Lowercase, kebab-case
- Max 40 characters
- Example: "5 Pricing Mistakes That Kill SaaS Growth" becomes `5-pricing-mistakes-saas-growth`

### File Header Format

Every content file includes a consistent header:

```
---
platform: linkedin
format: carousel
source: "5 Pricing Mistakes That Kill SaaS Growth"
created: 2026-02-16
status: draft
recommended_post_time: "Tuesday 8:00 AM EST"
---
```

### Output Confirmation

After writing all files, display the tree:

```
FILES SAVED

./campaigns/5-pricing-mistakes-saas-growth/
├── brief.md                        ✓
├── social/
│   ├── linkedin/
│   │   ├── carousel.md             ✓
│   │   ├── text-post-01.md         ✓
│   │   └── text-post-02.md         ✓
│   ├── twitter/
│   │   ├── thread.md               ✓
│   │   ├── single-01.md            ✓
│   │   ├── single-02.md            ✓
│   │   └── single-03.md            ✓
│   ├── instagram/
│   │   ├── carousel.md             ✓
│   │   └── reel-script.md          ✓
│   ├── tiktok/
│   │   ├── script-01.md            ✓
│   │   └── script-02.md            ✓
│   ├── youtube/
│   │   └── short-script.md         ✓
│   ├── threads/
│   │   ├── post-01.md              ✓
│   │   └── mini-thread.md          ✓
│   ├── bluesky/
│   │   └── post-01.md              ✓
│   └── reddit/
│       └── value-post.md           ✓
└── schedule.md                     ✓

./brand/assets.md                   ✓ (16 entries added)
```

---

## Scheduling Integration

### Detection Protocol

On invocation, check for scheduling tool availability:

1. **Check `./brand/stack.md`** for connected scheduling tools
2. **Check `.env`** for API keys:
   - `BUFFER_ACCESS_TOKEN` — Buffer
   - `HOOTSUITE_API_KEY` — Hootsuite
   - `LATER_API_KEY` — Later
   - `SPROUT_API_KEY` — Sprout Social

### If Scheduler Detected

When a scheduling tool API key is found:

```
Scheduling detected:

├── Buffer             ✓ connected
│   ├── LinkedIn       ✓ @handle linked
│   ├── Twitter/X      ✓ @handle linked
│   ├── Instagram      ✓ @handle linked
│   └── Threads        ○ not available via Buffer
├── Connected accounts 3 of 8 platforms
└── Unschedulable      Threads, Bluesky, Reddit, TikTok, YouTube

Would you like me to:
① Schedule all compatible posts via Buffer
② Output with recommended times only
③ Schedule some, manual for others
```

If the user selects scheduling:

- Use the scheduling tool's API to queue posts
- Set post times based on platform best practices and any learnings data
- Confirm each scheduled post with platform, time, and preview
- Note which platforms require manual posting

### If No Scheduler Detected

Include recommended post times in every content file and in the schedule overview:

```
RECOMMENDED POST TIMES

Platform         Best Time           Timezone
──────────────────────────────────────────────
LinkedIn         Tue/Thu 8-10 AM     User local
Twitter/X        Mon-Fri 12-1 PM    User local
Instagram        Mon/Wed/Fri 11 AM  User local
TikTok           Tue/Thu 7-9 PM     User local
YouTube          Sat 9-11 AM        User local
Threads          Daily 9-11 AM      User local
Bluesky          Weekdays 10-12 PM  User local
Reddit           Mon/Wed 9 AM       EST

Note: These are general best practices. Run
/content-atomizer a few times and share your
analytics to build personalized timing data.
```

Suggest adding a scheduler:

```
┌──────────────────────────────────────────────┐
│                                              │
│  ○ NO SCHEDULER DETECTED                    │
│                                              │
│  Content saved with recommended post times.  │
│  Connect a scheduling tool for one-click     │
│  publishing:                                 │
│                                              │
│  → Buffer      Add BUFFER_ACCESS_TOKEN       │
│                to .env                       │
│  → Hootsuite   Add HOOTSUITE_API_KEY         │
│                to .env                       │
│                                              │
│  Run /start-here to configure.               │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Content Calendar Mode

When the user requests a content calendar (trigger phrases: "create content calendar from this," "generate a week of posts from this," "schedule this across platforms"), generate a full week's posting schedule.

### Calendar Generation Process

1. **Extract** all atomizable elements from the source
2. **Search** for algorithm updates on all target platforms
3. **Load** brand voice and platform adaptation
4. **Map** content to optimal platform-day-format combinations
5. **Generate** all content pieces
6. **Assign** specific dates and times
7. **Write** all files plus a master schedule

### Calendar Output Format

The master `schedule.md` file contains the full week view:

```
---
source: "5 Pricing Mistakes That Kill SaaS Growth"
calendar_start: 2026-02-17
calendar_end: 2026-02-23
platforms: [linkedin, twitter, instagram, tiktok, youtube, threads, bluesky, reddit]
total_posts: 22
---

# Content Calendar: 5 Pricing Mistakes

Source: "5 Pricing Mistakes That Kill SaaS Growth"
Week of Feb 17-23, 2026

MONDAY FEB 17

  08:00 AM  LinkedIn     carousel.md
            "5 pricing mistakes killing your SaaS"
            8 slides, educational carousel

  12:00 PM  Twitter/X    thread.md
            "I've seen 100+ SaaS companies price wrong"
            7-tweet thread

  09:00 AM  Threads      post-01.md
            "Something about SaaS pricing nobody talks about"
            Conversational take

──────────────────────────────────────────────

TUESDAY FEB 18

  09:00 AM  LinkedIn     text-post-01.md
            Deep dive on mistake #1 with personal story

  01:00 PM  Twitter/X    single-01.md
            Just mistake #3 as hot take

  11:00 AM  Instagram    carousel.md
            Visual version of LinkedIn carousel

  10:00 AM  Bluesky      post-01.md
            Data-driven pricing observation

──────────────────────────────────────────────

WEDNESDAY FEB 19

  07:00 PM  TikTok       script-01.md
            "Stop making these pricing mistakes"
            20-sec hot take style

  12:00 PM  Twitter/X    single-02.md
            Quotable line from the article

  09:00 AM  Reddit       value-post.md
            Detailed breakdown in r/SaaS
            "I analyzed 100 SaaS pricing pages..."

──────────────────────────────────────────────

THURSDAY FEB 20

  08:00 AM  LinkedIn     text-post-02.md
            Framework post: "The 3-tier test"

  07:00 PM  TikTok       script-02.md
            "The pricing mistake that cost me $50k"
            30-sec story format

  11:00 AM  Instagram    reel-script.md
            30-sec pricing mistakes Reel

  10:00 AM  Threads      mini-thread.md
            4-post deep dive on pricing psychology

──────────────────────────────────────────────

FRIDAY FEB 21

  01:00 PM  Twitter/X    single-03.md
            "The best SaaS pricing is boring"

  11:00 AM  Instagram    story-sequence.md
            Poll: "What's your pricing model?"

──────────────────────────────────────────────

SATURDAY FEB 22

  09:00 AM  YouTube      short-script.md
            45-sec: All 5 mistakes, rapid fire

  11:00 AM  Instagram    carousel-02.md
            "How to fix your SaaS pricing"

──────────────────────────────────────────────

SUNDAY FEB 23

  (Rest day — or use for engagement/replies)

──────────────────────────────────────────────

SUMMARY

Total posts:  22
Platforms:    8
Unique pieces: 16 (some adapted across platforms)
Calendar file: ./campaigns/5-pricing-mistakes-saas-growth/schedule.md
```

### Calendar Customization

If the user specifies preferences, honor them:

- **"Only LinkedIn and Twitter"** — Generate for those platforms only
- **"3 posts per day max"** — Cap daily output
- **"No weekends"** — Skip Saturday and Sunday
- **"Focus on video"** — Prioritize TikTok, Reels, Shorts
- **"I want 2 weeks"** — Extend the calendar and remix content angles

---

## Anti-Patterns: What Not to Do

### Don't:

1. **Copy-paste across platforms**
   - Each platform has different norms
   - Cross-posted content performs 40-60% worse

2. **Use the same hook everywhere**
   - LinkedIn hooks are not TikTok hooks
   - Adjust energy and format per platform

3. **Ignore platform-native features**
   - No hashtags on LinkedIn carousels
   - Always use captions on video
   - Instagram needs visual-first thinking

4. **Post everything at once**
   - Stagger across days/weeks
   - Gives each piece room to perform

5. **Forget the CTA**
   - Every platform piece needs a clear next action
   - But make it platform-appropriate

6. **Treat Threads like Twitter/X**
   - The cultures are different
   - Threads rewards conversation, not broadcasting

7. **Self-promote on Reddit**
   - Value first, always
   - Disclose affiliations transparently

8. **Use Twitter tone on Bluesky**
   - Bluesky rewards substance and nuance
   - Hot takes without depth get ignored

### Do:

1. **Lead with the best hook per platform**
2. **Adapt length to platform norms**
3. **Use native formatting (threads, carousels, etc.)**
4. **Front-load value (especially for video)**
5. **Create platform-specific visuals when possible**
6. **Adjust voice using the platform adaptation table**
7. **Check algorithm updates before generating**
8. **Write files to organized per-platform directories**

---

## Transformation Examples

### Example: Blog Post to Multi-Platform

**Source:** 2,000-word blog post on "5 Pricing Mistakes That Kill SaaS Growth"

**Atomization:**

| Platform | Format | Content |
|----------|--------|---------|
| LinkedIn | Carousel | 8 slides: Hook + 5 mistakes + recap + CTA |
| LinkedIn | Text Post | Deep dive on mistake #1 with personal story |
| Twitter | Thread | 7 tweets: Hook + 5 mistakes + wrap |
| Twitter | Single | Just mistake #3 (most contrarian) as hot take |
| Instagram | Carousel | Visual version of LinkedIn carousel |
| Instagram | Reel | 30-sec: "Stop making these pricing mistakes" |
| TikTok | Video | 20-sec: Most controversial mistake, hot take style |
| YouTube Short | Video | 45-sec: All 5 mistakes, rapid fire |
| Threads | Mini-Thread | 4-post conversational take on pricing psychology |
| Bluesky | Post | Data-driven observation about pricing patterns |
| Reddit | Value Post | Detailed breakdown with methodology in r/SaaS |

### Example: Podcast Episode to Multi-Platform

**Source:** 45-minute podcast interview with actionable insights

**Atomization:**

| Platform | Format | Content |
|----------|--------|---------|
| LinkedIn | Text Post | Best quote + context + your take |
| LinkedIn | Carousel | Key framework from interview |
| Twitter | Thread | 10 best insights from the episode |
| Twitter | Single | Best quote as standalone insight |
| Instagram | Carousel | Visual quotes from guest |
| Instagram | Reel | Best 30-second clip with captions |
| TikTok | Video | Spiciest take from interview |
| YouTube Short | Video | Best insight with visual hook |
| YouTube | Long-form | Full episode or highlights compilation |
| Threads | Post | Guest's most surprising insight + your reaction |
| Bluesky | Post | Key takeaway + link to full episode |
| Reddit | AMA follow-up | "I just interviewed [guest] about [topic]. Key learnings:" |

---

## Platform Voice Adjustments

The same insight needs different energy per platform:

| Platform | Voice | Example (same insight) |
|----------|-------|----------------------|
| LinkedIn | Professional, thoughtful | "After 10 years in marketing, I've learned that simplicity beats complexity. Here's why:" |
| Twitter | Punchy, direct | "Hot take: Simple marketing > 'sophisticated' marketing. Every time." |
| Instagram | Visual, inspirational | [Image with text: "Simple > Sophisticated" + story in caption] |
| TikTok | Casual, energetic | "Y'all I need to talk about why everyone's overcomplicating their marketing..." |
| YouTube | Conversational, thorough | "If you've been in marketing for any length of time, you've probably noticed something..." |
| Threads | Warm, conversational | "Something I keep coming back to: the best marketing strategies are embarrassingly simple." |
| Bluesky | Substantive, measured | "The complexity fetish in marketing is real. Simple strategies outperform sophisticated ones consistently." |
| Reddit | Detailed, transparent | "I've been in marketing for 10 years. Here's the data on simple vs complex strategies:" |

---

## Quick Reference: Platform Specs (February 2026)

| Platform | Optimal Length | Best Format | Hook Window | Top Signal |
|----------|---------------|-------------|-------------|------------|
| LinkedIn | 1,200-1,500 chars | Carousel | First 3 lines | Dwell time + topic authority |
| Twitter/X | <100 chars (single) | Thread (8-15) | First tweet | Replies + early engagement |
| Instagram | 6-10 slides | Carousel | First slide | DM shares ("sends per reach") |
| TikTok | 30-60 seconds (if retention high) | Short video | First 3 seconds | Completion + niche alignment |
| YouTube (Shorts) | 10-35 seconds | Vertical video | First 2 seconds | Completion rate |
| YouTube (Long) | 8-12 minutes | Horizontal | First 30 seconds | Satisfaction + session time |
| Threads | 200-400 chars | Single post / mini-thread | First post | Reply depth + reshares |
| Bluesky | 150-280 chars | Single post | First line | Likes + custom feed placement |
| Reddit | 500-2000 words | Text post | Title + first paragraph | Upvote velocity + comment depth |

---

## The Test

Good atomization means:

1. **Each piece stands alone** — Makes sense without the source
2. **Each piece feels native** — Doesn't feel "repurposed"
3. **Hooks match the platform** — Right energy, right format
4. **Value is front-loaded** — Best stuff first
5. **CTAs are appropriate** — Platform-native actions
6. **Quality over quantity** — 5 great pieces > 15 mediocre ones
7. **Voice adapts per platform** — Same person, different room
8. **Files are organized** — Per-platform directories, ready to publish

---

## Feedback Collection

After delivering atomized content, collect feedback per the brand memory protocol:

```
How did these perform?

a) Great — published as-is across platforms
b) Good — minor edits on some platforms
c) Rewrote significantly for some platforms
d) Haven't published yet

(You can answer later. Tell me which platforms
worked best and I'll optimize for those next time.)
```

**Processing feedback:**
- If (a): Log to learnings.md with platform-specific notes
- If (b): Ask which platforms needed edits and what changed. Log platform-specific insights.
- If (c): Ask for details. If a platform consistently needs rewrites, the adaptation table may need tuning.
- If (d): Note it. Remind on next run.

Platform-specific feedback is especially valuable. Log entries like:
- `[2026-02-16] [/content-atomizer] LinkedIn carousels shipped as-is. Twitter thread needed punchier hooks. Voice profile may be too formal for X.`
- `[2026-02-16] [/content-atomizer] Reddit post in r/SaaS got 200+ upvotes. Detailed breakdown format works. Keep using "I analyzed X" hook pattern.`

---

## How This Connects to Other Skills

**Input from:**
- **seo-content** — Blog posts to atomize
- **newsletter** — Newsletter editions to atomize
- **direct-response-copy** — Landing page insights to distribute
- **brand-voice** — Ensures consistent voice across platforms
- **creative** — Visual assets for carousels, thumbnails, social graphics

**Output to:**
- **creative** — Request visual assets for carousel slides, thumbnails
- **brand/assets.md** — Register all created content
- **brand/learnings.md** — Log platform performance data

**The flow:**
1. Create source content (blog, newsletter, video)
2. **content-atomizer transforms into platform pieces**
3. Each piece drives back to source or offer
4. Collect feedback on platform performance
5. Learnings feed into next atomization
6. Repeat with next piece of source content

---

## What's Next After Atomization

After generating atomized content, suggest next steps:

```
WHAT'S NEXT

Your content is atomized and saved. Next moves:

→ /creative          Generate platform visuals —
                     carousel graphics, thumbnails,
                     video assets (~15 min)
→ /newsletter        Bundle these insights into your
                     next newsletter edition (~15 min)
→ /email-sequences   Nurture social followers into
                     subscribers with a sequence (~15 min)
→ /seo-content       Create the source blog post
                     if you started from an idea (~20 min)
→ /start-here        Review your full project status

Or tell me what you're working on and I'll route you.
```
