// mktg status — Project marketing state snapshot
// The most important command for agents. /cmo reads this first on every activation.

import { ok, type CommandHandler, type CommandSchema, type BrandFile } from "../types";
import { getBrandStatus, isTemplateContent } from "../core/brand";
import { loadManifest, getInstallStatus } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus } from "../core/agents";
import { getIntegrationStatus } from "../core/integrations";
import { getRunSummary } from "../core/run-log";
import { bold, dim, green, red, yellow, isTTY } from "../core/output";
import { join } from "node:path";

export const schema: CommandSchema = {
  name: "status",
  description: "Project marketing state snapshot — the most important command for agents",
  flags: [],
  output: {
    "project": "string — project name",
    "brand": "Record<string, BrandEntry> — brand file statuses with freshness",
    "brand.*.isTemplate": "boolean — true if file is still scaffold template from mktg init",
    "brand.*.freshness": "'current' | 'stale' | 'missing' | 'template' — file freshness state",
    "brandSummary": "{populated, template, missing, stale} — quick counts for decision-making",
    "skills": "{installed, total} — skill counts",
    "agents": "{installed, total} — agent counts",
    "content": "{totalFiles, byDir} — content file counts with breakdown",
    "integrations": "Record<string, IntegrationEntry> — env var readiness for third-party skills",
    "recentActivity": "Record<string, {lastRun, result, daysSince}> — per-skill execution history",
    "nextActions": "string[] — prioritized suggestions for what the agent should do next",
    "health": "'ready' | 'incomplete' | 'needs-setup' — overall project marketing readiness",
  },
  examples: [
    { args: "mktg status --json", description: "Full project state snapshot" },
    { args: "mktg status --fields health,nextActions", description: "Quick: what should I do?" },
    { args: "mktg status --fields brandSummary", description: "Brand completeness at a glance" },
  ],
  vocabulary: ["status", "state", "overview", "snapshot"],
};

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

type StatusResult = {
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

// Count marketing content files in common directories, with per-dir breakdown
const countContentFiles = async (cwd: string): Promise<ContentSummary> => {
  const contentDirs = ["marketing", "campaigns", "content"];
  const byDir: Record<string, number> = {};
  let totalFiles = 0;

  for (const dir of contentDirs) {
    const dirPath = join(cwd, dir);
    let count = 0;
    try {
      const glob = new Bun.Glob("**/*.{md,mdx,txt,html}");
      for await (const _file of glob.scan({ cwd: dirPath })) {
        count++;
      }
    } catch {
      // Directory doesn't exist — fine
    }
    if (count > 0) byDir[dir] = count;
    totalFiles += count;
  }

  return { totalFiles, byDir };
};

// Determine project name from package.json or directory name
const getProjectName = async (cwd: string): Promise<string> => {
  try {
    const pkgPath = join(cwd, "package.json");
    const file = Bun.file(pkgPath);
    if (await file.exists()) {
      const pkg = await file.json();
      if (pkg.name) return pkg.name;
    }
  } catch {
    // Fall through
  }
  return cwd.split("/").pop() ?? "unknown";
};

// Generate prioritized next actions based on current state
const buildNextActions = (
  health: StatusResult["health"],
  brand: Record<string, BrandEntry>,
  brandSummary: BrandSummary,
  recentActivity: Record<string, ActivityEntry>,
): string[] => {
  const actions: string[] = [];

  if (health === "needs-setup") {
    actions.push("Run 'mktg init' to scaffold brand/ directory and install skills");
    return actions;
  }

  // Priority 1: Populate template files (foundation first)
  const foundationFiles: BrandFile[] = ["voice-profile.md", "positioning.md", "audience.md"];
  for (const file of foundationFiles) {
    const entry = brand[file];
    if (entry && entry.isTemplate) {
      const skillMap: Record<string, string> = {
        "voice-profile.md": "/brand-voice",
        "positioning.md": "/positioning-angles",
        "audience.md": "/audience-research",
      };
      actions.push(`Run ${skillMap[file]} to populate ${file} (still template)`);
    }
  }

  // Priority 2: Missing files
  for (const [file, entry] of Object.entries(brand)) {
    if (!entry.exists) {
      actions.push(`Create brand/${file} — run 'mktg init' to scaffold it`);
    }
  }

  // Priority 3: Stale files
  for (const [file, entry] of Object.entries(brand)) {
    if (entry.freshness === "stale") {
      actions.push(`Refresh brand/${file} — last updated ${entry.ageDays} days ago`);
    }
  }

  // Priority 4: Remaining template files (non-foundation)
  for (const [file, entry] of Object.entries(brand)) {
    if (entry.isTemplate && !foundationFiles.includes(file as BrandFile)) {
      actions.push(`Populate brand/${file} (still template)`);
    }
  }

  // Priority 5: No recent activity
  if (Object.keys(recentActivity).length === 0 && health === "ready") {
    actions.push("Brand is ready — run /cmo to start marketing execution");
  }

  return actions;
};

export const handler: CommandHandler<StatusResult> = async (_args, flags) => {
  const cwd = flags.cwd;
  const manifest = await loadManifest();
  const installStatus = await getInstallStatus(manifest);

  // Build integration status map (deduped by env var)
  const integrationStatuses = getIntegrationStatus(manifest);
  const integrations: Record<string, IntegrationEntry> = Object.fromEntries(
    integrationStatuses.map((s) => [s.envVar, { configured: s.configured, envVar: s.envVar, skills: s.skills }]),
  );

  const installedCount = Object.values(installStatus).filter(
    (s) => s.installed,
  ).length;

  // Load agent status
  let agentInstalled = 0;
  let agentTotal = 0;
  try {
    const agentManifest = await loadAgentManifest();
    const agentStatus = await getAgentInstallStatus(agentManifest);
    agentTotal = Object.keys(agentManifest.agents).length;
    agentInstalled = Object.values(agentStatus).filter((s) => s.installed).length;
  } catch {
    // Agent manifest may not exist
  }

  // Run checks in parallel
  const [brandStatuses, contentSummary, projectName, recentActivity] = await Promise.all([
    getBrandStatus(cwd),
    countContentFiles(cwd),
    getProjectName(cwd),
    getRunSummary(cwd),
  ]);

  // Build brand status map with line counts, freshness, and template detection (parallel)
  const brandEntries = await Promise.all(
    brandStatuses.map(async (status) => {
      if (!status.exists) return [status.file, { exists: false, freshness: "missing" as const }] as const;
      const filePath = join(cwd, "brand", status.file);
      try {
        const content = await Bun.file(filePath).text();
        const isTemplate = isTemplateContent(status.file as BrandFile, content);
        // Override freshness to "template" when content matches scaffold — more useful for agents
        const freshness = isTemplate ? "template" as const : status.freshness;
        return [status.file, {
          exists: true,
          freshness,
          lines: content.split("\n").length,
          ageDays: status.ageDays,
          isTemplate,
        }] as const;
      } catch {
        return [status.file, { exists: true, freshness: status.freshness, lines: 0, ageDays: status.ageDays, isTemplate: false }] as const;
      }
    })
  );
  const brand: Record<string, BrandEntry> = Object.fromEntries(brandEntries);

  // Compute brand summary counts
  const brandValues = Object.values(brand);
  const brandSummary: BrandSummary = {
    populated: brandValues.filter(b => b.exists && !b.isTemplate).length,
    template: brandValues.filter(b => b.exists && b.isTemplate).length,
    missing: brandValues.filter(b => !b.exists).length,
    stale: brandValues.filter(b => b.freshness === "stale").length,
  };

  // Determine health — template-only files don't count as populated
  const hasBrandDir = brandStatuses.some((s) => s.exists);
  const health: StatusResult["health"] = !hasBrandDir
    ? "needs-setup"
    : brandSummary.populated >= 3
      ? "ready"
      : "incomplete";

  const nextActions = buildNextActions(health, brand, brandSummary, recentActivity);

  const result: StatusResult = {
    project: projectName,
    brand,
    brandSummary,
    skills: {
      installed: installedCount,
      total: Object.keys(manifest.skills).length,
    },
    agents: {
      installed: agentInstalled,
      total: agentTotal,
    },
    integrations,
    content: contentSummary,
    recentActivity,
    nextActions,
    health,
  };

  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY display
  const lines: string[] = [];
  lines.push(bold(`mktg status — ${projectName}`));
  lines.push("");

  const healthIcon =
    health === "ready"
      ? green("● Ready")
      : health === "incomplete"
        ? yellow("● Incomplete")
        : red("● Needs setup");
  lines.push(`  Health: ${healthIcon}`);
  lines.push("");

  lines.push(bold("  Brand Files") + dim(` (${brandSummary.populated} populated, ${brandSummary.template} template, ${brandSummary.missing} missing)`));
  for (const status of brandStatuses) {
    const icon = status.exists ? green("●") : red("●");
    const age = status.ageDays !== null ? dim(` (${status.ageDays}d ago)`) : "";
    const freshness =
      status.freshness === "stale" ? yellow(" [stale]") : "";
    const template = brand[status.file]?.isTemplate ? yellow(" [template]") : "";
    lines.push(`    ${icon} ${status.file}${age}${freshness}${template}`);
  }
  lines.push("");

  lines.push(
    bold("  Skills") +
      dim(` ${result.skills.installed}/${result.skills.total} installed`),
  );

  if (result.agents.total > 0) {
    lines.push(
      bold("  Agents") +
        dim(` ${result.agents.installed}/${result.agents.total} installed`),
    );
  }

  const integrationEntries = Object.values(result.integrations);
  if (integrationEntries.length > 0) {
    lines.push(bold("  Integrations"));
    for (const entry of integrationEntries) {
      const icon = entry.configured ? green("●") : yellow("●");
      const status = entry.configured ? "configured" : "not configured";
      lines.push(`    ${icon} ${entry.envVar} ${dim(`(${status} — ${entry.skills.join(", ")})`)}`);
    }
    lines.push("");
  }

  if (contentSummary.totalFiles > 0) {
    const dirBreakdown = Object.entries(contentSummary.byDir).map(([d, c]) => `${d}: ${c}`).join(", ");
    lines.push(bold("  Content") + dim(` ${contentSummary.totalFiles} files (${dirBreakdown})`));
  }

  const activityKeys = Object.keys(recentActivity);
  if (activityKeys.length > 0) {
    lines.push(bold("  Recent Activity") + dim(` ${activityKeys.length} skills run`));
    for (const [skill, activity] of Object.entries(recentActivity).slice(0, 5)) {
      const icon = activity.result === "success" ? green("●") : activity.result === "partial" ? yellow("●") : red("●");
      lines.push(`    ${icon} ${skill} ${dim(`(${activity.daysSince}d ago, ${activity.result})`)}`);
    }
    if (activityKeys.length > 5) {
      lines.push(dim(`    ... and ${activityKeys.length - 5} more`));
    }
  }
  lines.push("");

  if (nextActions.length > 0) {
    lines.push(bold("  Next Actions"));
    for (const action of nextActions.slice(0, 3)) {
      lines.push(`    → ${action}`);
    }
    lines.push("");
  }

  if (health === "needs-setup") {
    lines.push(dim("  Run 'mktg init' to get started."));
    lines.push("");
  }

  return ok(result, lines.join("\n"));
};
