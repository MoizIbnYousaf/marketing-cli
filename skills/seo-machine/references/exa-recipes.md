# Exa-Native Research Cookbook

The 7 recipes below replace the Ahrefs-only flow with mktg's native research stack: **Exa MCP** (primary) + **Firecrawl** (SERP scraping) + **gh CLI** (OSS competitor signal) + **last30days** (Reddit/X/HN aggregation) + **mktg-x** (auth-walled Twitter) + **company-research** / **people-research** skills (already in mktg's catalog).

The trade vs Ahrefs: less numeric precision on volume/KD/TP, but live data, broader signal surface, no paid subscription gate, and recipes that compound multiple APIs in ways a single tool can't.

For the Ahrefs path on projects where you *do* have a subscription, see the appendix at the bottom of this file.

---

## Recipe A — Domain baseline (DR proxy + topical authority)

Replaces Ahrefs `site-explorer-domain-rating`. Builds a multi-signal DR estimate from public data.

```
1. mcp__exa__company_research_exa(companyName: "<user-brand>")
   → existence + business profile + age signal
2. mcp__exa__web_search_advanced_exa(
     query: "site:<user-domain>",
     numResults: 100,
     type: "fast"
   )
   → indexed page count (Exa proxy for what Google has crawled)
3. (If OSS) gh repo view <owner/repo> --json stargazerCount,forkCount,createdAt
   → GitHub-stars-as-authority signal for tech-product competitors
4. mcp__exa__web_search_advanced_exa(
     query: "<brand-name> -site:<user-domain>",
     numResults: 30
   )
   → unique referring domains mentioning the brand (DR proxy)
```

**DR estimate rules:**

| Signal | DR estimate |
|---|---|
| < 50 indexed pages AND < 20 mentions | 0–10 (greenfield) |
| 50–500 indexed pages, 20–100 mentions | 10–25 |
| 500–5000 indexed pages, 100–500 mentions | 25–45 |
| 5000+ indexed pages, 500+ mentions | 45+ |
| GitHub OSS bonus: stars > 1k | +5 |
| GitHub OSS bonus: stars > 10k | +10 |

Record the DR estimate in `.seo/config.json` under `domain_rating_estimate`. Default to 10 (greenfield) when uncertain — under-estimating is safer than over-estimating (the KD cap stays conservative).

---

## Recipe B — Competitor reverse-lookup (what they rank for)

Replaces Ahrefs `site-explorer-organic-keywords`. Exa surfaces the pages a competitor has indexed; we infer which keywords drive them.

```
1. mcp__exa__web_search_advanced_exa(
     query: "site:<competitor-domain>",
     numResults: 50,
     type: "auto",
     enableSummary: true,
     summaryQuery: "What is this page about? What keyword would search for it?"
   )
   → top 50 indexed pages with AI-summarized intent
2. For each top page that looks like an alts/compare/use-case target:
   mcp__exa__web_search_advanced_exa(
     query: "<inferred-keyword>",
     numResults: 10,
     enableSummary: true
   )
   → Verify the keyword is real (competitor actually ranks for it)
3. (Bonus, for OSS competitors)
   gh api repos/<owner/repo>/contents/website 2>/dev/null
   gh api repos/<owner/repo>/contents/docs 2>/dev/null
   → Read their actual marketing routes / docs structure
```

**Output schema (per competitor in `.seo/keyword-research.json`):**

```json
{
  "competitor": "<slug>",
  "indexed_pages_sampled": 50,
  "high_value_pages": [
    { "url": "...", "inferred_keyword": "...", "page_type": "alternatives|compare|use-case|playbook" }
  ],
  "win_angles_for_our_brand": [...]
}
```

---

## Recipe C — Use-case keyword sweep (the `/for/` and `/playbooks/` discovery loop)

Replaces Ahrefs `keywords-explorer-matching-terms`. Three parallel passes for breadth.

```
PASS 1 — Use-case seed expansion via Exa deep search
mcp__exa__deep_search_exa(
  objective: "What are the most-searched 'for [audience]' and 'for [use-case]' queries in <product-category>?",
  numResults: 12,
  type: "deep"
)

PASS 2 — Google autocomplete via Firecrawl
firecrawl scrape "https://www.google.com/complete/search?q=<seed>&output=toolbar"
firecrawl scrape "https://www.google.com/complete/search?q=<seed>+for"
firecrawl scrape "https://www.google.com/complete/search?q=<seed>+vs"
firecrawl scrape "https://www.google.com/complete/search?q=best+<seed>"
→ Real query suggestions from Google's autocomplete index

PASS 3 — Pain-point mining (last30days skill)
Invoke: /last30days "<product-category> problems"
Invoke: /last30days "<persona> + <pain-point>"
→ Returns Reddit + X + HN + YouTube + TikTok mentions with engagement counts
→ Recurring complaints = keyword opportunities ("how to <unblock>")
```

**What "good" looks like for this recipe:**
- 30–60 candidate keywords/topics per competitor
- Filtered to KD ≤ DR + buffer (see DR-cap heuristic in keyword-research/references/dr-cap-and-confidence.md)
- Grouped by parent topic (cluster header)
- Tagged with `confidence: high|medium|estimated` per the 3-tier label rule

---

## Recipe D — Comparison volume (`/compare/[a]-vs-[b]` validation)

Replaces Ahrefs `keywords-explorer-overview` on "[a] vs [b]". Confirms volume exists for a comparison page before writing it.

```
1. mcp__exa__web_search_advanced_exa(
     query: "<a> vs <b>",
     numResults: 10,
     type: "fast"
   )
   → If SERP returns 5+ comparison-shaped results, demand exists.
   → If 0–2 results, defer this comparison.

2. firecrawl scrape "https://www.google.com/search?q=<a>+vs+<b>"
   → Captures "About X,XXX results" line (rough volume proxy)
   → Captures featured snippet (signals comparison-page winnability)

3. mcp__exa__deep_search_exa(
     objective: "Are people actively comparing <a> and <b> on Reddit, HN, X in the last 90 days?",
     type: "deep"
   )
   → Confirms real audience interest, not just SEO ghost demand
```

**Decision rule:** ship a `/compare/[a]-vs-[b]` page when Pass 1 returns ≥5 results AND Pass 3 surfaces ≥3 organic mentions in the last 90 days. Otherwise defer.

---

## Recipe E — SERP saturation analysis (replaces Ahrefs DR/KD numbers)

Replaces Ahrefs `keywords-explorer-overview` (KD field) and `serp-overview`. Builds a "is this winnable?" verdict from SERP composition.

```
1. mcp__exa__web_search_advanced_exa(
     query: "<target-keyword>",
     numResults: 10,
     type: "auto"
   )
   → Top 10 results

2. For EACH top-10 result, run:
   mcp__exa__company_research_exa(companyName: "<domain-from-result>")
   → Returns business signal (size, age, recognition) → DR proxy

3. Classify each top-10 result:
   | Result type | KD signal |
   |---|---|
   | Major SaaS landing page (G2, Capterra, established competitor) | High KD (60+) |
   | Reddit / Quora / forum thread | LOW KD (10-30) — content gap |
   | Listicle from DR 30-60 niche site | Medium KD (30-50) |
   | Generic blog from unknown site | LOW KD (10-30) — winnable |
   | YouTube video / TikTok at position 5+ | Medium KD + AI-citation surface |

4. Compute SERP-derived KD:
   - 5+ "high KD" results → KD 60+
   - 5+ "medium KD" results → KD 30-50
   - 3+ "low KD" results in top 5 → KD ≤ 20
```

**Output rule:** record both `serp_signal_kd` (derived) AND `confidence` (`high` if Pass 2 ran on every result, `medium` if sampled, `estimated` if SERP was small).

---

## Recipe F — Backlink prospecting (referring-domains via Exa)

See `skills/off-page-seo/SKILL.md` for the canonical version. Quick reference:

```
mcp__exa__web_search_advanced_exa(
  query: "<competitor-domain>",
  numResults: 50
  // Note: Exa indexes by content, not by linksTo metadata, so this
  // surfaces pages mentioning the competitor — proxy for inbound link sources
)

Then for each top result:
  - mcp__exa__company_research_exa(companyName: "<result-domain>")
    → DR proxy + business profile (filters paid networks / PR wires)
  - Classify into: directories / listicles / guest-post candidates
```

Output: `.seo/backlink-targets.json` (schema in `off-page-seo` SKILL).

---

## Recipe G — Content gap analysis (what competitors rank for that we don't)

Replaces Ahrefs `site-explorer-organic-keywords` cross-referenced with the user's own indexed pages.

```
1. Recipe B output per competitor → list of inferred keywords they rank for
2. mcp__exa__web_search_advanced_exa(
     query: "site:<our-domain>",
     numResults: 100
   )
   → Our indexed pages (what we already rank for)
3. Compute set difference: their_keywords − our_keywords = the gap
4. Filter gap to keywords within our DR-cap (per KD signal from Recipe E)
5. Rank surviving gaps by traffic_potential proxy:
   - 1st-page SERP demand (Recipe E) × intent fit (commercial > info)
```

**Output:** ranked content gap list with the proposed page slug + pattern (A/B/C/D/E) per gap entry. Becomes the input to the roadmap's pending phases.

---

## Cross-API compound recipes

Single APIs are useful; chained APIs are differentiating. The big ones:

- **Pain-point cluster discovery**: `/last30days` + Exa `deep_search_exa` + mktg-x targeted reading → produces the real complaints the audience has today (drives use-case page angles and playbook hooks)
- **OSS competitor teardown**: `gh repo view` + `gh api repos/<r>/contents` + DeepWiki `read_wiki_contents` + Exa company research → full competitor profile in one fan-out
- **Outreach prospect list**: Recipe F output + `mcp__exa__people_search_exa` per domain → finds the actual person to pitch (byline author, marketing lead, etc.) for the listicle outreach phase
- **Newcomer surveillance**: `mcp__exa-websets__create_webset` with "new <category> tools 2026" criteria → ongoing competitive radar; ingest into `brand/competitors.md` updates

Full details for these compound moves: `references/api-stack-recipes.md`.

---

## Ahrefs appendix (when you have a paid subscription)

If `mcp__ahrefs__subscription-info-limits-and-usage` returns data, Ahrefs adds **numeric precision** on top of the Exa-stack recipes above. It does not replace them — Ahrefs has no equivalent for pain-point mining via `/last30days`, no `gh`-style OSS competitor signal, no built-in deep research.

The minimal Ahrefs-augmented flow when available:

| Exa-stack recipe | Ahrefs upgrade for that step |
|---|---|
| Recipe A — DR proxy | `site-explorer-domain-rating` returns the real Ahrefs DR (0–100). Replaces the proxy estimate. |
| Recipe B — Competitor reverse-lookup | `site-explorer-organic-keywords` filtered `kd <= DR_CAP AND volume >= 30` returns numeric KD/volume per keyword. Replaces inferred-keyword step. |
| Recipe C — Use-case sweep | `keywords-explorer-matching-terms` with seeds → KD/volume/TP per candidate. Replaces deep-search inference. |
| Recipe D — Comparison volume | `keywords-explorer-overview` on "[a] vs [b]" → exact monthly volume. Replaces "About X results" proxy. |
| Recipe E — SERP saturation | `serp-overview` → top 10 with DR per row, no per-domain `company_research_exa` lookups needed. |
| Recipe F — Backlink prospecting | `site-explorer-referring-domains` filtered `DR >= 30 AND traffic_dofollow >= 100` → cleaner target list. |
| Recipe G — Content gap | `site-explorer-content-gap` (cross-references multiple competitors at once) → faster than the set-difference computation. |

When using Ahrefs, record `research_backend: "ahrefs+exa"` in `.seo/config.json` (both — Ahrefs for numerics, Exa-stack for breadth/qualitative signal). The compound-recipe stack (`api-stack-recipes.md`) still runs in parallel because Ahrefs doesn't replace it.

**Not chained into mktg's ecosystem.** Ahrefs MCP requires a paid Ahrefs subscription. It is intentionally NOT in `CLAUDE.md`'s chained-in CLI table or registered as a catalog. If you want it, configure it in your own MCP config — mktg's recipes will detect it via the probe and switch paths automatically.
