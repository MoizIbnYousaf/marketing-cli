// mktg — Shared TypeScript types
// Every command and core module imports from here.

// Global flags every command receives
export type GlobalFlags = {
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly fields: readonly string[];
  readonly cwd: string;
  readonly jsonInput: string | undefined;
};

// Exit codes with distinct meanings
export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0 = success
// 1 = not found
// 2 = invalid args
// 3 = dependency missing
// 4 = skill execution failed
// 5 = network error
// 6 = not implemented (temporary)

// Structured errors
export type MktgError = {
  readonly code: string;
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly docs?: string;
};

// Discriminated union for command results
export type CommandResult<T = unknown> =
  | { readonly ok: true; readonly data: T; readonly exitCode: 0; readonly display?: string }
  | { readonly ok: false; readonly error: MktgError; readonly exitCode: ExitCode };

export type PublishPostType = "draft" | "schedule" | "now" | "update";

// Result constructors
export const ok = <T>(data: T, display?: string): CommandResult<T> => ({
  ok: true,
  data,
  exitCode: 0,
  ...(display !== undefined && { display }),
});

export const err = (
  code: string,
  message: string,
  suggestions: readonly string[],
  exitCode: ExitCode = 1,
  docs?: string,
): CommandResult<never> => ({
  ok: false,
  error: { code, message, suggestions, ...(docs && { docs }) },
  exitCode,
});

// Command handler signature
export type CommandHandler<T = unknown> = (
  args: readonly string[],
  flags: GlobalFlags,
) => Promise<CommandResult<T>>;

// Brand file names as literal union (10 files)
export type BrandFile =
  | "voice-profile.md"
  | "positioning.md"
  | "audience.md"
  | "competitors.md"
  | "landscape.md"
  | "keyword-plan.md"
  | "creative-kit.md"
  | "stack.md"
  | "assets.md"
  | "learnings.md";

export const BRAND_FILES: readonly BrandFile[] = [
  "voice-profile.md",
  "positioning.md",
  "audience.md",
  "competitors.md",
  "landscape.md",
  "keyword-plan.md",
  "creative-kit.md",
  "stack.md",
  "assets.md",
  "learnings.md",
] as const;

// Profile files (must be non-empty after init)
export const BRAND_PROFILE_FILES: readonly BrandFile[] = [
  "voice-profile.md",
  "positioning.md",
  "audience.md",
  "competitors.md",
  "landscape.md",
  "keyword-plan.md",
  "creative-kit.md",
  "stack.md",
] as const;

// Append-only files (can be empty)
export const BRAND_APPEND_FILES: readonly BrandFile[] = [
  "assets.md",
  "learnings.md",
] as const;

// Brand bundle for export/import portability
export type BrandBundle = {
  readonly version: 1;
  readonly exportedAt: string; // ISO 8601
  readonly project: string;
  readonly files: Partial<Record<BrandFile, { content: string; sha256: string }>>;
};

// Skill metadata types
export type SkillSource = "v2" | "v1" | "new" | "third-party";

export type SkillCategory =
  | "foundation"
  | "strategy"
  | "copy-content"
  | "distribution"
  | "creative"
  | "conversion"
  | "seo"
  | "growth"
  | "knowledge";

export type SkillLayer =
  | "foundation"
  | "strategy"
  | "execution"
  | "distribution"
  | "orchestrator";

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

// Routing metadata for /cmo orchestration — read from manifest, not hardcoded
export type SkillRoutingEntry = {
  readonly triggers: readonly string[];      // User intent phrases that route to this skill
  readonly requires: readonly string[];      // Skill dependencies that must run first
  readonly unlocks: readonly string[];       // Skills that become available after this one
  readonly precedence: "foundation-first" | "first-run" | "any"; // Whether to enforce order
};

// Manifest schema (matches skills-manifest.json)
export type SkillManifestEntry = {
  readonly source: SkillSource;
  readonly category: SkillCategory;
  readonly layer: SkillLayer;
  readonly tier: "must-have" | "nice-to-have";
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  readonly depends_on: readonly string[];
  readonly triggers: readonly string[];
  readonly review_interval_days: number;
  readonly version?: string; // semver string for per-skill versioning
  readonly env_vars?: readonly string[];
  readonly routing?: SkillRoutingEntry; // Optional CMO routing metadata
};

export type SkillsManifest = {
  readonly version: number;
  readonly skills: Record<string, SkillManifestEntry>;
  readonly redirects: Record<string, string>;
  readonly external_skills?: Record<string, ExternalSkillEntry>;
};

// External skill chained into the mktg ecosystem via `mktg skill add`
export type ExternalSkillEntry = {
  readonly name: string;
  readonly source_path: string;          // Where the skill lives (e.g., ~/.claude/skills/last30days)
  readonly chained_by: readonly string[]; // Which mktg skills invoke it
  readonly triggers: readonly string[];   // From the skill's frontmatter
  readonly env_vars?: readonly string[];  // Required env vars
  readonly added: string;                 // ISO date when added
};

// Agent metadata types
export type AgentCategory = "research" | "review";

export type AgentManifestEntry = {
  readonly category: AgentCategory;
  readonly file: string;
  readonly writes: readonly string[];
  readonly reads: readonly string[];
  readonly references_skill: string | null;
  readonly tier: "must-have" | "nice-to-have";
};

export type AgentsManifest = {
  readonly version: number;
  readonly agents: Record<string, AgentManifestEntry>;
};

// =========================================================================
// Catalog types — upstream OSS projects mktg integrates with (postiz, etc.).
// A catalog lives in catalogs-manifest.json; it never ships source code on
// disk. It references an upstream project (AGPL-safe via raw-fetch when
// needed) and contributes adapter names, skill names, and env-var contracts.
// Shape stress-tested in Phase 0 against postiz + cal.com + listmonk.
// =========================================================================

export type CatalogTransport = "sdk" | "http";

export type CatalogAuthStyle = "bearer" | "basic" | "oauth2" | "none";

export type CatalogAuth = {
  readonly style: CatalogAuthStyle;
  readonly base_env: string;
  readonly credential_envs: readonly string[];
  readonly header_format?: "bearer" | "bare";
};

export type CatalogCapabilities = {
  readonly publish_adapters?: readonly string[];
  readonly scheduling_adapters?: readonly string[];
  readonly email_adapters?: readonly string[];
};

export type CatalogEntry = {
  readonly name: string;
  readonly repo_url: string;
  readonly docs_url: string;
  readonly license: string;
  readonly version_pinned: string;
  readonly capabilities: CatalogCapabilities;
  readonly transport: CatalogTransport;
  readonly sdk_reference: string | null;
  readonly auth: CatalogAuth;
  readonly skills: readonly string[];
};

export type CatalogsManifest = {
  readonly version: number;
  readonly catalogs: Record<string, CatalogEntry>;
};

export type CatalogCollision = {
  readonly kind: "publish_adapters" | "scheduling_adapters" | "email_adapters";
  readonly adapter: string;
  readonly declaredBy: readonly string[];
};

export type CatalogLicenseDenial = {
  readonly catalog: string;
  readonly license: string;
  readonly transport: CatalogTransport;
  readonly sdk_reference: string | null;
  readonly reason: "sdk-link-on-copyleft-license";
};

export type CatalogLoadResult =
  | { readonly ok: true; readonly manifest: CatalogsManifest }
  | { readonly ok: false; readonly reason: "collision"; readonly collisions: readonly CatalogCollision[] }
  | { readonly ok: false; readonly reason: "license-denied"; readonly denials: readonly CatalogLicenseDenial[] }
  | { readonly ok: false; readonly reason: "manifest-invalid"; readonly detail: string; readonly path: string }
  | { readonly ok: false; readonly reason: "manifest-missing"; readonly path: string };

// Promoted PublishItem from publish.ts so catalog code and publish adapters
// share one shape. Metadata value union is `string | readonly string[] | undefined`:
// arrays support postiz's `providers: string[]`; `undefined` lets producers emit
// conditional keys without spread gymnastics. Existing string-only adapters
// (typefully/resend/file) still typecheck.
export type PublishItem = {
  readonly type: "social" | "email" | "file";
  readonly adapter: string;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, string | readonly string[] | undefined>>;
};

// --- Schema introspection types ---

// Command flag with discriminated union — default always matches type
type CommandFlagBase = {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
};

export type CommandFlag =
  | CommandFlagBase & { readonly type: "string"; readonly default?: string }
  | CommandFlagBase & { readonly type: "boolean"; readonly default?: boolean }
  | CommandFlagBase & { readonly type: "string[]"; readonly default?: readonly string[] };

// Per-command schema for agent self-discovery
export type CommandSchema = {
  readonly name: string;
  readonly description: string;
  readonly flags: readonly CommandFlag[];
  readonly positional?: { readonly name: string; readonly description: string; readonly required: boolean };
  readonly subcommands?: readonly CommandSchema[];
  readonly output: Readonly<Record<string, string>>;
  readonly examples: readonly { readonly args: string; readonly description: string }[];
  readonly vocabulary?: readonly string[];
};

// --- Skill lifecycle types ---

// Validation check result
export type ValidationCheck = {
  readonly rule: string;
  readonly pass: boolean;
  readonly detail?: string;
};

export type ValidationResult = {
  readonly valid: boolean;
  readonly checks: readonly ValidationCheck[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

// Skill dependency graph
export type SkillGraphNode = {
  readonly name: string;
  readonly category: SkillCategory;
  readonly layer: SkillLayer;
  readonly tier: "must-have" | "nice-to-have";
  readonly dependsOn: readonly string[];
};

export type SkillGraphEdge = {
  readonly from: string;
  readonly to: string;
};

export type SkillGraph = {
  readonly nodes: readonly SkillGraphNode[];
  readonly edges: readonly SkillGraphEdge[];
  readonly roots: readonly string[];
  readonly leaves: readonly string[];
  readonly layers: Readonly<Record<SkillLayer, readonly string[]>>;
  readonly order: readonly string[];
  readonly hasCycles: boolean;
};

// Prerequisite check result
export type PrerequisiteStatus = {
  readonly satisfied: boolean;
  readonly missing: {
    readonly skills: readonly string[];
    readonly brandFiles: readonly BrandFile[];
  };
  readonly remediation: readonly string[];
};

// Skill info result (returned by `mktg skill info`)
export type SkillInfo = {
  readonly name: string;
  readonly description: string;
  readonly category: SkillCategory;
  readonly layer: SkillLayer;
  readonly tier: "must-have" | "nice-to-have";
  readonly source: SkillSource;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  readonly dependsOn: readonly string[];
  readonly dependedOnBy: readonly string[];
  readonly triggers: readonly string[];
  readonly installed: boolean;
  readonly reviewIntervalDays: number;
};

// Register result
export type RegisterResult = {
  readonly name: string;
  readonly action: "created" | "exists";
  readonly manifestPath: string;
};

// Parsed SKILL.md frontmatter
export type SkillFrontmatter = {
  readonly name: string;
  readonly description: string;
  readonly category: string | undefined;
  readonly tier: string | undefined;
  readonly reads: readonly string[] | undefined;
  readonly writes: readonly string[] | undefined;
  readonly triggers: readonly string[] | undefined;
};

// Skill evaluation (overlap + novelty analysis)
export type SkillOverlapEntry = {
  readonly skill: string;
  readonly sharedTriggers: readonly string[];
  readonly overlapPercent: number;
  readonly compositeScore?: number;
};

export type SkillBrandOverlap = {
  readonly skill: string;
  readonly sharedReads: readonly string[];
  readonly sharedWrites: readonly string[];
};

export type SkillEvaluation = {
  readonly name: string;
  readonly description: string;
  readonly validation: ValidationResult;
  readonly overlap: {
    readonly bySkill: readonly SkillOverlapEntry[];
    readonly brandFiles: readonly SkillBrandOverlap[];
    readonly categoryMatches: readonly string[];
    readonly highestOverlap: number;
  };
  readonly novelty: {
    readonly uniqueTriggers: readonly string[];
    readonly uniqueReads: readonly string[];
    readonly coversNewCategory: boolean;
  };
  readonly graphPosition: {
    readonly layer: string;
    readonly wouldDependOn: readonly string[];
    readonly wouldBeDepOf: readonly string[];
  };
};

// Skill execution history
export type SkillRunRecord = {
  readonly skill: string;
  readonly timestamp: string; // ISO 8601
  readonly result: "success" | "partial" | "failed";
  readonly brandFilesChanged: readonly string[];
  readonly durationMs?: number;
  readonly note?: string;
};

// Freshness levels for brand files
// - "current": exists, customized, within review interval
// - "stale": exists, customized, past review interval
// - "template": exists but still contains scaffolded template content (never customized)
// - "missing": file does not exist
export type FreshnessLevel = "current" | "stale" | "template" | "missing";

// Brand file status
export type BrandFileStatus = {
  readonly file: BrandFile;
  readonly exists: boolean;
  readonly freshness: FreshnessLevel;
  readonly ageDays: number | null;
};
