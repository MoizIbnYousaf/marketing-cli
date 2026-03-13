import manifest from "../../skills-manifest.json";

const categoryDefinitions = [
  { id: "foundation", label: "Foundation" },
  { id: "strategy", label: "Strategy" },
  { id: "copy-content", label: "Copy & Content" },
  { id: "distribution", label: "Distribution" },
  { id: "creative", label: "Creative" },
  { id: "seo", label: "SEO" },
  { id: "conversion", label: "Conversion" },
  { id: "growth", label: "Growth" },
  { id: "knowledge", label: "Knowledge" },
] as const;

type SkillCategoryId = (typeof categoryDefinitions)[number]["id"];

type ManifestSkill = {
  category: SkillCategoryId;
  tier: "must-have" | "nice-to-have";
  triggers: string[];
  depends_on: string[];
};

type SkillsManifest = {
  skills: Record<string, ManifestSkill>;
};

const skillsManifest = manifest as SkillsManifest;

const categoryLabelById = Object.fromEntries(
  categoryDefinitions.map((category) => [category.id, category.label]),
) as Record<SkillCategoryId, string>;

const sanitizeTrigger = (trigger: string) =>
  trigger.replace(/^TODO\(human\)\s+—\s+/, "").trim();

const createSummary = (triggers: string[]) => {
  const hintList = triggers.slice(0, 3).join(", ");

  return `Best for: ${hintList}.`;
};

export const SKILL_CATEGORIES = [
  { id: "all", label: "All" },
  ...categoryDefinitions,
] as const;

export type SkillsCatalogCategory = (typeof SKILL_CATEGORIES)[number]["id"];

export type SkillsCatalogItem = {
  slug: string;
  name: string;
  category: SkillCategoryId;
  categoryLabel: string;
  tier: ManifestSkill["tier"];
  triggers: string[];
  dependencies: string[];
  summary: string;
};

export const SKILLS: SkillsCatalogItem[] = Object.entries(skillsManifest.skills).map(
  ([slug, skill]) => {
    const triggers = skill.triggers.map(sanitizeTrigger);

    return {
      slug,
      name: slug,
      category: skill.category,
      categoryLabel: categoryLabelById[skill.category],
      tier: skill.tier,
      triggers,
      dependencies: skill.depends_on,
      summary: createSummary(triggers),
    };
  },
);

export const getSkillsForCategory = (category: SkillsCatalogCategory) =>
  category === "all"
    ? SKILLS
    : SKILLS.filter((skill) => skill.category === category);
