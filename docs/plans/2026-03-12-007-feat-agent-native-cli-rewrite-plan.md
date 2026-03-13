---
title: "feat: Agent-Native CLI Rewrite"
type: feat
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md
reference: https://jpoehnelt.dev/posts/rewrite-your-cli-for-ai-agents/
---

# Agent-Native CLI Rewrite

## Enhancement Summary

**Deepened on:** 2026-03-12
**Agents used:** 9 (TypeScript reviewer, architecture strategist, security sentinel, performance oracle, code simplicity reviewer, agent-native reviewer, pattern recognition specialist, agent-native architecture skill, create-agent-skills skill)

### Critical Findings (Must-Fix Before Implementation)

1. **SECURITY: Manifest merge must be additive-only.** Project manifests can only ADD new skills — never override or redirect existing package skills. Prevents skill supply chain poisoning via crafted project manifests. *(Security sentinel — CRITICAL)*
2. **SECURITY: `--cwd` flag is unsandboxed.** Any agent can pivot operations to arbitrary directories. Validate `--cwd` resolves to a real directory containing a project marker (package.json, .git, or brand/). *(Security sentinel — HIGH)*
3. **SECURITY: `brand import` must iterate over `BRAND_FILES` constant, never parsed bundle keys.** Prevents path traversal writes outside brand/. Add per-file size limits. *(Security sentinel — CRITICAL)*
4. **TYPE SAFETY: `CommandFlag.default` typed as `unknown`.** Make it a discriminated union so `default` matches `type`. *(TypeScript reviewer — HIGH)*
5. **TYPE SAFETY: Namespace dispatch won't compile under strict mode.** `SUBCOMMANDS[subcommand]` requires a type guard since `subcommand` is `string`, not `keyof typeof SUBCOMMANDS`. Extract reusable `isKeyOf()` utility. *(TypeScript reviewer — HIGH)*
6. **TYPE SAFETY: Manifest merge has no runtime validation.** `as SkillsManifest` on `JSON.parse` is unsafe. Add a `parseManifest()` validator. *(TypeScript reviewer — HIGH)*

### Key Design Changes

7. **Scope reduction.** The simplicity reviewer argues for shipping only `skill info` + `skill check` now (2 subcommands), deferring brand/content/schema infrastructure until real consumers pull for it. Counter-argument: the manifest fix + schema introspection are foundational — without them, agents can't extend or self-discover. **Recommended scope: Phase 0 (router + schema) + Phase 1 (skill lifecycle) are non-negotiable. Phases 2-4 are deferrable.**
8. **Add `skill register <path>`.** Agent-native reviewer identified that without this, the extensibility story requires the agent to be a JSON file editor. `register` reads SKILL.md frontmatter and auto-updates the project manifest. *(Agent-native reviewer)*
9. **Two-level schema introspection.** `mktg schema skill validate --json` must work, not just `mktg schema skill`. Without this, agents can't discover subcommand signatures. *(Agent-native reviewer)*
10. **`skill check` needs a `remediation` field.** Don't just say what's missing — say what to DO. Derive from manifest's `writes` mappings. *(Agent-native reviewer)*
11. **Split validation into platform + mktg layers.** Claude Code spec requires only `name` + `description`. Fields like `category`, `tier`, `reads`, `writes` are mktg-specific. Validate both layers separately. *(Create-agent-skills skill)*

### Pre-Existing Fixes (Opportunity During Rewrite)

12. **Fix `_display` anti-pattern.** Add `display?: string` to `CommandResult` success branch. Eliminate `as unknown as T` casts in list.ts, status.ts, update.ts. *(TypeScript + pattern + architecture reviewers — unanimous)*
13. **Extract `getPackageRoot()` to `core/paths.ts`.** Duplicated in skills.ts and agents.ts. *(Architecture + pattern reviewers)*
14. **Derive enum types from const arrays.** `SkillCategory`, `SkillLayer`, tier values should derive from `as const` arrays, not standalone unions. Eliminates triple-maintenance for validators and tests. *(Architecture reviewer)*
15. **Parallelize sequential I/O.** `getInstallStatus()`, `getBrandStatus()`, line counting in status.ts are all sequential `await` loops that should use `Promise.all()`. Saves ~25ms per status/doctor call. *(Performance oracle)*
16. **Replace `Bun.$` mkdir with `fs.mkdir({ recursive: true })`.** Eliminates shell injection surface entirely. *(Security sentinel)*

### New Considerations Discovered

17. **`content list` needs `--limit` (default 50) and `--offset`.** Unbounded scan on large projects overwhelms agent context windows. *(Agent-native + performance reviewers)*
18. **`skills.ts` will exceed 300-line limit.** Extract graph/validation logic into `core/skill-lifecycle.ts`. *(Pattern reviewer)*
19. **Manifest version-mismatch warning in doctor.** When project manifest version differs from package, surface it in health checks. *(Architecture reviewer)*
20. **`init.ts` bypasses `parseJsonInput()`.** Raw `JSON.parse` at init.ts:83 skips 64KB limit and prototype pollution checks. Fix in Phase 0. *(Agent-native reviewer + Security sentinel)*

## Overview

Evolve the mktg CLI from a working infrastructure tool (5 commands, 32 skills, 843 tests) into the reference implementation of an agent-native marketing CLI. Inspired by Justin Poehnelt's "You Need to Rewrite Your CLI for AI Agents" principles — schema introspection, input hardening, and skill lifecycle management — applied to the mktg architecture.

**The thesis:** Human DX optimizes for discoverability and forgiveness. Agent DX optimizes for predictability and defense-in-depth. mktg Phase 1 built the foundation. Phase 2 makes the CLI self-describing, self-defending, and extensible by agents — not just for agents.

## Problem Statement

Phase 1 is complete: 5 commands, 32 skills, 5 agents, 843 passing tests. The CLI works. But three architectural gaps prevent it from scaling:

1. **Agents can't introspect.** `mktg schema` returns only command names and global flags. An agent encountering the CLI for the first time has no way to discover what `init` accepts, what `status` returns, or what flags each command supports. The agent must be pre-taught — the CLI can't teach itself.

2. **Agents can't extend.** The "drop-in skill" principle says: add SKILL.md + update manifest + run `mktg update`. But `loadManifest()` reads from `getPackageRoot()` (the CLI's install location), not the project directory. An agent that creates a skill in the project and updates the project manifest has no effect — the CLI ignores it. The core extensibility story is broken.

3. **Agents can't compose.** There are no skill lifecycle commands. An agent that wants to check if `/seo-content` prerequisites are met, validate a new SKILL.md it created, or visualize the dependency graph has to parse JSON files manually. The CLI provides no tooling for the skill layer it manages.

Secondary gaps: no brand portability (one brand per project, no export/import), no content registry (agents can't discover what they've already produced).

## Proposed Solution

Six tiers of work, ordered by agent impact (what unlocks the most capability):

| Tier | What | Agent Impact | Depends On |
|------|------|-------------|------------|
| 1 | Schema Introspection | Agents self-serve CLI docs at runtime | — |
| 2 | Skill Lifecycle | Agents create, validate, inspect, and check skills | Subcommand router |
| 3 | Brand Memory Lifecycle | Agents export/import brand across projects | Subcommand router |
| 4 | Content Registry | Agents discover their own marketing outputs | Subcommand router |
| 5 | Input Hardening v2 | Defense-in-depth against hallucinated inputs | — |

**Prerequisite (Tier 0):** Subcommand routing infrastructure in `cli.ts`. Currently handles flat commands only. Tiers 2-4 require two-level routing (`mktg skill info`, `mktg brand export`, `mktg content list`).

## Technical Approach

### Architecture

**Current command surface (5 commands):**
```
mktg init | doctor | list | status | update
```

**Proposed command surface (5 + 3 namespaces + schema):**
```
mktg init | doctor | list | status | update | schema [command]
mktg skill   info | validate | graph | check
mktg brand   export | import | reset | freshness
mktg content list | stats
```

**Routing model:** Each namespace (`skill`, `brand`, `content`) becomes a registered command that internally dispatches based on the first positional argument. This keeps the existing flat router intact while adding one level of nesting.

```typescript
// cli.ts — extended COMMANDS record
const COMMANDS: Record<string, () => Promise<{ handler: CommandHandler }>> = {
  init:    () => import("./commands/init.js"),
  doctor:  () => import("./commands/doctor.js"),
  list:    () => import("./commands/list.js"),
  status:  () => import("./commands/status.js"),
  update:  () => import("./commands/update.js"),
  schema:  () => import("./commands/schema.js"),     // NEW: promoted from inline
  skill:   () => import("./commands/skill.js"),      // NEW: namespace router
  brand:   () => import("./commands/brand.js"),      // NEW: namespace router
  content: () => import("./commands/content.js"),    // NEW: namespace router
};
```

**Namespace handler pattern:** Each namespace file parses the subcommand with a type guard:

```typescript
// src/core/routing.ts — shared utility
export const isKeyOf = <T extends Record<string, unknown>>(
  obj: T,
  key: string,
): key is keyof T & string => key in obj;

// src/commands/skill.ts
const SUBCOMMANDS = { info, validate, graph, check, register } as const;

export const handler: CommandHandler<SkillResult> = async (args, flags) => {
  const subcommand = args[0];
  if (!subcommand) return invalidArgs("Missing subcommand", [`Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`]);
  if (!isKeyOf(SUBCOMMANDS, subcommand)) return invalidArgs(`Unknown: skill ${subcommand}`, [
    ...Object.keys(SUBCOMMANDS).map(s => `mktg skill ${s}`),
  ]);
  return SUBCOMMANDS[subcommand](args.slice(1), flags);
};
```

**Result types:** Namespace handlers return a discriminated union with a `kind` field:

```typescript
type SkillResult =
  | { readonly kind: "info"; /* ... */ }
  | { readonly kind: "validate"; /* ... */ }
  | { readonly kind: "graph"; /* ... */ }
  | { readonly kind: "check"; /* ... */ }
  | { readonly kind: "register"; /* ... */ };
```

### Manifest Resolution (Critical Fix)

> **Moved to Phase 0** per agent-native architecture review. Every subsequent phase depends on this.

**Current:** `loadManifest()` → `getPackageRoot()` → reads from CLI install location only.

**Proposed:** Manifest resolution order:
1. Project `skills-manifest.json` at `flags.cwd` (if exists)
2. Package `skills-manifest.json` at `getPackageRoot()` (fallback)

**SECURITY CONSTRAINT (from security audit):** Merge must be **additive-only**:
- Project manifests can ADD new skills not present in the package manifest
- Project manifests CANNOT override or replace existing package skill entries
- Project manifests CANNOT add or modify `redirects` (privileged operation, package-only)
- The merged manifest output must include a `source` field per skill (`"package"` or `"project"`) so agents can see provenance

```typescript
// src/core/skills.ts — additive-only merge
export const mergeManifests = (
  base: SkillsManifest,
  project: SkillsManifest,
): SkillsManifest => {
  const merged = { ...base.skills };
  for (const [name, entry] of Object.entries(project.skills)) {
    if (name in base.skills) {
      // REJECT: project cannot override package skills
      continue; // or collect warnings
    }
    merged[name] = entry;
  }
  return {
    version: base.version,
    skills: merged,
    redirects: base.redirects, // project redirects IGNORED
  };
};
```

**Runtime validation required** — never use `as SkillsManifest` on unvalidated JSON:

```typescript
const parseManifest = (raw: unknown): SkillsManifest | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== "number") return null;
  if (!obj.skills || typeof obj.skills !== "object") return null;
  return raw as SkillsManifest;
};
```

**Migration:** Deprecate both `loadManifest()` and `readManifest()`. Replace with a single `resolveManifest(cwd: string)` used by ALL commands. Add per-cwd cache for consistency within a single CLI invocation.

### Per-Command Schema Contract

Every command exports a `schema` object alongside its `handler`:

```typescript
// src/types.ts — new CommandSchema type (with discriminated union for flags)
type CommandFlagBase = {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
};

export type CommandFlag =
  | CommandFlagBase & { readonly type: "string"; readonly default?: string }
  | CommandFlagBase & { readonly type: "boolean"; readonly default?: boolean }
  | CommandFlagBase & { readonly type: "string[]"; readonly default?: readonly string[] };

export type CommandSchema = {
  readonly name: string;
  readonly description: string;
  readonly flags: readonly CommandFlag[];
  readonly positional?: { readonly name: string; readonly description: string; readonly required: boolean };
  readonly subcommands?: readonly CommandSchema[];  // For namespace commands
  readonly output: Readonly<Record<string, string>>; // field name → type description
  readonly examples: readonly { readonly args: string; readonly description: string }[];
  readonly vocabulary?: readonly string[];  // Natural language triggers for agent discovery
};
```

**Example schema export from init.ts:**
```typescript
export const schema: CommandSchema = {
  name: "init",
  description: "Detect project, scaffold brand/, install skills and agents",
  flags: [
    { name: "--skip-brand", type: "boolean", required: false, description: "Skip brand/ scaffolding" },
    { name: "--skip-skills", type: "boolean", required: false, description: "Skip skill installation" },
    { name: "--yes", type: "boolean", required: false, description: "Accept defaults without prompting" },
    { name: "--json", type: "string", required: false, description: "JSON input payload: {business, goal}" },
  ],
  output: {
    "project.name": "string — detected project name",
    "brand.created": "string[] — brand files created",
    "skills.installed": "string[] — skills installed",
    "agents.installed": "string[] — agents installed",
    "doctor.passed": "boolean — health check result",
  },
  examples: [
    { args: "mktg init --yes", description: "Init with defaults (TTY)" },
    { args: 'mktg init --json \'{"business":"SaaS for dentists","goal":"launch"}\'', description: "Init with JSON input (agent)" },
  ],
};
```

### Implementation Phases

#### Phase 0: Subcommand Router + Schema Infrastructure

**Goal:** Extend `cli.ts` to support two-level routing and per-command schema exports. Zero breaking changes to existing commands.

**Tasks:**

- [ ] **`src/core/paths.ts`** (new) — Extract `getPackageRoot()` from skills.ts and agents.ts into shared utility. Both files import from here.
- [ ] **`src/core/routing.ts`** (new) — Shared `isKeyOf()` type guard and `parseSubcommand()` utility for namespace handlers.
- [ ] **`src/types.ts`** — Add `CommandSchema`, `CommandFlag` (discriminated union), `SubcommandHandler` types. Derive `SkillCategory`, `SkillLayer`, tier values from `as const` arrays (single source of truth for validators and tests). Add `display?: string` to `CommandResult` success branch to fix `_display` anti-pattern.
- [ ] **`src/cli.ts`** — Validate `--cwd` resolves to real directory with project marker (package.json, .git, or brand/). Promote `schema` from inline block to `COMMANDS` registry. Register `skill`, `brand`, `content` as namespace commands.
- [ ] **`src/cli.ts`** — Replace `_display` runtime check with typed `display` field on `CommandResult`.
- [ ] **`src/core/skills.ts`** — Add `resolveManifest(cwd)` with additive-only merge. Add `parseManifest()` runtime validator. Deprecate `loadManifest()` and `readManifest()`. Migrate all call sites. Replace `Bun.$` mkdir with `fs.mkdir({ recursive: true })`.
- [ ] **`src/core/agents.ts`** — Import `getPackageRoot` from paths.ts. Replace `Bun.$` mkdir with `fs.mkdir`.
- [ ] **`src/commands/schema.ts`** (new) — `mktg schema` returns all commands. `mktg schema <cmd>` returns per-command schema. `mktg schema <namespace> <subcommand>` returns subcommand schema (two-level introspection).
- [ ] **`src/commands/skill.ts`** (new) — Namespace router stub with `isKeyOf` type guard.
- [ ] **`src/commands/brand.ts`** (new) — Namespace router stub.
- [ ] **`src/commands/content.ts`** (new) — Namespace router stub.
- [ ] Add `schema` export to all 5 existing commands (init, doctor, list, status, update). Include `vocabulary` field for agent discovery.
- [ ] **Fix:** `init.ts` should use `parseJsonInput()` instead of raw `JSON.parse` (bypasses security checks).
- [ ] **Fix:** Remove `as unknown as T` casts from list.ts, status.ts, update.ts — use new `display` field.
- [ ] **Tests:** Schema command returns per-command AND per-subcommand schemas. Schema-drift test: verify each command's schema matches its actual handler. Namespace routers return proper errors.
- [ ] **Tests:** Existing 843 tests still pass (update count assertions where schema output shape changed — this is expected, not a regression).

**Files touched:** `src/cli.ts`, `src/types.ts`, `src/core/paths.ts` (new), `src/core/routing.ts` (new), `src/core/skills.ts` (manifest resolution), `src/core/agents.ts` (import paths.ts), `src/commands/schema.ts` (new), `src/commands/skill.ts` (new), `src/commands/brand.ts` (new), `src/commands/content.ts` (new), `src/commands/init.ts` (fix parseJsonInput), `src/commands/list.ts` (fix _display), `src/commands/status.ts` (fix _display), `src/commands/update.ts` (fix _display), all 5 existing command files (add schema export)

**Acceptance criteria:**
- `mktg schema --json` returns `{ version, commands: [{name, description, flags, output, examples}] }`
- `mktg schema init --json` returns the full init schema with flags, output fields, examples
- `mktg skill --json` returns `notImplemented` error with exit code 5
- All 843 existing tests pass unchanged

---

#### Phase 1: Skill Lifecycle Commands

**Goal:** Let agents create, validate, inspect, and check skills through the CLI.

**Tasks:**

- [ ] **`src/core/skill-lifecycle.ts`** (new) — Extract graph/validation logic here to keep `skills.ts` under 300 lines:
  - `validateSkill(path, manifest)` — Two-layer validation:
    - **Platform layer** (Claude Code spec): `name` format (lowercase + hyphens, max 64 chars, no reserved prefixes `anthropic-*`/`claude-*`), `description` present and under 1024 chars, `allowed-tools` syntax valid, line count under 500 (warn)
    - **mktg layer**: `category` valid (checked against `SKILL_CATEGORIES` const array), `tier` valid, `reads`/`writes` are valid `BrandFile` names (normalize `brand/` prefix), `depends_on` references existing skills
    - Returns named checks: `{ valid, checks: [{ rule, pass, detail? }], errors: string[], warnings: string[] }`
    - **Security:** Restrict paths to within `cwd` or `$HOME`. Never echo file content in error messages. Check file size before reading.
  - `buildGraph(manifest)` — DFS-based topological sort with cycle detection (reuse pattern from manifest.test.ts). Returns `{ nodes: ReadonlyMap<string, SkillManifestEntry>, edges: ReadonlyMap<string, readonly string[]>, roots: readonly string[], leaves: readonly string[] }`
  - `checkPrerequisites(skillName, cwd, manifest)` — Checks:
    1. All `depends_on` skills are installed
    2. All `reads` brand files exist AND have real content (use hash comparison against `BRAND_TEMPLATES`, not size heuristic)
    3. Returns `{ satisfied, missing: { skills, brandFiles: BrandFile[] }, remediation: string[] }` — remediation derived from manifest's `writes` mappings
  - `registerSkill(skillPath, cwd, manifest)` — Reads SKILL.md frontmatter, constructs manifest entry, merges into project `skills-manifest.json`
- [ ] **`src/core/brand.ts`** — Add `isTemplateContent(file, content)` using SHA-256 hash of `BRAND_TEMPLATES[file]`. Used by `skill check`, `doctor`, `brand freshness`.
- [ ] **`src/commands/skill.ts`** — Implement 5 subcommands:
  - `info <name>` — Returns manifest entry + description from SKILL.md frontmatter + direct deps + reverse deps + installed status
  - `validate <path>` — Runs two-layer validation. Supports `--strict` for best-practice checks (description quality, reference depth, invocation control)
  - `graph` — Returns full DAG. Default compact (node names + edges). `--verbose` for full metadata per node.
  - `check <name>` — Returns prerequisite status WITH remediation actions (e.g., "Run /brand-voice to populate voice-profile.md")
  - `register <path>` — Reads SKILL.md frontmatter, auto-updates project manifest. Creates project `skills-manifest.json` if needed.
- [ ] **Tests:** All 5 subcommands with happy path, error cases, missing skills, cycle detection, template-vs-real brand file (hash-based), remediation derivation, register roundtrip

**Files touched:** `src/core/skill-lifecycle.ts` (new), `src/core/brand.ts`, `src/commands/skill.ts`, `src/types.ts` (add `SkillGraph`, `PrerequisiteStatus`, `ValidationResult` types with `BrandFile[]` not `string[]`)

**Acceptance criteria:**
- `mktg skill info seo-content --json` returns full metadata + description from SKILL.md + deps + reverse deps + installed status
- `mktg skill validate ./my-new-skill/SKILL.md --json` returns `{ valid, checks: [{rule, pass, detail}], errors, warnings }`
- `mktg skill validate` rejects paths outside `cwd`/`$HOME` and never echoes file content in errors
- `mktg skill graph --json` returns DAG with 32 nodes, correct edges, no cycles
- `mktg skill check seo-content --json` returns `{ satisfied: false, missing: { brandFiles: ["voice-profile.md"] }, remediation: ["Run /brand-voice to populate voice-profile.md"] }`
- Template detection uses SHA-256 hash comparison, not size heuristic
- `mktg skill register ./my-skill/SKILL.md --json` creates project manifest entry from frontmatter
- Manifest merge is additive-only — project cannot override package skills

---

#### Phase 2: Brand Memory Lifecycle

**Goal:** Let agents export, import, and manage brand memory across projects.

**Tasks:**

- [ ] **`src/core/brand.ts`** — Add `exportBrand(cwd)` function:
  - Reads all 9 brand files from `brand/` directory
  - Returns `BrandBundle` type: `{ version: 1, project: string, exportedAt: string, files: Record<BrandFile, { content: string, lines: number, sizeBytes: number }> }`
  - Outputs to stdout (pipe-friendly: `mktg brand export > bundle.json`)
- [ ] **`src/core/brand.ts`** — Add `importBrand(bundlePath, cwd, force)` function:
  - **SECURITY:** Validate bundle JSON via `parseJsonInput()` (size limits + proto pollution). ALWAYS iterate over `BRAND_FILES` constant, NEVER over parsed bundle keys. Enforce per-file size limit (512KB profile, 1MB append-only). Reject null bytes in content.
  - Without `--force`: skips existing non-template files, imports only missing/template files. Non-TTY without `--force` returns explicit message: "N files skipped due to conflicts, re-run with --force to overwrite"
  - With `--force`: overwrites all files
  - Returns `{ imported: string[], skipped: string[], overwritten: string[] }`
- [ ] **`src/core/brand.ts`** — Add `resetBrand(cwd, force)` function:
  - TTY without `--force` or `--yes`: returns `missingInput()` error with guidance
  - Non-TTY without `--force`: returns `missingInput()` error (agents must explicitly opt in)
  - Preserves append-only files (assets.md, learnings.md) by archiving them to `brand/.archive/`
  - Overwrites profile files (7 files) with templates
  - Returns `{ reset: string[], archived: string[], preserved: string[] }`
- [ ] **`src/core/brand.ts`** — Add `isTemplateContent(file, content)` helper:
  - Compares content size against `BRAND_TEMPLATES[file]` size + 50 byte threshold
  - Used by `skill check`, `doctor`, and `brand freshness`
- [ ] **`src/core/brand.ts`** — Enhance `getBrandStatus` to include `isTemplate` boolean per file
- [ ] **`src/commands/brand.ts`** — Implement 4 subcommands:
  - `export` — Writes BrandBundle JSON to stdout
  - `import <path>` — Reads bundle, imports with conflict handling. Supports `--force`
  - `reset` — Resets brand/ to templates. Requires `--force` or `--yes`
  - `freshness` — Per-file freshness using minimum `review_interval_days` from skills that read each file
- [ ] **Tests:** Export/import roundtrip, import conflict handling (skip vs overwrite), reset preserves append-only files, freshness uses per-skill intervals

**Files touched:** `src/core/brand.ts`, `src/commands/brand.ts`, `src/types.ts` (add `BrandBundle`, `BrandImportResult`, `BrandResetResult`)

**Acceptance criteria:**
- `mktg brand export --json | mktg brand import --json /dev/stdin` roundtrips cleanly
- Import without `--force` skips existing non-template files
- Reset archives append-only files before overwriting
- Freshness reports per-file staleness using manifest review intervals
- `isTemplateContent()` correctly distinguishes scaffolded templates from real content

---

#### Phase 3: Content Registry

**Goal:** Let agents discover and index their own marketing outputs.

**Tasks:**

- [ ] **`src/core/content.ts`** (new) — Content indexing module:
  - Scan HARDCODED directories: `marketing/`, `campaigns/`, `content/` (relative to cwd). Extract constant from `status.ts` to share. **SECURITY:** Apply `sandboxPath()` to resolved scan dirs. Do NOT follow symlinks (`{ followSymlinks: false }`). Cap results at 1000 files.
  - Index `*.{md,mdx,txt,html,yaml,yml}` files
  - Extract basic metadata: path, name, size, mtime, extension. **Skip frontmatter parsing by default** (2-3x faster). Add `--with-frontmatter` flag to opt in.
  - Return sorted by mtime (newest first), wrapped in object `{ items: ContentEntry[], total: number }` (not raw array — enables `--fields` projection)
- [ ] **`src/commands/content.ts`** — Implement 2 subcommands:
  - `list` — Returns indexed content files. Supports `--fields`, `--limit` (default 50), `--offset` for pagination. Use streaming glob with early termination when limit is reached.
  - `stats` — Returns aggregate metrics: total files, files by type, newest/oldest dates, total size

**Files touched:** `src/core/content.ts` (new), `src/commands/content.ts`, `src/types.ts` (add `ContentEntry`, `ContentStats`)

**Acceptance criteria:**
- `mktg content list --json` returns array of content entries with path, size, age
- `mktg content list --fields path,skill --json` returns projected fields only
- `mktg content stats --json` returns aggregate metrics
- Handles empty directories gracefully (returns empty arrays, not errors)

---

#### Phase 4: Input Hardening v2

**Goal:** Defense-in-depth against agent hallucinations, applied contextually.

**Tasks:**

- [ ] **`src/core/errors.ts`** — Add contextual validation functions:
  - `validateIdentifier(input, fieldName)` — **Positive allowlist**: match against `/^[a-z0-9][a-z0-9-]*$/` (lowercase alphanumeric + hyphen). Rejects shell metacharacters (`;|$&`), whitespace, control chars, `?#/\`, null bytes, unicode look-alikes. Applied to skill names, brand file names, command names. NOT applied to JSON bodies or file content.
  - `detectDoubleEncoding(input, fieldName)` — Rejects `%2e`, `%2f`, `%5c`, `%00` patterns in **path segments only**.
  - `validateBrandContent(content)` — Rejects null bytes (`\x00`) in brand file content during import.
- [ ] **`src/core/errors.ts`** — Add composed validators:
  - `validateSkillName(name)` = `validateIdentifier` + max 64 chars + no reserved prefixes (`anthropic-*`, `claude-*`)
  - `validateBrandFileName(name)` = check against `BRAND_FILES` constant
- [ ] **`src/core/errors.ts`** — Improve `parseJsonInput()`: replace stringify-based proto check with recursive key scanner.
- [ ] **`src/core/brand.ts`** — Add append-only file caps:
  - Before appending, check current size. If would exceed 100KB: archive to `brand/.archive/{name}.{ISO-date}T{HH-mm-ss}.md`, keep last 50KB, then append.
  - Cap: max 10 archives per file, max 1MB total in `brand/.archive/`. Return warning with archive path.
- [ ] Apply `validateIdentifier` to all identifier inputs across skill/brand/content commands AND to `--fields` values
- [ ] **Tests:** Each validation function with valid inputs, invalid inputs, edge cases. Positive allowlist rejects shell metacharacters, unicode, control chars. Archive cap enforcement.

**Files touched:** `src/core/errors.ts`, `src/core/brand.ts`, all namespace command files (apply validation)

**Acceptance criteria:**
- `mktg skill info "seo?content" --json` returns `invalidArgs` error
- `mktg skill info "seo\x00content" --json` returns `invalidArgs` error
- Appending to `learnings.md` at 99KB creates archive and truncates
- JSON body content with newlines is NOT rejected (contextual application)
- All validation is applied at the command boundary, not deep in utility functions

---

## Alternative Approaches Considered

**1. External skill registry (npm-like package manager)**
Rejected for now. `mktg skill install <github-url>` adds significant complexity (network fetching, versioning, trust). The project-local manifest + `mktg skill validate` covers the immediate need. External registry is Phase 3+ scope.

**2. YAML config files instead of CLI flags**
Rejected. Agent DX optimizes for predictability. A single `--json '{...}'` payload is more predictable than a config file that might be stale, absent, or conflicting with flags.

**3. Subcommand routing via yargs/commander**
Rejected. The current hand-rolled parser is 30 lines, zero dependencies, and well-tested. Adding a framework for 3 namespaces is over-engineering. The namespace-handler pattern (each namespace file dispatches internally) is simpler and keeps the zero-dependency constraint.

## System-Wide Impact

### Interaction Graph

- `cli.ts` routes to namespace handlers → namespace handlers dispatch to subcommand handlers → subcommand handlers use core modules → core modules read/write filesystem
- `schema.ts` dynamically imports all command modules to read their `schema` exports
- `resolveManifest()` changes the manifest loading path for ALL commands that use skills (init, doctor, list, status, update, skill *)
- `isTemplateContent()` used by `skill check`, `doctor`, `brand freshness`

### Error Propagation

- All new commands follow the existing `CommandResult<T>` pattern — no throws, no unhandled rejections
- Namespace routers return `invalidArgs()` for unknown subcommands (exit code 2)
- Manifest resolution falls back gracefully (project manifest missing → use package manifest)

### State Lifecycle Risks

- `brand import --force` overwrites brand files — mitigated by requiring explicit `--force` flag
- `brand reset` destroys profile files — mitigated by archiving append-only files and requiring `--force`
- Manifest merge (project + package) could produce inconsistent state — mitigated by package manifest as baseline, project entries as overrides (no deletions)

### API Surface Parity

After implementation, every operation is accessible through two surfaces:
1. **CLI (TTY)** — `mktg <command> [subcommand] [flags]` with human-readable output
2. **CLI (JSON)** — Same commands with `--json` flag for structured agent I/O

Both surfaces use the same command handlers and return the same `CommandResult<T>` types.

### Integration Test Scenarios

1. **Full lifecycle:** `mktg init` → `mktg skill validate ./new-skill/SKILL.md` → update manifest → `mktg update` → `mktg skill check new-skill` → `mktg doctor`
2. **Brand portability:** Project A `mktg brand export` → Project B `mktg brand import` → `mktg status` shows imported brand
3. **Schema self-discovery:** `mktg schema` → pick a command → `mktg schema <cmd>` → construct valid invocation from schema → execute
4. **Skill creation by agent:** Agent creates SKILL.md → `mktg skill validate` → agent updates project manifest → `mktg skill check` → `mktg update` → `mktg list` shows new skill

## Acceptance Criteria

### Functional Requirements

- [ ] `mktg schema <command> --json` returns per-command schema for all commands
- [ ] `mktg skill info|validate|graph|check` all functional with JSON output
- [ ] `mktg brand export|import|reset|freshness` all functional with JSON output
- [ ] `mktg content list|stats` returns indexed marketing outputs
- [ ] Project-local `skills-manifest.json` is read first (additive-only merge), package manifest as fallback
- [ ] `mktg skill validate` catches all invalid SKILL.md issues (missing fields, invalid values)
- [ ] `mktg skill check` distinguishes template brand files from real content
- [ ] `brand import` without `--force` never overwrites real content
- [ ] `brand reset` archives append-only files before overwriting

### Non-Functional Requirements

- [ ] Zero external dependencies added
- [ ] All files under 300 lines
- [ ] All existing 843 tests pass unchanged (zero regressions)
- [ ] New tests cover all subcommands, error cases, and edge cases
- [ ] Build still produces single output file via `bun build`

### Quality Gates

- [ ] `bun test` passes (all tests green)
- [ ] `bun x tsc --noEmit` passes (no type errors)
- [ ] Every command exports a `schema` object
- [ ] Every new command supports `--json`, `--dry-run` (where applicable), `--fields`
- [ ] No command throws — all return `CommandResult<T>`

## Dependencies & Prerequisites

- **Phase 0** has no dependencies (extends existing infrastructure)
- **Phase 1** depends on Phase 0 (subcommand router for `skill` namespace)
- **Phase 2** depends on Phase 0 (subcommand router for `brand` namespace)
- **Phase 3** depends on Phase 0 (subcommand router for `content` namespace)
- **Phase 4** is independent (input hardening can be applied at any point)

**Phases 1-3 can run in parallel** after Phase 0 is complete. Phase 4 is independent.

```
Phase 0 (router + schemas)
  ├── Phase 1 (skill lifecycle)     ─┐
  ├── Phase 2 (brand lifecycle)      ├── can run in parallel
  ├── Phase 3 (content registry)    ─┘
Phase 4 (input hardening) ← independent, any time
```

## Performance Notes

*(From performance oracle review)*

- **Schema command (9 dynamic imports):** ~9-45ms total. Acceptable for a discovery command called once per session. No static registry needed.
- **Manifest resolution (2 file reads + merge):** Sub-millisecond. Cache per-cwd within invocation for consistency.
- **Skill graph (32 nodes, ~25 edges):** DFS topological sort is O(V+E), completes in microseconds. No concern at any realistic scale.
- **Content list (500+ files):** Main bottleneck. Use streaming glob with early termination on `--limit`. Skip frontmatter parsing by default. Read only first 1KB per file when parsing.
- **Quick wins in existing code:** Parallelize `getInstallStatus()` (skills.ts), `getBrandStatus()` (brand.ts), and line counting in status.ts. Combined savings: ~25ms per status/doctor call.
- **Test suite projection:** ~1050 tests at ~1.7s (up from 843 at 1.37s). Keep fast by minimizing subprocess tests for new commands and sharing temp dirs within describe blocks.

## Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **CRITICAL:** Manifest poisoning via project manifest | Skill supply chain takeover | Medium | Additive-only merge. Project cannot override/redirect package skills. |
| **CRITICAL:** Brand import path traversal | Arbitrary file write | Medium | ALWAYS iterate `BRAND_FILES` constant, never parsed keys. Per-file size limits. |
| **HIGH:** `--cwd` unsandboxed directory pivot | Operations on arbitrary dirs | High | Validate `--cwd` has project marker. Reject system paths. |
| **HIGH:** `skill validate` file read oracle | Filesystem enumeration | Medium | Restrict to `cwd`/`$HOME`. Never echo file content in errors. |
| Schema drift (exports vs handler behavior) | Agents get wrong info | Medium | Schema-drift test per command in Phase 0. |
| Append-only archive proliferation | Disk exhaustion | Low | Cap 10 archives/file, 1MB total. `.gitignore` template. |
| `skill validate` too strict | Rejects valid skills | Medium | Default = platform compliance. `--strict` for best practices. |
| `skills.ts` exceeds 300 lines | Maintenance burden | High | Extract to `skill-lifecycle.ts` in Phase 1. |

## Success Metrics

1. **Schema completeness:** `mktg schema --json` returns schemas for 100% of commands
2. **Skill lifecycle coverage:** An agent can create a new skill, validate it, install it, and check prerequisites — all through CLI commands, no manual manifest editing needed
3. **Zero-regression:** All 843 existing tests pass after every phase
4. **Self-teaching:** A new agent encountering mktg for the first time can discover all capabilities through `mktg schema` without any pre-loaded documentation

## Future Considerations

**Not in scope but enabled by this work:**

- **External skill registry:** `mktg skill install <github-url>` — fetch and install skills from remote sources. Enabled by `skill validate` (can validate fetched skills) and project-local manifests (installed skills go to project manifest).
- **Skill versioning:** Add `version` field to manifest entries. Enabled by `skill validate` (can check version format) and `mktg update` (can handle version comparison).
- **Execution logging:** `mktg log` — record which skills ran, when, what they produced. Enabled by `content list` (can index outputs by frontmatter skill field).
- **MCP surface:** `mktg mcp` — expose all commands as JSON-RPC tools over stdio for agent frameworks. Enabled by schema exports (each command becomes a typed tool with JSON Schema parameters from `CommandSchema`).
- **Skill templates:** `mktg skill new <name>` — scaffold a new SKILL.md with boilerplate. Enabled by `skill validate` (can validate the scaffold).
- **Multi-agent coordination:** File locking for brand files when multiple agents write simultaneously. Enabled by brand lifecycle commands (centralized write path).

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md](docs/brainstorms/2026-03-11-marketing-playbook-brainstorm.md) — Key decisions: agent-first CLI design, manifest-driven architecture, drop-in skill contract, progressive enhancement.
- **Original implementation plan:** [docs/plans/2026-03-12-001-feat-mktg-cli-full-implementation-plan.md](docs/plans/2026-03-12-001-feat-mktg-cli-full-implementation-plan.md) — Phase 1 scope and architecture.
- **Orchestrator plan:** [docs/plans/2026-03-12-006-feat-composable-skill-orchestrator-architecture-plan.md](docs/plans/2026-03-12-006-feat-composable-skill-orchestrator-architecture-plan.md) — Skills-as-Lego-blocks pattern.

### External References

- **Justin Poehnelt:** "You Need to Rewrite Your CLI for AI Agents" — Schema introspection, input hardening, skill files principles.

### Internal References

- `src/cli.ts:114-122` — Current inline `schema` command (to be promoted)
- `src/core/skills.ts:getPackageRoot()` — Current manifest resolution (to be extended)
- `src/core/brand.ts:BRAND_TEMPLATES` — Template content used for `isTemplateContent()` comparison
- `src/types.ts:CommandResult<T>` — Discriminated union pattern all new commands follow
- `tests/agent-native.test.ts` — JSON contract test pattern for new commands
- `tests/manifest.test.ts` — DAG validation pattern for `skill graph`
