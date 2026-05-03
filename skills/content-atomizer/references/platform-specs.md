# Platform Specs Reference

> Split into per-platform files for token efficiency. Load only the platforms you need.

## Per-Platform Playbooks

Each file contains: algorithm signals, optimal specs, templates, hook formulas.

| Platform | File | Character Limit |
|----------|------|-----------------|
| LinkedIn | `references/platforms/linkedin.md` | 3,000 |
| Twitter/X | `references/platforms/twitter.md` | 280 |
| Instagram | `references/platforms/instagram.md` | 2,200 |
| TikTok | `references/platforms/tiktok.md` | N/A (video) |
| YouTube | `references/platforms/youtube.md` | N/A (video) |
| Threads | `references/platforms/threads.md` | 500 |
| Bluesky | `references/platforms/bluesky.md` | 300 |
| Reddit | `references/platforms/reddit.md` | Unlimited |

Load the specific platform file when writing posts for that platform.

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

## Transformation Examples

### Blog Post to Multi-Platform

**Source:** 2,000-word blog post on "5 Pricing Mistakes That Kill SaaS Growth"

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

### Podcast Episode to Multi-Platform

**Source:** 45-minute podcast interview with actionable insights

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

## Content Calendar Mode

When the user requests a content calendar, generate a full week's posting schedule.

### Process

1. **Extract** all atomizable elements from the source
2. **Load** brand voice and platform adaptation
3. **Map** content to optimal platform-day-format combinations
4. **Generate** all content pieces
5. **Assign** specific dates and times
6. **Write** all files plus a master schedule

### Calendar Customization

- **"Only LinkedIn and Twitter"** — Generate for those platforms only
- **"3 posts per day max"** — Cap daily output
- **"No weekends"** — Skip Saturday and Sunday
- **"Focus on video"** — Prioritize TikTok, Reels, Shorts
- **"I want 2 weeks"** — Extend the calendar and remix content angles

## Scheduling Integration

On invocation, check for posting tool availability:

1. **Check `./brand/stack.md`** for connected posting tools
2. **Check for playwright-cli** — browser-based social posting

If a scheduling tool is detected, offer to post directly. If not, include recommended post times in every content file and suggest connecting a scheduler.
