// mktg run — Load a skill for agent consumption
// Checks prerequisites, reads SKILL.md content, and logs execution.

import { join } from "node:path";
import type { CommandHandler, CommandSchema, PrerequisiteStatus } from "../types";
import { ok, err } from "../types";
import { invalidArgs, notFound, DOCS, parseJsonInput, rejectControlChars, validateResourceId } from "../core/errors";
import { resolveManifest, getSkill, getSkillsInstallDir } from "../core/skills";
import { checkPrerequisites } from "../core/skill-lifecycle";
import { logRun, getLastRun, getRunHistory, isCompletedRecord } from "../core/run-log";
import { compileBrandContext, filesForSkillActivation, type ContextFileEntry } from "../core/context-compiler";
import { parseRunFlags, validateCompletionWrites, isRunOutcome, RUN_OUTCOME_VALUES, type RunOutcome } from "../core/run-flags";
import { appendLearning, type LearningEntry } from "../core/brand";
import { writeStderr } from "../core/output";

type ActivationContext = {
  readonly layer: string;
  readonly files: Record<string, ContextFileEntry>;
  readonly tokenEstimate: number;
  readonly budgetDropped: readonly string[];
  readonly templatesSkipped: readonly string[];
};

export const schema: CommandSchema = {
  name: "run",
  description: "Load a skill for agent consumption — logs a 'loaded' event by default; record real outcomes with --complete so plan/status stay honest",
  positional: { name: "skill", description: "Skill name to run", required: true },
  flags: [
    { name: "--learning", type: "string", required: false, description: "JSON learning entry to append to brand/learnings.md after run" },
    { name: "--complete", type: "boolean", required: false, description: "Record a completed run (work actually happened) instead of a load event" },
    { name: "--result", type: "string", required: false, description: "Outcome with --complete: success | partial | failed (default success)" },
    { name: "--writes", type: "string", required: false, description: "Comma-separated files the agent produced (repeatable); each must exist inside the project" },
    { name: "--with-context", type: "boolean", required: false, description: "One-shot activation: include non-template brand context selected from the skill's declared reads (or layer matrix)" },
    { name: "--budget", type: "string", required: false, description: "With --with-context: approximate token budget for context files (priority truncation)" },
    { name: "--strict", type: "boolean", required: false, description: "Exit 3 (DEPENDENCY_MISSING) when any prerequisite (skills, brand files, envs, tools, catalogs) is unsatisfied" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream prerequisite check, skill-loaded, and complete events as NDJSON lines to stderr" },
  ],
  output: {
    skill: "string — resolved skill name",
    content: "string — full SKILL.md content",
    prerequisites: "PrerequisiteStatus — prerequisite check results (skills, brandFiles, envs, tools, catalogs)",
    loggedAt: "string | null — ISO timestamp of logged run (null on --dry-run)",
    event: "'loaded' | 'completed' — what was logged: load events never imply work",
    result: "'success' | 'partial' | 'failed' | null — outcome with --complete; null on loads",
    writes: "string[] | null — validated files recorded with --complete; null on loads",
    context: "object | null — with --with-context: {layer, files, tokenEstimate, budgetDropped, templatesSkipped}; null otherwise",
    priorRuns: "object — lastRun timestamp, lastEvent, runCount, and lastResult for this skill",
    learningAppended: "string | null — the table row appended to learnings.md, or null if --learning not provided",
  },
  examples: [
    { args: "mktg run seo-content --json", description: "Load SEO content skill for agent (logs event: loaded)" },
    { args: "mktg run seo-content --with-context --budget 4000 --json", description: "One-shot activation: skill + brand context in one call" },
    { args: "mktg run postiz --strict --json", description: "Fail fast (exit 3) when env vars like POSTIZ_API_KEY are missing" },
    { args: "mktg run seo-content --complete --writes marketing/content/x.md --result success --json", description: "Record completed work with validated writes" },
    { args: "mktg skill history seo-content --json", description: "See load vs completion events for a skill" },
  ],
  vocabulary: ["run", "execute", "load skill", "complete", "record outcome"],
};

type PriorRunContext = {
  readonly lastRun: string | null;
  readonly lastEvent: "loaded" | "completed" | null;
  readonly lastResult: string | null;
  readonly runCount: number;
};

type RunResult = {
  readonly skill: string;
  readonly content: string;
  readonly prerequisites: PrerequisiteStatus;
  readonly loggedAt: string | null;
  readonly event: "loaded" | "completed";
  readonly result: "success" | "partial" | "failed" | null;
  readonly writes: readonly string[] | null;
  readonly context: ActivationContext | null;
  readonly priorRuns: PriorRunContext;
  readonly learningAppended: string | null;
};

export const handler: CommandHandler<RunResult> = async (args, flags) => {
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const skillName = positionalArgs[0];
  const ndjson = args.includes("--ndjson");
  const wantComplete = args.includes("--complete");
  const withContext = args.includes("--with-context");
  const strict = args.includes("--strict");

  if (!skillName) {
    return invalidArgs("Missing skill name", ["Usage: mktg run <skill-name>", "mktg list --json to see available skills"], DOCS.skills);
  }

  // Parse --result / --writes (completion-only flags) and --budget
  const parsed = parseRunFlags(args);
  const resultRaw = parsed.resultArg;
  const writesList = parsed.writesList;
  const budget = parsed.budget;

  if (resultRaw !== undefined && !isRunOutcome(resultRaw)) {
    return invalidArgs(`Invalid --result '${resultRaw}'`, [
      `Valid values: ${RUN_OUTCOME_VALUES.join(" | ")}`,
    ], DOCS.skills);
  }
  // Guard above narrows: defined values are RunOutcome, no cast needed.
  const resultArg: RunOutcome | undefined = resultRaw;
  if (!wantComplete && (resultArg !== undefined || writesList.length > 0)) {
    return invalidArgs("--result and --writes require --complete", [
      "Usage: mktg run <skill> --complete [--result success] [--writes path1,path2]",
      "A bare 'mktg run' logs event: loaded — completions must be explicit",
    ], DOCS.skills);
  }
  if (budget !== undefined && (isNaN(budget) || budget < 1)) {
    return invalidArgs("--budget must be a positive integer", ["Example: mktg run seo-content --with-context --budget 4000"], DOCS.skills);
  }
  if (budget !== undefined && !withContext) {
    return invalidArgs("--budget requires --with-context", [
      "Usage: mktg run <skill> --with-context --budget 4000",
    ], DOCS.skills);
  }

  // Validate --writes BEFORE any dependency lookup (manifest, install dir):
  // static input errors must precede environment errors, so an agent gets
  // INVALID_ARGS about its payload whether or not skills are installed.
  let validatedWrites: readonly string[] = [];
  if (wantComplete && writesList.length > 0) {
    const writesCheck = await validateCompletionWrites(flags.cwd, writesList);
    if (!writesCheck.ok) {
      return invalidArgs(writesCheck.message, [
        "Writes must be existing files inside the project (brand/, marketing/, .mktg/)",
        "Create the files first, then record completion with the same command",
      ], DOCS.skills);
    }
    validatedWrites = writesCheck.writes;
  }

  // Lane 1 / Wave A audit fix: every other resource-name command in the
  // registry validates its positional via these two checks; `mktg run`
  // was the lone gap. Reject control chars + cap length at 128 BEFORE
  // we hit the manifest so a 10 KB skill name cannot be reflected back
  // in the NOT_FOUND error envelope.
  const ctrlCheck = rejectControlChars(skillName, "skill");
  if (!ctrlCheck.ok) {
    return invalidArgs(ctrlCheck.message, ["mktg list --json to see available skills"], DOCS.skills);
  }
  const idCheck = validateResourceId(skillName, "skill");
  if (!idCheck.ok) {
    return invalidArgs(idCheck.message, ["mktg list --json to see available skills"], DOCS.skills);
  }

  const manifest = await resolveManifest(flags.cwd);
  const resolved = getSkill(manifest, skillName);
  if (!resolved) {
    return notFound(`Skill '${skillName}'`, [
      "mktg list --json to see all available skills",
      "Check spelling — redirects are followed automatically",
    ], DOCS.skills);
  }

  // Check prerequisites (skills, brand files, envs, tools, catalogs).
  // Default: warn but don't block — progressive enhancement.
  // --strict: any unsatisfied prerequisite is a hard dependency failure.
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
  if (strict && !prerequisites.satisfied) {
    return err("DEPENDENCY_MISSING", `Prerequisites not satisfied for '${resolved.name}' (--strict)`, [
      ...prerequisites.remediation,
      "Run without --strict to load anyway (progressive enhancement)",
    ], 3);
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

  // One-shot activation envelope: compile brand context for this skill.
  // Declared manifest reads win; layer matrix is the fallback. Template
  // files are excluded but named in templatesSkipped — nothing is silent.
  let context: ActivationContext | null = null;
  if (withContext) {
    const manifestEntry = manifest.skills[resolved.name]!;
    const selection = filesForSkillActivation(manifestEntry);
    const compiled = await compileBrandContext(flags.cwd, {
      ...(selection.files ? { files: selection.files } : {}),
      ...(budget !== undefined ? { budget } : {}),
      excludeTemplates: true,
    });
    context = {
      layer: selection.layer,
      files: compiled.files,
      tokenEstimate: compiled.tokenEstimate,
      budgetDropped: compiled.budgetDropped,
      templatesSkipped: compiled.templatesSkipped,
    };
    if (ndjson) {
      writeStderr(JSON.stringify({
        type: "context",
        data: { skill: resolved.name, layer: context.layer, files: Object.keys(compiled.files), tokenEstimate: compiled.tokenEstimate, budgetDropped: compiled.budgetDropped, templatesSkipped: compiled.templatesSkipped },
      }));
    }
  }

  // Surface prior run context — agent sees usage history with every load
  const lastRun = await getLastRun(flags.cwd, resolved.name);
  const priorHistory = await getRunHistory(flags.cwd, resolved.name, 10000);
  const priorRuns: PriorRunContext = {
    lastRun: lastRun?.timestamp ?? null,
    lastEvent: lastRun ? (isCompletedRecord(lastRun) ? "completed" : "loaded") : null,
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

  // Log the event (unless dry-run). A bare run is a LOAD — never an outcome.
  // Completions carry the explicit result + validated writes.
  const event = wantComplete ? "completed" : "loaded";
  const outcome: RunOutcome | null = wantComplete ? (resultArg ?? "success") : null;
  if (!flags.dryRun) {
    await logRun(flags.cwd, {
      skill: resolved.name,
      timestamp: now,
      event,
      ...(wantComplete ? { result: outcome ?? "success", writes: validatedWrites } : {}),
      brandFilesChanged: learningAppended ? ["learnings.md"] : [],
    });
  }

  const result: RunResult = {
    skill: resolved.name,
    content,
    prerequisites,
    loggedAt: flags.dryRun ? null : now,
    event,
    result: outcome,
    writes: wantComplete ? validatedWrites : null,
    context,
    priorRuns,
    learningAppended,
  };

  if (ndjson) {
    writeStderr(JSON.stringify({ type: "complete", data: { skill: resolved.name, event, ...(outcome ? { result: outcome } : {}) } }));
  }

  return ok(result);
};
