// E2E Test: audience-research ## Archetypes contract (Lane 10 Wave C).
//
// brand/SCHEMA.md > "audience.md > `## Archetypes`" defines exactly six fields
// per archetype: one_liner, demographic, top_pain, top_desire, watering_hole,
// language_quote. Studio's archetype-pulse-cards (Lane 8) reads against this.
//
// We assert: the skill's SKILL.md output spec instructs the writer to produce
// the ## Archetypes section with all six fields, and that brand/SCHEMA.md
// documents the same six fields.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";

const projectRoot = import.meta.dir.replace("/tests/e2e/skills", "");
const installedPath = join(homedir(), ".claude", "skills", "audience-research", "SKILL.md");
const sourcePath = join(projectRoot, "skills", "audience-research", "SKILL.md");
const schemaPath = join(projectRoot, "brand", "SCHEMA.md");

const ARCHETYPE_FIELDS = [
  "one_liner",
  "demographic",
  "top_pain",
  "top_desire",
  "watering_hole",
  "language_quote",
] as const;

describe("E2E: audience-research ships the ## Archetypes contract", () => {
  test("installed SKILL.md mirrors source SKILL.md", async () => {
    const installed = await Bun.file(installedPath).text();
    const source = await Bun.file(sourcePath).text();
    expect(installed).toBe(source);
  });

  test("body output spec writes to brand/audience.md (frontmatter normalization is pending — stardust audit row)", async () => {
    // Stardust audit (stardust.md, audience-research scored 23/30) flagged the
    // frontmatter gap: audience-research currently ships only `name` and
    // `description`, missing `reads`, `writes`, `triggers`, `category`, `tier`.
    // That normalization is queued for a follow-up wave. The body output spec
    // does declare the file path, so we assert that as the binding contract
    // until frontmatter catches up.
    const content = await Bun.file(sourcePath).text();
    expect(content).toMatch(/brand\/audience\.md/);
  });

  test("body declares a structured ## Archetypes section in the Output format", async () => {
    const content = await Bun.file(sourcePath).text();
    expect(content).toContain("## Archetypes");
    expect(content).toContain("### Archetype:");
  });

  test("all six required fields appear in the output spec", async () => {
    const content = await Bun.file(sourcePath).text();
    for (const field of ARCHETYPE_FIELDS) {
      expect(content).toContain(field);
    }
  });

  test('output spec teaches the "not measured" rule for missing evidence', async () => {
    const content = await Bun.file(sourcePath).text();
    expect(content).toMatch(/not measured/i);
  });

  test("brand/SCHEMA.md documents the same six fields", async () => {
    const schema = await Bun.file(schemaPath).text();
    expect(schema).toContain("## Archetypes");
    for (const field of ARCHETYPE_FIELDS) {
      expect(schema).toContain(`\`${field}\``);
    }
  });

  test("brand/SCHEMA.md File table lists Archetypes as a required section of audience.md", async () => {
    const schema = await Bun.file(schemaPath).text();
    // The Files table row for audience.md should include Archetypes in its
    // required-sections column. We check for the row text.
    expect(schema).toMatch(/audience\.md.*Archetypes/);
  });
});
