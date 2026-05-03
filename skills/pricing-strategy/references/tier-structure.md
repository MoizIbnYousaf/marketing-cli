# Tier Structure and Packaging

## Contents
- How Many Tiers?
- Good-Better-Best Framework
- Tier Differentiation Strategies
- Example Tier Structure
- Packaging for Personas (Identifying Pricing Personas, Persona-Based Packaging)
- Freemium vs. Free Trial (When to Use Freemium, When to Use Free Trial, Hybrid Approaches)
- Enterprise Pricing (When to Add Custom Pricing, Enterprise Tier Elements, Enterprise Pricing Strategies)

## How Many Tiers?

**2 tiers:** Simple, clear choice
- Works for: Clear SMB vs. Enterprise split
- Risk: May leave money on table

**3 tiers:** Industry standard
- Good tier = Entry point
- Better tier = Recommended (anchor to best)
- Best tier = High-value customers

**4+ tiers:** More granularity
- Works for: Wide range of customer sizes
- Risk: Decision paralysis, complexity

---

## Good-Better-Best Framework

**Good tier (Entry):**
- Purpose: Remove barriers to entry
- Includes: Core features, limited usage
- Price: Low, accessible
- Target: Small teams, try before you buy

**Better tier (Recommended):**
- Purpose: Where most customers land
- Includes: Full features, reasonable limits
- Price: Your "anchor" price
- Target: Growing teams, serious users

**Best tier (Premium):**
- Purpose: Capture high-value customers
- Includes: Everything, advanced features, higher limits
- Price: Premium (often 2-3x "Better")
- Target: Larger teams, power users, enterprises

---

## Tier Differentiation Strategies

**Feature gating:**
- Basic features in all tiers
- Advanced features in higher tiers
- Works when features have clear value differences

**Usage limits:**
- Same features, different limits
- More users, storage, API calls at higher tiers
- Works when value scales with usage

**Support level:**
- Email support → Priority support → Dedicated success
- Works for products with implementation complexity

**Access and customization:**
- API access, SSO, custom branding
- Works for enterprise differentiation

---

## Example Tier Structure

```
┌────────────────┬─────────────────┬─────────────────┬─────────────────┐
│                │ Starter         │ Pro             │ Business        │
│                │ $29/mo          │ $79/mo          │ $199/mo         │
├────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Users          │ Up to 5         │ Up to 20        │ Unlimited       │
│ Projects       │ 10              │ Unlimited       │ Unlimited       │
│ Storage        │ 5 GB            │ 50 GB           │ 500 GB          │
│ Integrations   │ 3               │ 10              │ Unlimited       │
│ Analytics      │ Basic           │ Advanced        │ Custom          │
│ Support        │ Email           │ Priority        │ Dedicated       │
│ API Access     │ ✗               │ ✓               │ ✓               │
│ SSO            │ ✗               │ ✗               │ ✓               │
│ Audit logs     │ ✗               │ ✗               │ ✓               │
└────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## Packaging for Personas

### Identifying Pricing Personas

Different customers have different:
- Willingness to pay
- Feature needs
- Buying processes
- Value perception

**Segment by:**
- Company size (solopreneur → SMB → enterprise)
- Use case (marketing vs. sales vs. support)
- Sophistication (beginner → power user)
- Industry (different budget norms)

### Persona-Based Packaging

**Step 1: Define personas**

| Persona | Size | Needs | WTP | Example |
|---------|------|-------|-----|---------|
| Freelancer | 1 person | Basic features | Low | $19/mo |
| Small Team | 2-10 | Collaboration | Medium | $49/mo |
| Growing Co | 10-50 | Scale, integrations | Higher | $149/mo |
| Enterprise | 50+ | Security, support | High | Custom |

**Step 2: Map features to personas**

| Feature | Freelancer | Small Team | Growing | Enterprise |
|---------|------------|------------|---------|------------|
| Core features | ✓ | ✓ | ✓ | ✓ |
| Collaboration | — | ✓ | ✓ | ✓ |
| Integrations | — | Limited | Full | Full |
| API access | — | — | ✓ | ✓ |
| SSO/SAML | — | — | — | ✓ |
| Audit logs | — | — | — | ✓ |
| Custom contract | — | — | — | ✓ |

**Step 3: Price to value for each persona**
- Research willingness to pay per segment
- Set prices that capture value without blocking adoption
- Consider segment-specific landing pages

---

## Freemium vs. Free Trial

### When to Use Freemium

**Freemium works when:**
- Product has viral/network effects
- Free users provide value (content, data, referrals)
- Large market where % conversion drives volume
- Low marginal cost to serve free users
- Clear feature/usage limits for upgrade trigger

**Freemium risks:**
- Free users may never convert
- Devalues product perception
- Support costs for non-paying users
- Harder to raise prices later

### When to Use Free Trial

**Free trial works when:**
- Product needs time to demonstrate value
- Onboarding/setup investment required
- B2B with buying committees
- Higher price points
- Product is "sticky" once configured

**Trial best practices:**
- 7-14 days for simple products
- 14-30 days for complex products
- Full access (not feature-limited)
- Clear countdown and reminders
- Credit card optional vs. required trade-off

**Credit card upfront:**
- Higher trial-to-paid conversion (40-50% vs. 15-25%)
- Lower trial volume
- Better qualified leads

### Hybrid Approaches

**Freemium + Trial:**
- Free tier with limited features
- Trial of premium features
- Example: Zoom (free 40-min, trial of Pro)

**Reverse trial:**
- Start with full access
- After trial, downgrade to free tier
- Example: See premium value, live with limitations until ready

---

## Enterprise Pricing

### When to Add Custom Pricing

Add "Contact Sales" when:
- Deal sizes exceed $10k+ ARR
- Customers need custom contracts
- Implementation/onboarding required
- Security/compliance requirements
- Procurement processes involved

### Enterprise Tier Elements

**Table stakes:**
- SSO/SAML
- Audit logs
- Admin controls
- Uptime SLA
- Security certifications

**Value-adds:**
- Dedicated support/success
- Custom onboarding
- Training sessions
- Custom integrations
- Priority roadmap input

### Enterprise Pricing Strategies

**Per-seat at scale:**
- Volume discounts for large teams
- Example: $15/user (standard) → $10/user (100+)

**Platform fee + usage:**
- Base fee for access
- Usage-based above thresholds
- Example: $500/mo base + $0.01 per API call

**Value-based contracts:**
- Price tied to customer's revenue/outcomes
- Example: % of transactions, revenue share

---

## Consumer App Pricing

Consumer apps price differently than SaaS. Key differences: lower price sensitivity thresholds, IAP platform fees (30%), emotional rather than ROI-based purchase decisions, and competition against free alternatives.

### Mobile App Pricing Models

| Model | Best For | Example | Typical Revenue |
|-------|----------|---------|----------------|
| Free + Ads | Utility apps, casual games | Weather apps, news readers | $1-5 ARPU/year |
| Freemium | Apps with clear premium value | Spotify, Calm, Duolingo | $2-15/mo premium |
| Subscription | Content, productivity, health | Headspace, Strava, Bear | $5-15/mo or $30-80/yr |
| One-time purchase | Tools, niche utilities | Camera apps, writing tools | $2-15 one-time |
| Consumable IAP | Games, dating apps | Tinder (Super Likes), games (gems) | Highly variable |

### Consumer Subscription Tiers

Consumer apps typically use 2 tiers (not 3) because consumers are more choice-averse than business buyers:

```
Free:         Core experience, ads or limits
Premium:      $4.99-14.99/mo — full experience, no ads
```

**Why 2 tiers:** The Paradox of Choice hits harder with consumers. Business buyers compare feature matrices. Consumers want "free" or "the full thing." A middle tier creates confusion.

**Exceptions:** Family plans work as a pseudo-third tier (Spotify Family, Apple One Family) because the value proposition is clear — same thing, more people.

### Consumer Price Psychology

**Price anchoring works differently:**
- SaaS: Anchor against cost of the problem ("You're losing $5K/month")
- Consumer: Anchor against comparable entertainment ("Less than a coffee per week")

**Annual vs monthly framing:**
- Consumer apps benefit MORE from annual pricing than SaaS because consumers are more sensitive to monthly recurring charges
- Typical discount: 40-50% for annual (vs 17-20% for SaaS) — consumers need a bigger incentive
- Frame as: "$49.99/year (that's just $4.17/month)" — show the monthly equivalent

**App Store price points:**
- iOS and Android have fixed price tiers ($0.99, $1.99, $2.99, $4.99, $9.99, $14.99, etc.)
- $4.99/mo and $9.99/mo are the most common consumer subscription prices
- $49.99/yr is the sweet spot for annual consumer subscriptions
- Remember: Apple/Google take 30% (15% for small businesses under $1M)

### Consumer Tier Example: Fitness App

```
┌────────────────┬──────────────────┬──────────────────┐
│                │ Free             │ Premium          │
│                │ $0               │ $9.99/mo         │
│                │                  │ $59.99/yr (save  │
│                │                  │ 50%)             │
├────────────────┼──────────────────┼──────────────────┤
│ Workouts       │ 5 basic          │ 200+ all levels  │
│ Tracking       │ Manual logging   │ Apple Watch sync │
│ Programs       │ None             │ 12-week plans    │
│ Ads            │ Yes              │ None             │
│ Offline        │ No               │ Yes              │
│ Community      │ Read-only        │ Full access      │
└────────────────┴──────────────────┴──────────────────┘
```

### Marketplace and E-Commerce Pricing

| Model | How It Works | Example | Typical Take Rate |
|-------|-------------|---------|-------------------|
| Commission | % of transaction | Etsy (6.5%), Airbnb (3% seller + 14% buyer) | 5-20% |
| Listing fee | Per listing charge | eBay ($0.35/listing), Etsy ($0.20/listing) | $0.10-1.00 |
| Subscription + commission | Monthly fee + lower % | Shopify ($39/mo + 2.9%) | Blended |
| Payment processing | Flat % + fixed | Stripe (2.9% + $0.30) | 2-3% |

**Key difference from SaaS:** Marketplace pricing must balance both sides — charge sellers too much and supply dries up, charge buyers too much and demand drops. Most successful marketplaces subsidize one side initially.
