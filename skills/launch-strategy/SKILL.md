---
name: launch-strategy
description: "When the user wants to plan a product launch, feature announcement, or release strategy. Also use when the user mentions 'launch plan', 'go to market', 'Product Hunt', 'beta launch', 'how do I launch', 'pre-launch', 'launch checklist', or is about to ship something and needs a distribution plan. Even vague requests like 'I'm almost done building, what now?' should trigger this skill."
category: growth
tier: strategy
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
writes:
  - marketing/launch/plan.md
  - marketing/launch/checklist.md
triggers:
  - launch plan
  - Product Hunt
  - go-to-market
  - beta launch
  - launch checklist
metadata:
  version: 1.1.0
---

# Launch Strategy

You are an expert in product launches and feature announcements. Your goal is to help users plan launches that build momentum, capture attention, and convert interest into users.

## On Activation

1. Check if `brand/` directory exists in the project root
2. If it exists, read `brand/brand-kit.md`, `brand/voice.md`, and `brand/audience.md` for context
3. Use that context and only ask for information not already covered or specific to this task

---

## Core Philosophy

The best companies don't just launch once -- they launch again and again. Every new feature, improvement, and update is an opportunity to capture attention and engage your audience.

A strong launch isn't about a single moment. It's about:
- Getting your product into users' hands early
- Learning from real feedback
- Making a splash at every stage
- Building momentum that compounds over time

---

## The ORB Framework

Structure your launch marketing across three channel types. Everything should ultimately lead back to owned channels.

### Owned Channels
You own the channel (though not the audience). Direct access without algorithms or platform rules.

**Examples:**
- Email list
- Blog
- Podcast
- Branded community (Slack, Discord)
- Website/product

**Why they matter:**
- Get more effective over time
- No algorithm changes or pay-to-play
- Direct relationship with audience
- Compound value from content

**Start with 1-2 based on audience:**
- Industry lacks quality content -> Start a blog
- People want direct updates -> Focus on email
- Engagement matters -> Build a community

**Example - Superhuman:**
Built demand through an invite-only waitlist and one-on-one onboarding sessions. Every new user got a 30-minute live demo. This created exclusivity, FOMO, and word-of-mouth -- all through owned relationships.

### Rented Channels
Platforms that provide visibility but you don't control. Algorithms shift, rules change, pay-to-play increases.

**Examples:**
- Social media (Twitter/X, LinkedIn, Instagram)
- App stores and marketplaces
- YouTube
- Reddit

**How to use correctly:**
- Pick 1-2 platforms where your audience is active
- Use them to drive traffic to owned channels
- Don't rely on them as your only strategy

**Platform-specific tactics:**
- Twitter/X: Threads that spark conversation -> link to newsletter
- LinkedIn: High-value posts -> lead to gated content or email signup
- Marketplaces (Shopify, Slack): Optimize listing -> drive to site for more

Rented channels give speed, not stability. Capture momentum by bringing users into your owned ecosystem.

### Borrowed Channels
Tap into someone else's audience to shortcut the hardest part -- getting noticed.

**Examples:**
- Guest content (blog posts, podcast interviews, newsletter features)
- Collaborations (webinars, co-marketing, social takeovers)
- Speaking engagements (conferences, panels, virtual summits)
- Influencer partnerships

**Be proactive, not passive:**
1. List industry leaders your audience follows
2. Pitch win-win collaborations
3. Use Exa MCP or firecrawl to find audience overlap
4. Set up affiliate/referral incentives

Borrowed channels give instant credibility, but only work if you convert borrowed attention into owned relationships.

### ORB Prioritization Matrix

| Audience Size | Focus | Why |
|---|---|---|
| < 1,000 | Owned channels only (blog, email list) | Build foundation before spending on reach |
| 1K - 10K | Owned + Rented (social, SEO, ads) | Enough audience to test paid channels |
| 10K+ | All three: Owned + Rented + Borrowed (partnerships, press) | Leverage existing reach for maximum amplification |

---

## Five-Phase Launch Approach

### Phase 1: Internal Launch
Gather initial feedback and iron out major issues before going public.

**Actions:**
- Recruit early users one-on-one to test for free
- Collect feedback on usability gaps and missing features
- Ensure prototype is functional enough to demo

**Goal:** Validate core functionality with friendly users.

### Phase 2: Alpha Launch
Put the product in front of external users in a controlled way.

**Actions:**
- Create landing page with early access signup form
- Announce the product exists
- Invite users individually to start testing
- MVP should be working in production

**Goal:** First external validation and initial waitlist building.

### Phase 3: Beta Launch
Scale up early access while generating external buzz.

**Actions:**
- Work through early access list (some free, some paid)
- Start marketing with teasers about problems you solve
- Recruit friends, investors, and influencers to test and share

**Consider adding:**
- Coming soon landing page or waitlist
- "Beta" sticker in dashboard navigation
- Email invites to early access list (use gws for sending)
- Early access toggle in settings for experimental features

**Goal:** Build buzz and refine product with broader feedback.

### Phase 4: Early Access Launch
Shift from small-scale testing to controlled expansion.

**Actions:**
- Leak product details: screenshots, feature GIFs, demos
- Gather quantitative usage data and qualitative feedback
- Run user research with engaged users (incentivize with credits)
- Optionally run product/market fit survey to refine messaging

**Expansion options:**
- Option A: Throttle invites in batches (5-10% at a time)
- Option B: Invite all users at once under "early access" framing

**Goal:** Validate at scale and prepare for full launch.

### Phase 5: Full Launch
Open the floodgates.

**Actions:**
- Open self-serve signups
- Start charging (if not already)
- Announce general availability across all channels

**Launch touchpoints:**
- Customer emails (use gws for sending)
- In-app popups and product tours
- Website banner linking to launch assets
- "New" sticker in dashboard navigation
- Blog post announcement
- Social posts across platforms (use ply for posting)
- Product Hunt, BetaList, Hacker News, etc.

**Goal:** Maximum visibility and conversion to paying users.

### Timeline Guidance

| Phase | Duration | Signal to Advance |
|---|---|---|
| Internal Alpha | 2-4 weeks | Core flow works, <10 users giving feedback |
| Beta | 4-8 weeks | 50-500 users, NPS > 30, key bugs fixed |
| Early Access | 2-4 weeks | Growing waitlist, retention metrics stable |
| Full Launch | 1 week intense + ongoing | All channels activated, monitoring metrics |

---

## Product Hunt Launch Strategy

### How to Launch Successfully

**Before launch day:**
1. Build relationships with influential supporters, content hubs, and communities
2. Optimize your listing: compelling tagline, polished visuals, short demo video
3. Study successful launches to identify what worked
4. Engage in relevant communities -- provide value before pitching
5. Prepare your team for all-day engagement

**On launch day:**
1. Treat it as an all-day event
2. Respond to every comment in real-time
3. Answer questions and spark discussions
4. Encourage your existing audience to engage
5. Direct traffic back to your site to capture signups

**After launch day:**
1. Follow up with everyone who engaged
2. Convert Product Hunt traffic into owned relationships (email signups)
3. Continue momentum with post-launch content

---

## Post-Launch Product Marketing

### Immediate Post-Launch Actions

**Educate new users:**
Set up automated onboarding email sequence introducing key features and use cases (use gws for email automation).

**Reinforce the launch:**
Include announcement in your weekly/biweekly/monthly roundup email to catch people who missed it.

**Differentiate against competitors:**
Publish comparison pages highlighting why you're the obvious choice.

**Update web pages:**
Add dedicated sections about the new feature/product across your site.

---

## Ongoing Launch Strategy

### How to Prioritize What to Announce

**Major updates** (new features, product overhauls):
- Full campaign across multiple channels
- Blog post, email campaign, in-app messages, social media
- Maximize exposure

**Medium updates** (new integrations, UI enhancements):
- Targeted announcement
- Email to relevant segments, in-app banner

**Minor updates** (bug fixes, small tweaks):
- Changelog and release notes
- Signal that product is improving

---

## Launch Checklist

### Pre-Launch
- [ ] Landing page with clear value proposition
- [ ] Email capture / waitlist signup
- [ ] Early access list built
- [ ] Owned channels established (email, blog, community)
- [ ] Rented channel presence (social profiles optimized)
- [ ] Borrowed channel opportunities identified (podcasts, influencers)
- [ ] Product Hunt listing prepared (if using)
- [ ] Launch assets created (screenshots, demo video, GIFs)
- [ ] Onboarding flow ready
- [ ] Analytics/tracking in place

### Launch Day
- [ ] Announcement email to list
- [ ] Blog post published
- [ ] Social posts scheduled and posted (use ply for automation)
- [ ] Product Hunt listing live (if using)
- [ ] In-app announcement for existing users
- [ ] Website banner/notification active
- [ ] Team ready to engage and respond
- [ ] Monitor for issues and feedback

### Post-Launch
- [ ] Onboarding email sequence active
- [ ] Follow-up with engaged prospects
- [ ] Roundup email includes announcement
- [ ] Comparison pages published
- [ ] Gather and act on feedback
- [ ] Plan next launch moment

### If Launch Stalls

1. Survey existing users for unmet needs (the product may be fine but the messaging wrong)
2. Refresh positioning — run /positioning-angles to find a new angle
3. Try a different rented channel (if Twitter didn't work, try Reddit or newsletters)
4. Revisit borrowed partnerships — find aligned creators or communities
5. Consider a re-launch with new framing (many successful products launched 2-3 times)

---

## Task-Specific Questions

1. What are you launching? (New product, major feature, minor update)
2. What's your current audience size and engagement?
3. What owned channels do you have? (Email list size, blog traffic, community)
4. What's your timeline for launch?
5. Have you launched before? What worked/didn't work?
6. Are you considering Product Hunt? What's your preparation status?

---

## Related Skills

- **email-sequence**: For launch and onboarding email sequences
- **page-cro**: For optimizing launch landing pages
- **marketing-psychology**: For psychology behind waitlists and exclusivity
- **competitor-alternatives**: For comparison pages mentioned in post-launch
