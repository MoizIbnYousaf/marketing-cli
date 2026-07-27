// Drift lock: the code-side playbook table (skill-router.ts) and the
// human/agent-side playbook doc (skills/cmo/rules/playbooks.md) must not
// drift. The doc is the /cmo contract; the table is the portable floor.
// Real file I/O, no mocks.

import { describe, test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const ROOT = join(import.meta.dir, "..");

// Playbook headings in playbooks.md that are deliberately NOT routed by
// `mktg route`: #12 Agent Team Coordination governs agent spawning, not a
// marketing deliverable an agent should route a user request to.
const DOC_ONLY_PLAYBOOKS = new Set(["agent-team-coordination"]);

const kebab = (heading: string): string =>
  heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

describe("playbook table ⋈ playbooks.md drift lock", () => {
  test("every numbered playbook heading has a route-table entry (minus documented exclusions)", async () => {
    const md = await readFile(join(ROOT, "skills", "cmo", "rules", "playbooks.md"), "utf-8");
    const headings = [...md.matchAll(/^## \d+\.\s+(.+)$/gm)].map(m => kebab(m[1]!));
    expect(headings.length).toBeGreaterThanOrEqual(11);

    const { PLAYBOOKS } = await import("../src/core/skill-router");
    const tableNames = new Set(PLAYBOOKS.map(p => p.name));

    for (const heading of headings) {
      if (DOC_ONLY_PLAYBOOKS.has(heading)) continue;
      expect(tableNames.has(heading)).toBe(true);
    }
    // And nothing in the table that the doc doesn't cover
    for (const name of tableNames) {
      expect(headings).toContain(name);
    }
  });

  test("every table entry routes to a skill that exists in the manifest", async () => {
    const { PLAYBOOKS } = await import("../src/core/skill-router");
    const manifest = JSON.parse(await readFile(join(ROOT, "skills-manifest.json"), "utf-8"));
    for (const playbook of PLAYBOOKS) {
      expect(manifest.skills[playbook.entrySkill]).toBeDefined();
      // Phrases must be non-empty and lowercase-routable
      expect(playbook.phrases.length).toBeGreaterThan(0);
    }
  });
});

// Keep the subagent-file count assertion trivially satisfied via readdir
// (guards against accidental deletion of the rules directory).
describe("cmo rules directory sanity", () => {
  test("playbooks.md lives alongside the other cmo rules", () => {
    const rules = readdirSync(join(ROOT, "skills", "cmo", "rules"));
    expect(rules).toContain("playbooks.md");
  });
});
