---
name: email-sequences
description: |
  Build automated email flows that nurture, convert, and retain. Creates complete sequences for welcome, nurture, launch, re-engagement, and onboarding flows with subject lines, preview text, body copy, CTAs, timing, and personalization. Triggers on: email sequence, welcome series, nurture flow, launch emails, drip campaign, onboarding emails, re-engagement, email automation, win-back emails.
category: email
tier: core
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/positioning.md
writes:
  - marketing/emails/{sequence-name}/
depends-on:
  - brand-voice
  - audience-research
triggers:
  - email sequence
  - welcome series
  - nurture flow
  - launch emails
  - drip campaign
  - onboarding emails
  - re-engagement
  - email automation
  - win-back
  - email funnel
allowed-tools: []
---

# Email Sequences

You build automated email flows that move people from stranger to customer. Each email earns the right to send the next one by delivering genuine value. No "just checking in" — every email has a job.

## On Activation

1. Read `brand/voice-profile.md` — emails are the most intimate channel, voice matters most here
2. Read `brand/audience.md` — understand awareness level, sophistication, pain points
3. Read `brand/positioning.md` — know the product angle and differentiation
4. If brand files don't exist, ask: What do you sell? Who's receiving these? What action do you want them to take?
5. Check `marketing/emails/` for existing sequences — avoid overlap

---

## Sequence Types

| Type | Trigger | Goal | Length | Timing |
|------|---------|------|--------|--------|
| **Welcome** | New subscriber | Build trust, set expectations, deliver first value | 5-7 emails | Days 0, 1, 3, 5, 7, 10, 14 |
| **Nurture** | Post-welcome or lead magnet | Educate, build authority, warm up for offer | 5-10 emails | Every 2-3 days |
| **Launch** | Product launch or promotion | Create urgency, overcome objections, convert | 6-8 emails | Days -3, -1, 0, 0+6hr, 1, 3, 5, 7 |
| **Onboarding** | New customer/user | Activate, reduce churn, drive first success | 5-7 emails | Days 0, 1, 3, 5, 7, 14, 30 |
| **Re-engagement** | Inactive subscriber | Win back or clean list | 3-4 emails | Days 0, 3, 7, 14 |

---

## Email Anatomy

Every email has these components:

```yaml
---
sequence: welcome
position: 1
subject: "Your subject line here"
preview: "Preview text that complements (not repeats) the subject"
from_name: "First Name from Company"
send_delay: "0 days"  # relative to trigger
segment: all | engaged | inactive
personalization_tokens: ["first_name", "company"]
ab_test: null | { variant_b_subject: "Alternative subject" }
---
```

### Subject Lines

**The subject line gets the open. Nothing else matters if this fails.**

**Formulas that work:**

| Formula | Example | When to Use |
|---------|---------|-------------|
| Direct benefit | "Your 5-step content calendar" | Delivering promised value |
| Curiosity gap | "The email mistake I made for 3 years" | Nurture sequences |
| Personal question | "Quick question about your launch" | Re-engagement, sales |
| How-to | "How to write emails people actually read" | Educational content |
| Number + result | "3 tweaks that doubled our open rate" | Data-driven audiences |
| Story tease | "The worst marketing advice I ever got" | Storytelling brands |

**Rules:**
- 30-50 characters (6-10 words) — shorter is almost always better
- No ALL CAPS, no excessive punctuation, no emoji unless brand uses them
- Preview text adds context, never repeats the subject
- Personalization in subject only if natural ("{{first_name}}, quick question")

### Body Copy

**Structure every email the same way the reader processes it:**

1. **Hook** (first line) — Reason to keep reading. Personal, specific, unexpected.
2. **Context** (2-3 sentences) — Set up the value. Story, observation, or problem statement.
3. **Value** (core content) — The insight, tip, framework, or story. This is why they opened.
4. **Bridge** (1 sentence) — Connect the value to your CTA.
5. **CTA** (1 clear action) — One link, one ask. Button or text link.
6. **PS** (optional) — Second hook, social proof, or alternative CTA. Most-read line after the subject.

**Rules:**
- One CTA per email. One.
- Write at a 5th-grade reading level. Short sentences. Short paragraphs.
- 150-300 words for nurture. 300-500 for launch. Under 150 for re-engagement.
- Plain text outperforms HTML for most B2B. Light formatting for B2C.
- "Reply to this email" is the highest-trust CTA you can use early in a sequence.

---

## Sequence Blueprints

### Welcome Sequence (5-7 emails)

```
Email 1 (Day 0): DELIVER
- Subject: "Here's your [lead magnet / what they signed up for]"
- Body: Deliver the thing. One quick-start tip. Set expectations for what's coming.
- CTA: Download / access the resource

Email 2 (Day 1): STORY
- Subject: "Why I built [product/brand]"
- Body: Origin story. The problem you experienced. Why you care.
- CTA: Reply and tell me about your situation

Email 3 (Day 3): VALUE
- Subject: "The #1 mistake with [topic]"
- Body: Teach something genuinely useful. Quick win they can implement today.
- CTA: Try this technique / read more

Email 4 (Day 5): PROOF
- Subject: "How [customer] achieved [result]"
- Body: Case study or testimonial. Specific numbers. Before/after.
- CTA: See how it works / start your trial

Email 5 (Day 7): OFFER
- Subject: "[Product] might be right for you"
- Body: Direct pitch. What it does, who it's for, why now. Objection handling.
- CTA: Start trial / buy / book a call

Email 6 (Day 10): OBJECTION
- Subject: "The honest answer to [common concern]"
- Body: Address the #1 reason people don't buy. Be transparent.
- CTA: FAQ page or direct response

Email 7 (Day 14): LAST CHANCE
- Subject: "One more thing about [topic]"
- Body: Final value piece + last pitch. Soft close.
- CTA: Product link with a reason to act now
```

### Launch Sequence (6-8 emails)

```
Email 1 (Day -3): SEED
- Tease something coming. Build anticipation. No details yet.

Email 2 (Day -1): STORY
- The problem this product solves. Your journey building it.

Email 3 (Day 0, AM): ANNOUNCE
- It's live. What it is, what it does, who it's for. Early bird / launch price.

Email 4 (Day 0, PM): FAQ
- Answer the top 5 questions you've received. Overcome objections.

Email 5 (Day 1): PROOF
- First customer results, testimonials, social proof from launch day.

Email 6 (Day 3): DEEP DIVE
- Detailed walkthrough of one feature/benefit. Show, don't tell.

Email 7 (Day 5): OBJECTIONS
- Address remaining concerns directly. "Is this for me?" content.

Email 8 (Day 7): CLOSE
- Last chance. Deadline is real. Recap the offer. Final CTA.
```

### Re-engagement Sequence (3-4 emails)

```
Email 1 (Day 0): CHECK-IN
- Subject: "Still interested in [topic]?"
- Body: Acknowledge the silence. Offer your best piece of content.

Email 2 (Day 3): VALUE BOMB
- Subject: "[Best content title] — thought you'd want this"
- Body: Your single best-performing piece of content. No ask.

Email 3 (Day 7): PREFERENCE
- Subject: "Want fewer emails? (Or none?)"
- Body: Let them choose frequency or topics. Give them control.

Email 4 (Day 14): BREAKUP
- Subject: "Cleaning up my list"
- Body: "If I don't hear from you, I'll remove you. No hard feelings."
- CTA: "Keep me subscribed" button
```

---

## Open Rate Optimization

| Factor | Best Practice |
|--------|--------------|
| Send time | Tue-Thu, 9-11am recipient's timezone |
| From name | Personal name > company name (test "Name from Company") |
| Subject length | 6-10 words, front-load the value |
| Preview text | Always set — complements, never repeats the subject |
| List hygiene | Remove 90-day inactive quarterly |
| Segmentation | Segment by engagement, not just demographics |

## A/B Testing Suggestions

For each sequence, suggest tests:

1. **Subject lines** (HIGH) — Test 2 variants per email, winner sends to remaining 80%
2. **Send time** (MEDIUM) — Morning vs afternoon, weekday vs weekend
3. **From name** (MEDIUM) — Personal vs brand vs "Name from Brand"
4. **CTA format** (LOW) — Button vs text link vs "reply to this email"
5. **Email length** (LOW) — Short (150 words) vs long (400 words)

---

## Output Structure

```
marketing/emails/{sequence-name}/
├── sequence-plan.md        # Overview: type, trigger, goal, timing map
├── email-01-deliver.md     # Individual email with frontmatter
├── email-02-story.md
├── email-03-value.md
├── ...
└── ab-test-plan.md         # Suggested A/B tests for the sequence
```

**Integration**: All emails output in plain text format compatible with `gws` CLI for sending. Include `gws` command examples in `sequence-plan.md`.

---

## Deliverability Rules

- Never use: free, act now, limited time, congratulations, click here, buy now (in subject)
- Warm up new sending domains: 50 emails day 1, double every 2-3 days
- Include unsubscribe in every email (legally required)
- Text-to-image ratio: 80/20 minimum
- Authenticate: SPF, DKIM, DMARC all configured

---

## Related Skills

- **lead-magnet**: Creates the opt-in that triggers the welcome sequence
- **brand-voice**: Voice consistency across all emails
- **newsletter**: Ongoing email content (not automated sequences)
- **direct-response-copy**: Copy principles for high-converting emails
- **launch-strategy**: Launch sequence aligns with broader launch plan
