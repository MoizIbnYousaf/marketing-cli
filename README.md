<p align="center">
  <img src="https://raw.githubusercontent.com/MoizIbnYousaf/marketing-cli/main/banner.svg" alt="marketing-cli: agent-native marketing playbook" width="100%">
</p>

<p align="center">
  <a href="https://github.com/MoizIbnYousaf/marketing-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/skills-58-10b981" alt="58 Skills">
  <img src="https://img.shields.io/badge/agents-5-10b981" alt="5 Agents">
  <a href="https://www.npmjs.com/package/marketing-cli"><img src="https://img.shields.io/npm/v/marketing-cli?color=10b981" alt="npm"></a>
  <img src="https://img.shields.io/badge/tests-2,624-10b981" alt="2,624 tests">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="TypeScript Strict">
</p>

<p align="center">
  <b>One package. One install. CLI for the agent, Studio for the human. 58 skills, 6 research agents, brand memory that compounds.</b>
</p>

---

`marketing-cli` ships the playbook, the agents, the runtime schemas, and the `/cmo` routing rules so Claude, Codex, OpenCode, and any shell-capable agent run the same marketing system. Install once. Your project picks up where the last session left off.

## What's in this repo

One npm package, two surfaces. The CLI is the agent surface, the Studio dashboard is the human surface, and `mktg studio` launches the dashboard from inside the same install.

| Surface | What it is | Path |
|---|---|---|
| `mktg` CLI | 58 skills, 6 agents, brand memory, `/cmo` orchestration | (root) |
| Studio dashboard | Local Next.js + Bun API: pulse, signals, brand visualizer, publish queue | [`studio/`](studio/) |

`npm i -g marketing-cli` installs both. The repo uses a bun workspace because Studio is a Next.js app with its own build, but at install time it is one package, one tarball.

## The Problem

You ask your agent for marketing help. It writes generic copy and forgets your audience by tomorrow. The skills it would use aren't installed; the brand files don't exist; the agent learns this halfway through, when something fails mid-execution. Every session is the first session.

`marketing-cli` fixes that. Install once and your agent inherits 58 skills, 6 research agents, and a brand memory that compounds. Session 10 starts where session 9 ended. Every conversation builds on the last.

---

## How It Works

<p align="center">
  <img src="https://raw.githubusercontent.com/MoizIbnYousaf/marketing-cli/main/explainer.gif" alt="How marketing-cli works" width="720">
</p>

<p align="center"><sub><code>/cmo</code> reads your project state, picks the right skill, and writes the result back to <code>brand/</code>. The next session starts where the last one ended.</sub></p>

---

## The Ecosystem: What You Actually Install

`npm install -g marketing-cli` drops the CLI plus the skills and agents into Claude Code. `mktg init` sets up the project workspace.

### Core (always installed)

| | |
|---|---|
| **`mktg` CLI** | 20 commands, 21/21 Agent DX score, JSON-by-default |
| **58 marketing skills** | The playbook, copied to `~/.claude/skills/` |
| **5 research + review agents** | Parallel sub-agents in `~/.claude/agents/` |
| **10 brand memory files** | Persistent marketing memory in your project's `brand/` (10 templates plus `SCHEMA.md`), created by `mktg init` |
| **`/cmo` orchestrator** | The brain that routes every request to the right skill |
| **Studio dashboard** | Local Next.js + Bun API dashboard at `studio/`, launched via `mktg studio` |

### Chained-in CLIs (external tools mktg knows how to call)

Not bundled. These are external binaries the skills know how to drive. `mktg doctor` tells you what's missing and how to install it. Skills fall back when a tool isn't there.

| CLI | Role | Install |
|---|---|---|
| [`firecrawl-cli`](https://github.com/firecrawl/cli) | Web scrape, search, and crawl; clean markdown out | `npm i -g firecrawl-cli` plus `FIRECRAWL_API_KEY` |
| `ffmpeg` | Video assembly, encoding, frame extraction | `brew install ffmpeg` |
| [`remotion`](https://remotion.dev) | Programmatic React video rendering | `npm i -g @remotion/cli` |
| [`playwright-cli`](https://playwright.dev) | Browser automation: demos, scrapes, CRO audits | `npm i -g @playwright/cli` |
| [`gh`](https://cli.github.com) | GitHub CLI for launches, PRs, issue intel | `brew install gh` |
| `whisper-cli` | Speech-to-text via whisper.cpp | `brew install whisper-cpp` |
| `yt-dlp` | Media download from YouTube/TikTok/podcasts | `brew install yt-dlp` |
| [`summarize`](https://github.com/steipete/summarize) | Text compression: TL;DR, digest, key points | `npm i -g @steipete/summarize` |
| Exa MCP | Parallel deep research (default for agent web queries) | MCP config in `.mcp.json` |

### Best-practices skills (how to use a tool, written down)

When a chained-in CLI needs discipline (security, rate limits, efficiency patterns), mktg ships a **best-practices skill** alongside it. Reference SKILL.md files with a `rules/` subdirectory for depth.

Currently shipping: **`firecrawl`** (wraps the firecrawl CLI with `rules/install.md` and `rules/security.md`), **`summarize`** (wraps @steipete/summarize with `rules/install.md`), and **`mktg-x`** (Twitter/X auth-walled fetch with `scripts/fetch-x.sh`).

### The orchestration philosophy

mktg orchestrates; it doesn't reimplement. When a good tool already exists, we chain it in and ship a best-practices skill next to it. mktg ships marketing playbooks, not video encoders.

---

## Quick Start

```bash
npm i -g marketing-cli
```

That's it. The global npm install copies the 58 skills into `~/.claude/skills/` and the 5 agents into `~/.claude/agents/`. No second install command, no `mktg init` to remember.

Then open Claude Code in your project and run:

```
> /cmo
```

On first run, `/cmo` automatically routes to the conversational setup wizard (`/mktg-setup`) — 4 quick questions:

1. **What are we marketing?** URL, sentence, or open-source repo
2. **What posture?** aggressive launch / steady authority / founder-led / product-led growth
3. **Which distribution channels?** Typefully / Postiz / Resend / skip
4. **Studio dashboard? (beta)** auto-open or stay CLI-only

Your answers land in `brand/cmo-preferences.md` (the persistent contract `/cmo` reads on every future activation), then `/cmo` spawns 3 research agents in parallel to fill your foundation — voice, audience, competitors. ~5 minutes.

After foundation, `/cmo` reads your project's marketing state, knows what's done and what's missing, and routes to the right skill:

```
> /cmo help me market this app

Looking at your brand profile...

Your positioning is strong but you have zero distribution.
Here's what I'd do: write 3 SEO articles targeting your best
keywords, then atomize them into social posts. That gives you
a content engine.

Want to start there?
```

### Requirements

- Node.js 18+ or [Bun](https://bun.sh)
- [Claude Code](https://claude.ai/code) (or any agent that reads `~/.claude/skills/`)

## Agent Install Surfaces

The npm package ships the same knowledge across multiple agent runtimes:

| Agent / runtime | Path |
|---|---|
| Claude Code | Global install copies skills to `~/.claude/skills/` and agents to `~/.claude/agents/`; plugin metadata lives in `.claude-plugin/` |
| Codex | Plugin metadata in `.codex-plugin/plugin.json`; use the packaged `skills/` directory and `CONTEXT.md` as the runtime index |
| Gemini CLI | Extension metadata in `gemini-extension.json` |
| OpenCode / shell agents | Run `mktg schema --json`, `mktg list --routing --json`, and read `skills/cmo/rules/*.md` |

Agent contract:

- Use `mktg schema --json` to discover commands. Don't hardcode.
- Use `--json` for all CLI calls.
- Use `--fields` to keep context small.
- Use `--dry-run` before mutations.
- Use `/cmo` for marketing judgment and direct `mktg` commands for infrastructure.

---

## Studio: eyes for your agent

Run `mktg studio` and a local Next.js dashboard boots at `http://localhost:3000`. The Bun API runs alongside on `:3001`. Watch what your agent is doing in real time: pulse activity, the signal queue, brand state, publish history. Everything is on disk, local-first, no cloud round-trip.

The studio lives in [`studio/`](studio/) and ships inside the same `marketing-cli` tarball, so `mktg studio` works on any machine that has the CLI installed. The launcher resolves the in-repo `studio/` subfolder first, with fallbacks to a sibling checkout and a `mktg-studio` binary on PATH for local dev edge cases.

```bash
mktg studio                    # boot API + dashboard, open the browser
mktg studio --no-open          # boot but skip the browser
mktg studio --dry-run --json   # preview the launch envelope, no side effects
mktg studio --intent cmo       # boot into the CMO startup flow
```

`/cmo` uses `mktg studio --dry-run --json` to discover the dashboard URL without spawning a long-running process, then opens the real launch when the user asks for it. The CLI keeps the CLI surface; the studio keeps the visual one. Same project state, two windows on it.

---

## How It's Different

Other marketing skill repos give you a folder of markdown files. mktg is infrastructure.

| | mktg | Other skill repos |
|---|---|---|
| **Install** | `npm i -g marketing-cli && mktg init` | `git clone` then manually copy files |
| **CLI** | 20 commands, JSON output, exit codes, `--dry-run` | None |
| **Memory** | 10 brand files that compound across sessions | Stateless. Starts from scratch every time. |
| **Health checks** | `mktg doctor` with pass/warn/fail diagnostics | None |
| **Skill lifecycle** | Dependency DAG, freshness tracking, versioning | Flat directory of markdown |
| **Integration checks** | Proactive env var verification before routing | Fails mid-execution |
| **Schema introspection** | `mktg schema --json` for agent self-discovery | None |
| **Orchestrator** | `/cmo` with routing table, disambiguation, guardrails | Command menus |

---

## What the CLI adds on top of skills

Marketing skills tell an agent how to do specific work: write a landing page, run a competitive scan, atomize a thread for social. They work on their own.

The CLI adds the surrounding infrastructure. `mktg init` bootstraps a project in one command: detects what you're building, scaffolds `brand/`, prefers `ai-agent-skills` as the installer when that's around and falls back to direct install when it isn't, then runs doctor to verify. `mktg status --json` returns a structured snapshot of your marketing state, and that's what `/cmo` reads on every activation to know what exists, what's stale, and what to suggest next. `mktg doctor --json` runs the health checks: skills installed, brand files populated, API keys set. The agent finds out before it tries, instead of failing mid-execution. `mktg update` versions the skills so improvements ship without touching your brand memory. `mktg schema --json` exposes every command, flag, and output shape at runtime, so agents introspect rather than hardcode.

Skills know what to do. The CLI knows what's been done, what's stale, and what to do next. Together they make a feedback loop that gets sharper every session.

---

## Brand Memory

The `brand/` directory holds ten files that compound across sessions:

```
brand/
├── voice-profile.md      # How you sound
├── positioning.md        # Why you're different
├── audience.md           # Who you're talking to
├── competitors.md        # Who you're up against
├── landscape.md          # Competitive landscape snapshot
├── keyword-plan.md       # What people search for
├── creative-kit.md       # Visual identity rules
├── stack.md              # Marketing tools in use
├── assets.md             # Created assets log (append-only)
└── learnings.md          # What worked, what didn't (append-only)
```

**Session 1:** research from scratch. **Session 10:** your agent already knows your voice, audience, competitors, keyword gaps, and what's worked before.

Foundation research launches 3 agents **in parallel**: brand voice extraction, audience persona building, and competitor teardown. They write back to `brand/` at the same time, so a 10-minute setup buys you research that survives every future session.

---

## Skills (50)

Organized by marketing layer. Foundation builds up to distribution.

<details>
<summary><b>Foundation (9 skills)</b>: Brand identity, audience research, competitive intelligence</summary>

| Skill | What it does |
|-------|-------------|
| **cmo** | Orchestrates all 58 skills. Routing table, disambiguation, guardrails. |
| **brand-voice** | Define or extract brand voice from existing content |
| **audience-research** | Build buyer personas with parallel web research |
| **competitive-intel** | Analyze competitors with real-time web intelligence |
| **positioning-angles** | Find the angle that makes your product sell |
| **brainstorm** | Structured exploration when direction is unclear |
| **document-review** | Audit brand files for completeness and consistency |
| **create-skill** | Extend the playbook with custom marketing skills |
| **marketing-psychology** | Apply behavioral psychology to any marketing asset |

</details>

<details>
<summary><b>Strategy (4 skills)</b>: Keywords, pricing, launch timing, plan strengthening</summary>

| Skill | What it does |
|-------|-------------|
| **keyword-research** | Six Circles framework for SEO keyword strategy |
| **launch-strategy** | Product Hunt, beta, and go-to-market playbooks |
| **pricing-strategy** | Van Westendorp, value-based, freemium analysis |
| **deepen-plan** | Strengthen any plan with parallel research agents |

</details>

<details>
<summary><b>Execution (19 skills)</b>: Copy, content, SEO, creative, conversion optimization</summary>

| Skill | What it does |
|-------|-------------|
| **direct-response-copy** | Landing pages, cold emails, headlines, copy editing |
| **seo-content** | SEO articles, programmatic SEO at scale |
| **lead-magnet** | Ebooks, checklists, templates, opt-in resources |
| **creative** | Visual asset briefs, ad copy variants |
| **visual-style** | Build visual brand identity for image generation |
| **image-gen** | Generate images via Gemini API with brand context |
| **marketing-demo** | Product demo recordings and walkthroughs |
| **paper-marketing** | Design carousels and social graphics in Paper |
| **slideshow-script** | Generate 5 narrative scripts for visual content |
| **video-content** | Assemble videos from slides (ffmpeg + Remotion) |
| **tiktok-slideshow** | End-to-end: script, design, video |
| **app-store-screenshots** | App Store screenshot pages (Next.js export) |
| **frontend-slides** | Animated HTML presentations and pitch decks |
| **seo-audit** | Technical SEO, site architecture, schema markup |
| **ai-seo** | Optimize for AI search (ChatGPT, Perplexity) |
| **competitor-alternatives** | "X vs Y" and "X alternatives" comparison pages |
| **page-cro** | Landing page conversion rate optimization |
| **conversion-flow-cro** | Signup, onboarding, paywall flow optimization |
| **resend-inbound** | Inbound email handling via Resend |

</details>

<details>
<summary><b>Distribution (9 skills)</b>: Email, social, newsletters, third-party integrations</summary>

| Skill | What it does |
|-------|-------------|
| **content-atomizer** | Repurpose long-form into multi-platform social posts |
| **email-sequences** | Welcome, nurture, launch, drip campaigns |
| **newsletter** | Editorial newsletter design, writing, growth |
| **churn-prevention** | Cancel flows, dunning emails, win-back campaigns |
| **referral-program** | Viral referral loops and incentive design |
| **free-tool-strategy** | Engineering-as-marketing free tool planning |
| **typefully** | Schedule and publish social posts via Typefully API |
| **send-email** | Transactional emails via Resend API |
| **agent-email-inbox** | AI agent email inbox with Resend |

</details>

<details>
<summary><b>Adapters & best-practices (9 skills)</b>: Tool wrappers, ecosystem connectors, advanced workflows</summary>

| Skill | What it does |
|-------|-------------|
| **postiz** | Schedule social posts to 30+ providers via Postiz API |
| **social-campaign** | End-to-end social content campaign pipeline |
| **landscape-scan** | Ecosystem snapshot and competitive landscape research |
| **startup-launcher** | Launch across 56 platforms with copy and tracking |
| **voice-extraction** | Reverse-engineer writing voice from podcasts/essays/tweets |
| **brand-kit-playground** | Interactive HTML preview of your live brand identity |
| **firecrawl** | Best-practices wrapper for the Firecrawl CLI |
| **summarize** | Best-practices wrapper for @steipete/summarize |
| **mktg-x** | Authenticated Twitter/X reader for tweets, threads, bookmarks |

</details>

---

## Agents (5)

Parallel sub-agents for research and review. `/cmo` spawns them during foundation building:

| Agent | Role |
|-------|------|
| **brand-researcher** | Deep brand voice extraction using Exa web search |
| **audience-researcher** | Buyer persona and watering hole discovery |
| **competitive-scanner** | Competitor teardown and positioning gap analysis |
| **content-reviewer** | Quality review for any marketing output |
| **seo-analyst** | SEO audit for content and pages |

The 3 research agents run **in parallel**. Results write back to `brand/` so every future session starts ahead.

---

## Commands

| Command | Purpose |
|---------|---------|
| `mktg init` | Scaffold `brand/` plus install skills plus install agents |
| `mktg status` | Project marketing state snapshot |
| `mktg doctor` | Health checks: brand files, skills, agents, CLI tools, integrations |
| `mktg list` | Show all 58 skills with install status and metadata |
| `mktg update` | Re-install skills from latest package version |
| `mktg schema` | Introspect all commands, flags, and output shapes |
| `mktg skill` | Inspect, validate, register, analyze, and chain external skills |
| `mktg skill add` | Chain an external skill into the mktg ecosystem |
| `mktg brand` | Export, import, diff, and review brand memory |
| `mktg run` | Load a skill for agent consumption and log execution |
| `mktg context` | Brand context compiler: token-budgeted JSON artifact |
| `mktg plan` | Execution loop: prioritized task queue from project state |
| `mktg publish` | Distribution pipeline: push content to platforms |
| `mktg compete` | Competitor change monitor: detect changes, route to skills |
| `mktg dashboard` | Local dashboard: project health, next moves, skill catalog |
| `mktg catalog` | Upstream catalog registry: list, inspect, sync, status |
| `mktg transcribe` | Audio/video to transcript via whisper.cpp (YouTube, TikTok, podcasts, local files) |
| `mktg studio` | Launch the bundled Studio dashboard (Next.js + Bun API) from the in-repo `studio/` subfolder |
| `mktg verify` | Orchestrated test-suite runner across the mktgmono ecosystem |
| `mktg ship-check` | Aggregated go/no-go verdict across ecosystem surfaces |
| `mktg cmo` | Headless `/cmo` entry point with structured output for agents |

Every command ships `--json`, `--dry-run`, and `--fields`. The live contract is `mktg schema --json`. `/cmo` keeps operator indexes in:

For the CMO startup flow, `/cmo` can run `mktg studio --open --intent cmo --session <id>`. Preview stays side-effect free with `mktg studio --dry-run --json --intent cmo --session <id>`, returning the exact dashboard URL it would open.

| Index | Purpose |
|---|---|
| [`skills/cmo/rules/cli-runtime-index.md`](skills/cmo/rules/cli-runtime-index.md) | Full current CLI command surface and startup discovery sequence |
| [`skills/cmo/rules/publish-index.md`](skills/cmo/rules/publish-index.md) | Native/Postiz/Typefully/Resend/file publish routing |
| [`skills/cmo/rules/studio-api-index.md`](skills/cmo/rules/studio-api-index.md) | Studio HTTP API and current tab contract |

---

## Integration Checks

Third-party adapters (Postiz, Typefully, Resend) need API keys. The native publish backend is local-first and needs no external key. mktg checks integrations **before routing**, not mid-execution:

```bash
$ mktg doctor --json | jq '.checks[] | select(.name | startswith("integration"))'

{
  "name": "integration-TYPEFULLY_API_KEY",
  "status": "warn",
  "detail": "TYPEFULLY_API_KEY not set, needed by typefully"
}
```

`/cmo` reads this and guides setup before routing to a skill that needs the key. Missing integrations produce warnings, not errors. Every skill works at zero config.

---

## Architecture

```
src/
├── cli.ts              # Entry point, command router
├── types.ts            # All shared TypeScript types
├── commands/           # 20 top-level commands (init, doctor, status, list, update, schema, skill, brand, run, transcribe, context, plan, publish, compete, dashboard, catalog, studio, verify, ship-check, cmo)
└── core/               # Shared modules (output, errors, brand, skills, agents, integrations)

skills/                 # 58 SKILL.md files installed via ai-agent-skills or directly
├── cmo/                # Orchestrator with rules/ and references/
├── brand-voice/
├── direct-response-copy/
└── ...

agents/                 # 5 agent .md files installed to ~/.claude/agents/
├── research/           # brand-researcher, audience-researcher, competitive-scanner
└── review/             # content-reviewer, seo-analyst

skills-manifest.json    # Source of truth for skill metadata (includes external_skills section)
agents-manifest.json    # Source of truth for agent metadata
```

### Design Principles

Every skill works at zero context. Brand memory enhances; it never gates. The CLI is agent-native by default: JSON output, structured errors, exit codes 0 through 6, `--dry-run`, and schema introspection. Errors carry a code, a hint, and a message that names the next step.

The system bootstraps itself. `mktg init` installs everything on any machine, preferring `ai-agent-skills` as the installer when it's around and falling back to direct install when it isn't. Skills are drop-in: add a `SKILL.md` and a manifest entry, no CLI changes needed.

Skills don't call other skills. They read and write files. `/cmo` orchestrates. There are no implicit chains. Foundation building spawns the 3 research agents simultaneously, not sequentially. Missing dependencies produce warnings, not blockers, so an agent always has a path forward.

---

## Development

```bash
git clone https://github.com/MoizIbnYousaf/marketing-cli.git
cd marketing-cli

bun install
bun run dev doctor    # Run locally
bun test              # 2,599 tests, real file I/O, no mocks
bun x tsc --noEmit    # Type check
bun run build         # Build
```

### Project Structure

- `src/`: CLI source (TypeScript, ~15,500 lines)
- `skills/`: 58 SKILL.md files (manifest-backed)
- `agents/`: 5 agent definitions
- `tests/`: 2,599 tests across 96 files (real file I/O, no mocks)
- `docs/`: Reference docs (`EXIT_CODES.md`, `skill-contract.md`)

---

## Contributing

Contributions welcome. The fastest ways to help:

1. **Add a skill**: Drop a `SKILL.md` in `skills/<name>/` and add an entry to `skills-manifest.json`
2. **Improve existing skills**: Better prompts, more examples, edge case handling
3. **Add tests**: Real file I/O in isolated temp dirs, no mocks
4. **Report issues**: [github.com/MoizIbnYousaf/marketing-cli/issues](https://github.com/MoizIbnYousaf/marketing-cli/issues)

---

## License

[MIT](LICENSE). Use freely. Build on it.

---

## Acknowledgments

- [Corey Haines' Marketing Skills](https://github.com/coreyhaines31/marketingskills): the breadth skill collection that inspired many of mktg's 58 skills
- [Postiz](https://github.com/gitroomhq/postiz-app) by [@gitroomhq](https://github.com/gitroomhq): the upstream catalog for 30+ social provider integrations (LinkedIn, Reddit, Bluesky, Mastodon, Threads, Instagram, TikTok, YouTube, Pinterest, Discord, Slack, etc.). mktg connects via REST API; license stays firewalled.
- [last30days-skill](https://github.com/mvanhorn/last30days-skill) by [@mvanhorn](https://github.com/mvanhorn): live research across Reddit, X, YouTube, Hacker News, GitHub, and the web. `/cmo` chains it before any market claim, so the playbook stays grounded in what's actually happening this month, not training-data folklore.
- [`@steipete/summarize`](https://github.com/steipete/summarize) by [@steipete](https://github.com/steipete): the text-compression CLI that mktg's `summarize` skill wraps with rules and budgets.
