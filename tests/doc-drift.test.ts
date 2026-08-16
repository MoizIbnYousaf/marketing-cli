// Doc-drift guards for surfaces that quote counts or metadata that live in
// code/manifests. Real file I/O, no mocks.
//
//  1. "N commands" strings in README.md / CLAUDE.md must equal the number of
//     registered top-level commands (src/core/command-registry.ts).
//  2. Every skills/<name>/SKILL.md frontmatter category/tier/layer must equal
//     skills-manifest.json (the manifest is the source of truth; `mktg skill
//     register` copies frontmatter INTO the manifest, so drift propagates).
//  3. README Commands table lists every registered top-level command.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TOP_LEVEL_COMMANDS } from "../src/core/command-registry";

const root = join(import.meta.dir, "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf-8");

describe("command count drift", () => {
  const expected = TOP_LEVEL_COMMANDS.length;
  const pattern = /\b(\d+)\s+(?:top-level\s+)?commands\b/g;

  for (const rel of ["README.md", "CLAUDE.md"]) {
    test(`${rel} quotes ${expected} commands everywhere it quotes a count`, () => {
      const text = read(rel);
      const offenders: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        if (Number(m[1]) !== expected) offenders.push(m[0]);
      }
      expect(offenders).toEqual([]);
    });
  }

  test("README Commands table has a row for every registered command", () => {
    const text = read("README.md");
    const missing = TOP_LEVEL_COMMANDS.filter((name) => !new RegExp(`\\|\\s*\`mktg ${name}\``).test(text));
    expect(missing).toEqual([]);
  });
});

describe("SKILL.md frontmatter ⋈ skills-manifest.json parity", () => {
  const manifest = JSON.parse(read("skills-manifest.json")) as {
    skills: Record<string, { category?: string; tier?: string; layer?: string }>;
  };

  test("category / tier / layer match the manifest for every skill", () => {
    const offenders: string[] = [];
    for (const [name, entry] of Object.entries(manifest.skills)) {
      const path = join(root, "skills", name, "SKILL.md");
      if (!existsSync(path)) continue;
      const fm = readFileSync(path, "utf-8").match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      for (const key of ["category", "tier", "layer"] as const) {
        const want = entry[key];
        if (!want) continue;
        const got = fm[1]!.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
        if (got !== undefined && got !== want) offenders.push(`${name}: ${key} frontmatter=${got} manifest=${want}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
