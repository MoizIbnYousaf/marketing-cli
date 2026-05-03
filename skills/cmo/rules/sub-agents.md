# Sub-Agent Orchestration

/cmo spawns specialized sub-agents for parallel research and post-production review. Agents never call agents — /cmo is the only orchestrator. This file documents when and how to invoke each of the 5 agents in `agents-manifest.json`.

**Canonical rule:** research agents spawn on first-run foundation building (3 in parallel). Review agents spawn on-demand after content lands.

---

## The 5 Agents

### Research agents (parallel, spawned on FIRST RUN)

| Agent | Writes | Reads | Skill methodology it follows |
|---|---|---|---|
| `mktg-brand-researcher` | `brand/voice-profile.md` | project README, website, existing content | `brand-voice` SKILL.md |
| `mktg-audience-researcher` | `brand/audience.md` | project context, market space | `audience-research` SKILL.md |
| `mktg-competitive-scanner` | `brand/competitors.md` | project context, known competitors | `competitive-intel` SKILL.md |

### Review agents (on-demand, post-content)

| Agent | Purpose | Invoke after | Scores (doesn't write) |
|---|---|---|---|
| `mktg-content-reviewer` | Voice-profile consistency gate | any content draft (DRC, SEO, email, social, newsletter, lead-magnet) | Reads `brand/voice-profile.md` |
| `mktg-seo-analyst` | Keyword-plan adherence gate | any SEO asset (seo-content, landing page, competitor-alternatives, ai-seo output) | Reads `brand/keyword-plan.md` |

---

## First-Run Spawn Protocol (the 3 research agents in parallel)

On `/cmo` FIRST RUN — brand files are templates, no real data — spawn **all three research agents in a single message** (one message with 3 Agent tool calls) for maximum parallelism. Foundation research is the biggest time sink; parallelizing saves 10+ minutes.

**Message pattern:**

```
<Agent tool call 1>
  subagent_type: mktg-brand-researcher
  description: Extract brand voice
  prompt: [project name] + [URL if provided] + [what the project does]
         + "Write brand/voice-profile.md. Follow the brand-voice SKILL
            methodology. Do not ask questions — research, analyze, write."

<Agent tool call 2>
  subagent_type: mktg-audience-researcher
  description: Build audience profile
  prompt: [project name] + [market space] + [problem it solves]
         + "Write brand/audience.md. Follow the audience-research SKILL
            methodology. Spawn sub-searches via Exa as needed."

<Agent tool call 3>
  subagent_type: mktg-competitive-scanner
  description: Scan competitors
  prompt: [project name] + [market space] + [known competitors if any]
         + "Write brand/competitors.md. Follow the competitive-intel SKILL
            methodology. Use Exa for live market research."
```

**Critical**: send all 3 tool calls in ONE message. Sequential spawns waste 2-3× the wall-clock time.

**What /cmo does while they run:**
- Tell the user: *"Three research agents are running in parallel — brand-voice, audience, competitors. ETA 5-10 minutes. I'll stitch the outputs when they land."*
- Don't start other skills. Wait for all 3.
- When they all return, read the 3 brand files, share what you learned, route to `positioning-angles` (which needs all 3 inputs).

**Fallback (no agents installed):** if `mktg doctor` shows agents missing, load the 3 foundation skills sequentially instead — `brand-voice`, then `audience-research`, then `competitive-intel`. Slower but identical artifact shape.

---

## On-Demand Review Invocation

### `mktg-content-reviewer` — voice consistency gate

**When /cmo invokes it:**
- After `direct-response-copy` produces landing page, sales copy, cold email.
- After `seo-content` produces an article.
- After `email-sequences` drafts a sequence (review the full flow together).
- After `content-atomizer` produces multi-platform posts (one review pass over the batch).
- After `newsletter` drafts an issue.
- After `social-campaign` Phase 3 (this agent IS the voice gate of that phase).

**Spawn pattern:**

```
<Agent tool call>
  subagent_type: mktg-content-reviewer
  description: Voice consistency review
  prompt: [file paths to review] + "Read brand/voice-profile.md. Score this
         content against the voice profile. Return structured feedback —
         what matches the voice, what drifts, specific rewrite recommendations.
         Do not rewrite; report only."
```

**What /cmo does with the result:**
- If score ≥ threshold (PASS) → present to user for approval, move on.
- If score < threshold (FAIL) → go back to the content skill with the specific rewrite recommendations. Don't ship drifted content.

### `mktg-seo-analyst` — keyword adherence gate

**When /cmo invokes it:**
- After `seo-content` produces an article.
- After `competitor-alternatives` produces a comparison page.
- After `ai-seo` produces an AI-search-optimized asset.
- After `direct-response-copy` produces a landing page (if SEO is a goal).

**Spawn pattern:**

```
<Agent tool call>
  subagent_type: mktg-seo-analyst
  description: Keyword adherence audit
  prompt: [file path] + "Read brand/keyword-plan.md + brand/audience.md +
         brand/competitors.md. Audit this asset for: primary keyword density,
         secondary keyword coverage, search intent match, on-page SEO basics
         (title, meta, heading hierarchy), AI search readiness. Return
         structured scores and specific recommendations."
```

**What /cmo does with the result:**
- Surface the score to the user.
- If specific improvements are worth making → loop back to the content skill with the recommendations.

---

## Never-Call-Other-Agents Invariant

Each of the 5 agents is **isolated** — they never spawn other agents. If a research agent needs content-reviewer's output, that's a signal the workflow is wrong. CMO is the coordinator; the agents are specialists.

**Anti-pattern to watch:** agents trying to chain work. If `mktg-brand-researcher` asks for audience data mid-run, reject — audience research is a separate agent, run in parallel, merged by CMO afterwards.

---

## Reference

- `AGENTS.md` at repo root — the drop-in agent contract.
- `agents-manifest.json` — agent registry with `category`, `file`, `reads`, `writes`, `references_skill`, `tier`.
- Each agent's `.md` file under `agents/research/` or `agents/review/` in the mktg repo; installed to `~/.claude/agents/` by `mktg init`.
