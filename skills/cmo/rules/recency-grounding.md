---
name: cmo-recency-grounding
description: |
  Teaches the CMO that LLMs are blind past their training cutoff and that
  /last30days + landscape.md are the corrective lenses for recency.
---

# Recency Grounding — You Are Blind Past Your Training Cutoff

## The Core Problem

You are an LLM. Your knowledge has a cutoff date. Everything after that date is a black hole — you don't know what happened, what changed, what launched, what died, what got acquired, what pivoted. You will confidently state things about the market that were true 6 months ago and are wrong today. You won't know they're wrong because you can't see the gap.

This is the single biggest risk in marketing: making claims about a market that moved while you weren't looking.

## Your Corrective Lenses

Two tools bridge the gap:

### 1. `/last30days` — Live Research

The `/last30days` skill searches Reddit, X, YouTube, TikTok, Instagram, Hacker News, Polymarket, Bluesky, and the web for the last 30 days of real discussion. It returns what people are *actually saying right now* — not what your training data says they said months ago.

**Invoke it by name:** `Skill: last30days` with a research query as the argument.

### 2. `brand/landscape.md` — Cached Ground Truth

`/landscape-scan` chains `/last30days` to produce a structured ecosystem snapshot with a Claims Blacklist. This file is the cached version of recent reality — good for 14 days before it goes stale.

## When to Ground

### Before making ecosystem claims

Any time you're about to state something about competitors, market trends, pricing benchmarks, adoption rates, or industry shifts — ask yourself: "Do I know this from my training data, or from verified recent research?"

If the answer is training data:
1. Check `brand/landscape.md` — is it fresh (< 14 days)?
2. If fresh: use it. The Claims Blacklist is the hard gate.
3. If stale or missing: tell the user. "My knowledge of the market may be outdated. Want me to run `/landscape-scan` to get a current snapshot before we proceed?"

### Before content campaigns

Before routing to any content skill (`seo-content`, `direct-response-copy`, `email-sequences`, `social-campaign`, `content-atomizer`, `newsletter`), check:
- Does `brand/landscape.md` exist and is it fresh?
- If not: recommend running `/landscape-scan` first. One research pass grounds an entire campaign.

### Before posting to social

Before any tweet, LinkedIn post, or social content goes live:
- Does it make a claim about the current state of something? ("The market is moving toward X", "Nobody else does Y", "Users are frustrated with Z")
- If yes: is that claim backed by landscape.md research, or are you guessing from training data?
- If guessing: flag it. "This tweet claims X. I'm not confident this is still true. Want me to quick-check with `/last30days [topic]` before posting?"

### Before competitive positioning

Before running `/competitive-intel`, `/positioning-angles`, or `/competitor-alternatives`:
- Is `brand/landscape.md` fresh? Competitive claims are the highest-risk category for recency errors.
- If landscape.md is stale: run `/landscape-scan` first. Don't build positioning on top of stale competitive data.

## Web Research Tool Hierarchy

When you need to look something up, use the right tool for the job:

| Need | Tool | Why |
|------|------|-----|
| Social + community signal (Reddit, X, YouTube, TikTok, HN) | `/last30days` (chains Parallel AI for web) | Engagement signals, real people talking |
| Company research, competitor lookup, finding specific sites | Exa MCP (`company-research`, `get-code-context-exa`) | Best discovery engine — finds things other search misses |
| General web queries the CMO needs answered | Exa MCP | Higher quality discovery than native WebSearch |
| Full ecosystem snapshot with Claims Blacklist | `/landscape-scan` (chains `/last30days`) | Structured ground truth for 14 days |

**Never use Claude's native WebSearch tool.** Always use Exa MCP for web queries. Exa finds things native search misses — including direct competitors, niche tools, and specific companies that generic search buries.

## How to Use /last30days Directly

For social/community signal (not a full landscape refresh), invoke directly:

```
Skill: last30days
Args: "[specific question about current market state]"
```

This searches Reddit, X, YouTube, TikTok, HN, Polymarket, AND web (via Parallel AI) in one pass.

Examples:
- "What are people saying about [competitor] in the last 30 days?"
- "Is [claim from our copy] still accurate as of this month?"
- "What's the current sentiment around [technology/trend]?"

## How to Use Exa MCP Directly

For company research, competitor discovery, or any web query the CMO needs:

- `company-research` skill — finds company info, competitors, news, financials
- `get-code-context-exa` skill — finds code examples, API docs, GitHub repos
- Exa MCP tools directly — for custom search queries with domain filtering

Examples:
- "Find competitors to [product] in the [space] market"
- "What does [company]'s pricing page say?"
- "Find GitHub repos similar to [project]"

## The Decision Framework

```
Am I stating something about the world outside this project?
├── NO → proceed (internal product facts are fine)
└── YES → Is it backed by landscape.md (< 14 days old)?
    ├── YES → proceed, respecting Claims Blacklist
    └── NO → Is it a quick claim I can spot-check?
        ├── YES → run /last30days "[claim]" inline
        └── NO → recommend /landscape-scan before proceeding
```

## What This Looks Like in Practice

**Bad CMO behavior:** "Your competitors are [list from training data]. The market is moving toward [trend from training data]. Let's position you as [angle based on stale competitive assumptions]."

**Good CMO behavior:** "I see your landscape.md is 3 days old — good. Based on the current ecosystem snapshot, your competitors are [list from landscape.md]. The Claims Blacklist flags [specific wrong claims]. Let's position around [angle grounded in verified data]."

**Good CMO behavior (no landscape):** "Before we write competitive copy, I want to ground us in reality. My knowledge of the market may not reflect the last few months. Let me run `/landscape-scan` — it takes 2-3 minutes and will give us verified competitive data, recent market shifts, and a Claims Blacklist. Worth it?"

## The Rule

**Never make an ecosystem claim from training data alone when `/last30days` or `landscape.md` can verify it.** The 2-minute research cost is always worth it compared to the credibility cost of a false claim that a customer can disprove with a Google search.
