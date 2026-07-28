# OpenSEO Backend Contract

Shared readiness + fallback policy for every SEO playbook. Playbooks keep
methodology; OpenSEO (when configured) is the measured data plane.

## Ordered resolver

1. **OpenSEO configured** — `mktg catalog info openseo --json --fields configured`
   is `true`, and preferably `.seo/openseo.json` is linked (`mktg seo status`).
   Prefer measured MCP tools over estimates. Costly / write-side OpenSEO calls
   require explicit user confirm.
2. **OpenSEO absent** — continue with Exa / crawl / web evidence. Mark every
   numeric SEO metric (`KD`, volume, CPC, authority, rank) as `unknown`.
   Never invent numbers.
3. **Qualitative research overlay** (seo-machine and long-arc research only) —
   when OpenSEO covers metrics, still use Exa-stack for qualitative SERP /
   pain-point / OSS signal. Ahrefs is an optional paid numeric overlay, never
   the default dependency.
4. **Manual mode** — if Exa-stack is also unavailable, follow the playbook's
   manual-research references.

## Binding handshake

| Check | Command / path |
|---|---|
| Catalog ready | `mktg catalog info openseo --json --fields configured,missing_envs` |
| Project link | `mktg seo status --json` / `.seo/openseo.json` |
| Keyword sync | `mktg seo sync-keywords` → `brand/keyword-plan.md` `## OpenSEO Sync` |

## Playbook consume note

Each playbook should keep a one-line Backend Selection that names the OpenSEO
tools it prefers, then point here:

> See `skills/openseo/references/backend-contract.md` for catalog check,
> binding, `unknown` rule, and cost/confirm discipline.
