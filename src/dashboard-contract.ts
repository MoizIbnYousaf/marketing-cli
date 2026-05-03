export const DASHBOARD_SNAPSHOT_VERSION = "1";
export const DASHBOARD_PLAN_VERSION = "1";
export const DASHBOARD_OUTPUTS_VERSION = "1";
export const DASHBOARD_PUBLISH_VERSION = "1";
export const DASHBOARD_SYSTEM_VERSION = "1";
export const DASHBOARD_COMPETE_VERSION = "1";

export type DashboardHealth = {
  readonly overall: "ready" | "incomplete" | "needs-setup";
  readonly summary: string;
  readonly passes: number;
  readonly warns: number;
  readonly fails: number;
};

export type DashboardFoundationEntry = {
  readonly name: string;
  readonly freshness: "current" | "stale" | "missing" | "template";
  readonly summary: string;
  readonly explanation: string;
  readonly nextStep?: string;
};

export type DashboardIntegrationEntry = {
  readonly name: string;
  readonly configured: boolean;
  readonly explanation: string;
  readonly fixHint?: string;
};

export type DashboardActivityEntry = {
  readonly skill: string;
  readonly result: string;
  readonly lastRun: string;
  readonly summary: string;
};

export type DashboardNextAction = {
  readonly id: string;
  readonly title: string;
  readonly reason: string;
  readonly explanation: string;
  readonly consequenceIfIgnored: string;
  readonly command?: string;
  readonly safeToRun: boolean;
  readonly fileTarget?: string;
  readonly source?: string;
};

export type DashboardEmptyState = {
  readonly stage:
    | "needs-init"
    | "needs-foundation"
    | "ready"
    | "invalid-project"
    | "command-failed"
    | "contract-mismatch";
  readonly message: string;
  readonly explanation: string;
  readonly recommendedCommand?: string;
};

export type DashboardReadiness = {
  readonly state: "not-ready" | "preparing" | "ready";
  readonly summary: string;
  readonly explanation: string;
};

export type DashboardGap = {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly consequenceIfIgnored: string;
  readonly command?: string;
  readonly nextStep?: string;
};

export type DashboardSnapshot = {
  readonly version: typeof DASHBOARD_SNAPSHOT_VERSION;
  readonly project: {
    readonly name: string;
    readonly root: string;
    readonly boundAt: string;
  };
  readonly health: DashboardHealth;
  readonly foundations: {
    readonly brandSummary: {
      readonly populated: number;
      readonly template: number;
      readonly missing: number;
      readonly stale: number;
    };
    readonly files: readonly DashboardFoundationEntry[];
  };
  readonly integrations: readonly DashboardIntegrationEntry[];
  readonly activity: {
    readonly recent: readonly DashboardActivityEntry[];
  };
  readonly nextActions: readonly DashboardNextAction[];
  readonly biggestGap: DashboardGap;
  readonly publishReadiness: DashboardReadiness;
  readonly brandStudio: {
    readonly available: boolean;
    readonly summary: string;
    readonly creativeKitPath?: string;
    readonly playgroundPath?: string;
  };
  readonly emptyState: DashboardEmptyState;
};

export type DashboardPlanTask = {
  readonly id: string;
  readonly order: number;
  readonly category: "setup" | "populate" | "refresh" | "execute" | "distribute";
  readonly action: string;
  readonly command: string;
  readonly reason: string;
  readonly explanation: string;
  readonly consequenceIfIgnored: string;
  readonly blocked: boolean;
  readonly blockedBy?: string;
  readonly safeToRun: boolean;
};

export type DashboardPlanResponse = {
  readonly version: typeof DASHBOARD_PLAN_VERSION;
  readonly generatedAt: string;
  readonly health: "ready" | "incomplete" | "needs-setup";
  readonly summary: string;
  readonly topTaskId?: string;
  readonly biggestGap?: DashboardGap;
  readonly nextSafeAction?: DashboardNextAction;
  readonly tasks: readonly DashboardPlanTask[];
};

export type DashboardOutputRecord = {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly group: "marketing" | "campaigns" | "content" | "brand" | "other";
  readonly sourceSkill?: string;
  readonly confidence: "high" | "medium" | "low" | "unknown";
  readonly explanation: string;
};

export type DashboardOutputsResponse = {
  readonly version: typeof DASHBOARD_OUTPUTS_VERSION;
  readonly generatedAt: string;
  readonly summary: string;
  readonly publishReadiness: DashboardReadiness;
  readonly recentRuns: readonly DashboardRunEvent[];
  readonly outputs: readonly DashboardOutputRecord[];
};

export type DashboardPublishAdapter = {
  readonly adapter: "mktg-native" | "postiz" | "typefully" | "resend" | "file";
  readonly configured: boolean;
  readonly explanation: string;
  readonly safeCommand?: string;
};

export type DashboardPublishManifest = {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly itemCount: number;
  readonly explanation: string;
};

export type DashboardPublishResponse = {
  readonly version: typeof DASHBOARD_PUBLISH_VERSION;
  readonly generatedAt: string;
  readonly summary: string;
  readonly publishReadiness: DashboardReadiness;
  readonly adapters: readonly DashboardPublishAdapter[];
  readonly manifests: readonly DashboardPublishManifest[];
  readonly recentActions: readonly DashboardRunEvent[];
  readonly nextAction?: DashboardNextAction;
};

export type DashboardCapabilityEntry = {
  readonly id: string;
  readonly name: string;
  readonly surface: "dashboard" | "cli-only" | "deferred" | "advanced";
  readonly module: "overview" | "brand-studio" | "planner" | "runs-outputs" | "publish" | "system" | "competitive-war-room";
  readonly explanation: string;
};

export type DashboardSystemResponse = {
  readonly version: typeof DASHBOARD_SYSTEM_VERSION;
  readonly generatedAt: string;
  readonly summary: string;
  readonly health: DashboardHealth;
  readonly integrations: readonly DashboardIntegrationEntry[];
  readonly skills: {
    readonly installed: number;
    readonly total: number;
  };
  readonly agents: {
    readonly installed: number;
    readonly total: number;
  };
  readonly capabilityIndex: readonly DashboardCapabilityEntry[];
};

export type DashboardCompeteTarget = {
  readonly id: string;
  readonly url: string;
  readonly addedAt: string;
  readonly lastScan: string | null;
  readonly lastTitle: string | null;
  readonly explanation: string;
};

export type DashboardCompeteResponse = {
  readonly version: typeof DASHBOARD_COMPETE_VERSION;
  readonly generatedAt: string;
  readonly summary: string;
  readonly trackedCount: number;
  readonly scannedCount: number;
  readonly targets: readonly DashboardCompeteTarget[];
  readonly nextAction?: DashboardNextAction;
};

export type DashboardRunEvent = {
  readonly id: string;
  readonly timestamp: string;
  readonly skill: string;
  readonly result: string;
  readonly summary: string;
};

export const DASHBOARD_ACTION_TYPES = [
  "open_file",
  "copy_command",
  "reveal_issue_source",
  "jump_to_brand_studio",
] as const;

export type DashboardActionType = (typeof DASHBOARD_ACTION_TYPES)[number];

export type DashboardActionPayload = {
  readonly actionId: string;
  readonly snapshotVersion: string;
  readonly expiresAt: string;
  readonly type: DashboardActionType;
  readonly payload: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isDashboardActionType = (
  value: unknown,
): value is DashboardActionType =>
  typeof value === "string" &&
  (DASHBOARD_ACTION_TYPES as readonly string[]).includes(value);

export const validateDashboardActionPayload = (
  value: unknown,
): { ok: true; data: DashboardActionPayload } | { ok: false; message: string } => {
  if (!isRecord(value)) {
    return { ok: false, message: "Dashboard action payload must be an object" };
  }
  if (typeof value.actionId !== "string" || value.actionId.length === 0) {
    return { ok: false, message: "actionId is required" };
  }
  if (
    typeof value.snapshotVersion !== "string" ||
    value.snapshotVersion.length === 0
  ) {
    return { ok: false, message: "snapshotVersion is required" };
  }
  if (
    typeof value.expiresAt !== "string" ||
    Number.isNaN(Date.parse(value.expiresAt))
  ) {
    return { ok: false, message: "expiresAt must be a valid ISO timestamp" };
  }
  if (!isDashboardActionType(value.type)) {
    return {
      ok: false,
      message: `type must be one of: ${DASHBOARD_ACTION_TYPES.join(", ")}`,
    };
  }
  if (!isRecord(value.payload)) {
    return { ok: false, message: "payload must be an object" };
  }

  return {
    ok: true,
    data: {
      actionId: value.actionId,
      snapshotVersion: value.snapshotVersion,
      expiresAt: value.expiresAt,
      type: value.type,
      payload: value.payload,
    },
  };
};
