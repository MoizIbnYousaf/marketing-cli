// mktg doctor — Health checks for brand files, skills, and CLI dependencies
// All checks run in parallel. Returns structured pass/fail/warn.

import { ok, type CommandHandler } from "../types";
import { getBrandStatus } from "../core/brand";
import { loadManifest, getInstallStatus, getSkillNames } from "../core/skills";
import { isTTY, writeStderr, green, red, yellow, dim, bold } from "../core/output";

type CheckStatus = "pass" | "fail" | "warn";

type Check = {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail: string;
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

// Check brand files
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
    });
  } else {
    checks.push({
      name: "brand-profiles",
      status: "warn",
      detail: `${staleProfile.length} stale: ${staleProfile.map((s) => s.file).join(", ")}`,
    });
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
      });
    }
  } catch (e) {
    checks.push({
      name: "skills",
      status: "fail",
      detail: e instanceof Error ? e.message : "Failed to load manifest",
    });
  }

  return checks;
};

// Check CLI tool availability
const checkCLIs = async (): Promise<Check[]> => {
  const tools = [
    { name: "bun", required: true },
    { name: "gws", required: false },
    { name: "playwright-cli", required: false },
    { name: "ffmpeg", required: false },
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

export const handler: CommandHandler<DoctorResult> = async (_args, flags) => {
  // Run all checks in parallel
  const [brandChecks, skillChecks, cliChecks] = await Promise.all([
    checkBrand(flags.cwd),
    checkSkills(),
    checkCLIs(),
  ]);

  const allChecks = [...brandChecks, ...skillChecks, ...cliChecks];
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
        writeStderr(`  ${indicator(check.status)} ${check.detail}`);
      }
      writeStderr("");
    };

    printSection("Brand", brandChecks);
    printSection("Skills", skillChecks);
    printSection("Tools", cliChecks);

    if (passed) {
      writeStderr(`  ${green(bold("All checks pass"))}`);
    } else {
      writeStderr(`  ${red(bold("Issues found"))} — run ${dim("mktg init")} to fix`);
    }
    writeStderr("");
  }

  return ok({ passed, checks: allChecks });
};
