# Pricing Strategy — marketing-cli (mktg)

## Recommendation (now → next)

**Now: Freemium OSS (MIT-clean CLI).**  
Core product stays free and open: skills, agents, brand memory, `/cmo`, local Studio in the npm tarball.

**Later (optional): Paid Studio / hosted layer** — only if usage proves a clear willingness-to-pay for collaboration, sync, or managed catalogs. Do not gate the agent playbook behind a paywall; that breaks the ICP trust model.

| Tier | What | Price posture |
|------|------|----------------|
| **Open (Good)** | CLI + skills + agents + local `brand/` + local Studio | $0 forever |
| **Builder (Better)** — future | Hosted brand sync, shared Studio workspace, priority catalog templates, email support | Soft launch ~$19–49/mo per seat |
| **Team (Best)** — future | SSO-lite, audit log of skill runs, shared marketing/ artifacts, seat management | ~$99–199/mo team |

Until paid exists, do not pretend GBB is live. Market the open tier as complete for solo builders.

## Value metric

**Primary metric:** *agent-ready marketing sessions that compound* — proxied by:

1. Successful `mktg init` / skill installs  
2. Non-template `brand/` files maintained (freshness)  
3. Artifacts produced under `marketing/` per week  

**Not the metric:** seat count of human marketers (wrong ICP), or social posts scheduled (that's the adapter layer).

Charge future paid tiers on **workspace seats that sync brand + Studio**, not on skill count. Skill count is the open wedge.

## Why freemium OSS first

| Reason | Detail |
|--------|--------|
| Distribution | npm + GitHub is how Claude Code / Cursor builders discover tools |
| Trust | Agent-native buyers inspect manifests, dry-run, and tests |
| Moat shape | Compounding brand memory + skill ecosystem > artificial paywalls |
| Anti-positioning | We're not HubSpot; paid must feel optional, not extractive |

## Packaging rules

- Never remove skills from OSS to "upsell." Add *hosted convenience* instead.  
- Local Studio stays free; paid = multiplayer / sync / managed.  
- Catalogs (Postiz, etc.) remain BYO credentials — we don't resell their APIs.  
- Keep AGPL firewall: no bundling forbidden SDKs into paid or free.

## Competitive price anchors (honest)

| Adjacent | They charge for | We differ |
|----------|-----------------|-----------|
| Prompt packs / GPTs | Often free or tip-jar | We ship installable, tested skills |
| Typefully / Buffer | Scheduling seats | Adapter, not our core SKU |
| HubSpot-class MAP | Full funnel SaaS | Out of category; don't price-match |
| Opaque "AI CMO" apps | Opaque chat subscriptions | We compete on openness + DX |

Do not invent competitor dollar figures in public copy.

## Risks

| Risk | Mitigation |
|------|------------|
| Paid Studio cannibalizes trust | Ship paid only for sync/collab; keep CLI+skills free |
| Feature gating skills | Forbidden — breaks progressive enhancement story |
| Hosting cost > willingness | Start with sync-only; avoid running everyone's Postiz |
| Enterprise procurement asks | Stay anti-positioned; don't fake compliance theater |
| Race to "AI CMO SaaS" | Double down on files, manifests, dry-run, OSS |

## Decision checklist before charging

- [ ] ≥N weekly active `mktg` installs with non-template brand files (define N from telemetry you actually have)  
- [ ] Qualitative asks for "shared brand across two machines / teammates"  
- [ ] Support load that justifies email SLA  
- [ ] Clear upgrade path that doesn't brick offline CLI use  

## One-liner for sales/site (when ready)

"mktg is free and open for agents. Pay later only if you want Studio sync and team workflows — the playbook stays yours."
