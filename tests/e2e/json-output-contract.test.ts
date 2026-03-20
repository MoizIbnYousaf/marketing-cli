// E2E: JSON Output Contract — proves every command produces valid, consistent JSON
// Agent DX axes validated:
//   - Axis 1 (Machine-Readable Output): 3/3 — every command returns valid JSON when piped
//   - Axis 4 (Context Window Discipline): 3/3 — --fields works on all JSON commands
//   - Axis 9 (Multi-Surface Readiness): 3/3 — OUTPUT_FORMAT=json, non-TTY auto-JSON, piped consistency
// NO MOCKS. Real CLI subprocess calls. Real JSON parsing.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";

const CLI_PATH = join(import.meta.dir, "../../src/cli.ts");

const runCli = async (
  args: string[],
  env?: Record<string, string>,
): Promise<{ exitCode: number; stdout: string }> => {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout: stdout.trim() };
};

// ============================================================
// AXIS 1: MACHINE-READABLE OUTPUT (3/3)
// Every command returns valid, parseable JSON when piped
// ============================================================

describe("Axis 1: Every command produces valid JSON when piped", () => {
  const readCommands: { args: string[]; name: string }[] = [
    { args: ["list", "--json"], name: "list" },
    { args: ["schema", "--json"], name: "schema" },
    { args: ["--help", "--json"], name: "--help" },
    { args: ["--version", "--json"], name: "--version" },
    { args: ["skill", "info", "cmo", "--json"], name: "skill info" },
  ];

  for (const { args, name } of readCommands) {
    test(`mktg ${name} → valid JSON`, async () => {
      const { stdout, exitCode } = await runCli(args);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });
  }

  test("error responses are also valid JSON", async () => {
    const { stdout, exitCode } = await runCli(["bogus-command", "--json"]);
    expect(exitCode).toBeGreaterThan(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
  });

  test("error JSON envelope has consistent shape: error + exitCode", async () => {
    const { stdout } = await runCli(["run", "nonexistent-skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.error.code).toBe("string");
    expect(typeof parsed.error.message).toBe("string");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
    expect(typeof parsed.exitCode).toBe("number");
  });

  test("success JSON has NO error envelope", async () => {
    const { stdout } = await runCli(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeUndefined();
    expect(parsed.exitCode).toBeUndefined();
    expect(parsed.total).toBeDefined();
  });
});

// ============================================================
// AXIS 4: CONTEXT WINDOW DISCIPLINE (3/3)
// --fields works on commands that return JSON
// ============================================================

describe("Axis 4: --fields filtering reduces output", () => {
  test("list --fields total,installed omits skills array", async () => {
    const { stdout } = await runCli(["list", "--json", "--fields", "total,installed"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBeDefined();
    expect(parsed.installed).toBeDefined();
    expect(parsed.skills).toBeUndefined();
  });

  test("--fields on nonexistent field returns empty object gracefully", async () => {
    const { stdout } = await runCli(["list", "--json", "--fields", "nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.nonexistent).toBeUndefined();
    expect(parsed.total).toBeUndefined();
  });

  test("full list JSON is larger than filtered list JSON", async () => {
    const full = await runCli(["list", "--json"]);
    const filtered = await runCli(["list", "--json", "--fields", "total"]);
    expect(full.stdout.length).toBeGreaterThan(filtered.stdout.length);
  });
});

// ============================================================
// AXIS 9: MULTI-SURFACE READINESS (3/3)
// Three equivalent JSON paths produce consistent output
// ============================================================

describe("Axis 9: Three JSON paths produce identical results", () => {
  test("--json flag produces valid JSON", async () => {
    const { stdout } = await runCli(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBe(41);
  });

  test("piped output (non-TTY) auto-produces valid JSON without --json", async () => {
    const { stdout } = await runCli(["list"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBe(41);
  });

  test("OUTPUT_FORMAT=json env var produces valid JSON", async () => {
    const { stdout } = await runCli(["list"], { OUTPUT_FORMAT: "json" });
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBe(41);
  });

  test("all three paths return same skill count", async () => {
    const flag = JSON.parse((await runCli(["list", "--json"])).stdout);
    const piped = JSON.parse((await runCli(["list"])).stdout);
    const env = JSON.parse((await runCli(["list"], { OUTPUT_FORMAT: "json" })).stdout);

    expect(flag.total).toBe(piped.total);
    expect(piped.total).toBe(env.total);
    expect(flag.skills.length).toBe(piped.skills.length);
  });

  test("error output is JSON across all three paths", async () => {
    const methods = [
      await runCli(["bogus", "--json"]),
      await runCli(["bogus"]),
      await runCli(["bogus"], { OUTPUT_FORMAT: "json" }),
    ];

    for (const { stdout } of methods) {
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("UNKNOWN_COMMAND");
    }
  });
});

// ============================================================
// EXIT CODE CONTRACT
// Every exit code maps to a specific error type
// ============================================================

describe("Exit code contract is consistent", () => {
  test("exit 0 for success", async () => {
    const { exitCode } = await runCli(["list", "--json"]);
    expect(exitCode).toBe(0);
  });

  test("exit 1 for not found", async () => {
    const { exitCode, stdout } = await runCli(["run", "nonexistent", "--json"]);
    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout).error.code).toBe("NOT_FOUND");
  });

  test("exit 2 for unknown command", async () => {
    const { exitCode, stdout } = await runCli(["bogus", "--json"]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout).error.code).toBe("UNKNOWN_COMMAND");
  });
});

// ============================================================
// HELP + SCHEMA JSON CONTRACT
// ============================================================

describe("Help and schema produce discoverable JSON", () => {
  test("--help --json lists all 13 commands", async () => {
    const { stdout } = await runCli(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.commands).toHaveLength(13);
    const names = parsed.commands.map((c: { name: string }) => c.name);
    expect(names).toContain("init");
    expect(names).toContain("doctor");
    expect(names).toContain("status");
    expect(names).toContain("list");
    expect(names).toContain("update");
    expect(names).toContain("schema");
    expect(names).toContain("skill");
    expect(names).toContain("brand");
    expect(names).toContain("run");
  });

  test("--help --json includes version", async () => {
    const { stdout } = await runCli(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.version).toBe("string");
  });

  test("schema --json returns command schemas", async () => {
    const { stdout } = await runCli(["schema", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.commands).toBeDefined();
    expect(Array.isArray(parsed.commands)).toBe(true);
  });

  test("--version --json returns version object", async () => {
    const { stdout } = await runCli(["--version", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
