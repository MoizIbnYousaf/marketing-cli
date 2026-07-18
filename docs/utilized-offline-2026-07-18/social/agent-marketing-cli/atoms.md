# Content Atoms — Agent-Native Marketing CLI

Source theme: **Agent-Native Marketing CLI** (article / launch narrative)
Slug: `agent-marketing-cli`
Voice: direct, proof-first · Prefer ship / compound / playbook / agent-native / dry-run / brand memory / orchestrate

---

## Key insights

| ID | Atom | Type |
|----|------|------|
| K1 | Coding agents ship product; marketing still resets every session because there's no persistent brand memory. | insight |
| K2 | mktg is an installable playbook (64 skills, 6 agents), not a prompt pack you paste once. | insight |
| K3 | Skills work at L0 (zero brand context); `brand/` memory sharpens them — never gates them. | insight |
| K4 | `/cmo` orchestrates marketing work; Studio (`mktg studio`) is for the human reviewing outputs. | insight |
| K5 | Agent DX is testable: JSON when piped, `--dry-run`, `--fields`, CI-enforced 21/21 axes. | insight |

## Quotable lines

| ID | Line |
|----|------|
| Q1 | "Install one CLI. Your agent gets 64 skills, 6 research agents, and brand memory that compounds." |
| Q2 | "CLI for the agent. Studio for the human." |
| Q3 | "Skills work at zero context. Brand memory makes them sharper — never a gate." |
| Q4 | "Prompts don't remember `brand/voice-profile.md` next Tuesday. mktg does." |
| Q5 | "Not another social scheduler. Schedulers can be adapters. This is the playbook." |

## Stats / proof points

| ID | Point |
|----|-------|
| S1 | 64 versioned skills (manifest-backed) |
| S2 | 6 research/review agents |
| S3 | Agent DX score 21/21 enforced in CI |
| S4 | One npm package: `npm i -g marketing-cli` → CLI + Studio tarball |

## Contrarian takes

| ID | Take |
|----|------|
| C1 | "AI CMO" chat wrappers without files, manifests, and dry-run are demos — not infrastructure. |
| C2 | Progressive enhancement beats gated "fill out your brand first" onboarding for agents. |
| C3 | Local-first brand memory compounds; cloud chat history does not. |

## Process / how-to

| ID | Steps |
|----|-------|
| P1 | `npm i -g marketing-cli` → `mktg init` → `/cmo` foundation (3 research agents) → write to `brand/` → ship social/SEO/launch artifacts under `marketing/` |

## Lists

| ID | List |
|----|------|
| L1 | What you get on install: skills, agents, brand schema, `/cmo`, `/axi`, Studio |
| L2 | What this is not: social scheduler SaaS, one-off GPT, enterprise MAP replacement |

## Platform map

| Atom | LinkedIn | X | Reddit | Bluesky | Threads | TikTok | YT Short |
|------|----------|---|--------|---------|---------|--------|----------|
| K1–K2 | LI-01 | X-01, thread | Show HN | BS-01 | TH-01 | script | short |
| K3, Q3 | LI-02 | X-02 | Indie Hackers | — | — | — | — |
| K4–K5, S1–S4 | LI-03 | X-03 | both | — | — | hook | hook |
| C1–C3 | debate angle | hot take | discussion | take | take | — | — |
| P1 | carousel-ready | thread body | how-to section | — | — | tutorial beat | tutorial beat |

## CTA inventory

- Primary: `npm i -g marketing-cli`
- Secondary: GitHub README / Show HN thread
- Tertiary: `mktg studio` after first `/cmo` run
