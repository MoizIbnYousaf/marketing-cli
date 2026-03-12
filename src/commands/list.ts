// mktg list — Show available skills with rich metadata
// Reads manifest + SKILL.md frontmatter, groups by category.
// Supports --category filter and --json output.

import { join, dirname } from "node:path";
import { ok, err, type CommandHandler, type SkillCategory } from "../types";
import { loadManifest, getInstallStatus } from "../core/skills";
import { bold, dim, green, red, yellow, isTTY } from "../core/output";

type SkillEntry = {
  readonly name: string;
  readonly description: string;
  readonly category: SkillCategory;
  readonly tier: "must-have" | "nice-to-have";
  readonly layer: string;
  readonly installed: boolean;
  readonly hasReferences: boolean;
  readonly hasWorkflows: boolean;
  readonly triggers: readonly string[];
  readonly reads: readonly string[];
  readonly writes: readonly string[];
};

type ListResult = {
  readonly skills: readonly SkillEntry[];
  readonly total: number;
  readonly installed: number;
  readonly missing: number;
  readonly categories: readonly string[];
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

const VALID_CATEGORIES = new Set<string>(CATEGORY_ORDER);

// Resolve package root for bundled skills
const getPackageRoot = (): string =>
  join(dirname(import.meta.dir), "..");

// Parse YAML frontmatter from SKILL.md content
const parseFrontmatter = (content: string): Record<string, string> => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) return {};

  const result: Record<string, string> = {};
  let currentKey = "";
  let currentValue = "";

  for (const line of match[1].split("\n")) {
    // Continuation line (indented or starts with folding indicator content)
    if (currentKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      currentValue += " " + line.trim();
      continue;
    }

    // Save previous key-value pair
    if (currentKey) {
      result[currentKey] = currentValue.trim();
    }

    // New key-value pair
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1]!;
      const rawVal = kvMatch[2]!.trim();
      // Handle folded (>) and literal (|) scalars — value continues on next lines
      currentValue = rawVal === ">" || rawVal === "|" ? "" : rawVal;
    } else {
      currentKey = "";
      currentValue = "";
    }
  }

  // Save last pair
  if (currentKey) {
    result[currentKey] = currentValue.trim();
  }

  return result;
};

// Read description from a skill's SKILL.md frontmatter
const readSkillDescription = async (skillName: string): Promise<string> => {
  const skillPath = join(getPackageRoot(), "skills", skillName, "SKILL.md");
  const file = Bun.file(skillPath);
  const exists = await file.exists();
  if (!exists) return "";

  const content = await file.text();
  const frontmatter = parseFrontmatter(content);
  return frontmatter["description"] ?? "";
};

// Check if a skill has a references/ directory with files
const hasReferencesDir = async (skillName: string): Promise<boolean> => {
  const refsDir = join(getPackageRoot(), "skills", skillName, "references");
  try {
    const glob = new Bun.Glob("*");
    for await (const _ of glob.scan(refsDir)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Check if a skill's SKILL.md contains workflow-like structure
const hasWorkflowContent = async (skillName: string): Promise<boolean> => {
  const skillPath = join(getPackageRoot(), "skills", skillName, "SKILL.md");
  const file = Bun.file(skillPath);
  const exists = await file.exists();
  if (!exists) return false;

  const content = await file.text();
  // Look for structured workflow indicators
  return /^##\s+(on activation|workflow|steps|process|execution)/im.test(content);
};

// Parse --category flag from args
const parseCategoryFilter = (
  args: readonly string[],
): string | null => {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--category" && args[i + 1]) {
      return args[i + 1]!;
    }
    if (arg.startsWith("--category=")) {
      return arg.slice(11);
    }
  }
  return null;
};

// Truncate description to a max length for TTY display
const truncate = (str: string, max: number): string =>
  str.length <= max ? str : str.slice(0, max - 1) + "\u2026";

export const handler: CommandHandler<ListResult> = async (args, flags) => {
  const categoryFilter = parseCategoryFilter(args);

  // Validate category filter
  if (categoryFilter && !VALID_CATEGORIES.has(categoryFilter)) {
    return err(
      "INVALID_CATEGORY",
      `Unknown category: '${categoryFilter}'`,
      [
        `Valid categories: ${CATEGORY_ORDER.join(", ")}`,
        "Run 'mktg list' to see all categories",
      ],
      2,
    );
  }

  const manifest = await loadManifest();
  const installStatus = await getInstallStatus(manifest);

  // Build enriched skill entries in parallel
  const skillEntries = Object.entries(manifest.skills);
  const skills: SkillEntry[] = await Promise.all(
    skillEntries.map(async ([name, meta]) => {
      const [description, hasRefs, hasWorkflows] = await Promise.all([
        readSkillDescription(name),
        hasReferencesDir(name),
        hasWorkflowContent(name),
      ]);

      return {
        name,
        description,
        category: meta.category,
        tier: meta.tier,
        layer: meta.layer,
        installed: installStatus[name]?.installed ?? false,
        hasReferences: hasRefs,
        hasWorkflows: hasWorkflows,
        triggers: meta.triggers,
        reads: meta.reads,
        writes: meta.writes,
      };
    }),
  );

  // Apply category filter
  const filtered = categoryFilter
    ? skills.filter((s) => s.category === categoryFilter)
    : skills;

  const allCategories = [...new Set(filtered.map((s) => s.category))];

  const result: ListResult = {
    skills: filtered,
    total: filtered.length,
    installed: filtered.filter((s) => s.installed).length,
    missing: filtered.filter((s) => !s.installed).length,
    categories: allCategories,
  };

  // JSON mode returns raw data
  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY mode: rich grouped display
  const lines: string[] = [];

  const filterLabel = categoryFilter
    ? ` [${CATEGORY_LABELS[categoryFilter as SkillCategory] ?? categoryFilter}]`
    : "";
  lines.push(
    bold(`mktg skills (${result.installed}/${result.total} installed)${filterLabel}`),
  );
  lines.push("");

  for (const category of CATEGORY_ORDER) {
    if (categoryFilter && category !== categoryFilter) continue;

    const categorySkills = filtered.filter((s) => s.category === category);
    if (categorySkills.length === 0) continue;

    lines.push(bold(CATEGORY_LABELS[category]));

    for (const skill of categorySkills) {
      const status = skill.installed ? green("\u25cf") : red("\u25cf");
      const tier =
        skill.tier === "nice-to-have" ? dim(" (optional)") : "";

      // Feature badges
      const badges: string[] = [];
      if (skill.hasReferences) badges.push(yellow("refs"));
      if (skill.hasWorkflows) badges.push(yellow("workflow"));
      const badgeStr =
        badges.length > 0 ? " " + dim("[") + badges.join(dim(", ")) + dim("]") : "";

      // Description (truncated for terminal)
      const desc = skill.description
        ? dim("  " + truncate(skill.description, 80))
        : "";

      lines.push(`  ${status} ${skill.name}${tier}${badgeStr}`);
      if (desc) lines.push(desc);
    }
    lines.push("");
  }

  // Show redirects (only in unfiltered view)
  if (!categoryFilter) {
    const redirects = Object.entries(manifest.redirects);
    if (redirects.length > 0) {
      lines.push(dim("Redirects (renamed/merged skills):"));
      for (const [from, to] of redirects) {
        lines.push(dim(`  ${from} \u2192 ${to}`));
      }
      lines.push("");
    }
  }

  return ok({ ...result, _display: lines.join("\n") } as unknown as ListResult);
};
