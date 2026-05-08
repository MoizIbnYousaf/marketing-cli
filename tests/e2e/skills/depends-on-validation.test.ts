// E2E Test: every skill's depends-on resolves to a real skill in the manifest.
//
// CLAUDE.md skill standards: depends-on (kebab) names parents that must run
// before this skill. Lane 10 Wave B normalized the catalog to kebab-case.
// If any depends-on entry doesn't resolve to a known skill, the DAG is
// broken and `mktg run` will skip the prerequisite check silently.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SkillsManifest } from "../../../src/types";

const projectRoot = import.meta.dir.replace("/tests/e2e/skills", "");
const manifestPath = join(projectRoot, "skills-manifest.json");
const installRoot = join(homedir(), ".claude", "skills");

const parseFrontmatter = (content: string): Record<string, string[]> => {
  if (!content.startsWith("---\n")) return {};
  const end = content.indexOf("\n---", 4);
  if (end === -1) return {};
  const fm = content.slice(4, end);
  const fields: Record<string, string[]> = {};
  let currentList: string | null = null;
  let listAccum: string[] = [];
  for (const line of fm.split("\n")) {
    if (line.match(/^[a-zA-Z0-9_-]+:/)) {
      if (currentList) fields[currentList] = listAccum;
      currentList = null;
      listAccum = [];
      const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (m && m[1]) {
        if (m[2]?.trim() === "" || m[2] === undefined) {
          currentList = m[1];
        } else if (m[2].trim() === "[]") {
          fields[m[1]] = [];
        } else {
          fields[m[1]] = [m[2]];
        }
      }
    } else if (currentList && line.match(/^\s+-\s+/)) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (m && m[1]) listAccum.push(m[1].trim());
    }
  }
  if (currentList) fields[currentList] = listAccum;
  return fields;
};

const manifest: SkillsManifest = await Bun.file(manifestPath).json();
const known = new Set(Object.keys(manifest.skills));
const skillNames = Object.keys(manifest.skills);

describe("E2E: depends-on DAG integrity", () => {
  test("0 skills use the legacy snake_case `depends_on` (Wave B normalization)", async () => {
    const offenders: string[] = [];
    for (const name of skillNames) {
      const path = join(installRoot, name, "SKILL.md");
      const content = await Bun.file(path).text();
      const fmEnd = content.indexOf("\n---", 4);
      const fm = content.slice(4, fmEnd);
      if (/^depends_on:/m.test(fm)) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  test("every depends-on entry resolves to a known skill in the manifest", async () => {
    const broken: Array<{ skill: string; missing: string }> = [];
    for (const name of skillNames) {
      const path = join(installRoot, name, "SKILL.md");
      const content = await Bun.file(path).text();
      const fields = parseFrontmatter(content);
      const deps = fields["depends-on"] ?? [];
      for (const d of deps) {
        if (!known.has(d)) broken.push({ skill: name, missing: d });
      }
    }
    expect(broken).toEqual([]);
  });

  test("manifest depends_on field also resolves (manifest mirror)", () => {
    const broken: Array<{ skill: string; missing: string }> = [];
    for (const [name, entry] of Object.entries(manifest.skills)) {
      const deps = (entry as { depends_on?: string[] }).depends_on ?? [];
      for (const d of deps) {
        if (!known.has(d)) broken.push({ skill: name, missing: d });
      }
    }
    expect(broken).toEqual([]);
  });

  test("no skill depends on itself", async () => {
    const cycles: string[] = [];
    for (const name of skillNames) {
      const path = join(installRoot, name, "SKILL.md");
      const content = await Bun.file(path).text();
      const fields = parseFrontmatter(content);
      const deps = fields["depends-on"] ?? [];
      if (deps.includes(name)) cycles.push(name);
    }
    expect(cycles).toEqual([]);
  });

  test("depends-on graph has no cycles (topological-sort sanity)", async () => {
    const graph = new Map<string, string[]>();
    for (const name of skillNames) {
      const path = join(installRoot, name, "SKILL.md");
      const content = await Bun.file(path).text();
      const fields = parseFrontmatter(content);
      graph.set(name, fields["depends-on"] ?? []);
    }
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycles: string[] = [];
    const dfs = (n: string): void => {
      if (visiting.has(n)) {
        cycles.push(n);
        return;
      }
      if (visited.has(n)) return;
      visiting.add(n);
      for (const d of graph.get(n) ?? []) dfs(d);
      visiting.delete(n);
      visited.add(n);
    };
    for (const n of skillNames) dfs(n);
    expect(cycles).toEqual([]);
  });
});
