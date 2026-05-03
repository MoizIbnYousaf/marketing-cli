---
name: cmo-context-switch
description: |
  Multi-project context switch protocol. How to safely switch between
  projects without contaminating brand context.
---

> **Note:** Examples below use fictional brands (Acme, Lumi, Helm). Replace with your own brand context.

# Context Switch Protocol

The /cmo skill supports multiple projects. Each project has its own `brand/` directory with its own voice, audience, and positioning. Brand context must never leak between projects.

## Rules

### 1. Always verify project identity first

Before any marketing work, run:

```bash
mktg status --json --cwd <target-path>
```

Verify the project name in the output matches the user's intent.

### 2. Never carry brand context across projects

When switching from Project A to Project B:

- Do not apply Project A's voice profile to Project B's content.
- Do not assume Project B's audience matches Project A's.
- Do not reuse positioning angles, keywords, or competitive data.
- Run a fresh `mktg status --json --cwd <path>` for the new project.

### 3. Explicit project declaration

If the user mentions multiple projects in one session:

- Confirm which project they want to work on: "I see you've mentioned both Helm and Acme. Which one are we working on right now?"
- Prefix all brand file reads with the correct project path.
- When generating output, note which project context was used.

### 4. Cross-project opportunities

It is fine to notice patterns across projects:

- "Your Helm audience overlaps with Acme's — you could cross-promote."
- "The SEO keywords that work for Lumi might apply to Acme too."

But never act on cross-project insights without explicit confirmation.

## Multi-Project Session Pattern

```
User: "Let's work on marketing for Helm"
Agent:
  1. Run: mktg status --json --cwd ~/projects/helm
  2. Load brand context from ~/projects/helm/brand/
  3. Work exclusively in that context

User: "Now switch to Acme"
Agent:
  1. Clear Helm context from working memory
  2. Run: mktg status --json --cwd ~/projects/acme
  3. Load brand context from ~/projects/acme/brand/
  4. Work exclusively in Acme context
```

## Bootstrapping a fresh project

If the target directory has no `brand/` (i.e., `mktg status --json` returns `health: "needs-setup"`):

1. **Ask the user if they have a public URL for the project.**
   - YES → offer `mktg init --from <url> --yes`. This scrapes the URL via firecrawl + chains foundation skills to auto-populate `voice-profile.md`, `positioning.md`, `audience.md`, `competitors.md` with real data. Roughly 90 seconds, end-to-end.
   - NO → offer `mktg init --yes`. Scaffolds `brand/` with templates + installs all 50 skills + 5 agents + catalogs. User fills in brand files via the Full Product Launch playbook.
2. Confirm the project name that landed matches the user's intent (`mktg status --json` after init returns `project.name`).
3. Route based on the ladder (see `rules/progressive-enhancement.md`) — a fresh init is L0.

## Brand/ isolation per project

Each project owns its own `brand/` directory sitting at the project's `cwd`. There is no global `brand/`; isolation is by directory boundary, enforced by `--cwd` on every `mktg` call.

- **Never** write to `~/.config/mktg/` or any shared location for brand data. Brand lives in the project.
- **Never** read brand files from another project to seed the current one. If the user wants to copy a voice profile from Project A to Project B, they do it explicitly via `mktg brand export` + `mktg brand import --confirm`.
- **Learnings are project-scoped.** `brand/learnings.md` in Project A doesn't inform routing in Project B — even if the same builder runs both.

## Project-aware command invocation

Every `mktg` command CMO runs in multi-project mode passes `--cwd`:

```bash
mktg status --json --cwd ~/projects/helm
mktg plan next --json --cwd ~/projects/helm
mktg publish --adapter postiz --dry-run --cwd ~/projects/helm --input '...'
```

Omitting `--cwd` defaults to `process.cwd()` — fine for single-project terminals, dangerous in a multi-project session. When in doubt, be explicit.

## Cross-project "noticing" vs acting

CMO can mention patterns across projects (*"Helm's audience watering holes overlap with Acme's — could be worth cross-promotion"*) but never *acts* on cross-project insights without explicit confirmation. The builder owns the decision.
