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
  test("returns 32 skills from manifest", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(32);
  });

  test("skills have required fields", async () => {
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const skill of result.data.skills) {
      expect(skill).toHaveProperty("name");
      expect(skill).toHaveProperty("category");
      expect(skill).toHaveProperty("tier");
      expect(skill).toHaveProperty("installed");
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
    expect(typeof result.data.total).toBe("number");
    expect(typeof result.data.installed).toBe("number");
    expect(typeof result.data.missing).toBe("number");
  });
});
