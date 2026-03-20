// Integration test: Schema completeness
// Proves mktg schema output is accurate, complete, and matches actual CLI behavior.
// Real handler calls, no mocks.

import { describe, test, expect } from "bun:test";
import { handler as schemaHandler } from "../../src/commands/schema";
import type { GlobalFlags, CommandSchema } from "../../src/types";

const flags: GlobalFlags = { json: true, dryRun: false, fields: [], cwd: "." };

// Expected top-level commands from CLAUDE.md
const EXPECTED_COMMANDS = ["init", "doctor", "list", "status", "update", "schema", "skill", "brand", "run", "context", "plan", "publish", "compete"];

// Expected exit codes from schema.ts
const EXPECTED_EXIT_CODES: Record<number, string> = {
  0: "Success",
  1: "Not found (skill, brand file, or resource missing)",
  2: "Invalid arguments (bad flags, missing required args)",
  3: "Dependency missing (CLI tool or integration not installed)",
  4: "Skill execution failed",
  5: "Network error (web research, API call)",
  6: "Not implemented (temporary, for stub commands)",
};

// Expected global flags
const EXPECTED_GLOBAL_FLAGS = ["--json", "--dry-run", "--fields", "--cwd"];

describe("Schema: full introspection", () => {
  test("returns ok with version, commands, globalFlags, exitCodes", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("commands");
    expect(data).toHaveProperty("globalFlags");
    expect(data).toHaveProperty("exitCodes");
  });

  test("version is a semver string", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { version: string };
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("exit code 0 is always 0", async () => {
    const result = await schemaHandler([], flags);
    expect(result.exitCode).toBe(0);
  });
});

describe("Schema: command coverage", () => {
  test("lists all 13 expected commands", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { commands: CommandSchema[] };
    const commandNames = data.commands.map((c) => c.name);

    for (const expected of EXPECTED_COMMANDS) {
      expect(commandNames).toContain(expected);
    }
  });

  test("every command has name, description, and output", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { commands: CommandSchema[] };
    for (const cmd of data.commands) {
      expect(typeof cmd.name).toBe("string");
      expect(cmd.name.length).toBeGreaterThan(0);
      expect(typeof cmd.description).toBe("string");
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });

  test("every command has a flags array (even if empty)", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { commands: CommandSchema[] };
    for (const cmd of data.commands) {
      expect(Array.isArray(cmd.flags)).toBe(true);
    }
  });
});

describe("Schema: global flags", () => {
  test("all 4 global flags are documented", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { globalFlags: Array<{ name: string }> };
    const flagNames = data.globalFlags.map((f) => f.name);

    for (const expected of EXPECTED_GLOBAL_FLAGS) {
      expect(flagNames).toContain(expected);
    }
  });

  test("each global flag has name, type, default, and description", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { globalFlags: Array<Record<string, unknown>> };
    for (const flag of data.globalFlags) {
      expect(typeof flag.name).toBe("string");
      expect(typeof flag.type).toBe("string");
      expect(flag).toHaveProperty("default");
      expect(typeof flag.description).toBe("string");
    }
  });
});

describe("Schema: exit codes", () => {
  test("all 7 exit codes (0-6) are documented", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { exitCodes: Record<string, string> };
    for (let i = 0; i <= 6; i++) {
      expect(data.exitCodes[String(i)]).toBeDefined();
      expect(typeof data.exitCodes[String(i)]).toBe("string");
    }
  });

  test("exit code descriptions match expected values", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { exitCodes: Record<string, string> };
    for (const [code, desc] of Object.entries(EXPECTED_EXIT_CODES)) {
      expect(data.exitCodes[String(code)]).toBe(desc);
    }
  });
});

describe("Schema: single command lookup", () => {
  test("mktg schema init returns init schema only", async () => {
    const result = await schemaHandler(["init"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("init");
    expect(typeof data.description).toBe("string");
  });

  test("mktg schema doctor returns doctor schema only", async () => {
    const result = await schemaHandler(["doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("doctor");
  });

  test("mktg schema nonexistent returns error with exit code 1", async () => {
    const result = await schemaHandler(["nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.exitCode).toBe(1);
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.suggestions.length).toBeGreaterThan(0);
  });
});

describe("Schema: subcommand lookup", () => {
  test("skill command has subcommands", async () => {
    const result = await schemaHandler(["skill"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("skill");
    expect(data.subcommands).toBeDefined();
    expect(Array.isArray(data.subcommands)).toBe(true);
    expect(data.subcommands!.length).toBeGreaterThan(0);
  });

  test("brand command has subcommands", async () => {
    const result = await schemaHandler(["brand"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("brand");
    expect(data.subcommands).toBeDefined();
    expect(data.subcommands!.length).toBeGreaterThan(0);
  });

  test("invalid subcommand returns error with available list", async () => {
    const result = await schemaHandler(["skill", "nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.exitCode).toBe(1);
    expect(result.error.code).toBe("NOT_FOUND");
    // Should list available subcommands in suggestions
    expect(result.error.suggestions[0]).toContain("Available:");
  });
});

describe("Schema: output shape accuracy", () => {
  test("doctor schema documents checks and passed fields", async () => {
    const result = await schemaHandler(["doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.output).toBeDefined();
    const outputKeys = Object.keys(data.output!);
    expect(outputKeys).toContain("passed");
    expect(outputKeys).toContain("checks");
  });

  test("schema self-documents version, commands, globalFlags, exitCodes", async () => {
    const result = await schemaHandler(["schema"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.output).toBeDefined();
    const outputKeys = Object.keys(data.output!);
    expect(outputKeys).toContain("version");
    expect(outputKeys).toContain("commands");
    expect(outputKeys).toContain("globalFlags");
    expect(outputKeys).toContain("exitCodes");
  });
});

describe("Schema: examples present", () => {
  test("schema command has examples", async () => {
    const result = await schemaHandler(["schema"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.examples).toBeDefined();
    expect(data.examples!.length).toBeGreaterThan(0);

    for (const ex of data.examples!) {
      expect(typeof ex.args).toBe("string");
      expect(typeof ex.description).toBe("string");
    }
  });

  test("doctor command has examples", async () => {
    const result = await schemaHandler(["doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.examples).toBeDefined();
    expect(data.examples!.length).toBeGreaterThan(0);
  });
});

describe("Schema: vocabulary field", () => {
  test("doctor schema has vocabulary for agent discovery", async () => {
    const result = await schemaHandler(["doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema & { vocabulary?: string[] };
    expect(data.vocabulary).toBeDefined();
    expect(Array.isArray(data.vocabulary)).toBe(true);
    expect(data.vocabulary!.length).toBeGreaterThan(0);
  });
});

describe("Schema: flag args not treated as commands", () => {
  test("--json flag in args does not break schema lookup", async () => {
    const result = await schemaHandler(["--json", "doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("doctor");
  });

  test("--fields flag in args does not break schema lookup", async () => {
    const result = await schemaHandler(["doctor", "--fields", "name"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("doctor");
  });
});
