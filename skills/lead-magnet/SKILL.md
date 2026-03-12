---
name: lead-magnet
description: |
  Create high-converting free resources that capture emails and build trust. Produces complete lead magnets (ebooks, checklists, templates, swipe files, toolkits) plus the landing page copy, thank-you page, and follow-up email sequence. Triggers on: lead magnet, freebie, opt-in, email capture, free download, checklist, template, swipe file, ebook, gated content.
category: content
tier: core
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/keyword-plan.md
writes:
  - marketing/lead-magnets/{name}/content.md
  - marketing/lead-magnets/{name}/landing-page.md
  - marketing/lead-magnets/{name}/thank-you.md
  - marketing/lead-magnets/{name}/follow-up-emails.md
depends-on:
  - brand-voice
  - audience-research
triggers:
  - lead magnet
  - freebie
  - opt-in
  - email capture
  - free download
  - checklist
  - template
  - swipe file
  - ebook
  - gated content
  - grow email list
allowed-tools: []
---

# Lead Magnet Creation

You create free resources so valuable that people gladly trade their email for them. Not thin PDFs that get deleted immediately — genuinely useful tools, templates, and guides that build trust and warm up buyers.

## On Activation

1. Read `brand/audience.md` — identify the sharpest pain point worth solving for free
2. Read `brand/voice-profile.md` — match tone across all deliverables
3. Read `brand/keyword-plan.md` — align lead magnet topic with SEO strategy
4. If brand files don't exist, ask: Who's the audience? What do you sell? What's their biggest frustration?

---

## The Lead Magnet Test

Before building anything, the concept must pass all four:

1. **Specific** — Solves ONE well-defined problem, not "everything you need to know about X"
2. **Quick win** — Delivers a result in under 15 minutes of consumption
3. **High perceived value** — Looks like something worth paying for
4. **Buyer-adjacent** — Attracts people who could become customers, not freebie seekers

If it fails any test, pick a different angle.

---

## Step 1: Identify the Pain Point

Map audience pain points to lead magnet opportunities:

| Pain Point Type | Best Format | Example |
|----------------|-------------|---------|
| "I don't know how" | Step-by-step guide | "The 7-Step SEO Audit Checklist" |
| "I don't have time" | Template / swipe file | "50 Email Subject Lines That Get Opens" |
| "I keep making mistakes" | Checklist | "Pre-Launch Checklist: 23 Things to Verify" |
| "I need a system" | Toolkit / framework | "The Content Calendar Template + SOPs" |
| "I need proof it works" | Case study / data | "How We Got 10K Users in 30 Days (Full Breakdown)" |
| "I can't decide" | Comparison / scorecard | "Framework Comparison: Which Stack Fits Your SaaS?" |

---

## Step 2: Choose Format

### Format Specs

| Format | Length | Production Time | Best For |
|--------|--------|----------------|----------|
| **Checklist** | 1-3 pages | Low | Process-oriented audiences, quick wins |
| **Template** | 1-5 pages | Low | Practitioners who need a starting point |
| **Swipe file** | 5-20 pages | Medium | Copy, design, or strategy examples |
| **Guide/Ebook** | 10-30 pages | High | Complex topics, establishing authority |
| **Toolkit** | 3-10 assets | High | Comprehensive solution bundles |
| **Mini-course** | 3-5 emails | Medium | Nurture-heavy funnels |

**Default to the shortest format that solves the problem.** A killer checklist beats a mediocre ebook every time.

---

## Step 3: Write the Content

### Content Structure (All Formats)

```markdown
---
title: "Lead Magnet Title"
format: checklist | template | guide | toolkit | swipe-file
audience: "Target segment"
pain_point: "Specific problem this solves"
quick_win: "What they'll achieve after consuming"
related_product: "What this naturally leads to buying"
date: 2026-03-12
---
```

### Writing Rules

- **Open with the outcome**: "After using this, you'll have [specific result]"
- **No filler**: Every sentence teaches, provides a template, or gives an example
- **Use numbered steps**: People want sequence, not theory
- **Include real examples**: Fill in templates with actual data so they see how it works
- **End with the bridge**: Natural transition to your paid product/service
- **Brand voice throughout**: Match `voice-profile.md` — this is their first impression

### Checklist Format

```markdown
## [Phase/Section Name]

- [ ] Action item with specific detail
  - Why: One sentence on why this matters
  - How: Specific instruction or tool recommendation
- [ ] Next action item
  ...
```

### Template Format

```markdown
## [Template Name]

**Instructions**: How to fill this out (2-3 sentences)

### Section 1: [Name]
[Template with placeholder text in brackets]

**Example** (filled in):
[Same template completed with real data]
```

---

## Step 4: Landing Page Copy

Write a complete landing page for the lead magnet:

### Structure

```markdown
# Headline: [Specific outcome] + [Format type]
## Subheadline: Who it's for + what changes after they use it

### The Problem (2-3 sentences)
[Agitate the pain point — make them feel it]

### What You'll Get (bullet list)
- Specific deliverable 1 — what it does for them
- Specific deliverable 2 — what it does for them
- Specific deliverable 3 — what it does for them

### Who This Is For
- Perfect for: [specific description]
- Not for: [who should skip this]

### Social Proof (if available)
"Quote from someone who used it" — Name, Title

### CTA
[Button: Get the Free {Format}]
[Subtext: No spam. Unsubscribe anytime.]
```

### Landing Page Rules

- One CTA only — get the email
- No navigation links — no escape routes
- Headline = outcome, not description ("Write Emails That Get Replies" not "Email Writing Guide")
- Bullet points sell specific deliverables, not vague promises
- Keep above the fold: headline, subheadline, 3 bullets, email field, button

---

## Step 5: Thank-You Page

The thank-you page is the highest-attention moment. Use it.

```markdown
# You're in! Check your email for [Lead Magnet Name].

## While you're here...

[One of these plays:]

**Option A — Tripwire**: Offer a low-cost product ($7-$27) at a discount
**Option B — Next step**: Invite to book a call, join a community, or start a trial
**Option C — Share**: Ask them to share with a colleague for bonus content

[Keep it to ONE ask. Don't overwhelm.]
```

---

## Step 6: Follow-Up Email Sequence

3-email sequence delivered over 5 days:

### Email 1: Delivery (Immediate)

```
Subject: Here's your [Lead Magnet Name]
Preview: Plus one tip to get the most out of it

Body:
- Deliver the asset (download link)
- One quick-start tip (the single most important thing to do first)
- Set expectation: "I'll send you [X] over the next few days"
- Sign off warm and personal
```

### Email 2: Value Add (Day 2-3)

```
Subject: The mistake most people make with [topic]
Preview: [Specific detail that creates curiosity]

Body:
- Share an insight related to the lead magnet topic
- Story or example that demonstrates the insight
- Bridge to your product/service naturally
- Soft CTA: "If you want help with this, [link]"
```

### Email 3: Bridge to Product (Day 4-5)

```
Subject: Quick question about [their goal]
Preview: [Question that implies you can help]

Body:
- Ask a question about their situation
- Share a brief case study or result
- Direct CTA to your product/service
- PS: Restate the value prop in one line
```

**Integration**: Output emails compatible with `gws` CLI for sending.

---

## Output Structure

```
marketing/lead-magnets/{name}/
├── content.md          # The actual lead magnet content
├── landing-page.md     # Landing page copy
├── thank-you.md        # Thank-you page copy
└── follow-up-emails.md # 3-email delivery + nurture sequence
```

---

## Lead Magnet Ideas by Business Type

| Business | High-Converting Formats |
|----------|------------------------|
| SaaS | Free tool, ROI calculator, comparison template |
| Agency | Audit checklist, swipe file, case study |
| Course/Info | Mini-course, chapter 1, cheat sheet |
| E-commerce | Buying guide, discount code, style quiz |
| B2B | Industry report, benchmark data, decision matrix |

---

## Related Skills

- **audience-research**: Identify pain points before choosing a lead magnet topic
- **brand-voice**: Establish voice before writing
- **email-sequences**: Build longer nurture sequences after the initial follow-up
- **direct-response-copy**: Write the landing page with conversion copy principles
- **content-atomizer**: Promote the lead magnet across social channels
