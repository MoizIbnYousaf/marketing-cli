# AEO Technical and Content Execution

## Technical checks

Inspect the deployed public surface, not only repository intent:

- robots rules for relevant user agents, with retrieval vs training tradeoffs;
- sitemap discoverability and canonical consistency;
- index state through Search Console `inspect_urls` when available;
- server-rendered content and meaningful status codes;
- structured data that matches visible content;
- organization/product/person identity consistency;
- `llms.txt` if present, without claiming universal crawler support;
- referral/log evidence for AI user agents and answer-engine domains, with privacy-safe aggregation.

OpenSEO site-audit tools (`run_site_audit`, `get_audit_status`, `get_audit_issues`, `get_audit_pages`) and GSC URL inspection provide measured technical evidence when configured.

## Content changes

Prefer the smallest page that is authoritative for the attribute. Make the claim direct, qualified, and supported. Useful patterns:

- definition followed by evidence and scope;
- comparison table with honest tradeoffs;
- step sequence with prerequisites and failure modes;
- explicit product facts linked to primary docs;
- named author/reviewer only when real;
- updated date only when substantive review occurred.

Schema is metadata, not a substitute for visible content. FAQPage markup belongs only on visible Q&A. Review/rating schema requires genuine eligible reviews.

## Off-page work

Prepare source-gap briefs with target page, stale/missing claim, evidence, and suggested correction. Never send outreach, edit listings, post comments, or submit reviews automatically.

## Change log

Every executed item records finding ID, files changed, diff/commit reference, hypothesis, deploy date if known, expected observable effect, and earliest reasonable remeasurement date. This supports learning without pretending correlation proves causality.

Reference implementation paths: `skills/seo-audit/references/schema-templates.md`, `skills/competitor-alternatives/SKILL.md`, and `skills/off-page-seo/SKILL.md` own the downstream execution patterns.
