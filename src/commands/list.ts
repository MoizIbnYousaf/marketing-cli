// mktg list — Show available skills with status
// Reads from skills-manifest.json, groups by category, shows installed/missing.

import { ok, type CommandHandler, type SkillCategory } from "../types";
import { loadManifest, getInstallStatus } from "../core/skills";
import { bold, dim, green, red, isTTY } from "../core/output";

type SkillEntry = {
  readonly name: string;
  readonly category: SkillCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly layer: string;
  readonly installed: boolean;
  readonly triggers: readonly string[];
};

type ListResult = {
  readonly skills: readonly SkillEntry[];
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
  const installStatus = await getInstallStatus(manifest);

  const skills: SkillEntry[] = Object.entries(manifest.skills).map(
    ([name, meta]) => ({
      name,
      category: meta.category,
      tier: meta.tier,
      layer: meta.layer,
      installed: installStatus[name]?.installed ?? false,
      triggers: meta.triggers,
    }),
  );

  const result: ListResult = {
    skills,
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

  // Show redirects
  const redirects = Object.entries(manifest.redirects);
  if (redirects.length > 0) {
    lines.push(dim("Redirects (renamed/merged skills):"));
    for (const [from, to] of redirects) {
      lines.push(dim(`  ${from} → ${to}`));
    }
    lines.push("");
  }

  return ok({ ...result, _display: lines.join("\n") } as unknown as ListResult);
};
