// Integration test: MACHINE-READABLE OUTPUT
// Proves all 15 commands produce valid JSON when piped (non-TTY).
// Tests JSON envelope consistency, --json flag, and piped auto-JSON behavior.

import { describe, test, expect } from "bun:test";

// Subprocess runner — stdout is piped (non-TTY), so output should auto-JSON
const run = async (
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests/integration", ""),
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

// Helper: parse and validate JSON
const parseJSON = (stdout: string): unknown => {
  const parsed = JSON.parse(stdout);
  expect(parsed).toBeDefined();
  return parsed;
};

describe("All commands produce valid JSON", () => {
  test("doctor --json returns valid JSON with passed and checks", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof parsed.passed).toBe("boolean");
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(exitCode).toBe(0);
  });

  test("status --json returns valid JSON with health field", async () => {
    const { stdout, exitCode } = await run(["status", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof parsed.health).toBe("string");
    expect(parsed.brand).toBeDefined();
    expect(parsed.skills).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("list --json returns valid JSON with skills array and total", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(Array.isArray(parsed.skills)).toBe(true);
    expect(typeof parsed.total).toBe("number");
    expect(exitCode).toBe(0);
  });

  test("update --json returns valid JSON with skills object", async () => {
    const { stdout, exitCode } = await run(["update", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.skills).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("schema --json returns valid JSON with commands, globalFlags, exitCodes", async () => {
    const { stdout, exitCode } = await run(["schema", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(Array.isArray(parsed.commands)).toBe(true);
    expect(Array.isArray(parsed.globalFlags)).toBe(true);
    expect(parsed.exitCodes).toBeDefined();
    expect(parsed.version).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("init --json (missing input) returns valid JSON error envelope", async () => {
    const { stdout, exitCode } = await run(["init", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    // Init without --yes returns an error asking for input
    expect(parsed.error || parsed.brand).toBeDefined();
  });

  test("skill --json (no subcommand) returns valid JSON error", async () => {
    const { stdout, exitCode } = await run(["skill", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.error).toBeDefined();
    expect(exitCode).not.toBe(0);
  });

  test("brand --json (no subcommand) returns valid JSON error", async () => {
    const { stdout, exitCode } = await run(["brand", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.error).toBeDefined();
    expect(exitCode).not.toBe(0);
  });

  test("run --json (no skill) returns valid JSON error", async () => {
    const { stdout, exitCode } = await run(["run", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.error).toBeDefined();
    expect(exitCode).not.toBe(0);
  });

  test("dashboard snapshot --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "snapshot", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(parsed.project).toBeDefined();
    expect(parsed.health).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("dashboard plan --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "plan", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(Array.isArray(parsed.tasks)).toBe(true);
    expect(typeof parsed.summary).toBe("string");
    expect(exitCode).toBe(0);
  });

  test("dashboard outputs --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "outputs", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(Array.isArray(parsed.recentRuns)).toBe(true);
    expect(Array.isArray(parsed.outputs)).toBe(true);
    expect(parsed.publishReadiness).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("dashboard publish --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "publish", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(Array.isArray(parsed.adapters)).toBe(true);
    expect(Array.isArray(parsed.manifests)).toBe(true);
    expect(parsed.publishReadiness).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("dashboard system --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "system", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(parsed.health).toBeDefined();
    expect(parsed.skills).toBeDefined();
    expect(parsed.agents).toBeDefined();
    expect(Array.isArray(parsed.capabilityIndex)).toBe(true);
    expect(exitCode).toBe(0);
  });

  test("dashboard compete --json returns valid JSON", async () => {
    const { stdout, exitCode } = await run(["dashboard", "compete", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.trackedCount).toBe("number");
    expect(Array.isArray(parsed.targets)).toBe(true);
    expect(exitCode).toBe(0);
  });
});

describe("JSON error envelope consistency", () => {
  test("unknown command returns error with code, message, suggestions", async () => {
    const { stdout, exitCode } = await run(["nonexistent"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    const error = parsed.error as Record<string, unknown>;
    expect(typeof error.code).toBe("string");
    expect(typeof error.message).toBe("string");
    expect(Array.isArray(error.suggestions)).toBe(true);
    expect(exitCode).toBe(2);
  });

  test("missing required arg returns error with code, message, suggestions", async () => {
    const { stdout } = await run(["run", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    const error = parsed.error as Record<string, unknown>;
    expect(typeof error.code).toBe("string");
    expect(typeof error.message).toBe("string");
    expect(Array.isArray(error.suggestions)).toBe(true);
  });

  test("invalid skill name returns error with NOT_FOUND code", async () => {
    const { stdout } = await run(["skill", "info", "nonexistent-skill-xyz", "--json"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    const error = parsed.error as Record<string, unknown>;
    expect(error.code).toBe("NOT_FOUND");
  });
});

describe("Piped output auto-JSON (non-TTY)", () => {
  test("piped doctor output is valid JSON without --json flag", async () => {
    // Our subprocess runner pipes stdout, so non-TTY is automatic
    const { stdout } = await run(["doctor"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof parsed.passed).toBe("boolean");
  });

  test("piped status output is valid JSON without --json flag", async () => {
    const { stdout } = await run(["status"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof parsed.health).toBe("string");
  });

  test("piped list output is valid JSON without --json flag", async () => {
    const { stdout } = await run(["list"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof parsed.total).toBe("number");
  });

  test("piped schema output is valid JSON without --json flag", async () => {
    const { stdout } = await run(["schema"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(Array.isArray(parsed.commands)).toBe(true);
  });
});

describe("--fields filtering produces valid JSON subset", () => {
  test("--fields total on list returns only total", async () => {
    const { stdout } = await run(["list", "--json", "--fields", "total"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.total).toBeDefined();
    expect(parsed.skills).toBeUndefined();
  });

  test("--fields health on status returns only health", async () => {
    const { stdout } = await run(["status", "--json", "--fields", "health"]);
    const parsed = parseJSON(stdout) as Record<string, unknown>;
    expect(parsed.health).toBeDefined();
    expect(parsed.brand).toBeUndefined();
  });
});
