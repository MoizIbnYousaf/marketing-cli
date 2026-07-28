# mktg vs Generic Prompt Packs

Prompt packs, Notion swipe files, and "100 marketing prompts" PDFs are common. Here's an honest split.

## Short answer
Prompt packs are **content**.  
mktg is **installable infrastructure**: versioned skills, manifests, agents, brand memory, and a CLI contract agents can actually run.

---

## Where prompt packs win

| Strength | Why it matters |
|----------|----------------|
| Instant | Download a PDF, copy a prompt |
| Cheap / free | Low commitment |
| Tool-agnostic | Works in any chat UI |
| Good for learning | Teaches frameworks quickly |
| No install friction | Zero deps |

For a workshop exercise or a one-hour brainstorm, a pack is fine.

---

## Where mktg wins

| Strength | Why it matters |
|----------|----------------|
| Versioned skills | Update path (`mktg update`), not a stale Google Doc |
| Drop-in contract | SKILL.md + `skills-manifest.json` — no CLI rewrite |
| Brand memory | Skills read `brand/` on activation with fallbacks |
| Orchestration | `/cmo` routes; agents research in parallel |
| Safety rails | `--dry-run`, `--confirm`, sandboxed paths |
| Tested DX | Machine-readable output, schema, field filters |
| Studio | Human review of artifacts, same package |
| Compounding | Last session's brand files feed next session's output |

---

## Side-by-side

| Dimension | Prompt pack | mktg |
|-----------|-------------|------|
| Delivery | Doc / PDF / GPT instructions | npm CLI + skill dirs |
| Memory | None (or chat-side) | `brand/` schema |
| Consistency | Depends on paste quality | File-backed voice/positioning |
| Updates | Manual re-download | `mktg update` |
| Agent install | Copy-paste | `mktg init` |
| Extensibility | Add more prompts | Drop-in skills/agents/catalogs |
| Evaluation | Vibes | Tests + Agent DX axes |

---

## When to upgrade from a pack
- You've pasted the same brand brief ≥3 times  
- Outputs drift in voice week to week  
- You want research agents writing real files  
- You need dry-run before an agent mutates the repo  

## Fair warning
A great prompt pack plus disciplined personal notes can beat a poorly maintained skill install. mktg wins when you want the **system** — not when you want a single clever paragraph once.

## CTA
```bash
npm i -g marketing-cli
mktg init
```
Keep your favorite prompts — promote the ones that work into `brand/` and skills.
