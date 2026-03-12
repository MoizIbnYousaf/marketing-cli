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
};

// Discriminated union for command results
export type CommandResult<T = unknown> =
  | { readonly ok: true; readonly data: T; readonly exitCode: 0 }
  | { readonly ok: false; readonly error: MktgError; readonly exitCode: ExitCode };

// Result constructors
export const ok = <T>(data: T): CommandResult<T> => ({
  ok: true,
  data,
  exitCode: 0,
});

export const err = (
  code: string,
  message: string,
  suggestions: readonly string[],
  exitCode: ExitCode = 1,
): CommandResult<never> => ({
  ok: false,
  error: { code, message, suggestions },
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

// Skill metadata types
export type SkillSource = "v2" | "v1" | "new";

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

// Freshness levels for brand files
export type FreshnessLevel = "current" | "stale" | "missing";

// Brand file status
export type BrandFileStatus = {
  readonly file: BrandFile;
  readonly exists: boolean;
  readonly freshness: FreshnessLevel;
  readonly ageDays: number | null;
};
