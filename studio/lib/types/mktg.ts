// lib/types/mktg.ts
// Copied from ~/projects/mktgmono/marketing-cli/src/types.ts — DO NOT import cross-project.
// Sync manually when mktg types change. Last synced: 2026-04-16.

// ─── Core result envelope ───

export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0 = success
// 1 = not found
// 2 = invalid args
// 3 = dependency missing
// 4 = skill execution failed
// 5 = network error
// 6 = not implemented (temporary)

export type MktgError = {
  readonly code: string;
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly docs?: string;
};

export type CommandResult<T = unknown> =
  | { readonly ok: true; readonly data: T; readonly exitCode: 0; readonly display?: string }
  | { readonly ok: false; readonly error: MktgError; readonly exitCode: ExitCode };

// ─── Brand files ───

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

export type FreshnessLevel = "current" | "stale" | "template" | "missing";

export type BrandFileStatus = {
  readonly file: BrandFile;
  readonly exists: boolean;
  readonly freshness: FreshnessLevel;
  readonly ageDays: number | null;
};

// ─── mktg status ───

type BrandEntry = {
  readonly exists: boolean;
  readonly freshness: "current" | "stale" | "missing" | "template";
  readonly lines?: number;
  readonly ageDays?: number | null;
  readonly isTemplate?: boolean;
};

type BrandSummary = {
  readonly populated: number;
  readonly template: number;
  readonly missing: number;
  readonly stale: number;
};

type IntegrationEntry = {
  readonly configured: boolean;
  readonly envVar: string;
  readonly skills: readonly string[];
};

type ContentSummary = {
  readonly totalFiles: number;
  readonly byDir: Record<string, number>;
};

type ActivityEntry = {
  readonly lastRun: string;
  readonly result: string;
  readonly daysSince: number;
};

export type StatusData = {
  readonly project: string;
  readonly brand: Record<string, BrandEntry>;
  readonly brandSummary: BrandSummary;
  readonly skills: { readonly installed: number; readonly total: number };
  readonly agents: { readonly installed: number; readonly total: number };
  readonly integrations: Record<string, IntegrationEntry>;
  readonly content: ContentSummary;
  readonly recentActivity: Record<string, ActivityEntry>;
  readonly nextActions: readonly string[];
  readonly health: "ready" | "incomplete" | "needs-setup";
};

// ─── mktg doctor ───

export type DoctorCheck = {
  readonly name: string;
  readonly status: "pass" | "fail" | "warn";
  readonly detail: string;
  readonly fix?: string;
};

export type DoctorData = {
  readonly passed: boolean;
  readonly checks: readonly DoctorCheck[];
  readonly fixes?: readonly { readonly check: string; readonly action: string; readonly result: string; readonly detail: string }[];
};

// ─── mktg list ───

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

export type SkillRoutingEntry = {
  readonly triggers: readonly string[];
  readonly requires: readonly string[];
  readonly unlocks: readonly string[];
  readonly precedence: "foundation-first" | "any";
};

export type SkillEntry = {
  readonly name: string;
  readonly category: SkillCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly layer: string;
  readonly installed: boolean;
  readonly triggers: readonly string[];
  readonly installedVersion: string | null;
  readonly latestVersion: string | null;
  readonly routing?: SkillRoutingEntry;
};

export type AgentEntry = {
  readonly name: string;
  readonly category: "research" | "review";
  readonly tier: "must-have" | "nice-to-have";
  readonly installed: boolean;
  readonly references_skill: string | null;
};

export type ExternalSkillListEntry = {
  readonly name: string;
  readonly source_path: string;
  readonly triggers: readonly string[];
  readonly added: string;
  readonly source_exists: boolean;
};

export type ListData = {
  readonly skills: readonly SkillEntry[];
  readonly agents: readonly AgentEntry[];
  readonly external_skills: readonly ExternalSkillListEntry[];
  readonly total: number;
  readonly installed: number;
  readonly missing: number;
};

// ─── mktg plan ───

export type PlanTask = {
  readonly id: string;
  readonly order: number;
  readonly category: "setup" | "populate" | "refresh" | "execute" | "distribute";
  readonly action: string;
  readonly command: string;
  readonly reason: string;
  readonly blocked: boolean;
  readonly blockedBy?: string;
};

export type PlanData = {
  readonly generatedAt: string;
  readonly health: "ready" | "incomplete" | "needs-setup";
  readonly tasks: readonly PlanTask[];
  readonly completedCount: number;
  readonly summary: string;
};

export type PlanNextData = {
  readonly task: PlanTask;
};

// ─── mktg init ───

export type InitData = {
  readonly project: string;
  readonly brandDir: string;
  readonly filesCreated: readonly string[];
  readonly skillsInstalled: readonly string[];
  readonly agentsInstalled?: readonly string[];
};

// ─── mktg run ───

export type RunData = {
  readonly skill: string;
  readonly status: "success" | "partial" | "failed";
  readonly brandFilesChanged?: readonly string[];
  readonly durationMs?: number;
  readonly note?: string;
};

// ─── mktg catalog ───

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

export type CatalogListData = {
  readonly catalogs: readonly (CatalogEntry & { configured: boolean; missing_envs: string[] })[];
};

export type CatalogStatusData = {
  readonly catalogs: readonly {
    readonly name: string;
    readonly configured: boolean;
    readonly missing_envs: readonly string[];
    readonly capabilities: CatalogCapabilities;
  }[];
};

// ─── mktg publish ───

export type PublishItem = {
  readonly type: "social" | "email" | "file";
  readonly adapter: string;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, string | readonly string[] | undefined>>;
};

export type PublishManifest = {
  readonly name: string;
  readonly version?: number;
  readonly items: readonly PublishItem[];
};

export type AdapterItemResult = {
  readonly item: number;
  readonly status: "published" | "failed" | "skipped";
  readonly detail: string;
  readonly postType?: "draft" | "schedule" | "now" | "update";
};

export type AdapterResult = {
  readonly adapter: string;
  readonly items: number;
  readonly published: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly results: readonly AdapterItemResult[];
};

export type PublishResult = {
  readonly campaign: string;
  readonly adapters: readonly AdapterResult[];
  readonly totalItems: number;
  readonly published: number;
  readonly failed: number;
  readonly dryRun: boolean;
};

export type PublishAdapter = {
  readonly name: string;
  readonly envVar: string | null;
  readonly configured: boolean;
};

export type IntegrationsData = {
  readonly adapter: string;
  readonly integrations: readonly {
    readonly id: string;
    readonly identifier: string;
    readonly name: string;
    readonly picture: string;
    readonly disabled: boolean;
    readonly profile: string;
    readonly customer?: { readonly id: string; readonly name: string } | null;
  }[];
};

export type NativeAccountData = {
  readonly adapter: "mktg-native";
  readonly account: {
    readonly id: string;
    readonly apiKey: string;
    readonly apiKeyPreview: string;
    readonly mode: "workspace";
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly providerCount: number;
  readonly postCount: number;
};

export type NativeProviderData = {
  readonly adapter: "mktg-native";
  readonly provider: {
    readonly id: string;
    readonly identifier: string;
    readonly name: string;
    readonly picture: string;
    readonly disabled: boolean;
    readonly profile: string;
    readonly connectionMethod: "manual";
    readonly createdAt: string;
    readonly updatedAt: string;
  };
};

export type NativePostsData = {
  readonly adapter: "mktg-native";
  readonly posts: readonly {
    readonly id: string;
    readonly campaign: string;
    readonly type: "draft" | "schedule" | "now" | "update";
    readonly date: string;
    readonly shortLink: false;
    readonly status: "draft" | "scheduled" | "published" | "failed";
    readonly posts: readonly {
      readonly integration: { readonly id: string; readonly identifier: string };
      readonly value: readonly { readonly content: string }[];
    }[];
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
};

// ─── mktg schema ───

type CommandFlagBase = {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
};

export type CommandFlag =
  | CommandFlagBase & { readonly type: "string"; readonly default?: string }
  | CommandFlagBase & { readonly type: "boolean"; readonly default?: boolean }
  | CommandFlagBase & { readonly type: "string[]"; readonly default?: readonly string[] };

export type SchemaData = {
  readonly name: string;
  readonly description: string;
  readonly flags: readonly CommandFlag[];
  readonly positional?: { readonly name: string; readonly description: string; readonly required: boolean };
  readonly subcommands?: readonly SchemaData[];
  readonly output: Readonly<Record<string, string>>;
  readonly examples: readonly { readonly args: string; readonly description: string }[];
  readonly vocabulary?: readonly string[];
};
