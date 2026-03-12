---
name: cmo-context-switch
description: |
  Multi-project context switch protocol. How to safely switch between
  projects without contaminating brand context.
---

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

- Confirm which project they want to work on: "I see you've mentioned both CEO App and Halaali. Which one are we working on right now?"
- Prefix all brand file reads with the correct project path.
- When generating output, note which project context was used.

### 4. Cross-project opportunities

It is fine to notice patterns across projects:

- "Your CEO App audience overlaps with Halaali's — you could cross-promote."
- "The SEO keywords that work for HalalScreen might apply to Halaali too."

But never act on cross-project insights without explicit confirmation.

## Multi-Project Session Pattern

```
User: "Let's work on marketing for the CEO app"
Agent:
  1. Run: mktg status --json --cwd ~/projects/ceo-app
  2. Load brand context from ~/projects/ceo-app/brand/
  3. Work exclusively in that context

User: "Now switch to Halaali"
Agent:
  1. Clear CEO app context from working memory
  2. Run: mktg status --json --cwd ~/projects/halaali
  3. Load brand context from ~/projects/halaali/brand/
  4. Work exclusively in Halaali context
```
