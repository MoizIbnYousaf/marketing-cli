// E2E Test: brand-voice SKILL.md output contract.
//
// `mktg run brand-voice` is an LLM operation; the actual brand/voice-profile.md
// write happens when an agent consumes the SKILL.md and runs the prompt body.
// What we can assert at the CLI layer is that the skill SHIPS the correct
// output spec — i.e. its SKILL.md instructs the agent to write the documented
// required sections per brand/SCHEMA.md.
//
// brand/SCHEMA.md (Lane 10 Wave C) requires voice-profile.md to ship:
// Personality, Vocabulary, Sentence patterns. The skill must reference them.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";

const projectRoot = import.meta.dir.replace("/tests/e2e/skills", "");
const installedPath = join(homedir(), ".claude", "skills", "brand-voice", "SKILL.md");
const sourcePath = join(projectRoot, "skills", "brand-voice", "SKILL.md");
const schemaPath = join(projectRoot, "brand", "SCHEMA.md");

describe("E2E: brand-voice writes voice-profile.md per brand/SCHEMA.md", () => {
  test("installed SKILL.md mirrors source SKILL.md (post-`mktg update`)", async () => {
    const installed = await Bun.file(installedPath).text();
    const source = await Bun.file(sourcePath).text();
    expect(installed).toBe(source);
  });

  test("frontmatter declares writes: brand/voice-profile.md", async () => {
    const content = await Bun.file(sourcePath).text();
    const fmEnd = content.indexOf("\n---", 4);
    const fm = content.slice(4, fmEnd);
    expect(fm).toContain("writes:");
    expect(fm).toContain("voice-profile.md");
  });

  test("body output spec instructs the agent to write to brand/voice-profile.md", async () => {
    const content = await Bun.file(sourcePath).text();
    expect(content).toMatch(/brand\/voice-profile\.md/);
  });

  test("output spec covers all three brand/SCHEMA.md required sections (Personality, Vocabulary, Sentence patterns)", async () => {
    const content = await Bun.file(sourcePath).text();
    const schema = await Bun.file(schemaPath).text();
    // Schema row for voice-profile.md
    expect(schema).toMatch(/voice-profile\.md.*Personality.*Vocabulary.*Sentence patterns/);
    // Three required sections must appear in the SKILL.md output spec.
    // The skill body uses a markdown template; we accept either inline mention
    // or H2/H3 headers as proof of section coverage.
    expect(content).toMatch(/Personality/i);
    expect(content).toMatch(/Vocabulary/i);
    // Sentence patterns may appear as "## Sentence Patterns", "Sentence patterns:", etc.
    expect(content).toMatch(/Sentence/i);
  });

  test("SKILL.md ships the three documented modes (Extract / Build / Auto-Scrape)", async () => {
    const content = await Bun.file(sourcePath).text();
    expect(content).toMatch(/extract/i);
    expect(content).toMatch(/build/i);
    // Auto-Scrape mode introduced post-Wave-B.
    expect(content).toMatch(/(auto[- ]?scrape|scrape)/i);
  });

  test("frontmatter declares category: foundation, tier: must-have", async () => {
    const content = await Bun.file(sourcePath).text();
    expect(content).toMatch(/category:\s*foundation/);
    expect(content).toMatch(/tier:\s*must-have/);
  });
});
