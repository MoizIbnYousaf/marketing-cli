// mktg init — Detect project, scaffold brand/, install skills
// Non-TTY never prompts. Agent-first.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema, type BrandFile } from "../types";
import { scaffoldBrand, BRAND_TEMPLATES } from "../core/brand";
import { loadManifest, installSkills, installSkillsWithAiAgentSkills } from "../core/skills";
import { loadAgentManifest, installAgents } from "../core/agents";
import { invalidArgs, parseJsonInput, rejectControlChars } from "../core/errors";
import { validatePublicUrl, fetchWithSizeCap } from "../core/url-validation";
import { isTTY, writeStderr, green, bold, dim, yellow } from "../core/output";
import { handler as doctorHandler } from "./doctor";
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
  readonly doctor: { passed: boolean; checks?: readonly any[] };
  readonly setup: {
    ready: boolean;
    integrations: {
      configured: string[];
      missing: { envVar: string; detail: string; docsUrl: string | null; required: boolean }[];
    };
    clis: {
      installed: string[];
      missing: { name: string; install: string | null; required: boolean }[];
    };
    brandTemplateCount: number;
    nextSteps: string[];
  };
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
  // Task #23 fixes 2 + 5: validatePublicUrl blocks SSRF targets (localhost,
  // 169.254.169.254 IMDS, private ranges), fetchWithSizeCap streams the body
  // with a 10 MB hard cap and a 30s timeout so a hostile host can't OOM the
  // CLI or wedge init indefinitely.
  const validated = validatePublicUrl(url);
  if (!validated.ok) {
    writeStderr(`warning: --from URL rejected: ${validated.message}`);
    return null;
  }
  try {
    const result = await fetchWithSizeCap(validated.url, {
      timeoutMs: 10_000,
      headers: { "User-Agent": "mktg-cli/1.0 (brand-research)" },
    });
    if (!result.ok) {
      writeStderr(`warning: fetch failed: ${result.message}`);
      return null;
    }
    const html = result.text;

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

  // --yes mode OR non-TTY without JSON input: auto-derive and proceed.
  // The non-TTY path covers the README Quick Start (`npm i -g marketing-cli
  // && mktg init`) — inside a shell pipeline stdout is not a TTY, so we
  // cannot prompt. Returning MISSING_INPUT there was the biggest DX break
  // in 0.1.0: the one-line install from the README exited with a structured
  // error. Defaults resolve to the detected project name + "launch" goal;
  // the user can always override with --json after the fact.
  if (flags.yes || !isTTY()) {
    return ok({ business: projectName, goal: "launch" });
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
    if (flags.dryRun) {
      if (isTTY() && !flags.json) {
        writeStderr(`  ${dim("dry-run: would fetch")} ${initFlags.fromUrl}`);
      }
      scrapeResult = { populated: ["voice-profile.md", "positioning.md", "audience.md", "competitors.md"], scraped: { title: "(dry-run)", description: "(dry-run)", headings: [], url: initFlags.fromUrl } };
    } else {
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
    } // close else for !dryRun
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
  let brandResult = { created: [] as string[], skipped: [] as string[], schemaCreated: false };
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
      const delegated = await installSkillsWithAiAgentSkills(manifest, flags.dryRun);
      if (delegated.delegated) {
        skillsResult = {
          installed: delegated.installed,
          skipped: delegated.skipped,
          failed: delegated.failed.map(({ name, reason }) => `${name}:${reason}`),
        };
        if (isTTY() && !flags.json) {
          writeStderr(`  ${green("✓")} ${skillsResult.installed.length} skills installed via ai-agent-skills`);
        }
      } else {
        if (delegated.binary && delegated.failed.length > 0 && isTTY() && !flags.json) {
          writeStderr(`  ${yellow("●")} ai-agent-skills delegation failed — falling back to direct install`);
        }
        const installedSkills = await installSkills(manifest, flags.dryRun, flags.cwd);
        skillsResult = {
          installed: installedSkills.installed,
          skipped: installedSkills.skipped,
          failed: installedSkills.failed.map(({ name, reason }) => `${name}:${reason}`),
        };
        if (isTTY() && !flags.json) {
          const total = skillsResult.installed.length;
          writeStderr(`  ${green("✓")} ${total} skills installed to ~/.claude/skills/`);
          if (skillsResult.skipped.length > 0) {
            writeStderr(`  ${dim(`${skillsResult.skipped.length} skills not yet bundled (skipped)`)}`);
          }
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

  // Compute setup guidance from doctor results
  const computeSetup = (checks: readonly any[]) => {
    const integrationChecks = checks.filter((c: any) => c.name.startsWith("integration-"));
    const cliChecks = checks.filter((c: any) => c.name.startsWith("cli-"));
    const brandChecks = checks.filter((c: any) => c.name.startsWith("brand-"));

    const CLI_INSTALL_HINTS: Record<string, string> = {
      bun: "curl -fsSL https://bun.sh/install | bash",
      ffmpeg: "brew install ffmpeg",
      remotion: "npm i -g @remotion/cli",
      firecrawl: "npm i -g firecrawl",
      "playwright-cli": "npm i -g @playwright/cli",
      gws: "npm i -g gws",
      "whisper-cpp": "brew install whisper-cpp",
      "yt-dlp": "brew install yt-dlp",
      summarize: "npm i -g @steipete/summarize",
      gh: "brew install gh",
    };

    const INTEGRATION_DOCS: Record<string, string> = {
      TYPEFULLY_API_KEY: "https://typefully.com/settings/api",
      RESEND_API_KEY: "https://resend.com/api-keys",
      RESEND_WEBHOOK_SECRET: "https://resend.com/webhooks",
      GEMINI_API_KEY: "https://aistudio.google.com/apikey",
      FIRECRAWL_API_KEY: "https://firecrawl.dev",
      MKTG_X_AUTH_TOKEN: "https://github.com/MoizIbnYousaf/marketing-cli/blob/main/skills/mktg-x/SKILL.md",
      MKTG_X_CT0: "https://github.com/MoizIbnYousaf/marketing-cli/blob/main/skills/mktg-x/SKILL.md",
    };

    const configuredIntegrations = integrationChecks
      .filter((c: any) => c.status === "pass")
      .map((c: any) => c.name.replace("integration-", ""));

    const missingIntegrations = integrationChecks
      .filter((c: any) => c.status !== "pass")
      .map((c: any) => {
        const envVar = c.name.replace("integration-", "");
        return {
          envVar,
          detail: c.detail,
          docsUrl: INTEGRATION_DOCS[envVar] ?? null,
          required: false,
        };
      });

    const installedClis = cliChecks
      .filter((c: any) => c.status === "pass")
      .map((c: any) => c.name.replace("cli-", ""));

    const missingClis = cliChecks
      .filter((c: any) => c.status !== "pass")
      .map((c: any) => {
        const name = c.name.replace("cli-", "");
        return {
          name,
          install: CLI_INSTALL_HINTS[name] ?? null,
          required: c.status === "fail",
        };
      });

    const templateCheck = brandChecks.find((c: any) => c.name === "brand-content");
    const templateCount = templateCheck?.detail?.match(/(\d+) files still have template/)?.[1] ?? "0";

    const nextSteps: string[] = [];
    if (parseInt(templateCount) > 0) {
      nextSteps.push("Run /cmo to populate brand files with real content (or /brand-voice to start with voice)");
    }
    if (missingIntegrations.length > 0) {
      nextSteps.push(`Set up ${missingIntegrations.length} optional integration(s) for full capabilities: mktg doctor --configure`);
    }
    if (missingClis.length > 0) {
      nextSteps.push(`Install ${missingClis.length} optional CLI tool(s) for advanced features`);
    }
    if (nextSteps.length === 0) {
      nextSteps.push("You're fully configured! Run /cmo to start marketing.");
    }

    return {
      ready: missingIntegrations.filter(i => i.required).length === 0 && missingClis.filter(c => c.required).length === 0,
      integrations: { configured: configuredIntegrations, missing: missingIntegrations },
      clis: { installed: installedClis, missing: missingClis },
      brandTemplateCount: parseInt(templateCount),
      nextSteps,
    };
  };

  const checks = doctorResult.ok ? doctorResult.data.checks : [];
  const setup = computeSetup(checks);

  if (isTTY() && !flags.json) {
    if (doctorPassed) {
      writeStderr(`  ${green("✓")} All checks pass`);
    } else {
      writeStderr(`  ${yellow("●")} Some checks need attention (run ${dim("mktg doctor")} for details)`);
    }
    writeStderr("");
    writeStderr(`  ${green(bold("Ready!"))} Run ${dim("/cmo")} to start marketing ${bold(projectName)}`);
    if (setup.nextSteps.length > 0) {
      writeStderr("");
      writeStderr(`  ${dim("Next steps:")}`);
      for (const step of setup.nextSteps) {
        writeStderr(`  ${dim("→")} ${step}`);
      }
    }
    writeStderr("");
  }

  return ok({
    brand: brandResult,
    skills: skillsResult,
    agents: agentsResult,
    doctor: doctorResult.ok ? doctorResult.data : { passed: false, checks: [] },
    setup,
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
