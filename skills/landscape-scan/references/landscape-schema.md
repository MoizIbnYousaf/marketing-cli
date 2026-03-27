# Landscape Schema Reference

> Full output schema for `brand/landscape.md` with annotated examples for each section. Load during Phase 5 (Synthesize) to ensure all sections are populated correctly.

---

## Frontmatter

Required fields with types and constraints:

```yaml
---
title: Market Landscape                    # Always "Market Landscape"
type: landscape-scan                       # Always "landscape-scan"
skill: landscape-scan                      # Always "landscape-scan"
date: 2026-03-27                           # ISO date of generation
ecosystem_segments: 4                      # Integer, count of segments mapped
claims_blacklisted: 3                      # Integer, count of blacklisted claims
market_shifts_tracked: 5                   # Integer, count of shifts documented
freshness_days: 0                          # Integer, days since last scan (0 on creation)
research_sources:                          # List of source types used
  - last30days
  - user-reported
  - web-search
---
```

**Valid `research_sources` values:**
- `last30days` -- /last30days skill was used
- `web-search` -- WebSearch tool was used directly
- `exa-mcp` -- Exa MCP was used for research
- `user-reported` -- information provided by the user
- `brand-files` -- derived from existing brand/ context

---

## Section 1: Ecosystem Map

Maps the market into distinct segments. Each segment is a cluster of players
with a shared approach or sub-category.

### Schema

```markdown
## Ecosystem Map

### Market Category
[One sentence: what market this product competes in]

### Ecosystem Segments

#### Segment: [Descriptive Name]
- **Players:** [Company 1], [Company 2], [Company 3]
- **Current state:** [What's happening right now -- 1-2 sentences]
- **Trajectory:** [growing | stable | declining | consolidating]
- **Signal:** [Specific evidence with date or source]
```

### Example: Halal Food Delivery

```markdown
## Ecosystem Map

### Market Category
On-demand halal food delivery connecting verified halal restaurants with
Muslim consumers in North America.

### Ecosystem Segments

#### Segment: General Delivery Platforms (Halal as Filter)
- **Players:** DoorDash, UberEats, Grubhub
- **Current state:** Major platforms added halal filters but verification
  is self-reported by restaurants with no audit process.
- **Trajectory:** stable
- **Signal:** DoorDash added "Halal" cuisine filter in Q4 2025, but
  community reports indicate ~30% of tagged restaurants are not actually
  halal-certified (Reddit r/halal, Feb 2026).

#### Segment: Halal-Specific Delivery
- **Players:** HalalEats, Halal Bites, ZabihaXpress
- **Current state:** Small players with limited geographic coverage.
  HalalEats operates in 3 cities, others in 1-2.
- **Trajectory:** growing
- **Signal:** HalalEats raised $2M seed round (TechCrunch, Mar 2026).
  ZabihaXpress launched Chicago market (Product Hunt, Feb 2026).

#### Segment: Halal Restaurant Discovery (No Delivery)
- **Players:** Zabihah.com, HalalTrip, CrescentRating
- **Current state:** Directory model with reviews. No ordering or delivery.
  Zabihah has strongest brand recognition (20+ years).
- **Trajectory:** declining
- **Signal:** Zabihah.com traffic down 15% YoY per SimilarWeb estimates.
  No product updates in 6+ months.

#### Segment: Halal Meal Kits & Grocery
- **Players:** Halal Meal Co, BoxedHalal, Weee! (halal section)
- **Current state:** Emerging segment targeting home cooking. Subscription
  models with weekly delivery.
- **Trajectory:** growing
- **Signal:** Halal Meal Co launched nationwide shipping (Instagram, Mar 2026).
```

**Rules:**
- Minimum 2 segments, maximum 6. More than 6 means the categorization is too granular.
- Every segment needs at least one Signal with a date or source.
- Trajectory must be one of the four values: growing, stable, declining, consolidating.

---

## Section 2: Market Shifts

Specific events from the last 30 days that change the competitive dynamics.

### Schema

```markdown
## Market Shifts (Last 30 Days)

### [Shift Title]
- **What happened:** [Factual, 1-2 sentences]
- **Source:** [URL or source description]
- **Impact on us:** [How this affects our positioning/strategy, 1-2 sentences]
- **Urgency:** [high | medium | low]
```

### Example

```markdown
## Market Shifts (Last 30 Days)

### HalalEats Raises $2M Seed Round
- **What happened:** HalalEats closed a $2M seed round led by Afore Capital,
  with plans to expand from 3 to 12 cities by end of 2026.
- **Source:** https://techcrunch.com/2026/03/15/halaleats-seed-round
- **Impact on us:** Direct competitor is now funded and scaling. Our geographic
  expansion timeline needs to account for their city-by-city rollout.
- **Urgency:** high

### DoorDash Halal Verification Controversy
- **What happened:** Viral Reddit thread (2,400 upvotes) exposed that DoorDash's
  "Halal" filter includes non-certified restaurants. DoorDash issued a statement
  acknowledging the issue but has not implemented verification.
- **Source:** https://reddit.com/r/halal/comments/example
- **Impact on us:** Strengthens our "verified halal" positioning. Trust gap in
  general platforms is widening. This is a messaging opportunity.
- **Urgency:** medium

### NYC Halal Cart Licensing Changes
- **What happened:** NYC Department of Health proposed new halal certification
  requirements for street vendors and restaurants, expected to take effect Q3 2026.
- **Source:** NYC DOH public notice, Mar 2026
- **Impact on us:** Regulatory tailwind. If certification becomes mandatory,
  platforms with verification infrastructure (us) have an advantage.
- **Urgency:** low
```

**Rules:**
- Order by urgency: high first, low last.
- "What happened" must be factual, not interpretive. Save interpretation for "Impact on us."
- If no shifts were found, write: "No significant market shifts detected in the last 30 days." Do not fabricate shifts.

---

## Section 3: Claims Blacklist

The most important section. This is a hard gate for all downstream content skills.

### Schema

```markdown
## Claims Blacklist

> These claims MUST NOT appear in any marketing content.
> Every content-generating skill reads this section as a hard gate.

### Blacklisted Claims

| # | Claim | Reason | Evidence | Blacklisted Date |
|---|-------|--------|----------|-----------------|
| N | "[Exact claim text]" | [Why false/misleading] | [Source URL or description] | [ISO date] |

### Verified Safe Claims
- "[Claim text]" -- verified [ISO date], source: [source]
```

### Example

```markdown
## Claims Blacklist

> These claims MUST NOT appear in any marketing content.
> Every content-generating skill reads this section as a hard gate.

### Blacklisted Claims

| # | Claim | Reason | Evidence | Blacklisted Date |
|---|-------|--------|----------|-----------------|
| 1 | "The only halal delivery app" | HalalEats and ZabihaXpress now offer delivery | TechCrunch Mar 2026, Product Hunt Feb 2026 | 2026-03-27 |
| 2 | "No other app verifies halal certification" | HalalEats added restaurant certification badges in v2.1 | HalalEats changelog, Mar 2026 | 2026-03-27 |
| 3 | "Fastest halal delivery in the US" | No data to support speed claims; DoorDash has faster logistics infrastructure | No comparative delivery time data available | 2026-03-27 |

### Verified Safe Claims
- "Only app with masjid-verified halal certification" -- verified 2026-03-27, source: competitor app audits (no competitor uses masjid verification)
- "Serving 50+ cities" -- verified 2026-03-27, source: internal data
- "Average delivery time under 35 minutes in covered areas" -- verified 2026-03-27, source: internal analytics
```

**Rules:**
- Claim text must be in quotes -- the exact phrasing that is blacklisted.
- Reason must explain WHY it is false, not just that it is.
- Evidence must cite a specific source. "Might be outdated" is not valid evidence.
- Verified Safe Claims are the positive counterpart -- claims that HAVE been verified and CAN be used.
- The blacklist is additive in refresh mode: do not remove old entries unless the user explicitly says a claim is valid again.

---

## Section 4: Competitive Movement

Tracks specific competitor actions that affect the landscape. More granular than
Market Shifts -- focused on individual competitor actions rather than market-wide events.

### Schema

```markdown
## Competitive Movement

### New Entrants
- **[Company]** -- [What they do, when appeared, threat level: low/medium/high]

### Pricing Shifts
- **[Company]** -- [Old pricing] -> [New pricing], [date]

### Positioning Shifts
- **[Company]** -- was "[old positioning]", now "[new positioning]"

### Exits/Acquisitions
- **[Company]** -- [What happened], [date]
```

### Example

```markdown
## Competitive Movement

### New Entrants
- **ZabihaXpress** -- Halal delivery in Chicago only. Launched Feb 2026.
  Threat level: low (single city, no funding disclosed).
- **Weee! Halal Section** -- Asian grocery delivery platform added halal section.
  Threat level: medium (established platform, cross-category play).

### Pricing Shifts
- **HalalEats** -- $5 flat delivery -> $3.99 delivery + $2 service fee, Mar 2026
- **DoorDash** -- No halal-specific pricing change. DashPass still applies.

### Positioning Shifts
- **HalalEats** -- was "Halal food, delivered fast", now "Certified halal. Every restaurant verified."
- **Zabihah.com** -- was "Find halal restaurants near you", now "The halal community platform" (added forums)

### Exits/Acquisitions
- **Halal Bites** -- appears inactive. Last app update Sep 2025. Website returns 503.
```

**Rules:**
- Each subsection can be empty. Use "None detected in this period." if nothing happened.
- Threat levels for new entrants: low (single market, no funding), medium (funded or multi-market), high (well-funded and directly competitive).
- Positioning shifts must quote the actual messaging, not paraphrase.

---

## Section 5: Ecosystem Opportunities

Strategic opportunities that emerge from the landscape analysis. These are not
recommendations -- they are observations about gaps the landscape reveals.

### Schema

```markdown
## Ecosystem Opportunities

1. **[Opportunity title]** -- [Why it matters now, grounded in landscape data]
2. **[Opportunity title]** -- [Why it matters now]
3. **[Opportunity title]** -- [Why it matters now]
```

### Example

```markdown
## Ecosystem Opportunities

1. **Trust gap in general platforms** -- DoorDash halal verification controversy
   creates a trust vacuum. Verified-only positioning is now provably differentiated,
   not just claimed.
2. **HalalEats expansion creates awareness** -- Their $2M raise and 12-city plan
   will educate the market about halal delivery as a category. Rising tide effect.
3. **Regulatory tailwind from NYC licensing** -- If halal certification becomes
   mandatory, platforms with existing verification infrastructure have first-mover
   advantage in compliance.
```

**Rules:**
- Minimum 2, maximum 5 opportunities.
- Every opportunity must reference a specific finding from the landscape (a market shift, competitive movement, or ecosystem segment).
- These are observations, not action plans. /positioning-angles and /launch-strategy turn observations into actions.

---

## Section 6: Raw Research Notes

Condensed notes from research, preserving source URLs for verification.

### Schema

```markdown
## Raw Research Notes

### Source: [Source Type]
- [Finding] -- [URL or source reference]
- [Finding] -- [URL or source reference]
```

### Example

```markdown
## Raw Research Notes

### Source: /last30days (Reddit, HN, X)
- r/halal thread: "DoorDash halal filter is a joke" (2,400 upvotes) -- reddit.com/r/halal/...
- HN discussion on halal food tech market, 89 comments -- news.ycombinator.com/item?id=...
- @HalalEats tweet announcing Chicago expansion -- x.com/HalalEats/status/...

### Source: Web Search
- TechCrunch: "HalalEats raises $2M seed round" -- techcrunch.com/2026/03/15/...
- Product Hunt: ZabihaXpress launch page, 145 upvotes -- producthunt.com/posts/...

### Source: User-Reported
- "Halal Bites seems dead, their app hasn't been updated since September" -- user interview
- "NYC is talking about new halal certification rules" -- user knowledge
```

**Rules:**
- Preserve URLs whenever available. These are the verification trail.
- Clearly label the source type for each group of findings.
- Keep notes concise -- 1 line per finding. Detail goes in the sections above.
- User-reported findings must be labeled as such so downstream skills know the confidence level.

---

## Completeness Checklist

Before writing landscape.md, verify all sections are present:

- [ ] Frontmatter with all required fields
- [ ] Ecosystem Map with >= 2 segments
- [ ] Market Shifts with urgency ratings (or "None detected")
- [ ] Claims Blacklist with evidence (or "No claims blacklisted")
- [ ] Verified Safe Claims (at least 1 if any claims were checked)
- [ ] Competitive Movement with all 4 subsections (use "None detected" for empty)
- [ ] Ecosystem Opportunities with >= 2 items
- [ ] Raw Research Notes with source attribution

Missing any section is a hard failure. Write "No data available -- [reason]" for
sections that cannot be populated, but never omit the section heading.
