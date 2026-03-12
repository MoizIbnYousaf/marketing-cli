---
name: test-landing-page
description: Automated landing page testing for CRO-relevant checks. Use when the user wants to test a landing page, verify CTA visibility, check mobile responsiveness, audit page load performance, validate copy clarity, or run a pre-launch landing page QA pass. Covers CTA placement, above-the-fold content, mobile layout, load speed, form functionality, social proof visibility, and accessibility basics.
category: conversion
tier: nice-to-have
reads:
  - brand/voice.md
  - brand/positioning.md
  - brand/audience.md
writes:
  - marketing/test-results/
triggers:
  - test landing page
  - landing page test
  - page QA
  - CTA visibility
  - mobile responsive check
  - page load time
  - pre-launch check
  - landing page audit
  - copy clarity check
  - above the fold
---

# Landing Page Testing

<command_purpose>Run automated CRO-focused tests on landing pages using agent-browser CLI, catching conversion-killing issues before launch.</command_purpose>

## Introduction

<role>CRO QA Engineer specializing in landing page conversion optimization testing</role>

This skill tests landing pages against CRO best practices in a real browser, catching issues that manual review misses:
- CTA visibility and placement above the fold
- Mobile responsiveness and touch target sizing
- Page load performance and Core Web Vitals
- Copy clarity and headline effectiveness
- Form functionality and friction points
- Social proof element visibility
- Trust signal placement
- Accessibility basics that impact conversion

## Prerequisites

<requirements>
- Landing page accessible via URL (local dev server or live URL)
- agent-browser CLI installed
- `brand/` directory (optional, enhances copy and positioning checks)
</requirements>

## Setup

**Check installation:**
```bash
command -v agent-browser >/dev/null 2>&1 && echo "Installed" || echo "NOT INSTALLED"
```

**Install if needed:**
```bash
bun install -g agent-browser && agent-browser install
```

## On Activation

1. Read `brand/voice.md` if it exists for tone validation
2. Read `brand/positioning.md` if it exists for value proposition checks
3. Read `brand/audience.md` if it exists for audience-appropriate messaging validation
4. Determine the page URL to test
5. Ask user for browser mode preference (headed vs headless)

## Main Tasks

### 1. Ask Browser Mode

<ask_browser_mode>

Before starting tests, ask the user:

Use AskUserQuestion with:
- Question: "How do you want to run the landing page tests?"
- Options:
  1. **Headed (watch)** - Opens visible browser so you can see tests run
  2. **Headless (faster)** - Runs in background, faster but invisible

Store the choice and use `--headed` flag when user selects "Headed".

</ask_browser_mode>

### 2. Determine Test Target

<test_target>

**If URL provided:** Use it directly.

**If no URL provided:** Check for common dev server patterns:
```bash
# Detect dev server port
PORT=$(grep -Eio '(port\s*[:=]\s*|localhost:)([0-9]{4,5})' CLAUDE.md 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
if [ -z "$PORT" ]; then
  PORT=$(grep -Eo '\-\-port[= ]+[0-9]{4,5}' package.json 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
fi
PORT="${PORT:-3000}"
echo "Using: http://localhost:$PORT"
```

**Ask user to confirm the URL before proceeding.**

</test_target>

### 3. Above-the-Fold Audit

<above_fold_test>

Test what users see without scrolling — the most critical conversion real estate.

**Desktop viewport (1280x800):**
```bash
agent-browser open "[URL]"
agent-browser wait 3000
agent-browser screenshot tmp/screenshots/lp-desktop-fold.png
agent-browser snapshot -i
```

**Check for these elements above the fold:**

| Element | Pass Criteria | Priority |
|---------|--------------|----------|
| **Headline** | Present, clear value proposition, < 12 words | Critical |
| **Subheadline** | Supports headline, addresses pain or benefit | High |
| **Primary CTA** | Visible without scrolling, contrasting color, action-oriented text | Critical |
| **Hero image/visual** | Relevant to offer, not generic stock | Medium |
| **Navigation** | Clean, not cluttered, doesn't distract from CTA | Medium |
| **Social proof** | At least one trust signal (logos, testimonial snippet, user count) | High |

**If brand/positioning.md exists:** Verify the headline aligns with the documented value proposition.

</above_fold_test>

### 4. CTA Analysis

<cta_test>

Test every call-to-action on the page.

```bash
agent-browser snapshot -i  # Get all interactive elements
```

**For each CTA button/link, check:**

| Check | Pass Criteria |
|-------|--------------|
| **Visibility** | High contrast against background, minimum 44x44px touch target |
| **Copy** | Action-oriented verb (Get, Start, Try, Download), not generic (Submit, Click Here) |
| **Placement** | Primary CTA above fold, repeated after major sections |
| **Hierarchy** | One primary CTA per section, secondary CTAs visually distinct |
| **Functionality** | Clicks navigate correctly or open expected modal/form |

**Test CTA clicks:**
```bash
agent-browser click @[cta-ref]
agent-browser wait 2000
agent-browser screenshot tmp/screenshots/lp-cta-result.png
agent-browser snapshot -i
```

**Verify CTA destinations:** Confirm clicking leads to expected outcome (form, signup page, checkout).

</cta_test>

### 5. Mobile Responsiveness Test

<mobile_test>

Test the page at mobile breakpoints — over 50% of traffic is mobile.

**Resize to mobile viewport:**
```bash
# Test at common mobile widths
for width in 375 414 390; do
  agent-browser open "[URL]" --viewport ${width}x812
  agent-browser wait 2000
  agent-browser screenshot tmp/screenshots/lp-mobile-${width}.png
  agent-browser snapshot -i
done
```

**Mobile-specific checks:**

| Check | Pass Criteria |
|-------|--------------|
| **CTA visibility** | Primary CTA visible without scrolling on mobile |
| **Text readability** | Font size >= 16px, sufficient line height |
| **Touch targets** | Buttons/links >= 44x44px with adequate spacing |
| **No horizontal scroll** | Content fits within viewport width |
| **Images** | Properly sized, not overflowing or distorted |
| **Navigation** | Hamburger menu or simplified nav, not desktop nav crammed in |
| **Form fields** | Full-width inputs, appropriate keyboard types |
| **Sticky CTA** | Consider if primary CTA should be sticky on mobile |

</mobile_test>

### 6. Page Load Performance

<performance_test>

Slow pages kill conversions. Every second of delay drops conversion rate by ~7%.

```bash
agent-browser open "[URL]"
agent-browser snapshot -i
```

**Evaluate by inspecting the page:**

| Metric | Target | Impact |
|--------|--------|--------|
| **Visible content** | Renders within 2s | Users bounce after 3s |
| **Images** | Lazy-loaded below fold, optimized format (WebP/AVIF) | Largest Contentful Paint |
| **Scripts** | No render-blocking JS in head | First Contentful Paint |
| **Fonts** | System fonts or preloaded web fonts | Layout shift |
| **Third-party scripts** | Analytics/chat loaded async | Total blocking time |

**Check for heavy resources:**
```bash
# If the page source is accessible, check for obvious issues
agent-browser snapshot -i --json
```

</performance_test>

### 7. Copy and Messaging Audit

<copy_test>

Bad copy is the #1 conversion killer. Test messaging against CRO best practices.

**Get full page text:**
```bash
agent-browser open "[URL]"
agent-browser snapshot -i
```

**Copy checks:**

| Element | Pass Criteria |
|---------|--------------|
| **Headline** | Addresses a specific pain point or desired outcome, not feature-focused |
| **Subheadline** | Expands on headline, ideally includes who it's for |
| **Body copy** | Benefit-first, not feature-first. "You" language, not "We" language |
| **CTA copy** | First person ("Get my free guide") or action-oriented ("Start free trial") |
| **Social proof** | Specific numbers, real names, verifiable claims |
| **Urgency/scarcity** | If present, must be genuine — fake urgency destroys trust |
| **Objection handling** | FAQ, guarantee, or risk-reversal element present |

**If brand/voice.md exists:** Validate tone matches documented brand voice.
**If brand/audience.md exists:** Verify language matches target audience sophistication level.

</copy_test>

### 8. Form Testing

<form_test>

If the page has forms, test for conversion friction.

```bash
agent-browser snapshot -i  # Find form elements
```

**Form friction checklist:**

| Check | Pass Criteria |
|-------|--------------|
| **Field count** | Minimum fields needed (name + email for lead gen, fewer = better) |
| **Labels** | Clear labels or placeholder text explaining what's needed |
| **Error handling** | Inline validation, clear error messages, don't clear filled fields |
| **Button text** | Specific to action ("Get the Guide"), not generic ("Submit") |
| **Privacy** | Privacy policy link near form, GDPR-compliant if applicable |
| **Auto-fill** | Standard field names for browser auto-fill support |

**Test form submission (if safe):**
```bash
agent-browser fill @[email-field] "test@example.com"
agent-browser fill @[name-field] "Test User"
agent-browser screenshot tmp/screenshots/lp-form-filled.png
# Do NOT submit unless user confirms it's safe
```

**Ask user before submitting:** "Should I test form submission? This will create a real submission."

</form_test>

### 9. Trust and Social Proof Audit

<trust_test>

Trust elements directly impact conversion confidence.

**Check for presence and quality of:**

| Element | What to Look For |
|---------|-----------------|
| **Testimonials** | Real names, photos, specific results (not vague praise) |
| **Logos** | Recognizable customer/partner logos, "As seen in" press logos |
| **Statistics** | User count, success rate, years in business — specific numbers |
| **Guarantees** | Money-back guarantee, free trial, no credit card required |
| **Security badges** | SSL indicator, payment security logos (if checkout page) |
| **Case studies** | Links to detailed customer stories |
| **Reviews** | Star ratings, review count, links to third-party review sites |

</trust_test>

### 10. Accessibility Quick Check

<accessibility_test>

Accessibility issues also impact conversion — if users can't navigate, they can't convert.

**Quick checks:**

| Check | How to Test |
|-------|------------|
| **Color contrast** | Visually inspect text against backgrounds — light gray on white = fail |
| **Alt text** | Images should have descriptive alt text |
| **Keyboard navigation** | Tab through the page — can you reach the CTA? |
| **Focus indicators** | Focused elements should have visible outlines |
| **Heading hierarchy** | H1 > H2 > H3, no skipped levels |

</accessibility_test>

### 11. Test Summary

<test_summary>

After all tests complete, present a scored summary:

```markdown
## Landing Page Test Results

**URL:** [tested URL]
**Date:** [date]
**Device:** Desktop + Mobile

### Overall Score: [X/100]

### Critical Issues (Fix Before Launch)
- [ ] [Issue 1 — e.g., "No CTA above the fold on mobile"]
- [ ] [Issue 2 — e.g., "Headline is feature-focused, not benefit-focused"]

### High Priority (Fix This Week)
- [ ] [Issue 1 — e.g., "Social proof section below third scroll"]
- [ ] [Issue 2 — e.g., "Form has 7 fields, reduce to 3-4"]

### Medium Priority (Optimize Later)
- [ ] [Issue 1 — e.g., "Generic stock hero image"]

### Low Priority (Nice to Have)
- [ ] [Issue 1 — e.g., "Add sticky CTA on mobile"]

### What's Working Well
- [Positive 1 — e.g., "Strong headline with clear value prop"]
- [Positive 2 — e.g., "Prominent customer logos build trust"]

### Screenshots
- Desktop above-fold: `tmp/screenshots/lp-desktop-fold.png`
- Mobile 375px: `tmp/screenshots/lp-mobile-375.png`
- CTA result: `tmp/screenshots/lp-cta-result.png`

### Recommended A/B Tests
1. [Test idea — e.g., "Test 'Start Free Trial' vs 'Get Started Free' CTA copy"]
2. [Test idea — e.g., "Move testimonial above CTA section"]
```

**Save results:**
```bash
mkdir -p marketing/test-results
# Save the summary as a markdown file
```

</test_summary>

## Quick Usage Examples

```bash
# Test a local landing page
/test-landing-page http://localhost:3000

# Test a live page
/test-landing-page https://myapp.com

# Test a specific landing page variant
/test-landing-page https://myapp.com/pricing
```

## Tips

- **Test before every launch**: Run this before publishing any new landing page
- **Compare variants**: Test both A and B versions to spot differences
- **Retest after changes**: Run again after implementing recommendations
- **Mobile first**: If you can only test one viewport, test mobile
- **Screenshot everything**: Visual evidence makes it easy to share findings with your team
