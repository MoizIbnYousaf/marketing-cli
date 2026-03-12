---
name: conversion-flow-cro
description: >
  Optimize the full conversion funnel -- signup, activation/onboarding, and
  upgrade/paywall. Use when users drop off during registration, fail to
  activate after signing up, or don't convert from free to paid. Three phases
  covered: Signup Flow (reduce form friction, increase completions),
  Activation & Onboarding (drive users to their aha moment fast), and
  Upgrade & Paywall (convert free users at the right moment). Triggers on:
  signup flow, onboarding, paywall, upgrade flow, conversion funnel,
  activation, registration friction, people aren't signing up, users sign up
  but don't stick, free users won't upgrade, trial conversion, reduce signup
  dropoff, first-run experience, feature gate, upsell, time to value.
  Reads: voice-profile.md, audience.md. Writes: nothing (advisory skill).
category: conversion
tier: nice-to-have
reads:
  - voice-profile.md
  - audience.md
writes: []
triggers:
  - signup flow
  - onboarding
  - paywall
  - upgrade flow
  - conversion funnel
  - activation
  - registration friction
  - signup dropoff
  - trial conversion
  - feature gate
  - upsell
  - free to paid
  - first-run experience
  - time to value
  - users aren't activating
  - people aren't signing up
  - nobody completes registration
---

# /conversion-flow-cro -- Full-Funnel Conversion Optimization

Users move through a journey: **Signup -> Activation -> Upgrade**. A leak at
any stage kills downstream numbers. This skill covers all three stages so you
can audit and fix the entire funnel or zoom into one phase.

Pick your phase or run the full audit:

| Phase | Focus | Key Metric |
|-------|-------|------------|
| Signup | Reduce friction, increase completions | Form completion rate |
| Activation | Drive to aha moment fast | Activation rate, time-to-value |
| Upgrade | Convert at the right moment | Free-to-paid conversion rate |

---

## On Activation

On every invocation, check for existing brand context.

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/voice-profile.md | Brand tone, personality | Aligns all CTA copy, microcopy, and error messages to brand voice |
| ./brand/audience.md | Buyer personas, pain points | Determines which friction points matter most, what trust signals to use, what the aha moment likely is |

### How to use brand context

1. **If both files exist** -- Use voice for all copy recommendations, use audience to prioritize which funnel stages and friction points to address first.
2. **If only audience exists** -- Prioritize fixes based on persona. Use neutral professional tone for copy.
3. **If only voice exists** -- Apply voice to all copy. Use general best practices for prioritization.
4. **If neither exists** -- Skill works fine standalone. Use the frameworks below with general best practices.

---

## Phase 1: Signup Flow Optimization

Goal: Get users from "interested" to "account created" with minimum friction.

### Core Principles

1. **Minimize required fields** -- Every field reduces conversion. For each one ask: do we need this before they can use the product? Can we collect it later?
2. **Show value before asking for commitment** -- Can they experience the product before creating an account?
3. **Reduce perceived effort** -- Progress indicators, smart defaults, pre-fill when possible.
4. **Remove uncertainty** -- Clear expectations ("Takes 30 seconds"), show what happens after signup.

### Field Priority Framework

| Priority | Fields | Rationale |
|----------|--------|-----------|
| Essential | Email (or phone), Password | Minimum for account creation |
| Often needed | Name | Personalization |
| Usually deferrable | Company, Role, Team size, Phone, Address | Collect via progressive profiling |

### Field-by-Field Optimization

- **Email**: Single field, inline validation, typo detection (gmial.com -> gmail.com), clear errors
- **Password**: Show/hide toggle, requirements shown upfront (not after failure), allow paste, strength meter over rigid rules, consider passwordless
- **Name**: Single "Full name" vs First/Last (test it). Only require if immediately used
- **Social auth**: Place prominently. B2C: Google, Apple. B2B: Google, Microsoft, SSO. Often higher conversion than email forms
- **Phone**: Defer unless essential. If required, explain why. Proper input type with country code

### Single-Step vs Multi-Step

**Single-step** works when: 3 or fewer fields, simple products, high-intent visitors.

**Multi-step** works when: 4+ fields needed, products needing segmentation.

**Multi-step best practices:**
- Show progress indicator
- Lead with easy questions (name, email)
- Harder questions later (after psychological commitment)
- Each step completable in seconds
- Allow back navigation, save progress

**Progressive commitment pattern:**
1. Email only (lowest barrier)
2. Password + name
3. Customization questions (optional)

### Trust and Friction Reduction

**At the form level:**
- "No credit card required" (if true)
- Privacy note: "We'll never share your email"
- Testimonial near signup form
- Security badges if relevant

**Error handling:**
- Inline validation (not just on submit)
- Specific messages ("Email already registered" + recovery path)
- Don't clear form on error
- Focus on the problem field

**Microcopy rules:**
- Placeholder text for examples, not labels
- Labels must stay visible (not just placeholders -- they disappear on focus)
- Help text only when needed, close to field

### Mobile Signup

- 44px+ touch targets
- Appropriate keyboard types (email, tel)
- Autofill support
- Single column layout
- Sticky CTA button

### Post-Submit

- Clear confirmation with immediate next step
- If email verification required: explain what to do, easy resend, check spam reminder, option to change email
- Consider delaying verification until necessary
- Let users explore while awaiting verification

### Signup Metrics

| Metric | What it tells you |
|--------|-------------------|
| Form start rate | Are people even trying? |
| Form completion rate | Where's the friction? |
| Field-level drop-off | Which field kills it? |
| Time to complete | Is it too long? |
| Error rate by field | What's confusing? |
| Mobile vs desktop completion | Device-specific issues? |

---

## Phase 2: Activation and Onboarding

Goal: Get users from "account created" to "experienced core value" as fast as possible.

### Core Principles

1. **Time-to-value is everything** -- Remove every step between signup and core value.
2. **One goal per session** -- Focus first session on one successful outcome. Advanced features come later.
3. **Do, don't show** -- Interactive beats tutorial. Doing the thing beats learning about the thing.
4. **Progress creates motivation** -- Show advancement, celebrate completions, make the path visible.

### Define Your Activation Event

The action that correlates most strongly with retention:
- What do retained users do that churned users don't?
- What's the earliest indicator of future engagement?

**Examples by product type:**
- Project management: Create first project + add collaborator
- Analytics: Install tracking + see first report
- Design tool: Create first design + export/share
- Marketplace: Complete first transaction
- Content app: Publish or share first piece

### Immediate Post-Signup (First 30 Seconds)

| Approach | Best For | Risk |
|----------|----------|------|
| Product-first | Simple products, mobile apps | Blank slate overwhelm |
| Guided setup | Products needing personalization | Adds friction before value |
| Value-first | Products with demo/sample data | May not feel "real" |

**Whatever you choose:** Clear single next action. No dead ends. Progress indication if multi-step.

### Onboarding Checklist Pattern

**When to use:** Multiple setup steps, several features to discover, self-serve products.

**Best practices:**
- 3-7 items (not overwhelming)
- Order by value (most impactful first)
- Start with quick wins
- Progress bar / completion percentage
- Celebration on completion
- Dismiss option (don't trap users)

### Empty States

Empty states are onboarding opportunities, not dead ends.

**Good empty state:**
- Explains what this area is for
- Shows what it looks like with data (preview/illustration)
- Clear primary action to add first item
- Optional: Pre-populate with example data

### Tooltips and Guided Tours

- Max 3-5 steps per tour
- Dismissable at any time
- Don't repeat for returning users
- Use for complex UI or features that aren't self-evident

### Multi-Channel Onboarding

**Trigger-based emails coordinated with in-app:**
- Welcome email (immediate)
- Incomplete onboarding (24h, 72h)
- Activation achieved (celebration + next step)
- Feature discovery (days 3, 7, 14)

**Email should:** Reinforce in-app actions (not duplicate), drive back to product with specific CTA, personalize based on actions taken.

### Handling Stalled Users

**Detection:** Define "stalled" (X days inactive, incomplete setup).

**Re-engagement tactics:**
1. Email sequence -- Reminder of value, address blockers, offer help
2. In-app recovery -- Welcome back, pick up where left off
3. Personal outreach -- For high-value accounts

### Activation Metrics

| Metric | What it tells you |
|--------|-------------------|
| Activation rate | % reaching activation event |
| Time to activation | How long to first value |
| Onboarding completion | % completing setup |
| Day 1/7/30 retention | Return rate by timeframe |
| Step-level drop-off | Which step loses people |

---

## Phase 3: Upgrade and Paywall

Goal: Convert free or trial users to paid at the moment they've experienced enough value.

### Core Principles

1. **Value before ask** -- User must have experienced real value first. Upgrade should feel like natural next step. Timing: after aha moment, not before.
2. **Show, don't just tell** -- Demonstrate paid feature value, preview what they're missing, make upgrade tangible.
3. **Friction-free path** -- Easy to upgrade when ready. Don't make them hunt for pricing.
4. **Respect the no** -- Don't trap or pressure. Easy to continue free. Maintain trust for future conversion.

### Paywall Trigger Points

**Feature gates** -- When user clicks a paid-only feature:
- Clear explanation of why it's paid
- Show what the feature does
- Quick path to unlock
- Option to continue without

**Usage limits** -- When user hits a limit:
- Clear indication of limit reached
- Show what upgrading provides
- Don't block abruptly (grace period or soft limit)

**Trial expiration** -- When trial is ending:
- Early warnings (7, 3, 1 day)
- Clear "what happens" on expiration
- Summarize value received during trial

**Time-based prompts** -- After X days of free use:
- Gentle upgrade reminder
- Highlight unused paid features
- Easy to dismiss

### Paywall Screen Components

1. **Headline** -- Focus on benefit: "Unlock [Feature] to [Benefit]"
2. **Value demonstration** -- Preview, before/after, "With Pro you could..."
3. **Feature comparison** -- Key differences, current plan marked
4. **Pricing** -- Clear, simple. Annual vs monthly if applicable
5. **Social proof** -- Customer quotes, usage stats
6. **CTA** -- Value-oriented: "Start Getting [Benefit]"
7. **Escape hatch** -- Clear "Not now" or "Continue with Free"

### Timing and Frequency

**When to show:** After value moment, after activation, when hitting genuine limits.

**When NOT to show:** During onboarding (too early), when user is in a flow, repeatedly after dismissal.

**Frequency rules:** Limit per session. Cool-down after dismiss (days, not hours). Track annoyance signals.

### Upgrade Flow Optimization

- Minimize steps from paywall to payment
- Keep in-context if possible (don't redirect away)
- Pre-fill known information
- Post-upgrade: immediate access, confirmation, guide to new features

### Anti-Patterns

**Dark patterns to avoid:**
- Hiding the close button
- Confusing plan selection
- Guilt-trip copy ("No, I don't want to grow my business")

**Conversion killers:**
- Asking before value delivered
- Too frequent prompts
- Blocking critical flows
- Complicated upgrade process

### Upgrade Metrics

| Metric | What it tells you |
|--------|-------------------|
| Paywall impression rate | How often users see upgrade prompts |
| Click-through to upgrade | Is the pitch working? |
| Completion rate | Is the payment flow smooth? |
| Revenue per user | Are you capturing value? |
| Churn rate post-upgrade | Did the promise match reality? |

---

## Full-Funnel Audit Checklist

Run this when you want to assess the entire conversion journey.

### Signup Audit

- [ ] Can you count the required fields on one hand?
- [ ] Is social auth available and prominent?
- [ ] Are error messages inline and specific?
- [ ] Does mobile signup work with thumb-only navigation?
- [ ] Is there a clear value proposition above the form?
- [ ] Are deferrable fields actually deferred?

### Activation Audit

- [ ] Is the activation event defined and measurable?
- [ ] Can a new user reach the aha moment in under 5 minutes?
- [ ] Are empty states actionable (not just "nothing here yet")?
- [ ] Is there an onboarding checklist or guided flow?
- [ ] Are stalled users detected and re-engaged?
- [ ] Do trigger-based emails complement in-app onboarding?

### Upgrade Audit

- [ ] Do paywalls appear after value, not before?
- [ ] Is there a clear escape hatch on every upgrade prompt?
- [ ] Is the path from paywall to payment under 3 steps?
- [ ] Are upgrade prompts frequency-capped?
- [ ] Does the paywall show what the user gains (not just what's locked)?
- [ ] Is post-upgrade experience smooth (immediate access, guidance)?

---

## Experiment Ideas by Phase

### Signup Experiments

- Single-step vs multi-step flow
- Social auth prominent vs email form prominent
- Reduce to email-only first step
- "No credit card required" messaging
- CTA text variations ("Get Started" vs "Create Free Account")
- Remove optional fields entirely

### Activation Experiments

- Product-first vs guided setup post-signup
- Checklist with 3 items vs 5 items vs 7 items
- Pre-populated demo data vs blank slate
- Tooltip tour vs video walkthrough vs neither
- Welcome email timing (immediate vs 1 hour delay)

### Upgrade Experiments

- Trigger timing (after aha moment vs after X days)
- Headline variations on paywall
- Feature comparison vs benefit-focused copy
- Soft limit (warning) vs hard limit (block)
- Trial length variations (7 vs 14 vs 30 days)
- Annual vs monthly pricing emphasis

---

## Output Formats

### Audit Report

For each issue found across any phase:
- **Phase**: Signup / Activation / Upgrade
- **Issue**: What's wrong
- **Impact**: Why it matters (estimated impact if possible)
- **Fix**: Specific recommendation
- **Priority**: High / Medium / Low

### Recommended Changes

Organized by effort:
1. **Quick wins** -- Same-day fixes (copy changes, field removal, error messages)
2. **High-impact changes** -- Week-level effort (flow restructuring, new components)
3. **Test hypotheses** -- Things to A/B test before committing

### Flow Redesign (if requested)

- Phase-by-phase flow diagram
- Recommended field set with rationale
- Copy for CTAs, labels, placeholders, errors
- Onboarding checklist items
- Paywall screen components
- Metrics plan for each phase

---

## Assessment Questions

Ask only what brand context doesn't already cover:

1. What does the current signup flow look like (steps, fields, completion rate)?
2. What happens immediately after signup?
3. What action most correlates with long-term retention (the aha moment)?
4. Where in the funnel are users dropping off most?
5. What's the current free-to-paid conversion rate?
6. What features or limits trigger upgrade prompts?
7. Is this mobile, web, or both?
