// mktg init — Detect project, scaffold brand/, install skills
// Non-TTY never prompts. Agent-first.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandResult } from "../types";
import { scaffoldBrand } from "../core/brand";
import { loadManifest, installSkills, getSkillNames } from "../core/skills";
import { missingInput, invalidArgs } from "../core/errors";
import { isTTY, writeStderr, green, bold, dim, yellow } from "../core/output";
import { handler as doctorHandler } from "./doctor";

type InitResult = {
  readonly brand: { created: string[]; skipped: string[] };
  readonly skills: { installed: string[]; skipped: string[]; failed: string[] };
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
  let yes = false;
  let jsonInput: string | undefined;

  for (const arg of args) {
    if (arg === "--skip-brand") skipBrand = true;
    else if (arg === "--skip-skills") skipSkills = true;
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

  return { skipBrand, skipSkills, yes, jsonInput };
};

// Detect project info from the working directory
const detectProject = async (cwd: string): Promise<{ name: string; hasPackageJson: boolean; hasReadme: boolean; hasBrand: boolean }> => {
  const pkgFile = Bun.file(join(cwd, "package.json"));
  const readmeFile = Bun.file(join(cwd, "README.md"));
  const brandDir = Bun.file(join(cwd, "brand"));

  const [hasPackageJson, hasReadme, hasBrand] = await Promise.all([
    pkgFile.exists(),
    readmeFile.exists(),
    brandDir.exists(),
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
    try {
      const parsed = JSON.parse(flags.jsonInput) as InitInput;
      return ok(parsed);
    } catch {
      return invalidArgs("Invalid JSON input for init");
    }
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

  const totalSteps = (initFlags.skipBrand ? 0 : 1) + (initFlags.skipSkills ? 0 : 1) + 1;
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
      skillsResult = await installSkills(manifest, flags.dryRun);
      if (isTTY() && !flags.json) {
        const total = skillsResult.installed.length;
        writeStderr(`  ${green("✓")} ${total} skills installed to ~/.claude/skills/`);
        if (skillsResult.skipped.length > 0) {
          writeStderr(`  ${dim(`${skillsResult.skipped.length} skills not yet bundled (skipped)`)}`);
        }
      }
    } catch (e) {
      if (isTTY() && !flags.json) {
        writeStderr(`  ${yellow("●")} Could not install skills: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  }

  // Step 3: Run doctor
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
    doctor: { passed: doctorPassed },
    project: { name: projectName, goal },
  });
};
