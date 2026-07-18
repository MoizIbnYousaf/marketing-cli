# Product Brief — mktg (marketing-cli)

## Name
**mktg** · npm package `marketing-cli`

## One-liner
Agent-native marketing playbook — one CLI install gives your coding agent 64 skills, 6 research agents, and brand memory that compounds across sessions.

## Category
Agent tooling / marketing infrastructure for AI-native builders

## Problem
Coding agents ship product well. Marketing resets every session: no persistent brand files, no installable skills, no dry-run safety — just chat residue.

## Solution
- Installable skills + agents (`mktg init` / `mktg update`)
- Persistent `brand/` memory with progressive enhancement (L0 → L4)
- `/cmo` orchestrates marketing; `/axi` routes agent-ergonomic tools
- Local Studio dashboard in the same tarball (`mktg studio`)
- Agent DX: JSON when piped, `--dry-run`, `--fields`, CI-tested axes

## Who it's for
Solo founders and agent builders on Claude Code / Cursor / Codex who need launch/SEO/social output that compounds without hiring a CMO.

## Who it's not for
- Teams seeking a full enterprise MAP (HubSpot-class)
- Users who only want a social scheduler
- Buyers who want opaque "AI CMO" chat with no files on disk

## Proof points
| Proof | Detail |
|-------|--------|
| Skills | 64 versioned, manifest-backed |
| Agents | 6 research/review |
| DX | 21/21 Agent DX score enforced in CI |
| Packaging | CLI + Studio, one npm install |

## Install
```bash
npm i -g marketing-cli
mktg init
mktg doctor
```

## Differentiation vs adjacent
| Adjacent | Gap they leave | mktg |
|----------|----------------|------|
| Prompt packs | No versioning / memory | Skills + `brand/` |
| Schedulers | Queue ≠ playbook | Orchestration + adapters |
| AI CMO apps | Opaque | Open, testable, local-first |

## Launch assets map
| Asset | Path |
|-------|------|
| Show HN | `marketing/startup-launcher/show-hn.md` |
| Directories | `marketing/startup-launcher/directory-tracker.md` |
| Universal copy | `marketing/startup-launcher/universal-copy.md` |
| Social atoms | `marketing/social/agent-marketing-cli/` |
| Pitch deck | `marketing/slides/mktg-pitch.html` |
