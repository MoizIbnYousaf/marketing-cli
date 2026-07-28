# Thermo pass 2 — 30 partitions (post-PR #53)

Base: `main` @ merge of #53. Criteria: thermo-nuclear-code-quality-review (every line in partition).

| # | Partition | Paths |
|---|---|---|
| 1 | studio server residual | `studio/server.ts` |
| 2 | studio routes extracted | `studio/server/routes/**`, `studio/server/http.ts` |
| 3 | publish core | `src/core/publish/**`, `src/commands/publish.ts` |
| 4 | skill lifecycle split | `src/core/skill-*.ts`, `skill-lifecycle.ts`, run/route |
| 5 | dashboard god-command | `src/commands/dashboard.ts`, `dashboard-contract.ts` |
| 6 | verify + ship-check | `verify.ts`, `ship-check.ts`, `monorepo.ts` |
| 7 | brand cmd + core | `src/core/brand.ts`, `src/commands/brand.ts` |
| 8 | init/update/catalog/skill | init, update, catalog, skill, skill-upgrade, skill-check-upstream |
| 9 | doctor/cmo/seo/plan/status | those commands |
| 10 | core shared | catalogs, output, errors, args, types, cli, integrations |
| 11 | studio lib DX/mktg | dx, mktg, output, types/mktg |
| 12 | studio lib brand/content | brand-files, content-manifest, pulse, foundation, postiz |
| 13 | studio publish UI | workspace/publish/** |
| 14 | studio pulse/brand UI | pulse-page, brand-tab, brand-workspace |
| 15 | studio onboarding/settings | onboarding/**, settings/**, demo-mode |
| 16 | studio chrome/layout | sidebar, palette, sse-bridge, layout, workspace-header |
| 17 | studio launcher/auth | bin/mktg-studio, auth, jobs, watcher, sse |
| 18 | CLI remaining cmds | release, studio, compete, transcribe, list, schema, context |
| 19 | native-publish + runtime | native-publish, runtime-compat, transcribe core, agents |
| 20 | CLI tests megafiles | skill-lifecycle.test, orchestrator, status, agent-native |
| 21 | CLI integration tests | postiz, skill-*, catalog, doctor, input-hardening |
| 22 | Studio e2e chrome/journey | chrome, user-journey, primitives, state |
| 23 | Studio real-pipeline/dx | real-pipeline/**, agent-dx, server tests |
| 24 | SEO playbooks | keyword-research, seo-*, ai-seo, off-page, competitor-alternatives |
| 25 | OpenSEO family | skills/openseo*, catalogs-manifest openseo |
| 26 | CMO + axi orchestrators | skills/cmo/**, skills/axi/** |
| 27 | oversized skills batch A | positioning-angles, landscape-scan, app-store, paper-marketing |
| 28 | oversized skills batch B | competitive-intel, send-email, audience, direct-response, typefully |
| 29 | manifests + brand schema | skills/agents/catalogs manifests, brand/SCHEMA |
| 30 | cross-cutting judo | whole-repo leverage synthesis after waves 1–2 |
