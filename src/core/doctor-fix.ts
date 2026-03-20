// mktg — Doctor fix execution logic
// Given failed/warned checks, execute appropriate remediation functions.

import { scaffoldBrand } from "./brand";
import { loadManifest, installSkills } from "./skills";
import { loadAgentManifest, installAgents } from "./agents";

type Check = {
  readonly name: string;
  readonly status: "pass" | "fail" | "warn";
  readonly detail: string;
  readonly fix?: string;
};

export type FixEntry = {
  readonly check: string;
  readonly action: string;
  readonly result: "fixed" | "skipped" | "failed";
  readonly detail: string;
};

// Checks that require human judgment or can't be auto-fixed
const SKIP_REASONS: Record<string, string> = {
  "brand-content": "Template content requires human/agent input — run /cmo",
  "skill-graph": "Dependency cycles require manual skill editing",
};

const isSkippable = (name: string): string | null => {
  if (SKIP_REASONS[name]) return SKIP_REASONS[name];
  if (name.startsWith("cli-")) return "System tools must be installed manually";
  if (name.startsWith("integration-")) return "Environment variables must be set manually";
  return null;
};

// Execute fixes for all non-passing checks
export const executeDoctor = async (
  checks: readonly Check[],
  cwd: string,
  dryRun: boolean,
): Promise<FixEntry[]> => {
  const fixes: FixEntry[] = [];
  const needsFix = checks.filter(c => c.status !== "pass" && c.fix);

  for (const check of needsFix) {
    const skipReason = isSkippable(check.name);
    if (skipReason) {
      fixes.push({ check: check.name, action: check.fix!, result: "skipped", detail: skipReason });
      continue;
    }

    try {
      const detail = await executeFix(check.name, cwd, dryRun);
      fixes.push({ check: check.name, action: check.fix!, result: "fixed", detail });
    } catch (e) {
      fixes.push({
        check: check.name,
        action: check.fix!,
        result: "failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return fixes;
};

// Dispatch fix by check name
const executeFix = async (checkName: string, cwd: string, dryRun: boolean): Promise<string> => {
  switch (checkName) {
    case "brand-profiles":
    case "brand-append": {
      const result = await scaffoldBrand(cwd, dryRun);
      return result.created.length > 0
        ? `Created ${result.created.join(", ")}`
        : "All brand files already exist";
    }

    case "skills": {
      const manifest = await loadManifest();
      const result = await installSkills(manifest, dryRun, cwd);
      if (result.failed.length > 0) {
        throw new Error(`Failed to install: ${result.failed.map(f => f.name).join(", ")}`);
      }
      return `Installed ${result.installed.length} skills`;
    }

    case "agents": {
      const manifest = await loadAgentManifest();
      const result = await installAgents(manifest, dryRun);
      if (result.failed.length > 0) {
        throw new Error(`Failed to install: ${result.failed.join(", ")}`);
      }
      return `Installed ${result.installed.length} agents`;
    }

    default:
      throw new Error(`No auto-fix available for ${checkName}`);
  }
};
