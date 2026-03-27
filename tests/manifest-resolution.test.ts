// Tests for parseManifest, mergeManifests, resolveManifest
// No mocks. Real file I/O in isolated temp dirs.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  parseManifest,
  mergeManifests,
  resolveManifest,
  loadManifest,
  readManifest,
  getSkillNames,
} from "../src/core/skills";
import type { SkillsManifest } from "../src/types";

// ---------- parseManifest ----------

describe("parseManifest", () => {
  test("returns valid manifest for well-formed input with version, skills, redirects", () => {
    const input = {
      version: 1,
      skills: {
        "test-skill": {
          source: "v2",
          category: "foundation",
          layer: "foundation",
          tier: "must-have",
          reads: [],
          writes: [],
          depends_on: [],
          triggers: [],
          review_interval_days: 30,
        },
      },
      redirects: { old: "new" },
    };
    const result = parseManifest(input);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.skills["test-skill"]).toBeDefined();
    expect(result!.redirects).toEqual({ old: "new" });
  });

  test("returns valid manifest for input with missing redirects (defaults to {})", () => {
    const input = {
      version: 1,
      skills: { "s1": { source: "v2", category: "foundation", layer: "foundation", tier: "must-have", reads: [], writes: [], depends_on: [], triggers: [], review_interval_days: 30 } },
    };
    const result = parseManifest(input);
    expect(result).not.toBeNull();
    expect(result!.redirects).toEqual({});
  });

  test("returns null for null", () => {
    expect(parseManifest(null)).toBeNull();
  });

  test("returns null for undefined", () => {
    expect(parseManifest(undefined)).toBeNull();
  });

  test("returns null for string", () => {
    expect(parseManifest("hello")).toBeNull();
  });

  test("returns null for number", () => {
    expect(parseManifest(42)).toBeNull();
  });

  test("returns null for array", () => {
    expect(parseManifest([1, 2, 3])).toBeNull();
  });

  test("returns null for object missing version", () => {
    expect(parseManifest({ skills: {} })).toBeNull();
  });

  test("returns null for object with string version", () => {
    expect(parseManifest({ version: "1", skills: {} })).toBeNull();
  });

  test("returns null for object missing skills", () => {
    expect(parseManifest({ version: 1 })).toBeNull();
  });

  test("accepts skills as array (typeof array === 'object' in JS)", () => {
    // parseManifest only checks typeof skills !== "object" — arrays pass this check
    const result = parseManifest({ version: 1, skills: [1, 2] });
    expect(result).not.toBeNull();
  });

  test("returns null for empty object {}", () => {
    expect(parseManifest({})).toBeNull();
  });

  test("returns null for boolean", () => {
    expect(parseManifest(true)).toBeNull();
    expect(parseManifest(false)).toBeNull();
  });

  test("version 0 is valid", () => {
    const result = parseManifest({ version: 0, skills: {} });
    expect(result).not.toBeNull();
    expect(result!.version).toBe(0);
  });

  test("empty skills object is valid", () => {
    const result = parseManifest({ version: 1, skills: {} });
    expect(result).not.toBeNull();
    expect(Object.keys(result!.skills)).toHaveLength(0);
  });
});

// ---------- mergeManifests ----------

describe("mergeManifests", () => {
  const makeSkillEntry = (name: string) => ({
    source: "v2" as const,
    category: "foundation" as const,
    layer: "foundation" as const,
    tier: "must-have" as const,
    reads: [] as string[],
    writes: [] as string[],
    depends_on: [] as string[],
    triggers: [] as string[],
    review_interval_days: 30,
  });

  const base: SkillsManifest = {
    version: 1,
    skills: {
      "skill-a": makeSkillEntry("skill-a"),
      "skill-b": makeSkillEntry("skill-b"),
    },
    redirects: { "old-name": "skill-a" },
  };

  test("adds project skill not in base", () => {
    const project: SkillsManifest = {
      version: 2,
      skills: { "project-skill": makeSkillEntry("project-skill") },
      redirects: {},
    };
    const merged = mergeManifests(base, project);
    expect(merged.skills["project-skill"]).toBeDefined();
  });

  test("does NOT override base skill with same name (CRITICAL SECURITY TEST)", () => {
    const overrideEntry = { ...makeSkillEntry("skill-a"), review_interval_days: 999 };
    const project: SkillsManifest = {
      version: 2,
      skills: { "skill-a": overrideEntry },
      redirects: {},
    };
    const merged = mergeManifests(base, project);
    expect(merged.skills["skill-a"]!.review_interval_days).toBe(30);
    expect(merged.skills["skill-a"]!.review_interval_days).not.toBe(999);
  });

  test("ignores project redirects entirely", () => {
    const project: SkillsManifest = {
      version: 2,
      skills: {},
      redirects: { "proj-old": "proj-new" },
    };
    const merged = mergeManifests(base, project);
    expect(merged.redirects).toEqual(base.redirects);
    expect(merged.redirects["proj-old"]).toBeUndefined();
  });

  test("uses base version", () => {
    const project: SkillsManifest = {
      version: 99,
      skills: { "new-skill": makeSkillEntry("new-skill") },
      redirects: {},
    };
    const merged = mergeManifests(base, project);
    expect(merged.version).toBe(1);
  });

  test("handles empty project skills", () => {
    const project: SkillsManifest = { version: 2, skills: {}, redirects: {} };
    const merged = mergeManifests(base, project);
    expect(Object.keys(merged.skills)).toHaveLength(2);
    expect(merged.skills["skill-a"]).toBeDefined();
    expect(merged.skills["skill-b"]).toBeDefined();
  });

  test("handles multiple new project skills", () => {
    const project: SkillsManifest = {
      version: 2,
      skills: {
        "proj-1": makeSkillEntry("proj-1"),
        "proj-2": makeSkillEntry("proj-2"),
        "proj-3": makeSkillEntry("proj-3"),
      },
      redirects: {},
    };
    const merged = mergeManifests(base, project);
    expect(Object.keys(merged.skills)).toHaveLength(5);
  });

  test("preserves all base skills unchanged", () => {
    const project: SkillsManifest = {
      version: 2,
      skills: { "new-skill": makeSkillEntry("new-skill") },
      redirects: {},
    };
    const merged = mergeManifests(base, project);
    expect(merged.skills["skill-a"]).toEqual(base.skills["skill-a"]);
    expect(merged.skills["skill-b"]).toEqual(base.skills["skill-b"]);
  });

  test("base with redirects preserved when project also has redirects", () => {
    const project: SkillsManifest = {
      version: 2,
      skills: {},
      redirects: { "should-be-ignored": "ignored" },
    };
    const merged = mergeManifests(base, project);
    expect(merged.redirects).toEqual({ "old-name": "skill-a" });
  });
});

// ---------- resolveManifest ----------

describe("resolveManifest", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-resolve-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns package manifest when cwd has no skills-manifest.json", async () => {
    const result = await resolveManifest(tmpDir);
    expect(result).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.skills).toBeDefined();
    expect(Object.keys(result.skills).length).toBeGreaterThan(0);
  });

  test("returns merged manifest when cwd has valid project manifest with new skills", async () => {
    const projectManifest = {
      version: 1,
      skills: {
        "custom-project-skill": {
          source: "new",
          category: "foundation",
          layer: "foundation",
          tier: "nice-to-have",
          reads: [],
          writes: [],
          depends_on: [],
          triggers: [],
          review_interval_days: 14,
        },
      },
      redirects: {},
    };
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify(projectManifest));

    const result = await resolveManifest(tmpDir);
    expect(result.skills["custom-project-skill"]).toBeDefined();
  });

  test("falls back to package manifest when project manifest is invalid JSON", async () => {
    await writeFile(join(tmpDir, "skills-manifest.json"), "not valid json {{{");
    const result = await resolveManifest(tmpDir);
    expect(result.version).toBeDefined();
    expect(Object.keys(result.skills).length).toBeGreaterThan(0);
  });

  test("falls back when project manifest fails parseManifest validation", async () => {
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify({ skills: {} }));
    const result = await resolveManifest(tmpDir);
    expect(result.version).toBeDefined();
    expect(Object.keys(result.skills).length).toBeGreaterThan(0);
  });

  test("project skills appear in merged result", async () => {
    const projectManifest = {
      version: 1,
      skills: {
        "my-custom-skill": {
          source: "new",
          category: "strategy",
          layer: "strategy",
          tier: "must-have",
          reads: ["voice-profile.md"],
          writes: [],
          depends_on: [],
          triggers: [],
          review_interval_days: 7,
        },
      },
      redirects: {},
    };
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify(projectManifest));

    const result = await resolveManifest(tmpDir);
    expect(result.skills["my-custom-skill"]).toBeDefined();
    expect(result.skills["my-custom-skill"]!.category).toBe("strategy");
  });

  test("project cannot override existing package skill", async () => {
    const packageManifest = await loadManifest();
    const existingSkillName = Object.keys(packageManifest.skills)[0]!;

    const projectManifest = {
      version: 1,
      skills: {
        [existingSkillName]: {
          source: "new",
          category: "growth",
          layer: "execution",
          tier: "nice-to-have",
          reads: [],
          writes: [],
          depends_on: [],
          triggers: [],
          review_interval_days: 999,
        },
      },
      redirects: {},
    };
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify(projectManifest));

    const result = await resolveManifest(tmpDir);
    expect(result.skills[existingSkillName]!.review_interval_days).not.toBe(999);
  });

  test("real package manifest has 42 skills", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.skills)).toHaveLength(42);
  });

  test("project with 1 new skill results in 43 total skills", async () => {
    const projectManifest = {
      version: 1,
      skills: {
        "extra-skill": {
          source: "new",
          category: "foundation",
          layer: "foundation",
          tier: "nice-to-have",
          reads: [],
          writes: [],
          depends_on: [],
          triggers: [],
          review_interval_days: 30,
        },
      },
      redirects: {},
    };
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify(projectManifest));

    const result = await resolveManifest(tmpDir);
    expect(Object.keys(result.skills)).toHaveLength(43);
  });
});

// ---------- loadManifest + readManifest ----------

describe("loadManifest", () => {
  test("returns manifest with version, skills, and redirects", async () => {
    const manifest = await loadManifest();
    expect(typeof manifest.version).toBe("number");
    expect(typeof manifest.skills).toBe("object");
    expect(typeof manifest.redirects).toBe("object");
  });

  test("returned manifest has expected skill count", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.skills).length).toBeGreaterThanOrEqual(30);
  });

  test("each skill has required fields", async () => {
    const manifest = await loadManifest();
    for (const [, entry] of Object.entries(manifest.skills)) {
      expect(typeof entry.source).toBe("string");
      expect(typeof entry.category).toBe("string");
      expect(typeof entry.layer).toBe("string");
      expect(typeof entry.tier).toBe("string");
      expect(Array.isArray(entry.reads)).toBe(true);
      expect(Array.isArray(entry.writes)).toBe(true);
      expect(Array.isArray(entry.depends_on)).toBe(true);
      expect(Array.isArray(entry.triggers)).toBe(true);
      expect(typeof entry.review_interval_days).toBe("number");
    }
  });
});

describe("readManifest (sync)", () => {
  test("returns same data as loadManifest", async () => {
    const asyncManifest = await loadManifest();
    const syncManifest = readManifest();
    expect(Object.keys(syncManifest.skills).length).toBe(Object.keys(asyncManifest.skills).length);
    expect(syncManifest.version).toBe(asyncManifest.version);
  });
});

describe("getSkillNames", () => {
  test("returns array of strings", async () => {
    const manifest = await loadManifest();
    const names = getSkillNames(manifest);
    expect(Array.isArray(names)).toBe(true);
    for (const name of names) {
      expect(typeof name).toBe("string");
    }
  });

  test("count matches skills object keys", async () => {
    const manifest = await loadManifest();
    const names = getSkillNames(manifest);
    expect(names.length).toBe(Object.keys(manifest.skills).length);
  });
});
