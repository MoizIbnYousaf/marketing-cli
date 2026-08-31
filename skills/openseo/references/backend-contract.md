# OpenSEO Backend Contract

## Ordered resolver

1. Run `mktg seo status --json`. Any `*_ready` state permits the corresponding MCP client path.
2. Prefer a linked `.seo/openseo.json` and read `get_project_context` before paid research.
3. Use measured OpenSEO results for numeric SEO claims. Preserve market, date, target scope, filters, pagination, provider limitations, and freshness.
4. If OpenSEO is unavailable, continue with Exa/crawl/web evidence and mark KD, volume, CPC, authority, and rank `unknown`.
5. Manual methods remain valid when both paths are unavailable; method limitations go in the output.

## Binding handshake

| Check | Contract |
|---|---|
| Rich readiness | `mktg seo status --json` |
| All client modes | `mktg seo status --json --fields readiness,catalog.endpointError,project` |
| Headless env detail | `mktg catalog info openseo --json --fields configured,missing_envs,mcp` |
| Project link | `.seo/openseo.json` / `mktg seo link-project` |
| Keyword transfer | `.seo/keywords-sync.json` / `mktg seo sync-keywords` |

The hosted MCP default means `OPENSEO_MCP_URL` is optional. `OPENSEO_API_KEY` is required only for non-interactive API-key clients; OAuth-capable MCP clients authenticate interactively.

## Approval matrix

| Operation | Spend approval | Mutation approval |
|---|---|---|
| GSC/GA4/project/context reads | no | no |
| save keywords / update context | no provider spend | yes for broad/shared changes |
| research/SERP/backlinks/local/audit | preflight for material batches | no unless saving results remotely |
| rank schedule/add/run | estimate + explicit credit ceiling | yes |

Never silently convert blocked/error responses into zero-valued metrics.

Reference: `catalogs-manifest.json` owns the endpoint/auth declaration; `src/commands/seo.ts` owns local readiness and project binding.
