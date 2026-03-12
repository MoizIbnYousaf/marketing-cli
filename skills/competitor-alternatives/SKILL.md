---
name: competitor-alternatives
description: "Creates high-converting 'X vs Y' and 'X alternatives' SEO pages that capture comparison search traffic. Researches competitors, writes honest comparison content, and adds schema markup (FAQPage, ItemList). Use when someone needs alternatives pages, comparison content, or says 'alternatives page', 'vs page', 'comparison', 'competitor alternatives', 'X vs Y page', or wants to capture competitor brand search traffic with SEO content."
allowed-tools: []
---

# Competitor Alternatives Pages

## Purpose

People searching "[Competitor] alternatives" or "[Product] vs [Competitor]" have high purchase intent. They already know the category — they're choosing. This skill captures that traffic with structured comparison content that ranks and converts.

## Reads

- `brand/competitors.md` — Known competitors, their positioning, pricing, weaknesses
- `brand/positioning.md` — Your product's unique value props, differentiators, target audience

## Depends On

- `competitive-intel` — Must have competitor research completed first

## Workflow

### Step 1: Identify Comparison Queries

Pull from `competitors.md` and generate the full keyword set:

- `[competitor] alternatives` (highest volume)
- `[competitor] vs [your product]` (branded)
- `[your product] vs [competitor]` (branded reverse)
- `best [category] tools` (category)
- `[competitor] review` (review intent)
- `[competitor] pricing` (price-sensitive)

Prioritize by: search volume estimate > purchase intent > your win rate against that competitor.

### If Web Search Is Unavailable

Use data from brand/competitors.md if it exists. Ask the user directly for: competitor pricing, key strengths/weaknesses, and notable reviews or complaints they've seen. Note limitation: 'Competitor data is based on provided context, not live research. Verify current pricing and features before publishing.'

### Step 2: Research Each Competitor

For each competitor page, gather:

- **Core product** — What they actually do (one sentence)
- **Pricing** — Free tier, paid plans, enterprise
- **Strengths** — 3-5 genuine strengths (be honest, builds credibility)
- **Weaknesses** — 3-5 real weaknesses (factual, not snarky)
- **Best for** — Their ideal customer profile
- **Not ideal for** — Where they fall short (your opportunity)
- **Key reviews** — G2, Capterra, Reddit sentiment summary

### Step 3: Write the Comparison Page

Structure for each page:

```markdown
---
title: "[Competitor] vs [Your Product]: Honest Comparison [Year]"
description: "Comparing [Competitor] and [Your Product] on features, pricing, and ease of use. See which is right for your needs."
slug: /compare/[competitor]-vs-[your-product]
schema: ComparisonPage
---

## TL;DR

[2-3 sentence verdict. Be specific about WHO should pick which tool.]

## Quick Comparison

| Feature | [Your Product] | [Competitor] |
|---------|---------------|--------------|
| [Feature 1] | [Status/Detail] | [Status/Detail] |
| [Feature 2] | [Status/Detail] | [Status/Detail] |
| Pricing starts at | $X/mo | $Y/mo |
| Free tier | Yes/No | Yes/No |
| Best for | [Audience] | [Audience] |

## [Your Product] Overview
[2-3 paragraphs. Lead with your strongest differentiator against THIS specific competitor.]

## [Competitor] Overview
[2-3 paragraphs. Fair and accurate. Acknowledge their strengths.]

## Feature-by-Feature Breakdown

### [Category 1]
[Detailed comparison with specifics, not vague claims]

### [Category 2]
[Same pattern]

## Pricing Comparison
[Side-by-side pricing breakdown. Include hidden costs, overage fees, feature gates.]

## Verdict: Which Should You Choose?

**Choose [Your Product] if:**
- [Specific use case 1]
- [Specific use case 2]
- [Specific use case 3]

**Choose [Competitor] if:**
- [Specific use case where they genuinely win]
- [Another honest scenario]

## Ready to try [Your Product]?
[CTA — free trial, demo, or signup. Match to the comparison context.]
```

### Step 4: Write the Alternatives Roundup

For the "[Your Product] alternatives" defensive page and "[Competitor] alternatives" offensive pages:

```markdown
---
title: "Best [Competitor] Alternatives [Year]"
description: "Looking for [Competitor] alternatives? Compare the top X options including pricing, features, and who each is best for."
slug: /compare/[competitor]-alternatives
schema: ItemList
---

## Why People Switch from [Competitor]

[3-5 common reasons based on review mining — pricing, missing features, UX friction]

## Best [Competitor] Alternatives

### 1. [Your Product] — Best for [specific use case]
**Pricing:** ...
**Key difference:** ...
**Best for:** ...

### 2. [Alternative 2] — Best for [different use case]
[Same structure]

### 3-5. [More alternatives]
[Same structure, be genuinely helpful]

## Comparison Table
[Full matrix of all alternatives]

## How to Choose
[Decision framework based on use case, team size, budget]
```

### Step 5: Schema Markup

Add JSON-LD schema to each page:

- **VS pages** — Use `FAQPage` schema with common comparison questions
- **Alternatives pages** — Use `ItemList` schema for the roundup
- Both — Include `Article` schema with author, date, modified date

## Verdict Frameworks

Use these to write honest, credible verdicts:

**The Acknowledger:** "While [Competitor] excels at [X], [Your Product] is purpose-built for [Y] — which matters more if you're [target use case]."

**The Segmenter:** "[Competitor] is the right choice for [persona A]. But if you're [persona B], [Your Product] will save you [specific outcome]."

**The Switcher:** "If you're already using [Competitor] and frustrated by [common complaint], [Your Product] solves that with [specific feature]."

## Brand Integration

- **positioning.md** → Every comparison verdict ties back to the positioning angle. Don't just compare features — compare through the lens of your unique value proposition.
- **competitors.md** → Use teardown data for accurate, specific claims. Vague comparisons destroy credibility. Cite specific features, pricing, and limitations.

## CTA Templates

**For clear wins:** "Start your free trial — most teams switch from [Competitor] in under an hour."

**For close comparisons:** "Not sure yet? Try both free tiers and compare with your actual workflow."

**For price-sensitive:** "Get [Competitor]-level features at [fraction] of the cost. See pricing."

## Output

Each comparison generates:
- One markdown file per competitor (VS page)
- One alternatives roundup page per competitor
- One defensive "alternatives to [your product]" page
- SEO metadata and schema markup included in frontmatter
- Internal linking suggestions between comparison pages

## Quality Checks

- [ ] Every competitor strength acknowledged (credibility)
- [ ] Feature claims are specific, not vague ("AI-powered" means nothing)
- [ ] Pricing is current and includes all tiers
- [ ] Verdict is genuinely helpful, not just "pick us"
- [ ] Schema markup validates
- [ ] CTAs match the comparison context
- [ ] No competitor trademark violations in meta titles
