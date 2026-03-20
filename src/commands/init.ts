// mktg init — Detect project, scaffold brand/, install skills
// Non-TTY never prompts. Agent-first.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import { scaffoldBrand } from "../core/brand";
import { loadManifest, installSkills, getSkillNames } from "../core/skills";
import { loadAgentManifest, installAgents } from "../core/agents";
import { missingInput, invalidArgs, parseJsonInput } from "../core/errors";
import { isTTY, writeStderr, green, bold, dim, yellow } from "../core/output";
import { handler as doctorHandler } from "./doctor";

export const schema: CommandSchema = {
  name: "init",
  description: "Detect project, scaffold brand/, install skills and agents",
  flags: [
    { name: "--skip-brand", type: "boolean", required: false, description: "Skip brand/ scaffolding" },
    { name: "--skip-skills", type: "boolean", required: false, description: "Skip skill installation" },
    { name: "--skip-agents", type: "boolean", required: false, description: "Skip agent installation" },
    { name: "--yes", type: "boolean", required: false, description: "Accept defaults without prompting" },
    { name: "--json", type: "string", required: false, description: "JSON input for non-interactive mode" },
  ],
  output: {
    "project.name": "string — detected project name",
    "brand.created": "string[] — brand files created",
    "skills.installed": "string[] — skills installed",
    "agents.installed": "string[] — agents installed",
    "doctor.passed": "boolean — health check result",
  },
  examples: [
    { args: "mktg init --yes", description: "Init with defaults" },
    { args: "mktg init --json '{\"business\":\"SaaS\",\"goal\":\"launch\"}'", description: "Non-interactive init" },
  ],
  vocabulary: ["init", "setup", "initialize", "get started"],
};

type InitResult = {
  readonly brand: { created: string[]; skipped: string[] };
  readonly skills: { installed: string[]; skipped: string[]; failed: string[] };
  readonly agents: { installed: string[]; skipped: string[]; failed: string[] };
  readonly doctor: { passed: boolean };
  readonly project: { name: string; goal: string };
};

type InitInput = {
  readonly business?: string;
  readonly goal?: string;
};

// Parse init-specific flags from args
const parseInitFlags = (args: readonly string[]) => {
  let skipBrand = false;
  let skipSkills = false;
  let skipAgents = false;
  let yes = false;
  let jsonInput: string | undefined;

  for (const arg of args) {
    if (arg === "--skip-brand") skipBrand = true;
    else if (arg === "--skip-skills") skipSkills = true;
    else if (arg === "--skip-agents") skipAgents = true;
    else if (arg === "--yes" || arg === "-y") yes = true;
    else if (arg.startsWith("--json=")) jsonInput = arg.slice(7);
    else if (!arg.startsWith("--")) jsonInput ??= arg;
  }

  // Handle --json 'value' pattern (next positional after --json flag)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json" && args[i + 1] && !args[i + 1]!.startsWith("--")) {
      jsonInput = args[i + 1];
    }
  }

  return { skipBrand, skipSkills, skipAgents, yes, jsonInput };
};

// Detect project info from the working directory
const detectProject = async (cwd: string): Promise<{ name: string; hasPackageJson: boolean; hasReadme: boolean; hasBrand: boolean }> => {
  const pkgFile = Bun.file(join(cwd, "package.json"));
  const readmeFile = Bun.file(join(cwd, "README.md"));

  // Use stat().isDirectory() for brand/ — Bun.file() is unreliable for directories
  const checkBrandDir = async (): Promise<boolean> => {
    try {
      const { stat } = await import("node:fs/promises");
      const s = await stat(join(cwd, "brand"));
      return s.isDirectory();
    } catch {
      return false;
    }
  };

  const [hasPackageJson, hasReadme, hasBrand] = await Promise.all([
    pkgFile.exists(),
    readmeFile.exists(),
    checkBrandDir(),
  ]);

  let name = cwd.split("/").pop() ?? "project";
  if (hasPackageJson) {
    try {
      const pkg = await pkgFile.json();
      if (pkg.name) name = pkg.name;
    } catch { /* invalid package.json */ }
  }

  return { name, hasPackageJson, hasReadme, hasBrand };
};

// Get input from TTY (interactive) or JSON (non-interactive)
const getInput = async (
  args: readonly string[],
  flags: ReturnType<typeof parseInitFlags>,
  projectName: string,
): Promise<CommandResult<InitInput>> => {
  // JSON input from flag
  if (flags.jsonInput) {
    const parsed = parseJsonInput<InitInput>(flags.jsonInput);
    if (!parsed.ok) return invalidArgs(parsed.message);
    return ok(parsed.data);
  }

  // --yes mode: use defaults
  if (flags.yes) {
    return ok({ business: projectName, goal: "launch" });
  }

  // Non-TTY without JSON input: emit error with example
  if (!isTTY()) {
    return missingInput('{"business":"My App","goal":"launch"}');
  }

  // TTY: interactive two-question onboarding
  const readline = await import("node:readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  const ask = (question: string, defaultVal: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(`  ${question} ${dim(`[${defaultVal}]`)} `, (answer) => {
        resolve(answer.trim() || defaultVal);
      });
    });

  writeStderr("");
  const business = await ask("What's the business/project?", projectName);
  const goal = await ask("Primary marketing goal?", "launch");
  rl.close();
  writeStderr("");

  return ok({ business, goal });
};

export const handler: CommandHandler<InitResult> = async (args, flags) => {
  const initFlags = parseInitFlags(args);
  const cwd = flags.cwd;

  // Step 0: Detect project
  const project = await detectProject(cwd);

  // Get user input
  const inputResult = await getInput(args, initFlags, project.name);
  if (!inputResult.ok) return inputResult;
  const input = inputResult.data;
  const projectName = input.business ?? project.name;
  const goal = input.goal ?? "launch";

  const totalSteps = (initFlags.skipBrand ? 0 : 1) + (initFlags.skipSkills ? 0 : 1) + (initFlags.skipAgents ? 0 : 1) + 1;
  let step = 0;

  const stepLabel = () => {
    step++;
    return isTTY() ? bold(`[${step}/${totalSteps}]`) : `[${step}/${totalSteps}]`;
  };

  // Step 1: Scaffold brand/
  let brandResult = { created: [] as string[], skipped: [] as string[] };
  if (!initFlags.skipBrand) {
    if (isTTY() && !flags.json) {
      writeStderr(`${stepLabel()} Scaffolding brand/ directory...`);
    }
    brandResult = await scaffoldBrand(cwd, flags.dryRun);
    if (isTTY() && !flags.json) {
      if (brandResult.created.length > 0) {
        writeStderr(`  ${green("✓")} Created ${brandResult.created.length} brand files`);
      } else {
        writeStderr(`  ${yellow("●")} brand/ already exists (${brandResult.skipped.length} files skipped)`);
      }
    }
  }

  // Step 2: Install skills
  let skillsResult = { installed: [] as string[], skipped: [] as string[], failed: [] as string[] };
  if (!initFlags.skipSkills) {
    if (isTTY() && !flags.json) {
      writeStderr(`${stepLabel()} Installing marketing skills...`);
    }
    try {
      const manifest = await loadManifest();
      skillsResult = await installSkills(manifest, flags.dryRun, flags.cwd);
      if (isTTY() && !flags.json) {
        const total = skillsResult.installed.length;
        writeStderr(`  ${green("✓")} ${total} skills installed to ~/.claude/skills/`);
        if (skillsResult.skipped.length > 0) {
          writeStderr(`  ${dim(`${skillsResult.skipped.length} skills not yet bundled (skipped)`)}`);
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "unknown error";
      skillsResult.failed.push(`_error:${errorMsg}`);
      if (isTTY() && !flags.json) {
        writeStderr(`  ${yellow("●")} Could not install skills: ${errorMsg}`);
      }
    }
  }

  // Step 3: Install agents
  let agentsResult = { installed: [] as string[], skipped: [] as string[], failed: [] as string[] };
  if (!initFlags.skipAgents) {
    if (isTTY() && !flags.json) {
      writeStderr(`${stepLabel()} Installing marketing agents...`);
    }
    try {
      const agentManifest = await loadAgentManifest();
      agentsResult = await installAgents(agentManifest, flags.dryRun);
      if (isTTY() && !flags.json) {
        const total = agentsResult.installed.length;
        writeStderr(`  ${green("✓")} ${total} agents installed to ~/.claude/agents/`);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "unknown error";
      agentsResult.failed.push(`_error:${errorMsg}`);
      if (isTTY() && !flags.json) {
        writeStderr(`  ${yellow("●")} Could not install agents: ${errorMsg}`);
      }
    }
  }

  // Step 4: Run doctor
  if (isTTY() && !flags.json) {
    writeStderr(`${stepLabel()} Running health check...`);
  }
  const doctorResult = await doctorHandler([], flags);
  const doctorPassed = doctorResult.ok && doctorResult.data.passed;
  if (isTTY() && !flags.json) {
    if (doctorPassed) {
      writeStderr(`  ${green("✓")} All checks pass`);
    } else {
      writeStderr(`  ${yellow("●")} Some checks need attention (run ${dim("mktg doctor")} for details)`);
    }
    writeStderr("");
    writeStderr(`  ${green(bold("Ready!"))} Run ${dim("/cmo")} to start marketing ${bold(projectName)}`);
    writeStderr("");
  }

  return ok({
    brand: brandResult,
    skills: skillsResult,
    agents: agentsResult,
    doctor: { passed: doctorPassed },
    project: { name: projectName, goal },
  });
};
