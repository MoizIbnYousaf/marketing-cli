// lib/types/mktg.ts
// Hand copy of the CLI types in ../../src/types.ts.
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

// Mirrors `mktg catalog list --json` - raw manifest entries only. `configured`
// / `missing_envs` are NOT on list rows; use `mktg catalog info <name>` for those.
export type CatalogListData = {
  readonly catalogs: readonly CatalogEntry[];
};

// Mirrors `mktg catalog status --json` (src/commands/catalog.ts StatusItem):
// {name, configured, healthy, detail}. `healthy` is always null in v1 (no
// reachability probes); `detail` carries the human-readable status, e.g.
// "unconfigured - missing: POSTIZ_API_KEY".
export type CatalogStatusData = {
  readonly catalogs: readonly {
    readonly name: string;
    readonly configured: boolean;
    readonly healthy: boolean | null;
    readonly detail: string;
  }[];
  readonly summary: { readonly total: number; readonly configured: number; readonly healthy: number };
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
  // Mirrors PublishItemStatus in src/types.ts (CLI publish truth enum).
  // Keep 1:1: the CLI owns the vocabulary; studio never renames it.
  readonly status: "queued-local" | "draft-external" | "sent" | "written-file" | "failed" | "skipped";
  readonly detail: string;
  readonly postType?: "draft" | "schedule" | "now" | "update";
};

/** Mirrors src/core/publish/types.ts PublishCounts: `published` is sends only. */
export type PublishCounts = {
  readonly published: number;
  readonly drafts: number;
  readonly queuedLocal: number;
  readonly writtenFiles: number;
  readonly failed: number;
};

export type AdapterResult = PublishCounts & {
  readonly adapter: string;
  readonly items: number;
  readonly errors: readonly string[];
  readonly results: readonly AdapterItemResult[];
};

export type PublishResult = PublishCounts & {
  readonly campaign: string;
  readonly adapters: readonly AdapterResult[];
  readonly totalItems: number;
  readonly dryRun: boolean;
};

export type PublishAdapter = {
  readonly name: string;
  readonly envVar: string | null;
  readonly configured: boolean;
};

export type IntegrationsData = {
  readonly adapter: string;
  /** mktg-native only: whether .mktg/native-publish/account.json exists. Listing never creates it. */
  readonly accountState?: "present" | "missing" | "unreadable";
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
  /** Whether .mktg/native-publish/account.json exists. Listing never creates it. */
  readonly accountState?: "present" | "missing" | "unreadable";
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
