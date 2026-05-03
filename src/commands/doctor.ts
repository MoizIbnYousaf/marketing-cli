// mktg doctor — Health checks for brand files, skills, and CLI dependencies
// All checks run in parallel. --fix auto-remediates mechanical failures.

import { join } from "node:path";
import { ok, type CommandHandler, type CommandSchema, type BrandFile } from "../types";
import { invalidArgs } from "../core/errors";
import { getBrandStatus, isTemplateContent } from "../core/brand";
import { loadManifest, getInstallStatus, getSkillNames, readExternalSkills } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus, getAgentNames } from "../core/agents";
import { buildGraph } from "../core/skill-lifecycle";
import { getIntegrationStatus, INTEGRATION_CONFIG } from "../core/integrations";
import { isTTY, writeStderr, green, red, yellow, dim, bold } from "../core/output";
import { executeDoctor, type FixEntry } from "../core/doctor-fix";

export const schema: CommandSchema = {
  name: "doctor",
  description: "Health checks for brand files, skills, agents, and CLI dependencies",
  flags: [
    { name: "--fix", type: "boolean", required: false, default: false, description: "Auto-remediate failed checks (respects --dry-run)" },
    { name: "--configure", type: "string", required: false, description: "Configure a specific integration (e.g., typefully, resend)" },
  ],
  output: {
    "passed": "boolean — true if no checks failed",
    "checks": "Array<{name, status, detail, fix?}> — individual check results with optional remediation command",
    "fixes": "Array<{check, action, result, detail}> — fix results (only present with --fix)",
  },
  examples: [
    { args: "mktg doctor --json", description: "Run all health checks" },
    { args: "mktg doctor --fix", description: "Auto-fix all mechanical failures" },
    { args: "mktg doctor --fix --dry-run", description: "Preview fixes without executing" },
    { args: "mktg doctor --configure typefully --json", description: "Show configuration status for the typefully integration" },
    { args: "mktg doctor --configure --json", description: "List all available integrations with their status" },
  ],
  vocabulary: ["doctor", "health check", "diagnose", "fix", "heal"],
};

type CheckStatus = "pass" | "fail" | "warn";

type Check = {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail: string;
  readonly fix?: string;
};

type DoctorResult = {
  readonly passed: boolean;
  readonly checks: readonly Check[];
  readonly fixes?: readonly FixEntry[];
};

type ConfigureResult = {
  readonly integration: string;
  readonly envVar: string;
  readonly configured: boolean;
  readonly docsUrl: string;
  readonly exportCommand: string;
};

type ListIntegrationsResult = {
  readonly integrations: readonly ConfigureResult[];
};

const indicator = (s: CheckStatus): string =>
  s === "pass" ? green("●") : s === "fail" ? red("●") : yellow("●");

const fixIndicator = (r: FixEntry["result"]): string =>
  r === "fixed" ? green("✓") : r === "skipped" ? yellow("−") : red("✗");

// Check brand files — existence, template content, and freshness
const checkBrand = async (cwd: string): Promise<Check[]> => {
  const checks: Check[] = [];
  const statuses = await getBrandStatus(cwd);
  const profileFiles = statuses.filter(s => s.file !== "assets.md" && s.file !== "learnings.md");
  const appendFiles = statuses.filter(s => s.file === "assets.md" || s.file === "learnings.md");

  const missingProfile = profileFiles.filter(s => !s.exists);
  const staleProfile = profileFiles.filter(s => s.exists && s.freshness === "stale");

  if (missingProfile.length === 0 && staleProfile.length === 0) {
    checks.push({ name: "brand-profiles", status: "pass", detail: `${profileFiles.length} profile files present and current` });
  } else if (missingProfile.length > 0) {
    checks.push({ name: "brand-profiles", status: "fail", detail: `Missing: ${missingProfile.map(s => s.file).join(", ")}`, fix: "mktg init" });
  } else {
    checks.push({ name: "brand-profiles", status: "warn", detail: `${staleProfile.length} stale: ${staleProfile.map(s => s.file).join(", ")}`, fix: "mktg brand refresh" });
  }

  const existingProfiles = profileFiles.filter(s => s.exists);
  const templateFiles: string[] = [];
  for (const s of existingProfiles) {
    try {
      const content = await Bun.file(join(cwd, "brand", s.file)).text();
      if (isTemplateContent(s.file as BrandFile, content)) templateFiles.push(s.file);
    } catch { /* file read error — skip */ }
  }

  if (templateFiles.length > 0) {
    checks.push({ name: "brand-content", status: "warn", detail: `${templateFiles.length} files still have template content: ${templateFiles.join(", ")}`, fix: "Run /cmo to populate brand files with real content" });
  } else if (existingProfiles.length > 0) {
    checks.push({ name: "brand-content", status: "pass", detail: `${existingProfiles.length} profile files have real content` });
  }

  const missingAppend = appendFiles.filter(s => !s.exists);
  if (missingAppend.length === 0) {
    checks.push({ name: "brand-append", status: "pass", detail: `${appendFiles.length} append-only files present` });
  } else {
    checks.push({ name: "brand-append", status: "fail", detail: `Missing: ${missingAppend.map(s => s.file).join(", ")}`, fix: "mktg init" });
  }

  return checks;
};

// Check installed skills
const checkSkills = async (): Promise<Check[]> => {
  try {
    const manifest = await loadManifest();
    const installStatus = await getInstallStatus(manifest);
    const total = getSkillNames(manifest).length;
    const installed = Object.values(installStatus).filter(s => s.installed).length;
    const missing = total - installed;

    if (missing === 0) return [{ name: "skills", status: "pass", detail: `${total} skills installed` }];
    const missingNames = Object.entries(installStatus).filter(([, s]) => !s.installed).map(([name]) => name);
    return [{ name: "skills", status: missing > total / 2 ? "fail" : "warn", detail: `${installed}/${total} installed. Missing: ${missingNames.slice(0, 5).join(", ")}${missingNames.length > 5 ? ` +${missingNames.length - 5} more` : ""}`, fix: "mktg update" }];
  } catch (e) {
    return [{ name: "skills", status: "fail", detail: e instanceof Error ? e.message : "Failed to load manifest", fix: "mktg init" }];
  }
};

// Check installed agents
const checkAgents = async (): Promise<Check[]> => {
  try {
    const manifest = await loadAgentManifest();
    const installStatus = await getAgentInstallStatus(manifest);
    const total = getAgentNames(manifest).length;
    const installed = Object.values(installStatus).filter(s => s.installed).length;
    const missing = total - installed;

    if (missing === 0) return [{ name: "agents", status: "pass", detail: `${total} agents installed` }];
    const missingNames = Object.entries(installStatus).filter(([, s]) => !s.installed).map(([name]) => name);
    return [{ name: "agents", status: missing > total / 2 ? "fail" : "warn", detail: `${installed}/${total} installed. Missing: ${missingNames.join(", ")}`, fix: "mktg update" }];
  } catch {
    return [{ name: "agents", status: "warn", detail: "Agent manifest not found (optional)" }];
  }
};

// Check skill dependency graph for cycles
const checkGraph = async (): Promise<Check[]> => {
  try {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);
    return [{ name: "skill-graph", status: graph.hasCycles ? "warn" : "pass", detail: graph.hasCycles ? "Dependency cycle detected — skill execution order is undefined" : `No cycles (${graph.nodes.length} skills, ${graph.edges.length} edges)` }];
  } catch (e) {
    return [{ name: "skill-graph", status: "warn", detail: e instanceof Error ? e.message : "Failed to build skill graph" }];
  }
};

// Check CLI tool availability
const checkCLIs = async (): Promise<Check[]> => {
  const tools = [
    { name: "bun", required: true },
    { name: "gws", required: false },
    { name: "playwright-cli", required: false },
    { name: "ffmpeg", required: false },
    { name: "remotion", required: false },
    { name: "firecrawl", required: false },
    { name: "whisper-cpp", required: false },
    { name: "yt-dlp", required: false },
    { name: "summarize", required: false },
    { name: "gh", required: false },
  ] as const;

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

  return tools.map(tool => {
    const found = Bun.which(tool.name) !== null;
    const hint = CLI_INSTALL_HINTS[tool.name];
    if (found) return { name: `cli-${tool.name}`, status: "pass" as const, detail: `${tool.name} found` };
    if (tool.required) return hint
      ? { name: `cli-${tool.name}`, status: "fail" as const, detail: `${tool.name} not found (required)`, fix: hint }
      : { name: `cli-${tool.name}`, status: "fail" as const, detail: `${tool.name} not found (required)` };
    return hint
      ? { name: `cli-${tool.name}`, status: "warn" as const, detail: `${tool.name} not found (optional)`, fix: hint }
      : { name: `cli-${tool.name}`, status: "warn" as const, detail: `${tool.name} not found (optional)` };
  });
};

// Check third-party integration env vars
const checkIntegrations = async (): Promise<Check[]> => {
  try {
    const manifest = await loadManifest();
    return getIntegrationStatus(manifest).map(s => ({
      name: `integration-${s.envVar}`,
      status: s.configured ? "pass" as const : "warn" as const,
      detail: s.configured ? `${s.envVar} set (${s.skills.join(", ")})` : `${s.envVar} not set — needed by ${s.skills.join(", ")}`,
    }));
  } catch { return []; }
};

// Check external skills (chained via `mktg skill add`)
const checkExternalSkills = async (cwd: string): Promise<Check[]> => {
  const externalSkills = await readExternalSkills(cwd);
  const entries = Object.values(externalSkills);
  if (entries.length === 0) return [];

  const checks: Check[] = [];
  let healthy = 0;
  for (const ext of entries) {
    const skillMdPath = join(ext.source_path, "SKILL.md");
    const exists = await Bun.file(skillMdPath).exists();

    if (!exists) {
      checks.push({
        name: `external-${ext.name}`,
        status: "fail",
        detail: `External skill '${ext.name}' source missing: ${ext.source_path}`,
        fix: `Re-install the skill or remove with: mktg skill unregister ${ext.name} --confirm`,
      });
    } else {
      healthy++;
    }

    // Check env vars if specified
    if (ext.env_vars && ext.env_vars.length > 0) {
      for (const envVar of ext.env_vars) {
        if (!process.env[envVar]) {
          checks.push({
            name: `external-env-${ext.name}-${envVar}`,
            status: "warn",
            detail: `External skill '${ext.name}' needs ${envVar} but it is not set`,
          });
        }
      }
    }
  }

  if (healthy === entries.length && checks.length === 0) {
    checks.push({
      name: "external-skills",
      status: "pass",
      detail: `${entries.length} external skill${entries.length !== 1 ? "s" : ""} healthy`,
    });
  } else if (healthy > 0) {
    checks.unshift({
      name: "external-skills",
      status: "warn",
      detail: `${healthy}/${entries.length} external skills healthy`,
    });
  }

  return checks;
};

// Check upstream catalog env vars. Data-driven — iterates
// catalogs-manifest.json; no hardcoded catalog references here. A missing
// manifest is legitimate (no catalogs installed yet) → returns no checks.
const checkCatalogs = async (): Promise<Check[]> => {
  try {
    const { loadCatalogManifest, computeConfiguredStatus } = await import("../core/catalogs");
    const result = await loadCatalogManifest();
    if (!result.ok) {
      if (result.reason === "manifest-missing") return [];
      // Structural failure — surface it as a single loud check so agents see it in doctor output.
      const detail = result.reason === "manifest-invalid"
        ? `catalogs-manifest.json is malformed: ${result.detail}`
        : result.reason === "collision"
          ? `catalogs-manifest.json has adapter-name collisions (${result.collisions.length})`
          : `catalogs-manifest.json has ${result.denials.length} license denial(s)`;
      return [{
        name: "catalogs-manifest",
        status: "fail",
        detail,
        fix: "mktg catalog list --json  (shows structured error envelope)",
      }];
    }
    const checks: Check[] = [];
    for (const cat of Object.values(result.manifest.catalogs)) {
      const status = computeConfiguredStatus(cat);
      if (status.configured) {
        checks.push({
          name: `catalog-${cat.name}`,
          status: "pass",
          detail: `${cat.name} configured (${cat.transport} → ${status.resolvedBase})`,
        });
      } else {
        checks.push({
          name: `catalog-${cat.name}`,
          status: "warn",
          detail: `${cat.name} unconfigured — missing: ${status.missingEnvs.join(", ")}`,
          fix: `mktg catalog info ${cat.name} --json  (shows required env vars + docs_url)`,
        });
      }
    }
    return checks;
  } catch {
    return [];
  }
};

// Run all checks in parallel
const runAllChecks = async (cwd: string) => {
  const [brand, skills, agents, graph, clis, integrations, externalSkills, catalogs] = await Promise.all([
    checkBrand(cwd), checkSkills(), checkAgents(), checkGraph(), checkCLIs(), checkIntegrations(), checkExternalSkills(cwd), checkCatalogs(),
  ]);
  return { brand, skills, agents, graph, clis, integrations, externalSkills, catalogs };
};

// TTY display
const printChecks = (sections: ReturnType<typeof runAllChecks> extends Promise<infer T> ? T : never, fixes?: readonly FixEntry[]) => {
  writeStderr("");
  writeStderr(`  ${bold("mktg doctor")}`);
  writeStderr("");

  const printSection = (title: string, checks: Check[]) => {
    writeStderr(`  ${dim(title)}`);
    for (const c of checks) {
      writeStderr(`  ${indicator(c.status)} ${c.detail}${c.fix && c.status !== "pass" ? dim(` → ${c.fix}`) : ""}`);
    }
    writeStderr("");
  };

  printSection("Brand", sections.brand);
  printSection("Skills", sections.skills);
  printSection("Agents", sections.agents);
  printSection("Graph", sections.graph);
  printSection("Tools", sections.clis);
  if (sections.externalSkills.length > 0) printSection("External Skills", sections.externalSkills);
  if (sections.integrations.length > 0) printSection("Integrations", sections.integrations);
  if (sections.catalogs.length > 0) printSection("Catalogs", sections.catalogs);

  if (fixes && fixes.length > 0) {
    writeStderr(`  ${dim("Fixes")}`);
    for (const f of fixes) {
      writeStderr(`  ${fixIndicator(f.result)} ${f.check}: ${f.detail}`);
    }
    writeStderr("");
  }

  const all = [...sections.brand, ...sections.skills, ...sections.agents, ...sections.graph, ...sections.clis, ...sections.externalSkills, ...sections.integrations, ...sections.catalogs];
  const passed = !all.some(c => c.status === "fail");
  if (passed) {
    writeStderr(`  ${green(bold("All checks pass"))}`);
  } else {
    writeStderr(`  ${red(bold("Issues found"))} — run ${dim("mktg doctor --fix")} to auto-fix`);
  }
  writeStderr("");
};

// Helper: build a ConfigureResult for one integration name
const buildConfigureResult = (name: string): ConfigureResult => {
  const cfg = INTEGRATION_CONFIG[name]!;
  const configured = !!process.env[cfg.envVar];
  return {
    integration: name,
    envVar: cfg.envVar,
    configured,
    docsUrl: cfg.docsUrl,
    exportCommand: `export ${cfg.envVar}=<your-api-key>`,
  };
};

export const handler: CommandHandler<DoctorResult> = async (args, flags) => {
  // Resolve --configure value: --configure=foo or --configure foo
  const configureEqIdx = args.findIndex(a => a.startsWith("--configure="));
  const configureIdx = args.findIndex(a => a === "--configure");
  let configureTarget: string | null | undefined; // null = bare flag (list), string = named target, undefined = not present

  if (configureEqIdx !== -1) {
    configureTarget = args[configureEqIdx]!.slice("--configure=".length);
  } else if (configureIdx !== -1) {
    const next = args[configureIdx + 1];
    // If next arg exists and is not another flag, treat as value; otherwise bare flag
    if (next !== undefined && !next.startsWith("--")) {
      configureTarget = next;
    } else {
      configureTarget = null; // bare --configure → list all
    }
  }

  if (configureTarget !== undefined) {
    // --configure flag is present — early-return with configure/list result.
    // Cast via unknown: --configure returns a different shape than DoctorResult,
    // but callers that pass --configure know they get ConfigureResult | ListIntegrationsResult.
    if (configureTarget === null) {
      const integrations = Object.keys(INTEGRATION_CONFIG).map(buildConfigureResult);
      return ok({ integrations }) as unknown as ReturnType<CommandHandler<DoctorResult>>;
    }

    const cfg = INTEGRATION_CONFIG[configureTarget];
    if (!cfg) {
      const available = Object.keys(INTEGRATION_CONFIG).join(", ");
      return invalidArgs(
        `Unknown integration '${configureTarget}'. Available: ${available}`,
        Object.keys(INTEGRATION_CONFIG).map(n => `mktg doctor --configure ${n} --json`),
      ) as unknown as ReturnType<CommandHandler<DoctorResult>>;
    }

    return ok(buildConfigureResult(configureTarget)) as unknown as ReturnType<CommandHandler<DoctorResult>>;
  }

  const wantsFix = args.includes("--fix");

  // Initial checks
  let sections = await runAllChecks(flags.cwd);
  let allChecks = [...sections.brand, ...sections.skills, ...sections.agents, ...sections.graph, ...sections.clis, ...sections.externalSkills, ...sections.integrations, ...sections.catalogs];
  let fixes: FixEntry[] | undefined;

  if (wantsFix) {
    fixes = await executeDoctor(allChecks, flags.cwd, flags.dryRun);

    // Re-run checks after fixes to show final state
    if (!flags.dryRun && fixes.some(f => f.result === "fixed")) {
      sections = await runAllChecks(flags.cwd);
      allChecks = [...sections.brand, ...sections.skills, ...sections.agents, ...sections.graph, ...sections.clis, ...sections.integrations, ...sections.catalogs];
    }
  }

  const passed = !allChecks.some(c => c.status === "fail");

  if (isTTY() && !flags.json) printChecks(sections, fixes);

  const data: DoctorResult = fixes ? { passed, checks: allChecks, fixes } : { passed, checks: allChecks };
  return ok(data);
};
