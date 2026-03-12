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

  test("--help returns help text", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(stdout).toContain("mktg");
    expect(stdout).toContain("init");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("list");
    expect(stdout).toContain("status");
    expect(stdout).toContain("update");
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
    expect(parsed.total).toBe(24);
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
