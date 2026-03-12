# Marketing Playbook Brainstorm

**Date:** 2026-03-11
**Status:** In Progress

---

## What We're Building

**`mktg`** — an agent-native marketing playbook CLI (TypeScript/Bun) in a standalone repo (`~/projects/marketing-playbook`) that:

1. **Installs** into any project via `mktg init` — wizard flow detects project, builds brand, scaffolds workspace
2. **Discovers or builds** brand context (ingests existing brand docs OR runs interactive discovery)
3. **Produces a full launch package** — brand kit, landing page copy, email sequences, SEO content, social posts, lead magnets
4. **Works with Claude Code AND Codex** — dual-agent compatible skill format
5. **Runs autonomously** — agent teams handle content production after brand foundation is set
6. **Self-contained** — no external SaaS dependencies, CLI-only integrations
7. **Grows over time** — new marketing ideas loop back into the system
8. **Proven end-to-end** — full pipeline e2e tests with real data, no mocks

---

## Integrations (CLI-Only, No External Services)

| Tool | Purpose |
|------|---------|
| `gws` | Email campaigns, newsletter sending |
| `playwright-cli` | Social posting, TikTok warming, account automation |
| Exa MCP | Web/competitor research, content gap analysis |
| `ffmpeg` | Video/audio content creation |
| HTML generation | Landing pages, lead magnets, email templates |
| `gh` | Content as code, marketing site deploys |

**No:** Mailchimp, ConvertKit, SERP APIs, Replicate, or any external SaaS.

---

## Skill Audit Results

### Skills-v2 (11 deep skills — the spine)

| Rank | Skill | Score | Role |
|------|-------|-------|------|
| 1 | start-here | 9/10 | Orchestrator — routes to right skill, chains workflows |
| 2 | positioning-angles | 9/10 | Positioning via Dunford/Schwartz/Hormozi frameworks |
| 3 | direct-response-copy | 9/10 | Deep copywriting with 7-dimension scoring (2,874 lines) |
| 4 | email-sequences | 8/10 | 6 sequence types, A/B variants, brand voice integration |
| 5 | lead-magnet | 8/10 | Ideation + full BUILD MODE, bridge-to-paid analysis |
| 6 | content-atomizer | 8/10 | One piece → 8 platform-optimized posts with algorithm signals |
| 7 | brand-voice | 8/10 | 11-dimension voice DNA, extract/build/auto-scrape modes |
| 8 | seo-content | 8/10 | Publication-ready articles with E-E-A-T, SERP analysis |
| 9 | keyword-research | 7/10 | 6 Circles Method, needs web search for real value |
| 10 | newsletter | 7/10 | 6 archetypes, growth + monetization strategy |
| 11 | creative | 7/10 | 5 production modes (adapt for ffmpeg/HTML instead of Replicate) |

**Key strength:** Brand memory system (`brand/` directory) makes skills compound.
**Key weakness:** ~40% of value depends on web search MCP for live data.

### Marketingskills (32 skills — the breadth)

**MUST HAVE (13 skills):**

| Skill | Score | Why |
|-------|-------|-----|
| product-marketing-context | 9/10 | Foundation doc all other skills reference |
| launch-strategy | 9/10 | 5-phase launch framework, Product Hunt playbook — **fills v2 gap** |
| pricing-strategy | 8/10 | Value-based pricing, tier structure — **fills v2 gap** |
| content-strategy | 8/10 | Prioritization scoring, topic clusters |
| copywriting | 8/10 | Solid but v2's direct-response-copy is deeper |
| email-sequence | 8/10 | Similar to v2's email-sequences |
| page-cro | 7/10 | Landing page audit — **unique, no v2 equivalent** |
| seo-audit | 9/10 | Technical SEO health check — **unique, no v2 equivalent** |
| marketing-ideas | 7/10 | 139 ideas by category/stage/budget |
| social-content | 7/10 | v2's content-atomizer is deeper |
| copy-editing | 9/10 | Seven Sweeps editing framework — **unique, excellent** |
| cold-email | 8/10 | B2B outbound — **unique, no v2 equivalent** |
| marketing-psychology | 9/10 | 50+ psych principles applied to marketing — **unique** |

**NICE TO HAVE (16 skills):**
- signup-flow-cro (8), ai-seo (9), onboarding-cro (7), competitor-alternatives (8)
- analytics-tracking (7), site-architecture (8), churn-prevention (9 — must-have at scale)
- free-tool-strategy (7), referral-program (7), programmatic-seo (8)
- schema-markup (6), paid-ads (8), ad-creative (8)
- popup-cro (8), form-cro (8), paywall-upgrade-cro (7)

**CAN SKIP (3 skills):**
- ab-test-setup (needs traffic volume)
- revops (needs sales team)
- sales-enablement (needs sales team)

### Overlap Resolution

| Overlapping Area | v1 Skill | v2 Skill | Winner |
|-----------------|----------|----------|--------|
| Copywriting | copywriting | direct-response-copy | **v2** (10x deeper) |
| Email | email-sequence | email-sequences | **v2** (brand voice + A/B) |
| Social | social-content | content-atomizer | **v2** (8 platforms + algo) |
| Content planning | content-strategy | keyword-research | **v2** (SERP validation) |
| Foundation | product-marketing-context | start-here + brand-voice | **v2** (brand memory) |

**Decision:** Use v2 for all overlapping skills. Keep v1 unique skills (27 of them).

### Skills to Build (Phantom + Gaps)

| Skill | Source | Notes |
|-------|--------|-------|
| audience-research | Referenced in v2 brand-memory.md | Doesn't exist yet — creates `brand/audience.md` |
| competitive-intel | Referenced in v2 brand-memory.md | Doesn't exist yet — creates `brand/competitors.md` |

---

## Unified Skill Map (~38 skills)

### Foundation (5)
- `start-here` (v2) — orchestrator + wizard
- `brand-voice` (v2) — voice DNA
- `positioning-angles` (v2) — positioning + angles
- `audience-research` (NEW) — audience personas
- `competitive-intel` (NEW) — competitor teardowns

### Strategy (5)
- `launch-strategy` (v1) — phased launch planning
- `pricing-strategy` (v1) — value-based pricing
- `keyword-research` (v2) — SEO keyword strategy
- `content-strategy` (v1) — content prioritization
- `marketing-ideas` (v1) — 139 ideas library

### Copy & Content (5)
- `direct-response-copy` (v2) — high-conversion copy
- `copy-editing` (v1) — Seven Sweeps editing
- `cold-email` (v1) — B2B outbound
- `seo-content` (v2) — publication-ready SEO articles
- `lead-magnet` (v2) — ideation + build

### Distribution (3)
- `content-atomizer` (v2) — multi-platform repurposing
- `email-sequences` (v2) — automated email flows
- `newsletter` (v2) — editorial newsletters

### Creative (1)
- `creative` (v2, adapted) — ffmpeg + HTML instead of Replicate

### Conversion (6)
- `page-cro` (v1) — landing page audit
- `signup-flow-cro` (v1) — registration optimization
- `onboarding-cro` (v1) — post-signup activation
- `form-cro` (v1) — form optimization
- `popup-cro` (v1) — popup/modal strategy
- `paywall-upgrade-cro` (v1) — in-app paywall optimization

### SEO (5)
- `seo-audit` (v1) — technical SEO health
- `ai-seo` (v1) — AI search optimization
- `programmatic-seo` (v1) — pages at scale
- `site-architecture` (v1) — URL/nav structure
- `schema-markup` (v1) — JSON-LD structured data
- `competitor-alternatives` (v1) — comparison/alternative pages

### Growth (3)
- `referral-program` (v1) — viral loops
- `free-tool-strategy` (v1) — engineering as marketing
- `churn-prevention` (v1) — cancel flows + dunning

### Ads (2)
- `paid-ads` (v1) — campaign strategy
- `ad-creative` (v1) — ad copy at scale

### Knowledge (3)
- `marketing-psychology` (v1) — 50+ psych principles
- `analytics-tracking` (v1) — GA4 + event tracking
- `product-marketing-context` (v1) — shared context doc

---

## CLI Design

### Commands

```
mktg init              → Auto-detect project + build brand/ + install skills
                         Input: mktg.yaml > CLI flags > auto-detect from repo
                         Also checks for skill updates on every run
mktg doctor            → Health checks: skills, brand files, CLIs, integrations
                         Also checks for skill updates
mktg launch            → Full launch package: copy, emails, SEO, social, lead magnet
mktg content <type>    → Generate specific content (email, social, seo, landing-page)
mktg social            → Generate social content to marketing/social/
mktg post              → Publish generated content via Playwright CLI
mktg email             → Generate + send email campaigns via gws
mktg calendar          → 30-day content calendar across all platforms
mktg audit             → Analyze existing marketing, score, suggest improvements
mktg test              → Full e2e pipeline test (real data, real CLIs, no mocks)
mktg update            → Force-update all skills to latest version
mktg list              → Show available skills and their status
```

### Project Structure (after `mktg init`)

```
brand/
├── voice-profile.md       (from brand-voice)
├── positioning.md         (from positioning-angles)
├── audience.md            (from audience-research)
├── competitors.md         (from competitive-intel)
├── keyword-plan.md        (from keyword-research)
├── creative-kit.md        (from creative)
├── stack.md               (from start-here)
└── learnings.md           (append-only, compounding loop)
marketing/
├── campaigns/             (generated content by campaign)
├── emails/                (email sequences)
├── social/                (platform-specific posts)
├── landing-pages/         (HTML files)
├── lead-magnets/          (downloadable content)
└── assets/                (images, videos via ffmpeg)
```

### E2E Testing

Full pipeline test on a test project — real everything, no mocks:
1. `mktg init` on test project → verify brand/ files generated
2. `mktg launch` → verify all content types produced
3. `gws` → verify email draft created
4. `playwright-cli` → verify social post flow works
5. `ffmpeg` → verify video/audio generation
6. HTML output → verify landing page renders correctly
7. Quality validation → word counts, structure, brand consistency

---

## Key Decisions

1. **CLI name:** `mktg` (TypeScript/Bun)
2. **Home:** `~/projects/marketing-playbook` (new standalone repo)
3. **~38 skills:** v2 spine (11) + v1 breadth (27) + 2 new (audience-research, competitive-intel) - 3 skipped
4. **Brand memory:** skills-v2's `brand/` directory pattern
5. **Learnings are project-local:** each project's `brand/learnings.md` compounds independently
6. **Social automation included:** Playwright CLI for posting, not just content generation
7. **Self-contained:** CLI-only integrations (gws, playwright-cli, ffmpeg, exa, gh)
8. **No external services:** no Mailchimp, no SERP APIs, no Replicate
9. **Dual-agent:** works with Claude Code AND Codex
10. **Same skill format** for Claude Code and Codex — install everywhere, no adapters needed
11. **Orchestration:** Subagent spawning via Claude Code Agent tool (parallel workers for content production)
12. **Content output:** `brand/` (identity, stable) + `marketing/` (output, grows) as separate roots
13. **CRO merged to 3:** page+form, signup+onboarding, popup+paywall
14. **Creative:** Remotion (React video gen) + HTML templates (render to PNG) + ffmpeg for simple edits. No AI image gen APIs.
15. **`mktg init` modeled on `/start-here`** — the v2 orchestrator skill becomes the CLI wizard flow
16. **Skills are baked in** — we own both repos, skill content goes directly into the CLI
17. **Self-bootstrapping** — `mktg init` installs all skills fresh on any machine (new VPS, fresh Mac, etc.). CLI bundles all skill files and writes them to agent config dirs. No separate install step.
18. **Agent-native** — `mktg` is built for agents to run, not humans. Structured output, no interactive prompts, clear exit codes. Agents orchestrate it.
19. **Input fallback chain** — Config file (mktg.yaml/brand-brief.md) → CLI flags → auto-detect from repo. First match wins.
20. **Auto-update on init** — Every `mktg init` or `mktg doctor` checks for newer skill versions and offers to update.
21. **Two-step social** — `mktg social` generates content to marketing/social/. `mktg post` publishes via Playwright. Separate steps for review.
22. **npm/bun package** — Published to npm, installable with `bun install -g mktg`.
23. **Social warming playbook** — Platform-specific account warming strategies baked into the social skill (TikTok, X, LinkedIn engagement patterns).
24. **Content calendar** — `mktg calendar` generates 30-day content plan across all platforms from keyword plan + brand voice.
25. **Package deal** — `mktg init` installs the CLI tools AND the `/cmo` skill into the agent. One command = agent becomes a fully capable CMO.
26. **Skills ≠ CLI commands** — Two separate concerns:
    - **Skills** = marketing knowledge (SKILL.md files) that agents load into context. Brand-voice, positioning, copy, email, SEO, etc. The agent READS these to know how to do marketing.
    - **CLI** = infrastructure tool for operational actions. Install, configure, health check, distribute, test. The agent RUNS this for setup and external actions (posting, emailing, testing).
    - The agent reads `/cmo` skill for strategy, reads individual skills for domain knowledge, and uses `mktg` CLI for infrastructure.

## Resolved Questions

1. **Skill format:** Same format for Claude Code and Codex. Just install the skills — no adapter layers needed.
2. **Content output:** `brand/` for identity docs (stable), `marketing/` for generated content (grows). Separated so skills read `brand/` without sifting through output.
3. **Orchestration:** Subagent spawning — master skill coordinates, workers produce content in parallel. Best practice in Claude Code.
4. **CRO consolidation:** 6 → 3 skills. Merge: page-cro + form-cro, signup-flow-cro + onboarding-cro, popup-cro + paywall-upgrade-cro.
5. **Creative:** Remotion for programmatic React videos (branded clips, social content, data-driven videos) + HTML templates rendered to PNG for graphics + ffmpeg for simple edits. No Replicate, no AI image gen APIs.

## Architecture Patterns to Steal from skills-v2

These are the proven architectural decisions from skills-v2 that `mktg` CLI must replicate:

### 1. The Context Paradox (most important)
Don't dump all brand context into every skill. Each skill gets a **selective context matrix** — only the files it needs. More context = worse output because of attention dilution. `start-here` (orchestrator) gets ALL files. Copy skills get voice + positioning + audience. Keyword research gets positioning + audience + competitors. This is enforced programmatically in the CLI, not left to the LLM to decide.

### 2. Progressive Enhancement (not Progressive Gating)
Every skill works at Level 0 (zero context). Brand memory ENHANCES output, never GATES it. Five levels:
- L0: Zero context → "What are you selling?" → solid output
- L1: + Voice profile → matches brand tone
- L2: + Positioning → uses proven angle
- L3: + Audience data → targets specific pain points
- L4: + Learnings → avoids past mistakes

### 3. Two-Question Onboarding
`mktg init` asks exactly 2 questions, then starts building:
1. "What is your business?" (one sentence)
2. "What is your marketing goal?" (4 options: BUILD AUDIENCE / LAUNCH PRODUCT / GROW REVENUE / CREATE CONTENT SYSTEM)
Then parallel-dispatches brand-voice + positioning-angles as subagents.

### 4. Orchestrator Pattern
`start-here` is not a skill — it's a router. It:
- Detects first-run vs returning mode
- Scans project state (brand files, campaigns, tools, learnings)
- Routes to the right skill or skill chain
- Chains skills for compound requests ("build me a funnel" → lead-magnet → copy → emails → atomizer)
- Never asks more than 2 questions before doing work
- Never presents the skill list as a menu (it decides, user confirms)

### 5. Workflow Detection
7 pre-built workflows triggered by natural language:
- "Starting from zero" → brand-voice + positioning (parallel) → goal routing
- "Launch product" → positioning → copy → lead-magnet
- "Need leads" → lead-magnet → copy → email-sequences → atomizer
- "Content strategy" → keyword-research → seo-content → atomizer → newsletter
- etc.
For 3+ step workflows, show the plan and let user choose: run all, start with step 1, or skip to specific step.

### 6. Brand Memory System
`brand/` directory with owned files:
- 7 profile files (voice, positioning, audience, competitors, creative-kit, stack, keyword-plan) — each owned by one skill
- 2 append-only files (assets.md, learnings.md) — all skills can append
- Context freshness: <7 days = pass as-is, 7-30 = date flag, 30-90 = summary only, >90 = don't pass

### 7. Doctor Health Check
29 checks across 7 groups: system files, schemas, scripts, core skills, creative, reference libraries, API keys. CLI must have `mktg doctor` that validates the entire installation is correct and functional.

### 8. E2E Testing
Isolated temp directory, full install pipeline, doctor validation, file manifest check, no-empty-files check. `mktg test` replicates this but goes further — actually runs skills and validates output.

### 9. Terminal-Native Output
No markdown in terminal output. Unicode box-drawing (━─┌│└─┐), status indicators (✓✗◑○★), numbered options (①②③), action arrows (→). 55-char line width. Every skill output follows 4 sections: Header, Content, Files Saved, What's Next.

### 10. Anti-Patterns (hard rules)
1. Never ask more than 2 questions before doing work
2. Never present skill list as menu — orchestrator decides
3. Never dump all context into every skill (Context Matrix)
4. Never run sequential when parallel is possible
5. Never skip project scan on returning visits
6. Never rebuild what exists without asking
7. Never give generic recommendations — always reference concrete skill + time estimate
8. Never forget to update assets.md
9. Never confuse workflow with single skill
10. Never silently produce generic output — offer quick foundation first

---

## The /cmo Skill — The Agent's Marketing Brain

`mktg` is the toolbox. `/cmo` is the expertise. The agent needs a skill that teaches it how to THINK like a CMO and USE `mktg` effectively.

**Installed by:** `mktg init` (auto-installs into .claude/skills/ and .codex/skills/)
**Trigger:** User says "marketing", "launch", "grow", "content", "brand", or any marketing-related request

### What /cmo Teaches the Agent

**1. Marketing Strategy Knowledge**
- When to build audience vs launch vs grow revenue vs create content system
- How to assess where a product is in its lifecycle (pre-launch, launch, growth, scale)
- Which marketing activities have highest ROI at each stage
- The 4-goal framework (BUILD AUDIENCE / LAUNCH PRODUCT / GROW REVENUE / CREATE CONTENT SYSTEM)

**2. Full `mktg` CLI Mastery**
- Every command, flag, and output format
- When to use each command and in what order
- `--dry-run` before every mutating operation
- `--json` for parsing output programmatically
- `--fields` for token-efficient responses
- Error code handling and recovery

**3. Workflow Orchestration**
- Pre-built workflow chains (the 7 workflows from start-here):
  - "Starting from zero" → `mktg init` → brand foundation
  - "Launch product" → positioning → copy → lead-magnet → emails → social
  - "Need leads" → lead-magnet → copy → email-sequences → atomizer
  - "Content strategy" → keyword-research → seo-content → atomizer → newsletter
  - etc.
- How to chain `mktg` commands for compound requests
- When to run skills in parallel vs sequential
- How to use subagents for parallel content production

**4. Brand Memory System**
- What each brand/ file does and which skill owns it
- The Context Paradox — never dump all context into every skill
- The selective context matrix
- How to check brand freshness and suggest refreshes
- How learnings.md compounds over time

**5. CLI Safety & Best Practices**
- Always `mktg doctor` after `mktg init`
- Always `--dry-run` before `mktg post` and `mktg email`
- Always review marketing/social/ before `mktg post`
- Use `mktg schema <command>` to understand inputs
- Check exit codes and handle structured errors
- Never post without brand/ foundation (warn + offer to build it)

**6. Distribution Knowledge**
- How to use Playwright CLI for social posting
- Platform-specific timing and engagement patterns
- Social warming strategies (TikTok, X, LinkedIn)
- How to use `gws` for email campaigns
- How to use Remotion for video content

**7. Quality Assessment**
- How to evaluate generated content quality
- The 7-dimension scoring rubric (from direct-response-copy)
- When content needs human review vs is agent-shippable
- How to use brand/learnings.md to improve future output

### /cmo Skill Structure

```
/cmo
├── SKILL.md              → Main skill (triggers, routing, strategy)
├── references/
│   ├── CLI_REFERENCE.md   → Every mktg command documented for agents
│   ├── WORKFLOWS.md       → Pre-built workflow chains with examples
│   ├── BRAND_MEMORY.md    → Context matrix and freshness rules
│   └── PLAYBOOK.md        → Marketing strategy by product stage
```

### How It Works In Practice

Agent receives: "I need to market this app"

`/cmo` activates and the agent:
1. Checks if `mktg` is installed → `mktg --version`
2. Checks project state → `mktg doctor --json`
3. Assesses the situation (brand exists? what stage? what goal?)
4. Picks the right workflow chain
5. Executes `mktg` commands in order, handling errors
6. Reviews output quality before distribution
7. Uses `--dry-run` before any external actions
8. Updates brand/learnings.md with results

The agent doesn't need to know copywriting theory or SEO methodology — that knowledge lives in the skills. `/cmo` teaches it HOW to orchestrate those skills via the CLI.

---

## Agent-First CLI Design Principles

Reference: Justin Poehnelt's "You Need to Rewrite Your CLI for AI Agents" (gws CLI for Google Workspace). `mktg` is built for agents, not humans. Every design decision optimizes for predictability and defense-in-depth over discoverability and forgiveness.

### 1. JSON Output Everywhere
- Every command supports `--json` flag for machine-readable output
- TTY detection: auto-switch to JSON when piped (`mktg list | jq .`)
- NDJSON for streaming/pagination (one JSON object per line)
- Human-friendly output only when running interactively in a terminal

### 2. Token-Efficient Output
- No args → help in ~100 tokens (dense, minimal)
- Field masks: `mktg list --fields name,status` limits output
- Context window discipline: never dump massive blobs, always paginate
- Dense output by default — agents pay per token

### 3. Structured Errors
Every error returns structured JSON:
```json
{
  "error": {
    "code": "BRAND_NOT_FOUND",
    "message": "No brand/ directory found. Run mktg init first.",
    "suggestions": ["mktg init", "mktg init --business 'My App'"]
  }
}
```

### 4. Meaningful Exit Codes
```
0 = success
1 = not found (missing brand/, skill, etc.)
2 = invalid arguments
3 = dependency missing (gws, playwright-cli, etc.)
4 = skill execution failed
5 = network/external error
```

### 5. Input Hardening Against Hallucinations
Agents hallucinate. Build like it:
- **Path traversal**: Reject `../../` in any file path, sandbox all output to project dir
- **Control characters**: Reject anything below ASCII 0x20 in string inputs
- **Double encoding**: Detect and reject pre-URL-encoded strings
- **Resource validation**: Reject embedded query params in IDs
- All inputs validated before any work begins

### 6. Raw JSON Payloads
Support `--json` input for complex operations:
```bash
mktg init --json '{"business": "CEO app", "goal": "launch", "brand": {"colors": ["#6366f1"], "font": "Inter"}}'
```
Maps directly to internal config. Zero translation loss for agents.

### 7. Schema Introspection
```bash
mktg schema init        → JSON schema of what mktg init accepts
mktg schema brand       → JSON schema of brand/ directory structure
mktg schema social      → JSON schema of social content output
```
Agents self-serve without pre-stuffed documentation. The CLI IS the docs.

### 8. Dry-Run for Safety
```bash
mktg launch --dry-run   → Shows what would be generated without writing files
mktg post --dry-run     → Shows what would be posted without hitting Playwright
mktg email --dry-run    → Shows email draft without sending via gws
```
Agents validate before mutating. Especially critical for `mktg post` and `mktg email` which have external side effects.

### 9. Skill Files as Agent Context
Ship SKILL.md files with agent-specific invariants:
- "Always use --dry-run before mktg post"
- "Always run mktg doctor after mktg init"
- "Use --fields to limit output in pipelines"
- Rules agents can't intuit from --help

### 10. Multi-Surface Support
```
          ┌─────────────────┐
          │  Skill Registry │
          │  (source of     │
          │   truth)        │
          └────────┬────────┘
                   │
          ┌────────▼────────┐
          │   Core Binary   │
          │     (mktg)      │
          └─┬────┬────┬───┬─┘
            │    │    │   │
     ┌──────┘    │    │   └──────┐
     ▼           ▼    ▼          ▼
  ┌───────┐ ┌──────┐ ┌─────────┐ ┌──────┐
  │  CLI  │ │Skills│ │  MCP    │ │ Env  │
  │(agent)│ │(.md) │ │(future) │ │ Vars │
  └───────┘ └──────┘ └─────────┘ └──────┘
```
- CLI: Primary interface for agents
- Skills: SKILL.md files installed into agent config dirs
- MCP: Future surface if needed (expose as JSON-RPC tools)
- Env vars: Auth and config injection (`MKTG_BRAND_DIR`, `GWS_TOKEN`, etc.)

---

## First Target

**CEO app** — "Startup in Your Pocket" iOS app:
- Brand already partially defined (periwinkle #6366f1, Inter font, grid texture)
- Competitors mapped (NanoCorp, Polsia)
- Landing page exists as playground
- Full launch package needed
