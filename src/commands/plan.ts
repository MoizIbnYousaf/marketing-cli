// mktg plan — Execution loop: ordered task queue from project state
// Reads status, run history, dependency graph, brand freshness, learnings.
// Outputs actionable tasks. Persists state across sessions in .mktg/plan.json.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { loadManifest } from "../core/skills";
import { loadCatalogManifest, computeConfiguredStatus } from "../core/catalogs";
import { getRunSummary, type RunSummaryEntry } from "../core/run-log";
import { validateResourceId } from "../core/errors";
import {
  assessProject,
  FOUNDATION_FILES,
  PLAN_FOLLOWON_FILES,
  type ProjectHealth,
} from "../core/project-assess";
import { isTTY, writeStdout, bold, dim, green, yellow, red } from "../core/output";

// Content-file extensions that count as distributable artifacts under marketing/
const MARKETING_ARTIFACT_GLOB = "**/*.{md,mdx,txt,html,json}";

// True when the project has at least one real content artifact under marketing/.
// Load-only skill runs must never stand in for artifacts (honest distribute gate).
const hasMarketingArtifacts = async (cwd: string): Promise<boolean> => {
  try {
    const glob = new Bun.Glob(MARKETING_ARTIFACT_GLOB);
    for await (const _file of glob.scan({ cwd: join(cwd, "marketing") })) {
      return true; // one is enough
    }
  } catch { /* marketing/ doesn't exist */ }
  return false;
};

export const schema: CommandSchema = {
  name: "plan",
  description: "Execution loop — reads project state (completed runs only, never load events) and outputs a prioritized, actionable task queue",
  flags: [
    { name: "--save", type: "boolean", required: false, description: "Persist plan to .mktg/plan.json" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream each task as a NDJSON line to stderr as it is computed" },
  ],
  subcommands: [
    {
      name: "next",
      description: "Show only the highest-priority task",
      flags: [],
      output: { task: "PlanTask — the single highest-priority task" },
      examples: [{ args: "mktg plan next --json", description: "Get the one thing to do right now" }],
    },
    {
      name: "complete",
      description: "Mark a task as completed in the persisted plan",
      flags: [],
      positional: { name: "task-id", description: "Task ID to mark complete", required: true },
      output: { completed: "string — task ID marked complete" },
      examples: [{ args: "mktg plan complete populate-voice", description: "Mark voice population done" }],
    },
  ],
  output: {
    generatedAt: "string — ISO timestamp",
    health: "'ready' | 'incomplete' | 'needs-setup' — project readiness",
    tasks: "PlanTask[] — ordered task queue — detection order, not priority-scored",
    completedCount: "number — tasks previously completed",
    summary: "string — one-sentence executive summary",
  },
  examples: [
    { args: "mktg plan --json", description: "Full prioritized plan" },
    { args: "mktg plan next --json", description: "Just the top priority" },
    { args: "mktg plan --save", description: "Generate and persist plan" },
    { args: "mktg plan --ndjson", description: "Stream each task as a NDJSON line to stderr" },
  ],
  vocabulary: ["plan", "next", "what should I do", "priority", "task queue"],
};

type PlanTask = {
  readonly id: string;
  readonly order: number; // insertion index — detection order, not priority score
  readonly category: "setup" | "populate" | "refresh" | "execute" | "distribute";
  readonly action: string;
  readonly command: string;
  readonly reason: string;
  readonly blocked: boolean;
  readonly blockedBy?: string;
};

type PersistedPlan = {
  readonly generatedAt: string;
  readonly completed: string[];
};

type PlanResult = {
  readonly generatedAt: string;
  readonly health: ProjectHealth;
  readonly tasks: readonly PlanTask[];
  readonly completedCount: number;
  readonly summary: string;
};

const PLAN_FILE = ".mktg/plan.json";

const loadPersisted = async (cwd: string): Promise<PersistedPlan | null> => {
  const file = Bun.file(join(cwd, PLAN_FILE));
  if (!(await file.exists())) return null;
  try { return await file.json() as PersistedPlan; } catch { return null; }
};

const savePersisted = async (cwd: string, plan: PersistedPlan): Promise<void> => {
  await mkdir(join(cwd, ".mktg"), { recursive: true });
  await Bun.write(join(cwd, PLAN_FILE), JSON.stringify(plan, null, 2));
};

// Build tasks from project state
const buildTasks = async (
  cwd: string,
  runSummary: Record<string, RunSummaryEntry>,
  completed: string[],
  ndjson = false,
): Promise<{ tasks: PlanTask[]; health: ProjectHealth }> => {
  const tasks: PlanTask[] = [];
  const completedSet = new Set(completed);

  const emitTask = (task: PlanTask) => {
    tasks.push(task);
    if (ndjson) writeStdout(JSON.stringify({ type: "task", data: task }));
  };

  const assessment = await assessProject(cwd);
  const { brand, brandStatuses, health, skillForFile } = assessment;

  if (health === "needs-setup") {
    emitTask({
      id: "init-brand", order: tasks.length, category: "setup",
      action: "Scaffold brand/ directory", command: "mktg init",
      reason: "No brand/ directory found — this is step zero", blocked: false,
    });
    return { tasks: tasks.filter(t => !completedSet.has(t.id)), health: "needs-setup" };
  }

  // Template files need population (foundation first, then strategy/config).
  // isTemplate comes from assessProject (freshness === "template", plus
  // append-only scaffold detection) — no per-file re-read here.
  const scanOrder = [...FOUNDATION_FILES, ...PLAN_FOLLOWON_FILES];
  const voicePopulated = brand["voice-profile.md"]?.exists === true
    && brand["voice-profile.md"]?.isTemplate !== true;

  for (const file of scanOrder) {
    const entry = brand[file];
    if (!entry?.exists) {
      emitTask({
        id: `create-${file.replace(".md", "")}`, order: tasks.length, category: "setup",
        action: `Create missing brand/${file}`, command: "mktg init",
        reason: `${file} doesn't exist — needed by most skills`, blocked: false,
      });
      continue;
    }
    if (entry.isTemplate) {
      const skill = skillForFile(file);
      const needsVoice = file !== "voice-profile.md" && FOUNDATION_FILES.includes(file);
      emitTask({
        id: `populate-${file.replace(".md", "")}`, order: tasks.length, category: "populate",
        action: `Populate brand/${file}`, command: `mktg run ${skill}`,
        reason: `${file} has template content — needs real data`,
        blocked: needsVoice && !voicePopulated,
        ...(needsVoice && !voicePopulated && { blockedBy: "populate-voice-profile" }),
      });
    }
  }

  // Stale files need refresh
  for (const status of brandStatuses) {
    if (status.freshness === "stale") {
      emitTask({
        id: `refresh-${status.file.replace(".md", "")}`, order: tasks.length, category: "refresh",
        action: `Refresh brand/${status.file}`, command: `mktg run cmo`,
        reason: `Last updated ${status.ageDays} days ago — may be outdated`, blocked: false,
      });
    }
  }

  // Execution skills not yet completed (suggest based on dependency graph).
  // runSummary is completed-only (load events filtered upstream) — a skill
  // that was merely loaded still counts as never-done.
  try {
    const manifest = await loadManifest();
    const mustHaveSkills = Object.entries(manifest.skills)
      .filter(([, m]) => m.tier === "must-have" && m.layer === "execution")
      .map(([name]) => name);

    for (const skill of mustHaveSkills) {
      if (!runSummary[skill]) {
        emitTask({
          id: `run-${skill}`, order: tasks.length, category: "execute",
          action: `Run /${skill} for the first time`, command: `mktg run ${skill}`,
          reason: `Must-have execution skill never completed — produces marketing assets`, blocked: false,
        });
      }
    }
  } catch { /* manifest issues handled elsewhere */ }

  // Distribution — real evidence only: artifacts under marketing/ OR a
  // completed content-skill run. Load-only history never unlocks distribute.
  const completedSkills = Object.keys(runSummary);
  const hasCompletedContent = completedSkills.some(s =>
    ["seo-content", "direct-response-copy", "lead-magnet", "creative"].includes(s),
  );
  const contentEvidence = hasCompletedContent || await hasMarketingArtifacts(cwd);
  const hasDistributed = completedSkills.some(s =>
    ["content-atomizer", "email-sequences", "social-campaign", "typefully"].includes(s),
  );
  if (contentEvidence && !hasDistributed) {
    emitTask({
      id: "distribute-content", order: tasks.length, category: "distribute",
      action: "Distribute created content", command: "mktg run content-atomizer",
      reason: "Content artifacts exist but no distribution skill has completed — 70% of marketing is distribution",
      blocked: false,
    });
  }

  // SEO backend awareness (OpenSEO is the default SEO data plane — S5).
  try {
    const catalogResult = await loadCatalogManifest();
    const openseo = catalogResult.ok ? catalogResult.manifest.catalogs["openseo"] ?? null : null;
    if (openseo) {
      const openseoStatus = computeConfiguredStatus(openseo);
      const bindingExists = await Bun.file(join(cwd, ".seo", "openseo.json")).exists();
      const keywordPlanPopulated = brand["keyword-plan.md"]?.exists === true
        && brand["keyword-plan.md"]?.isTemplate === false;
      if (openseoStatus.configured && !bindingExists) {
        emitTask({
          id: "seo-link-project", order: tasks.length, category: "setup",
          action: "Link an OpenSEO project to this repo", command: "mktg seo status --json",
          reason: "OpenSEO is configured but no project is bound — linking unlocks keyword/rank sync",
          blocked: false,
        });
      } else if (!openseoStatus.configured && keywordPlanPopulated) {
        emitTask({
          id: "seo-connect-openseo", order: tasks.length, category: "setup",
          action: "Connect OpenSEO for measured SEO metrics", command: "mktg catalog info openseo --json --fields missing_envs,mcp",
          reason: "keyword-plan.md is populated but its metrics are unmeasured — OpenSEO adds KD, volume, SERP, backlinks, GSC",
          blocked: false,
        });
      }
    }
  } catch { /* catalog issues are doctor's job, not plan's */ }

  return { tasks: tasks.filter(t => !completedSet.has(t.id)), health };
};

const buildSummary = (tasks: readonly PlanTask[], health: string): string => {
  if (tasks.length === 0) return "All tasks complete — project is fully set up.";
  const top = tasks[0]!;
  const setupCount = tasks.filter(t => t.category === "setup" || t.category === "populate").length;
  if (health === "needs-setup") return "Project needs initialization — run mktg init first.";
  if (setupCount > 0) return `${setupCount} brand files need attention. Top priority: ${top.action.toLowerCase()}.`;
  return `${tasks.length} tasks queued. Next: ${top.action.toLowerCase()}.`;
};

export const handler: CommandHandler<PlanResult | { completed: string } | { task: PlanTask | null }> = async (args, flags) => {
  const cwd = flags.cwd;
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const subcommand = positionalArgs[0];
  const wantSave = args.includes("--save");
  const ndjson = args.includes("--ndjson");

  // Load persisted state
  const persisted = await loadPersisted(cwd);
  const completed = persisted?.completed ?? [];

  // Subcommand: complete
  if (subcommand === "complete") {
    const taskId = positionalArgs[1];
    if (!taskId) return err("INVALID_ARGS", "Missing task ID", ["Usage: mktg plan complete <task-id>"], 2);
    const idCheck = validateResourceId(taskId, "task ID");
    if (!idCheck.ok) return err("INVALID_ARGS", idCheck.message, [], 2);
    if (flags.dryRun) return ok({ completed: taskId });
    const newCompleted = [...completed, taskId];
    await savePersisted(cwd, { generatedAt: new Date().toISOString(), completed: newCompleted });
    return ok({ completed: taskId });
  }

  // Build plan — completed runs only. A bare `mktg run` logs event:"loaded"
  // and must not count as executed work anywhere in this queue.
  const runSummary = await getRunSummary(cwd, { completedOnly: true });
  const { tasks, health } = await buildTasks(cwd, runSummary, completed, ndjson);
  if (ndjson) writeStdout(JSON.stringify({ type: "summary", data: { health, count: tasks.length } }));
  const summary = buildSummary(tasks, health);
  const now = new Date().toISOString();

  // Subcommand: next
  if (subcommand === "next") {
    const unblockedTasks = tasks.filter(t => !t.blocked);
    return ok({ task: unblockedTasks[0] ?? null });
  }

  // Save if requested
  if (wantSave && !flags.dryRun) {
    await savePersisted(cwd, { generatedAt: now, completed });
  }

  const result: PlanResult = { generatedAt: now, health, tasks, completedCount: completed.length, summary };

  // TTY display
  if (isTTY() && !flags.json) {
    writeStdout("");
    writeStdout(`  ${bold("mktg plan")} ${dim(`(${tasks.length} tasks)`)}`);
    writeStdout(`  ${dim(summary)}`);
    writeStdout("");
    for (const task of tasks.slice(0, 10)) {
      const icon = task.blocked ? red("x") : task.category === "setup" ? yellow("!") : green(">");
      const blockedTag = task.blocked ? dim(` [blocked by ${task.blockedBy}]`) : "";
      writeStdout(`  ${icon} ${bold(`#${task.order}`)} ${task.action}${blockedTag}`);
      writeStdout(`    ${dim(task.reason)}`);
      writeStdout(`    ${dim(`$ ${task.command}`)}`);
    }
    if (tasks.length > 10) writeStdout(dim(`  ... and ${tasks.length - 10} more`));
    writeStdout("");
  }

  return ok(result);
};
