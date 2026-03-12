---
name: cmo-analytics-guide
description: |
  Analytics tracking and measurement guide for marketing.
  Absorbed from analytics-tracking skill. Load on demand when setting up
  tracking, measuring results, or debugging analytics.
---

# Analytics and Tracking Guide

Set up tracking that informs decisions, not dashboards.

## Core Principles

1. **Track for decisions, not data.** Every event should inform an action.
2. **Start with the questions.** What do you need to know? Work backwards.
3. **Name things consistently.** Establish patterns before implementing.
4. **Quality over quantity.** Clean data beats more data.

## Event Naming Convention

Use `object_action` format, lowercase with underscores:

```
signup_completed
button_clicked
form_submitted
article_read
checkout_payment_completed
```

Be specific: `cta_hero_clicked` not `button_clicked`. Include context in properties, not event names.

## Essential Events by Context

### Marketing Site

| Event | Properties |
|-------|------------|
| cta_clicked | button_text, location |
| form_submitted | form_type |
| signup_completed | method, source |
| demo_requested | company_size |
| resource_downloaded | resource_name, type |

### Product / App

| Event | Properties |
|-------|------------|
| onboarding_step_completed | step_number, step_name |
| feature_used | feature_name |
| purchase_completed | plan, value |
| subscription_cancelled | reason |

### E-commerce

| Event | Properties |
|-------|------------|
| product_viewed | product_id, name, category, price |
| product_added_to_cart | product_id, price, quantity |
| checkout_started | cart_value, items_count |
| purchase_completed | transaction_id, value, currency |

## Standard Properties

**User:** user_id, user_type (free/trial/paid), account_id, plan_type
**Campaign:** source, medium, campaign, content, term (UTM params)
**Session:** session_id, page, referrer
**Timing:** timestamp, time_on_page, session_duration

## UTM Parameter Strategy

| Parameter | Purpose | Example |
|-----------|---------|---------|
| utm_source | Traffic source | google, newsletter, linkedin |
| utm_medium | Marketing medium | cpc, email, social, organic |
| utm_campaign | Campaign name | spring_launch, welcome_series |
| utm_content | Differentiate versions | hero_cta, sidebar_banner |
| utm_term | Paid search keywords | running+shoes |

Rules: lowercase everything, underscores or hyphens consistently, document all UTMs.

## Funnel Sequences

### Signup Funnel
1. signup_started → 2. signup_step_completed → 3. signup_completed → 4. onboarding_started

### Purchase Funnel
1. pricing_viewed → 2. plan_selected → 3. checkout_started → 4. payment_info_entered → 5. purchase_completed

### Content Funnel
1. page_view → 2. scroll_depth (50%+) → 3. cta_clicked → 4. form_submitted → 5. signup_completed

## Implementation

### PostHog (recommended for agent-native)

```javascript
posthog.capture('signup_completed', {
  method: 'email',
  plan: 'free',
  source: 'landing_page'
});
```

### GA4

```javascript
gtag('event', 'signup_completed', {
  method: 'email',
  plan: 'free'
});
```

### Validation Checklist

- Events firing on correct triggers
- Property values populating correctly
- No duplicate events
- Works across browsers and mobile
- Conversions recorded
- No PII leaking

## Privacy

- Cookie consent required in EU/UK/CA
- No PII in analytics properties
- Configure data retention settings
- Use consent mode (wait for consent before tracking)
- IP anonymization enabled
- Only collect what you need

## Research Mode Signal

Skills that depend on external data must declare their research mode:

**When web research available:**
```
  RESEARCH MODE
  ├── Web search      ✓ connected
  └── Data quality: LIVE
```

**When no research tools:**
```
  RESEARCH MODE
  ├── Web search      ✗ not available
  ├── Data quality: ESTIMATED
  └── To upgrade: connect Exa MCP or firecrawl
```

Always show this signal. Never silently fall back to estimated data. Prefix estimates with `~`.
