// mktg run — Load a skill for agent consumption
// Checks prerequisites, reads SKILL.md content, and logs execution.

import { join } from "node:path";
import type { CommandHandler, CommandSchema, PrerequisiteStatus } from "../types";
import { ok } from "../types";
import { invalidArgs, notFound, DOCS, parseJsonInput } from "../core/errors";
import { resolveManifest, getSkill, getSkillsInstallDir } from "../core/skills";
import { checkPrerequisites } from "../core/skill-lifecycle";
import { logRun, getLastRun, getRunHistory } from "../core/run-log";
import { appendLearning, type LearningEntry } from "../core/brand";
import { writeStderr } from "../core/output";

export const schema: CommandSchema = {
  name: "run",
  description: "Load a skill for agent consumption — checks prerequisites, surfaces prior run context, and logs execution",
  positional: { name: "skill", description: "Skill name to run", required: true },
  flags: [
    { name: "--learning", type: "string", required: false, description: "JSON learning entry to append to brand/learnings.md after run" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream prerequisite check, skill-loaded, and complete events as NDJSON lines to stderr" },
  ],
  output: {
    skill: "string — resolved skill name",
    content: "string — full SKILL.md content",
    prerequisites: "PrerequisiteStatus — prerequisite check results",
    loggedAt: "string — ISO timestamp of logged run",
    priorRuns: "object — lastRun timestamp, runCount, and lastResult for this skill",
    learningAppended: "string | null — the table row appended to learnings.md, or null if --learning not provided",
  },
  examples: [
    { args: "mktg run seo-content --json", description: "Load SEO content skill for agent" },
    { args: "mktg run brand-voice --dry-run", description: "Preview without logging" },
    { args: "mktg run seo-content --ndjson", description: "Stream prerequisite, load, and complete events to stderr" },
  ],
  vocabulary: ["run", "execute", "load skill"],
};

type PriorRunContext = {
  readonly lastRun: string | null;
  readonly lastResult: string | null;
  readonly runCount: number;
};

type RunResult = {
  readonly skill: string;
  readonly content: string;
  readonly prerequisites: PrerequisiteStatus;
  readonly loggedAt: string | null;
  readonly priorRuns: PriorRunContext;
  readonly learningAppended: string | null;
};

export const handler: CommandHandler<RunResult> = async (args, flags) => {
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const skillName = positionalArgs[0];
  const ndjson = args.includes("--ndjson");

  if (!skillName) {
    return invalidArgs("Missing skill name", ["Usage: mktg run <skill-name>", "mktg list --json to see available skills"], DOCS.skills);
  }

  const manifest = await resolveManifest(flags.cwd);
  const resolved = getSkill(manifest, skillName);
  if (!resolved) {
    return notFound(`Skill '${skillName}'`, [
      "mktg list --json to see all available skills",
      "Check spelling — redirects are followed automatically",
    ], DOCS.skills);
  }

  // Check prerequisites (warn but don't block — progressive enhancement)
  const prerequisites = await checkPrerequisites(resolved.name, flags.cwd, manifest);
  if (ndjson) {
    writeStderr(JSON.stringify({
      type: "prerequisite",
      data: {
        skill: resolved.name,
        satisfied: prerequisites.satisfied,
        missing: prerequisites.missing,
      },
    }));
  }

  // Read SKILL.md from install directory
  const skillMdPath = join(getSkillsInstallDir(), resolved.name, "SKILL.md");
  const skillFile = Bun.file(skillMdPath);
  if (!(await skillFile.exists())) {
    return notFound(`Installed skill '${resolved.name}'`, [
      "Run 'mktg update' to install skills",
      "Run 'mktg init' if this is a fresh setup",
    ], DOCS.skills);
  }

  const content = await skillFile.text();
  if (ndjson) {
    writeStderr(JSON.stringify({
      type: "skill-loaded",
      data: { skill: resolved.name, path: skillMdPath, size: content.length },
    }));
  }
  const now = new Date().toISOString();

  // Surface prior run context — agent sees usage history with every load
  const lastRun = await getLastRun(flags.cwd, resolved.name);
  const priorHistory = await getRunHistory(flags.cwd, resolved.name, 10000);
  const priorRuns: PriorRunContext = {
    lastRun: lastRun?.timestamp ?? null,
    lastResult: lastRun?.result ?? null,
    runCount: priorHistory.length,
  };

  // Parse --learning flag from args
  let learningJson: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--learning" && args[i + 1]) { learningJson = args[i + 1]; break; }
    if (args[i]?.startsWith("--learning=")) { learningJson = args[i]!.slice(11); break; }
  }

  // Append learning if provided
  let learningAppended: string | null = null;
  if (learningJson) {
    const parsed = parseJsonInput<LearningEntry>(learningJson);
    if (!parsed.ok) {
      return invalidArgs(`Invalid --learning JSON: ${parsed.message}`, [
        'Format: --learning \'{"action":"...","result":"...","learning":"...","nextStep":"..."}\'',
        "Date is auto-filled if missing",
      ]);
    }
    const entry: LearningEntry = {
      date: parsed.data.date || now.split("T")[0]!,
      action: parsed.data.action,
      result: parsed.data.result,
      learning: parsed.data.learning,
      nextStep: parsed.data.nextStep,
    };
    const learningResult = await appendLearning(flags.cwd, entry, flags.dryRun);
    if (!learningResult.ok) {
      return invalidArgs(`Learning validation failed: ${learningResult.message}`, [
        "All fields (action, result, learning, nextStep) are required",
        "Fields cannot contain pipe characters (|)",
      ]);
    }
    learningAppended = learningResult.row;
  }

  // Log execution (unless dry-run)
  if (!flags.dryRun) {
    await logRun(flags.cwd, {
      skill: resolved.name,
      timestamp: now,
      result: "success",
      brandFilesChanged: learningAppended ? ["learnings.md"] : [],
    });
  }

  const result: RunResult = {
    skill: resolved.name,
    content,
    prerequisites,
    loggedAt: flags.dryRun ? null : now,
    priorRuns,
    learningAppended,
  };

  if (ndjson) {
    writeStderr(JSON.stringify({ type: "complete", data: { skill: resolved.name, result: "success" } }));
  }

  return ok(result);
};
