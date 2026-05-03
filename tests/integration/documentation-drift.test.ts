// Integration test: Documentation Drift Detection
// Asserts that skill counts in CLAUDE.md and README.md match skills-manifest.json.
// Reads count from manifest dynamically — never hardcodes a number.

import { describe, test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = import.meta.dir.replace("/tests/integration", "");

/** Extract total-count skill references from a doc (values > 30 to exclude category counts like "9 skills") */
const extractTotalSkillCounts = (content: string): number[] => {
  const matches = content.match(/\b(\d+)\s+(?:marketing\s+)?skills\b/g) ?? [];
  return matches
    .map(m => parseInt(m.match(/\d+/)![0]!))
    .filter(n => n > 30); // Category counts (Foundation 9, Strategy 4, etc.) are all < 20
};

describe("Documentation drift", () => {
  let manifestSkillCount: number;

  test("manifest loads with a valid skill count", async () => {
    const manifest = JSON.parse(await readFile(join(projectRoot, "skills-manifest.json"), "utf-8"));
    manifestSkillCount = Object.keys(manifest.skills).length;
    expect(manifestSkillCount).toBeGreaterThan(30);
  });

  test("CLAUDE.md total skill counts match manifest", async () => {
    const manifest = JSON.parse(await readFile(join(projectRoot, "skills-manifest.json"), "utf-8"));
    const skillCount = Object.keys(manifest.skills).length;
    const claudeMd = await readFile(join(projectRoot, "CLAUDE.md"), "utf-8");
    const totals = extractTotalSkillCounts(claudeMd);

    expect(totals.length).toBeGreaterThan(0); // CLAUDE.md should reference the total at least once
    for (const count of totals) {
      expect(count).toBe(skillCount);
    }
  });

  test("README.md total skill counts match manifest", async () => {
    const manifest = JSON.parse(await readFile(join(projectRoot, "skills-manifest.json"), "utf-8"));
    const skillCount = Object.keys(manifest.skills).length;
    const readmeMd = await readFile(join(projectRoot, "README.md"), "utf-8");
    const totals = extractTotalSkillCounts(readmeMd);

    expect(totals.length).toBeGreaterThan(0); // README should reference the total at least once
    for (const count of totals) {
      expect(count).toBe(skillCount);
    }
  });
});
