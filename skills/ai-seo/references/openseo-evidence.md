# OpenSEO Evidence for AEO

OpenSEO is supporting evidence, not an AI-answer simulator.

## Current v0.1.6 evidence routes

| Question | Tool(s) |
|---|---|
| Is the authoritative page ranking/indexed? | `get_ranked_keywords`, `get_search_console_performance`, `inspect_urls` |
| Which pages and domains supply category answers? | `get_serp_results`, `find_serp_competitors`, `get_backlinks_profile` |
| Is the site technically retrievable? | `run_site_audit`, `get_audit_status`, `get_audit_issues`, `get_audit_pages` |
| Do organic visitors arrive and convert? | GA4 organic landing/page/event/acquisition tools |
| Is performance changing? | rank trackers with cost estimate and approved ceiling |
| What context is already known? | `get_project_context`, `update_project_context` after mutation approval |

## Boundary

As of OpenSEO v0.1.6, AI Visibility exists in its application but no AI-search measurement tools are registered on the MCP server. Therefore:

- do not claim OpenSEO measured ChatGPT/Perplexity/Claude mentions through MCP;
- do not invent REST endpoints;
- record direct platform observations separately under `.aeo/runs/`;
- use OpenSEO to explain crawl, ranking, citation-source, backlink, GSC, GA4, and site-audit conditions.

## Cost and mutation policy

Free reads/mutations and paid provider calls are separate dimensions. `save_keywords` and project-context updates are account mutations but do not themselves consume DataForSEO credits. Research, SERP, backlink, local, audit, and rank-run calls may spend credits. Scheduled rank changes require a fresh estimate and explicit approved ceiling.

Reference implementation paths: `every-app/open-seo/src/server/mcp/server.ts` is the authoritative tool registry; `every-app/open-seo/src/server/mcp/tools/save-keywords.ts` documents free saves; `every-app/open-seo/src/server/mcp/tools/estimate-rank-tracker-cost.ts` and `run-rank-tracker.ts` implement cost ceilings.
