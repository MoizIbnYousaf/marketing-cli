// parseFrontmatter reads name and description the way YAML does.
// Real SKILL.md files from skills/ (the list is read from the directory),
// compared with Bun.YAML.parse. No mocks.

import { describe, test, expect } from "bun:test";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../src/core/skill-frontmatter";

const SKILLS_DIR = join(import.meta.dir, "..", "skills");

const skillFiles = readdirSync(SKILLS_DIR)
  .map((d) => join(SKILLS_DIR, d, "SKILL.md"))
  .filter((p) => existsSync(p))
  .sort();

const yamlBlock = (text: string): string => {
  const m = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error("no frontmatter block");
  return m[1]!;
};

describe("parseFrontmatter matches Bun.YAML.parse on every skills/*/SKILL.md", () => {
  test("there are skill files to compare", () => {
    expect(skillFiles.length).toBeGreaterThan(0);
  });

  for (const file of skillFiles) {
    const skill = file.split("/").at(-2)!;
    test(skill, () => {
      const text = readFileSync(file, "utf8");
      const yaml = Bun.YAML.parse(yamlBlock(text)) as Record<string, unknown>;
      const fm = parseFrontmatter(text);
      expect(fm).not.toBeNull();
      expect(fm!.name).toBe(String(yaml.name));
      expect(fm!.description).toBe(String(yaml.description));
    });
  }
});

describe("parseFrontmatter line endings and byte-order mark", () => {
  for (const file of skillFiles.slice(0, 5)) {
    const skill = file.split("/").at(-2)!;
    test(`${skill} reads the same with CRLF and a BOM`, () => {
      const text = readFileSync(file, "utf8");
      const lf = parseFrontmatter(text);
      const crlf = parseFrontmatter("\uFEFF" + text.replace(/\n/g, "\r\n"));
      expect(crlf).not.toBeNull();
      expect(crlf!.name).toBe(lf!.name);
      expect(crlf!.description).toBe(lf!.description);
    });
  }
});

// Expected values follow the YAML 1.2 spec; each was cross-checked against
// PyYAML and Ruby's Psych (libyaml).
describe("parseFrontmatter block scalars", () => {
  const desc = (body: string): string | undefined =>
    parseFrontmatter(`---\nname: a\ndescription: ${body}\n---\n`)?.description;

  test("literal | keeps line breaks and clips to one trailing newline", () => {
    expect(desc("|\n  line one\n  line two\n")).toBe("line one\nline two\n");
  });

  test("literal |- strips the trailing newline", () => {
    expect(desc("|-\n  line one\n  line two")).toBe("line one\nline two");
  });

  test("literal |+ keeps trailing blank lines", () => {
    expect(parseFrontmatter("---\nname: a\ndescription: |+\n  x\n\nother: y\n---\n")?.description).toBe("x\n\n");
  });

  test("folded > joins lines and keeps paragraph breaks and more-indented lines", () => {
    expect(desc(">\n  one\n  two\n\n  three\n    more\n  four")).toBe("one two\nthree\n  more\nfour\n");
  });

  test("folded >- strips the trailing newline", () => {
    expect(desc(">-\n  one\n  two")).toBe("one two");
  });

  test("indentation indicator |2- keeps the extra indentation", () => {
    expect(desc("|2-\n    indented\n  base")).toBe("  indented\nbase");
  });

  test("double quotes fold lines and read escapes", () => {
    expect(desc('"a \\"q\\" \\u00e9\n  next"')).toBe('a "q" \u00e9 next');
  });

  test("single quotes read '' as one quote", () => {
    expect(desc("'it''s'")).toBe("it's");
  });

  test("a multi-line plain scalar folds and drops a trailing comment", () => {
    expect(desc("plain\n  continued # note")).toBe("plain continued");
  });

  test("an unterminated quoted scalar is not frontmatter", () => {
    expect(desc('"never closed')).toBeUndefined();
  });

  test("arrays keep their shape after a block scalar", () => {
    const fm = parseFrontmatter("---\nname: a\ndescription: |\n  x\nreads:\n  - voice-profile.md\n  - 'audience.md'\n---\n");
    expect(fm?.description).toBe("x\n");
    expect(fm?.reads).toEqual(["voice-profile.md", "audience.md"]);
  });
});
