// mktg doctor — Health checks for brand files, skills, and CLI dependencies
// All checks run in parallel. Returns structured pass/fail/warn.

import { join } from "node:path";
import { ok, type CommandHandler, type CommandSchema, type BrandFile } from "../types";
import { getBrandStatus, isTemplateContent } from "../core/brand";
import { loadManifest, getInstallStatus, getSkillNames } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus, getAgentNames } from "../core/agents";
import { buildGraph } from "../core/skill-lifecycle";
import { getIntegrationStatus } from "../core/integrations";
import { isTTY, writeStderr, green, red, yellow, dim, bold } from "../core/output";

export const schema: CommandSchema = {
  name: "doctor",
  description: "Health checks for brand files, skills, agents, and CLI dependencies",
  flags: [],
  output: {
    "passed": "boolean — true if no checks failed",
    "checks": "Array<{name, status, detail, fix?}> — individual check results with optional remediation command",
  },
  examples: [
    { args: "mktg doctor --json", description: "Run all health checks" },
  ],
  vocabulary: ["doctor", "health check", "diagnose"],
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
};

// ANSI indicator for TTY
const indicator = (status: CheckStatus): string => {
  if (status === "pass") return green("●");
  if (status === "fail") return red("●");
  return yellow("●");
};

// Check brand files — existence, template content, and freshness
const checkBrand = async (cwd: string): Promise<Check[]> => {
  const checks: Check[] = [];
  const statuses = await getBrandStatus(cwd);

  const profileFiles = statuses.filter(
    (s) => s.file !== "assets.md" && s.file !== "learnings.md",
  );
  const appendFiles = statuses.filter(
    (s) => s.file === "assets.md" || s.file === "learnings.md",
  );

  // Profile files: must exist
  const missingProfile = profileFiles.filter((s) => !s.exists);
  const staleProfile = profileFiles.filter((s) => s.exists && s.freshness === "stale");

  if (missingProfile.length === 0 && staleProfile.length === 0) {
    checks.push({ name: "brand-profiles", status: "pass", detail: `${profileFiles.length} profile files present and current` });
  } else if (missingProfile.length > 0) {
    checks.push({
      name: "brand-profiles",
      status: "fail",
      detail: `Missing: ${missingProfile.map((s) => s.file).join(", ")}`,
      fix: "mktg init",
    });
  } else {
    checks.push({
      name: "brand-profiles",
      status: "warn",
      detail: `${staleProfile.length} stale: ${staleProfile.map((s) => s.file).join(", ")}`,
      fix: "mktg brand refresh",
    });
  }

  // Template content detection — files exist but haven't been populated
  const existingProfiles = profileFiles.filter((s) => s.exists);
  const templateFiles: string[] = [];
  for (const s of existingProfiles) {
    try {
      const content = await Bun.file(join(cwd, "brand", s.file)).text();
      if (isTemplateContent(s.file as BrandFile, content)) {
        templateFiles.push(s.file);
      }
    } catch { /* file read error — skip */ }
  }

  if (templateFiles.length > 0) {
    checks.push({
      name: "brand-content",
      status: "warn",
      detail: `${templateFiles.length} files still have template content: ${templateFiles.join(", ")}`,
      fix: "Run /cmo to populate brand files with real content",
    });
  } else if (existingProfiles.length > 0) {
    checks.push({ name: "brand-content", status: "pass", detail: `${existingProfiles.length} profile files have real content` });
  }

  // Append-only files: must exist (can be empty)
  const missingAppend = appendFiles.filter((s) => !s.exists);
  if (missingAppend.length === 0) {
    checks.push({ name: "brand-append", status: "pass", detail: `${appendFiles.length} append-only files present` });
  } else {
    checks.push({
      name: "brand-append",
      status: "fail",
      detail: `Missing: ${missingAppend.map((s) => s.file).join(", ")}`,
      fix: "mktg init",
    });
  }

  return checks;
};

// Check installed skills
const checkSkills = async (): Promise<Check[]> => {
  const checks: Check[] = [];

  try {
    const manifest = await loadManifest();
    const installStatus = await getInstallStatus(manifest);
    const total = getSkillNames(manifest).length;
    const installed = Object.values(installStatus).filter((s) => s.installed).length;
    const missing = total - installed;

    if (missing === 0) {
      checks.push({ name: "skills", status: "pass", detail: `${total} skills installed` });
    } else {
      const missingNames = Object.entries(installStatus)
        .filter(([, s]) => !s.installed)
        .map(([name]) => name);
      checks.push({
        name: "skills",
        status: missing > total / 2 ? "fail" : "warn",
        detail: `${installed}/${total} installed. Missing: ${missingNames.slice(0, 5).join(", ")}${missingNames.length > 5 ? ` +${missingNames.length - 5} more` : ""}`,
        fix: "mktg update",
      });
    }
  } catch (e) {
    checks.push({
      name: "skills",
      status: "fail",
      detail: e instanceof Error ? e.message : "Failed to load manifest",
      fix: "mktg init",
    });
  }

  return checks;
};

// Check installed agents
const checkAgents = async (): Promise<Check[]> => {
  const checks: Check[] = [];

  try {
    const manifest = await loadAgentManifest();
    const installStatus = await getAgentInstallStatus(manifest);
    const total = getAgentNames(manifest).length;
    const installed = Object.values(installStatus).filter((s) => s.installed).length;
    const missing = total - installed;

    if (missing === 0) {
      checks.push({ name: "agents", status: "pass", detail: `${total} agents installed` });
    } else {
      const missingNames = Object.entries(installStatus)
        .filter(([, s]) => !s.installed)
        .map(([name]) => name);
      checks.push({
        name: "agents",
        status: missing > total / 2 ? "fail" : "warn",
        detail: `${installed}/${total} installed. Missing: ${missingNames.join(", ")}`,
        fix: "mktg update",
      });
    }
  } catch {
    checks.push({
      name: "agents",
      status: "warn",
      detail: "Agent manifest not found (optional)",
    });
  }

  return checks;
};

// Check skill dependency graph for cycles
const checkGraph = async (): Promise<Check[]> => {
  try {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);
    return [{
      name: "skill-graph",
      status: graph.hasCycles ? "warn" : "pass",
      detail: graph.hasCycles
        ? "Dependency cycle detected — skill execution order is undefined"
        : `No cycles (${graph.nodes.length} skills, ${graph.edges.length} edges)`,
    }];
  } catch (e) {
    return [{
      name: "skill-graph",
      status: "warn",
      detail: e instanceof Error ? e.message : "Failed to build skill graph",
    }];
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
  ] as const;

  const checks: Check[] = [];

  for (const tool of tools) {
    const found = Bun.which(tool.name) !== null;
    if (found) {
      checks.push({ name: `cli-${tool.name}`, status: "pass", detail: `${tool.name} found` });
    } else if (tool.required) {
      checks.push({ name: `cli-${tool.name}`, status: "fail", detail: `${tool.name} not found (required)` });
    } else {
      checks.push({ name: `cli-${tool.name}`, status: "warn", detail: `${tool.name} not found (optional)` });
    }
  }

  return checks;
};

// Check third-party integration env vars
const checkIntegrations = async (): Promise<Check[]> => {
  try {
    const manifest = await loadManifest();
    const statuses = getIntegrationStatus(manifest);
    return statuses.map((s) => ({
      name: `integration-${s.envVar}`,
      status: s.configured ? "pass" as const : "warn" as const,
      detail: s.configured
        ? `${s.envVar} set (${s.skills.join(", ")})`
        : `${s.envVar} not set — needed by ${s.skills.join(", ")}`,
    }));
  } catch {
    return [];
  }
};

export const handler: CommandHandler<DoctorResult> = async (_args, flags) => {
  // Run all checks in parallel
  const [brandChecks, skillChecks, agentChecks, graphChecks, cliChecks, integrationChecks] = await Promise.all([
    checkBrand(flags.cwd),
    checkSkills(),
    checkAgents(),
    checkGraph(),
    checkCLIs(),
    checkIntegrations(),
  ]);

  const allChecks = [...brandChecks, ...skillChecks, ...agentChecks, ...graphChecks, ...cliChecks, ...integrationChecks];
  const hasFail = allChecks.some((c) => c.status === "fail");
  const passed = !hasFail;

  // TTY output
  if (isTTY() && !flags.json) {
    writeStderr("");
    writeStderr(`  ${bold("mktg doctor")}`);
    writeStderr("");

    const printSection = (title: string, checks: Check[]) => {
      writeStderr(`  ${dim(title)}`);
      for (const check of checks) {
        writeStderr(`  ${indicator(check.status)} ${check.detail}${check.fix && check.status !== "pass" ? dim(` → ${check.fix}`) : ""}`);
      }
      writeStderr("");
    };

    printSection("Brand", brandChecks);
    printSection("Skills", skillChecks);
    printSection("Agents", agentChecks);
    printSection("Graph", graphChecks);
    printSection("Tools", cliChecks);
    if (integrationChecks.length > 0) {
      printSection("Integrations", integrationChecks);
    }

    if (passed) {
      writeStderr(`  ${green(bold("All checks pass"))}`);
    } else {
      writeStderr(`  ${red(bold("Issues found"))} — run ${dim("mktg init")} to fix`);
    }
    writeStderr("");
  }

  return ok({ passed, checks: allChecks });
};
