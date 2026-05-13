# Striking-Distance Audit

The fastest win on any existing site. Pages currently ranking position 5-20 in GSC are one push from page 1. Boosting a position-14 page to position-3 typically **triples its traffic** without writing a new page.

## Eligibility

This audit only applies to sites with existing GSC data. For greenfield (≤14 days old, no rankings yet), skip — there's no striking-distance to find.

## Recipe

```
mcp__ahrefs__gsc-keywords
project_id: <project_id>
date_from: <90-days-ago>
date_to: <today>
where: position >= 5 AND position <= 20 AND impressions >= 50
order_by: impressions:desc
limit: 100
```

Then for each high-value keyword, find the page that owns it:

```
mcp__ahrefs__gsc-pages
project_id: <project_id>
date_from: <90-days-ago>
date_to: <today>
where: position >= 5 AND position <= 20
order_by: clicks:desc
limit: 50
```

Cross-reference. Each (page, keyword) pair is a candidate boost phase.

## Prioritization

Rank candidates by **estimated traffic-at-position-3 minus current-traffic**, using rough CTR-by-position:

| Position | CTR |
|---|---|
| 1 | 28-32% |
| 2 | 14-17% |
| 3 | 9-11% |
| 4 | 6-8% |
| 5 | 5-6% |
| 6-10 | 2-4% |
| 11-15 | 1-2% |
| 16-20 | <1% |

So a keyword at position 14 with 1,000 monthly impressions currently gets ~10 clicks/month. At position 3 it would get ~100/month — a 10x bump on a single phase of work.

Skip candidates where:
- Impressions < 50/month (not enough signal)
- Top 3 results are all DR > 60 with deep, well-optimized content (you won't displace them)
- The page already has 1,500+ words on the topic (out of easy depth-adds)

## Boost-phase scope

A striking-distance boost phase is **NOT writing a new page**. It's amplifying an existing one. Specifically:

1. **Add 200-400 words of depth** to the section where the target keyword appears. Common amplifiers:
   - Add an FAQ if missing (FAQPage schema is a featured-snippet magnet)
   - Expand a thin section with a worked example
   - Add a counter-argument paragraph if the existing content is one-sided
   - Add a how-to subsection if the keyword is procedural
2. **Add 3-5 new internal links to this page** from related pages. The pages most likely to send useful link equity:
   - Other pages already ranking for related queries (find via GSC)
   - Sibling pattern pages (other `/for/*`, other `/alternatives/*`)
   - Recent playbooks or blog posts on the same topic
3. **Update meta title/description** if it doesn't include the target keyword prominently. Bump the title's keyword towards the front.
4. **Update `lastmod` in sitemap** to today. The freshness signal helps the recrawl pick up the changes.

## Phase template for striking distance

```markdown
### Phase N — Boost /<existing-url> for "<target keyword>"

**Why:** currently ranks position 14 for "<target keyword>" (vol 500, KD 18). Position 3 captures an estimated +40 clicks/month with content depth + 3 new internal links from related pages.

**Scope:**

1. Add a 250-word FAQ section to /<existing-url> answering "<related question>"
2. Add `FAQPage` JSON-LD with the new FAQ
3. Add internal links from:
   - `/<related-page-1>` (anchor: "<anchor text>")
   - `/<related-page-2>` (anchor: "<anchor text>")
   - `/<related-page-3>` (anchor: "<anchor text>")
4. Bump meta title to lead with "<target keyword>"
5. Bump sitemap lastmod to today

**Files modified:**
- (stack-specific)

**Verification:**
- [ ] Page has the new FAQ section (200+ words)
- [ ] `FAQPage` JSON-LD validates
- [ ] 3 new inbound links from named pages
- [ ] Meta title leads with target keyword and is ≤60 chars
- [ ] After 14 days, GSC shows position improvement (track manually)
```

## When to schedule striking-distance phases

Front-load them in the tracker. They're faster than new-page phases (a boost typically takes 1-3 hours vs 4-8 for a new page), use existing link equity, and produce measurable traffic gains within 7-21 days.

Suggested ordering on existing sites:

1. Phase 0 — Technical foundations
2. Phases 1-5 — Striking-distance boosts (the top 5 by estimated traffic gain)
3. Phases 6+ — New pattern pages, ordered by traffic potential

## Re-running the audit

GSC data is a lagging indicator. Re-run striking-distance every 30 days during the sprint — new keywords enter position 5-20 every cycle as you ship content, and old ones either graduate to page 1 (success!) or fall off (worth investigating).

If a keyword was at position 8 last month and is now position 12, that's regression. Investigate before boosting — usually means a competitor shipped fresh content on the same query.
