---
name: referral-program
description: |
  Designs viral referral programs with incentive structures, sharing mechanics, and tracking. Covers one-sided, two-sided, and tiered models. Includes viral coefficient calculation, incentive psychology, referral copy, and launch strategy for maximum adoption.
allowed-tools: []
---

# Referral Program Design

## Purpose

Design a referral program that turns existing users into an acquisition channel. Define the incentive model, sharing mechanics, copy, and launch plan. Focus on programs that actually get used — not "refer a friend" links that collect dust.

## Reads

- `brand/audience.md` — Personas, what they value, their networks
- `brand/positioning.md` — Value props, pricing context for incentive sizing

## Workflow

### Step 1: Choose Referral Model

Evaluate and recommend the right model:

**One-Sided (Referrer only gets reward)**
- Best for: High-value products, enterprise, low-frequency purchases
- Pros: Simple, lower cost per referral
- Cons: Less motivation for referee to convert
- Example: "Give your friend our link, you get $50 credit"

**Two-Sided (Both get reward)**
- Best for: SaaS, marketplaces, subscription products
- Pros: Higher conversion (referee has incentive), feels fair
- Cons: Higher cost per referral
- Example: "Give $20, get $20"

**Tiered (Rewards increase with referral count)**
- Best for: Products with power users, community-driven products
- Pros: Creates referral champions, gamification
- Cons: Complex to communicate, top-heavy rewards
- Example: "1 referral = 1 month free. 5 = premium forever."

**Milestone (Unlock rewards at specific counts)**
- Best for: Products wanting viral moments
- Pros: Creates sharing bursts, clear goals
- Cons: Can feel like a grind
- Example: "3 friends = swag. 10 friends = lifetime access."

Selection criteria:
- Product price point and margins
- Customer lifetime value (can you afford the incentive?)
- Network effects (does the product get better with more users?)
- Purchase frequency (one-time vs recurring)

### Step 2: Define the Incentive

#### Incentive Types

| Type | Best When | Example |
|------|-----------|---------|
| Account credit | Recurring subscription | "$20 off next month" |
| Extended trial | Freemium model | "+7 days of Pro" |
| Feature unlock | Gated features exist | "Unlock advanced analytics" |
| Cash/gift card | High LTV, B2B | "$50 Amazon card" |
| Discount | E-commerce, one-time | "25% off next purchase" |
| Donation | Mission-driven brand | "$10 to charity of choice" |
| Exclusive access | Waitlist/beta | "Skip the waitlist" |
| Physical swag | Community brand | "Free branded merch" |

#### Incentive Sizing Rules

- Referrer reward should be 10-25% of first-year LTV
- Referee reward should lower the barrier to first purchase
- Two-sided: referee reward can be smaller than referrer reward
- Always test: the "right" incentive is discovered, not guessed
- Stack with existing promotions cautiously — don't train discount hunters

### Step 3: Design Sharing Mechanics

#### Sharing Methods (Offer All, Optimize for Top 2)

**Unique referral link** (required, baseline)
- Personal URL: `product.com/ref/[username]` or `product.com/r/[code]`
- One-click copy button
- Auto-populated share text

**Referral code** (supplement to link)
- Short, memorable: 4-6 characters
- Personalizable: user's name or custom code
- Easy to share verbally

**Email invite** (high-intent channel)
- Import contacts option (Google, Outlook)
- Or manual email entry
- Pre-written message, editable by user

**Social sharing** (volume channel)
- Twitter/X: Pre-populated tweet with link
- LinkedIn: Professional framing for B2B
- WhatsApp/SMS: Direct message with link
- Platform-native share sheet on mobile

**In-product prompts** (highest conversion trigger)
- Post-success moment: "You just [achievement]! Share with a friend?"
- Milestone celebration: "You've been using [Product] for 30 days!"
- Team detection: "Looks like [colleague] could use this too"

#### Friction Reduction Checklist

- [ ] One-click sharing (no extra steps)
- [ ] Pre-written share text (editable)
- [ ] Referral link visible in dashboard at all times
- [ ] Mobile-optimized sharing flow
- [ ] No login required for referee to see the offer
- [ ] Referee landing page explains the incentive immediately

### Step 4: Write Referral Copy

#### Referrer-Facing Copy

**Dashboard prompt:**
```
Give [incentive], Get [incentive]

Share [Product] with friends and you both get rewarded.
You've earned [X] so far from [Y] referrals.

[Copy Your Link]  [Invite by Email]
```

**Post-achievement trigger:**
```
Nice — you just [achievement]!

Know someone who'd love this too?
Share your link and you both get [incentive].

[Share Now]  [Maybe Later]
```

**Email nudge:**
```
Subject: You have $[X] in referral rewards waiting

You've been using [Product] for [X] weeks and
[specific achievement]. Know someone who'd benefit?

Share your personal link and you both get [incentive]:
[referral link]

[Share via Email]  [Copy Link]
```

#### Referee-Facing Copy

**Referral landing page:**
```
[Referrer name] invited you to [Product]

[Referrer] thinks you'd love [Product] — and they're
giving you [incentive] to try it.

[What Product Does — one sentence]

[Claim Your [Incentive]]

[Social proof: X users, rating, testimonial]
```

**Referee welcome email:**
```
Subject: [Referrer] gifted you [incentive] for [Product]

Welcome! [Referrer name] shared [Product] with you
and you've got [incentive] waiting.

Here's how to get started:
1. [Quick start step]
2. [Quick start step]
3. [Quick start step]

[Get Started with [Incentive]]
```

### Step 5: Plan Launch Strategy

#### Pre-Launch (1 week before)

- Seed with top 10% most active users first
- Personal email from founder: "You're getting early access to our referral program"
- Goal: Get first 50 referrals to validate mechanics

#### Launch (Week 1)

- In-app announcement banner for all users
- Email blast to full user base
- Social media announcement
- Add referral link to user dashboard permanently

#### Sustained Growth (Ongoing)

- Trigger-based prompts (post-achievement, milestone, NPS 9-10)
- Monthly referral leaderboard (optional, for tiered/milestone)
- Seasonal boost: "Double rewards this month"
- New user onboarding: mention referral program during setup

## Viral Coefficient Calculation

```
Viral Coefficient (K) = i x c

i = invitations sent per user
c = conversion rate of invitations

K > 1 = viral growth (each user brings >1 new user)
K = 0.5 = healthy referral supplement
K < 0.2 = program needs work

Example:
- Average user sends 5 invites
- 15% of invites convert
- K = 5 x 0.15 = 0.75 (strong, not viral)

To improve K:
- Increase i: More sharing triggers, easier sharing mechanics
- Increase c: Better referee landing page, stronger incentive
```

## Referral Program Metrics

| Metric | Formula | Healthy Range |
|--------|---------|---------------|
| Participation rate | Users who shared / Total users | 10-25% |
| Shares per user | Total shares / Participating users | 3-8 |
| Invite conversion rate | Signups / Total shares | 10-25% |
| Referral revenue % | Referred revenue / Total revenue | 15-35% |
| Time to first referral | Avg days from signup to first share | <30 days |
| Viral coefficient | Invites x Conversion rate | >0.3 |
| Referral CAC | Program cost / Referred customers | <Paid CAC |

## Anti-Patterns to Avoid

- Referral link buried in settings (must be prominent in dashboard)
- Requiring both parties to be paid users before reward triggers
- Complex reward rules nobody understands
- Rewards that expire too quickly (<30 days)
- No tracking dashboard for referrers to see their progress
- Generic share text that sounds corporate
- Making the referee create an account before seeing the product

## Output

Each referral program design produces:
- Recommended model with justification
- Incentive structure (type, size, trigger conditions)
- Sharing mechanics spec (channels, copy, UX flow)
- Referrer and referee copy for all touchpoints
- Launch plan (pre-launch, launch, sustained)
- Metrics dashboard spec
- Viral coefficient projection
