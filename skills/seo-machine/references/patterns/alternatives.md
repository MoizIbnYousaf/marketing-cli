# Pattern A — `/alternatives/[competitor]`

The single highest-converting page type for SaaS SEO. User typing "[competitor] alternative" is one decision away from signing up for a replacement. Most sprints should start with this pattern and ship 5-15 of these before anything else.

## Target keyword profile

Each `/alternatives/[brand]` page must rank for at least TWO related keywords:

1. **Singular** — `[brand] alternative` (e.g. "hootsuite alternative") — vol typically 100-400
2. **Plural** — `[brand] alternatives` (e.g. "hootsuite alternatives") — vol typically 2-3× the singular

A single URL captures both if the H2 reads "Best [Brand] alternatives in [Year]" and the meta title hints at plural. **Build for both from day 1.** Retrofitting is wasted work.

Secondary keywords often capturable from the same URL (verify via SERP):
- `alternative to [brand]` — vol typically 50-150
- `[brand] pricing` — if their pricing is public and contentious (e.g. price hike, removed free plan)
- `is [brand] free` — if there's a recent change to their free tier
- `[brand] review` — captures evaluation-stage searchers

## URL slug rules

- lowercase, hyphenated. `sprout-social` not `sprout_social` and not `SproutSocial`
- match the competitor's primary brand spelling. "Sprout Social" → `sprout-social`. "MeetEdgar" → `meetedgar` (no internal cap)
- avoid pluralizing in the URL even though keywords are plural. `/alternatives/buffer` not `/alternatives/buffers`

## Required data shape

Every alternatives page renders from this payload. The shape is the same regardless of stack — only the serialization differs (Ruby hash, JSON, TypeScript interface, frontmatter).

```typescript
interface AlternativeData {
  competitor_name: string                    // "Hootsuite" — display form, not slug
  hero_eyebrow: string                       // e.g. "Hootsuite alternative"
  hero_h1: string                            // "Looking for a Hootsuite alternative?"
  hero_lede: string                          // 30-60 word subhead

  // First H2 — CAPTURES PLURAL KEYWORD
  table_h2: string                           // "Best Hootsuite alternatives in 2026"
  table_lede: string                         // 30-50 words
  comparison_rows: ComparisonRow[]           // ≥10 rows: feature + your-cell + competitor-cell

  // Why switch — 4 reasons
  switch_eyebrow: string                     // "Why switch"
  switch_h2: string
  switch_lede: string
  switch_reasons: SwitchReason[]             // exactly 4 reasons, each ≥40 words

  // HONESTY SECTION — NON-NEGOTIABLE
  honesty_eyebrow: string
  honesty_h2: string                         // "Where Hootsuite still wins"
  honesty_lede: string
  honesty_rows: HonestyRow[]                 // 3-4 honest tradeoffs, each ≥30 words

  faq_h2: string
  faqs: AlternativeFAQ[]                     // 4-6 Q/A

  cta_h2: string
  cta_lede: string
}

interface ComparisonRow {
  feature: string
  yours: { state: "yes" | "no" | "partial" | "text"; note?: string }
  theirs: { state: "yes" | "no" | "partial" | "text"; note?: string }
}

interface SwitchReason {
  icon: SwitchReasonIcon   // bolt | sparkle | check | info | shield | chart | clock | target | flame
  title: string
  body: string             // ≥40 words
}

interface HonestyRow {
  feature: string
  body: string             // ≥30 words explaining why they win here
}

interface AlternativeFAQ {
  question: string
  answer: string           // ≥40 words
}
```

## Quality bar (verification gate)

A phase is NOT done until all of these pass. Use `scripts/word_count.py` and `scripts/link_audit.py`.

- [ ] **≥600 words of unique rendered copy.** Strip out JSX/Ruby syntax and recount. Anything under is thin.
- [ ] **First H2 reads "Best [Brand] alternatives in [Year]".** Captures plural.
- [ ] **Meta title ≤60 chars, includes brand + "Alternative" + a hint at free/price intent.**
  - Example: `"Hootsuite Alternative — ReplySocial (free, $25/mo Pro)"`
  - Bad: `"Hootsuite Alternative"` (wasted character budget, no pricing hook)
- [ ] **Meta description ≤155 chars, has primary keyword + reason to click.**
- [ ] **Comparison table has ≥10 rows.** Each row honest. Pricing must be one row (even if you do "Free" vs "$249/mo"). Free-tier presence/absence must be one row if either party has free or recently removed it.
- [ ] **Honesty section present with 3-4 rows.** Acknowledge real competitor strengths. Don't fabricate weakness in yourself; fabricate nothing.
- [ ] **4-6 FAQs.** At least one answers "is [brand] free" or "[brand] pricing" if there's any volume on those intents.
- [ ] **Internal links from this page:** ≥2 sibling `/alternatives/*`, ≥1 `/features/*`, ≥1 `/tools/*` (or whatever the user's equivalent of "tools" is in their nav).
- [ ] **Internal links TO this page:** ≥2 from existing pages. Common spots: homepage marketing block, sibling alts (link cluster), feature pages mentioning the competitor.
- [ ] **JSON-LD schemas:**
  - `BreadcrumbList` (auto from meta helper, but verify present)
  - `FAQPage` (from the FAQ section)
  - `SoftwareApplication` or `Product` representing the user's product
- [ ] **OG image generated** (defer to `og-image` skill if not yet wired).
- [ ] **Sitemap updated** with the new URL + today's lastmod. Never future-date.

## Worked example (skeleton)

```ruby
# Rails+Inertia example. For other stacks see references/stacks/*.md
{
  competitor_name: "Hootsuite",
  hero_eyebrow: "Hootsuite alternative",
  hero_h1: "Looking for a Hootsuite alternative?",
  hero_lede: "ReplySocial is the lightweight social media monitoring and engagement tool that does what most Hootsuite users actually need — without the $249/mo enterprise price tag or the deprecated free plan.",

  table_h2: "Best Hootsuite alternatives in 2026",
  table_lede: "We built ReplySocial after years of paying Hootsuite for features we never used. Here's how the two compare on the things our users actually care about.",
  comparison_rows: [
    { feature: "Free plan",
      yours:  { state: "yes",  note: "Free forever for 1 X account" },
      theirs: { state: "no",   note: "Discontinued in 2023" } },
    { feature: "Starting price",
      yours:  { state: "text", note: "$25/mo Pro" },
      theirs: { state: "text", note: "$249/mo Professional" } },
    # … 8+ more
  ],

  switch_reasons: [
    { icon: "bolt",
      title: "Reply in 30 seconds, not 5 minutes",
      body: "ReplySocial's unified inbox surfaces every mention…" },  # ≥40 words
    # 3 more
  ],

  honesty_eyebrow: "Honest tradeoffs",
  honesty_h2: "Where Hootsuite still wins",
  honesty_lede: "We won't pretend we've matched everything Hootsuite does. Here's where their product is still ahead.",
  honesty_rows: [
    { feature: "Multi-platform scheduling",
      body: "Hootsuite supports scheduling to Instagram, TikTok, LinkedIn, and Facebook from one dashboard. ReplySocial is X-first and doesn't schedule to those platforms — if you need cross-platform scheduling, Hootsuite (or Buffer) is the better fit." },
    # 2-3 more
  ],

  faqs: [
    { question: "Why did Hootsuite end its free plan?",
      answer: "Hootsuite discontinued its free plan in March 2023…" },
    # …
  ],
}
```

## Sibling-link selection logic

When picking ≥2 sibling alts to link to, prefer:
1. **Closest substitute** — same audience, similar feature set (e.g. Buffer ↔ Hootsuite, both general SMM)
2. **Adjacent category** — covers the next-most-likely query (e.g. Hootsuite ↔ Sprout Social, both enterprise-tier)
3. **Up-funnel** — a more well-known competitor someone might also be searching (e.g. Buffer ↔ Hootsuite, both top-of-mind)

Don't link to obscure alts just to hit the count. Each link should be useful to the reader.

## Anti-patterns

- **Fabricated honesty rows** ("they have a worse UI" is not honest, it's just a fluffy claim with no specifics). Real honest tradeoffs reference concrete features.
- **Pricing rows with "Contact sales"** if the competitor publishes actual numbers. Use their actual numbers.
- **"Best" claims in copy.** "ReplySocial is the best Hootsuite alternative" reads like a product page. Let the comparison speak; you provide structure and honesty.
- **No FAQ schema.** Featured-snippet opportunity wasted.
- **Sitemap lastmod in the future.** A red flag to crawlers. Use today's date.

## Reference implementation

This pattern's reference implementation is in the `reply-social` repo:
- Hash entry: `app/controllers/marketing_controller.rb` — search for `ALTERNATIVES = {` then the `'hootsuite'` key
- Component: `app/frontend/components/AlternativeLayout.tsx`
- Routing: `get 'alternatives/:slug', to: 'marketing#alternatives_show'`

For non-Rails stacks, see `references/stacks/<framework>.md`.
