// Tests for skills-manifest.json routing metadata + mktg list --routing flag
// Real file I/O. No mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import type { GlobalFlags } from "../src/types";
import { handler } from "../src/commands/list";
import { loadManifest } from "../src/core/skills";

const MANIFEST_PATH = join(import.meta.dir, "..", "skills-manifest.json");

const flags: GlobalFlags = {
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
};

const SKILLS_WITH_ROUTING = [
  "cmo",
  "brand-voice",
  "positioning-angles",
  "audience-research",
  "competitive-intel",
  "brainstorm",
  "keyword-research",
  "seo-content",
  "direct-response-copy",
  "content-atomizer",
  "email-sequences",
  "lead-magnet",
  "launch-strategy",
  "pricing-strategy",
  "creative",
];

describe("skills-manifest.json routing metadata", () => {
  test("manifest is valid JSON", async () => {
    const file = Bun.file(MANIFEST_PATH);
    const text = await file.text();
    expect(() => JSON.parse(text)).not.toThrow();
  });

  test("manifest has all required routing skills", async () => {
    const manifest = await loadManifest();
    for (const skill of SKILLS_WITH_ROUTING) {
      expect(manifest.skills).toHaveProperty(skill);
    }
  });

  test("each routing entry has required fields", async () => {
    const manifest = await loadManifest();
    for (const skillName of SKILLS_WITH_ROUTING) {
      const entry = manifest.skills[skillName];
      expect(entry).toBeDefined();
      expect(entry.routing).toBeDefined();
      const routing = entry.routing!;
      expect(Array.isArray(routing.triggers)).toBe(true);
      expect(routing.triggers.length).toBeGreaterThan(0);
      expect(Array.isArray(routing.requires)).toBe(true);
      expect(Array.isArray(routing.unlocks)).toBe(true);
      expect(["foundation-first", "any"]).toContain(routing.precedence);
    }
  });

  test("routing triggers are distinct from manifest triggers (more specific intent phrases)", async () => {
    const manifest = await loadManifest();
    for (const skillName of SKILLS_WITH_ROUTING) {
      const entry = manifest.skills[skillName];
      if (!entry.routing) continue;
      // Routing triggers should be full intent phrases, not single keywords
      for (const trigger of entry.routing.triggers) {
        expect(trigger.length).toBeGreaterThan(10);
      }
    }
  });

  test("routing requires references valid skill names", async () => {
    const manifest = await loadManifest();
    const allSkills = new Set(Object.keys(manifest.skills));
    for (const skillName of SKILLS_WITH_ROUTING) {
      const entry = manifest.skills[skillName];
      if (!entry.routing) continue;
      for (const req of entry.routing.requires) {
        expect(allSkills.has(req)).toBe(true);
      }
    }
  });

  test("routing unlocks references valid skill names", async () => {
    const manifest = await loadManifest();
    const allSkills = new Set(Object.keys(manifest.skills));
    for (const skillName of SKILLS_WITH_ROUTING) {
      const entry = manifest.skills[skillName];
      if (!entry.routing) continue;
      for (const unlock of entry.routing.unlocks) {
        expect(allSkills.has(unlock)).toBe(true);
      }
    }
  });

  test("skills without routing have no routing field", async () => {
    const manifest = await loadManifest();
    const routingSet = new Set(SKILLS_WITH_ROUTING);
    // Spot-check a few skills that should NOT have routing
    const noRoutingSkills = ["seo-audit", "page-cro", "newsletter", "churn-prevention"];
    for (const skillName of noRoutingSkills) {
      if (routingSet.has(skillName)) continue;
      const entry = manifest.skills[skillName];
      if (entry) {
        expect(entry.routing).toBeUndefined();
      }
    }
  });
});

describe("mktg list --routing flag", () => {
  test("mktg list --json works without routing flag", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skills.length).toBeGreaterThan(0);
    // Without --routing, no skill should have a routing property
    for (const skill of result.data.skills) {
      expect(skill.routing).toBeUndefined();
    }
  });

  test("mktg list --routing --json includes routing for skills that have it", async () => {
    const result = await handler(["--routing"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const skillsWithRouting = result.data.skills.filter((s) => s.routing !== undefined);
    expect(skillsWithRouting.length).toBeGreaterThanOrEqual(SKILLS_WITH_ROUTING.length);

    // All expected routing skills are present with routing
    for (const skillName of SKILLS_WITH_ROUTING) {
      const skill = result.data.skills.find((s) => s.name === skillName);
      expect(skill).toBeDefined();
      expect(skill?.routing).toBeDefined();
    }
  });

  test("mktg list --routing includes correct routing shape", async () => {
    const result = await handler(["--routing"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cmo = result.data.skills.find((s) => s.name === "cmo");
    expect(cmo?.routing).toBeDefined();
    expect(cmo?.routing?.triggers).toBeDefined();
    expect(cmo?.routing?.requires).toBeDefined();
    expect(cmo?.routing?.unlocks).toBeDefined();
    expect(cmo?.routing?.precedence).toBe("foundation-first");
  });

  test("skills without routing have no routing field even with --routing flag", async () => {
    const result = await handler(["--routing"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const seoAudit = result.data.skills.find((s) => s.name === "seo-audit");
    if (seoAudit) {
      expect(seoAudit.routing).toBeUndefined();
    }
  });

  test("exit code is 0 with --routing flag", async () => {
    const result = await handler(["--routing"], flags);
    expect(result.exitCode).toBe(0);
  });

  test("total count unchanged with --routing flag", async () => {
    const [baseline, withRouting] = await Promise.all([
      handler([], flags),
      handler(["--routing"], flags),
    ]);
    expect(baseline.ok).toBe(true);
    expect(withRouting.ok).toBe(true);
    if (!baseline.ok || !withRouting.ok) return;
    expect(withRouting.data.total).toBe(baseline.data.total);
  });
});
