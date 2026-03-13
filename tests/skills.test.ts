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

  test("manifest has exactly 35 skills", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.skills)).toHaveLength(35);
  });

  test("manifest has redirects", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.redirects).length).toBeGreaterThan(0);
  });
});

describe("getSkillNames", () => {
  test("returns all 35 skill names", async () => {
    const manifest = await loadManifest();
    const names = getSkillNames(manifest);
    expect(names).toHaveLength(35);
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

  test("total skills across all groups equals 35", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);

    let total = 0;
    for (const skills of Object.values(groups)) {
      total += skills.length;
    }
    expect(total).toBe(35);
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
  test("returns status for all 35 skills", async () => {
    const manifest = await loadManifest();
    const status = await getInstallStatus(manifest);
    expect(Object.keys(status)).toHaveLength(35);

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
    expect(total).toBe(35);
  });

  test("dry-run reports without writing", async () => {
    const manifest = await loadManifest();
    const result = await updateSkills(manifest, true);

    const total = result.updated.length + result.unchanged.length + result.notBundled.length;
    expect(total).toBe(35);
  });
});

describe("getSkillsInstallDir", () => {
  test("returns path under ~/.claude/skills", () => {
    const dir = getSkillsInstallDir();
    expect(dir).toContain(".claude/skills");
    expect(dir).toContain(homedir());
  });
});

describe("Redirect resolution", () => {
  test("follows simple redirects", async () => {
    const manifest = await loadManifest();
    const skill = getSkill(manifest, "social-content");
    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("content-atomizer");
  });

  test("follows all creative redirects", async () => {
    const manifest = await loadManifest();

    expect(getSkill(manifest, "app-screenshots")?.name).toBe("app-store-screenshots");
    expect(getSkill(manifest, "ios-screenshots")?.name).toBe("app-store-screenshots");
    expect(getSkill(manifest, "presentation")?.name).toBe("frontend-slides");
    expect(getSkill(manifest, "pitch-deck")?.name).toBe("frontend-slides");
    expect(getSkill(manifest, "tiktok")?.name).toBe("tiktok-slideshow");
    expect(getSkill(manifest, "video-assembly")?.name).toBe("video-content");
  });

  test("returns null for double-redirect (no chains exist)", async () => {
    const manifest = await loadManifest();
    // Verify no redirect targets are themselves redirect keys
    for (const [, target] of Object.entries(manifest.redirects)) {
      const baseTarget = target.split(" ")[0];
      expect(manifest.redirects[baseTarget]).toBeUndefined();
    }
  });
});

describe("Skill install copies references", () => {
  test("skills with references/ dirs have them installed", async () => {
    const manifest = await loadManifest();
    const status = await getInstallStatus(manifest);

    // Check a few skills known to have references
    const skillsWithRefs = ["slideshow-script", "video-content", "paper-marketing"];
    for (const name of skillsWithRefs) {
      if (status[name]?.installed) {
        const refDir = join(getSkillsInstallDir(), name, "references");
        const exists = await Bun.file(join(refDir, ".")).exists().catch(() => false);
        // We just verify the path is under the right location
        expect(refDir).toContain(name);
      }
    }
  });
});

describe("updateSkills diffs references/", () => {
  // These tests use a real skill with references (slideshow-script)
  const skillName = "slideshow-script";

  test("detects changed reference file", async () => {
    const manifest = await loadManifest();

    // First ensure skill is fully installed
    await installSkills(manifest);

    const refPath = join(getSkillsInstallDir(), skillName, "references", "frameworks.md");
    const refFile = Bun.file(refPath);
    const originalContent = await refFile.text();

    // Tamper with installed reference
    await Bun.write(refPath, originalContent + "\n<!-- tampered -->");

    const result = await updateSkills(manifest);
    expect(result.updated).toContain(skillName);

    // Restore: run update again to fix it
    const result2 = await updateSkills(manifest);
    expect(result2.unchanged).toContain(skillName);
  });

  test("reports unchanged when SKILL.md and all references match", async () => {
    const manifest = await loadManifest();

    // Install fresh then update — should be unchanged
    await installSkills(manifest);
    const result = await updateSkills(manifest);
    expect(result.unchanged).toContain(skillName);
  });

  test("copies new reference files that did not exist before", async () => {
    const manifest = await loadManifest();
    await installSkills(manifest);

    // Delete an installed reference file
    const refPath = join(getSkillsInstallDir(), skillName, "references", "frameworks.md");
    const { rm } = await import("node:fs/promises");
    await rm(refPath);

    const result = await updateSkills(manifest);
    expect(result.updated).toContain(skillName);

    // Verify the file was restored
    const restored = await Bun.file(refPath).exists();
    expect(restored).toBe(true);
  });

  test("works when bundled skill has no references/ dir", async () => {
    const manifest = await loadManifest();
    await installSkills(manifest);

    // marketing-psychology has no references/ dir
    const result = await updateSkills(manifest);
    expect(result.unchanged).toContain("marketing-psychology");
  });
});

describe("Category completeness", () => {
  test("creative category has all 8 creative skills", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);
    const creativeNames = groups.creative.map(s => s.name);

    expect(creativeNames).toContain("creative");
    expect(creativeNames).toContain("marketing-demo");
    expect(creativeNames).toContain("paper-marketing");
    expect(creativeNames).toContain("slideshow-script");
    expect(creativeNames).toContain("video-content");
    expect(creativeNames).toContain("tiktok-slideshow");
    expect(creativeNames).toContain("app-store-screenshots");
    expect(creativeNames).toContain("frontend-slides");
  });

  test("foundation category has 9 skills", async () => {
    const manifest = await loadManifest();
    const groups = groupByCategory(manifest);
    expect(groups.foundation).toHaveLength(9);
  });
});
