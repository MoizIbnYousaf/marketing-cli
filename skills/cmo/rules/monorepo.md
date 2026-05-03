# Monorepo awareness

mktg is often developed alongside related projects, each with its own concerns and its own local instructions. /cmo routes across them most safely when it treats the current working directory as the source of truth and asks before writing outside it.

## The four siblings

```
<workspace>/
├── marketing-cli/     # the mktg CLI (TypeScript, Bun, MIT)
│                      # skills, agents, catalogs, and /cmo source live here
│                      # /cmo's own source is skills/cmo/
├── mktg-studio/       # the dashboard (Next.js + Bun server)
│                      # consumes the mktg CLI via HTTP + child_process
│                      # owns tabs, SQLite, SSE fan-out
├── mktg-site/         # the public marketing website for the mktg ecosystem
└── private-notes/     # optional private notes outside the public package
ORCHESTRATOR.md        # optional maintainer-only file ownership map
```

Each sibling can have its own `node_modules`, tests, package.json, and git history. If an ownership map exists, consult it before editing any file outside your primary zone.

## Cross-project protocol

Every mktg CLI invocation implicitly operates on a project's working directory — by default `process.cwd()`, overridable with `--cwd <path>`. When /cmo is reasoning across siblings:

**DO:**
- Explicitly pass `--cwd` when reading state from a different project: `mktg status --json --cwd <repo_path>`
- Re-read `brand/` files from the target project — never assume a brand profile carries over
- Call `mktg init --cwd <path>` when a sibling has no `brand/` directory yet
- Treat each sibling's `brand/learnings.md` as isolated memory — cross-pollination is manual and explicit

**DON'T:**
- Run `mktg` from marketing-cli while expecting it to read mktg-studio's brand files
- Generate content in one sibling and assume the voice profile applies to another
- Edit files in a sibling repo without flagging it to the user first — cross-project edits are a destructive action class, not a routine one

## Where things live (memorize)

| Need | Location |
|---|---|
| A marketing skill's source | `marketing-cli/skills/<name>/SKILL.md` |
| A skill's installed copy | `~/.claude/skills/<name>/SKILL.md` |
| /cmo's own rules (you're reading one) | `marketing-cli/skills/cmo/rules/*.md` |
| Skills manifest | `marketing-cli/skills-manifest.json` |
| Catalogs manifest | `marketing-cli/catalogs-manifest.json` |
| The studio launcher binary | `mktg-studio/bin/mktg-studio.ts` |
| The studio API server | `mktg-studio/server.ts` |
| The studio dashboard pages | `mktg-studio/app/(dashboard)/` |
| Studio SQLite schema | `mktg-studio/db/schema.sql` |
| postiz API reference (read-only) | `marketing-cli/docs/integration/postiz-api-reference.md` |
| A project's brand profile | `<project-root>/brand/*.md` — ten files, SCHEMA defined in `marketing-cli/brand/SCHEMA.md` |

## When a user says "the repo"

Ask which one, or infer from context, but never assume. A user working on content in their own product repo might say "add this to the repo" meaning their project — not mktgmono. The default target is whatever `process.cwd()` was when /cmo started, and the user's project usually sits outside `~/projects/mktgmono/` entirely.

## When building across siblings

Some workflows touch two siblings at once:

- **Launching the studio:** `mktg studio` (in marketing-cli or the user's project) spawns `mktg-studio/bin/mktg-studio.ts`. Neither repo's source is modified.
- **Publishing the CLI:** affects marketing-cli only. mktg-studio ships separately; see `marketing-cli/docs/plans/studio-distribution.md`.
- **Updating a skill:** edit `marketing-cli/skills/<name>/SKILL.md`, run `mktg update` (or `bun link` during dev), skill is then visible system-wide via `~/.claude/skills/`.

## Red flags

- Touching another maintainer's primary zone without coordination. Shared surfaces (CLAUDE.md, AGENTS.md, CONTEXT.md, README.md, CHANGELOG.md, package.json files) require explicit coordination.
- Adding `@postiz/*` to marketing-cli's `package.json` — NEVER. A package.json test asserts these stay absent. postiz is an AGPL upstream consumed via raw `fetch` only; there is no in-tree postiz source to reference, only the API docs at `marketing-cli/docs/integration/postiz-api-reference.md`.
- Copying brand files between siblings — almost always wrong. Each sibling is a distinct brand (marketing-cli brands itself as a CLI; mktg-studio brands itself as a studio; the user's product brands itself as whatever it is).
- Running site scripts or writing to private notes without approval.

## Sanity check

Before running anything that writes outside the current working directory, print the resolved path and confirm. Example:

> "I'm about to edit `<workspace>/marketing-cli/skills/cmo/SKILL.md` — that's /cmo's own source, not your project. OK to proceed?"

Cross-sibling writes are a rare, explicit action — not a default.
