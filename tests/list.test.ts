// E2E tests for mktg list command
// Uses real file I/O, no mocks.

import { describe, test, expect } from "bun:test";
import type { GlobalFlags } from "../src/types";
import { handler } from "../src/commands/list";

const flags: GlobalFlags = {
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
};

describe("mktg list", () => {
  test("returns 24 skills from manifest", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(24);
  });

  test("skills have required fields", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const skill of result.data.skills) {
      expect(skill).toHaveProperty("name");
      expect(skill).toHaveProperty("description");
      expect(skill).toHaveProperty("category");
      expect(skill).toHaveProperty("tier");
      expect(skill).toHaveProperty("installed");
      expect(skill).toHaveProperty("hasReferences");
      expect(skill).toHaveProperty("hasWorkflows");
    }
  });

  test("includes all expected categories", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const categories = new Set(result.data.skills.map((s) => s.category));
    expect(categories.has("foundation")).toBe(true);
    expect(categories.has("strategy")).toBe(true);
    expect(categories.has("copy-content")).toBe(true);
    expect(categories.has("distribution")).toBe(true);
  });

  test("exit code is 0", async () => {
    const result = await handler([], flags);
    expect(result.exitCode).toBe(0);
  });

  test("valid JSON output structure", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("total");
    expect(result.data).toHaveProperty("installed");
    expect(result.data).toHaveProperty("missing");
    expect(result.data).toHaveProperty("categories");
    expect(typeof result.data.total).toBe("number");
    expect(typeof result.data.installed).toBe("number");
    expect(typeof result.data.missing).toBe("number");
    expect(Array.isArray(result.data.categories)).toBe(true);
  });

  test("skills have descriptions from SKILL.md frontmatter", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandVoice = result.data.skills.find((s) => s.name === "brand-voice");
    expect(brandVoice).toBeDefined();
    expect(brandVoice!.description.length).toBeGreaterThan(0);
    expect(brandVoice!.description).toContain("brand voice");
  });

  test("hasReferences is true for skills with references/", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const seoAudit = result.data.skills.find((s) => s.name === "seo-audit");
    expect(seoAudit).toBeDefined();
    expect(seoAudit!.hasReferences).toBe(true);

    const cmo = result.data.skills.find((s) => s.name === "cmo");
    expect(cmo).toBeDefined();
    expect(cmo!.hasReferences).toBe(true);
  });

  test("--category filter returns only matching skills", async () => {
    const result = await handler(["--category", "seo"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBeGreaterThan(0);
    expect(result.data.total).toBeLessThan(24);
    for (const skill of result.data.skills) {
      expect(skill.category).toBe("seo");
    }
  });

  test("--category with invalid value returns error", async () => {
    const result = await handler(["--category", "nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("INVALID_CATEGORY");
    expect(result.exitCode).toBe(2);
  });

  test("--category=value syntax works", async () => {
    const result = await handler(["--category=strategy"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const skill of result.data.skills) {
      expect(skill.category).toBe("strategy");
    }
  });

  test("skills include reads and writes arrays", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const skill of result.data.skills) {
      expect(Array.isArray(skill.reads)).toBe(true);
      expect(Array.isArray(skill.writes)).toBe(true);
    }
  });
});
