import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DASHBOARD_COMPETE_VERSION,
  DASHBOARD_PUBLISH_VERSION,
  DASHBOARD_ACTION_TYPES,
  DASHBOARD_OUTPUTS_VERSION,
  DASHBOARD_PLAN_VERSION,
  DASHBOARD_SNAPSHOT_VERSION,
  DASHBOARD_SYSTEM_VERSION,
  type DashboardActionPayload,
  type DashboardActivityEntry,
  type DashboardCapabilityEntry,
  type DashboardCompeteResponse,
  type DashboardCompeteTarget,
  type DashboardEmptyState,
  type DashboardFoundationEntry,
  type DashboardGap,
  type DashboardNextAction,
  type DashboardOutputRecord,
  type DashboardOutputsResponse,
  type DashboardPlanResponse,
  type DashboardPlanTask,
  type DashboardPublishAdapter,
  type DashboardPublishManifest,
  type DashboardPublishResponse,
  type DashboardReadiness,
  type DashboardSnapshot,
  type DashboardSystemResponse,
  validateDashboardActionPayload,
} from "../dashboard-contract";
// Intentional direct coupling: dashboard aggregates outputs from doctor, plan, and status
// in a single in-process call for performance. This keeps dashboard as a view layer —
// each subcommand maps 1:1 to a single handler call, never chaining multiple handlers.
import { handler as doctorHandler } from "./doctor";
import { handler as planHandler } from "./plan";
import { handler as statusHandler } from "./status";
import { getRunHistory, type RunSummaryEntry } from "../core/run-log";
import { loadManifest, getInstallStatus } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus } from "../core/agents";
import { invalidArgs, parseJsonInput, validatePathInput } from "../core/errors";
import { ok, type CommandHandler, type CommandResult, type CommandSchema, type GlobalFlags } from "../types";

const SUBCOMMANDS = {
  snapshot: "Return the typed command-center snapshot for the current project",
  action: "Validate and resolve a safe dashboard action payload",
  plan: "Return the typed planner contract for the current project",
  outputs: "Return the typed runs-and-outputs contract for the current project",
  publish: "Return the typed publish contract for the current project",
  system: "Return the typed system/capability contract for the current project",
  compete: "Return the typed competitive-war-room summary for the current project",
} as const;

const DASHBOARD_PORT = 4311;
const DASHBOARD_HOST = "127.0.0.1";
const DASHBOARD_SESSION_FILE = ".mktg/dashboard-session.json";
const OUTPUT_DIRS = ["marketing", "campaigns", "content"] as const;
const CONTENT_SKILLS = new Set(["seo-content", "direct-response-copy", "lead-magnet", "creative", "image-gen", "marketing-demo", "paper-marketing", "slideshow-script", "video-content", "app-store-screenshots", "frontend-slides"]);
const DISTRIBUTION_SKILLS = new Set(["publish", "content-atomizer", "email-sequences", "newsletter", "postiz", "typefully", "send-email"]);

type StatusPayload = {
  project: string;
  health: "ready" | "incomplete" | "needs-setup";
  brand: Record<
    string,
    { exists: boolean; freshness: DashboardFoundationEntry["freshness"]; isTemplate?: boolean }
  >;
  brandSummary: DashboardSnapshot["foundations"]["brandSummary"];
  integrations: Record<string, { configured: boolean; envVar: string }>;
  recentActivity: Record<string, { lastRun: string; result: string; daysSince: number; runCount?: number }>;
  nextActions: readonly string[];
};

type DoctorPayload = {
  passed: boolean;
  checks: Array<{ name: string; status: "pass" | "fail" | "warn"; detail: string; fix?: string }>;
};

type PlanPayload = {
  generatedAt: string;
  health: "ready" | "incomplete" | "needs-setup";
  tasks: Array<{
    id: string;
    order: number;
    category: "setup" | "populate" | "refresh" | "execute" | "distribute";
    action: string;
    command: string;
    reason: string;
    blocked: boolean;
    blockedBy?: string;
  }>;
  summary: string;
};

type CompeteWatchEntry = {
  readonly url: string;
  readonly addedAt: string;
  readonly lastScan: string | null;
  readonly lastTitle: string | null;
};

type CompeteWatchList = {
  readonly version: 1;
  readonly entries: readonly CompeteWatchEntry[];
};

export const schema: CommandSchema = {
  name: "dashboard",
  description: "Local-first dashboard: project health, recommended next moves, and skill catalog",
  flags: [],
  positional: {
    name: "subcommand",
    description: "snapshot | action | plan | outputs | publish | system | compete (omit to launch the local dashboard)",
    required: false,
  },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags:
      name === "action"
        ? [
            {
              name: "--input",
              type: "string" as const,
              required: true,
              description: "JSON dashboard action payload",
            },
          ]
        : [],
    output: {},
    examples: [{ args: `mktg dashboard ${name} --json`, description }],
  })),
  output: {},
  examples: [
    {
      args: "mktg dashboard --dry-run --json",
      description: "Preview local dashboard launch details",
    },
    {
      args: "mktg dashboard snapshot --json",
      description: "Get the command-center snapshot",
    },
    {
      args: "mktg dashboard plan --json",
      description: "Get the planner contract",
    },
    {
      args: "mktg dashboard outputs --json",
      description: "Get the runs-and-outputs contract",
    },
    {
      args: "mktg dashboard publish --json",
      description: "Get publish readiness and safe launch points",
    },
    {
      args: "mktg dashboard system --json",
      description: "Get health, integrations, and capability index data",
    },
    {
      args: "mktg dashboard compete --json",
      description: "Get competitive-war-room summary data",
    },
    {
      args: "mktg dashboard action --input '{...}' --json",
      description: "Resolve a safe dashboard action",
    },
  ],
  vocabulary: [
    "dashboard",
    "local ui",
    "brand studio",
    "snapshot",
    "action",
    "planner",
    "outputs",
    "publish",
    "system",
    "compete",
  ],
};

const parseDashboardArgs = (args: readonly string[]): { subcommand?: string } => {
  const first = args[0];
  if (!first || first.startsWith("-")) return {};
  return { subcommand: first };
};

const isCommandError = (value: unknown): value is CommandResult =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  (value as { ok?: unknown }).ok === false;

const isSafeCommand = (command: string): boolean =>
  command.startsWith("mktg status") ||
  command.startsWith("mktg doctor") ||
  command.startsWith("mktg init") ||
  command.startsWith("mktg run") ||
  command.includes("--dry-run");

const getEmptyState = (status: StatusPayload): DashboardEmptyState => {
  if (status.health === "needs-setup") {
    return {
      stage: "needs-init",
      message: "This project is not initialized for mktg yet.",
      explanation:
        "mktg has not scaffolded the brand memory and supporting state for this project.",
      recommendedCommand: "mktg init",
    };
  }
  if (status.health === "incomplete") {
    return {
      stage: "needs-foundation",
      message: "Your marketing foundation is incomplete.",
      explanation:
        "Some brand files are still missing, stale, or template-only, so the dashboard cannot guide you confidently yet.",
      ...(status.nextActions[0]
        ? { recommendedCommand: status.nextActions[0] }
        : { recommendedCommand: "mktg status --json" }),
    };
  }
  return {
    stage: "ready",
    message: "Your project has enough marketing context to start moving.",
    explanation:
      "The core foundation exists, so the dashboard can safely recommend the next move.",
    ...(status.nextActions[0] ? { recommendedCommand: status.nextActions[0] } : {}),
  };
};

const buildFoundationEntries = (status: StatusPayload): DashboardFoundationEntry[] =>
  Object.entries(status.brand).map(([name, entry]) => ({
    name,
    freshness: entry.freshness,
    summary: entry.exists ? `${name} is ${entry.freshness}` : `${name} is missing`,
    explanation:
      entry.freshness === "template"
        ? `${name} still has scaffold/template content and needs real project-specific content.`
        : entry.freshness === "stale"
          ? `${name} exists but is stale, so recommendations based on it may be outdated.`
          : entry.freshness === "missing"
            ? `${name} does not exist yet, so the dashboard has a blind spot in that area.`
            : `${name} is available and current enough to be trusted.`,
    ...(entry.freshness === "current" ? {} : { nextStep: `Review or refresh ${name}` }),
  }));

const buildActivity = (status: StatusPayload): DashboardActivityEntry[] =>
  Object.entries(status.recentActivity)
    .sort((a, b) => new Date(b[1].lastRun).getTime() - new Date(a[1].lastRun).getTime())
    .slice(0, 10)
    .map(([skill, entry]) => ({
      skill,
      result: entry.result,
      lastRun: entry.lastRun,
      summary: `${skill} last ran ${entry.daysSince} day(s) ago with result: ${entry.result}`,
    }));

const buildNextActions = (status: StatusPayload): DashboardNextAction[] =>
  status.nextActions.map((action, index) => ({
    id: `next-action-${index + 1}`,
    title: action.split(" — ")[0] ?? action,
    reason: action,
    explanation: action,
    consequenceIfIgnored:
      "The dashboard will have less context or weaker guidance until this gap is addressed.",
    ...(action.includes("mktg ") ? { command: action } : {}),
    safeToRun: isSafeCommand(action),
    source: "status.nextActions",
  }));

const buildBiggestGap = (status: StatusPayload, doctor: DoctorPayload): DashboardGap => {
  const firstFailed = doctor.checks.find((check) => check.status === "fail");
  if (firstFailed) {
    return {
      id: `gap-${firstFailed.name}`,
      title: firstFailed.name,
      explanation: firstFailed.detail,
      consequenceIfIgnored:
        "Critical health issues will keep the dashboard from giving trustworthy guidance.",
      ...(firstFailed.fix ? { nextStep: firstFailed.fix } : {}),
    };
  }

  const firstFoundationGap = Object.entries(status.brand).find(([, entry]) => entry.freshness !== "current");
  if (firstFoundationGap) {
    const [name, entry] = firstFoundationGap;
    return {
      id: `gap-${name}`,
      title: name,
      explanation:
        entry.freshness === "missing"
          ? `${name} is missing, so the system lacks key context in that area.`
          : entry.freshness === "template"
            ? `${name} is still template content, so the system cannot rely on it yet.`
            : `${name} is stale and may lead to weak recommendations.`,
      consequenceIfIgnored:
        "The system will continue operating with an incomplete or unreliable understanding of your project.",
      nextStep: `Review or refresh ${name}`,
    };
  }

  const integrationGap = Object.values(status.integrations).find((entry) => !entry.configured);
  if (integrationGap) {
    return {
      id: `gap-${integrationGap.envVar}`,
      title: integrationGap.envVar,
      explanation: `${integrationGap.envVar} is not configured, so related workflows may be degraded or unavailable.`,
      consequenceIfIgnored:
        "Relevant workflows will stay degraded or unavailable until the missing integration is configured.",
      nextStep: `Set ${integrationGap.envVar}`,
    };
  }

  return {
    id: "gap-none",
    title: "No major gap detected",
    explanation: "The dashboard does not currently see a critical missing foundation or failing health check.",
    consequenceIfIgnored:
      "No urgent action is required right now, but regular review still matters as the project evolves.",
  };
};

const buildPublishReadiness = (status: StatusPayload): DashboardReadiness => {
  const recentSkills = Object.keys(status.recentActivity);
  const hasContent = recentSkills.some((skill) => CONTENT_SKILLS.has(skill));
  const hasDistribution = recentSkills.some((skill) => DISTRIBUTION_SKILLS.has(skill));

  if (status.health !== "ready") {
    return {
      state: "not-ready",
      summary: "Not ready to publish yet",
      explanation: "The marketing foundation is still incomplete, so publishing now would be premature.",
    };
  }

  if (hasContent && hasDistribution) {
    return {
      state: "ready",
      summary: "You have enough recent marketing activity to start thinking about publishing.",
      explanation: "Content and distribution-related work both exist in the recent activity history.",
    };
  }

  if (hasContent) {
    return {
      state: "preparing",
      summary: "You have marketing outputs, but distribution readiness still needs work.",
      explanation: "Content-like outputs exist, but distribution-oriented runs are still sparse or missing.",
    };
  }

  return {
    state: "not-ready",
    summary: "Nothing distribution-ready has been produced yet.",
    explanation: "The system has not yet produced enough content or launch-ready outputs to justify publishing.",
  };
};

const buildSnapshot = async (flags: GlobalFlags): Promise<DashboardSnapshot | CommandResult> => {
  const baseFlags = {
    ...flags,
    json: true,
    fields: [],
    jsonInput: undefined,
  };

  const statusResult = await statusHandler([], baseFlags);
  if (!statusResult.ok) return statusResult;

  const doctorResult = await doctorHandler([], baseFlags);
  if (!doctorResult.ok) return doctorResult;

  const status = statusResult.data as unknown as StatusPayload;
  const doctor = doctorResult.data as DoctorPayload;
  const passes = doctor.checks.filter((check) => check.status === "pass").length;
  const warns = doctor.checks.filter((check) => check.status === "warn").length;
  const fails = doctor.checks.filter((check) => check.status === "fail").length;
  const creativeKitPath = join(flags.cwd, "brand", "creative-kit.md");
  const playgroundPath = join(flags.cwd, "brand-playground.html");

  return {
    version: DASHBOARD_SNAPSHOT_VERSION,
    project: {
      name: status.project,
      root: flags.cwd,
      boundAt: new Date().toISOString(),
    },
    health: {
      overall: status.health,
      summary: doctor.passed
        ? "Marketing health checks are passing cleanly."
        : fails > 0
          ? `There are ${fails} failing checks and ${warns} warnings that need attention.`
          : `There are ${warns} warnings worth reviewing.`,
      passes,
      warns,
      fails,
    },
    foundations: {
      brandSummary: status.brandSummary,
      files: buildFoundationEntries(status),
    },
    integrations: Object.values(status.integrations).map((integration) => ({
      name: integration.envVar,
      configured: integration.configured,
      explanation: integration.configured
        ? `${integration.envVar} is configured and available to mktg.`
        : `${integration.envVar} is not configured, so related skills may be degraded or unavailable.`,
      ...(integration.configured ? {} : { fixHint: `Set ${integration.envVar} before relying on related workflows.` }),
    })),
    activity: {
      recent: buildActivity(status),
    },
    nextActions: buildNextActions(status),
    biggestGap: buildBiggestGap(status, doctor),
    publishReadiness: buildPublishReadiness(status),
    brandStudio: {
      available: existsSync(creativeKitPath) || existsSync(playgroundPath),
      summary: existsSync(playgroundPath)
        ? "Brand Studio is available and a brand playground already exists for this project."
        : existsSync(creativeKitPath)
          ? "Brand Studio can open the creative kit and visual brand surface for this project."
          : "Brand Studio is not ready yet because the creative kit and playground are missing.",
      ...(existsSync(creativeKitPath) ? { creativeKitPath } : {}),
      ...(existsSync(playgroundPath) ? { playgroundPath } : {}),
    },
    emptyState: getEmptyState(status),
  };
};

const explainPlanTask = (task: PlanPayload["tasks"][number]): string => {
  switch (task.category) {
    case "setup":
      return `${task.action} is foundational setup work, so the rest of the marketing system cannot progress cleanly until it is done.`;
    case "populate":
      return `${task.action} fills in missing or template marketing context, which improves every later recommendation and artifact.`;
    case "refresh":
      return `${task.action} updates stale marketing memory so the system stops relying on outdated assumptions.`;
    case "execute":
      return `${task.action} creates new marketing assets or outputs that move the project forward.`;
    case "distribute":
      return `${task.action} helps get existing content in front of people instead of letting it sit unused.`;
  }
};

const consequenceForPlanTask = (task: PlanPayload["tasks"][number]): string => {
  switch (task.category) {
    case "setup":
      return "The project will stay blocked on core setup, so later workflows will remain unreliable or unavailable.";
    case "populate":
      return "The system will keep operating with weak or missing brand context, which lowers recommendation quality.";
    case "refresh":
      return "Recommendations may drift because the underlying context remains stale.";
    case "execute":
      return "You will delay generating the assets or outputs needed for downstream distribution and launches.";
    case "distribute":
      return "Content may exist, but it will keep failing to reach people or produce learning.";
  }
};

const buildPlanResponse = async (flags: GlobalFlags): Promise<DashboardPlanResponse | CommandResult> => {
  const baseFlags = {
    ...flags,
    json: true,
    fields: [],
    jsonInput: undefined,
  };
  const result = await planHandler([], baseFlags);
  if (!result.ok) return result;

  const plan = result.data as unknown as PlanPayload;
  const tasks: DashboardPlanTask[] = plan.tasks.map((task) => ({
    ...task,
    explanation: explainPlanTask(task),
    consequenceIfIgnored: consequenceForPlanTask(task),
    safeToRun: isSafeCommand(task.command),
  }));

  return {
    version: DASHBOARD_PLAN_VERSION,
    generatedAt: plan.generatedAt,
    health: plan.health,
    summary: plan.summary,
    ...(tasks[0] ? { topTaskId: tasks[0].id } : {}),
    tasks,
  };
};

const detectOutputGroup = (path: string): DashboardOutputRecord["group"] => {
  if (path.startsWith("marketing/")) return "marketing";
  if (path.startsWith("campaigns/")) return "campaigns";
  if (path.startsWith("content/")) return "content";
  if (path.includes("brand-playground") || path.startsWith("brand/")) return "brand";
  return "other";
};

const discoverOutputs = async (cwd: string): Promise<DashboardOutputRecord[]> => {
  const outputs: DashboardOutputRecord[] = [];

  for (const dir of OUTPUT_DIRS) {
    const dirPath = join(cwd, dir);
    if (!existsSync(dirPath)) continue;
    const glob = new Bun.Glob("**/*.{md,mdx,txt,html,json,png,jpg,jpeg,gif,svg}");
    for await (const file of glob.scan({ cwd: dirPath })) {
      const relativePath = `${dir}/${file}`;
      outputs.push({
        id: `output-${relativePath}`,
        path: relativePath,
        name: basename(relativePath),
        group: detectOutputGroup(relativePath),
        confidence: "unknown",
        explanation: `Discovered in ${dir}/. Provenance is not guaranteed from current CLI records, so this is intentionally marked unknown.`,
      });
    }
  }

  const playgroundPath = join(cwd, "brand-playground.html");
  if (existsSync(playgroundPath)) {
    outputs.push({
      id: "output-brand-playground",
      path: "brand-playground.html",
      name: "brand-playground.html",
      group: "brand",
      sourceSkill: "brand-kit-playground",
      confidence: "low",
      explanation: "This file matches the standard brand playground output name, so it is likely related to the brand-kit-playground workflow but not guaranteed.",
    });
  }

  return outputs.sort((a, b) => a.path.localeCompare(b.path));
};

const buildOutputsResponse = async (flags: GlobalFlags): Promise<DashboardOutputsResponse> => {
  const history = await getRunHistory(flags.cwd, undefined, 100);
  const recentRuns = history.slice(0, 15).map((record, index) => ({
    id: `${record.skill}-${record.timestamp}-${index}`,
    timestamp: record.timestamp,
    skill: record.skill,
    result: record.result,
    summary: `${record.skill} finished with ${record.result}.`,
  }));
  const outputs = await discoverOutputs(flags.cwd);

  const hasContentRun = history.some((record) => CONTENT_SKILLS.has(record.skill));
  const hasDistributionRun = history.some((record) => DISTRIBUTION_SKILLS.has(record.skill));
  const publishReadiness: DashboardReadiness = hasDistributionRun
    ? {
        state: "ready",
        summary: "Distribution-related work has already run recently.",
        explanation: "Recent distribution or publish-oriented runs exist, so the project is closer to being launch-ready.",
      }
    : hasContentRun || outputs.length > 0
      ? {
          state: "preparing",
          summary: "Outputs exist, but distribution readiness is still partial.",
          explanation: "The project has produced artifacts or content, but recent publish/distribution runs are still missing or sparse.",
        }
      : {
          state: "not-ready",
          summary: "No meaningful outputs are available for publishing yet.",
          explanation: "The system cannot honestly claim publish readiness until there are real outputs or content-like runs to ship.",
        };

  return {
    version: DASHBOARD_OUTPUTS_VERSION,
    generatedAt: new Date().toISOString(),
    summary:
      outputs.length > 0
        ? `${outputs.length} discoverable output artifact(s) and ${recentRuns.length} recent run(s) are available.`
        : `No discoverable outputs yet; showing ${recentRuns.length} recent run(s) only.`,
    publishReadiness,
    recentRuns,
    outputs,
  };
};

const buildPublishAdapters = (): DashboardPublishAdapter[] => [
  {
    adapter: "mktg-native",
    configured: true,
    explanation: "mktg-native is the local agent-first publishing backend. It auto-provisions a workspace account and keeps providers + queue state under .mktg/native-publish/.",
    safeCommand: "mktg publish --native-account --json",
  },
  {
    adapter: "postiz",
    configured: !!process.env.POSTIZ_API_KEY,
    explanation: process.env.POSTIZ_API_KEY
      ? "Postiz is configured and is the default social distribution lane for multi-provider publishing."
      : "POSTIZ_API_KEY is missing, so the default Postiz social distribution lane is not ready yet.",
    ...(process.env.POSTIZ_API_KEY ? { safeCommand: "mktg publish --adapter postiz --dry-run" } : {}),
  },
  {
    adapter: "typefully",
    configured: !!process.env.TYPEFULLY_API_KEY,
    explanation: process.env.TYPEFULLY_API_KEY
      ? "Typefully is configured for X/threads specialist flows and as a fallback when Postiz is unavailable."
      : "TYPEFULLY_API_KEY is missing, so Typefully specialist/fallback publishing is not ready yet.",
    ...(process.env.TYPEFULLY_API_KEY ? { safeCommand: "mktg publish --adapter typefully --dry-run" } : {}),
  },
  {
    adapter: "resend",
    configured: !!process.env.RESEND_API_KEY,
    explanation: process.env.RESEND_API_KEY
      ? "Resend is configured and available for email distribution workflows."
      : "RESEND_API_KEY is missing, so Resend-backed publishing is not ready yet.",
    ...(process.env.RESEND_API_KEY ? { safeCommand: "mktg publish --adapter resend --dry-run" } : {}),
  },
  {
    adapter: "file",
    configured: true,
    explanation: "File publishing is always available and can be used as a safe local preview/export path.",
    safeCommand: "mktg publish --adapter file --dry-run",
  },
];

const discoverPublishManifests = async (cwd: string): Promise<DashboardPublishManifest[]> => {
  const manifests: DashboardPublishManifest[] = [];
  const glob = new Bun.Glob("**/publish.json");

  for await (const relPath of glob.scan({ cwd })) {
    if (relPath.startsWith("node_modules/") || relPath.startsWith(".git/")) continue;
    const absolutePath = join(cwd, relPath);
    try {
      const parsed = await Bun.file(absolutePath).json() as { name?: string; items?: unknown[] };
      manifests.push({
        id: `manifest-${relPath}`,
        path: relPath,
        name: parsed.name ?? relPath,
        itemCount: Array.isArray(parsed.items) ? parsed.items.length : 0,
        explanation: `Publish manifest discovered at ${relPath}.`,
      });
    } catch {
      manifests.push({
        id: `manifest-${relPath}`,
        path: relPath,
        name: relPath,
        itemCount: 0,
        explanation: `Publish manifest discovered at ${relPath}, but it could not be parsed safely.`,
      });
    }
  }

  return manifests.sort((a, b) => a.path.localeCompare(b.path));
};

const buildPublishResponse = async (
  flags: GlobalFlags,
): Promise<DashboardPublishResponse | CommandResult> => {
  const outputs = await buildOutputsResponse(flags);
  if (isCommandError(outputs)) return outputs;

  const outputData = outputs as DashboardOutputsResponse;
  const manifests = await discoverPublishManifests(flags.cwd);
  const adapters = buildPublishAdapters();
  const recentActions = outputData.recentRuns.filter((entry) =>
    ["publish", "content-atomizer", "email-sequences", "newsletter", "postiz", "typefully", "send-email"].some((token) =>
      entry.skill.includes(token),
    ),
  );

  const nextSafeAdapter = adapters.find((adapter) => adapter.configured && adapter.safeCommand);
  const nextAction = nextSafeAdapter
    ? {
        id: "publish-dry-run",
        title: "Preview a publish step safely",
        reason: "The dashboard can preview publishing without mutating live channels.",
        explanation: "Start with a dry-run publish command so you can inspect the pipeline before any real distribution happens.",
        consequenceIfIgnored: "You may delay distribution decisions or publish without enough visibility into readiness.",
        command: nextSafeAdapter.safeCommand!,
        safeToRun: true,
        source: "dashboard.publish",
      }
    : undefined;

  return {
    version: DASHBOARD_PUBLISH_VERSION,
    generatedAt: new Date().toISOString(),
    summary:
      manifests.length > 0
        ? `Found ${manifests.length} publish manifest(s) and ${adapters.filter((a) => a.configured).length} configured adapter(s).`
        : `No publish manifests found yet. ${adapters.filter((a) => a.configured).length} adapter(s) are currently configured.`,
    publishReadiness: outputData.publishReadiness,
    adapters,
    manifests,
    recentActions,
    ...(nextAction ? { nextAction } : {}),
  };
};

const CAPABILITY_INDEX: DashboardCapabilityEntry[] = [
  { id: "status", name: "Status snapshot", surface: "dashboard", module: "overview", explanation: "Project health, next actions, and readiness summary are visible in the dashboard." },
  { id: "brand", name: "Brand memory", surface: "dashboard", module: "brand-studio", explanation: "Brand Studio gives a visual surface over the project’s brand memory and creative kit." },
  { id: "plan", name: "Planner", surface: "dashboard", module: "planner", explanation: "The planner queue exposes prioritized next steps and blockers." },
  { id: "outputs", name: "Runs & Outputs", surface: "dashboard", module: "runs-outputs", explanation: "Recent runs and discoverable output artifacts are visible in the dashboard." },
  { id: "publish", name: "Publish", surface: "dashboard", module: "publish", explanation: "Publish readiness and safe publish launch points are visible in the dashboard." },
  { id: "health", name: "Health diagnostics", surface: "dashboard", module: "system", explanation: "System will expose diagnostics, integrations, and capability visibility." },
  { id: "skills", name: "Skills catalog", surface: "advanced", module: "system", explanation: "Skills remain advanced/system-level visibility rather than a top-level primary surface." },
  { id: "agents", name: "Agents registry", surface: "advanced", module: "system", explanation: "Agent install and registry visibility belongs in the advanced system surface." },
  { id: "context", name: "Context compiler", surface: "deferred", module: "system", explanation: "Context and memory internals stay deferred until the dashboard core is trusted." },
  { id: "compete", name: "Competitor Monitor", surface: "advanced", module: "competitive-war-room", explanation: "Competitive monitoring is an advanced strategic surface with honest summary data." },
  { id: "schema", name: "Schema / command introspection", surface: "cli-only", module: "system", explanation: "Schema introspection remains available in the CLI and may later surface inside System." },
];

const buildSystemResponse = async (
  flags: GlobalFlags,
): Promise<DashboardSystemResponse | CommandResult> => {
  const snapshotOrError = await buildSnapshot(flags);
  if ("ok" in snapshotOrError && snapshotOrError.ok === false) return snapshotOrError;
  const snapshot = snapshotOrError as DashboardSnapshot;

  const [skillManifest, agentManifest] = await Promise.all([
    loadManifest(),
    loadAgentManifest(),
  ]);
  const [skillStatus, agentStatus] = await Promise.all([
    getInstallStatus(skillManifest),
    getAgentInstallStatus(agentManifest),
  ]);

  const installedSkills = Object.values(skillStatus).filter((entry) => entry.installed).length;
  const installedAgents = Object.values(agentStatus).filter((entry) => entry.installed).length;

  return {
    version: DASHBOARD_SYSTEM_VERSION,
    generatedAt: new Date().toISOString(),
    summary: "System summarizes health diagnostics, integration readiness, and advanced capability visibility.",
    health: snapshot.health,
    integrations: snapshot.integrations,
    skills: {
      installed: installedSkills,
      total: Object.keys(skillManifest.skills).length,
    },
    agents: {
      installed: installedAgents,
      total: Object.keys(agentManifest.agents).length,
    },
    capabilityIndex: CAPABILITY_INDEX,
  };
};

const loadCompeteWatchList = async (cwd: string): Promise<CompeteWatchList> => {
  const file = Bun.file(join(cwd, ".mktg", "compete", "watchlist.json"));
  if (!(await file.exists())) return { version: 1, entries: [] };
  try {
    return await file.json() as CompeteWatchList;
  } catch {
    return { version: 1, entries: [] };
  }
};

const buildCompeteResponse = async (
  flags: GlobalFlags,
): Promise<DashboardCompeteResponse> => {
  const watchlist = await loadCompeteWatchList(flags.cwd);
  const targets: DashboardCompeteTarget[] = watchlist.entries.map((entry, index) => ({
    id: `compete-target-${index + 1}`,
    url: entry.url,
    addedAt: entry.addedAt,
    lastScan: entry.lastScan,
    lastTitle: entry.lastTitle,
    explanation: entry.lastScan
      ? "This competitor is tracked and has at least one recorded scan in local state."
      : "This competitor is tracked, but no local scan has been recorded yet.",
  }));

  const nextAction = targets.length > 0
    ? {
        id: "compete-scan",
        title: "Refresh competitor monitoring safely",
        reason: "Tracked competitors exist, so the next useful move is to scan them again and refresh the local snapshots.",
        explanation: "A dry-run competitor scan lets you inspect whether there is new monitoring work to do without overcommitting the UI to network-heavy behavior.",
        consequenceIfIgnored: "Competitive context may drift and the dashboard will have less up-to-date market awareness.",
        command: "mktg compete scan --dry-run",
        safeToRun: true,
        source: "dashboard.compete",
      }
    : {
        id: "compete-watch",
        title: "Start tracking your first competitor",
        reason: "The competitor monitor has nothing to show until at least one competitor is tracked.",
        explanation: "Add a competitor URL first, then future scans and summaries become meaningful.",
        consequenceIfIgnored: "The dashboard will keep showing no competitive intelligence data.",
        command: "mktg compete watch https://competitor.example",
        safeToRun: false,
        source: "dashboard.compete",
      };

  return {
    version: DASHBOARD_COMPETE_VERSION,
    generatedAt: new Date().toISOString(),
    summary:
      targets.length > 0
        ? `Tracking ${targets.length} competitor URL(s), ${targets.filter((t) => t.lastScan).length} of which have local scan history.`
        : "No competitors are currently tracked in local state.",
    trackedCount: targets.length,
    scannedCount: targets.filter((target) => target.lastScan !== null).length,
    targets,
    nextAction,
  };
};

const handleSnapshot = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const snapshot = await buildSnapshot(flags);
  if ("ok" in snapshot && snapshot.ok === false) return snapshot;
  return ok(snapshot);
};

const handlePlan = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const plan = await buildPlanResponse(flags);
  if ("ok" in plan && plan.ok === false) return plan;
  return ok(plan);
};

const handleOutputs = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => ok(await buildOutputsResponse(flags));

const handlePublish = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const response = await buildPublishResponse(flags);
  if ("ok" in response && response.ok === false) return response;
  return ok(response);
};

const handleSystem = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const response = await buildSystemResponse(flags);
  if ("ok" in response && response.ok === false) return response;
  return ok(response);
};

const handleCompete = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> =>
  ok(await buildCompeteResponse(flags));

const handleAction = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  if (!flags.jsonInput) {
    return invalidArgs("Missing --input flag with JSON action payload", [
      "Usage: mktg dashboard action --input '{...}' --json",
    ]);
  }

  const parsed = parseJsonInput<DashboardActionPayload>(flags.jsonInput);
  if (!parsed.ok) {
    return invalidArgs(`Invalid JSON payload: ${parsed.message}`, [
      "Payload must include actionId, snapshotVersion, expiresAt, type, and payload",
    ]);
  }

  const validated = validateDashboardActionPayload(parsed.data);
  if (!validated.ok) {
    return invalidArgs(`Invalid dashboard action: ${validated.message}`, []);
  }

  const action = validated.data;
  if (Date.parse(action.expiresAt) < Date.now()) {
    return invalidArgs("Dashboard action expired — refresh the dashboard and try again.", []);
  }
  if (action.snapshotVersion !== DASHBOARD_SNAPSHOT_VERSION) {
    return invalidArgs(`Snapshot version mismatch. Expected ${DASHBOARD_SNAPSHOT_VERSION}, got ${action.snapshotVersion}.`, []);
  }

  switch (action.type) {
    case "open_file": {
      const target = action.payload.path;
      if (typeof target !== "string") {
        return invalidArgs("open_file requires payload.path", []);
      }
      const checked = validatePathInput(flags.cwd, target);
      if (!checked.ok) return invalidArgs(checked.message, []);
      return ok({ allowed: true, type: action.type, targetPath: checked.path, actionId: action.actionId });
    }
    case "copy_command": {
      const command = action.payload.command;
      if (typeof command !== "string" || command.trim().length === 0) {
        return invalidArgs("copy_command requires payload.command", []);
      }
      return ok({ allowed: true, type: action.type, command, actionId: action.actionId });
    }
    case "reveal_issue_source": {
      const source = action.payload.source;
      if (typeof source !== "string" || source.trim().length === 0) {
        return invalidArgs("reveal_issue_source requires payload.source", []);
      }
      return ok({ allowed: true, type: action.type, source, actionId: action.actionId });
    }
    case "jump_to_brand_studio":
      return ok({ allowed: true, type: action.type, route: "/dashboard/brand", actionId: action.actionId });
  }
};

const openBrowser = (url: string): void => {
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", url]
        : ["xdg-open", url];

  const proc = spawn(command[0]!, command.slice(1), { detached: true, stdio: "ignore" });
  proc.unref();
};

const handleLaunch = async (flags: GlobalFlags): Promise<CommandResult> => {
  const token = randomUUID();
  const url = `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}/dashboard`;
  const sessionPath = join(flags.cwd, DASHBOARD_SESSION_FILE);

  const payload = {
    launched: !flags.dryRun,
    projectRoot: flags.cwd,
    url,
    port: DASHBOARD_PORT,
    sessionToken: token,
    sessionPath,
    mode: "local-first",
    next: flags.dryRun
      ? "Run mktg dashboard without --dry-run to start the local UI."
      : "Local dashboard launch started. Open the URL if the browser does not appear.",
  };

  if (flags.dryRun) return ok(payload);

  await mkdir(join(flags.cwd, ".mktg"), { recursive: true });
  // Task #23 fix 6: session token file must be owner-read/write only. Default
  // writeFile mode is 0644 which leaks the token to every local user on the
  // machine — anyone with shell access could read .mktg/dashboard-session.json
  // and hijack the running dashboard.
  await writeFile(
    sessionPath,
    JSON.stringify({ token, projectRoot: flags.cwd, url, createdAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );

  // Runtime-agnostic module dir: Bun exposes `import.meta.dir` directly,
  // but node only exposes `import.meta.url`. Using the node form works under
  // both runtimes — required because dist/cli.js is bundled for node.
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const rootWebsiteDir = join(moduleDir, "..", "..", "website");
  const localWebsiteDir = join(flags.cwd, "website");
  const spawnCwd = existsSync(localWebsiteDir) ? localWebsiteDir : rootWebsiteDir;

  const proc = spawn(
    "bun",
    ["x", "next", "dev", "--hostname", DASHBOARD_HOST, "--port", String(DASHBOARD_PORT)],
    {
      cwd: spawnCwd,
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        MKTG_DASHBOARD_SESSION_TOKEN: token,
        MKTG_DASHBOARD_PROJECT_ROOT: flags.cwd,
        MKTG_DASHBOARD_MODE: "local",
      },
    },
  );
  proc.unref();

  try {
    openBrowser(url);
  } catch {
    // best effort only
  }

  return ok(payload);
};

export const handler: CommandHandler = async (args, flags) => {
  const { subcommand } = parseDashboardArgs(args);
  if (!subcommand) return handleLaunch(flags);
  if (subcommand === "snapshot") return handleSnapshot(args.slice(1), flags);
  if (subcommand === "plan") return handlePlan(args.slice(1), flags);
  if (subcommand === "outputs") return handleOutputs(args.slice(1), flags);
  if (subcommand === "publish") return handlePublish(args.slice(1), flags);
  if (subcommand === "system") return handleSystem(args.slice(1), flags);
  if (subcommand === "compete") return handleCompete(args.slice(1), flags);
  if (subcommand === "action") return handleAction(args.slice(1), flags);

  return invalidArgs(`Unknown dashboard subcommand: ${subcommand}`, [
    "Valid subcommands: snapshot, plan, outputs, publish, system, compete, action",
    "Or run 'mktg dashboard' to launch the local dashboard",
  ]);
};
