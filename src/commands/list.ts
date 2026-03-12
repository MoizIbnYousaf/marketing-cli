// mktg list — Show available skills with status
// Uses the skill registry to discover and display skills from SKILL.md frontmatter.
// Falls back to skills-manifest.json for install status and redirects.

import { ok, type CommandHandler, type SkillCategory } from "../types.js";
import { loadManifest, getInstallStatus } from "../core/skills.js";
import { bold, dim, green, red, yellow, isTTY } from "../core/output.js";
import { buildRegistry, type RegistryEntry } from "../lib/registry.js";

type SkillEntry = {
  readonly name: string;
  readonly category: string;
  readonly tier: string;
  readonly description: string;
  readonly installed: boolean;
  readonly triggers: readonly string[];
  readonly valid: boolean;
};

type ListResult = {
  readonly skills: readonly SkillEntry[];
  readonly total: number;
  readonly installed: number;
  readonly missing: number;
  readonly invalid: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  foundation: "Foundation",
  brand: "Brand",
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

const getCategoryLabel = (cat: string): string =>
  CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);

export const handler: CommandHandler<ListResult> = async (_args, flags) => {
  const [registry, manifest] = await Promise.all([
    buildRegistry(),
    loadManifest(),
  ]);
  const installStatus = await getInstallStatus(manifest);

  const skills: SkillEntry[] = registry.skills.map((entry: RegistryEntry) => ({
    name: entry.name,
    category: entry.frontmatter.category,
    tier: entry.frontmatter.tier,
    description: entry.frontmatter.description,
    installed: installStatus[entry.name]?.installed ?? false,
    triggers: entry.frontmatter.triggers,
    valid: entry.valid,
  }));

  const result: ListResult = {
    skills,
    total: skills.length,
    installed: skills.filter((s) => s.installed).length,
    missing: skills.filter((s) => !s.installed).length,
    invalid: registry.invalid,
  };

  // JSON mode returns raw data
  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY mode: grouped display
  const lines: string[] = [];
  lines.push(bold(`mktg skills (${result.installed}/${result.total} installed)`));
  lines.push("");

  // Group skills by category from frontmatter
  const categories = new Map<string, SkillEntry[]>();
  for (const skill of skills) {
    const cat = skill.category || "uncategorized";
    const group = categories.get(cat) ?? [];
    group.push(skill);
    categories.set(cat, group);
  }

  // Display known categories in order first, then any extras
  const displayedCategories = new Set<string>();

  for (const category of CATEGORY_ORDER) {
    const categorySkills = categories.get(category);
    if (!categorySkills || categorySkills.length === 0) continue;
    displayedCategories.add(category);

    lines.push(bold(getCategoryLabel(category)));
    for (const skill of categorySkills) {
      lines.push(formatSkillLine(skill));
    }
    lines.push("");
  }

  // Show remaining categories not in CATEGORY_ORDER
  for (const [category, categorySkills] of categories) {
    if (displayedCategories.has(category)) continue;

    lines.push(bold(getCategoryLabel(category)));
    for (const skill of categorySkills) {
      lines.push(formatSkillLine(skill));
    }
    lines.push("");
  }

  // Show validation warnings
  if (result.invalid > 0) {
    const invalidSkills = skills.filter((s) => !s.valid);
    lines.push(yellow(`${result.invalid} skill(s) with validation issues:`));
    for (const skill of invalidSkills) {
      lines.push(yellow(`  ! ${skill.name}`));
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

const formatSkillLine = (skill: SkillEntry): string => {
  const status = skill.installed ? green("●") : red("●");
  const tier = skill.tier === "nice-to-have" ? dim(" (optional)") : "";
  const validity = skill.valid ? "" : yellow(" !");
  return `  ${status} ${skill.name}${tier}${validity}`;
};
