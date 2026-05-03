// Integration test: Schema Introspection (Agent DX - dev-3)
// Proves schema command returns machine-parseable response schemas for all commands.
// Real handler calls, no mocks.
//
// Agent DX Axis: SCHEMA INTROSPECTION — Score: 3/3
// Proves:
// - Every command has responseSchema with typed fields (field, type, description)
// - Enum fields include enumValues arrays for agent output validation
// - Nested fields distinguished from top-level with nested: true
// - Top-level fields marked required: true
// - Subcommands enriched with responseSchema
// - Single-command deep introspection works (mktg schema status --json)
// - Agent can build a complete type map from responseSchema without reading docs

import { describe, test, expect } from "bun:test";
import { handler as schemaHandler } from "../../src/commands/schema";
import type { GlobalFlags } from "../../src/types";

const flags: GlobalFlags = { json: true, dryRun: false, fields: [], cwd: "." };

describe("Schema introspection: full CLI", () => {
  test("returns version, commands, globalFlags, exitCodes", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("version");
    expect(result.data).toHaveProperty("commands");
    expect(result.data).toHaveProperty("globalFlags");
    expect(result.data).toHaveProperty("exitCodes");
  });

  test("every command has a responseSchema array", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const commands = result.data.commands as any[];
    expect(commands.length).toBeGreaterThanOrEqual(8);

    for (const cmd of commands) {
      expect(cmd).toHaveProperty("responseSchema");
      expect(Array.isArray(cmd.responseSchema)).toBe(true);
    }
  });

  test("each responseSchema field has field, type, description", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const commands = result.data.commands as any[];
    for (const cmd of commands) {
      for (const field of cmd.responseSchema) {
        expect(typeof field.field).toBe("string");
        expect(typeof field.type).toBe("string");
        expect(typeof field.description).toBe("string");
        expect(field.field.length).toBeGreaterThan(0);
        expect(field.type.length).toBeGreaterThan(0);
      }
    }
  });

  test("status command responseSchema includes key fields", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const commands = result.data.commands as any[];
    const status = commands.find((c: any) => c.name === "status");
    expect(status).toBeDefined();

    const fieldNames = status.responseSchema.map((f: any) => f.field);
    expect(fieldNames).toContain("project");
    expect(fieldNames).toContain("brand");
    expect(fieldNames).toContain("health");
    expect(fieldNames).toContain("nextActions");
    expect(fieldNames).toContain("brandSummary");
  });
});

describe("Schema introspection: single command", () => {
  test("mktg schema status returns enriched schema", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("name", "status");
    expect(result.data).toHaveProperty("responseSchema");
    expect(Array.isArray((result.data as any).responseSchema)).toBe(true);
  });

  test("single command responseSchema types are parseable", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema;
    const projectField = schema.find((f: any) => f.field === "project");
    expect(projectField).toBeDefined();
    expect(projectField.type).toBe("string");

    const healthField = schema.find((f: any) => f.field === "health");
    expect(healthField).toBeDefined();
    expect(healthField.type.length).toBeGreaterThan(0);
  });

  test("nested fields are marked as nested", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema;
    const nestedFields = schema.filter((f: any) => f.nested === true);
    expect(nestedFields.length).toBeGreaterThan(0);

    // brand.*.isTemplate should be nested
    const templateField = nestedFields.find((f: any) => f.field.includes("isTemplate"));
    expect(templateField).toBeDefined();
  });

  test("unknown command returns error with available list", async () => {
    const result = await schemaHandler(["nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.suggestions.length).toBeGreaterThan(0);
    expect(result.error.suggestions[0]).toContain("Available:");
  });
});

describe("Schema introspection: subcommands", () => {
  test("skill command schema includes subcommands", async () => {
    const result = await schemaHandler(["skill"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as any;
    expect(data).toHaveProperty("subcommands");
    expect(Array.isArray(data.subcommands)).toBe(true);
    expect(data.subcommands.length).toBeGreaterThan(0);
  });

  test("each subcommand has responseSchema", async () => {
    const result = await schemaHandler(["skill"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as any;
    for (const sub of data.subcommands) {
      expect(sub).toHaveProperty("responseSchema");
      expect(Array.isArray(sub.responseSchema)).toBe(true);
    }
  });
});

describe("Schema types are machine-parseable", () => {
  test("an agent can extract field names and types from responseSchema", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema as Array<{ field: string; type: string; description: string }>;

    // Agent can build a type map
    const typeMap: Record<string, string> = {};
    for (const f of schema) {
      if (!f.field.includes(".")) { // skip nested
        typeMap[f.field] = f.type;
      }
    }

    // Agent now knows the output shape
    expect(typeMap["project"]).toBe("string");
    expect(typeMap["health"]).toBeDefined();
    expect(typeMap["brand"]).toBeDefined();
    expect(typeMap["skills"]).toBeDefined();
    expect(Object.keys(typeMap).length).toBeGreaterThanOrEqual(5);
  });

  test("enum fields include enumValues array", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema;
    const healthField = schema.find((f: any) => f.field === "health");
    expect(healthField).toBeDefined();
    expect(healthField.enumValues).toBeDefined();
    expect(Array.isArray(healthField.enumValues)).toBe(true);
    expect(healthField.enumValues).toContain("ready");
    expect(healthField.enumValues).toContain("incomplete");
    expect(healthField.enumValues).toContain("needs-setup");
  });

  test("nested enum fields also get enumValues", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema;
    const freshnessField = schema.find((f: any) => f.field === "brand.*.freshness");
    expect(freshnessField).toBeDefined();
    expect(freshnessField.enumValues).toBeDefined();
    expect(freshnessField.enumValues).toContain("current");
    expect(freshnessField.enumValues).toContain("template");
  });

  test("all top-level fields have required: true", async () => {
    const result = await schemaHandler(["status"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const schema = (result.data as any).responseSchema;
    const topLevel = schema.filter((f: any) => !f.nested);
    for (const field of topLevel) {
      expect(field.required).toBe(true);
    }
  });

  test("globalFlags have typed defaults", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const globalFlags = result.data.globalFlags as any[];
    for (const flag of globalFlags) {
      expect(flag).toHaveProperty("name");
      expect(flag).toHaveProperty("type");
      expect(flag).toHaveProperty("description");
      expect(["string", "boolean", "string[]"]).toContain(flag.type);
    }
  });

  test("exitCodes map numbers to descriptions", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const exitCodes = result.data.exitCodes as Record<string, string>;
    expect(exitCodes["0"]).toContain("Success");
    expect(exitCodes["1"]).toContain("Not found");
    expect(exitCodes["2"]).toContain("Invalid");
  });
});
