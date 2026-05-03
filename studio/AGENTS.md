# mktg-studio

> Build the visual studio layer for the mktg marketing CLI. The studio is a local-first Next.js dashboard powered by /cmo — the agent orchestrator with 50 marketing skills. Everything intelligent goes through /cmo. Everything infrastructure goes through the mktg CLI. The studio never calls the Anthropic API directly.

## Vision: The End Goal

**One day, someone runs `/cmo` in a fresh project and /cmo says: "Let me spin up your marketing dashboard." It launches the studio dashboard, creates native publish providers, connects Postiz when external posting is needed, reads the brand/ files, and the user sees their entire marketing operation live on screen. No setup guide. No manual config. The agent builds the marketing department AND gives you the dashboard to see it working.**

This is the visual layer for `marketing-cli`. It's what turns a CLI-only experience into a full marketing studio that anyone — not just developers — can use. Easy API key setup. One-click skill execution. Real-time brand intelligence. A live Activity panel where you watch /cmo work.

**The merge:** The studio eventually ships AS PART of the mktg ecosystem. Either:
- `mktg studio` command that launches the dashboard (preferred — keeps mktg as the single entry point)
- Or a companion package (`mktg-studio`) that mktg references

Either way, /cmo is the brain and the studio is the eyes. They're one system.

**What "done" really looks like:**
1. `npm i -g marketing-cli` installs mktg
2. `mktg init` bootstraps a project with brand/ files
3. `mktg studio` launches the dashboard on localhost:3000
4. Onboarding wizard asks 3-5 questions → adds API keys → creates native providers / connects Postiz
5. /cmo runs foundation skills in parallel → surfaces light up one by one
6. User sees Pulse (brand health + audience summary + what to do next), Signals (creative assets + draft campaigns), Publish (social queue), Brand, Settings, and the live Activity panel
7. Everything persists locally. Close the laptop, reopen, everything's still there.
8. The user never needs to understand CLI commands — the studio IS the interface.

## API Key Onboarding (Easy Setup)

The studio MUST have a dead-simple settings/onboarding screen. When a user first opens the studio, they see a wizard — not an empty dashboard.

**Onboarding flow:**
```
Step 1: "What's your project?"
 → mktg init --from <url> if they have a website
 → mktg init --yes if starting fresh

Step 2: "Connect your social accounts"
 → Enter POSTIZ_API_KEY (with link to https://api.postiz.com signup)
 → Enter POSTIZ_API_BASE (defaults to https://api.postiz.com)
 → Optional: TYPEFULLY_API_KEY for X/LinkedIn threads

Step 3: "Optional integrations"
 → FIRECRAWL_API_KEY (for web scraping in landscape-scan)
 → EXA_API_KEY (for deep web research — most skills benefit)
 → RESEND_API_KEY (for email sequences)

Step 4: "Building your marketing brain..."
 → /cmo spawns 3 research agents in parallel:
 - mktg-brand-researcher → brand/voice-profile.md
 - mktg-audience-researcher → brand/audience.md
 - mktg-competitive-scanner → brand/competitors.md
 → Dashboard surfaces light up one by one as each completes
 → Onboarding complete → Pulse tab shows first "do this next"
```

**Settings panel (accessible anytime):**
- View/edit all API keys
- See connected providers (from postiz GET /integrations)
- See brand file health (populated, missing, stale)
- See integration status (from mktg doctor)
- Reset / re-run onboarding

**Where API keys are stored:**
- `.env.local` in the project root (standard Next.js pattern)
- Or a `.mktg-studio/config.json` for studio-specific settings
- The mktg CLI reads its own env vars (POSTIZ_API_KEY etc.) from the shell environment
- The studio's settings panel writes to .env.local AND exports to shell for mktg CLI

## Agent DX 21/21 — The Non-Negotiable Quality Bar

mktg CLI scores 21/21 on the Agent DX Scale. The studio MUST maintain this score. Every server endpoint, every data contract, every API surface the studio exposes is evaluated against these 7 axes:

| Axis | Score 3 (what we ship) | How it applies to the studio |
|---|---|---|
| **1. Machine-Readable Output** | NDJSON streaming, JSON default in non-TTY | Every `/api/*` endpoint returns typed JSON. SSE events are structured `{type, payload}`. No prose-only responses. |
| **2. Raw Payload Input** | Full JSON payload, zero translation loss | Every POST endpoint accepts a raw JSON body that maps 1:1 to the action. No bespoke form fields that lose structure. |
| **3. Schema Introspection** | Live runtime-resolved schemas with enums + nested types | `/api/schema` endpoint that returns every route's request/response shape. An agent can self-discover the studio's API. |
| **4. Context Window Discipline** | Field masks on all reads, streaming pagination | Every GET endpoint supports `?fields=` parameter. Large lists paginate. SSE streams so agents don't poll. |
| **5. Input Hardening** | Reject traversals, control chars, double encoding. "The agent is not a trusted operator." | All user input (skill names, file paths, API keys) goes through validators. The studio's Bun server trusts NOTHING from the frontend. |
| **6. Safety Rails** | `--dry-run` for all mutations, response sanitization | Every mutating endpoint supports `?dryRun=true`. Destructive actions (reset brand, delete signals) require `?confirm=true`. |
| **7. Agent Knowledge Packaging** | Comprehensive skill library, versioned, discoverable | This CLAUDE.md IS the agent knowledge. Plus: `mktg schema`, `mktg list --routing`, and `/api/schema` for runtime discovery. |

**Why this matters for the studio:** The studio isn't just a human dashboard — it's also an API surface that agents consume. /cmo talks to the studio's server. Future agents will talk to the studio's API. If the server doesn't follow the same DX contract as the CLI, agent integration breaks.

**Test it:** After Phase 2, run the Agent DX Scale evaluation against the studio's `/api/*` surface. Must score 21/21 or fix before proceeding.

> "Human DX optimizes for discoverability and forgiveness. Agent DX optimizes for predictability and defense-in-depth."

Full scale reference: `~/.claude/skills/agent-dx-cli-scale/SKILL.md`

## Agent-Native Principles

This project follows the same agent-native contract as mktg itself:

| Principle | What it means here |
|---|---|
| **Agent-first** | The studio is a UI for an agent (/cmo), not a replacement for one. Every "smart" action is /cmo. |
| **Predictability over discoverability** | All mktg commands return typed JSON via `--json`. Schema via `mktg schema`. No surprises. |
| **Progressive enhancement** | Works at L0 (fresh install, no brand). Gets better at L4 (full brand). Studio shows the ladder. |
| **No mocks, no fake data** | Real mktg CLI calls, real brand/ files, real SQLite writes. Tests use real I/O in temp dirs. |
| **Skills never call skills** | /cmo orchestrates. The studio talks to /cmo, /cmo routes to skills. Never skip /cmo. |
| **Local-first** | SQLite + brand/ files + SSE. Zero cloud dependency for core features. Online only for /cmo (needs Claude) and postiz API. |

## Architecture

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│ Next.js 16 │────▶│ Bun.serve │────▶│ Claude Code (local) │
│ Dashboard │◀─SSE│ (local server) │ │ ├── /cmo skill │
│ │ │ SQLite │ │ ├── 50 marketing skills │
│ 5 surfaces + │ │ brand/ watcher │ │ ├── mktg CLI (--json) │
│ Activity │ │ Job queue │ │ └── Postiz adapter │
└──────────────────┘ └──────────────────┘ └──────────────────────────┘
 │ │
 ┌──────┴──────┐ ┌────────┴────────┐
 │ brand/ │ │ Postiz API │
 │ 10 files │ │ (AGPL, ext.) │
 └─────────────┘ └─────────────────┘
```

**Execution split — memorize this:**
- **Needs intelligence** (chat, skill execution, recommendations) → **/cmo** via Claude Code
- **Needs data** (status, publish, catalog, doctor, list, schema) → **mktg CLI** (--json, no LLM)
- **Needs display** (tab rendering, brand file content) → **SQLite queries + file reads**

## The Three Source Repos

### 1. mktg CLI — the skill engine

```
Repo: ~/projects/mktgmono/marketing-cli/
npm: marketing-cli@0.3.2
Binary: mktg (global install: npm i -g marketing-cli)
License: MIT
Tests: 2599 pass / 0 fail / 96 files
```

**Source tree:**
```
~/projects/mktgmono/marketing-cli/
├── src/
│ ├── cli.ts — entry point, command router, global flag parsing
│ ├── types.ts — ALL shared types: CommandResult<T>, CatalogEntry, CatalogsManifest, etc.
│ ├── commands/
│ │ ├── catalog.ts — mktg catalog list/info/sync/status/add (upstream catalogs)
│ │ ├── publish.ts — mktg publish (4 adapters: typefully, resend, file, postiz)
│ │ │ Lines 263-620: postizFetch + publishPostiz + sent-markers
│ │ │ Line 617: BUILTIN_PUBLISH_ADAPTERS export
│ │ │ Line 623: postiz entry in ADAPTERS registry
│ │ ├── doctor.ts — mktg doctor (health checks, tool detection, catalog health)
│ │ ├── schema.ts — mktg schema (agent self-discovery, line 42: catalog import)
│ │ ├── init.ts — mktg init (project bootstrap, installs skills + agents)
│ │ ├── status.ts — mktg status (brand health, integration status, skill count)
│ │ ├── list.ts — mktg list (all skills + agents with install status, --routing flag)
│ │ ├── brand.ts — mktg brand (read/write/delete/reset/import brand files)
│ │ ├── run.ts — mktg run (skill execution logging)
│ │ ├── plan.ts — mktg plan (task tracking, plan next, --learning flag)
│ │ ├── context.ts — mktg context (project context for skills)
│ │ ├── compete.ts — mktg compete (competitor monitoring loop)
│ │ ├── update.ts — mktg update (re-sync bundled skills + agents from package)
│ │ ├── transcribe.ts — mktg transcribe (whisper-cli + yt-dlp + ffmpeg pipeline)
│ │ └── dashboard.ts — mktg dashboard (brand overview)
│ └── core/
│ ├── catalogs.ts — loadCatalogManifest + license allowlist + collision detection
│ ├── output.ts — JSON/TTY formatting, --fields filtering, getNestedValue (walks arrays)
│ ├── errors.ts — 6 validators: rejectControlChars, validateResourceId, detectDoubleEncoding,
│ │ validatePathInput, sandboxPath, parseJsonInput
│ ├── brand.ts — brand dir management, freshness assessment, template detection
│ ├── skills.ts — skill registry, install to ~/.claude/skills/, integrity verification
│ ├── skill-add.ts — external skill chaining (mktg skill add)
│ ├── agents.ts — agent registry, install to ~/.claude/agents/
│ └── transcribe.ts — whisper.cpp + yt-dlp + ffmpeg orchestration
├── skills/ — 50 SKILL.md files (see §Skills below)
├── agents/ — 5 agent .md files (see §Agents below)
├── skills-manifest.json — 50 skills: triggers, categories, layers, reads, writes, env_vars
├── agents-manifest.json — 5 agents: categories, files, reads, writes, tier
├── catalogs-manifest.json — 1 catalog (postiz): capabilities, auth, transport, license
├── brand/SCHEMA.md — schema for all 10 brand files
├── CLAUDE.md — 198 lines: development contract
├── AGENTS.md — 163 lines: drop-in skill/agent/catalog contracts
├── CONTEXT.md — 121 lines: command reference
├── docs/integration/ — postiz design specs (from the integration session):
│ └── postiz-api-reference.md — 857 lines: every endpoint, DTO, auth, rate limits
└── docs/audits/ — DX 21/21 audit reports (3 files, one per axis group)
```

**mktg CLI commands the studio calls:**

| Command | Returns | Studio uses for |
|---|---|---|
| `mktg status --json` | `{brand: {populated, missing, stale}, integrations: [...], skills: {installed, total}}` | Pulse tab: brand health card |
| `mktg plan next --json` | `{task: {priority, description, skill, reason}}` | Pulse tab: "do this next" card |
| `mktg doctor --json` | `{tools: [...], catalogs: [...], integrations: [...]}` | Health checks, missing tool alerts |
| `mktg list --json` | `{skills: [...], agents: [...]}` with `--routing` for CMO metadata | Skill browser, routing table |
| `mktg catalog list --json` | `{catalogs: [{name, capabilities, configured, ...}]}` | Catalog health panel |
| `mktg catalog info postiz --json` | Full CatalogEntry + `configured: bool` + `missing_envs: [...]` | Postiz connection status |
| `mktg publish --list-adapters --json` | `{adapters: [{name, envVar, configured}]}` | Publish tab: adapter picker |
| `mktg publish --adapter postiz --list-integrations --json` | `{adapter: "postiz", integrations: [{id, identifier, name, ...}]}` | Publish tab: connected providers |
| `mktg publish --adapter postiz --json < manifest.json` | `{campaign, adapters: [{adapter, items, published, failed}]}` | Publish tab: draft creation |
| `mktg schema <cmd> --json` | `{name, description, flags, output, examples}` | Agent self-discovery |
| `mktg brand read <file>` | Raw markdown content of the brand file | Tab rendering (audience, voice, etc.) |

**Every command returns `CommandResult<T>`:**
```typescript
type CommandResult<T> =
 | { ok: true; data: T; exitCode: 0; display?: string }
 | { ok: false; error: MktgError; exitCode: 1|2|3|4|5|6 }
```

### 2. postiz — social distribution (external, AGPL-firewalled)

```
Repo: github.com/gitroomhq/postiz-app (NEVER fork or clone into this repo)
License: AGPL-3.0 — API-only. Network boundary = license boundary.
Hosted: https://api.postiz.com (Stripe-gated)
Self-host: Docker (6 containers: Postgres + Redis + Temporal + Elasticsearch + app + worker)
API base: ${POSTIZ_API_BASE}/public/v1/
Auth: Authorization: <key> (bare, NO "Bearer " prefix)
Rate limit: 30 POST /public/v1/posts per hour per org
```

**AGPL firewall rules (NON-NEGOTIABLE):**
- NEVER add `@postiz/node` to any package.json (AGPL-3.0, confirmed via `npm view`)
- NEVER fork/clone postiz source into this repo
- NEVER import postiz TypeScript types (write own interfaces)
- ALL interaction via raw fetch over the network boundary
- The mktg CLI's `postizFetch` helper at `publish.ts:263` already does this correctly

**Endpoints the studio uses (via mktg CLI adapter or direct fetch):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/public/v1/integrations` | GET | List connected providers |
| `/public/v1/posts` | POST | Create draft (type: "draft" for v1) |
| `/public/v1/posts?startDate=...&endDate=...` | GET | Scheduled/published queue |
| `/public/v1/is-connected` | GET | Heartbeat |

**Full API reference:** `~/projects/mktgmono/marketing-cli/docs/integration/postiz-api-reference.md` (857 lines)

## /cmo — The Brain (2,400 lines of orchestration knowledge)

/cmo is the single most important skill. The studio is a visual frontend for /cmo. The user talks to /cmo in Claude Code; Studio reflects the work through its HTTP API, Activity panel, and primary surfaces. Every "run this skill" request goes through /cmo. Every "what should I do next?" is /cmo routing.

```
Source: ~/projects/mktgmono/marketing-cli/skills/cmo/SKILL.md (478 lines)
Installed: ~/.claude/skills/cmo/SKILL.md
Rules: ~/projects/mktgmono/marketing-cli/skills/cmo/rules/ (14 files, ~1,900 lines)
```

**What /cmo knows:**
- Routes to any of 50 skills based on user intent + brand state
- 10 named orchestration playbooks (Full Product Launch, Content Engine, Founder Voice Rebrand, Conversion Audit, Retention Recovery, Visual Identity, Video Content, Email Infrastructure, SEO Authority Build, Newsletter Launch)
- L0-L4 progressive enhancement ladder (what's possible at each brand completeness level)
- Error recovery + degraded-mode playbook (what to do when integrations fail)
- Quality gate pipeline (ai-check → editorial-first-pass → content-reviewer → seo-analyst → distribute)
- Brand file → dependent skills reverse index (what to re-run when voice-profile.md changes)
- All 16 mktg CLI commands + when to use each
- All 5 sub-agents (3 research + 2 review) + spawn protocol
- External tool ecosystem (firecrawl, ffmpeg, remotion, /ply*, gh, whisper-cli, yt-dlp, summarize, Exa MCP)

**How the studio talks to /cmo:**

The Bun server sends messages to a persistent Claude Code session with /cmo loaded. Three integration patterns (decide in Phase 3):

| Pattern | How | Pros | Cons |
|---|---|---|---|
| **A. Remote session** | Claude Code remote-control API | Cleanest, persistent state | Needs session management |
| **B. Agent tool** | Studio runs inside Claude Code, uses Agent tool for /cmo | Natural nesting | Studio coupled to Claude Code |
| **C. tmux bridge** | Send keystrokes to Claude Code in tmux pane | Battle-tested (/os uses this) | Lower-tech, fragile |

## All 50 Skills (with paths + triggers)

```
Location pattern: ~/projects/mktgmono/marketing-cli/skills/<name>/SKILL.md
Installed to: ~/.claude/skills/<name>/SKILL.md
Manifest: ~/projects/mktgmono/marketing-cli/skills-manifest.json
```

### Foundation (11 skills)
| Skill | Triggers (from manifest) | Reads | Writes |
|---|---|---|---|
| `cmo` | "help me market", "what should I do next", any marketing request | all brand/ files | routes to other skills |
| `brand-voice` | "define brand voice", "extract voice" | — | brand/voice-profile.md |
| `positioning-angles` | "positioning", "unique selling proposition", "how do I stand out" | voice-profile, audience | brand/positioning.md |
| `audience-research` | "target audience", "buyer persona", "ICP" | — | brand/audience.md |
| `competitive-intel` | "competitors", "competitive analysis" | — | brand/competitors.md |
| `landscape-scan` | "market landscape", "ecosystem snapshot" | — | brand/landscape.md |
| `brainstorm` | "brainstorm", "I don't know", vague marketing ask | all brand/ files | — |
| `create-skill` | "create a skill", "new skill", "extend playbook" | — | skills/<name>/SKILL.md |
| `deepen-plan` | "deepen this plan", "add research to plan" | existing plan | enhanced plan |
| `document-review` | "audit brand files", "review brand docs" | all brand/ files | — |
| `voice-extraction` | "reverse-engineer voice", "analyze writing style" | content samples | voice analysis |

### Distribution (10 skills)
| Skill | Triggers | Key detail |
|---|---|---|
| `content-atomizer` | "atomize", "repurpose", "cross-post" | Splits long-form → 8 platforms |
| `social-campaign` | "social campaign", "schedule posts", "pre-launch content" | 5-phase orchestrator, ends in typefully OR postiz |
| `typefully` | "schedule tweet", "typefully" | X/LinkedIn via Typefully API |
| `postiz` | "post to linkedin/reddit/bluesky/mastodon/threads", "schedule via postiz" | 30+ providers via REST API |
| `email-sequences` | "email sequence", "nurture flow", "drip campaign" | Welcome, launch, re-engagement flows |
| `newsletter` | "newsletter", "editorial newsletter" | Strategy + template + growth |
| `send-email` | "send email", "transactional email" | Resend API |
| `resend-inbound` | "inbound email", "receive emails" | Resend webhooks |
| `agent-email-inbox` | "agent email inbox", "email for agent" | Secure inbound for AI agents |
| `mktg-x` | tweet URL, "read this tweet", "X bookmark" | READ-ONLY X reader |

### Creative (11 skills)
| Skill | Triggers | Key detail |
|---|---|---|
| `creative` | "creative brief", "ad copy", "AI image prompt" | 5 modes: product photos, video, social, talking head, brand |
| `marketing-demo` | "product demo", "demo video" | Screenshot-stitch or Remotion |
| `paper-marketing` | "design in paper", "marketing visuals" | Paper MCP + parallel designer agents |
| `slideshow-script` | "slideshow script", "narrative scripts" | 5 storytelling frameworks |
| `video-content` | "make a video", "video from slides" | 3-tier: ffmpeg Quick → Enhanced → Remotion |
| `tiktok-slideshow` | "TikTok slideshow", "social video" | Chains slideshow-script → paper-marketing → video-content |
| `frontend-slides` | "presentation", "pitch deck" | HTML presentations, zero deps |
| `app-store-screenshots` | "App Store screenshots" | Next.js app with html-to-image export |
| `visual-style` | "visual identity", "brand look" | Writes brand/creative-kit.md |
| `image-gen` | "generate image", "brand image" | Gemini API with brand visual identity |
| `brand-kit-playground` | "brand playground", "show brand live" | Interactive HTML brand renderer |

### Copy-Content (3 skills)
| Skill | Triggers | Key detail |
|---|---|---|
| `direct-response-copy` | "landing page", "sales copy", "CTA" | Conversion-focused copy |
| `seo-content` | "blog post", "SEO article" | Live SERP gap analysis + anti-AI detection |
| `lead-magnet` | "lead magnet", "free resource", "ebook" | Complete lead magnets with landing page copy |

### Growth (4 skills)
| Skill | Triggers | Key detail |
|---|---|---|
| `startup-launcher` | "launch on Product Hunt", "directory submissions" | 56 platforms |
| `churn-prevention` | "people keep canceling", "churn" | Cancel flow + dunning + win-back |
| `referral-program` | "referral program", "viral referral" | Incentive structures + tracking |
| `free-tool-strategy` | "free tool", "calculator", "interactive widget" | Engineering as marketing |

### Conversion (2 skills)
| Skill | Triggers | Key detail |
|---|---|---|
| `page-cro` | "audit landing page", "conversion rate" | Scores hero, CTA, social proof 1-10 |
| `conversion-flow-cro` | "optimize signup flow", "checkout friction" | Multi-step flow optimization |

### Strategy + Knowledge + Review + Infrastructure
| Skill | Category | Key detail |
|---|---|---|
| `keyword-research` | strategy | Writes brand/keyword-plan.md |
| `launch-strategy` | strategy | GTM plan, Product Hunt, beta launch |
| `pricing-strategy` | strategy | Van Westendorp, packaging, monetization |
| `marketing-psychology` | knowledge | Cialdini's 6 principles, cognitive biases |
| `ai-check` | review | Line-by-line AI slop detection |
| `editorial-first-pass` | review | Hook, thesis, promise, stakes — pass/fail |
| `ai-seo` | review | AI search optimization (ChatGPT, Perplexity, Claude, Gemini) |
| `competitor-alternatives` | review | "X vs Y" and "X alternatives" SEO pages |
| `landscape-scan` | infrastructure | Ecosystem snapshot + Claims Blacklist |

## 5 Sub-Agents

```
Installed: ~/.claude/agents/<name>.md
Source: ~/projects/mktgmono/marketing-cli/agents/<category>/<name>.md
Manifest: ~/projects/mktgmono/marketing-cli/agents-manifest.json
```

| Agent | Category | Writes | Spawned by |
|---|---|---|---|
| `mktg-brand-researcher` | research | brand/voice-profile.md | /cmo on FIRST RUN (parallel) |
| `mktg-audience-researcher` | research | brand/audience.md | /cmo on FIRST RUN (parallel) |
| `mktg-competitive-scanner` | research | brand/competitors.md | /cmo on FIRST RUN (parallel) |
| `mktg-content-reviewer` | review | none (scores only) | /cmo after content draft lands |
| `mktg-seo-analyst` | review | none (scores only) | /cmo after SEO content lands |

## 10 Brand Files

```
Location: <project-root>/brand/
Schema: ~/projects/mktgmono/marketing-cli/brand/SCHEMA.md
```

| File | Purpose | Freshness | Written by |
|---|---|---|---|
| `voice-profile.md` | Brand voice, tone, personality | 30 days | brand-voice skill |
| `audience.md` | Buyer personas, watering holes | 30 days | audience-research skill |
| `positioning.md` | Market position, angles | 30 days | positioning-angles skill |
| `competitors.md` | Competitor profiles | 30 days | competitive-intel skill |
| `landscape.md` | Ecosystem snapshot + Claims Blacklist | 14 days for content | landscape-scan skill |
| `keyword-plan.md` | Target keywords, search intent | 90 days | keyword-research skill |
| `creative-kit.md` | Visual identity, design tokens | 180 days | visual-style skill |
| `stack.md` | Marketing tools in use | 180 days | manual |
| `assets.md` | Content asset inventory | append-only | skills write here |
| `learnings.md` | What worked/didn't | append-only | mktg plan --learning |

## Dashboard Surfaces → Execution Model

### Surface 1: Pulse
```
ON LOAD:
 → mktg status --json → brief status / brand health
 → mktg plan next --json → "do this next" card
 → Read brand/audience.md if populated → audience summary
 → SELECT recent activity / opportunities → notable changes + next actions

ON REFRESH (every 15 min or manual):
 → Re-run all above
```

### Surface 2: Content (Creative Library)
```
ON LOAD:
 → SELECT * FROM signals ORDER BY severity DESC → signal feed
 → Read brand/assets.md + native publish drafts → generated assets and draft campaigns
 → mktg publish --adapter <adapter> --list-integrations --json → provider context

ON "COLLECT SIGNALS" BUTTON:
 → Send to /cmo: "Collect fresh signals from X and news"
 → /cmo routes to mktg-x + Exa MCP
 → Results stored in SQLite signals table → SSE → dashboard
```

### Pulse audience summary
```
ON LOAD:
 → Read brand/audience.md → parse into persona cards
 → Read brand/voice-profile.md → voice summary
 → Read brand/positioning.md → positioning angle

ON "REFRESH AUDIENCE" BUTTON:
 → Send to /cmo: "Refresh audience research"
 → /cmo runs audience-research skill → writes brand/audience.md
 → File watcher → SSE → dashboard
```

### Pulse next actions
```
ON LOAD:
 → Send to /cmo: "Based on current brand state, what are the top 5 actions?"
 → /cmo reads mktg status + brand/ files + progressive enhancement ladder
 → /cmo responds with ranked action cards (skill name + reason + prerequisite)
 → Store in SQLite opportunities table → render as cards

This section ALWAYS goes through /cmo — it requires intelligence to rank.
```

### Surface 3: Publish (Social Distribution)
```
ON LOAD:
 → mktg publish --list-adapters --json → adapter picker
 → mktg publish --native-account --json → native account
 → mktg publish --adapter mktg-native --list-integrations --json → native providers
 → mktg publish --native-list-posts --json → native queue/history
 → SELECT * FROM publish_log ORDER BY created_at DESC → publish history

ON "CREATE DRAFT":
 → Build publish manifest JSON from form input
 → mktg publish --adapter <adapter> --json < manifest.json
 → Store result in SQLite publish_log → SSE → dashboard
```

### Activity Panel (Side Panel)
```
EVERY MEANINGFUL /cmo ACTION:
 → /cmo runs in the user's Claude Code session
 → /cmo reads brand/ files + mktg status for grounding
 → /cmo routes to skills, writes files, publishes, or recommends next actions
 → /cmo POSTs activity/navigate/toast/brand events to the Studio API
 → Activity panel and workspace surfaces update via SSE

This is how Studio reflects /cmo. The conversation still happens in Claude Code; this panel is the durable activity trail of the orchestrator with 50 skills, 10 playbooks, and 2,400 lines of routing knowledge.
```

## SQLite Schema

```sql
CREATE TABLE signals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 platform TEXT NOT NULL, -- 'twitter', 'news', 'tiktok', 'instagram', etc.
 content TEXT NOT NULL,
 url TEXT,
 severity INTEGER DEFAULT 0, -- 0-100 score
 spike_detected BOOLEAN DEFAULT 0,
 feedback TEXT DEFAULT 'pending', -- 'pending', 'approved', 'dismissed', 'flagged'
 metadata TEXT, -- JSON blob for platform-specific fields
 created_at TEXT DEFAULT (datetime('now')),
 updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE briefs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 content TEXT NOT NULL, -- full brief markdown
 skill TEXT, -- which skill generated it
 brand_files_read TEXT, -- JSON array of brand files used as context
 created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE skill_runs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 skill TEXT NOT NULL,
 status TEXT NOT NULL, -- 'running', 'success', 'partial', 'failed'
 duration_ms INTEGER,
 brand_files_changed TEXT, -- JSON array: ["voice-profile.md", "audience.md"]
 result TEXT, -- JSON: CommandResult from mktg CLI
 note TEXT,
 created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 role TEXT NOT NULL, -- 'user' or 'assistant'
 content TEXT NOT NULL,
 skill_invoked TEXT, -- if /cmo ran a skill during this turn
 created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE opportunities (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 skill TEXT NOT NULL, -- recommended skill to run
 reason TEXT NOT NULL, -- why /cmo recommends it
 priority INTEGER DEFAULT 0, -- 0-100
 prerequisites TEXT, -- JSON: what brand files / integrations needed
 status TEXT DEFAULT 'pending', -- 'pending', 'started', 'completed', 'dismissed'
 created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE publish_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 adapter TEXT NOT NULL, -- 'postiz', 'typefully', 'resend', 'file'
 providers TEXT, -- JSON array: ["linkedin", "bluesky"]
 content_preview TEXT,
 result TEXT, -- JSON: full publish result
 items_published INTEGER DEFAULT 0,
 items_failed INTEGER DEFAULT 0,
 created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE postiz_cache (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL, -- JSON response body
 expires_at TEXT NOT NULL -- datetime, TTL 5 minutes
);

CREATE TABLE metric_baselines (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 group_name TEXT NOT NULL,
 platform TEXT NOT NULL,
 metric TEXT NOT NULL,
 baseline_value REAL,
 window_days INTEGER DEFAULT 7,
 computed_at TEXT DEFAULT (datetime('now'))
);
```

## New Files to Create

```
server.ts — Bun.serve: local API server (SQLite + SSE + mktg bridge + /cmo bridge)
db/schema.sql — SQLite schema (above)
db/migrations/ — schema migration files
lib/mktg.ts — mktg CLI bridge: spawn + parse CommandResult<T> + typed wrappers
lib/agent.ts — Claude Code bridge: send messages to /cmo, receive responses
lib/sse.ts — SSE event emitter (server) + useSSE hook (client)
lib/sqlite.ts — SQLite connection + typed query helpers
lib/watcher.ts — brand/ file watcher (Bun.watch) → SSE events
lib/postiz.ts — thin postiz API client (mirrors mktg's postizFetch for direct queries)
lib/jobs.ts — background job queue for long-running skill executions
app/(dashboard)/publish/ — new Publish tab route
components/workspace/publish/ — Publish tab components
components/workspace/skill-browser/ — skill browser + execution trigger UI
```

## Build Phases

### Phase 1: Bootstrap the dashboard skeleton (2-3 days)
- Scaffold the Next.js dashboard inside `studio/`
- Strip any cloud-coupled scaffolding: convex/, agent/, middleware.ts, fly.toml, railway.json, Dockerfile.agent, sign-in/, sign-up/, deck/
- Remove package.json deps: convex, @clerk/*, @convex-dev/*
- Add: bun:sqlite, create db/schema.sql
- Create: server.ts skeleton (Bun.serve with /api/health endpoint)
- Verify: `bun dev` starts Next.js on localhost:3000 (empty dashboard)

### Phase 2: Wire Infrastructure (3-4 days)
- Build lib/mktg.ts — shells out to `mktg <cmd> --json`, parses CommandResult, typed wrappers
- Build lib/sqlite.ts — connection, query helpers, migration runner
- Build lib/watcher.ts — Bun.watch on brand/ → SSE events
- Build lib/sse.ts — server-side EventSource emitter + client useSSE hook
- Wire Pulse tab: mktg status + plan next → render cards
- Verify: change brand/voice-profile.md → Pulse tab updates in <2s

### Phase 3: Wire /cmo (3-4 days)
- Build the Studio HTTP API /cmo calls from Claude Code
- Wire Activity panel: `/api/activity/log` + `/api/events` → display
- Build lib/jobs.ts — background job queue for long-running skills
- Wire skill execution: "run landscape-scan" → /cmo → background job → SSE progress → result
- Verify: /cmo logs grounded marketing work referencing brand/ files

### Phase 4: Port primary surfaces (5-7 days)
- Pulse: brand health, audience summary, and ranked next actions
- Content: generated assets, native publish drafts, brand asset inventory
- Publish: native providers, Postiz providers, draft form, scheduled queue, history, rate limit counter
- Brand: visual editor for brand memory and assets
- Settings: local API keys, provider health, doctor output, and reset controls
- Port signal severity + spike detection from Convex to local TypeScript

### Phase 5: Skill Browser + Onboarding (2-3 days)
- Skill browser: `mktg list --json` → browse all 50 skills, one-click trigger
- Execution progress: running → result → files changed
- Onboarding: detect fresh install (mktg status → needs-setup) → wizard → mktg init → foundation skills
- First-run "wow moment": Pulse, Signals, Publish, Brand, and Settings populate as foundation skills complete

### Phase 6: Polish + Test (2-3 days)
- E2E walkthrough: fresh install → mktg init → primary surfaces populated
- Offline mode: graceful degradation when postiz/LLM unavailable
- Component tests (Vitest + Testing Library) with fixture data
- Server tests (mktg CLI JSON fixtures)
- Performance: dashboard <1s load, skill execution feedback <100ms

**Total: ~4 weeks with agent team. ~6 weeks solo.**

## Meta-Prompt for the Building Team

> Fuse two layers into a local-first marketing studio that makes a solo builder feel like they have a full marketing department on their laptop.
>
> **Dashboard layer (this repo)**: 5 workspace tabs (Pulse, Signals, Publish, Brand, Settings), Activity panel, signal severity scoring. Local-first — no cloud dependencies.
>
> **mktg** is the marketing brain — 50 skills, /cmo orchestrator (2,400 lines of routing knowledge), brand memory (10 files that compound), upstream catalogs. This is the engine. Everything runs through `mktg --json` for infrastructure and /cmo for intelligence.
>
> **postiz** is the distribution layer — 30+ social providers via REST API. AGPL-firewalled. Call it, never fork it.
>
> **The one rule:** /cmo is the brain. The studio talks to /cmo. /cmo routes to skills. Skills call mktg CLI. The studio NEVER calls Anthropic directly.
>
> **Quality bar:** Linear-fast, information-dense. Every skill execution visible. Every brand file change ripples through the dashboard in real time. Works offline except /cmo + postiz.
>
> **Done = Pulse, Signals, Publish, Brand, Settings, Activity, and any of 50 skills triggerable from UI + zero cloud dependency for data.**
