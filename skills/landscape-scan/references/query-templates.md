# Research Query Templates

> Reference for building /last30days and WebSearch queries by industry. Load during Phase 2 (Build Research Query) to construct focused, high-signal search queries.

---

## Template Structure

Every query follows the same formula:

```
[Category] + [Specific Competitors] + [Claim Verification] + [Time Window]
```

The four parts serve different purposes:
- **Category** -- casts a wide net for ecosystem movements
- **Specific Competitors** -- tracks known players for changes
- **Claim Verification** -- checks specific claims from positioning.md
- **Time Window** -- constrains to recent activity (default: 30 days)

---

## SaaS / B2B Software

### Ecosystem Query
```
"{product category}" AND ("launched" OR "raised" OR "acquired" OR "pricing" OR "free tier" OR "shutdown") site:techcrunch.com OR site:producthunt.com OR site:ycombinator.com
```

### Competitor Movement Query
```
"{competitor 1}" OR "{competitor 2}" OR "{competitor 3}" AND ("new feature" OR "pricing change" OR "funding" OR "acquisition" OR "pivot")
```

### Claim Verification Query
```
"{your specific claim}" AND ("{competitor 1}" OR "{competitor 2}") -- verify uniqueness
"{feature you claim is unique}" alternatives OR competitors -- check if others now offer it
```

### Community Sentiment Query
```
"{product category}" site:reddit.com OR site:news.ycombinator.com -- what users actually say
"{competitor name}" review OR complaint OR switched -- competitor weakness signals
```

---

## Mobile Apps

### Ecosystem Query
```
"{app category}" AND ("app store" OR "launched" OR "update" OR "downloads" OR "review") AND ("{platform}" OR "iOS" OR "Android")
```

### Competitor Movement Query
```
"{competitor app 1}" OR "{competitor app 2}" AND ("update" OR "new version" OR "feature" OR "removed" OR "price change" OR "subscription")
```

### Claim Verification Query
```
"{your app}" vs "{competitor app}" -- see what comparison content exists
"{feature you claim is unique}" app OR mobile -- check if others now offer it
"best {app category} app" {current year} -- see who's being recommended
```

### App Store Intelligence Query
```
"{app category}" top charts OR trending OR featured -- store positioning shifts
"{competitor app}" reviews OR ratings OR complaints -- user sentiment changes
```

---

## Developer Tools

### Ecosystem Query
```
"{tool category}" AND ("open source" OR "released" OR "deprecated" OR "v2" OR "rewrite" OR "alternative") site:github.com OR site:dev.to OR site:news.ycombinator.com
```

### Competitor Movement Query
```
"{competitor tool 1}" OR "{competitor tool 2}" AND ("release" OR "breaking change" OR "license change" OR "pricing" OR "sponsorship" OR "acquired")
```

### Claim Verification Query
```
"{your tool}" vs "{competitor tool}" benchmark OR comparison -- performance claims
"{feature you claim}" "{competitor tool}" -- check if competitors added the feature
"{tool category}" survey OR "state of" {current year} -- ecosystem positioning data
```

### Community Adoption Query
```
"{tool category}" "switched to" OR "migrated from" OR "moving to" -- adoption signals
"{competitor tool}" "we chose" OR "why we use" OR "stopped using" -- decision drivers
```

---

## E-commerce / D2C

### Ecosystem Query
```
"{product category}" AND ("brand" OR "launched" OR "DTC" OR "direct to consumer" OR "raised" OR "retail" OR "partnership")
```

### Competitor Movement Query
```
"{competitor brand 1}" OR "{competitor brand 2}" AND ("new product" OR "collaboration" OR "retail partnership" OR "price" OR "sale" OR "subscription box")
```

### Claim Verification Query
```
"{your claim -- e.g., 'organic', 'sustainable', 'handmade'}" "{product category}" -- who else claims this
"{unique ingredient or material}" products OR brands -- check exclusivity claims
"best {product category}" {current year} -- see current recommendations
```

### Market Trend Query
```
"{product category}" trend OR trending OR growth OR decline -- category health
"{product category}" Amazon OR Shopify OR "subscription" -- channel shifts
```

---

## Creator Economy / Content Platforms

### Ecosystem Query
```
"{platform type}" AND ("creator" OR "monetization" OR "launched" OR "creator fund" OR "algorithm change" OR "policy update")
```

### Competitor Movement Query
```
"{competitor platform 1}" OR "{competitor platform 2}" AND ("update" OR "feature" OR "monetization" OR "creator program" OR "terms of service")
```

### Claim Verification Query
```
"{your platform}" vs "{competitor}" creator OR monetization -- positioning comparisons
"{feature you claim}" "{competitor}" -- check if competitors now offer it
"best platform for {creator type}" {current year} -- current recommendations
```

---

## Marketplace / Platform

### Ecosystem Query
```
"{marketplace category}" AND ("marketplace" OR "platform" OR "launched" OR "funding" OR "regulation" OR "supply" OR "demand")
```

### Competitor Movement Query
```
"{competitor 1}" OR "{competitor 2}" AND ("fee change" OR "commission" OR "new market" OR "expansion" OR "feature" OR "policy")
```

### Claim Verification Query
```
"{your marketplace}" vs "{competitor}" -- comparison content
"{unique claim -- e.g., 'lowest fees', 'most sellers'}" "{marketplace category}" -- verify superlative claims
```

---

## AI / ML Products

### Ecosystem Query
```
"{AI category}" AND ("model" OR "launched" OR "benchmark" OR "open source" OR "API" OR "pricing" OR "deprecated" OR "regulation")
```

### Competitor Movement Query
```
"{competitor 1}" OR "{competitor 2}" AND ("new model" OR "API update" OR "pricing change" OR "benchmark" OR "partnership" OR "funding")
```

### Claim Verification Query
```
"{your model/product}" vs "{competitor}" benchmark OR accuracy OR speed -- performance claims
"{capability you claim}" "{competitor product}" -- check if competitors now match
"best {AI category}" {current year} leaderboard OR comparison -- current standings
```

### Regulatory/Safety Query
```
"AI regulation" OR "AI policy" "{your market/region}" -- regulatory landscape
"{AI category}" "terms of service" OR "acceptable use" change -- platform policy shifts
```

---

## Fintech / Financial Services

### Ecosystem Query
```
"{fintech category}" AND ("launched" OR "license" OR "regulation" OR "funding" OR "partnership" OR "bank" OR "API")
```

### Competitor Movement Query
```
"{competitor 1}" OR "{competitor 2}" AND ("rate change" OR "new product" OR "partnership" OR "compliance" OR "expansion" OR "fee")
```

### Claim Verification Query
```
"{your rate/fee claim}" "{competitor}" -- verify pricing advantage claims
"{regulatory claim}" "{fintech category}" -- verify compliance/licensing claims
"best {fintech category}" {current year} -- current recommendations
```

---

## Query Composition Rules

1. **Always include competitor names** -- generic category queries return noise. Specific competitor names return signal.
2. **Always include claim text from positioning.md** -- the primary job is claim verification, not general research.
3. **Use OR for breadth, AND for focus** -- start broad, narrow if results are noisy.
4. **Include site: filters for quality** -- Reddit, HN, TechCrunch, Product Hunt yield better signal than random blogs.
5. **Time-constrain when possible** -- "last 30 days" or date ranges prevent stale results.
6. **Run multiple queries** -- one query per research dimension (ecosystem, competitors, claims, sentiment). Don't try to cover everything in one search.
7. **Adapt to context level** -- at L0 (no brand files), use only category queries. At L2+ (with competitors.md), add competitor-specific and claim-verification queries.
