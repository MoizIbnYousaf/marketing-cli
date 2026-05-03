// mktg list — Show available skills with status
// Reads from skills-manifest.json, groups by category, shows installed/missing.

import { join } from "node:path";
import { ok, type CommandHandler, type CommandSchema, type SkillCategory, type AgentCategory, type ExternalSkillEntry, type SkillRoutingEntry } from "../types";
import { loadManifest, getInstallStatus, readSkillVersions, readExternalSkills } from "../core/skills";
import { loadAgentManifest, getAgentInstallStatus } from "../core/agents";
import { bold, dim, green, red, yellow, isTTY, writeStdout } from "../core/output";

export const schema: CommandSchema = {
  name: "list",
  description: "Show available skills and agents with install status",
  flags: [
    { name: "--ndjson", type: "boolean", required: false, default: false, description: "Output one JSON object per line (NDJSON streaming) — each skill is a separate line for incremental processing" },
    { name: "--routing", type: "boolean", required: false, default: false, description: "Include routing metadata in skill entries (triggers, requires, unlocks, precedence) — used by /cmo for orchestration" },
  ],
  output: {
    "skills": "SkillEntry[] — all skills with status",
    "agents": "AgentEntry[] — all agents with status",
    "total": "number — total skill count",
    "installed": "number — installed skill count",
    "missing": "number — missing skill count",
  },
  examples: [
    { args: "mktg list --json", description: "List all skills and agents" },
    { args: "mktg list --routing --json", description: "List skills with CMO routing metadata" },
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
  readonly routing?: SkillRoutingEntry;
};

type AgentEntry = {
  readonly name: string;
  readonly category: AgentCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly installed: boolean;
  readonly references_skill: string | null;
};

type ExternalSkillListEntry = {
  readonly name: string;
  readonly source_path: string;
  readonly triggers: readonly string[];
  readonly added: string;
  readonly source_exists: boolean;
};

type ListResult = {
  readonly skills: readonly SkillEntry[];
  readonly agents: readonly AgentEntry[];
  readonly external_skills: readonly ExternalSkillListEntry[];
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

export const handler: CommandHandler<ListResult> = async (args, flags) => {
  const wantsNdjson = args.includes("--ndjson");
  const wantsRouting = args.includes("--routing");
  const manifest = await loadManifest();
  const [installStatus, installedVersions, externalSkillsMap] = await Promise.all([
    getInstallStatus(manifest),
    readSkillVersions(flags.cwd),
    readExternalSkills(flags.cwd),
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
      ...(wantsRouting && meta.routing ? { routing: meta.routing } : {}),
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

  // Build external skills list with source existence check
  const externalSkillEntries: ExternalSkillListEntry[] = await Promise.all(
    Object.values(externalSkillsMap).map(async (ext) => ({
      name: ext.name,
      source_path: ext.source_path,
      triggers: ext.triggers,
      added: ext.added,
      source_exists: await Bun.file(join(ext.source_path, "SKILL.md")).exists(),
    })),
  );

  const result: ListResult = {
    skills,
    agents,
    external_skills: externalSkillEntries,
    total: skills.length,
    installed: skills.filter((s) => s.installed).length,
    missing: skills.filter((s) => !s.installed).length,
  };

  // NDJSON mode: one JSON object per line for streaming consumption
  // Writes directly to stdout to bypass the envelope formatting — each line is a standalone JSON object
  if (wantsNdjson) {
    for (const skill of skills) {
      writeStdout(JSON.stringify(skill));
    }
    // Return result with empty display so cli.ts doesn't double-output
    return ok(result, "");
  }

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

  // Show external skills
  if (externalSkillEntries.length > 0) {
    lines.push(bold("External Skills"));
    for (const ext of externalSkillEntries) {
      const status = ext.source_exists ? green("●") : yellow("●");
      lines.push(`  ${status} ${ext.name} ${dim(`[${ext.source_path}]`)}`);
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
