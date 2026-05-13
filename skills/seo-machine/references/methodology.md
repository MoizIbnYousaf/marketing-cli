# Methodology

The principles below come from running this playbook across many production phases on a real site. They're not a framework; they're what consistently worked.

## Core mental model

SEO is a compounding asset. Pages need time to age in Google's index before they rank, and the day-0 crawl shapes how Google understands your product for months. So:

1. **Publish early, refine later.** A thin page indexed now ages while you sleep. A perfect page indexed a month from now loses that month of compounding. The age signal is real and one-way.
2. **Conversion intent before traffic intent.** Most founders publish blog posts first because they're easier. But comparison pages and alternative pages convert at 5-20x the rate of "what is X" blog posts, even at 1/10 the volume. Start with the bottom of the funnel.
3. **Bet only where you can win.** DR < 10 cannot rank for KD > 30 in any reasonable timeframe. Target KD ≤ DR + 10 while your DR is still climbing. This is non-negotiable math.
4. **Topical depth beats topical breadth.** Pick a niche slice (e.g. "Twitter monitoring for B2B SaaS") and own it. Don't fan out across 20 unrelated themes.

## The publishing-order inversion (most founders do this backwards)

The instinct is: write educational content first to build "authority," then add product pages later. This is wrong. The actual high-performing order is:

| Order | Page type | Why |
|---|---|---|
| 1 | `/alternatives/[competitor]` | Highest conversion intent. User typing "hootsuite alternative" wants to switch tools, today. |
| 2 | `/compare/[a]-vs-[b]` | High intent. User is deciding between two known tools — be the third option. |
| 3 | `/for/[use-case]` and `/for/[audience]` | Mid intent. User has a job-to-be-done but doesn't know which tool fits. |
| 4 | `/playbooks/[topic]` (long-form pillar) | Brand authority + AI-citation surface area. Lower direct conversion but huge inbound link draw and LLM mentions. |
| 5 | `/blog/...` informational posts | Lowest direct conversion; useful for keyword sweep and internal linking after the conversion pages exist. (Out of scope for this skill — use `blog-article` skill.) |

This sequence matches the 4 patterns this skill bundles. Phase 0 is technical foundations; everything after Phase 0 follows this order by default.

## Five lessons from running this for real

Each one is here because skipping it cost real time on the first try.

### 1. Capture singular AND plural in one URL.

For most competitor brands, `[brand] alternatives` (plural) has 2-3× the volume of `[brand] alternative` (singular). A single URL can rank for both if the H2 reads "Best [Brand] alternatives in 2026" and the meta title hints at plural. **Bake this in from page 1.** Retrofitting later cost an entire phase on the real project.

### 2. The honesty section is non-negotiable.

Every `/alternatives/[competitor]` page must list 3-4 things where the competitor genuinely wins. This is:
- A brand signal (you're trustworthy)
- A Google quality signal (genuine comparison > thinly-veiled vendor page)
- A conversion signal (readers convert when they trust the comparison)

Pages without honesty sections measurably underperform on rankings and conversion.

### 3. Internal-link minimums are quality bars, not nice-to-haves.

A new page nobody links to is invisible. Bake link counts into the quality gate per pattern:
- `/alternatives/*` → ≥2 sibling alts, ≥1 feature, ≥1 tool
- `/for/*` → ≥2 features, ≥2 tools, ≥1 sibling `/for/`
- `/compare/*` → both alt pages + ≥1 `/for/` + pricing
- `/playbooks/*` → ≥3 features, ≥2 tools, ≥2 `/for/`, ≥1 `/alternatives/`
- **Every page reachable from ≥2 other pages.**

Verify these mechanically (`scripts/link_audit.py`). Don't ship pages that fail.

### 4. Word-count minimums catch lazy phase work.

Soft floors per pattern:
- `/alternatives/*`: ≥600 words of unique copy
- `/for/*`: ≥800 words
- `/compare/*`: ≥700 words
- `/playbooks/*`: ≥2,500 words

These aren't about Google word-count algorithms (there isn't one). They're about ensuring the page actually answers the searcher's question. A 200-word "[brand] alternative" page that's just a comparison table will lose to a 1,200-word page that explains tradeoffs.

### 5. Striking-distance is the fastest win on any existing site.

Pages currently ranking position 8-20 in GSC are one push from page 1. Adding 200-400 words of depth + 3-5 new internal links to a position-14 page routinely moves it to position 3-5, **tripling traffic** without writing a new page.

**Run the striking-distance audit at Initialize time on any existing site.** It almost always surfaces 3-8 immediate wins that beat shipping new pages.

## Why this skill writes a persistent roadmap

Multi-phase SEO work spans weeks. Contexts compact, agents change, the user comes and goes. The roadmap doc (`docs/seo-machine.md`) is the **single source of truth** that survives:
- Conversation compaction
- New worktree / fresh Claude session
- Different team members executing different phases
- Long pauses between phases

The tracker row update lands **in the same commit/PR as the phase work**, never after. This is so every PR review sees the doc-level status change alongside the code change, and the tracker stays in sync with `main` history.

## What this skill explicitly does NOT do

- **Write blog posts.** Use the `blog-article` skill for those. This skill scaffolds the strategy (which topics, what cluster structure) but hands off the writing.
- **Generate images / OG cards.** Use the `og-image` or `feature-image` skill. This skill specifies which pages need OG images but doesn't make them.
- **Submit to GSC / IndexNow / directories.** The off-page checklist is informational. The user (or future automation) does the submitting.
- **Target keywords where DR < KD - 10.** It will refuse to add doomed phases to the tracker. This is a feature.
