# Agent Marketing CLI: Give Your Coding Agent a Playbook That Compounds

**Meta description:** An agent marketing CLI installs versioned skills, research agents, and brand memory your coding agent can reuse across sessions — not another prompt you paste once.

---

Your coding agent ships features fine. Marketing is where the session falls apart.

You paste a brief. The agent writes a launch post. Tomorrow you open a new chat and explain the brand again — voice, ICP, what you refuse to claim. The output drifts. You end up with a folder of one-off drafts and no operating system.

An **agent marketing CLI** is the fix for that loop. Instead of prompts that die with the context window, you install a playbook: skills the agent can run, agents it can spawn for research, and brand files that persist on disk. The work compounds.

This article explains what that category is, why "prompt packs" are not enough, and how to evaluate (and try) an agent-native marketing stack — with mktg as a concrete example.

## What "agent marketing CLI" actually means

Strip the buzzwords. An agent marketing CLI is a command-line tool designed so a coding agent (Claude Code, Cursor, Codex, and peers) can run marketing work with the same contracts it already uses for code:

- **Installable skills** with manifests, not a PDF of tips
- **Predictable commands** with JSON output, dry-runs, and field filters
- **Persistent brand memory** in the repo (`brand/`), not hidden in a chat product
- **Orchestration** so the agent routes "write a launch plan" to the right skill instead of improvising

If a tool only works when a human clicks through a SaaS UI, it is not agent-native. If it works when your agent shells out, reads files, and writes deliverables under `marketing/`, you are in the right category.

mktg is built for that shape: `npm i -g marketing-cli`, then `mktg init` installs skills and agents into your agent environment and scaffolds brand memory. Studio ships in the same tarball for humans who want a dashboard (`mktg studio`). CLI for the agent. Studio for the human.

## Why prompt packs and "AI CMO" chat apps stall

Most teams try one of three dead ends first.

**1. Prompt packs / custom GPTs.** Useful once. They do not version cleanly, do not verify integrity, and do not leave structured memory in the project. Next session, you are copy-pasting again.

**2. Traditional marketing automation platforms.** Powerful for human operators. Heavy for a solo founder whose runtime is a coding agent. Your agent cannot treat HubSpot as a local skill tree.

**3. Opaque "AI CMO" wrappers.** Chat-shaped products that hide prompts and charge for mystery. Hard to dry-run. Hard to test. Hard to keep MIT-clean when they bundle whatever SDK is trendy.

What builders actually need is closer to infrastructure: drop-in skills, a registry, tests, and brand files with freshness rules. Skills should work at zero context (L0) and get sharper when brand memory exists — never blocked because a template is empty. That progressive enhancement rule matters. Gating every skill on a perfect brand folder is how tools punish the people who just installed them.

## The core loop: skills, agents, brand memory

A working agent marketing CLI usually has three layers.

### Skills (the playbook)

Skills are procedures your agent can activate: launch strategy, SEO content, lead magnets, email sequences, document review, competitive intel. In mktg, those ship as `SKILL.md` files backed by `skills-manifest.json` — dozens of them (64 in the current playbook), installable and updateable.

Good skills are boring in the best way: clear inputs, file outputs under `marketing/`, anti-patterns with reasons, and brand file reads that degrade gracefully.

### Research agents (parallel help)

Some work should not be serial. Audience research, brand voice drafts, and competitive scans can run as sub-agents that write into `brand/` while you keep orchestrating. mktg ships research and review agents for that pattern — six agents the orchestrator can spawn instead of one overloaded chat.

### Brand memory (the compound interest)

Brand memory is a small set of markdown files: voice, positioning, audience, competitors, landscape, keywords, creative kit, stack, plus append-only assets and learnings. Skills read them. Future sessions start warmer.

The line to remember: skills work at zero context. Brand memory makes them sharper — never a gate.

When brand files stay as empty templates, you get generic output. When you fill them — even roughly — launch plans, SEO articles, and emails start sounding like one company. That is the whole point of an agent marketing CLI versus a clever prompt.

## What to look for when you evaluate tools

Use this checklist before you commit your workflow.

**Agent contracts.** Does every mutating command support a dry-run? Can you get JSON when piped? Can you filter fields so you do not blow the context window? mktg treats those as product requirements (Agent DX score enforced in CI), not nice-to-haves.

**Local-first memory.** Are brand artifacts in your repo where git can track them? If memory lives only in a vendor chat, you do not own the compounding.

**Honest positioning.** Does the tool admit what it is not? mktg is not a social scheduler SaaS; schedulers can be adapters. It does not claim to replace an enterprise marketing org on day one.

**Orchestration.** Is there a single entry skill (for mktg, `/cmo`) that routes work, or do you hand-pick twenty prompts from memory?

**Ecosystem without license traps.** Upstream catalogs (for example social providers via HTTP) should not force AGPL into your dependency tree. Raw fetch beats "just install their SDK."

**Human escape hatch.** Agents do the work; humans still want a dashboard sometimes. Shipping Studio beside the CLI is a practical answer.

## A practical first 30 minutes

You do not need a full CMO function to validate the category.

1. Install the CLI and run init.
2. Open `brand/voice-profile.md` and `brand/positioning.md`. Write the ugly truthful version — personality, words you refuse, one-liner, anti-positioning.
3. Ask your agent to run a document review on `brand/` so you know what is partial vs complete.
4. Run one offline skill end-to-end: launch plan, SEO article, or lead magnet. Inspect files under `marketing/`.
5. Save one learning in `brand/learnings.md` about what the agent got wrong. That file is how the system improves.

If those steps feel natural, you have found an agent-native workflow. If you are still pasting a 2,000-word prompt into a fresh chat every Monday, you are paying a tax an agent marketing CLI is designed to remove.

## How mktg maps to the category

Install one CLI. Your agent gets 64 skills, 6 research agents, and brand memory that compounds.

Concrete differentiators worth verifying yourself:

1. Manifest-backed skills with a drop-in contract
2. Persistent `brand/` memory with freshness and template detection
3. Agent DX rails: JSON, `--dry-run`, `--fields`, input hardening
4. `/cmo` for marketing orchestration; Studio via `mktg studio` for humans
5. Upstream catalogs over HTTP so license firewalls stay clean

Distribution is boring on purpose: npm package `marketing-cli`, GitHub `MoizIbnYousaf/marketing-cli`. Boring distribution is good. You want install friction low and skill quality high.

## Common objections

**"Can't my agent just read a STYLEGUIDE.md?"**  
It can. A styleguide is one file. A playbook is skills plus orchestration plus append-only learnings plus research agents. The styleguide is necessary; it is not sufficient.

**"I already pay for a scheduler."**  
Keep it. An agent marketing CLI should orchestrate and write; posting adapters can call tools you already use. Playbook ≠ publisher.

**"Will this replace our agency?"**  
For a solo founder or tiny team, it can cover a large share of first-draft and systems work. For a complex enterprise org, treat it as agent infrastructure beside humans — not a press-release fantasy.

## CTA: run the playbook, do not collect prompts

If you are problem-aware — tired of re-briefing your agent, tired of marketing output that resets every session — try the install path and judge the files on disk:

```bash
npm i -g marketing-cli
mktg init
mktg doctor --json
```

Then fill voice and positioning, run one skill, and see whether tomorrow's session starts smarter.

Install one CLI. Your agent gets 64 skills, 6 research agents, and brand memory that compounds.

Repo: [github.com/MoizIbnYousaf/marketing-cli](https://github.com/MoizIbnYousaf/marketing-cli)  
npm: `marketing-cli`

---

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Agent Marketing CLI: Give Your Coding Agent a Playbook That Compounds",
  "description": "An agent marketing CLI installs versioned skills, research agents, and brand memory your coding agent can reuse across sessions — not another prompt you paste once.",
  "author": {
    "@type": "Organization",
    "name": "marketing-cli",
    "url": "https://github.com/MoizIbnYousaf/marketing-cli"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://github.com/MoizIbnYousaf/marketing-cli"
  },
  "about": [
    "agent marketing cli",
    "agent-native marketing",
    "brand memory for agents",
    "claude code marketing skills"
  ],
  "keywords": [
    "agent marketing cli",
    "ai cmo cli",
    "marketing playbook",
    "brand memory",
    "claude code",
    "cursor",
    "codex"
  ],
  "datePublished": "2026-07-18",
  "dateModified": "2026-07-18"
}
```
