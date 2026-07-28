# Thermo-nuclear code quality audit — whole repo (2026-07-28)

Twelve parallel Grok 4.5 thermo-nuclear-code-quality-review subagents audited the repo by partition. Verdict: **do not approve as structurally healthy**; several god-files and dual sources of truth are active debt. This branch applies the highest-leverage code-judo moves that preserve behavior.

## Consensus blockers (from subagents)

| Area | Finding |
|---|---|
| `studio/server.ts` (~3.1k) | God-file; dual wrapRoute vs if-ladder; double rate-limit |
| `src/commands/publish.ts` (~1.2k) | God-command; Postiz island; adapter loop copy-paste; dual PublishItem |
| `src/core/skill-lifecycle.ts` (~828) | Second god-file; writer-index ×3; incomplete flag extract |
| Studio `lib/` | Forked types/Postiz/DX/freshness vs CLI |
| CLI surface | HELP ↔ COMMANDS ↔ globalFlags drift |
| OpenSEO skills | Backend Selection copy-pasted ×6; fake `upstream` without checkers |
| Tests | No shared CLI harness; soft-skip false greens; megafiles |

## Applied on this branch

1. **Split publish** → `src/core/publish/{types,builtins,adapters,postiz,registry}.ts`; command ~296 lines; catalogs import builtins once.
2. **Split skill-lifecycle** → frontmatter/graph/prerequisites/register/evaluate + barrel; shared `indexWriters`; dead `inDegree` pass deleted.
3. **Studio server peel** → `studio/server/routes/{activity,brand,signals}.ts` + `http.ts`; server ~2570; wrapRoute rate-limit de-duplicated (perimeter-only).
4. **Canonical args/monorepo** → `verify` / `ship-check` / `cmo` / `studio` (and publish handler) use `src/core/args.ts`; `resolveMonorepoRoot` lives in `src/core/monorepo.ts`.
5. **HELP drift** → document `route`, `seo`, `release`, `--input`.
6. **SSRF redirect** → `fetchWithSizeCap` follows one hop non-recursively.
7. **Brand write root** → `writeBrandFile` mkdirs `dirname(abs)` and computes real char delta.
8. **Dead UI** → deleted unused `activity-feed.tsx`.
9. **OpenSEO backend contract** → `skills/openseo/references/backend-contract.md`; six playbooks point at it.

## Next extractions (not in this PR)

Ranked by leverage from the cross-cutting judo pass:

1. Finish `studio/server.ts` route registry (content/publish/settings).
2. Shared `@mktg/domain` (validators, PublishItemStatus, brand specs) — kill Studio forks.
3. Collapse `mktg dashboard` toward Pulse / status / plan.
4. Shared Postiz client for Studio `lib/postiz.ts`.
5. `tests/helpers/cli.ts` + kill soft skill-not-installed skips.
6. File-budget CI (soft 400 / hard 1000; allowlist shrink-only for remaining giants).
