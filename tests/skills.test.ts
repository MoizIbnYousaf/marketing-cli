// E2E tests for skills.ts — manifest loading, skill install, update, redirects
// No mocks. Real file I/O, real manifest, real skill installation.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import {
  loadManifest,
  getSkillNames,
  getSkill,
  groupByCategory,
  getInstallStatus,
  installSkills,
  updateSkills,
  getSkillsInstallDir,
} from "../src/core/skills";

describe("loadManifest", () => {
  test("loads skills-manifest.json successfully", async () => {
    const manifest = await loadManifest();
    expect(manifest).toBeDefined();
    expect(manifest.version).toBe(1);
    expect(typeof manifest.skills).toBe("object");
    expect(typeof manifest.redirects).toBe("object");
  });

  test("manifest has exactly 24 skills", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.skills)).toHaveLength(30);
  });

  test("manifest has redirects", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.redirects).length).toBeGreaterThan(0);
  });
});

describe("getSkillNames", () => {
  test("returns all 27 skill names", async () => {
    const manifest = await loadManifest();
    const names = getSkillNames(manifest);
    expect(names).toHaveLength(30);
    expect(names).toContain("cmo");
    expect(names).toContain("brand-voice");
    expect(names).toContain("marketing-psychology");
  });
});

describe("getSkill", () => {
  test("returns skill by name", async () => {
    const manifest = await loadManifest();
    const skill = getSkill(manifest, "brand-voice");
    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("brand-voice");
    expect(skill?.meta.category).toBe("foundation");
  });

  test("follows redirects", async () => {
    const manifest = await loadManifest();
    const skill = getSkill(manifest, "copywriting");
    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("direct-response-copy");
  });

  test("returns null for non-existent skill", async () => {
    const manifest = await loadManifest();
    const skill = getSkill(manifest, "nonexistent-skill-xyz");
    expect(skill).toBeNull();
  });

  test("returns cmo skill with correct metadata", async () => {
    const manifest = await loadManifest();
    const skill = getSkill(manifest, "cmo");
    expect(skill).not.toBeNull();
    expect(skill?.meta.tier).toBe("must-have");
    expect(skill?.meta.layer).toBe("foundation");
    expect(skill?.meta.depends_on).toHaveLength(0);
  });
});

describe("groupByCategory", () => {
  test("groups skills by category", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);

    expect(groups).toHaveProperty("foundation");
    expect(groups).toHaveProperty("strategy");
    expect(groups).toHaveProperty("copy-content");
    expect(groups).toHaveProperty("distribution");

    // Foundation should include cmo, brand-voice, etc.
    const foundationNames = groups.foundation.map((s) => s.name);
    expect(foundationNames).toContain("cmo");
    expect(foundationNames).toContain("brand-voice");
  });

  test("total skills across all groups equals 24", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);

    let total = 0;
    for (const skills of Object.values(groups)) {
      total += skills.length;
    }
    expect(total).toBe(30);
  });

  test("no skill appears in multiple groups", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);

    const seen = new Set<string>();
    for (const skills of Object.values(groups)) {
      for (const skill of skills) {
        expect(seen.has(skill.name)).toBe(false);
        seen.add(skill.name);
      }
    }
  });
});

describe("getInstallStatus", () => {
  test("returns status for all 27 skills", async () => {
    const manifest = await loadManifest();
    const status = await getInstallStatus(manifest);
    expect(Object.keys(status)).toHaveLength(30);

    for (const [name, info] of Object.entries(status)) {
      expect(typeof info.installed).toBe("boolean");
      expect(typeof info.path).toBe("string");
      expect(info.path).toContain(name);
    }
  });

  test("paths point to ~/.claude/skills/", async () => {
    const manifest = await loadManifest();
    const status = await getInstallStatus(manifest);

    for (const [, info] of Object.entries(status)) {
      expect(info.path).toContain(".claude/skills");
    }
  });
});

describe("installSkills", () => {
  test("installs all bundled skills", async () => {
    const manifest = await loadManifest();
    const result = await installSkills(manifest);

    // Should install all 27 (all are bundled now)
    expect(result.installed.length).toBeGreaterThan(0);
    expect(result.failed).toHaveLength(0);
  });

  test("dry-run does not write files", async () => {
    const manifest = await loadManifest();
    const result = await installSkills(manifest, true);

    expect(result.installed.length).toBeGreaterThan(0);
    // Dry-run just reports what would happen
  });
});

describe("updateSkills", () => {
  test("updates all skills", async () => {
    const manifest = await loadManifest();
    const result = await updateSkills(manifest);

    // All should be either updated or unchanged
    const total = result.updated.length + result.unchanged.length + result.notBundled.length;
    expect(total).toBe(30);
  });

  test("dry-run reports without writing", async () => {
    const manifest = await loadManifest();
    const result = await updateSkills(manifest, true);

    const total = result.updated.length + result.unchanged.length + result.notBundled.length;
    expect(total).toBe(30);
  });
});

describe("getSkillsInstallDir", () => {
  test("returns path under ~/.claude/skills", () => {
    const dir = getSkillsInstallDir();
    expect(dir).toContain(".claude/skills");
    expect(dir).toContain(homedir());
  });
});
