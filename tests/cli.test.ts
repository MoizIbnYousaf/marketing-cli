// Integration tests for the CLI entry point via subprocess
// Tests the full pipeline: argv → parse → route → output → exit code

import { describe, test, expect } from "bun:test";

const run = async (
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
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

  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
};

describe("CLI integration", () => {
  test("--version returns version string", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(stdout).toContain("0.1.0");
    expect(exitCode).toBe(0);
  });

  test("--version --json returns JSON", async () => {
    const { stdout, exitCode } = await run(["--version", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("0.1.0");
    expect(exitCode).toBe(0);
  });

  test("--help returns structured JSON when piped (non-TTY auto-JSON)", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    // Piped subprocesses auto-enable JSON output
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("commands");
    expect(parsed).toHaveProperty("version");
    const names = parsed.commands.map((c: { name: string }) => c.name);
    expect(names).toContain("init");
    expect(names).toContain("doctor");
    expect(names).toContain("list");
    expect(names).toContain("status");
    expect(names).toContain("update");
    expect(exitCode).toBe(0);
  });

  test("--help --json returns structured command list", async () => {
    const { stdout, exitCode } = await run(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("commands");
    expect(Array.isArray(parsed.commands)).toBe(true);
    expect(exitCode).toBe(0);
  });

  test("unknown command returns structured error", async () => {
    const { stdout, exitCode } = await run(["nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("UNKNOWN_COMMAND");
    expect(exitCode).toBe(2);
  });

  test("list --json returns skills", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBe(41);
    expect(exitCode).toBe(0);
  });

  test("schema command returns command introspection", async () => {
    const { stdout, exitCode } = await run(["schema"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("commands");
    expect(parsed).toHaveProperty("version");
    expect(exitCode).toBe(0);
  });
});

describe("CLI flag combinations", () => {
  test("--json --dry-run works together", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--dry-run"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("--fields filters output", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "total,installed"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBeDefined();
    expect(parsed.installed).toBeDefined();
    expect(parsed.skills).toBeUndefined();
    expect(exitCode).toBe(0);
  });

  test("no arguments returns JSON help when piped (non-TTY auto-JSON)", async () => {
    const { stdout, exitCode } = await run([]);
    // Piped subprocesses auto-enable JSON output
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("version");
    expect(parsed).toHaveProperty("commands");
    expect(exitCode).toBe(0);
  });

  test("--cwd with nonexistent directory still runs", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--cwd", "/tmp/mktg-nonexistent-dir-xyz"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.health).toBe("needs-setup");
    expect(exitCode).toBe(0);
  });
});

describe("CLI error output is always valid JSON", () => {
  test("unknown command returns parseable JSON", async () => {
    const { stdout } = await run(["foobar"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(typeof parsed.error.code).toBe("string");
    expect(typeof parsed.error.message).toBe("string");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
  });

  test("schema returns all 13 commands", async () => {
    const { stdout, exitCode } = await run(["schema"]);
    const parsed = JSON.parse(stdout);
    const names = parsed.commands.map((c: { name: string }) => c.name);
    expect(names).toContain("init");
    expect(names).toContain("doctor");
    expect(names).toContain("status");
    expect(names).toContain("list");
    expect(names).toContain("update");
    expect(names).toContain("schema");
    expect(names).toContain("skill");
    expect(names).toContain("brand");
    expect(parsed.commands).toHaveLength(13);
    expect(exitCode).toBe(0);
  });
});
