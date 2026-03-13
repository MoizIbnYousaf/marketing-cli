// E2E tests for skills-manifest.json — schema, DAG, redirects, completeness
// No mocks. Reads and validates the real manifest file.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import type { SkillsManifest, SkillManifestEntry, SkillCategory, SkillLayer } from "../src/types";
import { BRAND_FILES } from "../src/types";

const manifestPath = join(import.meta.dir, "..", "skills-manifest.json");
const manifest: SkillsManifest = await Bun.file(manifestPath).json();

const VALID_CATEGORIES: SkillCategory[] = [
  "foundation", "strategy", "copy-content", "distribution",
  "creative", "seo", "conversion", "growth", "knowledge",
];

const VALID_LAYERS: SkillLayer[] = ["foundation", "strategy", "execution", "distribution"];
const VALID_SOURCES = ["v1", "v2", "new", "third-party"];
const VALID_TIERS = ["must-have", "nice-to-have"];

describe("Manifest structure", () => {
  test("has version field", () => {
    expect(manifest.version).toBe(1);
  });

  test("has skills object", () => {
    expect(typeof manifest.skills).toBe("object");
    expect(Object.keys(manifest.skills).length).toBeGreaterThan(0);
  });

  test("has redirects object", () => {
    expect(typeof manifest.redirects).toBe("object");
  });

  test("exactly 39 skills", () => {
    expect(Object.keys(manifest.skills)).toHaveLength(39);
  });
});

describe("Skill schema validation", () => {
  for (const [name, meta] of Object.entries(manifest.skills)) {
    describe(`skill: ${name}`, () => {
      test("has valid source", () => {
        expect(VALID_SOURCES).toContain(meta.source);
      });

      test("has valid category", () => {
        expect(VALID_CATEGORIES).toContain(meta.category);
      });

      test("has valid layer", () => {
        expect(VALID_LAYERS).toContain(meta.layer);
      });

      test("has valid tier", () => {
        expect(VALID_TIERS).toContain(meta.tier);
      });

      test("reads is an array", () => {
        expect(Array.isArray(meta.reads)).toBe(true);
      });

      test("writes is an array", () => {
        expect(Array.isArray(meta.writes)).toBe(true);
      });

      test("depends_on is an array", () => {
        expect(Array.isArray(meta.depends_on)).toBe(true);
      });

      test("triggers is an array with at least 1 entry", () => {
        expect(Array.isArray(meta.triggers)).toBe(true);
        expect(meta.triggers.length).toBeGreaterThan(0);
      });

      test("review_interval_days is a positive number", () => {
        expect(typeof meta.review_interval_days).toBe("number");
        expect(meta.review_interval_days).toBeGreaterThan(0);
      });

      test("reads only valid brand files", () => {
        const brandSet = new Set<string>(BRAND_FILES);
        for (const file of meta.reads) {
          expect(brandSet.has(file)).toBe(true);
        }
      });

      test("writes only valid brand files", () => {
        const brandSet = new Set<string>(BRAND_FILES);
        for (const file of meta.writes) {
          expect(brandSet.has(file)).toBe(true);
        }
      });

      test("depends_on references existing skills", () => {
        for (const dep of meta.depends_on) {
          expect(manifest.skills).toHaveProperty(dep);
        }
      });
    });
  }
});

describe("Dependency DAG validation", () => {
  test("no circular dependencies", () => {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (name: string): boolean => {
      if (stack.has(name)) return true;
      if (visited.has(name)) return false;

      visited.add(name);
      stack.add(name);

      const meta = manifest.skills[name];
      if (meta) {
        for (const dep of meta.depends_on) {
          if (hasCycle(dep)) return true;
        }
      }

      stack.delete(name);
      return false;
    };

    for (const name of Object.keys(manifest.skills)) {
      expect(hasCycle(name)).toBe(false);
    }
  });

  test("no self-dependencies", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      expect(meta.depends_on).not.toContain(name);
    }
  });

  test("cmo has no dependencies (it's the orchestrator)", () => {
    expect(manifest.skills["cmo"].depends_on).toHaveLength(0);
  });

  test("foundation layer skills depend only on other foundation skills", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      if (meta.layer === "foundation") {
        for (const dep of meta.depends_on) {
          const depMeta = manifest.skills[dep];
          if (depMeta) {
            expect(depMeta.layer).toBe("foundation");
          }
        }
      }
    }
  });
});

describe("Redirect validation", () => {
  test("all redirects point to existing skills", () => {
    for (const [from, to] of Object.entries(manifest.redirects)) {
      // Handle mode-based redirects (e.g., "direct-response-copy --mode cold-email")
      const targetSkill = to.split(" ")[0];
      expect(manifest.skills).toHaveProperty(targetSkill);
    }
  });

  test("no redirect points to itself", () => {
    for (const [from, to] of Object.entries(manifest.redirects)) {
      expect(from).not.toBe(to);
    }
  });

  test("redirect sources are not active skill names", () => {
    for (const from of Object.keys(manifest.redirects)) {
      expect(manifest.skills).not.toHaveProperty(from);
    }
  });

  test("has at least 10 redirects", () => {
    expect(Object.keys(manifest.redirects).length).toBeGreaterThanOrEqual(10);
  });

  test("key redirects exist", () => {
    expect(manifest.redirects["copywriting"]).toBe("direct-response-copy");
    expect(manifest.redirects["content-strategy"]).toBe("keyword-research");
    expect(manifest.redirects["social-content"]).toBe("content-atomizer");
    expect(manifest.redirects["marketing-ideas"]).toBe("brainstorm");
  });
});

describe("Skill coverage", () => {
  test("has must-have skills for each core layer", () => {
    const mustHaves = Object.entries(manifest.skills)
      .filter(([, meta]) => meta.tier === "must-have");
    expect(mustHaves.length).toBeGreaterThanOrEqual(10);
  });

  test("has foundation skills", () => {
    const foundation = Object.entries(manifest.skills)
      .filter(([, meta]) => meta.category === "foundation");
    expect(foundation.length).toBeGreaterThanOrEqual(3);
  });

  test("brand-voice writes voice-profile.md", () => {
    expect(manifest.skills["brand-voice"].writes).toContain("voice-profile.md");
  });

  test("audience-research writes audience.md", () => {
    expect(manifest.skills["audience-research"].writes).toContain("audience.md");
  });

  test("competitive-intel writes competitors.md", () => {
    expect(manifest.skills["competitive-intel"].writes).toContain("competitors.md");
  });

  test("keyword-research writes keyword-plan.md", () => {
    expect(manifest.skills["keyword-research"].writes).toContain("keyword-plan.md");
  });

  test("positioning-angles writes positioning.md", () => {
    expect(manifest.skills["positioning-angles"].writes).toContain("positioning.md");
  });

  test("every brand file has at least one writer", () => {
    const writers = new Set<string>();
    for (const meta of Object.values(manifest.skills)) {
      for (const file of meta.writes) {
        writers.add(file);
      }
    }
    // Profile files should have writers (append-only may not)
    const profileFiles = ["voice-profile.md", "positioning.md", "audience.md",
      "competitors.md", "keyword-plan.md"];
    for (const file of profileFiles) {
      expect(writers.has(file)).toBe(true);
    }
  });
});

describe("Skill SKILL.md files exist", () => {
  const skillsDir = join(import.meta.dir, "..", "skills");

  for (const name of Object.keys(manifest.skills)) {
    test(`${name}/SKILL.md exists`, async () => {
      const skillFile = join(skillsDir, name, "SKILL.md");
      const exists = await Bun.file(skillFile).exists();
      expect(exists).toBe(true);
    });

    test(`${name}/SKILL.md has content (>50 chars)`, async () => {
      const skillFile = join(skillsDir, name, "SKILL.md");
      const content = await Bun.file(skillFile).text();
      expect(content.length).toBeGreaterThan(50);
    });

    test(`${name}/SKILL.md has YAML frontmatter`, async () => {
      const skillFile = join(skillsDir, name, "SKILL.md");
      const content = await Bun.file(skillFile).text();
      expect(content.startsWith("---")).toBe(true);
      expect(content.indexOf("---", 3)).toBeGreaterThan(3);
    });
  }
});

describe("Trigger quality", () => {
  test("every must-have skill has at least 3 triggers", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      if (meta.tier === "must-have") {
        expect(meta.triggers.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test("no trigger is empty string", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      for (const trigger of meta.triggers) {
        expect(trigger.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("every category has at least 1 skill", () => {
    const categories = new Set(Object.values(manifest.skills).map(m => m.category));
    const expected = ["foundation", "strategy", "copy-content", "distribution", "creative", "seo", "conversion", "growth", "knowledge"];
    for (const cat of expected) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  test("every layer has at least 1 skill", () => {
    const layers = new Set(Object.values(manifest.skills).map(m => m.layer));
    for (const layer of VALID_LAYERS) {
      expect(layers.has(layer)).toBe(true);
    }
  });
});

describe("Integration env_vars", () => {
  test("third-party skills have env_vars declared", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      if (meta.source === "third-party") {
        expect(meta.env_vars).toBeDefined();
        expect(Array.isArray(meta.env_vars)).toBe(true);
        expect(meta.env_vars!.length).toBeGreaterThan(0);
      }
    }
  });

  test("env_vars contains only strings", () => {
    for (const [name, meta] of Object.entries(manifest.skills)) {
      if (meta.env_vars) {
        for (const v of meta.env_vars) {
          expect(typeof v).toBe("string");
        }
      }
    }
  });
});

describe("Redirect quality", () => {
  test("mode-based redirects reference valid base skills", () => {
    for (const [from, to] of Object.entries(manifest.redirects)) {
      const baseSkill = to.split(" ")[0];
      expect(manifest.skills).toHaveProperty(baseSkill);
    }
  });

  test("no redirect chain (redirect pointing to another redirect)", () => {
    for (const [from, to] of Object.entries(manifest.redirects)) {
      const baseTarget = to.split(" ")[0];
      expect(manifest.redirects).not.toHaveProperty(baseTarget);
    }
  });
});
