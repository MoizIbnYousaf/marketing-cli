# Pattern D — `/compare/[a]-vs-[b]`

Third-party comparison pages between two competitors (neither is your product). The funnel:

> User searches "[a] vs [b]" → lands on your page → reads your honest take → sees CTA at the bottom: "If both feel too heavy, try [your product] free."

Volumes per page are usually small (30-500), but commercial intent is the **highest of any pattern** — these searchers are mid-decision and ready to evaluate options.

## When to add a compare page

Each page targets ONE canonical comparison. Add when:

1. Both brands appear in the user's competitor list in `.seo/brand.md`
2. Combined volume of "a vs b" + "b vs a" ≥ 30 (via Recipe D)
3. KD ≤ DR + 10
4. At least one search result in the current SERP for that comparison is a generic listicle (`forbes.com/best...`, `g2.com/categories/...`) — those are weak rankers you can displace with a focused page

## URL slug rules

- **Always alphabetical** for the canonical slug: `buffer-vs-hootsuite`, not `hootsuite-vs-buffer`.
- Both directional searches ("buffer vs hootsuite" AND "hootsuite vs buffer") will rank for the same URL — Google understands the intent is identical.
- Internal-link anchor text on each individual alt page should match the canonical slug, but the link text can be either direction ("compare Buffer vs Hootsuite" or "Hootsuite vs Buffer comparison" both fine).

## Required data shape

```typescript
interface ComparisonData {
  a_name: string                       // "Buffer"
  b_name: string                       // "Hootsuite"

  hero_h1: string                      // "Buffer vs Hootsuite: which is better in 2026?"
  hero_lede: string                    // 40-80 words

  // The verdict goes EARLY — searchers want the answer up front
  verdict_h2: string                   // "Our take, in one paragraph"
  verdict_body: string                 // ≥80 words

  comparison_rows: ComparisonRow[]     // ~12 rows. 3 columns: feature / [A] / [B]

  pricing_h2: string
  pricing_a: { tier: string; price: string; notes: string }[]
  pricing_b: { tier: string; price: string; notes: string }[]

  winner_h2: string                    // "Pick [A] if… pick [B] if…"
  winner_a_for: string[]               // 3-5 bullet criteria
  winner_b_for: string[]

  // The ONLY place your product shows up prominently
  replysocial_aside_h2: string         // "Neither one fits? Here's what we'd suggest"
  replysocial_aside_body: string       // 80-120 words; soft pitch with link to /pricing

  faq_h2: string
  faqs: { question: string; answer: string }[]  // 4-6

  cta_h2: string
  cta_lede: string
}
```

## Quality bar

- [ ] **≥700 words of unique rendered copy.**
- [ ] **Verdict appears within the first viewport.** Don't make searchers scroll for the answer. The verdict is 80-150 words and states an opinion (with caveats).
- [ ] **12+ comparison rows.** Each cell concrete and verifiable. Pricing rows must use the brands' actual published numbers.
- [ ] **Pricing section uses live published pricing.** Re-fetch via web search if data is >60 days old.
- [ ] **"Pick A if / pick B if" criteria are mutually exclusive and concrete.** "Pick Buffer if you prioritize simplicity" — vague. "Pick Buffer if you manage ≤5 accounts and don't need analytics deeper than 30 days" — concrete.
- [ ] **Your product mention is honest and short** — 80-120 words, mentioned ONCE in the dedicated aside. Not sprinkled throughout. Google rewards genuine comparison; thinly-veiled vendor pages get demoted.
- [ ] **Internal links:** to `/alternatives/[a]`, `/alternatives/[b]`, ≥1 relevant `/for/*`, your `/pricing`.
- [ ] **Inbound links:** both `/alternatives/[a]` and `/alternatives/[b]` link here. Homepage compare-block if you have one.
- [ ] **JSON-LD:** `BreadcrumbList`, `FAQPage`, `ComparisonReview` if you implement it (rare; FAQ schema is the high-leverage one).

## The verdict paragraph — the most important section

If a reader only reads one paragraph, this is it. It must:

1. Open with the verdict — "Buffer is the better fit for X; Hootsuite is the better fit for Y."
2. Acknowledge the close-call dimensions — "Both are strong on [shared strength]."
3. State the situation-dependent factor — "The choice usually comes down to [budget / team size / specific feature]."
4. Be honest. If they're nearly tied, say so. Don't manufacture differentiation.

A good verdict reads like advice from a friend who's used both. A bad verdict reads like a "best of" listicle with hedge-everything language.

## The "your product aside" — the soft pitch

This is where your product appears. Rules:

- **Tone: humble.** "If you tried both and felt they were overkill" is better than "Or skip both and try us — we're better."
- **Trigger: when both don't fit.** Don't pitch as a primary recommendation. Pitch as the third option for a specific scenario.
- **Length: 80-120 words.** Not more. Searchers came for "A vs B" — respect that.
- **Honest about what you don't do.** If you don't match their scale or feature breadth, say so.

## Anti-patterns

- **Recency disclaimers without recency.** "As of January 2024" on a page written today and never updated will age badly. Either commit to keeping it fresh, or omit the date.
- **"Our take" without an actual take.** Hedging on every dimension reads like AI-generated comparison content. Pick a side per dimension and defend it.
- **Pricing tables with "Contact sales" when actual numbers are public.** Look them up. Searchers can.
- **Both alts treated identically.** Compare pages need editorial direction — usually one tool wins for one audience, the other for a different audience. State it.

## Reference implementation

Reply-social repo:
- Hash entry: `app/controllers/marketing_controller.rb` — `COMPARISONS = {`
- Routing: `get 'compare/:slug', to: 'marketing#compare_show'`
- Component: `app/frontend/components/ComparisonLayout.tsx`
- Phase 3 PR (`#425`) is the proof-of-concept ship.
