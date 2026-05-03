// E2E tests for output.ts — formatting, field filtering, TTY detection
// No mocks. Tests real output formatting.

import { describe, test, expect } from "bun:test";
import { formatOutput, dim, bold, green, red, yellow, cyan } from "../src/core/output";
import { ok, err } from "../src/types";
import type { GlobalFlags } from "../src/types";

const jsonFlags: GlobalFlags = { json: true, dryRun: false, fields: [], cwd: "." };
const defaultFlags: GlobalFlags = { json: false, dryRun: false, fields: [], cwd: "." };

describe("formatOutput", () => {
  test("formats success result as JSON when --json flag set", () => {
    const result = ok({ name: "test", count: 42 });
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe("test");
    expect(parsed.count).toBe(42);
  });

  test("formats error result as JSON", () => {
    const result = err("NOT_FOUND", "Skill not found", ["mktg list"]);
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.error.message).toBe("Skill not found");
    expect(parsed.error.suggestions).toContain("mktg list");
  });

  test("applies --fields filter", () => {
    const result = ok({ name: "test", count: 42, extra: "data" });
    const fieldsFlags = { ...jsonFlags, fields: ["name", "count"] };
    const output = formatOutput(result, fieldsFlags);
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe("test");
    expect(parsed.count).toBe(42);
    expect(parsed.extra).toBeUndefined();
  });

  test("fields filter returns UNKNOWN_FIELD error when any field is missing (task #14 behavior change)", () => {
    // BEHAVIOR CHANGE (task #14): the old contract silently ignored missing
    // fields and returned a partial result. That was a footgun: agents
    // consumed the partial output and downstream skills produced nothing
    // with no diagnostic. The new contract is loud — any missing field
    // returns an UNKNOWN_FIELD error envelope with `suggestions` listing
    // the available top-level keys so the agent can self-correct.
    const result = ok({ name: "test" });
    const fieldsFlags = { ...jsonFlags, fields: ["name", "missing"] };
    const output = formatOutput(result, fieldsFlags);
    const parsed = JSON.parse(output);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("UNKNOWN_FIELD");
    expect(parsed.error.message).toContain("missing");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
    expect(parsed.error.suggestions[0]).toMatch(/Available fields/);
  });

  test("formats string data directly in non-JSON mode", () => {
    const result = ok("Hello, world!");
    const output = formatOutput(result, defaultFlags);
    expect(output).toContain("Hello, world!");
  });

  test("formats array data as newline-separated", () => {
    const result = ok(["line 1", "line 2", "line 3"]);
    const output = formatOutput(result, defaultFlags);
    expect(output).toContain("line 1");
    expect(output).toContain("line 2");
    expect(output).toContain("line 3");
  });

  test("error output always contains error object", () => {
    const result = err("TEST", "test error", ["fix it"], 4);
    const output = formatOutput(result, defaultFlags);
    const parsed = JSON.parse(output);
    expect(parsed.error).toBeDefined();
  });

  test("JSON error output includes exitCode", () => {
    const result = err("NOT_FOUND", "Skill not found", ["mktg list"], 1);
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("--fields works on arrays of objects", () => {
    const result = ok([
      { name: "a", count: 1, extra: "x" },
      { name: "b", count: 2, extra: "y" },
    ]);
    const fieldsFlags = { ...jsonFlags, fields: ["name", "count"] };
    const output = formatOutput(result, fieldsFlags);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("a");
    expect(parsed[0].count).toBe(1);
    expect(parsed[0].extra).toBeUndefined();
    expect(parsed[1].name).toBe("b");
    expect(parsed[1].extra).toBeUndefined();
  });

  test("display field used for TTY output", () => {
    // In test env, isTTY() is false so this falls to JSON.
    // Test that display is set on the result at least.
    const result = ok({ name: "test" }, "Custom display text");
    expect(result.display).toBe("Custom display text");
  });
});

describe("ANSI helpers", () => {
  // These test the actual function behavior
  // In non-TTY (test environment), they strip ANSI codes

  test("dim wraps string", () => {
    const result = dim("test");
    expect(result).toContain("test");
  });

  test("bold wraps string", () => {
    const result = bold("test");
    expect(result).toContain("test");
  });

  test("green wraps string", () => {
    const result = green("test");
    expect(result).toContain("test");
  });

  test("red wraps string", () => {
    const result = red("test");
    expect(result).toContain("test");
  });

  test("yellow wraps string", () => {
    const result = yellow("test");
    expect(result).toContain("test");
  });

  test("ANSI helpers handle empty strings", () => {
    expect(dim("")).toBe("");
    expect(bold("")).toBe("");
    expect(green("")).toBe("");
  });

  test("cyan wraps string", () => {
    const result = cyan("test");
    expect(result).toContain("test");
  });
});
