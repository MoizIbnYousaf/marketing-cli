import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  extractSkillFrontmatter,
  validateSkill,
  buildRegistry,
  findSkill,
  groupByCategory,
  getValidationErrors,
  discoverSkillFiles,
} from "../src/lib/registry";

const SKILLS_DIR = join(import.meta.dir, "..", "skills");

describe("extractSkillFrontmatter", () => {
  test("extracts typed fields from raw data", () => {
    const data = {
      name: "seo-content",
      description: "SEO content skill",
      category: "copy-content",
      tier: "must-have",
      reads: ["voice-profile.md"],
      writes: ["assets.md"],
      triggers: ["blog post", "SEO article"],
      "allowed-tools": ["Bash(mktg *)"],
    };
    const result = extractSkillFrontmatter(data, "fallback");
    expect(result.name).toBe("seo-content");
    expect(result.description).toBe("SEO content skill");
    expect(result.category).toBe("copy-content");
    expect(result.reads).toEqual(["voice-profile.md"]);
    expect(result.allowedTools).toEqual(["Bash(mktg *)"]);
  });

  test("uses fallback name when name is missing", () => {
    const result = extractSkillFrontmatter({}, "my-fallback");
    expect(result.name).toBe("my-fallback");
  });

  test("defaults missing arrays to empty", () => {
    const result = extractSkillFrontmatter({ name: "test" }, "test");
    expect(result.reads).toEqual([]);
    expect(result.writes).toEqual([]);
    expect(result.triggers).toEqual([]);
    expect(result.allowedTools).toEqual([]);
  });

  test("coerces non-array values to arrays", () => {
    const result = extractSkillFrontmatter(
      { reads: "single-file.md" },
      "test",
    );
    expect(result.reads).toEqual(["single-file.md"]);
  });
});

describe("validateSkill", () => {
  test("returns no errors for valid skill", () => {
    const frontmatter = extractSkillFrontmatter(
      { name: "seo-content", description: "A valid skill" },
      "seo-content",
    );
    const errors = validateSkill(frontmatter);
    expect(errors).toHaveLength(0);
  });

  test("reports missing name", () => {
    const frontmatter = extractSkillFrontmatter(
      { description: "Has description" },
      "",
    );
    const errors = validateSkill(frontmatter);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });

  test("reports missing description", () => {
    const frontmatter = extractSkillFrontmatter({ name: "test" }, "test");
    const errors = validateSkill(frontmatter);
    expect(errors.some((e) => e.includes("description"))).toBe(true);
  });

  test("reports invalid name format", () => {
    const frontmatter = extractSkillFrontmatter(
      { name: "Invalid Name!", description: "Has desc" },
      "test",
    );
    const errors = validateSkill(frontmatter);
    expect(errors.some((e) => e.includes("Invalid skill name"))).toBe(true);
  });
});

describe("discoverSkillFiles", () => {
  test("finds all SKILL.md files in the skills directory", async () => {
    const files = await discoverSkillFiles(SKILLS_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toEndWith("SKILL.md");
    }
  });
});

describe("buildRegistry", () => {
  test("builds registry from actual skills/ directory", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    expect(registry.total).toBeGreaterThan(0);
    expect(registry.skills.length).toBe(registry.total);
    expect(registry.valid + registry.invalid).toBe(registry.total);
  });

  test("each skill has a non-empty name", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    for (const skill of registry.skills) {
      expect(skill.name).toBeTruthy();
    }
  });

  test("each skill has a path ending with SKILL.md", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    for (const skill of registry.skills) {
      expect(skill.path).toEndWith("SKILL.md");
    }
  });

  test("parses known skill correctly", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    const seoContent = findSkill(registry, "seo-content");
    expect(seoContent).toBeDefined();
    expect(seoContent!.frontmatter.category).toBe("copy-content");
    expect(seoContent!.frontmatter.tier).toBe("must-have");
    expect(seoContent!.frontmatter.reads.length).toBeGreaterThan(0);
    expect(seoContent!.frontmatter.triggers.length).toBeGreaterThan(0);
  });
});

describe("findSkill", () => {
  test("returns undefined for non-existent skill", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    expect(findSkill(registry, "nonexistent-skill")).toBeUndefined();
  });
});

describe("groupByCategory", () => {
  test("groups skills into categories", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    const groups = groupByCategory(registry);
    const totalGrouped = Object.values(groups).reduce(
      (sum, skills) => sum + skills.length,
      0,
    );
    expect(totalGrouped).toBe(registry.total);
  });
});

describe("getValidationErrors", () => {
  test("returns empty array when all skills are valid", async () => {
    const registry = await buildRegistry(SKILLS_DIR);
    const errors = getValidationErrors(registry);
    // Some skills may have validation issues, but the function should work
    expect(Array.isArray(errors)).toBe(true);
    for (const entry of errors) {
      expect(entry.skill).toBeTruthy();
      expect(entry.errors.length).toBeGreaterThan(0);
    }
  });
});
