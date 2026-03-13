// mktg — Shared TypeScript types
// Every command and core module imports from here.

// Global flags every command receives
export type GlobalFlags = {
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly fields: readonly string[];
  readonly cwd: string;
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

// Brand file names as literal union (9 files)
export type BrandFile =
  | "voice-profile.md"
  | "positioning.md"
  | "audience.md"
  | "competitors.md"
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
  | "distribution";

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
};

export type SkillsManifest = {
  readonly version: number;
  readonly skills: Record<string, SkillManifestEntry>;
  readonly redirects: Record<string, string>;
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
export type FreshnessLevel = "current" | "stale" | "missing";

// Brand file status
export type BrandFileStatus = {
  readonly file: BrandFile;
  readonly exists: boolean;
  readonly freshness: FreshnessLevel;
  readonly ageDays: number | null;
};
