# Indie Hackers — How I'm giving my coding agent a marketing playbook

**Context:** Solo / small-team builders using Claude Code or Cursor. Marketing keeps resetting every chat.

---

## The pain

I can ship product with an agent. Marketing still looks like:

1. Open ChatGPT
2. Paste a half-remembered brand brief
3. Get generic posts
4. Lose the "memory" when the thread ends

That's not compounding. That's renting the same advice weekly.

## What I built / use: mktg

Open-source CLI: `npm i -g marketing-cli`

It installs **64 marketing skills** + **6 agents** into the agent's skill/agent dirs, plus a `brand/` folder schema (voice, audience, positioning, keywords…) that skills read on activation.

Key design choice: **progressive enhancement**. Skills work with zero brand files. As brand memory fills in, output gets sharper. Brand never blocks the first run.

Orchestration skill is `/cmo` — routes work, spawns research agents in parallel for foundation building.

There's also a local Studio UI in the same package (`mktg studio`) for humans who want to review artifacts without living in the terminal.

## Honest limits

- Social posting still needs your API keys / adapters (Postiz catalog, etc.)
- Not a HubSpot replacement
- You still steer strategy; the CLI orchestrates playbooks

## Ask

If you've tried "AI CMO" wrappers or prompt packs: what broke for you — memory, consistency, or control? Curious what would make an agent-native playbook stick for indie launches.
