# Upstream Catalogs

Extracted from `skills/cmo/SKILL.md` (kept under 500 lines).

`mktg` now has a third first-class concept alongside skills and agents: **upstream catalogs**  -  external OSS projects mktg builds on top of via REST API rather than vendoring source or linking SDKs. Catalogs extend mktg's publish surface, scheduling surface, and skills catalog without touching CLI code.

### Registered catalogs (v1)

| Catalog | What it adds | Skill it powers | Env vars | Activation check |
|---|---|---|---|---|
| `postiz` | 30+ social provider integrations (LinkedIn, Reddit, Bluesky, Mastodon, Threads, Instagram, TikTok, YouTube, Pinterest, Discord, Slack, etc.) via a BYO [postiz-app](https://github.com/gitroomhq/postiz-app) instance (hosted or Docker self-host) | `/postiz` + `/social-campaign` Phase 5 routing | `POSTIZ_API_KEY`, `POSTIZ_API_BASE` (defaults to `https://api.postiz.com`) | `mktg catalog info postiz --json --fields configured,missing_envs` |
| `openseo` | SEO data plane (keywords, SERP, backlinks, local SEO, rank tracking, GSC, GA4, site audit) via MCP from a BYO [open-seo](https://github.com/every-app/open-seo) instance | `openseo`, `openseo-*` skills; measured evidence inside `keyword-research` / `seo-audit` / `ai-seo` / `competitor-alternatives` | Hosted OAuth by default; `OPENSEO_API_KEY` for headless; `OPENSEO_MCP_URL` for self-host endpoint override | `mktg seo status --json` (rich readiness); catalog info for env-only readiness |

### Catalog-aware routing rules

Always check catalog readiness BEFORE routing any social distribution request. The decision tree:

1. **User names a platform** (e.g., "LinkedIn", "Reddit"):
   - X/Twitter → `typefully` (always  -  threads are canonical there)
   - LinkedIn / Threads / Bluesky / Mastodon:
     - Both `typefully` AND `postiz` configured → `postiz` (richer provider catalog)
     - Only `typefully` configured → `typefully`
     - Only `postiz` configured → `postiz`
     - Neither → `content-atomizer` file-only path
   - Instagram / TikTok / Reddit (fixed precedence  -  same order in `rules/ecosystem.md` and `rules/publish-index.md`):
     1. `mktg publish --adapter mktg-native` queue, if a native account exists for the platform
     2. `postiz`, if `POSTIZ_API_KEY` is configured
     3. browser profile skill (profile from `brand/stack.md`)
     4. write to file (`file` adapter) + explain to user
   - YouTube / Pinterest / Discord / Slack:
     - `postiz` configured → `postiz`
     - `postiz` not configured → browser profile (YouTube) or `content-atomizer` writes file + explain to user
2. **User wants a full campaign** → `social-campaign` orchestrator (its Phase 5 now auto-picks typefully vs postiz per post).
3. **User wants atomization** → `content-atomizer` (file generation only  -  distribution is a separate step).
4. **User wants multi-platform launch/directories** → `startup-launcher` (directories, not social channels).
5. **Any metrics-bearing SEO request** (KD, volume, SERP, backlinks, rank tracking, GSC): OpenSEO ready → the matching `openseo-*` skill; not ready → the Exa-backed skill (`keyword-research`, `seo-audit`, `competitive-intel`) with unavailable numeric metrics marked `unknown`. See `rules/ecosystem.md` §OpenSEO.

### AGPL firewall

Postiz is AGPL-3.0 licensed. mktg NEVER links `@postiz/node`; we only call the REST API via raw `fetch`. License boundary is enforced by a test in `package.json`. Agents never need to know about this  -  the adapter handles it.

### Adding a new catalog

See `AGENTS.md` §Drop-in Catalog Contract. Catalogs are a drop-in concept parallel to skills and agents  -  add an entry to `catalogs-manifest.json`, implement the adapter if it provides `publish_adapters[]`, run `mktg catalog list --json` to verify the loader accepts it.
