---
title: "feat: Implement mktg CLI — agent-native marketing playbook"
type: feat
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md
deepened: 2026-03-12
---

# feat: Implement mktg CLI — Agent-Native Marketing Playbook

## Enhancement Summary

**Deepened on:** 2026-03-12
**Refined on:** 2026-03-12
**Agents used:** 13 initial + 5 refinement (skill consolidation, workflow chains, token budget, agent UX simulation, competitive patterns)

### Key Improvements

1. **Radical simplification** — 13 commands → 5 core commands. The CLI is an installer + health checker, not a content orchestration platform.
2. **Consolidated skill inventory** — 43 source → 31 after audit → **24 final** after refinement (5 merges + 2 absorptions into /cmo). Zero methodology lost.
3. **Token budget trimmed** — ~280K tokens → ~218K tokens (22% reduction) via deduplication and lazy-loading references. Every SKILL.md targets <800 lines.
4. **Agent UX blockers fixed** — `/cmo` skill is #1 priority, `_system/` path references inlined, disambiguation matrix added, stale SaaS references scrubbed.
5. **Extensibility architecture** — Drop-in skill format, manifest-driven registry, `/cmo` reads manifest dynamically. "Add a skill" = drop SKILL.md + update manifest. Agent can do this autonomously.
6. **Type-safe foundation** — `src/types.ts` with discriminated unions (`CommandResult<T>`), `tsconfig.json` with `strict` + `noUncheckedIndexedAccess`, `parseArgs` from `node:util`.
7. **Security hardening** — `sandboxPath()` utility, argument arrays for all subprocesses, SHA-256 integrity hashes, rate limiting for external actions.

### Critical Architectural Insights

> **The SKILL.md files are the product, not the CLI.** The CLI's job is to get skills installed and brand/ scaffolded. Everything else — the agent handles by reading skills and calling tools directly.
>
> — Code Simplicity Review

> **The system must grow without code changes.** Adding a new marketing skill should never require touching CLI source code, rebuilding, or redeploying. Drop a SKILL.md, update the manifest, run `mktg update`. That's it.
>
> — Extensibility Principle

---

## Overview

Build `mktg` — a TypeScript/Bun CLI that gives AI agents full CMO capabilities. One install (`bun install -g mktg`) + one command (`mktg init`) = agent becomes a fully capable marketing department for any project.

The brainstorm (see brainstorm: `docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md`) defines the skill system, `/cmo` orchestrator skill, agent-first CLI design principles, and the CEO app as the first target.

## Problem Statement / Motivation

Moiz runs 5+ projects (CEO app, Halaali, HalalScreen, SkillCreator, etc.) that all need marketing. 29 proven marketing skills exist across two repos (`skills-v2` and `marketingskills`) but there's no unified way to install, orchestrate, or have an agent use them autonomously. Manual marketing across projects doesn't scale.

## Current State

The repo has:
- `src/cli.ts` — basic entry point with help text and `NOT_IMPLEMENTED` stub
- `skills/cmo/SKILL.md` — placeholder `/cmo` skill
- `all-skills/` — all source skills present:
  - `all-skills/skills-v2/` — 11 deep skills + `_system/` (brand-memory.md, output-format.md)
  - `all-skills/marketingskills/skills/` — 32 breadth skills
  - `all-skills/marketingskills/tools/` — 68 integration tools (all SaaS-dependent, all dropped)
  - `all-skills/skills/` — remotion-best-practices
- `package.json` — bare scaffold, no dependencies
- No commands implemented, no tests, no brand/ scaffolding logic

---

## Skill Inventory (Revised)

### Research Insights: Skill Audit Results

Three parallel audit agents analyzed all 43 source skills. Results:

### V2 Deep Skills (11 → 11, all kept)

| Skill | Value | Recommendation | Notes |
|-------|:-----:|----------------|-------|
| brand-voice | 10/10 | **KEEP** | Foundation. Every other skill reads its output. Zero rework. |
| positioning-angles | 10/10 | **KEEP** | Leanest, most focused skill (767 lines). Schwartz + 8 angle generators. |
| direct-response-copy | 10/10 | **KEEP** | Best skill in the set. 7-dimension scoring, variant generation, A/B tests. |
| content-atomizer | 9/10 | **KEEP** | 8 platforms with algorithm-aware formatting. Kills `social-content`. |
| email-sequences | 9/10 | **KEEP** | 6 sequence types, timing science, ESP detection. Kills `email-sequence`. |
| lead-magnet | 9/10 | **KEEP** | Concept + build two-phase. 9 format types. No equivalent. |
| seo-content | 9/10 | **KEEP** | SERP gap analysis, anti-AI-detection, JSON-LD generation. |
| start-here | 9/10 | **KEEP-MODIFY** | Merge orchestration logic into `/cmo` skill. |
| keyword-research | 8/10 | **KEEP** | 6 Circles Method. Works without web search. Kills `content-strategy`. |
| newsletter | 8/10 | **KEEP** | 6 archetypes, monetization paths. No equivalent. |
| creative | 6/10 | **KEEP-MODIFY** | Provider-agnostic rewrite needed (remove Replicate dependency). |

**System files disposition:**
- `_system/brand-memory.md` → Absorb into `/cmo` skill + CLI core
- `_system/output-format.md` → Absorb into `/cmo` skill + CLI core

### Marketingskills (32 → 18: 16 standalone + 2 merged)

**KEEP (16 skills):**

| Skill | Value | Category | Notes |
|-------|:-----:|----------|-------|
| marketing-psychology | 9/10 | Knowledge | 50+ psych principles. Makes every other skill better. |
| launch-strategy | 9/10 | Strategy | 5-phase launch framework, Product Hunt playbook. Fills v2 gap. |
| ai-seo | 8/10 | SEO | **Upgraded from NICE TO HAVE.** AI search optimization — increasingly critical. |
| pricing-strategy | 8/10 | Strategy | Van Westendorp, value-based pricing. Every project needs this. |
| page-cro | 8/10 | Conversion | Landing page audit. **Absorbs form-cro + popup-cro.** |
| seo-audit | 8/10 | SEO | Technical SEO health checks. Works without SaaS tools. |
| copy-editing | 8/10 | Copy | Seven Sweeps framework. Complements v2's copywriting. |
| cold-email | 7/10 | Copy | B2B outbound. Relevant for partnerships, backlinks. |
| programmatic-seo | 7/10 | SEO | Pages at scale. Relevant for HalalScreen, SkillCreator. |
| competitor-alternatives | 7/10 | SEO | "X vs Y" and "X alternatives" pages. High SEO value. |
| churn-prevention | 7/10 | Growth | Cancel flows, dunning. Relevant once apps have paying users. |
| site-architecture | 6/10 | SEO | URL structure, navigation, internal linking. |
| marketing-ideas | 6/10 | Strategy | 139 ideas library. Low cost to keep. |
| free-tool-strategy | 6/10 | Growth | Engineering as marketing. Relevant for dev-founder. |
| referral-program | 5/10 | Growth | Referral loops, incentive design. |
| schema-markup | 5/10 | SEO | JSON-LD structured data. 179 lines, pure code output. |

**MERGE (6 → 2):**

| Merged Skill | Sources | Reasoning |
|---|---|---|
| **page-cro** (expanded) | page-cro + form-cro + popup-cro | All page-level conversion optimization. Absorb unique popup/form patterns. |
| **conversion-flow-cro** (new) | signup-flow-cro + onboarding-cro + paywall-upgrade-cro | Sequential user journey: signup → activation → upgrade. |

**CUT (10 skills):**

| Skill | Reason |
|-------|--------|
| product-marketing-context | v2 `start-here` + `brand-voice` wins. Creates split-brain with brand/ system. |
| content-strategy | v2 `keyword-research` wins for SERP validation. |
| copywriting | v2 `direct-response-copy` wins (10x deeper). |
| email-sequence | v2 `email-sequences` wins (brand voice + A/B). |
| social-content | v2 `content-atomizer` wins (8 platforms + algo). |
| paid-ads | Requires external SaaS ad accounts. No budget. |
| ad-creative | Requires external SaaS ad accounts. |
| ab-test-setup | Requires traffic volume (6k-150k per variant). |
| revops | Requires sales team + CRM. |
| sales-enablement | Requires sales team. |

### Phantom Skills (2 to build)

| Skill | Priority | Brand File Owned | Depended On By |
|-------|----------|-----------------|----------------|
| **audience-research** | CRITICAL | `brand/audience.md` | 8 of 11 v2 skills read it |
| **competitive-intel** | HIGH | `brand/competitors.md` | keyword-research, positioning-angles |

### Final Skill Count: 24 (revised from 31 after refinement agents)

**Refinement consolidation (31 → 24, -7 skills, -1,309 lines, zero methodology lost):**

| Action | From | To | Skills Removed | Lines Saved |
|--------|------|-----|:--------------:|------------:|
| Merge A | seo-audit + site-architecture + schema-markup | seo-audit (3 modes: audit/architecture/schema) | 2 | ~448 |
| Merge B | cold-email + copy-editing + direct-response-copy | direct-response-copy (3 modes: generate/cold-email/edit) | 2 | ~147 |
| Merge C | marketing-ideas | /cmo references (ideas library) | 1 | ~167 |
| Merge D | analytics-tracking | /cmo references (tracking guide) | 1 | ~309 |
| Mode 1 | programmatic-seo | seo-content (scale mode) | 1 | ~238 |

**Final 24 skills:**

| # | Skill | Category | Notes |
|---|-------|----------|-------|
| 1 | `/cmo` | Foundation | Orchestrator + marketing-ideas ref + analytics ref |
| 2 | `brand-voice` | Foundation | Voice DNA |
| 3 | `positioning-angles` | Foundation | Positioning + angles |
| 4 | `audience-research` | Foundation | Phantom — must build. 8 skills depend on it. |
| 5 | `competitive-intel` | Foundation | Phantom — must build. |
| 6 | `keyword-research` | Strategy | 6 Circles Method |
| 7 | `launch-strategy` | Strategy | 5-phase launch framework |
| 8 | `pricing-strategy` | Strategy | Van Westendorp, value-based |
| 9 | `direct-response-copy` | Copy & Content | + cold-email mode + edit mode |
| 10 | `seo-content` | Copy & Content | + programmatic-seo scale mode |
| 11 | `lead-magnet` | Copy & Content | Concept + build |
| 12 | `content-atomizer` | Distribution | 8-platform repurposing |
| 13 | `email-sequences` | Distribution | 6 sequence types |
| 14 | `newsletter` | Distribution | Editorial newsletters |
| 15 | `creative` | Creative | 5 visual modes |
| 16 | `seo-audit` | SEO | + architecture mode + schema mode |
| 17 | `ai-seo` | SEO | AI search optimization |
| 18 | `competitor-alternatives` | SEO | Comparison/alternative pages |
| 19 | `page-cro` | Conversion | Landing + form + popup |
| 20 | `conversion-flow-cro` | Conversion | Signup + onboarding + paywall |
| 21 | `churn-prevention` | Growth | Cancel flows + dunning |
| 22 | `referral-program` | Growth | Viral loops |
| 23 | `free-tool-strategy` | Growth | Engineering as marketing |
| 24 | `marketing-psychology` | Knowledge | 50+ psych principles |

**Minimum viable for 90% coverage: 13 skills** (/cmo + skills 2-13). The remaining 11 ship but activate only when relevant.

### Token Budget (from refinement analysis)

**Current:** ~280K tokens across 71 files. **Target:** ~218K tokens (22% reduction).

**Priority trimming:**
1. Deduplicate Brand Memory / Output Format / Feedback sections repeated across 10 skills (~18K savings)
2. Extract inline reference material to lazy-loaded files (~25K savings)
3. Split oversized creative mode files (~15K savings)
4. Trim output-format template library (~4K savings)

**Target per SKILL.md:** <800 lines (~5K tokens). Model to follow: `positioning-angles` (767 lines + 5 reference files) and `remotion-best-practices` (61-line router + 37 granular rules).

### Integration Tools: All Dropped

The entire `all-skills/marketingskills/tools/` directory (68 tools) is dropped. Every tool requires external SaaS API keys. CLI-only integrations remain: `gws`, `playwright-cli`, `ffmpeg`, `gh`, Exa MCP.

**Stale SaaS references to scrub from v2 skills:** Mailchimp, ConvertKit, HubSpot, Buffer, Hootsuite, Replicate — all boomer-era dashboard tools. Replace with agentic tool detection via `brand/stack.md`. Skills should reference `gws` for email, `playwright-cli`/`ply` for social, `remotion` for video, `exa` for research.

---

## Technical Approach

### Architecture (Revised)

```
src/
├── cli.ts                    # Entry point, command registry, global flag parsing
├── types.ts                  # All shared TypeScript types (CommandResult, CommandHandler, etc.)
├── commands/
│   ├── init.ts               # Thin orchestrator: detect project, scaffold brand/, install skills
│   ├── doctor.ts             # Health checks + skill update detection
│   ├── list.ts               # Show available skills with status
│   ├── status.ts             # Project marketing state summary
│   └── update.ts             # Re-copy skills from package to agent config
├── core/
│   ├── output.ts             # JSON/TTY formatting, --json, --fields, formatOutput<T>
│   ├── errors.ts             # Structured errors, exit codes 0-6, sandboxPath()
│   ├── brand.ts              # Brand dir management + context matrix (merged)
│   └── skills.ts             # Skill registry, install, enumerate
skills/
└── cmo/
    └── SKILL.md              # Single file: triggers, routing, workflows, brand usage, CLI reference
skills-manifest.json          # Definitive skill list with metadata (name, source, category, tier)
tsconfig.json                 # strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
```

### TypeScript Type System

Define these before writing any commands (`src/types.ts`):

```typescript
import { parseArgs } from "node:util";

// Global flags every command receives
export type GlobalFlags = {
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly fields: readonly string[];
  readonly cwd: string;  // --cwd for multi-project targeting
};

// Discriminated union for command results
export type CommandResult<T = unknown> =
  | { readonly ok: true; readonly data: T; readonly exitCode: 0 }
  | { readonly ok: false; readonly error: MktgError; readonly exitCode: ExitCode };

// Structured errors
export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=success, 1=not found, 2=invalid args, 3=dependency missing,
// 4=skill execution failed, 5=network error, 6=not implemented (temporary)

export type MktgError = {
  readonly code: string;
  readonly message: string;
  readonly suggestions: readonly string[];
};

// Command handler signature
export type CommandHandler<T = unknown> = (
  args: readonly string[],
  flags: GlobalFlags,
) => Promise<CommandResult<T>>;

// Brand file names as literal union
export type BrandFile =
  | "voice-profile.md" | "positioning.md" | "audience.md"
  | "competitors.md" | "keyword-plan.md" | "creative-kit.md"
  | "stack.md" | "assets.md" | "learnings.md";

// Skill metadata
export type SkillSource = "v2" | "v1" | "new";
export type SkillCategory =
  | "foundation" | "strategy" | "copy-content" | "distribution"
  | "creative" | "conversion" | "seo" | "growth" | "knowledge";

export type SkillLayer = "foundation" | "strategy" | "execution" | "distribution";

export type SkillMeta = {
  readonly name: string;
  readonly source: SkillSource;
  readonly category: SkillCategory;
  readonly layer: SkillLayer;
  readonly reads: readonly BrandFile[];
  readonly writes: readonly BrandFile[];
  readonly dependsOn: readonly string[];
  readonly triggers: readonly string[];
  readonly tier: "must-have" | "nice-to-have";
  readonly reviewIntervalDays: number;
};
```

### Command Router

```typescript
// src/cli.ts
const commands: Record<string, () => Promise<{ handler: CommandHandler }>> = {
  init: () => import("./commands/init"),
  doctor: () => import("./commands/doctor"),
  list: () => import("./commands/list"),
  status: () => import("./commands/status"),
  update: () => import("./commands/update"),
};
```

### Flag Parsing

```typescript
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    fields: { type: "string", default: "" },
    help: { type: "boolean", default: false },
    version: { type: "boolean", default: false },
    cwd: { type: "string", default: process.cwd() },
  },
  allowPositionals: true,
  strict: true,
});
```

### Output Formatting

```typescript
export const formatOutput = <T>(
  result: CommandResult<T>,
  flags: GlobalFlags,
): string => {
  if (!result.ok) return JSON.stringify({ error: result.error });
  const filtered = flags.fields.length > 0
    ? pickFields(result.data, flags.fields)
    : result.data;
  if (flags.json || !isTTY()) return JSON.stringify(filtered);
  return formatForTerminal(filtered);
};
```

### Bun Patterns

- `Bun.file()` / `Bun.write()` for file I/O, `Bun.$` for subprocesses, `Bun.which()` for tool detection, `Bun.Glob` for scanning
- `bun test` with `bun:test` imports — zero setup
- `--target node` in build for npm portability, `#!/usr/bin/env bun` shebang for direct execution

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

---

## Extensibility & Compounding Architecture

The core design question: **how does an agent add a new marketing skill tomorrow without touching CLI source code?**

### The Drop-In Skill Contract

Every skill is a directory with one required file:

```
skills/
└── my-new-skill/
    ├── SKILL.md           # REQUIRED — the skill itself
    └── references/        # OPTIONAL — lazy-loaded deep content
        ├── examples.md
        └── frameworks.md
```

**SKILL.md format contract** (the only thing a skill author needs to know):

```markdown
---
name: my-new-skill
description: One line — what this skill does
category: foundation | strategy | copy-content | distribution | creative | seo | conversion | growth | knowledge
tier: must-have | nice-to-have
reads: [voice-profile.md, positioning.md]   # brand files this skill needs
writes: [keyword-plan.md]                    # brand files this skill owns (exclusive)
triggers: ["find keywords", "keyword research", "SEO topics"]  # natural language triggers for /cmo routing
---

## On Activation
[What the agent does when this skill is invoked]

## Workflow
[Step-by-step instructions]

## Output
[What gets produced and where]
```

**That's it.** Follow the contract, drop the file, update the manifest. The skill works.

### skills-manifest.json — The Registry

```json
{
  "version": 1,
  "skills": {
    "brand-voice": {
      "source": "v2",
      "category": "foundation",
      "layer": "foundation",
      "tier": "must-have",
      "reads": ["voice-profile.md"],
      "writes": ["voice-profile.md"],
      "depends_on": [],
      "triggers": ["brand voice", "voice profile", "tone of voice"],
      "review_interval_days": 90
    }
  },
  "redirects": {
    "copywriting": "direct-response-copy",
    "content-strategy": "keyword-research",
    "social-content": "content-atomizer",
    "email-sequence": "email-sequences"
  }
}
```

**Key design decisions:**
- `/cmo` reads this manifest dynamically — never hardcodes skill names
- `redirects` map CUT/renamed skills to their replacements (agents never hit dead ends)
- `writes` fields enforce ownership — only one skill can write to each brand file
- `triggers` enable fuzzy routing — `/cmo` matches user intent to skills

### How an Agent Adds a New Skill

Scenario: "Hey agent, I found a great Twitter/X growth strategy. Add it to mktg."

1. Agent creates `skills/x-growth/SKILL.md` following the contract
2. Agent adds entry to `skills-manifest.json` with category, triggers, reads/writes
3. Agent runs `mktg update` — skill gets installed to `~/.claude/skills/x-growth/`
4. Agent runs `mktg doctor` — verifies the new skill passes health checks
5. Next time `/cmo` is invoked, it reads the manifest and sees the new skill
6. Done. No CLI code changes. No rebuild. No redeploy.

### How Knowledge Compounds

**Per-session:** `brand/learnings.md` (append-only) captures what worked and what didn't. Every skill's output section includes: "Append what worked/didn't to `brand/learnings.md`."

**Per-skill:** Skills that read `learnings.md` adapt their approach. If a previous email sequence had 45% open rate with curiosity-gap subjects, `email-sequences` will lean into that pattern next time.

**Per-project:** The `brand/` directory IS the compound memory. It grows richer with every marketing session. Skills at L0 (no context) produce generic output. At L4 (full brand context), they produce highly targeted, brand-consistent output.

**Cross-project:** When you run `mktg init` on a new project, the skills are already installed globally. The agent already knows HOW to do marketing. Only the `brand/` context is project-specific. The learnings from CEO app's marketing make the skills themselves better (via skill updates), which benefits Halaali, HalalScreen, and every future project.

### Growth Vectors

| Vector | How It Works | Example |
|--------|-------------|---------|
| **New skill** | Drop SKILL.md + manifest entry | "Add a podcast marketing skill" |
| **Skill mode** | Add mode file to existing skill's `modes/` | "Add a LinkedIn mode to content-atomizer" |
| **Reference material** | Add to skill's `references/` | "Add B2B SaaS examples to direct-response-copy" |
| **Brand enrichment** | Agent writes richer brand files over time | Voice profile gains nuance with each campaign |
| **Learnings compounding** | `brand/learnings.md` grows with each session | "Listicle headlines outperform question headlines for this audience" |
| **Skill improvement** | Agent rewrites SKILL.md based on learnings | "email-sequences could be better at segmentation — let me improve it" |

### Workflow Chains (from refinement analysis)

**First 30 minutes redesigned:** Run 3 foundation skills in parallel (brand-voice + audience-research + competitive-intel) instead of 2. Then positioning-angles. Then first execution skill. User gets 4/7 brand files + a tangible deliverable within 30 min.

**Critical fix — structured handoffs:** Skills currently write free-form markdown but downstream skills need specific fields. Fix: YAML front-matter on all skill outputs (title, hook, headline, etc.) so the next skill in the chain can parse reliably.

**Gateway skills ranked by unlock count:**
1. `brand-voice` — unlocks 9 skills
2. `audience-research` — unlocks 8 (phantom, must build first)
3. `positioning-angles` — unlocks 6
4. `competitive-intel` — unlocks 4 (phantom, must build)

**Key constraint from competitive research:** **Skills never call skills.** Skills read/write files, `/cmo` orchestrates. Prevents God-skill antipattern. (Mirrors GitHub Actions model.)

### Competitive Patterns to Adopt

From competitive patterns research (refine-5):

| Pattern | Source | How We Apply It |
|---------|--------|----------------|
| Skill dependency DAG | dbt's `ref()` model | Add `depends_on` to `skills-manifest.json` — agent knows prerequisite order |
| Four skill layers | dbt (source/staging/intermediate/mart) | Classify skills: Foundation → Strategy → Execution → Distribution |
| Review intervals per output | agent-skill-creator | `review_interval_days` in manifest replaces arbitrary freshness tiers |
| Named workflow recipes | ActiveCampaign | Serializable chain definitions in `/cmo` the agent can execute deterministically |
| Content readiness scoring | MarketMuse | `readiness_score` percentage in `mktg status --json` |
| 30/70 create/distribute ratio | Solo founder consensus | Encode as planning heuristic in `/cmo` |
| Skills never call skills | GitHub Actions | Skills read/write files only. `/cmo` orchestrates. |

### Agent-Driven Skill Improvement Protocol

When an agent notices a skill could be better (e.g., missing a framework, outdated pattern, weak in a specific area):

1. Agent reads current SKILL.md
2. Agent writes improved version to `skills/[name]/SKILL.md`
3. Agent updates manifest if triggers/reads/writes changed
4. Agent runs `mktg update` to install the improved version
5. Agent appends to `brand/learnings.md`: "Improved [skill] — added [what]"

This means **the marketing system gets smarter every time an agent uses it**. Not just the brand context — the skills themselves evolve.

---

## Implementation Phases (Revised: 2 Phases)

### Phase 1: CLI Works (`init` → `doctor` → `list` → `status` → `update` + `/cmo` skill)

**Goal:** `mktg init` works on any project, installs skills, builds brand/ scaffold. `mktg doctor` validates. `mktg status` gives agents a snapshot. The `/cmo` skill teaches agents how to do marketing.

**Tasks:**

1. **Type system + config** (`src/types.ts`, `tsconfig.json`, `skills-manifest.json`)
   - Define all shared types: `CommandResult<T>`, `CommandHandler`, `MktgError`, `GlobalFlags`, `BrandFile`, `SkillMeta`, `FreshnessLevel`
   - Create `tsconfig.json` with strict mode
   - Create `skills-manifest.json` with all 24 skills' metadata (name, source, category, tier, reads, writes, triggers) + redirects for CUT skills

2. **Core infrastructure** (`src/core/`)
   - `output.ts` — Generic `formatOutput<T>`, JSON/TTY auto-detection, `--fields` filtering. Only `cli.ts` calls `process.exit()` (error boundary pattern).
   - `errors.ts` — Structured error type, exit codes 0-6, `sandboxPath()` utility (resolve + verify starts with project root), input validation helpers (Result types, not throws)
   - `brand.ts` — Brand dir scaffolding, context matrix (using `satisfies` for compile-time validation), freshness assessment as pure function
   - `skills.ts` — Read `skills-manifest.json`, copy bundled skills to `~/.claude/skills/`, detect installed vs missing, SHA-256 integrity verification

3. **`mktg init`** (`src/commands/init.ts`)
   - **Non-TTY never prompts** (critical for agents): when `isatty(stdin) === false`, require `--json` input or emit `MISSING_INPUT` error with example payload
   - Interactive two-question onboarding only when TTY
   - Project detection: scan for package.json, README, existing brand/
   - Scaffold `brand/` directory with 9 template files (7 profile + 2 append-only)
   - Install 24 skills to `~/.claude/skills/` using parallel `Bun.write()` with `Promise.all()`
   - Install `/cmo` skill
   - Auto-call doctor handler (in-process import, not subprocess)
   - `--json`, `--dry-run`, `--cwd` support

4. **`mktg doctor`** (`src/commands/doctor.ts`)
   - Parallel health checks via `Promise.all()`:
     - Brand files: 7 profile files exist + non-empty, 2 append-only files exist (can be empty)
     - Skills: all registered skills installed (count from manifest, not hardcoded)
     - CLIs: `gws`, `playwright-cli`, `ffmpeg`, `bun` via `Bun.which()`
   - JSON output with pass/fail/warn per check
   - Exit code 0 if all pass, 1 if issues found (breakdown in JSON, not exit code)

5. **`mktg list`** (`src/commands/list.ts`)
   - Read from `skills-manifest.json` (zero file I/O at runtime for metadata)
   - Group by category (Foundation, Strategy, Copy & Content, etc.)
   - Status: installed/missing
   - `--json`, `--fields`

6. **`mktg status`** (`src/commands/status.ts`)
   - **Most important missing command** (per agent-native reviews)
   - Returns project marketing state snapshot:
     ```json
     {
       "brand": { "voice-profile.md": { "exists": true, "freshness": "current", "age_days": 3 }, ... },
       "content": { "emails": 4, "social": 12, "landing-pages": 1 },
       "health": "ready"
     }
     ```
   - First thing `/cmo` reads to orient on returning visits

7. **`mktg update`** (`src/commands/update.ts`)
   - Re-copy bundled skills over installed ones
   - Report what changed (diff check)
   - Simple: no version tracking system, just file copy

8. **Command router** (`src/cli.ts`)
   - Lazy dynamic imports for command handlers
   - Global flags: `--json`, `--dry-run`, `--fields`, `--help`, `--version`, `--cwd`
   - `--help --json` returns structured command list for agent discovery
   - `--version` returns `{"version": "0.1.0"}` in JSON mode
   - Only `cli.ts` calls `process.exit()` — commands return `CommandResult`

9. **`/cmo` skill** (`skills/cmo/SKILL.md`) — **#1 PRIORITY (from agent UX simulation)**
   - Single file under 300 lines (not 5 separate reference docs)
   - Absorbs `start-here` orchestration logic
   - Absorbs `_system/brand-memory.md` and `_system/output-format.md` — **INLINE, not by path reference** (skills installed to `~/.claude/skills/` won't have `_system/` next to them)
   - Contains inline: CLI reference, 7 workflows, brand memory rules, context matrix, safety rules
   - **Disambiguation matrix** — maps common requests to exactly one skill (e.g., "launch emails" → `email-sequences`, not `launch-strategy`)
   - **Redirect table** — maps CUT skill names to replacements (reads from `skills-manifest.json`)
   - **Missing context resolution** — when `audience.md` is missing, gather info ONCE and write it before proceeding (don't re-ask per skill)
   - **Context switch protocol** — "When switching projects: (1) `mktg status --json --cwd <target>`, (2) verify project name, (3) never carry brand context across"
   - **Skill improvement protocol** — agents can improve skills by rewriting SKILL.md + running `mktg update`
   - Key agent instructions: always run `mktg status --json` first, use `--dry-run` before external actions, call agentic tools directly for distribution
   - **References dir:** `skills/cmo/references/` with `ideas-library.md` (absorbed from marketing-ideas) and `analytics-guide.md` (absorbed from analytics-tracking)

10. **Phantom skills** (write SKILL.md for each)
    - `audience-research` — Community mining, buyer profiles, watering holes. Owns `brand/audience.md`. 8 skills depend on its output.
    - `competitive-intel` — Competitor teardowns via web search. Owns `brand/competitors.md`. keyword-research and positioning-angles depend on it.

11. **Skill modifications + consolidation merges**
    - `creative` — Provider-agnostic rewrite: make prompt-only the primary mode, remove hardcoded model names, add model registry via `brand/stack.md`
    - `start-here` — Merge orchestration logic into `/cmo`, keep as a stripped-down routing reference
    - `page-cro` — Absorb unique patterns from form-cro and popup-cro
    - Create `conversion-flow-cro` — Merge signup-flow-cro + onboarding-cro + paywall-upgrade-cro
    - `seo-audit` — Absorb site-architecture + schema-markup as modes (Merge A)
    - `direct-response-copy` — Add cold-email mode + edit mode from copy-editing (Merge B)
    - `seo-content` — Add programmatic-seo as scale mode (Mode 1)
    - `marketing-ideas` → `/cmo` references (Merge C)
    - `analytics-tracking` → `/cmo` references (Merge D)
    - **Scrub all stale SaaS references** from every v2 skill — replace with agentic tool detection

12. **Structured handoff format** (from workflow chain analysis)
    - Define YAML front-matter schema for all skill outputs (title, type, skill, date, key fields)
    - Downstream skills parse front-matter to extract structured data instead of regex-matching free-form markdown
    - Add `content-atomizer` promotion mode (repurpose content to promote a lead magnet/newsletter, not just atomize it)

13. **Token trimming pass** (from token budget analysis)
    - Strip duplicate Brand Memory / Output Format / Feedback sections from all SKILL.md files → single-line references (~18K tokens saved)
    - Extract inline reference material to `references/` dirs (~25K tokens saved)
    - Split oversized creative mode files (talking-head.md, ad-creative.md) into core + reference appendices (~15K tokens saved)
    - Target: every SKILL.md under 800 lines

**Success criteria:**
- [ ] `mktg init` on a fresh project creates brand/ with 9 files
- [ ] `mktg init` installs 24 skills to `~/.claude/skills/` with parallel writes
- [ ] `mktg init --json '{"business":"CEO app","goal":"launch"}'` works non-interactively
- [ ] Non-TTY stdin never prompts — emits `MISSING_INPUT` error
- [ ] `mktg doctor` reports all-green after clean init (parallel checks)
- [ ] `mktg list --json` shows all 24 skills with correct categories
- [ ] `mktg status --json` returns brand state + content counts
- [ ] `mktg --help --json` returns structured command list
- [ ] `mktg --version` outputs version
- [ ] `--cwd` flag works for multi-project targeting
- [ ] All commands output JSON with `--json` flag
- [ ] Structured errors with correct exit codes (0-6)
- [ ] `sandboxPath()` rejects path traversal, absolute paths, symlinks
- [ ] Skill installation verifies SHA-256 integrity
- [ ] `/cmo` skill is complete with disambiguation matrix, redirect table, context switch protocol, skill improvement protocol
- [ ] `audience-research` and `competitive-intel` SKILL.md files written
- [ ] `creative` skill reworked to be provider-agnostic
- [ ] All 5 consolidation merges complete (31→24 skills)
- [ ] Every SKILL.md under 800 lines (token trimming pass)
- [ ] Zero stale SaaS references in any skill file
- [ ] `_system/` path references replaced with inline instructions in all skills
- [ ] `skills-manifest.json` includes redirects for all CUT skills
- [ ] Agent can add a new skill by dropping SKILL.md + updating manifest (no CLI code changes)

### Phase 2: Prove on CEO App + Iterate

**Goal:** Run the full system on the CEO app ("Startup in Your Pocket" iOS app). Agent uses `/cmo` + skills + CLI to generate a complete marketing package. Iterate based on what's actually needed.

**Tasks:**

1. **CEO app test run**
   - `mktg init` in CEO app project (brand partially defined: periwinkle #6366f1, Inter font, grid texture)
   - Agent reads `/cmo`, assesses state via `mktg status --json`
   - Agent follows skill workflows to build brand/ files
   - Agent generates content (landing page copy, email sequences, social posts, SEO articles)
   - Agent reviews quality using direct-response-copy scoring rubric

2. **Discover what's actually missing**
   - Does the agent need `mktg launch` or does composing skills work?
   - Does the agent need CLI wrappers for distribution or does calling `playwright-cli`/`gws` directly suffice?
   - Is the context matrix needed or does passing all brand files work fine?
   - Are brand freshness rules needed or is exists/not-exists sufficient?

3. **Add only what's proven necessary**
   - If agents consistently need a `launch` orchestration → add it
   - If agents struggle calling `playwright-cli` directly → add `mktg post`
   - If token costs blow up from context overload → add context matrix enforcement
   - If stale brand files cause bad output → add freshness rules

4. **E2E test suite** (`tests/`)
   - Full pipeline test via `bun test`
   - Isolated temp directory, real file I/O
   - Verify: init scaffolds correctly, doctor passes, skills install, status reports accurately

**Success criteria:**
- [ ] CEO app has complete brand/ directory with real content
- [ ] Full launch package generated (landing page, emails, social, SEO)
- [ ] E2E test passes in clean temp directory
- [ ] Decision made on which Phase 2+ commands to add (data-driven, not speculative)

---

## Security Considerations

1. **`sandboxPath()`** — Centralized path validation before any file write. Rejects absolute paths, traversal, symlinks.
2. **Argument arrays** — Never shell-interpolate agent strings. `Bun.spawn()` with arrays or `Bun.$` with escaping.
3. **Skill integrity** — SHA-256 checksums in manifest. Verify before writing to `~/.claude/skills/`.
4. **JSON validation** — Strict schema, reject `__proto__`/`constructor`, 64KB size limit.
5. **Error sanitization** — Relative paths only, no stack traces, truncate echoed input.
6. **Rate limiting** (Phase 2) — Min intervals for external actions (60s posts, 5min emails). `--force` to override.
7. **Append-only caps** — 100KB max for `learnings.md`/`assets.md`. Archive when exceeded.

---

## Agent-Native Principles

- **Non-TTY never prompts** — emit `MISSING_INPUT` with example payload
- **Every operation independently callable** — no bundled workflows that gate access
- **`--json` everywhere** — structured output for programmatic consumption
- **`--cwd` for multi-project** — agents work across projects without cd
- **`--dry-run` before external actions** — `/cmo` teaches this pattern
- **Exit codes 0-6** — distinct codes, not overloaded
- **`--version` + `--help --json`** — agent can discover capabilities programmatically

---

## Acceptance Criteria

### Functional Requirements

- [ ] `bun install -g mktg` installs globally and `mktg` command available
- [ ] `mktg init` works on any project with 2-question onboarding (TTY) or `--json` (non-TTY)
- [ ] `mktg init` self-bootstraps on fresh machines (new VPS, fresh Mac)
- [ ] 24 skills installed to agent config dirs with integrity verification
- [ ] `/cmo` skill installed as single comprehensive file
- [ ] `brand/` directory with 9 files scaffolded
- [ ] 5 commands implemented: `init`, `doctor`, `list`, `status`, `update`
- [ ] Every command supports `--json`, `--cwd`; init/update support `--dry-run`
- [ ] Structured errors with codes and suggestions
- [ ] Exit codes 0-6 per spec
- [ ] `sandboxPath()` rejects path traversal, absolute paths, symlinks
- [ ] Non-TTY stdin never prompts
- [ ] CEO app full marketing package generated as proof (Phase 2)

### Non-Functional Requirements

- [ ] Files under 300 lines each
- [ ] Functional patterns, no classes
- [ ] Named exports only
- [ ] Bun for all package operations
- [ ] Token-efficient output (~100 tokens for help)
- [ ] `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- [ ] CLI startup < 50ms for simple commands (lazy imports)

---

## Dependencies & Prerequisites — Agentic Tools Only

The mktg system exclusively uses **agentic tools** — CLIs and MCPs that agents can invoke programmatically. No SaaS dashboards, no GUI-dependent services, no boomer marketing stack.

| Tool | What It Does | How Agent Uses It |
|------|-------------|-------------------|
| **Bun** | Runtime + package manager | CLI execution, `Bun.file()`, `Bun.$` |
| **Remotion** | Programmatic video generation | Agent writes React components → renders video. The gold standard of agentic marketing tools. |
| **playwright-cli / ply** | Browser automation | Agent posts to social platforms, takes screenshots, runs CRO audits |
| **gws** | Google Workspace CLI | Agent sends emails, manages newsletters |
| **ffmpeg** | Video/audio processing | Agent processes media for content-atomizer |
| **Exa MCP** | Web search + company research | Agent researches competitors, finds audience watering holes |
| **gh** | GitHub CLI | Agent deploys marketing sites, manages issues |

**What we DON'T use:** Mailchimp, ConvertKit, HubSpot, Buffer, Hootsuite, Replicate, or any tool that requires a human to log into a dashboard. If an agent can't invoke it from a terminal, it doesn't belong here.

**Future agentic tools to watch:** Any CLI/MCP that lets agents autonomously create, distribute, or measure marketing content. The skill contract makes adding new tool integrations trivial — update the skill that uses it, done.

---

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skill format incompatibility between Claude Code and Codex | Skills don't work on one platform | Test on both platforms in Phase 1 |
| 24 skills too many for initial install | Slow init | Parallel writes; install must-have (24) by default, `--all` for full set |
| `/cmo` skill exceeds 300 lines | Hard to maintain | Split into `/cmo` + one reference doc max if needed |
| Agent can't compose skills without `mktg launch` | Marketing output requires manual orchestration | `/cmo` skill documents workflow patterns; add `launch` in Phase 2 if needed |
| `audience-research` phantom skill is hard to build well | 8 skills produce worse output without audience data | Start with basic template; agent enhances via web search |
| Context matrix unnecessary complexity | YAGNI if agents handle context well | Skip enforcement; add only if token costs prove problematic in Phase 2 |

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md](docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md) — Key decisions carried forward: skills baked into CLI (decision #16), self-bootstrapping init (decision #17), agent-native design (decision #18), skills ≠ CLI commands separation (decision #26)

### Internal References

- CLI entry point: `src/cli.ts:1`
- Placeholder /cmo skill: `skills/cmo/SKILL.md:1`
- V2 skills: `all-skills/skills-v2/` (11 skills, all kept)
- Marketingskills: `all-skills/marketingskills/skills/` (32 skills → 18 after audit)
- System files: `all-skills/skills-v2/_system/brand-memory.md`, `_system/output-format.md`

### External References

- Justin Poehnelt's "Rewrite Your CLI for AI Agents" — agent-first CLI design principles
- Bun docs: [bun.sh/docs](https://bun.sh/docs) — file I/O, shell, glob, test runner, executables
- `node:util` `parseArgs` — built-in flag parsing

### Refinement Agent Findings

- **Skill consolidation** (refine-1): 31→24 skills via 5 merges. -1,309 lines, zero methodology lost.
- **Token budget** (refine-3): ~62K tokens (22%) trimmable via deduplication + lazy-loading. Target <800 lines per SKILL.md.
- **Agent UX simulation** (refine-4): 5 critical blockers identified. `/cmo` placeholder is #1 blocker. `_system/` paths break on install. Stale SaaS refs confuse agents.
- **Workflow chains** (refine-2): 7 workflows mapped with handoff risks. 6 broken chains found (no structured output schemas, missing content-atomizer promotion mode). First 30 min redesigned: 3 parallel foundation skills.
- **Competitive patterns** (refine-5): 10 patterns to steal. Top: skill dependency DAG from dbt, 4-layer classification, review intervals, skills-never-call-skills constraint, 30/70 create/distribute ratio.
