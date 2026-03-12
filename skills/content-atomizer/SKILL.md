---
name: content-atomizer
description: |
  Take one piece of long-form content and atomize it into 10-20 platform-specific posts. Turns blog posts, podcasts, videos, and newsletters into Twitter/X threads, LinkedIn posts, Instagram captions, Reddit posts, and more. Triggers on: repurpose this, atomize, turn this into posts, social content from blog, content repurposing, break this down for social.
category: content
tier: core
reads:
  - brand/voice-profile.md
  - brand/audience.md
writes:
  - marketing/social/{source-slug}/
depends-on:
  - brand-voice
triggers:
  - repurpose
  - atomize
  - turn this into posts
  - social content from
  - content repurposing
  - break this down
  - social posts from blog
  - distribute this
allowed-tools: []
---

# Content Atomizer

You take one piece of long-form content and extract 10-20 standalone social posts, each native to its target platform. Not lazy copy-paste with different character counts — genuine reformatting that makes each post feel like it was written platform-first.

## On Activation

1. Read `brand/voice-profile.md` — maintain consistent voice across platforms
2. Read `brand/audience.md` — know which platforms matter and how the audience behaves on each
3. Accept the source content (blog post, newsletter, video transcript, podcast transcript)
4. If no source provided, check `marketing/content/` for recent articles

---

## The Atomization Process

### Step 1: Extract Raw Material

Read the source content and extract:

- **Key insights**: 3-5 original ideas or arguments
- **Quotable lines**: Sentences that stand alone as wisdom
- **Stats/data points**: Any numbers, percentages, results
- **Stories/anecdotes**: Narrative moments that create emotional connection
- **Contrarian takes**: Opinions that challenge conventional wisdom
- **Step-by-step processes**: Any how-to sequences
- **Lists**: Any grouped items (tools, tips, mistakes, etc.)

Tag each extraction with its type. This is your raw material inventory.

### Step 2: Map to Platforms

Each extraction type maps naturally to specific platforms and formats:

| Extraction Type | Twitter/X | LinkedIn | Instagram | Reddit |
|----------------|-----------|----------|-----------|--------|
| Key insight | Single tweet | Text post | Carousel slide | Comment/post |
| Quotable line | Quote tweet | Text post with context | Quote graphic caption | — |
| Stats/data | Data tweet | Data post with analysis | Infographic caption | Data post |
| Story | Thread opener | Story post | Story caption | Long-form post |
| Contrarian take | Hot take tweet | Debate post | — | Discussion post |
| Step-by-step | Thread | Carousel/document | Carousel | How-to post |
| List | Thread or single | Listicle post | Carousel | List post |

### Step 3: Write Platform-Native Posts

---

## Platform Rules

### Twitter/X

**Character limit**: 280 per tweet, threads unlimited

**Single Tweet Formula:**
```
[Hook — pattern interrupt or bold claim]

[1-2 sentences of value or proof]

[CTA or takeaway]
```

**Thread Formula:**
```
Tweet 1: Hook — the big promise or contrarian take (this sells the thread)
Tweet 2-N: One idea per tweet, each must standalone
Final tweet: Summary + CTA + "Follow for more [topic]"
```

**Rules:**
- Hook tweet determines 90% of engagement — spend 50% of time on it
- One idea per tweet in threads
- Use line breaks for readability
- No hashtags in the main text (one in reply if any)
- End threads with a retweet ask or follow CTA
- Optimal: 5-12 tweets per thread

**Hook patterns that work:**
- "I spent [time] doing [thing]. Here's what I learned:"
- "[Contrarian statement]. Here's why:"
- "[Big number] [result] in [timeframe]. The playbook:"
- "Stop doing [common thing]. Do this instead:"
- "The [topic] advice nobody gives you:"

### LinkedIn

**Character limit**: 3,000 per post

**Post Formula:**
```
[Hook line — stops the scroll]

[Line break]

[Story or context — 3-5 short paragraphs]

[Key insight or lesson]

[Call to engage: question, agree/disagree, share your experience]

[3-5 hashtags at the bottom]
```

**Rules:**
- First line is everything — it shows before "see more"
- Write in short paragraphs (1-2 sentences each)
- Use "I" — personal stories outperform corporate content 3x
- End with a question to drive comments
- 3-5 relevant hashtags at the bottom only
- No links in the post body (kills reach) — put links in first comment
- Document format/carousels get 3x reach over text posts
- Optimal length: 800-1,500 characters

**Hook patterns:**
- "I made a mistake that cost me [consequence]."
- "Unpopular opinion: [take]"
- "After [X years/months] of [doing thing], here's what actually works:"
- "[Achievement]. But it almost didn't happen."

### Instagram

**Character limit**: 2,200 per caption

**Caption Formula:**
```
[Hook line — first 125 characters show in feed]

[Value content — tips, story, insight]

[CTA — save this, share with someone, comment your take]

.
.
.
[Hashtags — 5-15 relevant ones]
```

**Carousel Strategy:**
- Slide 1: Bold headline (this is the hook)
- Slides 2-N: One point per slide, large text, minimal design
- Final slide: Summary + CTA + account tag
- 7-10 slides is the sweet spot
- Provide text content for each slide with design notes

**Rules:**
- First 125 characters = the hook (visible before "more")
- Carousel posts get 1.4x more reach than single images
- Include image/graphic brief with each post
- Hashtags in caption or first comment (test both)
- CTAs that work: "Save this for later" / "Tag someone who needs this"

### Reddit

**Rules are different here. Reddit hates marketing.**

**Post Formula:**
```
Title: [Specific, descriptive, no clickbait]

Body:
[Context — who you are, why you're sharing]
[The actual value — detailed, generous, no gatekeeping]
[Results or proof if applicable]
[Question to invite discussion]

[NO self-promotion links in the body]
```

**Rules:**
- Provide genuine value first, always
- Match the subreddit's tone and norms
- No links to your stuff in the post — put them in a comment if asked
- Write longer, more detailed posts than other platforms
- Be ready for skepticism — back up claims
- Identify 2-3 relevant subreddits per topic
- Title is plain and specific, not clickbaity

---

## Hooks and CTAs

### Universal Hook Formulas

1. **The Number**: "7 things I learned about [topic]"
2. **The Mistake**: "The biggest [topic] mistake I see:"
3. **The Contrarian**: "[Common belief] is wrong. Here's why:"
4. **The Curiosity Gap**: "Most people [do X]. Top performers [do Y]."
5. **The Story**: "Last week, something happened that changed how I think about [topic]."
6. **The How-To**: "How to [achieve result] in [timeframe]:"
7. **The Data**: "[Stat]. Here's what that means for you:"

### CTA Types by Goal

| Goal | CTA |
|------|-----|
| Engagement | "What's your take?" / "Agree or disagree?" |
| Follows | "Follow for daily [topic] tips" |
| Saves | "Save this for when you need it" |
| Shares | "Tag someone who needs to hear this" |
| Traffic | "Link in bio" / "Link in comments" |
| Email capture | "I wrote a deeper guide — link in bio" |

---

## Output Structure

For each source piece, output a directory:

```
marketing/social/{source-slug}/
├── twitter-threads.md    # 2-3 threads with hook tweets
├── twitter-singles.md    # 5-8 standalone tweets
├── linkedin-posts.md     # 3-5 LinkedIn posts
├── instagram-captions.md # 2-3 captions with carousel briefs
└── reddit-posts.md       # 1-2 Reddit posts with subreddit targets
```

Each post includes:

```yaml
---
platform: twitter | linkedin | instagram | reddit
type: thread | single | post | carousel | story
source: "original-content-slug"
hook: "first line preview"
character_count: 247
hashtags: ["tag1", "tag2"]
suggested_time: "Tuesday 9am ET"
status: draft
---
```

---

## Posting Schedule

| Platform | Best Times (ET) | Frequency |
|----------|----------------|-----------|
| Twitter/X | 8-10am, 12-1pm, 5-6pm | 1-3x daily |
| LinkedIn | 8-10am Tue-Thu | 3-5x weekly |
| Instagram | 11am-1pm, 7-9pm | 4-7x weekly |
| Reddit | 6-9am, varies by sub | 2-3x weekly |

Space out atomized content over 1-2 weeks. Don't dump everything the same day.

---

## Related Skills

- **brand-voice**: Establish voice before atomizing at scale
- **seo-content**: Create the source content to atomize
- **newsletter**: Atomize newsletter content for social
- **creative**: Generate visual asset briefs for social graphics
