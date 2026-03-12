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
**Agents used:** 13 (TypeScript reviewer, architecture strategist, security sentinel, performance oracle, pattern recognition, code simplicity, agent-native architecture, agent-native parity, best practices research, Bun docs research, v2 skills audit, marketingskills audit, phantom skills audit)

### Key Improvements

1. **Radical simplification** — 13 commands → 5 core commands. The CLI is an installer + health checker, not a content orchestration platform. The 29 SKILL.md files ARE the product; the agent reads them and acts.
2. **Revised skill inventory** — 43 source skills → 31 final (11 v2 all kept + 18 from marketingskills after cuts/merges + 2 new phantom skills to build). 10 marketingskills cut, 6 merged into 2.
3. **Type-safe foundation** — `src/types.ts` with discriminated unions (`CommandResult<T>`), `tsconfig.json` with `strict` + `noUncheckedIndexedAccess`, `parseArgs` from `node:util`.
4. **Security hardening** — `sandboxPath()` utility, argument arrays for all subprocesses (never shell interpolation), SHA-256 integrity hashes for skill installation, rate limiting for external actions.
5. **Agent-native gaps filled** — `mktg status --json`, `--cwd` flag for multi-project, non-TTY never prompts, `--version` support, dynamic type discovery.

### Critical Architectural Insight

> **The 29 SKILL.md files are the product, not the CLI.** The CLI's job is to get skills installed and brand/ scaffolded. Content generation, social posting, emailing — the agent does all of that by reading skills and calling tools directly. Building CLI wrappers around things the agent already knows how to do is redundant.
>
> — Code Simplicity Review

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

### Final Skill Count: 31

- 11 v2 deep skills (2 need modification)
- 18 marketingskills (16 standalone + 2 merged from 6)
- 2 new skills to build (audience-research, competitive-intel)

### Integration Tools: All Dropped

The entire `all-skills/marketingskills/tools/` directory (68 tools) is dropped. Every tool requires external SaaS API keys, violating the "no external SaaS" constraint. CLI-only integrations remain: `gws`, `playwright-cli`, `ffmpeg`, `gh`, Exa MCP.

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

### Research Insights: Architecture Changes

**Removed from original plan (per simplicity + agent-native reviews):**
- `src/commands/launch.ts` — Agent follows skills directly, composes primitives
- `src/commands/content.ts` — Skill-guided, not CLI-routed
- `src/commands/social.ts` — Agent calls content-atomizer skill directly
- `src/commands/calendar.ts` — Agent reasons from keyword-research + brand voice
- `src/commands/post.ts` — `/cmo` instructs agent to call `playwright-cli` directly
- `src/commands/email.ts` — `/cmo` instructs agent to call `gws` directly
- `src/commands/audit.ts` — Agent uses direct-response-copy scoring rubric
- `src/commands/test.ts` — Moved to `bun test` (tests/ directory)
- `src/commands/schema.ts` — Over-engineering for 5 commands; `--help --json` suffices
- `src/core/input.ts` — Validation logic merged into `errors.ts`
- `src/core/config.ts` — No config file needed; brand/ is the config
- `src/skills/context-matrix.ts` — Merged into `core/brand.ts`
- `src/integrations/*` — Agent calls tools directly via skill instructions

**Added (per agent-native + TypeScript + security reviews):**
- `src/types.ts` — Shared type system (see TypeScript section below)
- `src/commands/status.ts` — Project marketing state summary (most important missing command)
- `skills-manifest.json` — Definitive skill list, replaces directory scanning
- `tsconfig.json` — Strict mode configuration

### Research Insights: TypeScript Type System

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

export type SkillMeta = {
  readonly name: string;
  readonly source: SkillSource;
  readonly category: SkillCategory;
  readonly requiredBrandFiles: readonly BrandFile[];
  readonly tier: "must-have" | "nice-to-have";
};

// Brand freshness
export type FreshnessLevel = "current" | "dated" | "stale" | "expired";
```

### Research Insights: Command Router

Use a lazy-loading registry (not a switch statement):

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

Benefits: lazy loading (unused commands don't slow startup), type safety (every module must export `handler`), single source of truth for command registration.

### Research Insights: Flag Parsing

Use `parseArgs` from `node:util` (zero dependencies, Bun-compatible):

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

### Research Insights: Output Formatting

Centralize in `output.ts` — commands return data, output formats it:

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

### Research Insights: Bun-Specific Patterns

From Bun framework docs research:

- **File I/O:** Use `Bun.file()` (lazy, Blob interface) and `Bun.write()` (10x faster than `fs.writeFile`)
- **Subprocesses:** Use `Bun.$` shell for external CLI calls, `.quiet()` to capture output, `.nothrow()` for error handling
- **Tool detection:** Use `Bun.which()` (synchronous, native) instead of `which` shell command
- **Glob:** Use `new Bun.Glob("**/*.md")` with `.scan()` — native, faster than npm alternatives
- **Testing:** Built-in `bun test` with `bun:test` imports — Jest-compatible, no setup
- **Build target:** Keep `--target node` in build for npm portability, but use `#!/usr/bin/env bun` shebang for direct execution
- **Startup:** Bun starts ~4x faster than Node — critical for CLI where agents call commands in tight loops

```typescript
// Shared subprocess helper using Bun shell
import { $ } from "bun";

export const runCLI = async (command: string, args: readonly string[]) => {
  const which = Bun.which(command);
  if (!which) {
    return { ok: false, exitCode: 3 as const, error: {
      code: "DEPENDENCY_MISSING",
      message: `${command} not found on PATH`,
      suggestions: [`Install ${command}`],
    }};
  }
  const result = await $`${command} ${args.join(" ")}`.quiet().nothrow();
  return { ok: result.exitCode === 0, stdout: result.stdout.toString(), exitCode: result.exitCode };
};
```

### Research Insights: tsconfig.json

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

`noUncheckedIndexedAccess` forces handling `undefined` when indexing arrays/records — exactly the defensiveness input hardening needs.

---

## Implementation Phases (Revised: 2 Phases)

### Phase 1: CLI Works (`init` → `doctor` → `list` → `status` → `update` + `/cmo` skill)

**Goal:** `mktg init` works on any project, installs skills, builds brand/ scaffold. `mktg doctor` validates. `mktg status` gives agents a snapshot. The `/cmo` skill teaches agents how to do marketing.

**Tasks:**

1. **Type system + config** (`src/types.ts`, `tsconfig.json`, `skills-manifest.json`)
   - Define all shared types: `CommandResult<T>`, `CommandHandler`, `MktgError`, `GlobalFlags`, `BrandFile`, `SkillMeta`, `FreshnessLevel`
   - Create `tsconfig.json` with strict mode
   - Create `skills-manifest.json` with all 31 skills' metadata (name, source, category, tier, requiredBrandFiles)

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
   - Install 31 skills to `~/.claude/skills/` using parallel `Bun.write()` with `Promise.all()`
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

9. **`/cmo` skill** (`skills/cmo/SKILL.md`)
   - Single file under 300 lines (not 5 separate reference docs)
   - Absorbs `start-here` orchestration logic
   - Absorbs `_system/brand-memory.md` and `_system/output-format.md`
   - Contains inline: CLI reference, 7 workflows (as suggested patterns, not enforced sequences), brand memory rules, context matrix guidance, safety rules
   - Key agent instructions: always run `mktg status --json` first, use `--dry-run` before external actions, call `playwright-cli`/`gws` directly for distribution

10. **Phantom skills** (write SKILL.md for each)
    - `audience-research` — Community mining, buyer profiles, watering holes. Owns `brand/audience.md`. 8 skills depend on its output.
    - `competitive-intel` — Competitor teardowns via web search. Owns `brand/competitors.md`. keyword-research and positioning-angles depend on it.

11. **Skill modifications**
    - `creative` — Provider-agnostic rewrite: make prompt-only the primary mode, remove hardcoded model names, add model registry via `brand/stack.md`
    - `start-here` — Merge orchestration logic into `/cmo`, keep as a stripped-down routing reference
    - `page-cro` — Absorb unique patterns from form-cro and popup-cro
    - Create `conversion-flow-cro` — Merge signup-flow-cro + onboarding-cro + paywall-upgrade-cro

**Success criteria:**
- [ ] `mktg init` on a fresh project creates brand/ with 9 files
- [ ] `mktg init` installs 31 skills to `~/.claude/skills/` with parallel writes
- [ ] `mktg init --json '{"business":"CEO app","goal":"launch"}'` works non-interactively
- [ ] Non-TTY stdin never prompts — emits `MISSING_INPUT` error
- [ ] `mktg doctor` reports all-green after clean init (parallel checks)
- [ ] `mktg list --json` shows all 31 skills with correct categories
- [ ] `mktg status --json` returns brand state + content counts
- [ ] `mktg --help --json` returns structured command list
- [ ] `mktg --version` outputs version
- [ ] `--cwd` flag works for multi-project targeting
- [ ] All commands output JSON with `--json` flag
- [ ] Structured errors with correct exit codes (0-6)
- [ ] `sandboxPath()` rejects path traversal, absolute paths, symlinks
- [ ] Skill installation verifies SHA-256 integrity
- [ ] `/cmo` skill is complete single-file with all orchestration knowledge
- [ ] `audience-research` and `competitive-intel` SKILL.md files written
- [ ] `creative` skill reworked to be provider-agnostic

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

### Research Insights: Security Hardening

From security sentinel review — **overall risk: HIGH** primarily due to file system writes + subprocess execution.

**Critical fixes (Phase 1):**

1. **`sandboxPath()` utility** — Centralized path validation before ANY file write:
   ```typescript
   export const sandboxPath = (input: string, root: string): ValidationResult<string> => {
     if (path.isAbsolute(input)) return { valid: false, errors: [{ field: "path", reason: "Absolute paths rejected" }] };
     const resolved = path.resolve(root, input);
     if (!resolved.startsWith(root + path.sep)) return { valid: false, errors: [{ field: "path", reason: "Path traversal detected" }] };
     // Check symlinks with lstat, reject for write operations
     return { valid: true, value: resolved };
   };
   ```

2. **Argument arrays for subprocesses** — Never shell-interpolate agent strings. Use `Bun.spawn()` with argument arrays or `Bun.$` with proper escaping.

3. **Skill installation integrity** — SHA-256 checksums in `skills-manifest.json`. Verify before writing to `~/.claude/skills/`. Use restrictive file permissions (0644).

4. **JSON payload validation** — Parse `--json` input then validate against strict schema. Only extract known keys. Reject `__proto__`, `constructor` keys. Size limit 64KB.

5. **Error message sanitization** — Relative paths only in errors. No stack traces in production. Truncate echoed input.

**Phase 2 fixes (when distribution added):**

6. **Rate limiting** — Store last action timestamp in `.mktg-state.json`. Enforce minimum intervals (60s between posts, 5min between emails). `--force` to override.

7. **Append-only file size caps** — 100KB max for `learnings.md` and `assets.md`. Archive when exceeded.

8. **mktg test force dry-run** — E2E tests must use `--dry-run` on external integrations by default.

---

## Performance Considerations

### Research Insights: Performance Optimizations

From performance oracle review:

| Priority | Optimization | Impact | Phase |
|----------|-------------|--------|-------|
| 1 | Lazy dynamic imports in command router | Halves startup for simple commands | 1 |
| 2 | Parallel file writes in `init` via `Promise.all()` | 3-5x faster init | 1 |
| 3 | Parallel health checks in `doctor` via `Promise.all()` | 3-5x faster doctor | 1 |
| 4 | Build-time skill manifest (zero I/O for `list`/`status`) | <5ms for metadata commands | 1 |
| 5 | Per-invocation brand file cache in `brand.ts` | Eliminates redundant reads | 2 |
| 6 | In-process orchestration (import handlers, not subprocesses) | Avoids N× startup overhead | 2 |

---

## Agent-Native Parity

### Research Insights: Agent Gaps Fixed

From agent-native architecture + parity reviews:

| Gap | Fix | Priority |
|-----|-----|----------|
| Interactive prompts block agents | Non-TTY never prompts; emit `MISSING_INPUT` with example payload | CRITICAL |
| No `--version` | Add `--version` (first command `/cmo` tells agents to run) | CRITICAL |
| No `--help --json` | Structured command list for programmatic discovery | HIGH |
| No project state snapshot | `mktg status --json` — brand files, content counts, freshness | HIGH |
| No multi-project targeting | `--cwd <path>` global flag | HIGH |
| `launch` bundles judgment | Keep as convenience; ensure all sub-operations independently callable | MEDIUM |
| Content types not discoverable | Invalid type errors include valid options in `suggestions` | MEDIUM |
| No confirmation flow for distribution | `/cmo` skill documents `--dry-run` → review → execute pattern | MEDIUM |
| Context matrix enforced in code | Document in `/cmo` as guidance; let agent decide what to read | MEDIUM |
| Exit code 1 overloaded | Separate: 1=not found, new 6=not implemented | LOW |

### Key Architectural Principle

> `mktg launch` should be a convenience wrapper, not a gate. Every sub-operation must be independently callable. The agent composes them; `launch` is just a suggested composition.
>
> — Agent-Native Architecture Review

---

## Acceptance Criteria

### Functional Requirements

- [ ] `bun install -g mktg` installs globally and `mktg` command available
- [ ] `mktg init` works on any project with 2-question onboarding (TTY) or `--json` (non-TTY)
- [ ] `mktg init` self-bootstraps on fresh machines (new VPS, fresh Mac)
- [ ] 31 skills installed to agent config dirs with integrity verification
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

## Dependencies & Prerequisites

- **Bun** — runtime and package manager
- **gws** — Google Workspace CLI for email (used by agent directly, not CLI-wrapped)
- **playwright-cli** — browser automation for social posting (used by agent directly)
- **ffmpeg** — video/audio processing (used by agent directly)
- **Exa MCP** — web/competitor research (used by skills at runtime)
- **gh** — GitHub CLI for marketing site deploys

---

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skill format incompatibility between Claude Code and Codex | Skills don't work on one platform | Test on both platforms in Phase 1 |
| 31 skills too many for initial install | Slow init | Parallel writes; install must-have (24) by default, `--all` for full set |
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

### Review Agent Findings (Full Transcripts)

- TypeScript reviewer: `src/types.ts` architecture, `tsconfig.json`, `parseArgs`, `satisfies` pattern
- Architecture strategist: command registry, error boundary, `skills-manifest.json`, init decomposition
- Security sentinel: `sandboxPath()`, subprocess argument arrays, skill integrity hashes, rate limiting
- Performance oracle: lazy imports, parallel I/O, brand file cache, in-process orchestration
- Pattern recognition: command metadata, naming conventions, God module risks, error propagation
- Code simplicity: 13→5 commands, 23→7 source files, YAGNI violations
- Agent-native architecture: primitives over workflows, `mktg status`, dynamic discovery, `brand/context.md`
- Agent-native parity: non-TTY handling, `--version`, `--cwd`, confirmation flow
- V2 skills audit: all 11 keep, creative needs provider rewrite, start-here merges into /cmo
- Marketingskills audit: 32→18, 10 cut, 6 merged into 2, ai-seo upgraded to must-have
- Phantom skills audit: 5 phantoms confirmed, audience-research most critical, tools/ directory dropped
- Bun framework docs: `Bun.file()`, `Bun.$`, `Bun.Glob`, `Bun.which()`, test runner patterns
