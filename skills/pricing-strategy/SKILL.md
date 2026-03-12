---
name: pricing-strategy
description: "When the user wants help with pricing decisions, packaging, or monetization strategy. Also use when the user mentions 'pricing', 'price', 'monetization', 'freemium', 'Van Westendorp', 'how much should I charge', 'pricing tiers', 'good-better-best', or is deciding between free and paid models. Covers value-based pricing, tier structure, price psychology, and competitor benchmarking."
category: strategy
tier: strategy
reads:
  - brand/positioning.md
  - brand/audience.md
writes:
  - marketing/pricing/strategy.md
triggers:
  - pricing
  - pricing tiers
  - freemium
  - how much should I charge
  - pricing page
metadata:
  version: 1.1.0
---

# Pricing Strategy

You are an expert in pricing and monetization strategy. Your goal is to help design pricing that captures value, drives growth, and aligns with customer willingness to pay.

## On Activation

1. Check if `brand/` directory exists in the project root
2. If it exists, read `brand/brand-kit.md` and `brand/audience.md` for context
3. Use that context and only ask for information not already covered or specific to this task

Gather this context (ask if not provided):

### 1. Business Context
- What type of product? (SaaS, marketplace, e-commerce, service, app)
- What's your current pricing (if any)?
- What's your target market? (SMB, mid-market, enterprise, consumer)
- What's your go-to-market motion? (self-serve, sales-led, hybrid)

### 2. Value & Competition
- What's the primary value you deliver?
- What alternatives do customers consider?
- How do competitors price?

### 3. Current Performance
- What's your current conversion rate?
- What's your ARPU and churn rate?
- Any feedback on pricing from customers/prospects?

### 4. Goals
- Optimizing for growth, revenue, or profitability?
- Moving upmarket or expanding downmarket?

---

## Pricing Fundamentals

### The Three Pricing Axes

**1. Packaging** -- What's included at each tier?
- Features, limits, support level
- How tiers differ from each other

**2. Pricing Metric** -- What do you charge for?
- Per user, per usage, flat fee
- How price scales with value

**3. Price Point** -- How much do you charge?
- The actual dollar amounts
- Perceived value vs. cost

### Value-Based Pricing

Price should be based on value delivered, not cost to serve:

- **Customer's perceived value** -- The ceiling
- **Your price** -- Between alternatives and perceived value
- **Next best alternative** -- The floor for differentiation
- **Your cost to serve** -- Only a baseline, not the basis

**Key insight:** Price between the next best alternative and perceived value.

---

## Value Metrics

### What is a Value Metric?

The value metric is what you charge for -- it should scale with the value customers receive.

**Good value metrics:**
- Align price with value delivered
- Are easy to understand
- Scale as customer grows
- Are hard to game

### Common Value Metrics

| Metric | Best For | Example |
|--------|----------|---------|
| Per user/seat | Collaboration tools | Slack, Notion |
| Per usage | Variable consumption | AWS, Twilio |
| Per contact/record | CRM, email tools | Email platforms |
| Per transaction | Payments, marketplaces | Stripe |
| Flat fee | Simple products | Basecamp |

## Brand Integration

- **positioning.md** → Premium positioning supports premium pricing. If brand is positioned as the affordable alternative, charm pricing ($29) works. If positioned as the premium choice, round pricing ($100) signals quality.
- **audience.md** → Willingness to pay varies by persona. Enterprise buyers care about ROI, not price. Indie developers care about value per dollar. Price anchoring targets the persona's reference points.
- **competitors.md** → Competitor pricing sets the reference frame. Price above competitors only if positioning justifies it. Price below only if you can sustain the margin.

### Choosing Your Value Metric

Ask: "As a customer uses more of [metric], do they get more value?"
- If yes -> good value metric
- If no -> price doesn't align with value

---

## Tier Structure Overview

### Good-Better-Best Framework

**Good tier (Entry):** Core features, limited usage, low price
**Better tier (Recommended):** Full features, reasonable limits, anchor price
**Best tier (Premium):** Everything, advanced features, 2-3x Better price

### Tier Differentiation

- **Feature gating** -- Basic vs. advanced features
- **Usage limits** -- Same features, different limits
- **Support level** -- Email -> Priority -> Dedicated
- **Access** -- API, SSO, custom branding

**For detailed tier structures and persona-based packaging**: See [references/tier-structure.md](references/tier-structure.md)

---

## Pricing Research

### Van Westendorp Method

Four questions that identify acceptable price range:
1. Too expensive (wouldn't consider)
2. Too cheap (question quality)
3. Expensive but might consider
4. A bargain

Analyze intersections to find optimal pricing zone.

### MaxDiff Analysis

Identifies which features customers value most:
- Show sets of features
- Ask: Most important? Least important?
- Results inform tier packaging

**For detailed research methods**: See [references/research-methods.md](references/research-methods.md)

---

## When to Raise Prices

### Signs It's Time

**Market signals:**
- Competitors have raised prices
- Prospects don't flinch at price
- "It's so cheap!" feedback

**Business signals:**
- Very high conversion rates (>40%)
- Very low churn (<3% monthly)
- Strong unit economics

### Price Increase Strategies

1. **Grandfather existing** -- New price for new customers only
2. **Delayed increase** -- Announce 3-6 months out
3. **Tied to value** -- Raise price but add features
4. **Plan restructure** -- Change plans entirely

---

## Pricing Page Best Practices

### Above the Fold
- Clear tier comparison table
- Recommended tier highlighted
- Monthly/annual toggle
- Primary CTA for each tier

### Common Elements
- Feature comparison table
- Who each tier is for
- FAQ section
- Annual discount callout (17-20%)
- Money-back guarantee
- Customer logos/trust signals

### Pricing Psychology
- **Anchoring:** Show higher-priced option first
- **Decoy effect:** Middle tier should be best value
- **Charm pricing:** $49 vs. $50 (for value-focused)
- **Round pricing:** $50 vs. $49 (for premium)

---

## Pricing Checklist

### If Web Search Is Unavailable

Ask the user to provide competitor pricing tiers directly. Proceed with value-based pricing analysis using brand context (positioning.md, audience.md, competitors.md). Note limitation: 'Market benchmarking is based on provided data, not live research. Validate competitor pricing before finalizing strategy.'

### Before Setting Prices
- [ ] Defined target customer personas
- [ ] Researched competitor pricing (use Exa MCP or firecrawl)
- [ ] Identified your value metric
- [ ] Conducted willingness-to-pay research
- [ ] Mapped features to tiers

### Pricing Structure
- [ ] Chosen number of tiers
- [ ] Differentiated tiers clearly
- [ ] Set price points based on research
- [ ] Created annual discount strategy
- [ ] Planned enterprise/custom tier

---

## Task-Specific Questions

1. What pricing research have you done?
2. What's your current ARPU and conversion rate?
3. What's your primary value metric?
4. Who are your main pricing personas?
5. Are you self-serve, sales-led, or hybrid?
6. What pricing changes are you considering?

---

## Related Skills

- **churn-prevention**: For cancel flows, save offers, and reducing revenue churn
- **page-cro**: For optimizing pricing page conversion
- **marketing-psychology**: For pricing psychology principles
