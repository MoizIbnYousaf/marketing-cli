// E2E tests for types.ts — result constructors, type contracts
// No mocks. Tests the actual type system and constructors.

import { describe, test, expect } from "bun:test";
import { ok, err, BRAND_FILES, BRAND_PROFILE_FILES, BRAND_APPEND_FILES } from "../src/types";
import type { CommandResult, ExitCode, BrandFile, SkillCategory, SkillLayer } from "../src/types";

describe("Result constructors", () => {
  test("ok() creates success result with exit code 0", () => {
    const result = ok({ message: "hello" });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    if (!result.ok) return;
    expect(result.data.message).toBe("hello");
  });

  test("ok() preserves complex data types", () => {
    const data = {
      skills: [{ name: "brand-voice", installed: true }],
      count: 26,
      nested: { deep: { value: true } },
    };
    const result = ok(data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skills).toHaveLength(1);
    expect(result.data.skills[0].name).toBe("brand-voice");
    expect(result.data.nested.deep.value).toBe(true);
  });

  test("ok() with null data", () => {
    const result = ok(null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeNull();
  });

  test("ok() with array data", () => {
    const result = ok([1, 2, 3]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([1, 2, 3]);
  });

  test("err() creates failure result with correct exit code", () => {
    const result = err("NOT_FOUND", "Skill not found", ["mktg list"], 1);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.message).toBe("Skill not found");
    expect(result.error.suggestions).toEqual(["mktg list"]);
  });

  test("err() defaults to exit code 1", () => {
    const result = err("GENERIC", "Something failed", []);
    expect(result.exitCode).toBe(1);
  });

  test("err() with all exit codes", () => {
    const codes: ExitCode[] = [0, 1, 2, 3, 4, 5, 6];
    for (const code of codes) {
      const result = err("TEST", "test", [], code);
      expect(result.exitCode).toBe(code);
    }
  });

  test("err() preserves suggestions array", () => {
    const suggestions = ["try this", "or this", "also this"] as const;
    const result = err("TEST", "test", suggestions, 2);
    if (result.ok) return;
    expect(result.error.suggestions).toHaveLength(3);
    expect(result.error.suggestions[0]).toBe("try this");
  });
});

describe("Brand file constants", () => {
  test("BRAND_FILES has exactly 10 files", () => {
    expect(BRAND_FILES).toHaveLength(10);
  });

  test("BRAND_PROFILE_FILES has exactly 8 files", () => {
    expect(BRAND_PROFILE_FILES).toHaveLength(8);
  });

  test("BRAND_APPEND_FILES has exactly 2 files", () => {
    expect(BRAND_APPEND_FILES).toHaveLength(2);
  });

  test("BRAND_FILES is superset of PROFILE + APPEND", () => {
    const allFiles = new Set(BRAND_FILES);
    for (const file of BRAND_PROFILE_FILES) {
      expect(allFiles.has(file)).toBe(true);
    }
    for (const file of BRAND_APPEND_FILES) {
      expect(allFiles.has(file)).toBe(true);
    }
  });

  test("no overlap between PROFILE and APPEND files", () => {
    const profileSet = new Set<string>(BRAND_PROFILE_FILES);
    for (const file of BRAND_APPEND_FILES) {
      expect(profileSet.has(file)).toBe(false);
    }
  });

  test("all brand files have .md extension", () => {
    for (const file of BRAND_FILES) {
      expect(file.endsWith(".md")).toBe(true);
    }
  });

  test("assets.md and learnings.md are append-only", () => {
    expect(BRAND_APPEND_FILES).toContain("assets.md");
    expect(BRAND_APPEND_FILES).toContain("learnings.md");
  });
});
