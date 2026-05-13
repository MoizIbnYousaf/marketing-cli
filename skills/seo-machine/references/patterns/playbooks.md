# Pattern E — `/playbooks/[topic]` (long-form pillar)

Long-form prose guides (2,500+ words) targeting commercial-investigation queries. These are the only pattern where you write long-form custom content per page rather than fan out templated data.

## Why this pattern exists

Three distinct jobs:
1. **Brand authority.** A genuine 3,000-word guide on "B2B social media strategy" positions the author as a real practitioner, not a tool vendor.
2. **AI-citation surface area.** LLMs (ChatGPT, Claude, Perplexity, Gemini) cite long-form guides when answering related queries. Long, well-structured playbooks get scraped into training and inference contexts way more than templated pages.
3. **Inbound link draw.** Other writers cite playbooks. Almost nobody cites an alternatives page.

The tradeoff: each playbook is 2-3 days of real writing work, vs ~4 hours for a `/alternatives/*` page. Ship 2-3 playbooks early in the sprint as pillar content; defer the rest until programmatic patterns are exhausted.

## Target keyword profile

- Volume 50-700 (small head terms)
- KD ≤ DR + 15 (slightly more aggressive than templated patterns because long-form content can punch above its KD)
- Strong "commercial investigation" or "informational with commercial sub-intent" — e.g. "b2b social media strategy" (people doing this are buying tools)
- High traffic potential (≥500 ideal). The keyword cluster matters more than the head term.

Avoid:
- Pure informational queries with no buying intent ("what is social media")
- Brand-direct queries (those are alternatives/compare territory)
- Queries dominated by Wikipedia / how-to listicles in top 5 (you won't displace them at low DR)

## URL slug rules

- lowercase, hyphenated, descriptive
- 2-5 words
- Match common phrasing of the keyword: "b2b social media strategy" → `b2b-social-media-strategy` (not `b2bsocialmediastrategy` and not `b2b-social-strategy`)

## Required data shape

Playbooks are written as long-form components, not data hashes. Each playbook has:

```typescript
interface PlaybookMetadata {
  slug: string
  component: string                 // path to the React/Astro/Markdown component
  headline: string                  // displays on listing
  summary: string                   // 1-2 sentence summary
  meta_title: string                // ≤60 chars
  meta_description: string          // ≤155 chars
  og_subtitle: string
  date_published: string            // ISO
  date_modified: string             // ISO; update when you edit
  read_time_min: number             // honest estimate; ~140 wpm for operator content
}

interface PlaybookContent {
  eyebrow: string
  title: string
  lede: string                      // 60-120 word intro
  toc: TocEntry[]                   // section anchors
  body: ReactNode | MarkdownAST     // the article itself
  related: RelatedLink[]            // 4-6 cards: features, tools, /for/, /alternatives/
  also_useful: InlineLink[]         // 3-6 secondary inline links
  cta_h2: string
  cta_lede: string
}
```

## Quality bar (the hard one)

Playbooks have the strictest quality gate of any pattern. **Most first-draft playbooks fail this gate and need rewriting.** Set the bar high upfront.

- [ ] **≥2,500 words of original prose** in the article body. Strip JSX/markdown syntax before counting (`scripts/word_count.py --pattern=playbook`).
- [ ] **8 sections minimum.** Each `<section id="..." className="scroll-mt-24">` with an anchor. No section under ~250 words.
- [ ] **TOC ordered identically to section order.** Every section has a TOC entry.
- [ ] **Vignettes/case studies have three beats each:** (1) scenario (what they did), (2) what surprised them (non-obvious outcome), (3) lesson. Single-paragraph vignettes allowed only if all three beats fit.
- [ ] **Operational sections name actual numbers.** A "30-day plan" with "Week 2: connect monitoring" is a TOC entry, not a plan. Each step needs (a) "what done looks like" measurable outcome and (b) "if you're behind" branch.
- [ ] **Tooling sections name what NOT to use.** Listing 4 good tools is generic. Listing 4 good tools + 4 categories of tools to avoid (with reasons) is differentiated.
- [ ] **Internal links (in body, NOT sidebar):** ≥3 features, ≥2 tools, ≥2 `/for/*`, ≥1 `/alternatives/*`.
- [ ] **Schema:** `Article` JSON-LD with author + datePublished + dateModified.
- [ ] **Read-time honest.** 2,500 words ≈ 18 min for operator-audience skim. Don't lowball; readers calibrate trust against the displayed read-time.
- [ ] **Cross-link inbound from ≥2 relevant existing pages.** Don't ship an orphan.

## Section structure pattern

Most successful playbooks follow this shape (8-12 sections, ≥250 words each):

1. **The problem framing** — why this topic, why now, why this is hard
2. **The mental-model section** — the framework or framing the rest of the playbook hangs on
3. **3-5 "do this" sections** — concrete actions, with examples
4. **2-3 "don't do this" sections** — anti-patterns, mistakes, what NOT to use
5. **An operational plan** — week-by-week or step-by-step, with measurable outcomes per step
6. **The closing section** — what success looks like, when to know you've made it, what to do next

Don't slavishly copy this structure if a different one fits better, but if you're stuck, use it.

## Writing style notes (specific to playbooks)

- **Operator voice.** First-person plural ("we") is fine if the brand uses it elsewhere. Personal stories are welcome. Detached "best practices" voice loses to lived-experience voice.
- **Concrete numbers everywhere.** "Many companies struggle" → "73% of B2B SaaS companies under 50 employees post less than once a week." If you don't have a source, use a *bracketed* range: "[somewhere between 50-80% of teams we've worked with]" and source it later.
- **Counter-arguments inline.** When you make a strong claim, address the obvious counter-argument in the next paragraph. This is what differentiates 2,500 words of *thinking* from 2,500 words of *content*.
- **No padding.** If a paragraph could be cut without losing meaning, cut it. 2,500 words of real content beats 4,000 words of fluff.

## Reference implementation

Reply-social repo:
- Hash entry: `app/controllers/marketing_controller.rb` — `PLAYBOOKS = {`
- Routing: `get 'playbooks/:slug', to: 'marketing#playbooks_show'`
- Layout: `app/frontend/components/PlaybookLayout.tsx`
- Reference playbook (highest-quality bar): `app/frontend/pages/Playbooks/B2bSocialMediaStrategy.tsx`

Note `VignetteCard` and `WeekCard` components in that file — clone them for new playbooks.
