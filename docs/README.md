# docs/

Documentation for `mktg` internals and contracts.

For runtime agent operation, start with root `CONTEXT.md` and the /cmo
indexes under `skills/cmo/rules/`:
`cli-runtime-index.md`, `publish-index.md`, and `studio-api-index.md`.

| File | What it covers |
|------|----------------|
| [skill-contract.md](skill-contract.md) | Skill format spec — frontmatter, body structure, manifest entry, validation |
| [transcribe.md](transcribe.md) | `mktg transcribe` command — usage, flags, pipeline, dependencies |
| [EXIT_CODES.md](EXIT_CODES.md) | Exit code reference — codes 0-6, constructors, agent usage |
| [cli-improvement-plan.md](cli-improvement-plan.md) | Phased CLI improvement plan — honest run lifecycle, plan/publish truth, portable route |
| [openseo-integration-plan.md](openseo-integration-plan.md) | Plan to make OpenSEO the first-class SEO data plane inside mktg |

## Subdirectories

| Directory | Contents |
|-----------|----------|
| `integration/` | Ecosystem integration notes and contracts |
| `thermo/` | Thermo (release/health) reports |
| `solutions/` | Past solutions and learnings |
| `dogfood-*/`, `utilized-offline-*/` | Dated dogfood / offline-usage session logs |
