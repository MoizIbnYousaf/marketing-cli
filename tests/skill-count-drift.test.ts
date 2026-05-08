// Skill-count drift guard.
//
// Single-source: skills-manifest.json. Every surface that quotes a number-
// before-skills must agree with the manifest, or this test fails with a
// pointer to the offending file. The fix is always: run
// `node ./scripts/derive-counts.cjs` (also wired into `prepack`) and commit.
//
// Surfaces are kept narrow on purpose: this is a regression guard, not a
// linter. Brand memory (brand/voice-profile.md, studio/brand/), historical
// CHANGELOG entries, demo seed customer-quote text, and other lanes' files
// (server.ts, seed-demo.ts, AGENTS.md) are deliberately out of scope.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

const skillsManifest = JSON.parse(readFileSync(join(root, "skills-manifest.json"), "utf-8")) as {
  skills: Record<string, unknown>;
};
const skillKeys = Object.keys(skillsManifest.skills);
const totalSkillCount = skillKeys.length;
const marketingSkillCount = totalSkillCount - 1; // excludes cmo

const SURFACES: readonly string[] = [
  "package.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  "gemini-extension.json",
  "studio/README.md",
  "studio/CLAUDE.md",
  "studio/app/layout.tsx",
];

// Narrower than `\bskills\b` — the trailing negative lookahead skips:
//   - "skills-manifest" / "skills.json" (hyphenated or extensioned identifiers)
//   - "(11 skills)" — parenthesized sub-counts inside category headers like
//     "### Foundation (11 skills)" are category-internal totals, not the
//     canonical total. Same exclusion as scripts/derive-counts.cjs.
const COUNT_NEAR_SKILLS = /\b(\d+)\s+(marketing\s+)?skills(?![-\w)])/g;

describe("skill count drift", () => {
  test("manifest has the cmo orchestrator entry", () => {
    expect(skillKeys).toContain("cmo");
  });

  test("every surface agrees with the manifest count", () => {
    const offenders: string[] = [];
    for (const rel of SURFACES) {
      const text = readFileSync(join(root, rel), "utf-8");
      let match: RegExpExecArray | null;
      const pattern = new RegExp(COUNT_NEAR_SKILLS.source, "g");
      while ((match = pattern.exec(text)) !== null) {
        const found = Number(match[1]);
        const isMarketingFlavor = Boolean(match[2]);
        const expected = isMarketingFlavor ? marketingSkillCount : totalSkillCount;
        if (found !== expected) {
          // Locate the offending line for a useful failure message.
          const upTo = text.slice(0, match.index);
          const line = upTo.split("\n").length;
          offenders.push(
            `${rel}:${line} — saw "${match[0]}", expected ${expected} (manifest: ${marketingSkillCount} marketing + 1 orchestrator = ${totalSkillCount})`,
          );
        }
      }
    }
    if (offenders.length > 0) {
      const fix = `Run: node ./scripts/derive-counts.cjs && git add -p`;
      throw new Error(
        `Skill-count drift in ${offenders.length} place(s):\n  ${offenders.join("\n  ")}\n${fix}`,
      );
    }
  });
});
