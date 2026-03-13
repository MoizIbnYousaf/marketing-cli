---
title: "feat: CLI improvements — 11 items across 4 phases"
type: feat
status: active
date: 2026-03-13
---

# CLI Improvements — 11 Items Across 4 Phases

## Context

After a thorough end-to-end review of the mktg CLI (codebase exploration + Exa research on CLI best practices), 12 improvement areas were identified. One (lazy-load commands) is already implemented — the COMMANDS registry in `src/cli.ts:72` already uses dynamic `import()`. The remaining 11 items are grouped into 4 dependency-driven phases.

**Goal:** Close operational gaps (dead stubs, missing versioning), add execution loop (`mktg run`), improve DX (completions, analytics, better errors), and unlock new distribution surface (MCP server).

**Estimated total:** ~1,700 lines across 11 items.

---

## Phase 1: Foundation (No Dependencies)

### 1.1 Remove content stubs + implement brand export/import

**Why:** `content list` and `content stats` are dead stubs (exit code 6) that confuse agents. `brand export/import` enables portability across projects.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/content.ts` | DELETE |
| `src/cli.ts:23,81` | Remove `content` from HELP text and COMMANDS registry |
| `src/commands/brand.ts` | Remove `reset` from SUBCOMMANDS; implement `export` and `import` handlers |
| `src/core/brand.ts` | Add `exportBrand()` and `importBrand()` functions |
| `src/types.ts` | Add `BrandBundle` type |
| `tests/brand-export-import.test.ts` | CREATE |

**New type (`src/types.ts`):**
```typescript
type BrandBundle = {
  readonly version: 1;
  readonly exportedAt: string;
  readonly project: string;
  readonly files: Record<BrandFile, { content: string; sha256: string }>;
};
```

**Core functions (`src/core/brand.ts`):**
```typescript
export const exportBrand = async (cwd: string): Promise<BrandBundle>
// Reads all brand/ files, serializes to BrandBundle. Omits non-existent files.

export const importBrand = async (cwd: string, bundle: BrandBundle, dryRun: boolean): Promise<{ imported: BrandFile[]; skipped: BrandFile[] }>
// Reads BrandBundle from --file arg. Writes files to brand/. --dry-run previews.
```

**Command handler (`src/commands/brand.ts`):**
- `handleExport`: calls `exportBrand(flags.cwd)`, returns `ok(bundle)`
- `handleImport`: reads file from `args[0]`, validates with `parseJsonInput()`, calls `importBrand()`, returns result with imported/skipped counts

**Tests:** Round-trip (export→import), partial bundle, --dry-run, invalid JSON, missing brand dir.

**~135 lines net** (45 deleted from content.ts, ~180 added)

---

### 1.2 Docs URLs in errors

**Why:** Agents and humans both benefit from "read more at..." links on errors.

**Changes:**

| File | Action |
|------|--------|
| `src/types.ts:23-27` | Add `docs?: string` to `MktgError` |
| `src/types.ts:42-51` | Add `docs?: string` param to `err()` |
| `src/core/errors.ts` | Add optional `docs` param to each constructor |
| `src/core/output.ts` | Show docs URL in TTY error formatting |

**Type change:**
```typescript
export type MktgError = {
  readonly code: string;
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly docs?: string;  // NEW
};
```

**`err()` change:** Add 6th optional `docs` parameter:
```typescript
export const err = (
  code: string, message: string, suggestions: readonly string[],
  exitCode: ExitCode = 1, docs?: string,
): CommandResult<never> => ({
  ok: false,
  error: { code, message, suggestions, ...(docs && { docs }) },
  exitCode,
});
```

**Error constructor change pattern:**
```typescript
export const notFound = (what: string, suggestions: readonly string[] = [], docs?: string) =>
  err("NOT_FOUND", `${what} not found`, suggestions, 1, docs);
```

**Docs URL constant map in `errors.ts`:**
```typescript
export const DOCS = {
  skills: "https://github.com/moizibnyousaf/mktg#skills",
  brand: "https://github.com/moizibnyousaf/mktg#brand-files",
  commands: "https://github.com/moizibnyousaf/mktg#commands",
  prerequisites: "https://github.com/moizibnyousaf/mktg#prerequisites",
} as const;
```

**~85 lines**

---

## Phase 2: Skill System Improvements (No Dependencies)

### 2.1 Skill versioning

**Why:** No way to know which skills changed without running `mktg update`. Agents can't check "am I on latest?"

**Changes:**

| File | Action |
|------|--------|
| `skills-manifest.json` | Add `"version": "1.0.0"` to each of 37 skill entries |
| `src/types.ts` | Add optional `version?: string` to `SkillManifestEntry` |
| `src/core/skills.ts` | Add `readSkillVersions()`, `writeSkillVersions()`. Update `installSkills()` and `updateSkills()` to track versions in `.mktg/skill-versions.json` |
| `src/commands/list.ts` | Show `installedVersion` and `latestVersion` per skill |
| `src/commands/update.ts` | Report `versionChanges: Array<{ skill, from, to }>` |
| `tests/skill-versioning.test.ts` | CREATE |

**Version tracking file (`.mktg/skill-versions.json`):**
```typescript
type SkillVersionsFile = Record<string, string>; // { "brand-voice": "1.0.0", ... }
```

**Core functions (`src/core/skills.ts`):**
```typescript
export const readSkillVersions = async (cwd: string): Promise<SkillVersionsFile>
export const writeSkillVersions = async (cwd: string, versions: SkillVersionsFile): Promise<void>
```

**`installSkills()` change:** After installing, write version from manifest to `.mktg/skill-versions.json`.

**`updateSkills()` change:** Compare installed version vs manifest version. Return `versionChanges` array.

**`list.ts` change:** Read `.mktg/skill-versions.json`, add `installedVersion` and `latestVersion` to each skill entry in output.

**~170 lines**

---

### 2.2 Cycle detection in doctor

**Why:** `buildGraph()` already detects cycles via `hasCycles` but doctor never surfaces this.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/doctor.ts` | Add `checkGraph()` to parallel checks |

**New function in `doctor.ts`:**
```typescript
const checkGraph = async (): Promise<Check[]> => {
  const manifest = readManifest();
  const graph = buildGraph(manifest);
  return [{
    name: "skill-graph",
    status: graph.hasCycles ? "warn" : "pass",
    detail: graph.hasCycles
      ? "Dependency cycle detected — execution order is undefined"
      : `No cycles (${graph.nodes.length} skills, ${graph.edges.length} edges)`,
  }];
};
```

**Modify handler:** Add `checkGraph()` to the existing `Promise.all()`. Add "Graph" section to TTY output.

**Reuses:** `buildGraph()` from `src/core/skill-lifecycle.ts`, `readManifest()` from `src/core/skills.ts`.

**~45 lines**

---

### 2.3 Better skill overlap detection

**Why:** Current `triggerSimilarity()` uses substring matching — "seo" vs "seo audit" triggers false positives.

**Changes:**

| File | Action |
|------|--------|
| `src/core/skill-lifecycle.ts:625-632` | Replace `triggerSimilarity()` with Jaccard-based version |
| `src/core/skill-lifecycle.ts` (evaluateSkill) | Add composite overlap score weighting reads/writes |
| `src/types.ts:281-285` | Add `compositeScore?: number` to `SkillOverlapEntry` |

**New exported functions (`src/core/skill-lifecycle.ts`):**
```typescript
export const tokenize = (s: string): Set<string> =>
  new Set(s.toLowerCase().trim().split(/[\s\-_]+/).filter(w => w.length > 0));

export const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export const triggerSimilarity = (a: string, b: string): boolean => {
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;
  return jaccardSimilarity(tokenize(a), tokenize(b)) >= 0.5;
};
```

**Composite scoring in `evaluateSkill()`:**
```
compositeScore = triggerOverlap * 0.4 + readsOverlap * 0.3 + writesOverlap * 0.3
```

**~95 lines**

---

## Phase 3: New Commands (Depends on Phase 1-2)

### 3.1 `mktg run <skill>` command

**Why:** CLI manages skills but doesn't help execute them. Agents do 4 manual steps (resolve → check prereqs → read SKILL.md → log run) that should be 1 command.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/run.ts` | CREATE — new command handler |
| `src/cli.ts:72-82` | Add `run` to COMMANDS registry |
| `src/cli.ts:12-33` | Add `run` to HELP text |
| `tests/run.test.ts` | CREATE |

**Handler flow (`src/commands/run.ts`):**
1. Parse `args[0]` as skill name (required, error if missing)
2. `resolveManifest(flags.cwd)` — load manifest (follows redirects)
3. `getSkill(manifest, skillName)` — verify exists
4. `checkPrerequisites(skillName, flags.cwd, manifest)` — warn if not satisfied (don't block)
5. Read SKILL.md from `~/.claude/skills/{name}/SKILL.md`
6. If not `--dry-run`: `logRun(flags.cwd, { skill, timestamp, result: "success", brandFilesChanged: [] })`
7. Return `ok({ skill, content, prerequisites, loggedAt })`

**Schema:**
```typescript
export const schema: CommandSchema = {
  name: "run",
  description: "Load a skill for agent consumption — checks prerequisites and logs execution",
  positional: { name: "skill", description: "Skill name", required: true },
  flags: [],
  output: { skill: "string", content: "string", prerequisites: "PrerequisiteStatus", loggedAt: "string" },
  examples: [
    { args: "mktg run seo-content --json", description: "Load SEO content skill" },
    { args: "mktg run brand-voice --dry-run", description: "Preview without logging" },
  ],
};
```

**Reuses:** `resolveManifest`, `getSkill` from `src/core/skills.ts`; `checkPrerequisites` from `src/core/skill-lifecycle.ts`; `logRun` from `src/core/run-log.ts`.

**~190 lines**

---

### 3.2 Brand diff

**Why:** Freshness tracks age but not content drift. No way to see what changed since last status check.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/brand.ts` | Add `diff` to SUBCOMMANDS, implement `handleDiff` |
| `src/core/brand.ts` | Add hash storage/comparison functions |
| `src/commands/status.ts` | Save brand hashes after computing status |
| `tests/brand-diff.test.ts` | CREATE |

**New type:**
```typescript
type BrandHashesFile = {
  readonly timestamp: string;
  readonly hashes: Record<string, string>; // SHA-256 hex per file
};
```

**Core functions (`src/core/brand.ts`):**
```typescript
export const computeBrandHashes = async (cwd: string): Promise<Record<string, string>>
export const saveBrandHashes = async (cwd: string, hashes: Record<string, string>): Promise<void>
export const loadBrandHashes = async (cwd: string): Promise<BrandHashesFile | null>
export const diffBrand = async (cwd: string): Promise<BrandDiffResult>
```

**`BrandDiffResult`:**
```typescript
type BrandDiffResult = {
  readonly baselineTimestamp: string | null;
  readonly changes: Array<{ file: BrandFile; status: "added" | "modified" | "deleted" | "unchanged" }>;
  readonly hasChanges: boolean;
};
```

**`status.ts` change:** After computing status, call `saveBrandHashes(flags.cwd, hashes)` (skip on --dry-run).

**~175 lines**

---

### 3.3 Smarter brand templates

**Why:** Current templates are bare placeholders. Agents don't know what questions to answer to fill them.

**Changes:**

| File | Action |
|------|--------|
| `src/core/brand.ts` (BRAND_TEMPLATES) | Enhance all 9 templates with `<!-- AGENT INSTRUCTIONS -->` blocks |

**Template enhancement pattern (example for voice-profile.md):**
```markdown
# Brand Voice Profile

<!-- Generated by mktg init. Fill in or let /cmo build this. -->

<!-- AGENT INSTRUCTIONS:
Answer these to build the voice profile:
1. What 3 adjectives describe how this brand speaks?
2. What words does this brand NEVER use?
3. If this brand were a person, who would it be?
4. Reading level? (casual/professional/technical)
Priority: Fill Voice DNA first, then Do/Don't, then Examples.
-->

## Voice DNA
- **Tone:** <!-- e.g., "Confident but not arrogant" -->
- **Personality:** <!-- e.g., "The smart friend who explains things simply" -->
- **Vocabulary:** <!-- e.g., "Technical terms OK, no jargon" -->
```

Apply same pattern to all 9 templates. Each gets 4-6 targeted questions + inline examples.

**Note:** `isTemplateContent()` uses SHA-256 hash comparison — template hashes are computed lazily on first call, so changing templates automatically invalidates the cache. Existing tests check for content like "Brand Voice Profile" which is preserved.

**~120 lines** (mostly template content)

---

## Phase 4: Advanced Features (Depends on Phase 1-3)

### 4.1 Shell completions

**Why:** Tab completion for `mktg <tab>` is table-stakes DX. 9+ commands + subcommands = perfect for completions.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/completions.ts` | CREATE |
| `src/cli.ts` | Add `completions` to COMMANDS + HELP |
| `tests/completions.test.ts` | CREATE |

**Handler flow:**
1. Parse `args[0]` as shell: `"zsh" | "bash" | "fish"` (default: detect from `$SHELL`)
2. Load all command names + subcommand names from schema introspection
3. Generate shell-specific completion script
4. Return `ok(script)` — raw script on stdout for piping

**Usage:** `eval "$(mktg completions zsh)"` or `mktg completions zsh >> ~/.zshrc`

**Reuses:** `loadSchemas()` pattern from `src/commands/schema.ts`.

**~180 lines**

---

### 4.2 MCP server mode

**Why:** CLI is agent-native but requires shell execution. MCP server lets agents call tools directly without spawning processes.

**Design decision:** Implement JSON-RPC 2.0 / MCP protocol directly over stdio to maintain **zero-dependency constraint**. Do NOT add `@modelcontextprotocol/sdk`.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/serve.ts` | CREATE — MCP server entry point |
| `src/core/mcp.ts` | CREATE — protocol handler (JSON-RPC dispatch, tool listing, tool invocation) |
| `src/cli.ts` | Add `serve` to COMMANDS + HELP |
| `tests/mcp.test.ts` | CREATE |

**Core functions (`src/core/mcp.ts`):**
```typescript
export const buildToolList = async (): Promise<McpTool[]>
// Converts CommandSchema[] → MCP tool definitions

export const handleToolCall = async (toolName: string, args: Record<string, unknown>): Promise<unknown>
// Routes mktg_status, mktg_skill_info, etc. to corresponding handler

export const startServer = async (): Promise<void>
// Reads newline-delimited JSON-RPC from stdin, dispatches, writes to stdout
```

**MCP methods:** `initialize`, `tools/list`, `tools/call`

**Tool naming:** `mktg_init`, `mktg_doctor`, `mktg_skill_info`, `mktg_brand_export`, etc.

**`serve.ts` is special:** Does NOT return `CommandResult`. Calls `startServer()` which takes over the process.

**Tests:** Spawn subprocess, send JSON-RPC via stdin, assert responses. Test `initialize`, `tools/list`, `tools/call` with `mktg_status`.

**~320 lines** (`core/mcp.ts` ~150, `commands/serve.ts` ~50, tests ~120)

---

### 4.3 Analytics command

**Why:** Can't answer "which skills are most used?" without manually parsing JSONL.

**Changes:**

| File | Action |
|------|--------|
| `src/commands/analytics.ts` | CREATE |
| `src/cli.ts` | Add `analytics` to COMMANDS + HELP |
| `tests/analytics.test.ts` | CREATE |

**Output type:**
```typescript
type AnalyticsResult = {
  readonly totalRuns: number;
  readonly uniqueSkills: number;
  readonly topSkills: Array<{ skill: string; count: number }>;
  readonly avgDaysBetweenRuns: number | null;
  readonly brandFileTouchFrequency: Record<string, number>;
  readonly commonChains: Array<{ sequence: [string, string]; count: number }>;
  readonly periodDays: number;
};
```

**Logic:**
1. `getRunHistory(flags.cwd)` — reads `.mktg/runs.jsonl`
2. Count skill occurrences → `topSkills` (sorted desc)
3. Diff consecutive timestamps → `avgDaysBetweenRuns`
4. Count `brandFilesChanged` across records → `brandFileTouchFrequency`
5. Consecutive different-skill runs → `commonChains` (A→B pairs)

**Reuses:** `getRunHistory()` from `src/core/run-log.ts`.

**~190 lines**

---

## Implementation Summary

| Phase | Item | Files Modified | Files Created | Est. Lines |
|-------|------|---------------|---------------|-----------|
| **1** | Remove content + brand export/import | 4 | 1 | ~135 |
| **1** | Docs URLs in errors | 3 | 0 | ~85 |
| **2** | Skill versioning | 5 | 1 | ~170 |
| **2** | Cycle detection in doctor | 1 | 0 | ~45 |
| **2** | Better overlap detection | 2 | 0 | ~95 |
| **3** | `mktg run` command | 2 | 2 | ~190 |
| **3** | Brand diff | 3 | 1 | ~175 |
| **3** | Smarter templates | 1 | 0 | ~120 |
| **4** | Shell completions | 1 | 2 | ~180 |
| **4** | MCP server | 1 | 3 | ~320 |
| **4** | Analytics | 1 | 2 | ~190 |
| | **Total** | | | **~1,705** |

## Teammate Sizing

**Teammate A — Core Cleanup + Brand** (Items 1.1, 1.2, 3.2, 3.3)
Owns: `types.ts`, `core/errors.ts`, `core/output.ts`, `core/brand.ts`, `commands/brand.ts`, `commands/content.ts` (delete), `commands/status.ts`

**Teammate B — Skill System** (Items 2.1, 2.2, 2.3)
Owns: `skills-manifest.json`, `core/skills.ts`, `core/skill-lifecycle.ts`, `commands/doctor.ts`, `commands/list.ts`, `commands/update.ts`

**Teammate C — New Commands** (Items 3.1, 4.1, 4.2, 4.3)
Owns: `commands/run.ts`, `commands/completions.ts`, `commands/serve.ts`, `commands/analytics.ts`, `core/mcp.ts`

Phases 1 & 2 can run in parallel (no shared files between teammates A and B). Phase 3 & 4 depend on Phase 1-2 type changes landing first.

## Verification

1. **Type check:** `bun x tsc --noEmit`
2. **Tests:** `bun test` — all existing 1170+ tests must pass, plus new tests for each item
3. **Build:** `bun build src/cli.ts --outdir dist --target node` — must produce single file
4. **Smoke test each command:**
   - `mktg brand export --json | mktg brand import --json` (round-trip)
   - `mktg run brand-voice --json` (returns SKILL.md content)
   - `mktg doctor --json` (includes skill-graph check)
   - `mktg list --json` (shows version fields)
   - `mktg update --json` (shows version changes)
   - `mktg brand diff --json` (shows changes since last status)
   - `mktg analytics --json` (reads run log)
   - `mktg completions zsh` (outputs valid zsh script)
   - `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | mktg serve` (returns tool list)
5. **Error docs:** Trigger a NOT_FOUND error, verify `docs` field present in JSON output
