// mktg status — Project marketing state snapshot
// The most important command for agents. /cmo reads this first on every activation.

import { ok, type CommandHandler, type CommandSchema } from "../types";
import { getBrandStatus } from "../core/brand";
import { loadManifest, getInstallStatus } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus } from "../core/agents";
import { bold, dim, green, red, yellow, isTTY } from "../core/output";
import { join } from "node:path";

export const schema: CommandSchema = {
  name: "status",
  description: "Project marketing state snapshot — the most important command for agents",
  flags: [],
  output: {
    "project": "string — project name",
    "brand": "Record<string, BrandEntry> — brand file statuses",
    "skills": "{installed, total} — skill counts",
    "agents": "{installed, total} — agent counts",
    "content": "{totalFiles} — content file count",
    "health": "'ready' | 'incomplete' | 'needs-setup'",
  },
  examples: [
    { args: "mktg status --json", description: "Full project state snapshot" },
    { args: "mktg status --fields health,project", description: "Quick health check" },
  ],
  vocabulary: ["status", "state", "overview", "snapshot"],
};

type BrandEntry = {
  readonly exists: boolean;
  readonly lines?: number;
  readonly ageDays?: number | null;
};

type StatusResult = {
  readonly project: string;
  readonly brand: Record<string, BrandEntry>;
  readonly skills: { readonly installed: number; readonly total: number };
  readonly agents: { readonly installed: number; readonly total: number };
  readonly content: { readonly totalFiles: number };
  readonly health: "ready" | "incomplete" | "needs-setup";
};

// Count marketing content files in common directories
const countContentFiles = async (cwd: string): Promise<number> => {
  let count = 0;
  const contentDirs = ["marketing", "campaigns", "content"];

  for (const dir of contentDirs) {
    const dirPath = join(cwd, dir);
    try {
      const glob = new Bun.Glob("**/*.{md,mdx,txt,html}");
      for await (const _file of glob.scan({ cwd: dirPath })) {
        count++;
      }
    } catch {
      // Directory doesn't exist — fine
    }
  }

  return count;
};

// Count lines in a file
const countLines = async (filePath: string): Promise<number> => {
  try {
    const file = Bun.file(filePath);
    const text = await file.text();
    return text.split("\n").length;
  } catch {
    return 0;
  }
};

// Determine project name from package.json or directory name
const getProjectName = async (cwd: string): Promise<string> => {
  try {
    const pkgPath = join(cwd, "package.json");
    const file = Bun.file(pkgPath);
    if (await file.exists()) {
      const pkg = await file.json();
      if (pkg.name) return pkg.name;
    }
  } catch {
    // Fall through
  }
  return cwd.split("/").pop() ?? "unknown";
};

export const handler: CommandHandler<StatusResult> = async (_args, flags) => {
  const cwd = flags.cwd;
  const manifest = await loadManifest();
  const installStatus = await getInstallStatus(manifest);

  const installedCount = Object.values(installStatus).filter(
    (s) => s.installed,
  ).length;

  // Load agent status
  let agentInstalled = 0;
  let agentTotal = 0;
  try {
    const agentManifest = await loadAgentManifest();
    const agentStatus = await getAgentInstallStatus(agentManifest);
    agentTotal = Object.keys(agentManifest.agents).length;
    agentInstalled = Object.values(agentStatus).filter((s) => s.installed).length;
  } catch {
    // Agent manifest may not exist
  }

  // Run checks in parallel
  const [brandStatuses, contentCount, projectName] = await Promise.all([
    getBrandStatus(cwd),
    countContentFiles(cwd),
    getProjectName(cwd),
  ]);

  // Build brand status map with line counts
  const brand: Record<string, BrandEntry> = {};
  for (const status of brandStatuses) {
    if (!status.exists) {
      brand[status.file] = { exists: false };
    } else {
      const lines = await countLines(join(cwd, "brand", status.file));
      brand[status.file] = {
        exists: true,
        lines,
        ageDays: status.ageDays,
      };
    }
  }

  // Determine health
  const hasVoiceProfile = brand["voice-profile.md"]?.exists ?? false;
  const hasBrandDir = brandStatuses.some((s) => s.exists);
  const health: StatusResult["health"] = !hasBrandDir
    ? "needs-setup"
    : hasVoiceProfile
      ? "ready"
      : "incomplete";

  const result: StatusResult = {
    project: projectName,
    brand,
    skills: {
      installed: installedCount,
      total: Object.keys(manifest.skills).length,
    },
    agents: {
      installed: agentInstalled,
      total: agentTotal,
    },
    content: { totalFiles: contentCount },
    health,
  };

  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY display
  const lines: string[] = [];
  lines.push(bold(`mktg status — ${projectName}`));
  lines.push("");

  const healthIcon =
    health === "ready"
      ? green("● Ready")
      : health === "incomplete"
        ? yellow("● Incomplete")
        : red("● Needs setup");
  lines.push(`  Health: ${healthIcon}`);
  lines.push("");

  lines.push(bold("  Brand Files"));
  for (const status of brandStatuses) {
    const icon = status.exists ? green("●") : red("●");
    const age = status.ageDays !== null ? dim(` (${status.ageDays}d ago)`) : "";
    const freshness =
      status.freshness === "stale" ? yellow(" [stale]") : "";
    lines.push(`    ${icon} ${status.file}${age}${freshness}`);
  }
  lines.push("");

  lines.push(
    bold("  Skills") +
      dim(` ${result.skills.installed}/${result.skills.total} installed`),
  );

  if (result.agents.total > 0) {
    lines.push(
      bold("  Agents") +
        dim(` ${result.agents.installed}/${result.agents.total} installed`),
    );
  }

  if (contentCount > 0) {
    lines.push(bold("  Content") + dim(` ${contentCount} files`));
  }
  lines.push("");

  if (health === "needs-setup") {
    lines.push(dim("  Run 'mktg init' to get started."));
    lines.push("");
  }

  return ok(result, lines.join("\n"));
};
