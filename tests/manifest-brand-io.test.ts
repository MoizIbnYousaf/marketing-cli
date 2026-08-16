// Brand I/O drift guard — SKILL.md frontmatter reads/writes vs skills-manifest.json.
// Runs the same comparison as `bun scripts/check-brand-io.ts` against the real repo.
// No mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { checkBrandIo, formatBrandIoReport, normalizeBrandRefs } from "../scripts/check-brand-io";
import type { SkillsManifest } from "../src/types";

const root = join(import.meta.dir, "..");
const manifest: SkillsManifest = await Bun.file(join(root, "skills-manifest.json")).json();

describe("normalizeBrandRefs", () => {
  test("strips brand/ prefix and drops non-brand outputs", () => {
    expect(normalizeBrandRefs([
      "brand/voice-profile.md",
      "brand/cmo-preferences.md",
      "marketing/campaigns/{name}/*.md",
      "docs/seo-machine.md",
      "brand/assets/logo.png",
    ])).toEqual(["voice-profile.md"]);
  });

  test("dedupes and sorts; tolerates bare names", () => {
    expect(normalizeBrandRefs(["brand/stack.md", "audience.md", "brand/audience.md"]))
      .toEqual(["audience.md", "stack.md"]);
  });

  test("undefined → empty", () => {
    expect(normalizeBrandRefs(undefined)).toEqual([]);
  });
});

describe("skills-manifest.json reads/writes match SKILL.md frontmatter", () => {
  test("no drift between frontmatter and manifest", async () => {
    const report = await checkBrandIo(root);
    expect(report.checked.length).toBeGreaterThan(30);
    expect(report.drift, formatBrandIoReport(report)).toEqual([]);
  });

  test("higgsfield skills declare reads/writes in frontmatter", async () => {
    const report = await checkBrandIo(root);
    for (const s of ["higgsfield-generate", "higgsfield-product-photoshoot", "higgsfield-soul-id"]) {
      expect(report.checked).toContain(s);
    }
  });
});

describe("brand/visual-style.md is not a brand file", () => {
  test("no SKILL.md references brand/visual-style.md", async () => {
    const skillsDir = join(root, "skills");
    const offenders: string[] = [];
    for (const name of await readdir(skillsDir)) {
      const path = join(skillsDir, name, "SKILL.md");
      if (!(await Bun.file(path).exists())) continue;
      const text = await Bun.file(path).text();
      if (text.includes("brand/visual-style.md")) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  test("higgsfield skills read creative-kit.md (written by visual-style)", () => {
    for (const s of ["higgsfield-generate", "higgsfield-product-photoshoot", "higgsfield-soul-id"]) {
      expect(manifest.skills[s]?.reads).toContain("creative-kit.md");
    }
    expect(manifest.skills["visual-style"]?.writes).toContain("creative-kit.md");
  });
});

describe("append-only files have declared writers", () => {
  const writersOf = (file: string): string[] =>
    Object.entries(manifest.skills).filter(([, e]) => e.writes.includes(file)).map(([k]) => k);

  test("learnings.md writers are the skills whose SKILL.md appends to it", async () => {
    const writers = writersOf("learnings.md");
    expect(writers.length).toBeGreaterThan(0);
    for (const w of writers) {
      const text = await Bun.file(join(root, "skills", w, "SKILL.md")).text();
      // Body (or the /cmo learning-loop rule it links to) must mention learnings.md
      const rules = w === "cmo" ? await Bun.file(join(root, "skills/cmo/rules/learning-loop.md")).text() : "";
      expect(text + rules).toContain("learnings.md");
    }
  });

  test("assets.md has at least one writer", () => {
    expect(writersOf("assets.md").length).toBeGreaterThan(0);
  });
});
