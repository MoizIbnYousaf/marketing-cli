# Cross-API Compound Recipes

Single APIs answer single questions. Compound recipes — chaining two or three APIs in one move — answer the questions Ahrefs alone can't. The four recipes here are mktg-native and depend only on tools already in our stack: **Exa MCP**, **last30days** skill, **firecrawl**, **gh CLI**, **mktg-x**, **DeepWiki**, **company-research** skill, **people-research** skill, **Exa Websets MCP**.

Each recipe in this file is a sequence — run the steps in order, accumulate outputs, hand the consolidated result to the parent skill.

---

## Recipe 1 — Pain-Point Cluster Discovery

Finds the *real* complaints the audience has today, not yesterday's keyword data. Drives `/for/` use-case page angles and `/playbooks/` opening hooks. Replaces stale Ahrefs "questions" data.

**APIs chained:** `/last30days` + Exa `deep_search_exa` + `mktg-x` (optional, when X login cookie is configured) + Exa `web_search_advanced_exa`

```
Step 1 — Aggregate recent organic signal
  Invoke: /last30days "<product-category> + frustrations OR problems OR struggling with"
  → Returns Reddit + X + HN + YouTube + TikTok mentions with engagement counts
  → Filter to posts with >10 engagement (avoid astroturfed noise)

Step 2 — Cluster the complaints
  For each high-engagement complaint, extract the verb phrase:
    "I keep losing track of..." → "keep losing track of <object>"
    "Why is <task> so hard?" → "<task> being hard"
    "There has to be a better way to..." → "better way to <task>"
  Cluster phrases by verb-object similarity. 5-10 clusters typical.

Step 3 — Validate via Exa deep search
  For each cluster, run:
    mcp__exa__deep_search_exa(
      objective: "What are people saying about <cluster-phrase> in <product-category>?",
      type: "deep",
      numResults: 8
    )
  → Confirms cluster is real (not a single noisy post)
  → Surfaces authoritative articles already covering the pain

Step 4 — Optional X deep-dive (if MKTG_X_AUTH_TOKEN configured)
  For the top 2-3 clusters, invoke /mktg-x to read a representative thread:
    /mktg-x https://twitter.com/<user>/status/<id>
  → Lived-experience quotes for the page's pain section
  → Three-beat vignette material (scenario / surprise / lesson)

Step 5 — Map to page candidates
  Each surviving cluster becomes either:
    - A /for/<audience>/<verb> use-case page (Pattern B)
    - A /playbooks/<topic> playbook opening hook (Pattern E)
  Output schema: array of { cluster, sources[], page_type, draft_h1, draft_lede }
```

**Why this beats Ahrefs question data:** Ahrefs Questions reflects last 30-90 days of search-engine signal aggregated globally. `/last30days` reflects real conversations from the past 30 days, with engagement counts proving they aren't astroturfed. For B2B SaaS and developer-targeted products, the conversation signal leads the search-engine signal by 3-6 months.

---

## Recipe 2 — OSS Competitor Teardown

For competitors that are open source (most agent / dev-tool / Claude-Code-skill competitors are), pull a full profile in one fan-out. Replaces single-source competitor research with a multi-API mosaic.

**APIs chained:** `gh CLI` + `mcp__deepwiki__read_wiki_contents` + `company-research` skill + Exa `web_search_advanced_exa`

```
Step 1 — GitHub baseline (parallel fan-out)
  gh repo view <owner/repo> --json description,homepageUrl,stargazerCount,forkCount,createdAt,updatedAt
  gh api repos/<owner/repo>/contents/README.md --jq '.content' | base64 -d
  gh api repos/<owner/repo>/contents/skills 2>/dev/null  # Claude Code skills
  gh api repos/<owner/repo>/releases --jq 'length'      # release cadence
  gh api repos/<owner/repo>/contributors --jq 'length'  # contributor count

Step 2 — Deep documentation read
  mcp__deepwiki__read_wiki_structure(repoName: "<owner/repo>")
  → Get the wiki TOC; identify the architecture/getting-started sections
  mcp__deepwiki__read_wiki_contents(repoName: "<owner/repo>", path: "<section>")
  → Read the most informative sections (limit to 3-5 to avoid token bloat)

Step 3 — Business context (company-research)
  Invoke: /company-research "<competitor-brand-name>"
  → Returns funding state, team size, positioning, customer list
  → Note: only meaningful if the OSS project has a parent company

Step 4 — Live SERP context
  mcp__exa__web_search_advanced_exa(
    query: "<competitor-brand> review",
    numResults: 10,
    enableSummary: true
  )
  → What 3rd-party reviewers say (the "weaknesses" most users cite)

Step 5 — Consolidate into competitor profile
  Output a single block per competitor:
    {
      "slug": "<canonical-slug>",
      "github": { stars, contributors, last_release, release_cadence_days },
      "positioning": "<from README intro>",
      "pricing": "<free / freemium / paid + price points>",
      "weaknesses_cited": ["<from Exa review summaries>"],
      "differentiators": ["<what they emphasize>"],
      "our_win_angles": ["<derived by comparison with our brand>"]
    }
```

**Where it lands:** the competitor profile goes into `brand/competitors.md` (via the `competitive-intel` skill's writer agent `mktg-competitive-scanner`) AND into `.seo/keyword-research.json` per-competitor block for the alternatives pages.

---

## Recipe 3 — Outreach Prospect Discovery

Turn a backlink target list into an actual person to pitch. Required for Phase 15 (listicle outreach) in the seo-machine roadmap.

**APIs chained:** off-page-seo Recipe F output + Exa `people_search_exa` + Exa `web_search_advanced_exa` + `mktg-x` (optional)

```
Step 1 — Start from .seo/backlink-targets.json
  Read the `listicles` and `guest_posts` arrays from the existing target list.
  These have { domain, dr, url, topic }.

Step 2 — Find the byline author per target
  For each listicle URL:
    mcp__exa__web_search_advanced_exa(
      query: "site:<domain> author <topic>",
      numResults: 5,
      enableSummary: true,
      summaryQuery: "Who wrote this article? What's their role and contact info?"
    )
  → Extract: { name, role, twitter/X handle, email pattern if visible }

Step 3 — Enrich with people-research
  For each name surfaced:
    Invoke: /people-research "<name> + <company>"
    → LinkedIn role, recent talks, social handles, areas of focus

Step 4 — Pre-pitch context (optional X dive)
  If mktg-x configured AND person has an active X handle:
    /mktg-x https://twitter.com/<handle>
  → Last 10 tweets → reveals their current focus / recent rants → angle for personalized pitch

Step 5 — Output enriched prospects
  Schema appended to .seo/backlink-targets.json:
  {
    ...listicle entry...,
    "prospect": {
      "name": "Jane Doe",
      "role": "Senior Editor",
      "linkedin": "...",
      "x_handle": "@janedoe",
      "recent_focus": "AI search optimization, December 2025 article series",
      "pitch_angle": "Her recent series on AI overviews aligns with our /playbooks/ai-citation page; lead with that"
    }
  }
```

**The prospect block is consumed by:** `direct-response-copy` (cold-email mode) when /cmo chains into outreach email writing in Phase 15.

---

## Recipe 4 — Newcomer Surveillance (ongoing competitive radar)

Replaces ad-hoc "I saw a new tool launched on Product Hunt" lookups with continuous monitoring. Refreshes `brand/competitors.md` automatically when new entrants appear.

**APIs chained:** Exa Websets MCP + Exa `web_search_advanced_exa` + `/last30days` + `competitive-intel` skill

```
Step 1 — Create a webset for the category (one-time setup)
  mcp__exa-websets__create_webset({
    criteria: "AI marketing tools launched in the last 90 days targeting <persona>",
    enrichments: [
      { type: "company_basics" },
      { type: "founder_lookup" }
    ]
  })
  → Returns a webset ID. Persist to .seo/config.json as `surveillance_webset_id`.

Step 2 — On every seo-machine Resume invocation
  mcp__exa-websets__list_webset_items(websetId: "<id>", since: "<last-check>")
  → Returns new entries since last check
  Persist `last_surveillance_check` to .seo/config.json.

Step 3 — Validate via /last30days for each new entry
  For each new tool name:
    Invoke: /last30days "<new-tool-name>"
    → Confirms the tool has real organic signal (≥5 mentions in 30d)
    → Filters out vaporware and stale listings

Step 4 — Triage decision
  For each surviving entry, /cmo runs the standard /competitive-intel check:
    - Is this a direct overlap with our positioning? → propose alts page
    - Is it adjacent? → propose comparison content
    - Is it tangential? → log to brand/competitors.md "Watching" section, no immediate action

Step 5 — Auto-refresh brand/competitors.md when triggered
  When a new direct overlap clears triage, /cmo spawns `mktg-competitive-scanner`
  on just that one competitor, which appends to brand/competitors.md without
  rewriting the existing entries.
```

**Cadence:** weekly via `/loop 7d` or on every seo-machine Resume invocation (whichever comes first). Cheap because Exa Websets is incremental — only new items get processed.

---

## When to use which recipe

| You want… | Recipe |
|---|---|
| Real audience complaints → use-case page hooks | 1 (Pain-Point Cluster Discovery) |
| Full competitor profile in one pass | 2 (OSS Competitor Teardown) |
| Actual humans to email for backlink outreach | 3 (Outreach Prospect Discovery) |
| Continuous radar on new entrants in the category | 4 (Newcomer Surveillance) |

For numeric volume/KD/TP data → see `references/exa-recipes.md` (the standard 7 recipes for keyword research).
For the manual fallback when no MCPs are available → `references/manual-research.md`.

---

## Cost discipline

Each compound recipe touches 3-5 APIs. Token discipline:

| Recipe | Heavy API | Budget per run |
|---|---|---|
| 1 — Pain-Point | Exa `deep_search_exa` | ~$0.05 (deep) — run weekly, not per session |
| 2 — OSS Teardown | DeepWiki contents | ~$0.02 per competitor — cache for 30 days |
| 3 — Outreach Prospect | Exa Websets enrichments | ~$0.10 per 50 prospects — run once per off-page phase |
| 4 — Newcomer Surveillance | Exa Websets list | ~$0.01 per check — run weekly |

Cache to `.seo/<recipe>-cache.json` per recipe. Re-run only when:
- Recipe 1: every 7 days (audience pain cycles weekly)
- Recipe 2: every 30 days per competitor (competitive movement is slower)
- Recipe 3: per off-page phase (one-shot)
- Recipe 4: every 7 days (newcomer cadence)

Total monthly research cost stays under $5 for a project running all four recipes on the recommended cadence — orders of magnitude cheaper than Ahrefs Pro ($249/mo) while covering signal Ahrefs doesn't have.
