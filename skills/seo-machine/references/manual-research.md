# Manual Research Mode (Ahrefs MCP unavailable)

When `mcp__ahrefs__*` tools aren't available, the skill still works — keyword data quality just drops. The goal of this fallback is to produce *good-enough* keyword research to populate the roadmap, not to pretend Ahrefs-grade data is there.

Be honest with the user: "Ahrefs MCP isn't connected, so I'll work in manual mode. We'll have less precise volume/KD numbers, but we can still ship a roadmap. You can re-run with Ahrefs later to refine it."

## Three substitution patterns

### 1. User pastes data from their UI

If the user has Ahrefs, Semrush, Mangools, Ubersuggest, or similar — ask them to paste:

- Their domain's DR / DA / authority score
- Top 20 competitor organic keywords (export CSV → paste here)
- Striking-distance keywords (pos 5-20 in their GSC)
- Comparison-keyword volumes for the pairs we want to target

Parse the pasted CSV/text into the same `.seo/keyword-research.json` schema you'd build from Ahrefs. Validate columns; warn if KD or volume are missing.

### 2. Web-search-based competitor reverse-lookup

If the user has nothing:

1. **Identify competitors** — ask the user, or pull from their pricing page / about page.
2. **Web search for each competitor** — use the `firecrawl-search` or built-in WebSearch to query `"<competitor name> alternatives"` and `"<competitor name> vs"`. Look at:
   - Autocomplete suggestions on Google (use a `google.com/search?q=` URL via firecrawl-scrape)
   - "People also ask" boxes
   - Related searches at the bottom of the SERP
3. **Scrape top-3 ranking competitor-alternative pages** — these are your benchmark. Capture their H1/H2/comparison structure. Lets you understand the intent and quality bar.
4. **Estimate volume crudely.** Use Google Trends (web search) for relative interest. A comparison keyword with steady Google Trends interest score 10+ is probably worth ≥30 monthly searches.

Document estimated volumes as **ranges** (e.g. "100-500 monthly") and **mark as estimated** in `keyword-research.json` (`"source": "estimated"`). The user can refine later.

### 3. Manual question-driven discovery

Failing all the above, run a structured interview using `AskUserQuestion`:

- "Who are your 3-5 most-known direct competitors?"
- "What problems do customers tell you they're trying to solve when they sign up?"
- "What tools did customers tell you they tried before yours?"
- "What does your ideal customer's job title look like? Industry?"

From those answers, generate hypothesis keywords:
- Competitor names → `/alternatives/[competitor]` candidates
- Stated problems → `/for/[use-case]` candidates
- Industries / personas → `/for/[audience]` candidates

Mark all as unvalidated and **encourage the user to validate volumes via free tools** before deep work:
- Google Keyword Planner (free with any Google Ads account)
- Mangools KWFinder free tier (5 queries/day)
- Keywords Everywhere browser extension (paid, but cheap)

## What's degraded vs Ahrefs mode

Be explicit with the user about what's missing:

| Capability | Ahrefs mode | Manual mode |
|---|---|---|
| Keyword volume | Precise monthly searches | Range estimate or "validate before targeting" |
| Keyword difficulty (KD) | 0-100 score | Heuristic ("competitive" if top-3 are DR>60) |
| Traffic potential | Per-keyword TP score | Not available — use volume × CTR estimate |
| Striking-distance | GSC pos 5-20 via MCP | Requires user to paste GSC data manually |
| Backlink target research | competitor referring-domains | Manual: who links to top-3 competitor results? |
| SERP overview | Top 10 with DR per result | firecrawl-scrape the SERP page |

## Roadmap impact

In manual mode, the roadmap doc should:
- Front-load the "validate this volume" step on every phase
- Use 3-tier confidence labels per row: `high`, `medium`, `estimated`
- Include a top-of-doc note: "Manual research mode — refine with Ahrefs when available."

When Ahrefs MCP becomes available later, run an "Initialize: refresh" pass to upgrade `estimated` rows to real numbers.
