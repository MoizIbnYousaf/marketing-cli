# Research: ASC CLI Philosophy — CLAUDE.md, AGENTS.md, and DX Patterns

## Context

The [App Store Connect CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI) (`asc`) is a Go-based, agent-assisted CLI for the App Store Connect API. It's one of the most mature agent-native CLIs in the ecosystem. This research extracts patterns we can adopt for `mktg`.

## Key Findings

### 1. CLAUDE.md Structure — What ASC Has That We Were Missing

ASC's CLAUDE.md is significantly more operational than ours. Key sections we lacked:

| ASC Section | What It Does | Adopted? |
|---|---|---|
| **Discovering Commands** | Tells agents to run `--help` instead of memorizing | Yes — added self-documenting command section |
| **Build & Test** | Exact commands to build, test, lint, format | Yes — added dev workflow section |
| **PR Guardrails** | Checklist agents must run before opening PRs | Yes — added PR checklist |
| **Issue Triage & Labeling** | Structured label taxonomy (type/priority/difficulty) | No — premature for mktg's current stage |
| **Testing Discipline** | TDD requirements, realistic CLI patterns | Partially — added testing guidance |
| **Debugging & Bug Fixing** | Reproduce-first, one-change-at-a-time philosophy | Yes — adopted as debugging principles |
| **Definition of Done** | Explicit completion criteria for changes | Yes — added definition of done section |
| **Agent Explainability Contract** | Why-this-approach documentation requirement | Yes — adopted |
| **Command Lifecycle** | experimental → stable → deprecated → removed | No — premature, but noted for later |
| **Environment Variables** | Table of all env vars with purpose | No — mktg doesn't have env vars yet |
| **References** | Pointers to deeper docs, read only when needed | Yes — added references section |

### 2. AGENTS.md — The External Agent Interface

ASC's `AGENTS.md` is a concise project description with core principles, designed for external agents (not the project's own Claude). It's essentially a shorter, public-facing version of CLAUDE.md that any agent can consume.

**Key pattern:** AGENTS.md exists separately from CLAUDE.md because they serve different audiences:
- `CLAUDE.md` → internal development instructions (how to work ON the project)
- `AGENTS.md` → external usage instructions (how to USE the project)

**Adopted?** Not yet. For mktg, the external agent interface is the `/cmo` skill and the skills themselves. When mktg is published, an AGENTS.md could help other agents discover and use it, but it's premature now.

### 3. llms.txt — The LLM Discovery Document

ASC's `llms.txt` is a structured, plain-text document designed for LLMs to quickly understand the project. Key characteristics:

- **Format:** Markdown-like but minimal, designed for token efficiency
- **Content:** Project snapshot, install instructions, common workflows, env vars, implementation notes
- **Purpose:** Give any LLM enough context to help a user without reading the full docs
- **Keywords section:** SEO-like terms for LLM retrieval

**Adopted?** Yes — created `llms.txt` for mktg. The pattern makes sense because:
1. mktg is designed to be used by agents — they need a quick-reference doc
2. It serves as a compressed onboarding doc for any LLM helping with the project
3. It complements CLAUDE.md (which is development-focused) with usage-focused content

### 4. README Structure and Presentation

ASC's README follows a clear hierarchy:
1. Badges and banner (visual identity)
2. One-line description
3. Table of contents
4. Quick start (install → auth → first command)
5. Common workflows (copy-pasteable examples)
6. Commands reference (points to `--help` and docs/)
7. Documentation links
8. Contributing
9. License

**Key insight:** Their README is workflow-oriented, not feature-oriented. Instead of listing every command, they show common tasks and how to accomplish them.

**Not adopted yet** — mktg doesn't have a proper README. This pattern should inform it when we write one.

### 5. Documentation Organization

ASC's `docs/` structure:
```
docs/
├── images/           # Visual assets
├── openapi/          # API schema snapshots
├── API_NOTES.md      # API quirks
├── CI_CD.md          # CI/CD integration guides
├── COMMANDS.md       # Auto-generated command reference
├── CONTRIBUTING.md   # Internal dev notes (separate from root CONTRIBUTING.md)
├── GO_STANDARDS.md   # Language-specific coding standards
├── TESTING.md        # Testing patterns
├── WORKFLOWS.md      # Reusable workflow patterns
└── wall-of-apps.json # Community showcase data
```

**Key pattern:** They separate root-level docs (for contributors) from `docs/` (for deeper reference). CLAUDE.md points to `docs/` files with "only read when needed" guidance — this keeps CLAUDE.md lean.

**Adopted:** Added a References section to CLAUDE.md that points to deeper docs.

### 6. Onboarding Philosophy

ASC makes onboarding frictionless through:
1. **Self-documenting CLI:** `--help` is the source of truth, not docs
2. **Progressive disclosure in CLAUDE.md:** Core info up top, references to deeper docs at bottom
3. **Explicit "do not memorize" instruction:** Agents should always check `--help` for current interface
4. **Local validation checklist:** Exact commands to run before opening a PR

**Adopted:** All four patterns incorporated into mktg's CLAUDE.md.

## Patterns We Deliberately Did NOT Adopt

1. **Issue triage labels** — mktg is too early-stage for a formal label taxonomy
2. **Command lifecycle states** — No stable commands yet to deprecate
3. **OpenAPI/schema snapshots** — mktg doesn't wrap an external API
4. **Environment variable table** — No env vars defined yet
5. **AGENTS.md** — The `/cmo` skill serves this purpose for now

## Philosophy Comparison

| Dimension | ASC CLI | mktg |
|---|---|---|
| Primary user | Agents + developers | Agents (agent-first) |
| Output model | TTY-aware (table/json) | JSON-only (agent-native) |
| CLI style | Explicit long flags | Explicit long flags (aligned) |
| Interactive prompts | `--confirm` for destructive ops | `--dry-run` for previews |
| Self-documentation | `--help` everywhere | `mktg schema` for introspection |
| Testing | TDD, CLI-level + unit | E2E test suite |
| Skill system | Separate skills repo | Skills bundled in package |

## Summary of Changes Made

1. **CLAUDE.md** — Added 7 new sections inspired by ASC patterns:
   - Discovering Commands (self-documenting CLI)
   - Dev Workflow (build/test/lint commands)
   - PR Guardrails (pre-PR checklist)
   - Debugging Principles (reproduce-first methodology)
   - Definition of Done (explicit completion criteria)
   - Agent Explainability (document why, not just what)
   - References (pointers to deeper docs)

2. **llms.txt** — Created new file following ASC's pattern, adapted for mktg's agent-native context

3. **This document** — Research analysis and decision log
