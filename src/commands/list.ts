// mktg list — Show available skills with status
// Reads from skills-manifest.json, groups by category, shows installed/missing.

import { ok, type CommandHandler, type CommandSchema, type SkillCategory, type AgentCategory } from "../types";
import { loadManifest, getInstallStatus, readSkillVersions } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus } from "../core/agents";
import { bold, dim, green, red, isTTY } from "../core/output";

export const schema: CommandSchema = {
  name: "list",
  description: "Show available skills and agents with install status",
  flags: [],
  output: {
    "skills": "SkillEntry[] — all skills with status",
    "agents": "AgentEntry[] — all agents with status",
    "total": "number — total skill count",
    "installed": "number — installed skill count",
    "missing": "number — missing skill count",
  },
  examples: [
    { args: "mktg list --json", description: "List all skills and agents" },
    { args: "mktg list --fields total,installed", description: "Show counts only" },
  ],
  vocabulary: ["list", "show skills", "installed skills"],
};

type SkillEntry = {
  readonly name: string;
  readonly category: SkillCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly layer: string;
  readonly installed: boolean;
  readonly triggers: readonly string[];
  readonly installedVersion: string | null;
  readonly latestVersion: string | null;
};

type AgentEntry = {
  readonly name: string;
  readonly category: AgentCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly installed: boolean;
  readonly references_skill: string | null;
};

type ListResult = {
  readonly skills: readonly SkillEntry[];
  readonly agents: readonly AgentEntry[];
  readonly total: number;
  readonly installed: number;
  readonly missing: number;
};

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  foundation: "Foundation",
  strategy: "Strategy",
  "copy-content": "Copy & Content",
  distribution: "Distribution",
  creative: "Creative",
  seo: "SEO",
  conversion: "Conversion",
  growth: "Growth",
  knowledge: "Knowledge",
};

const CATEGORY_ORDER: readonly SkillCategory[] = [
  "foundation",
  "strategy",
  "copy-content",
  "distribution",
  "creative",
  "seo",
  "conversion",
  "growth",
  "knowledge",
];

export const handler: CommandHandler<ListResult> = async (_args, flags) => {
  const manifest = await loadManifest();
  const [installStatus, installedVersions] = await Promise.all([
    getInstallStatus(manifest),
    readSkillVersions(flags.cwd),
  ]);

  const skills: SkillEntry[] = Object.entries(manifest.skills).map(
    ([name, meta]) => ({
      name,
      category: meta.category,
      tier: meta.tier,
      layer: meta.layer,
      installed: installStatus[name]?.installed ?? false,
      triggers: meta.triggers,
      installedVersion: installedVersions[name] ?? null,
      latestVersion: meta.version ?? null,
    }),
  );

  // Load agents
  let agents: AgentEntry[] = [];
  try {
    const agentManifest = await loadAgentManifest();
    const agentInstallStatus = await getAgentInstallStatus(agentManifest);
    agents = Object.entries(agentManifest.agents).map(([name, meta]) => ({
      name,
      category: meta.category,
      tier: meta.tier,
      installed: agentInstallStatus[name]?.installed ?? false,
      references_skill: meta.references_skill,
    }));
  } catch {
    // Agent manifest may not exist
  }

  const result: ListResult = {
    skills,
    agents,
    total: skills.length,
    installed: skills.filter((s) => s.installed).length,
    missing: skills.filter((s) => !s.installed).length,
  };

  // JSON mode returns raw data
  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY mode: grouped display
  const lines: string[] = [];
  lines.push(bold(`mktg skills (${result.installed}/${result.total} installed)`));
  lines.push("");

  for (const category of CATEGORY_ORDER) {
    const categorySkills = skills.filter((s) => s.category === category);
    if (categorySkills.length === 0) continue;

    lines.push(bold(CATEGORY_LABELS[category]));
    for (const skill of categorySkills) {
      const status = skill.installed ? green("●") : red("●");
      const tier = skill.tier === "nice-to-have" ? dim(" (optional)") : "";
      lines.push(`  ${status} ${skill.name}${tier}`);
    }
    lines.push("");
  }

  // Show agents
  if (agents.length > 0) {
    lines.push(bold("Agents"));
    for (const agent of agents) {
      const status = agent.installed ? green("●") : red("●");
      const ref = agent.references_skill ? dim(` → ${agent.references_skill}`) : "";
      lines.push(`  ${status} mktg-${agent.name} ${dim(`[${agent.category}]`)}${ref}`);
    }
    lines.push("");
  }

  // Show redirects
  const redirects = Object.entries(manifest.redirects);
  if (redirects.length > 0) {
    lines.push(dim("Redirects (renamed/merged skills):"));
    for (const [from, to] of redirects) {
      lines.push(dim(`  ${from} → ${to}`));
    }
    lines.push("");
  }

  return ok(result, lines.join("\n"));
};
