// The /cmo pre-ship gates must be runnable and decidable with what the
// package ships. Reads the real rule files, manifests and Studio docs.
// No mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const root = join(import.meta.dir, "..", "..", "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");
const skills = Object.keys(JSON.parse(read("skills-manifest.json")).skills);
const agents = Object.keys(JSON.parse(read("agents-manifest.json")).agents).map((a) => `mktg-${a}`);

const gateRows = (): string[] => {
  const text = read("skills/cmo/rules/quality-gate.md");
  const section = text.slice(text.indexOf("## Full Pre-Ship Pipeline"), text.indexOf("### Structural first pass"));
  return section.split("\n").filter((l) => /^\| [1-4] \|/.test(l));
};

const pipelineSteps = (): string[] => {
  const text = read("skills/cmo/rules/quality-gate.md");
  const block = text.slice(text.indexOf("PIPELINE: pre-ship-gates"));
  return block.split("\n").filter((l) => /^\s+[1-4]\. /.test(l));
};

describe("pre-ship gates name only what ships", () => {
  test("there are four gates in the table and four pipeline steps", () => {
    expect(gateRows().length).toBe(4);
    expect(pipelineSteps().length).toBe(4);
  });

  test("every backticked skill or agent a gate names ships, unless marked as installed-only", () => {
    for (const line of [...gateRows(), ...pipelineSteps()]) {
      for (const [, name] of line.matchAll(/`\/?([a-z][a-z0-9-]+)(?: <path>)?`/g)) {
        if (name!.includes("/")) continue;
        const ships = skills.includes(name!) || agents.includes(name!);
        if (!ships) expect(line).toMatch(/installed/);
      }
    }
  });

  test("gates 3 and 4 name an agent the package installs", () => {
    const rows = gateRows();
    expect(agents).toContain(rows[2]!.match(/`(mktg-[a-z-]+)`/)![1]!);
    expect(agents).toContain(rows[3]!.match(/`(mktg-[a-z-]+)`/)![1]!);
  });
});

describe("gates 3 and 4 can be decided as written", () => {
  test("no step leaves the threshold undefined", () => {
    for (const line of [...gateRows(), ...pipelineSteps()]) expect(line).not.toMatch(/≥ threshold/);
  });

  test("gate 3 uses the content reviewer's own SHIP band", () => {
    const reviewer = read("agents/review/content-reviewer.md");
    expect(reviewer).toContain("8+ = ship");
    expect(reviewer).toContain("VERDICT: [SHIP | SHIP WITH FIXES | REWRITE]");
    expect(gateRows()[2]).toContain("`VERDICT: SHIP` (overall ≥ 8/10");
    expect(pipelineSteps()[2]).toContain("VERDICT: SHIP (overall ≥ 8/10)");
  });

  test("gate 4 states a score bar for the SEO analyst's overall score", () => {
    expect(read("agents/review/seo-analyst.md")).toContain("Overall Score: [score] / 10");
    expect(gateRows()[3]).toMatch(/overall score ≥ \d+\/10/);
    expect(pipelineSteps()[3]).toMatch(/overall ≥ \d+\/10/);
  });

  test("the built-in checks decide gates 1 and 2; an external skill is advisory and does not stop the pipeline", () => {
    const text = read("skills/cmo/rules/quality-gate.md");
    expect(text).toContain("The checks in this file decide gates 1 and 2; an installed external skill is advisory only.");
    expect(text).toContain("Run it without stopping the pipeline");
  });
});

describe("Studio skill tables list only manifest skills", () => {
  for (const doc of ["studio/AGENTS.md", "studio/CLAUDE.md"]) {
    test(doc, () => {
      const text = read(doc);
      const start = text.indexOf("skills-manifest.json\n");
      const end = text.indexOf("## 7 Sub-Agents");
      expect(start).toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
      const names = [...text.slice(start, end).matchAll(/^\| `([a-z][a-z0-9-]+)` \|/gm)].map((m) => m[1]!);
      expect(names.length).toBeGreaterThan(0);
      expect(names.filter((n) => !skills.includes(n))).toEqual([]);
    });
  }
});
