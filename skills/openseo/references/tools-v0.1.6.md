# OpenSEO v0.1.6 MCP Tool Map

Authoritative registry: `every-app/open-seo/src/server/mcp/server.ts`.

## Identity and project memory

`whoami`, `list_projects`, `create_project`, `get_project_context`, `update_project_context`.

Project context carries business, goals, positioning, writing preferences, competitors, key pages, and research log. Read before spending; mutate only after confirming the intended shared-state change.

## Keywords, domains, and SERPs

`research_keywords`, `get_keyword_metrics`, `get_ranked_keywords`, `get_domain_overview`, `get_domain_keyword_suggestions`, `find_serp_competitors`, `get_serp_results`, `list_saved_keywords`, `save_keywords`.

Preserve exact target scope (`exact`, `subfolder`, `domain`, `subdomains`). Some markets expose volume/CPC/trends but not KD, intent, or domain analytics; null is not zero.

## Backlinks

`get_backlinks_overview`, `get_backlinks_profile`. Record target scope, limit, offset/cursor, sort/filter, one-per-domain mode, and account availability. Subfolder summaries have known metric limitations.

## Rank tracking

`create_rank_tracker`, `get_rank_tracker`, `add_rank_tracking_keywords`, `remove_rank_tracking_keywords`, `estimate_rank_tracker_cost`, `run_rank_tracker`.

Default new trackers to manual unless the user explicitly approves recurring spend. Estimate immediately before additions/runs and pass the approved ceiling.

## Search Console and analytics

`get_search_console_performance`, `inspect_urls`, plus GA4 organic landing, page performance, key event, search opportunity, organic overview, acquisition, measurement-health, ecommerce, site-search, and audience tools.

GSC's latest days may be incomplete. Keep requested date range, dimensions, filters, search type, and pagination with every snapshot.

## Local SEO

`search_local_businesses`, `get_local_serp_results`, `get_google_business_questions`, `get_business_profile`, `get_business_reviews`, `get_business_updates`, `list_business_categories`, `get_local_rank_grid`.

Location and coordinates are part of the measurement. Reviews/profile data may spend credits and must not be republished as owned first-party claims without verification.

## Site audit

`run_site_audit`, `get_audit_status`, `get_audit_issues`, `get_audit_pages`. Audit runs are background jobs. Store the audit ID and poll status; do not rerun because the first call has not completed. Lighthouse is opt-in for agent workflows.

## Explicit limitation

OpenSEO's application has AI Visibility UI, but v0.1.6 registers no AI-search MCP tools. Do not claim otherwise.
