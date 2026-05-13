# DR-Cap Heuristic + 3-Tier Confidence Labels

Two filters every keyword cluster goes through in Phase 6 before priority ranking.

## DR-Cap (non-negotiable filter)

A site can only rank for keywords with `KD (keyword difficulty) ≤ DR (domain rating) + buffer`. Targeting head terms above the cap = wasted work — pages don't rank, no traffic, just compounding indexation debt.

| Site DR (0–100) | Max winnable KD | Rationale |
|---|---|---|
| 0–10 (greenfield) | ≤30 | Stick to long-tail + branded comparison. Anything else is a doomed phase. |
| 10–20 | ≤40 | Use-case + alternatives pages with low-KD modifiers. |
| 20–30 | ≤50 | Mid-volume commercial terms become winnable. |
| 30–50 | ≤60 | Most useful niche head terms in range. |
| 50+ | ≤70 | Compete on anything except brand-direct mega-volume. |

**How to apply:**
- For each cluster, compute `cluster_max_kd = max(keyword.kd for keyword in cluster)`.
- If `cluster_max_kd > DR_CAP` → flag as `out_of_reach`.
- Demote `out_of_reach` clusters to BACKLOG, OR replace the seed keyword with a longer-tail variant that brings KD under the cap.
- Be honest with the user when this triggers: "You can't rank for 'social media management tool' at DR 8 — KD 78. Closest winnable alternative: '[brand] alternatives for agencies' at KD 18."

**Where DR comes from** (Exa-native proxy, no Ahrefs required):

| Signal | What it tells us |
|---|---|
| Indexed-page count via `mcp__exa__web_search_advanced_exa(query: "site:<domain>", numResults: 100)` | <50 pages → DR 0–10; 50-500 → 10–25; 500–5000 → 25–45; 5000+ → 45+ |
| Brand-mention count via `mcp__exa__web_search_advanced_exa(query: "<brand-name> -site:<own-domain>", numResults: 30)` | <20 unique referring domains → DR <15; 100+ → DR 25+ |
| `mcp__exa__company_research_exa(companyName: "<brand>")` | Recognized business profile signals established DR (rough +5-10 to estimate) |
| (OSS only) `gh repo view <owner/repo> --json stargazerCount` | >1k stars → +5 to DR estimate; >10k stars → +10 |
| Ahrefs MCP `site-explorer-domain-rating` (if paid sub configured) | Exact numeric DR (0-100) — replaces the proxy when available |
| Default fallback | DR 10 if no data — under-estimating is safer than over-target |

Persist the result to `.seo/config.json` as `domain_rating_estimate`. The full Exa-native DR proxy is documented as **Recipe A** in `skills/seo-machine/references/exa-recipes.md`.

## 3-Tier Confidence Labels

Every keyword in `brand/keyword-plan.md` gets a `confidence` field reflecting how trustworthy the volume/KD estimate is. Downstream skills (seo-machine, seo-content) use this to prioritize high-confidence opportunities and flag low-confidence ones for human review before publishing.

| Tier | Criteria | Source pattern |
|---|---|---|
| `high` | Multiple independent sources agree | Ahrefs MCP + GSC + SERP scrape concur within ±20% on volume |
| `medium` | Single tool reports the number, SERP scrape consistent | Exa SERP scrape + autocomplete + one paid tool |
| `estimated` | No tool data, inferred | Category averages, PAA mining, or pure heuristic |

**Output schema (in `brand/keyword-plan.md` per keyword row):**

```yaml
keyword: "competitor-x alternatives"
volume: 320
kd: 18
confidence: high   # or: medium / estimated
sources: [ahrefs, exa-serp]
```

**Validation rule:** any keyword targeted in a content brief must be `confidence: high` OR `confidence: medium`. Pages targeting `confidence: estimated` keywords get a "validate before commit" flag in the seo-machine roadmap — either wait for post-launch GSC data or paste Ahrefs/Semrush numbers from the user's existing UI to upgrade the confidence tier.

**Why this matters:** keyword-research today emits keyword data with no signal of how trustworthy each number is. Downstream consumers treat all data equally and ship pages targeting numbers that turn out to be off by 10× in either direction. Confidence tags let seo-machine prioritize correctly and let `mktg compete` know which numbers to recompute periodically.

## Reference implementation

The same DR-cap math + confidence labels are encoded in `skills/seo-machine/references/ahrefs-recipes.md` (the cookbook seo-machine consumes during Initialize). Keep these two docs in sync — if the DR-cap thresholds change here, update the cookbook there.
