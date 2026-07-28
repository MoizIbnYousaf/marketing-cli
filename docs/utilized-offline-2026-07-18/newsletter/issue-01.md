# Issue 01 — Your agent ships product. Give it a marketing playbook.

**Subject line options**  
A. Agent-native marketing that compounds (not another chat)  
B. 64 skills, brand memory, one CLI  
C. Stop re-briefing your brand every Monday  

**Preview text:** mktg is an installable playbook for Claude Code / Cursor builders.

---

Your coding agent is already good at shipping product.

Marketing is where the amnesia hits. New session. Empty context. You paste a half-remembered brief into a chat window, get something vaguely on-brand, and lose the thread when you close the tab. Next week you do it again.

That loop is why we built **mktg** — an agent-native marketing playbook CLI. Not a social scheduler. Not a paste-once prompt pack. An installable set of skills, agents, and brand memory that lives in your repo and compounds across sessions.

## What "agent-native" means here

Three design rules, none of them marketing fluff:

1. **Skills work at zero context.** You should get useful output before you've filled every brand questionnaire on earth. We call that L0. As `brand/` fills in — voice, audience, positioning, keywords — skills get sharper. Memory enhances. It never gates.

2. **Orchestration is explicit.** `/cmo` routes marketing work. Research agents can run in parallel to draft foundation files. Skills don't call skills; agents don't call agents. The orchestrator keeps the graph sane.

3. **DX is testable.** JSON when piped. `--dry-run` before mutations. `--fields` when you need to protect the context window. We even enforce an Agent DX score in CI (21/21 axes). If a change breaks the agent contract, tests fail.

That's the opposite of "AI CMO" wrappers that hide the workflow behind a chat blob you can't version, review, or dry-run.

## What's in the box

One install:

```bash
npm i -g marketing-cli
```

You get:

- **64 versioned skills** — manifest-backed, drop-in contract (add a `SKILL.md`, update the manifest, run `mktg update`)
- **6 agents** — research and review helpers your orchestrator can spawn
- **Brand memory** — a `brand/` directory with a real schema (voice-profile, audience, positioning, and friends)
- **Studio** — `mktg studio` launches a local dashboard from the same tarball. CLI for the agent. Studio for the human.

Upstream catalogs (for example Postiz for social providers) stay behind HTTP on purpose so AGPL doesn't contaminate the MIT-clean CLI. Hosted when you want less Docker; self-host when you don't.

## The first thirty minutes (ship this)

If you only do one thing after this email:

```bash
npm i -g marketing-cli
mktg init
mktg doctor
```

Then, in Claude Code / Cursor, run **`/cmo`** and ask for a foundation pass. You should see research agents writing into `brand/` — real files your next session can read. From there, skills for social atomization, launch copy, SEO briefs, and campaign calendars write under `marketing/` instead of evaporating into chat history.

Use `--dry-run` the first time you mutate anything. Trust, but verify.

## What we are not claiming

- We are not replacing a full enterprise marketing org.  
- We are not a Typefully/Buffer clone; schedulers can be adapters, not the product.  
- We will not invent competitor pricing or claim we're the "only" marketing CLI for agents.

If those boundaries feel refreshing, you're the ICP: solo founders and agent builders who want marketing that compounds the same way their product work does.

## This newsletter

Cadence starts biweekly. Each issue: one play you can run with an agent, plus the commands. Pillars rotate through install paths, brand memory patterns, `/cmo` stories, tool routing, and launch playbooks (Show HN, directories, atomized social).

Reply with one word — **installed**, **trying**, or **skeptical** — and what tooling you use day-to-day (Claude Code, Cursor, Codex, other). It shapes issue 02.

Ship the playbook. Let brand memory compound.

— mktg  
`npm i -g marketing-cli` · GitHub: marketing-cli

---

**Word count:** ~780
