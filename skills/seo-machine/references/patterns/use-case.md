# Pattern B+C — `/for/[use-case]` and `/for/[audience]`

Two flavors of the same template, same data shape, same component. The difference is only in framing:

- **Pattern B (use-case):** slug is a verb-or-noun describing what the user is trying to *accomplish* — `social-listening`, `competitor-monitoring`, `crisis-management`, `customer-support`.
- **Pattern C (audience):** slug is the user's industry or role — `agencies`, `small-business`, `ecommerce`, `freelancers`, `creators`.

Build the infra once; fan out per slug.

## Why this pattern is high-leverage

Pattern B/C pages target keywords with **the highest traffic-potential-to-volume ratio** in the entire roadmap. Examples from a real execution:

- `social media tools for agencies`: vol 150, KD 9, **TP 34,000**
- `competitor monitoring tool`: vol 150, KD 22, **TP 2,500**
- `twitter mentions tracker`: vol 50, KD 6, **TP 2,100**

These low-volume head terms gate access to massive long-tail clusters. A `/for/agencies` page that ranks for "social media tools for agencies" will also pick up dozens of long-tail variants and sub-queries — sometimes 50-100 additional ranking keywords per page.

## Target keyword profile

Pick ONE primary keyword per page. Mid-volume (50-500), mid-KD (≤DR+10), high TP (≥500 ideal, ≥150 acceptable).

Good targets:
- "[category] for [audience]" — e.g. "social media tools for agencies"
- "[verb] [object] tool" — e.g. "competitor monitoring tool"
- "[platform] [verb-noun]" — e.g. "twitter mentions tracker"

Validate via SERP overview (Recipe G) before adding to the tracker. If top 5 are all DR > 60 mega-sites with template content, the KD score lied — skip.

## URL slug rules

- lowercase, hyphenated
- noun or short noun phrase, not a full sentence
- ≤4 words, ideally 1-2
- `/for/agencies`, `/for/social-listening`, `/for/competitor-monitoring`

## Required data shape

```typescript
interface ForData {
  name: string                         // "Social Listening", "Agencies"
  hero_eyebrow: string                 // "For agencies" or "For social listening"
  hero_h1: string                      // e.g. "Social media monitoring built for agencies"
  hero_lede: string                    // 40-80 words

  pain_h2: string                      // "The agency reality"
  pain_lede: string
  pains: { title: string; body: string }[]   // 3-4 specific pains, ≥40 words each

  solution_h2: string                  // "How ReplySocial helps"
  solution_lede: string
  solutions: { icon: SwitchReasonIcon; title: string; body: string }[]  // exactly 4

  proof_h2?: string                    // optional but recommended
  proof_lede?: string
  proof?: { title: string; body: string }[]  // 2-3 proof points

  related: {
    features: { slug: string; title: string }[]  // ≥2 internal /features/ links
    tools: { slug: string; title: string }[]     // ≥2 internal /tools/ links
    siblings: { slug: string; title: string }[]  // ≥1 sibling /for/ link
  }

  faq_h2: string
  faqs: { question: string; answer: string }[]  // 4-6

  cta_h2: string
  cta_lede: string
}
```

## Quality bar

- [ ] **≥800 words of unique rendered copy.**
- [ ] **Hero H1 contains the primary keyword** (e.g. for `/for/agencies` targeting "social media tools for agencies", H1 should include "social media" + "agencies").
- [ ] **Meta title ≤60 chars.** Format: "[Primary keyword] — [Product name]" or "[Primary keyword]: [outcome]".
- [ ] **Meta description ≤155 chars.** Lead with the keyword, end with the conversion hook.
- [ ] **3-4 pains, 4 solutions.** Each ≥40 words. Pains must be specific to the audience/use-case, not generic ("social media is hard" is generic; "agencies juggle 8-15 brands with no unified inbox" is specific).
- [ ] **Internal links:** ≥2 features, ≥2 tools, ≥1 sibling `/for/*`.
- [ ] **Inbound links:** ≥2 existing pages link to this new one. Common spots: homepage, related alts (audience-relevant), `/pricing` page if it mentions the audience.
- [ ] **JSON-LD:** `BreadcrumbList`, `FAQPage`, `SoftwareApplication` representing your product. Optionally `Service` schema if framing as a service.
- [ ] **No vague "for everyone" framing.** Audience-specific = better signals. If the page would apply equally to a 1-person solo creator and a 50-person agency, it's not pointed enough.

## Pain section quality bar

The most common failure mode in `/for/*` pages is generic pain copy. Each pain row should have:
1. **A concrete trigger** (the moment the user notices the pain) — "Every Monday morning you open Hootsuite and see 47 unread mentions across 8 client accounts…"
2. **The cost** (what they lose) — "…and your most important client expected a reply by 9am."
3. **The current workaround** (what they do today) — "So you switch tabs frantically, copy-paste from a Google Sheet, and miss two anyway."

Generic: "Agencies have a lot of social media to manage." Useless.
Specific: "Agency social leads spend 11 hours a week triaging mentions across 8-15 client accounts in tools that don't share an inbox." Concrete + ownable.

## Sibling-link selection

For Pattern B (use-case): link to 1 other use-case in the same audience cluster (e.g. `social-listening` ↔ `competitor-monitoring`, both monitoring-flavored).

For Pattern C (audience): link to 1 other audience that overlaps (e.g. `agencies` ↔ `freelancers`, both service-providers).

If a sibling doesn't exist yet, queue an inbound-link update for when it ships (track in `.seo/link-inventory.md`).

## Reference implementation

Reply-social repo:
- Hash entry: `app/controllers/marketing_controller.rb` — `USE_CASES = {`
- Routing: `get 'for/:slug', to: 'marketing#for_show'`
- Component: `app/frontend/components/ForLayout.tsx`
- The `/for/agencies` page is the gold-standard reference — TP 34k on KD 9 was the proof-of-concept that validated this pattern.
