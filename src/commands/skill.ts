// mktg skill — Skill lifecycle management
import { type CommandHandler, type CommandSchema, type CommandResult, ok } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notFound } from "../core/errors";
import { resolveManifest, loadManifest } from "../core/skills";
import {
  getSkillInfo,
  validateSkill as validateSkillContent,
  buildGraph,
  checkPrerequisites,
  registerSkill,
  unregisterSkill,
  evaluateSkill as evaluateSkillContent,
} from "../core/skill-lifecycle";
import { logRun, getRunHistory, getRunSummary } from "../core/run-log";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const SUBCOMMANDS = {
  info: "Show skill metadata, dependencies, and install status",
  validate: "Validate a SKILL.md file against platform and mktg specs",
  graph: "Show skill dependency graph as DAG",
  check: "Check if skill prerequisites are satisfied",
  register: "Register a new skill in the project manifest",
  evaluate: "Analyze a skill for overlap, novelty, and graph fit",
  unregister: "Remove a skill from the project manifest",
  history: "Show skill execution history",
  log: "Record a skill execution (for agent use)",
} as const;

export const schema: CommandSchema = {
  name: "skill",
  description: "Skill lifecycle management — inspect, validate, and extend skills",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: [
    {
      name: "info",
      description: "Show skill metadata, dependencies, and install status",
      flags: [],
      positional: { name: "name", description: "Skill name (follows redirects)", required: true },
      output: {
        name: "string — resolved skill name",
        description: "string — skill description from SKILL.md",
        category: "string — skill category",
        layer: "string — skill layer",
        dependsOn: "string[] — direct dependencies",
        dependedOnBy: "string[] — reverse dependencies (skills that depend on this)",
        installed: "boolean — whether skill is installed",
      },
      examples: [
        { args: "mktg skill info seo-content --json", description: "Get full skill metadata" },
        { args: "mktg skill info copywriting --json", description: "Follows redirect to direct-response-copy" },
      ],
    },
    {
      name: "validate",
      description: "Validate a SKILL.md file against platform and mktg specs",
      flags: [],
      positional: { name: "path", description: "Path to SKILL.md file or directory", required: true },
      output: {
        valid: "boolean — overall validation result",
        checks: "array — individual validation checks with rule, pass, detail",
        errors: "string[] — validation errors",
        warnings: "string[] — validation warnings",
      },
      examples: [
        { args: "mktg skill validate ./my-skill/SKILL.md --json", description: "Validate a skill file" },
      ],
    },
    {
      name: "graph",
      description: "Show skill dependency graph as DAG",
      flags: [],
      output: {
        nodes: "array — all skills with category, layer, tier, dependsOn",
        edges: "array — dependency edges {from, to}",
        roots: "string[] — skills with no dependencies",
        leaves: "string[] — skills nothing depends on",
        layers: "object — skills grouped by layer",
        order: "string[] — topological sort order",
        hasCycles: "boolean — whether cycles were detected",
      },
      examples: [
        { args: "mktg skill graph --json", description: "Full dependency graph" },
      ],
    },
    {
      name: "check",
      description: "Check if skill prerequisites are satisfied",
      flags: [],
      positional: { name: "name", description: "Skill name to check", required: true },
      output: {
        satisfied: "boolean — all prerequisites met",
        "missing.skills": "string[] — uninstalled dependency skills",
        "missing.brandFiles": "string[] — missing or template brand files",
        remediation: "string[] — actionable steps to satisfy prerequisites",
      },
      examples: [
        { args: "mktg skill check seo-content --json", description: "Check if seo-content can run" },
      ],
    },
    {
      name: "register",
      description: "Register a new skill in the project manifest",
      flags: [],
      positional: { name: "path", description: "Path to SKILL.md file or directory", required: true },
      output: {
        name: "string — registered skill name",
        action: "string — 'created' or 'exists'",
        manifestPath: "string — path to project manifest",
      },
      examples: [
        { args: "mktg skill register ./my-skill --json", description: "Register a custom skill" },
      ],
    },
    {
      name: "evaluate",
      description: "Analyze a skill for overlap with existing skills, novelty, and where it fits in the graph",
      flags: [],
      positional: { name: "path", description: "Path to SKILL.md file or directory", required: true },
      output: {
        name: "string — skill name from frontmatter",
        description: "string — skill description",
        "validation.valid": "boolean — passes structural validation",
        "overlap.bySkill": "array — existing skills with trigger overlap, sorted by overlap%",
        "overlap.highestOverlap": "number — highest trigger overlap percentage (0-100)",
        "overlap.categoryMatches": "string[] — existing skills in the same category",
        "novelty.uniqueTriggers": "string[] — triggers no existing skill covers",
        "novelty.coversNewCategory": "boolean — true if this skill's category has no existing skills",
        "graphPosition.wouldDependOn": "string[] — skills this would depend on (they write files this reads)",
        "graphPosition.wouldBeDepOf": "string[] — skills that would depend on this (they read files this writes)",
      },
      examples: [
        { args: "mktg skill evaluate ./new-skill --json", description: "Full overlap and novelty analysis" },
      ],
    },
    {
      name: "unregister",
      description: "Remove a skill from the project manifest",
      flags: [],
      positional: { name: "name", description: "Skill name to remove", required: true },
      output: {
        name: "string — removed skill name",
        action: "string — 'removed'",
        manifestPath: "string — path to project manifest",
      },
      examples: [
        { args: "mktg skill unregister my-skill --json", description: "Remove a project-registered skill" },
      ],
    },
    {
      name: "history",
      description: "Show skill execution history",
      flags: [],
      positional: { name: "name", description: "Skill name (optional — omit for all)", required: false },
      output: {
        history: "array — run records, most recent first",
        summary: "object — per-skill last run info (when no name filter)",
        total: "number — total records returned",
      },
      examples: [
        { args: "mktg skill history --json", description: "All recent skill runs" },
        { args: "mktg skill history brand-voice --json", description: "History for a specific skill" },
      ],
    },
    {
      name: "log",
      description: "Record a skill execution (for agent use)",
      flags: [],
      positional: { name: "name", description: "Skill name that was executed", required: true },
      output: {
        skill: "string — skill name",
        timestamp: "string — ISO 8601 timestamp",
        result: "string — success, partial, or failed",
        brandFilesChanged: "string[] — brand files modified",
      },
      examples: [
        { args: "mktg skill log brand-voice --json", description: "Record a successful run" },
        { args: "mktg skill log seo-content failed --json", description: "Record a failed run" },
      ],
    },
  ],
  output: {},
  examples: [
    { args: "mktg skill info seo-content --json", description: "Get skill metadata" },
    { args: "mktg skill check seo-content --json", description: "Check prerequisites" },
    { args: "mktg skill graph --json", description: "Show dependency graph" },
    { args: "mktg skill validate ./skill --json", description: "Validate a SKILL.md" },
    { args: "mktg skill register ./skill --json", description: "Register a new skill" },
    { args: "mktg skill evaluate ./skill --json", description: "Analyze overlap and novelty" },
    { args: "mktg skill unregister my-skill --json", description: "Remove a project-registered skill" },
    { args: "mktg skill history --json", description: "Show execution history" },
    { args: "mktg skill log brand-voice --json", description: "Record a skill run" },
  ],
  vocabulary: ["skill", "validate skill", "skill dependencies", "skill graph", "skill info", "register skill", "check skill", "evaluate skill", "skill overlap", "skill novelty", "unregister skill", "skill history", "skill log"],
};

// --- Subcommand handlers ---

const handleInfo = async (args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const name = args[0];
  if (!name) return invalidArgs("Missing skill name", ["Usage: mktg skill info <name>"]);

  const manifest = await resolveManifest(flags.cwd);
  const info = await getSkillInfo(name, manifest);
  if (!info) return notFound(`Skill '${name}'`, [
    "mktg list --json to see all available skills",
    "Check spelling — redirects are followed automatically",
  ]);

  return ok(info);
};

const handleValidate = async (args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const path = args[0];
  if (!path) return invalidArgs("Missing path to SKILL.md", ["Usage: mktg skill validate <path>"]);

  // Resolve path
  const fullPath = path.startsWith("/") ? path : join(flags.cwd, path);
  const skillMdPath = fullPath.endsWith("SKILL.md") ? fullPath : join(fullPath, "SKILL.md");

  // Check file exists and size
  try {
    const fileStat = await stat(skillMdPath);
    if (fileStat.size > 256 * 1024) {
      return invalidArgs("SKILL.md exceeds 256KB size limit", []);
    }
  } catch {
    return notFound(`File '${skillMdPath}'`, ["Provide a path to a SKILL.md file or its parent directory"]);
  }

  const content = await readFile(skillMdPath, "utf-8");
  const manifest = await resolveManifest(flags.cwd);
  const result = validateSkillContent(content, manifest);

  return ok(result);
};

const handleGraph = async (_args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const manifest = await resolveManifest(flags.cwd);
  const graph = buildGraph(manifest);
  return ok(graph);
};

const handleCheck = async (args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const name = args[0];
  if (!name) return invalidArgs("Missing skill name", ["Usage: mktg skill check <name>"]);

  const manifest = await resolveManifest(flags.cwd);

  // Follow redirects
  const resolved = manifest.redirects[name] ?? name;
  if (!manifest.skills[resolved]) {
    return notFound(`Skill '${name}'`, [
      "mktg list --json to see all available skills",
    ]);
  }

  const status = await checkPrerequisites(resolved, flags.cwd, manifest);
  return ok(status);
};

const handleRegister = async (args: readonly string[], flags: { cwd: string; dryRun: boolean }): Promise<CommandResult> => {
  const path = args[0];
  if (!path) return invalidArgs("Missing path to SKILL.md", ["Usage: mktg skill register <path>"]);

  const manifest = await resolveManifest(flags.cwd);

  if (flags.dryRun) {
    // Read and validate the skill to show what would be registered
    const fullPath = path.startsWith("/") ? path : join(flags.cwd, path);
    const skillMdPath = fullPath.endsWith("SKILL.md") ? fullPath : join(fullPath, "SKILL.md");
    try {
      const content = await readFile(skillMdPath, "utf-8");
      const validated = validateSkillContent(content, manifest);
      return ok({ name: validated.valid ? "(valid, would register)" : "(invalid, would fail)", action: "dry-run", manifestPath: join(flags.cwd, "skills-manifest.json"), validation: validated });
    } catch {
      return ok({ name: "(dry-run)", action: "dry-run", manifestPath: join(flags.cwd, "skills-manifest.json"), validation: null });
    }
  }

  const result = await registerSkill(path, flags.cwd, manifest);

  if ("error" in result) {
    return invalidArgs(result.error, ["Check the SKILL.md file format and path"]);
  }

  return ok(result);
};

const handleEvaluate = async (args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const path = args[0];
  if (!path) return invalidArgs("Missing path to SKILL.md", ["Usage: mktg skill evaluate <path>"]);

  const fullPath = path.startsWith("/") ? path : join(flags.cwd, path);
  const skillMdPath = fullPath.endsWith("SKILL.md") ? fullPath : join(fullPath, "SKILL.md");

  try {
    const fileStat = await stat(skillMdPath);
    if (fileStat.size > 256 * 1024) {
      return invalidArgs("SKILL.md exceeds 256KB size limit", []);
    }
  } catch {
    return notFound(`File '${skillMdPath}'`, ["Provide a path to a SKILL.md file or its parent directory"]);
  }

  const content = await readFile(skillMdPath, "utf-8");
  const manifest = await resolveManifest(flags.cwd);
  const result = evaluateSkillContent(content, manifest);

  if ("error" in result) {
    return invalidArgs(result.error, ["Check the SKILL.md frontmatter format"]);
  }

  return ok(result);
};

const handleUnregister = async (args: readonly string[], flags: { cwd: string; dryRun: boolean }): Promise<CommandResult> => {
  const name = args.find(a => !a.startsWith("--"));
  const confirm = args.includes("--confirm");
  if (!name) return invalidArgs("Missing skill name", ["Usage: mktg skill unregister <name> --confirm"]);

  if (flags.dryRun) {
    return ok({ name, action: "would-remove", manifestPath: join(flags.cwd, "skills-manifest.json") });
  }

  // Destructive: require --confirm
  if (!confirm) {
    return invalidArgs(`skill unregister removes '${name}' from the project manifest — pass --confirm to proceed`, [
      `mktg skill unregister ${name} --confirm`,
      `mktg skill unregister ${name} --dry-run`,
    ]);
  }

  const packageManifest = await loadManifest();
  const result = await unregisterSkill(name, flags.cwd, packageManifest);

  if ("error" in result) {
    return invalidArgs(result.error, ["mktg list --json to see registered skills"]);
  }

  return ok(result);
};

const handleHistory = async (args: readonly string[], flags: { cwd: string }): Promise<CommandResult> => {
  const name = args[0]; // optional
  const history = await getRunHistory(flags.cwd, name);
  const summary = name ? undefined : await getRunSummary(flags.cwd);
  return ok({ history, ...(summary && { summary }), total: history.length });
};

const handleLog = async (args: readonly string[], flags: { cwd: string; dryRun: boolean }): Promise<CommandResult> => {
  const name = args[0];
  if (!name) return invalidArgs("Missing skill name", ["Usage: mktg skill log <name> [success|partial|failed]"]);

  const VALID_RESULTS = ["success", "partial", "failed"] as const;
  const resultArg = (args[1] && VALID_RESULTS.includes(args[1] as typeof VALID_RESULTS[number]))
    ? args[1] as typeof VALID_RESULTS[number]
    : "success";

  const record = {
    skill: name,
    timestamp: new Date().toISOString(),
    result: resultArg as "success" | "partial" | "failed",
    brandFilesChanged: [] as string[],
  };

  if (!flags.dryRun) await logRun(flags.cwd, record);
  return ok(record);
};

// --- Main handler ---

export const handler: CommandHandler = async (args, flags) => {
  const subcommand = args.filter(a => !a.startsWith("--"))[0];
  if (!subcommand) {
    return invalidArgs("Missing subcommand", [
      `Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`,
      "Usage: mktg skill <subcommand> [args]",
    ]);
  }
  if (!isKeyOf(SUBCOMMANDS, subcommand)) {
    return invalidArgs(`Unknown subcommand: skill ${subcommand}`, [
      ...Object.keys(SUBCOMMANDS).map(s => `mktg skill ${s}`),
    ]);
  }

  // Pass all args after the subcommand name (including --flags like --confirm)
  const subcommandIndex = args.indexOf(subcommand);
  const subArgs = subcommandIndex >= 0 ? args.slice(subcommandIndex + 1) : args.filter(a => a !== subcommand);

  switch (subcommand) {
    case "info": return handleInfo(subArgs, flags);
    case "validate": return handleValidate(subArgs, flags);
    case "graph": return handleGraph(subArgs, flags);
    case "check": return handleCheck(subArgs, flags);
    case "register": return handleRegister(subArgs, flags);
    case "evaluate": return handleEvaluate(subArgs, flags);
    case "unregister": return handleUnregister(subArgs, flags);
    case "history": return handleHistory(subArgs, flags);
    case "log": return handleLog(subArgs, flags);
    default: return invalidArgs(`Unknown subcommand: skill ${subcommand}`, []);
  }
};
