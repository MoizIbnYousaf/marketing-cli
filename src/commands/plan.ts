// mktg plan — Execution loop: ordered task queue from project state
// Reads status, run history, dependency graph, brand freshness, learnings.
// Outputs actionable tasks. Persists state across sessions in .mktg/plan.json.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema, type BrandFile } from "../types";
import { getBrandStatus, isTemplateContent } from "../core/brand";
import { loadManifest, getSkillNames } from "../core/skills";
import { buildGraph } from "../core/skill-lifecycle";
import { getRunSummary, type RunSummaryEntry } from "../core/run-log";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { isTTY, writeStderr, bold, dim, green, yellow, red } from "../core/output";

export const schema: CommandSchema = {
  name: "plan",
  description: "Execution loop — reads project state and outputs a prioritized, actionable task queue",
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
  readonly health: "ready" | "incomplete" | "needs-setup";
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
): Promise<{ tasks: PlanTask[]; health: PlanResult["health"] }> => {
  const tasks: PlanTask[] = [];
  const completedSet = new Set(completed);

  const emitTask = (task: PlanTask) => {
    tasks.push(task);
    if (ndjson) writeStderr(JSON.stringify({ type: "task", data: task }));
  };

  // 1. Check brand status
  const brandStatuses = await getBrandStatus(cwd);
  const hasBrand = brandStatuses.some(s => s.exists);

  if (!hasBrand) {
    emitTask({
      id: "init-brand", order: tasks.length, category: "setup",
      action: "Scaffold brand/ directory", command: "mktg init",
      reason: "No brand/ directory found — this is step zero", blocked: false,
    });
    return { tasks: tasks.filter(t => !completedSet.has(t.id)), health: "needs-setup" };
  }

  // 2. Template files need population (foundation first)
  const foundationOrder: BrandFile[] = ["voice-profile.md", "audience.md", "competitors.md", "landscape.md", "positioning.md"];
  const strategyOrder: BrandFile[] = ["keyword-plan.md"];
  const configOrder: BrandFile[] = ["creative-kit.md", "stack.md"];

  for (const file of [...foundationOrder, ...strategyOrder, ...configOrder]) {
    const status = brandStatuses.find(s => s.file === file);
    if (!status?.exists) {
      emitTask({
        id: `create-${file.replace(".md", "")}`, order: tasks.length, category: "setup",
        action: `Create missing brand/${file}`, command: "mktg init",
        reason: `${file} doesn't exist — needed by most skills`, blocked: false,
      });
      continue;
    }
    try {
      const content = await Bun.file(join(cwd, "brand", file)).text();
      if (isTemplateContent(file, content)) {
        const skillMap: Record<string, string> = {
          "voice-profile.md": "brand-voice", "positioning.md": "positioning-angles",
          "audience.md": "audience-research", "competitors.md": "competitive-intel",
          "landscape.md": "landscape-scan",
          "keyword-plan.md": "keyword-research", "creative-kit.md": "creative",
          "stack.md": "cmo",
        };
        const skill = skillMap[file] ?? "cmo";
        const needsVoice = file !== "voice-profile.md" && foundationOrder.includes(file);
        const voicePopulated = !brandStatuses.find(s => s.file === "voice-profile.md")?.exists
          ? false
          : !(await (async () => {
              try {
                const vc = await Bun.file(join(cwd, "brand", "voice-profile.md")).text();
                return isTemplateContent("voice-profile.md", vc);
              } catch { return true; }
            })());

        emitTask({
          id: `populate-${file.replace(".md", "")}`, order: tasks.length, category: "populate",
          action: `Populate brand/${file}`, command: `mktg run ${skill}`,
          reason: `${file} has template content — needs real data`,
          blocked: needsVoice && !voicePopulated,
          ...(needsVoice && !voicePopulated && { blockedBy: "populate-voice-profile" }),
        });
      }
    } catch { /* skip unreadable */ }
  }

  // 3. Stale files need refresh
  for (const status of brandStatuses) {
    if (status.freshness === "stale") {
      emitTask({
        id: `refresh-${status.file.replace(".md", "")}`, order: tasks.length, category: "refresh",
        action: `Refresh brand/${status.file}`, command: `mktg run cmo`,
        reason: `Last updated ${status.ageDays} days ago — may be outdated`, blocked: false,
      });
    }
  }

  // 4. Execution skills not yet run (suggest based on dependency graph)
  try {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);
    const mustHaveSkills = Object.entries(manifest.skills)
      .filter(([, m]) => m.tier === "must-have" && m.layer === "execution")
      .map(([name]) => name);

    for (const skill of mustHaveSkills) {
      if (!runSummary[skill]) {
        emitTask({
          id: `run-${skill}`, order: tasks.length, category: "execute",
          action: `Run /${skill} for the first time`, command: `mktg run ${skill}`,
          reason: `Must-have execution skill never run — produces marketing assets`, blocked: false,
        });
      }
    }
  } catch { /* manifest issues handled elsewhere */ }

  // 5. Distribution — check if content exists but hasn't been distributed
  const executedSkills = Object.keys(runSummary);
  const hasContent = executedSkills.some(s =>
    ["seo-content", "direct-response-copy", "lead-magnet", "creative"].includes(s),
  );
  const hasDistributed = executedSkills.some(s =>
    ["content-atomizer", "email-sequences", "social-campaign", "typefully"].includes(s),
  );
  if (hasContent && !hasDistributed) {
    emitTask({
      id: "distribute-content", order: tasks.length, category: "distribute",
      action: "Distribute created content", command: "mktg run content-atomizer",
      reason: "Content skills have run but no distribution skills yet — 70% of marketing is distribution",
      blocked: false,
    });
  }

  const populated = brandStatuses.filter(s => {
    if (!s.exists) return false;
    try { return true; } catch { return false; }
  }).length;
  const health: PlanResult["health"] = populated >= 3 ? "ready" : "incomplete";

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

  // Build plan
  const runSummary = await getRunSummary(cwd);
  const { tasks, health } = await buildTasks(cwd, runSummary, completed, ndjson);
  if (ndjson) writeStderr(JSON.stringify({ type: "summary", data: { health, count: tasks.length } }));
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
    writeStderr("");
    writeStderr(`  ${bold("mktg plan")} ${dim(`(${tasks.length} tasks)`)}`);
    writeStderr(`  ${dim(summary)}`);
    writeStderr("");
    for (const task of tasks.slice(0, 10)) {
      const icon = task.blocked ? red("x") : task.category === "setup" ? yellow("!") : green(">");
      const blockedTag = task.blocked ? dim(` [blocked by ${task.blockedBy}]`) : "";
      writeStderr(`  ${icon} ${bold(`#${task.order}`)} ${task.action}${blockedTag}`);
      writeStderr(`    ${dim(task.reason)}`);
      writeStderr(`    ${dim(`$ ${task.command}`)}`);
    }
    if (tasks.length > 10) writeStderr(dim(`  ... and ${tasks.length - 10} more`));
    writeStderr("");
  }

  return ok(result);
};
