// Tests for updated CLI integration — 9 commands, schema returns full objects
// No mocks. Real subprocess execution.

import { describe, test, expect } from "bun:test";

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

// ---------- Help text ----------

describe("CLI help includes all 9 commands", () => {
  test("--help output contains all 9 command names", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(exitCode).toBe(0);
    const commandNames = ["init", "doctor", "status", "list", "update", "schema", "skill", "brand", "content"];
    for (const cmd of commandNames) {
      expect(stdout).toContain(cmd);
    }
  });

  test("--help --json commands array has entries for all commands", async () => {
    const { stdout, exitCode } = await run(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    const names = parsed.commands.map((c: { name: string }) => c.name);
    expect(names).toContain("init");
    expect(names).toContain("doctor");
    expect(names).toContain("status");
    expect(names).toContain("list");
    expect(names).toContain("update");
    expect(names).toContain("schema");
    expect(names).toContain("skill");
    expect(names).toContain("brand");
    expect(names).toContain("content");
  });

  test("--help --json has 9 commands", async () => {
    const { stdout } = await run(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.commands).toHaveLength(9);
  });
});

// ---------- Schema returns full objects, not strings ----------

describe("schema returns full command schemas (not string names)", () => {
  test("schema command returns CommandSchema objects with name and description", async () => {
    const { stdout, exitCode } = await run(["schema", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    for (const cmd of parsed.commands) {
      expect(typeof cmd).toBe("object");
      expect(typeof cmd.name).toBe("string");
      expect(typeof cmd.description).toBe("string");
    }
  });

  test("schema commands are not just strings", async () => {
    const { stdout } = await run(["schema", "--json"]);
    const parsed = JSON.parse(stdout);
    // Each command entry should be an object, not a string
    for (const cmd of parsed.commands) {
      expect(typeof cmd).not.toBe("string");
    }
  });
});

// ---------- Existing commands still work ----------

describe("existing commands still work (smoke tests)", () => {
  test("mktg status --json returns valid JSON with health", async () => {
    const { stdout, exitCode } = await run(["status", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.health).toBeDefined();
  });

  test("mktg list --json returns total 32", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.total).toBe(32);
  });

  test("mktg doctor --json returns passed boolean", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(typeof parsed.passed).toBe("boolean");
  });

  test("mktg update --json returns skills object", async () => {
    const { stdout, exitCode } = await run(["update", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.skills).toBeDefined();
  });

  test("mktg --version still works", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("0.1.0");
  });

  test("mktg nonexistent --json still returns UNKNOWN_COMMAND", async () => {
    const { stdout, exitCode } = await run(["nonexistent", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("UNKNOWN_COMMAND");
  });
});

// ---------- Display field integration ----------

describe("display field in CLI pipeline", () => {
  test("list --json does NOT include display in JSON output", async () => {
    const { stdout } = await run(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.display).toBeUndefined();
    expect(parsed._display).toBeUndefined();
  });

  test("status --json does NOT include display in JSON output", async () => {
    const { stdout } = await run(["status", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.display).toBeUndefined();
    expect(parsed._display).toBeUndefined();
  });

  test("update --json does NOT include display in JSON output", async () => {
    const { stdout } = await run(["update", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.display).toBeUndefined();
    expect(parsed._display).toBeUndefined();
  });
});
