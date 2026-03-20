import { describe, it, expect } from "bun:test";
import { schema } from "./update";

describe("update.ts schema", () => {
  it("has correct command name", () => {
    expect(schema.name).toBe("update");
  });

  it("documents all output fields", () => {
    const fields = Object.keys(schema.output);
    expect(fields).toContain("skills.updated");
    expect(fields).toContain("skills.unchanged");
    expect(fields).toContain("skills.notBundled");
    expect(fields).toContain("agents.updated");
    expect(fields).toContain("agents.unchanged");
    expect(fields).toContain("agents.notBundled");
    expect(fields).toContain("versionChanges");
    expect(fields).toContain("totalSkills");
    expect(fields).toContain("totalAgents");
    expect(fields).toContain("agentError");
  });

  it("has examples with --json and --dry-run", () => {
    const argStrings = schema.examples.map((e) => e.args);
    expect(argStrings.some((a) => a.includes("--json"))).toBe(true);
    expect(argStrings.some((a) => a.includes("--dry-run"))).toBe(true);
  });

  it("has vocabulary for agent discovery", () => {
    expect(schema.vocabulary).toBeDefined();
    expect(schema.vocabulary!.length).toBeGreaterThan(0);
  });
});
