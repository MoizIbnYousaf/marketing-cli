# Brand Voice Profile

mktg-studio is the visual layer for `marketing-cli` — a local-first dashboard
that turns `/cmo` (a Claude Code skill) and 50 marketing skills into a working
marketing department on a builder's laptop. We talk to founders, indie hackers,
and AI-tool engineers who want a marketing team but refuse to hire one.

## Voice DNA

**Tone:** Confident expert, never pedantic. We sound like the senior CMO you'd
hire if you could afford one — tight, concrete, occasionally funny, allergic to
buzzwords. We treat the reader as a peer building something real.

**Three adjectives:** *operator-grade*, *fast*, *honest*.

## Words we use

- "Ship", "land", "stand up", "wire", "instrument" — verbs that imply action
- "Concrete", "specific", "measurable", "in production" — favouring the real
- "Founder", "builder", "operator", "indie", "agent-native" — speaking to peers
- "/cmo", "skill", "playbook", "brand memory" — domain primitives, not generic
- "Local-first", "BYOAI", "offline-capable" — values we share with the reader

## Words we never use

- "Synergy", "leverage", "unleash", "supercharge", "delight", "unlock potential"
- "AI-powered" / "powered by AI" (assumed, not a feature)
- "Solution" (it's a *tool*, a *studio*, a *playbook* — be specific)
- "Game-changer", "revolutionary", "best-in-class", "world-class"
- "Stakeholders", "ecosystem", "thought leader"
- Em-dash overuse — we use them, but never to dress up a weak sentence

## Sentence patterns

- **Lead with the verb.** "Ship a launch in 48 hours, not three weeks."
- **Numbers up front.** "30+ social platforms via one publish call."
- **Specific over abstract.** "Your Activity panel updates in 50ms" beats
  "real-time updates."
- **One idea per sentence.** Long sentences earn their length.

## Reading level

Engineering-literate generalist. Roughly *Hacker News front page* — assumes the
reader knows what an LLM, an SSE stream, and a SQLite file are, but won't gate
ideas on framework specifics. Acronyms get expanded on first use.

## Voice in the wild — examples

- ✅ "Your /cmo runs in your terminal. The dashboard shows you what it just
  did." *(operator, concrete, no marketing fluff)*
- ✅ "30+ social platforms. One adapter. Zero AGPL coupling." *(specific
  numbers, technical pride, terse)*
- ❌ "Empower your marketing team to unleash the full potential of AI." *(every
  word is a buzzword; says nothing)*
- ❌ "Revolutionize your workflow with our cutting-edge solution." *(generic
  SaaS slop — unusable)*

## Voice when we're degraded / something's broken

Honest. We don't dress up failure modes. *"Your local mktg CLI is v0.1.0 — the
postiz adapter needs ≥0.2.0. Run `npm i -g marketing-cli@latest` and reload."*
beats *"We're working hard to bring you the best experience."* every time.

## Source: who decides this

This voice profile was authored 2026-04-18 by /cmo during a live studio QA
session. Updated whenever the brand evolves enough that an honest reader would
notice the drift. Owned by [brand-voice](skills/brand-voice/SKILL.md).