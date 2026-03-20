// mktg init — Detect project, scaffold brand/, install skills
// Non-TTY never prompts. Agent-first.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema, type BrandFile } from "../types";
import { scaffoldBrand, BRAND_TEMPLATES } from "../core/brand";
import { loadManifest, installSkills, getSkillNames } from "../core/skills";
import { loadAgentManifest, installAgents } from "../core/agents";
import { missingInput, invalidArgs, parseJsonInput, rejectControlChars } from "../core/errors";
import { isTTY, writeStderr, green, bold, dim, yellow } from "../core/output";
import { handler as doctorHandler } from "./doctor";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

export const schema: CommandSchema = {
  name: "init",
  description: "Detect project, scaffold brand/, install skills and agents",
  flags: [
    { name: "--from", type: "string", required: false, description: "URL to scrape for brand data — auto-populates brand/ files from website content" },
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
  let fromUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--skip-brand") skipBrand = true;
    else if (arg === "--skip-skills") skipSkills = true;
    else if (arg === "--skip-agents") skipAgents = true;
    else if (arg === "--yes" || arg === "-y") yes = true;
    else if (arg.startsWith("--json=")) jsonInput = arg.slice(7);
    else if (arg === "--from" && args[i + 1]) { fromUrl = args[i + 1]; i++; }
    else if (arg.startsWith("--from=")) fromUrl = arg.slice(7);
    else if (!arg.startsWith("--")) jsonInput ??= arg;
  }

  // Handle --json 'value' pattern (next positional after --json flag)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json" && args[i + 1] && !args[i + 1]!.startsWith("--")) {
      jsonInput = args[i + 1];
    }
  }

  return { skipBrand, skipSkills, skipAgents, yes, jsonInput, fromUrl };
};

// Fetch URL and extract brand signals
type ScrapedBrand = {
  readonly title: string;
  readonly description: string;
  readonly headings: readonly string[];
  readonly url: string;
};

const scrapeUrl = async (url: string): Promise<ScrapedBrand | null> => {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "mktg-cli/1.0 (brand-research)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
      ?? html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const description = descMatch?.[1]?.trim() ?? "";

    // Extract headings (h1-h3)
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    const headings: string[] = [];
    let match;
    while ((match = headingRegex.exec(html)) !== null && headings.length < 10) {
      const text = match[1]!.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
      if (text.length > 2 && text.length < 200) headings.push(text);
    }

    return { title, description, headings, url };
  } catch {
    return null;
  }
};

// Populate brand files from scraped data
const populateFromScrape = async (
  cwd: string,
  scraped: ScrapedBrand,
  dryRun: boolean,
): Promise<string[]> => {
  const brandDir = join(cwd, "brand");
  if (!dryRun) await mkdir(brandDir, { recursive: true });
  const populated: string[] = [];

  const headingBlock = scraped.headings.length > 0
    ? scraped.headings.map(h => `- ${h}`).join("\n")
    : "- (no headings extracted)";

  const files: Partial<Record<BrandFile, string>> = {
    "voice-profile.md": `# Brand Voice Profile\n\n<!-- Auto-populated from ${scraped.url} by mktg init --from -->\n\n## Voice DNA\n\n- **Tone:** (analyze from website copy)\n- **Personality:** ${scraped.title || "(extracted from site)"}\n- **Vocabulary:** (extract key terms from site)\n\n## Source Material\n\n- **Title:** ${scraped.title}\n- **Description:** ${scraped.description}\n- **Key headings:**\n${headingBlock}\n\n## Do / Don't\n\n| Do | Don't |\n|----|-------|\n| (derive from source material) | (derive from source material) |\n`,
    "positioning.md": `# Positioning & Angles\n\n<!-- Auto-populated from ${scraped.url} by mktg init --from -->\n\n## Core Positioning\n\n- **Category:** (derive from: ${scraped.title})\n- **For:** (derive from site content)\n- **Unlike:** (research competitors)\n- **We:** ${scraped.description || "(derive from site)"}\n\n## Key Messages from Site\n\n${headingBlock}\n`,
    "audience.md": `# Audience Research\n\n<!-- Auto-populated from ${scraped.url} by mktg init --from -->\n\n## Primary Audience\n\n- **Who:** (derive from site content and positioning)\n- **Pain points:** (derive from headings: ${scraped.headings.slice(0, 3).join(", ")})\n- **Current solution:** (research needed)\n- **Trigger to buy:** (research needed)\n\n## Source URL\n\n${scraped.url}\n`,
    "competitors.md": `# Competitive Intelligence\n\n<!-- Auto-populated from ${scraped.url} by mktg init --from -->\n<!-- Run /competitive-intel to fill in with real research -->\n\n## Our Product\n\n- **Name:** ${scraped.title}\n- **Pitch:** ${scraped.description}\n- **URL:** ${scraped.url}\n\n## Competitors\n\n### 1. (research needed)\n- **Positioning:**\n- **Pricing:**\n- **Weakness:**\n`,
  };

  const writes: Promise<void>[] = [];
  for (const [file, content] of Object.entries(files)) {
    populated.push(file);
    if (!dryRun) {
      writes.push(Bun.write(join(brandDir, file), content).then(() => {}));
    }
  }
  await Promise.all(writes);
  return populated;
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

  // Handle --from URL scraping
  let scrapeResult: { populated: string[]; scraped: ScrapedBrand } | null = null;
  if (initFlags.fromUrl) {
    const urlCheck = rejectControlChars(initFlags.fromUrl, "URL");
    if (!urlCheck.ok) return invalidArgs(urlCheck.message);
    if (isTTY() && !flags.json) {
      writeStderr(`  Fetching ${initFlags.fromUrl}...`);
    }
    const scraped = await scrapeUrl(initFlags.fromUrl);
    if (scraped) {
      const populated = await populateFromScrape(cwd, scraped, flags.dryRun);
      scrapeResult = { populated, scraped };
      if (isTTY() && !flags.json) {
        writeStderr(`  ${green("✓")} Extracted brand signals from ${scraped.title || initFlags.fromUrl}`);
        writeStderr(`  ${dim(`Populated ${populated.length} brand files with site data`)}`);
      }
    } else {
      if (isTTY() && !flags.json) {
        writeStderr(`  ${yellow("●")} Could not fetch URL — falling back to templates`);
      }
    }
  }

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
    ...(scrapeResult && {
      scraped: {
        url: scrapeResult.scraped.url,
        title: scrapeResult.scraped.title,
        description: scrapeResult.scraped.description,
        headingsFound: scrapeResult.scraped.headings.length,
        filesPopulated: scrapeResult.populated,
      },
    }),
  });
};
