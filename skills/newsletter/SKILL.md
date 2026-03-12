---
name: newsletter
description: |
  Design, write, and grow editorial newsletters with consistent voice and format. Creates newsletter strategy, templates, individual issues, growth tactics, and engagement optimization. Triggers on: newsletter, write a newsletter, email newsletter, weekly update, curated email, editorial email, subscriber growth, newsletter strategy.
category: email
tier: core
reads:
  - brand/voice-profile.md
  - brand/audience.md
writes:
  - marketing/newsletter/strategy.md
  - marketing/newsletter/template.md
  - marketing/newsletter/issues/{date}-{slug}.md
depends-on:
  - brand-voice
triggers:
  - newsletter
  - write a newsletter
  - weekly update
  - curated email
  - editorial email
  - subscriber growth
  - newsletter strategy
  - email digest
allowed-tools: []
---

# Newsletter System

You design and write editorial newsletters that people actually look forward to receiving. Not corporate updates nobody reads — opinionated, valuable, personality-driven emails that build an audience over time.

## On Activation

1. Read `brand/voice-profile.md` — newsletters live or die by voice consistency
2. Read `brand/audience.md` — understand what they care about, how sophisticated they are
3. If starting fresh, ask: What's the newsletter about? Who's it for? What format appeals to you?
4. Check `marketing/newsletter/` for existing strategy and past issues

---

## Step 1: Define the Newsletter

### Newsletter Types

| Type | Description | Best For | Example |
|------|-------------|----------|---------|
| **Curated** | Best links + your commentary | Industry watchers, busy professionals | The Hustle, TLDR |
| **Editorial** | Original essays/insights | Thought leaders, opinionated founders | Stratechery, Lenny's Newsletter |
| **Hybrid** | Mix of original + curated | Most founders and creators | Morning Brew, Dense Discovery |
| **Product update** | What's new in your product | SaaS companies with active users | Linear, Notion changelogs |
| **Educational** | Teaches one skill per issue | Course creators, consultants | James Clear, Marketing Examples |

### Strategy Doc

Before writing a single issue, establish:

```yaml
---
name: "Newsletter Name"
tagline: "One-line value prop (what they get + how often)"
type: curated | editorial | hybrid | product | educational
frequency: weekly | biweekly | daily
send_day: Tuesday
send_time: "9:00 AM ET"
target_audience: "Who specifically reads this"
core_topic: "The single topic area"
voice: "How it sounds (reference voice-profile.md)"
success_metric: "Open rate > 40%, click rate > 5%"
---
```

---

## Step 2: Build the Template

Every newsletter needs a repeatable structure readers come to expect.

### Template Structure

```markdown
# [Newsletter Name] — Issue #[N]

## [Catchy issue title or theme]

### Intro (2-3 sentences)
[Personal hook — what happened this week, what's on your mind, why this issue matters]

---

### Section 1: [Main Value Block]
[The core content — original insight, deep dive, or primary curation]

### Section 2: [Secondary Value]
[Supporting content, related links, or complementary angle]

### Section 3: [Quick Hits / Links]
- **[Link title]** — One-line commentary on why it matters
- **[Link title]** — One-line commentary
- **[Link title]** — One-line commentary

---

### [Recurring Section Name]
[Something predictable readers look forward to: tool of the week, quote, stat, hot take]

---

### CTA
[One primary ask: share, reply, check out product, visit link]

---

[Sign-off in your voice]
[Name]

[Footer: unsubscribe, share link, social links]
```

### Format-Specific Templates

**Curated Newsletter:**
- 5-7 links with 2-3 sentence commentary each
- Group by theme or rank by importance
- Your opinion is the value — don't just summarize

**Editorial Newsletter:**
- One main essay (500-1,000 words)
- Strong opening hook
- Clear argument or insight
- End with a question or call to reply

**Hybrid Newsletter:**
- One short original piece (300-500 words)
- 3-5 curated links with commentary
- One recurring section (tool, quote, tip)

---

## Step 3: Write an Issue

### The Writing Process

1. **Choose the theme**: One core topic per issue. No scatter.
2. **Write the hook**: First 2 sentences determine if they read or archive. Make it personal, specific, or surprising.
3. **Deliver the value**: The thing they subscribed for. Don't bury it.
4. **Keep sections scannable**: Bold key phrases. Short paragraphs. Clear headers.
5. **Close with energy**: A question, a challenge, a forward-looking tease.

### Issue Output Format

```yaml
---
issue_number: 42
title: "Issue title"
subject: "Email subject line"
preview: "Preview text"
theme: "Core topic"
send_date: 2026-03-12
word_count: 850
status: draft
---
```

### Writing Rules

- **Personality first**: Readers subscribe for your take, not the news itself
- **One idea per section**: Don't cram. Each section has one job.
- **Scannable**: Someone skimming should get 60% of the value. Bold key points.
- **Consistent length**: Set an expectation and keep it. Plus or minus 20% variance max.
- **Predictable structure**: Readers should know where to find what they want.
- **End with a question**: The reply is the highest-engagement action. Invite it.

---

## Step 4: Frequency Recommendations

| Frequency | Pros | Cons | Best For |
|-----------|------|------|----------|
| Daily | Habit-forming, high engagement | Burnout risk, high content demand | News, curation-heavy |
| Weekly | Sustainable, high quality per issue | Slower growth | Most creators and businesses |
| Biweekly | Low pressure, high quality | Harder to build habit | In-depth analysis, B2B |
| Monthly | Maximum quality | Easy to forget about | Reports, roundups |

**Default recommendation**: Weekly. It's the sweet spot between staying top-of-mind and maintaining quality.

---

## Step 5: Growth Strategies

### Acquisition Channels

| Channel | Tactic | Expected Conversion |
|---------|--------|-------------------|
| Website | Homepage signup bar, exit intent popup, blog post CTAs | 1-3% of visitors |
| Social | Pin newsletter link in bio, share issue highlights | 0.5-2% of followers |
| Cross-promo | Newsletter swaps with similar-size newsletters | 50-200 subs per swap |
| Lead magnet | Free resource into newsletter opt-in | 20-40% of landing page visitors |
| Referral | Give subscribers a referral link + incentive | 10-20% of new subs |
| Content | SEO articles with newsletter CTA | Compounding over time |

### Referral Program

- **1 referral**: Bonus content (exclusive post, template, etc.)
- **3 referrals**: Free resource or community access
- **10 referrals**: Product discount or 1:1 consultation
- Keep it simple. Most won't refer — make the few who do feel appreciated.

### Growth Tactics That Work

1. **Share one section publicly** each issue on social — builds curiosity
2. **Welcome email** sets expectations and asks for a reply (deliverability boost)
3. **Consistent send time** — subscribers should know when to expect you
4. **Archive on your site** — SEO captures new subscribers from old issues
5. **"Forward to a friend" CTA** in every issue — include a subscribe link for the friend

---

## Step 6: Engagement Metrics

| Metric | Good | Great | Action If Low |
|--------|------|-------|---------------|
| Open rate | 30-40% | 40-50%+ | Better subjects, clean list, check deliverability |
| Click rate | 2-4% | 5-8%+ | Better CTAs, more relevant links, clearer value |
| Reply rate | 1-2% | 3-5%+ | Ask better questions, be more personal |
| Unsubscribe | <0.5% | <0.2% | Check frequency, relevance, expectations |
| Growth rate | 5-10%/mo | 10-20%/mo | Add acquisition channels, improve lead magnets |

---

## Output Structure

```
marketing/newsletter/
├── strategy.md                    # Newsletter definition and strategy
├── template.md                    # Repeatable issue template
├── growth-plan.md                 # Acquisition and referral strategy
└── issues/
    ├── 2026-03-12-issue-title.md  # Individual issues
    └── ...
```

**Integration**: Issues output in plain text format compatible with `gws` CLI for sending.

---

## Related Skills

- **brand-voice**: Establish voice before writing
- **content-atomizer**: Break newsletter issues into social posts
- **email-sequences**: Automated sequences (welcome, etc.) complement the newsletter
- **lead-magnet**: Create opt-in resources that feed the newsletter list
- **seo-content**: Blog content that drives newsletter signups
