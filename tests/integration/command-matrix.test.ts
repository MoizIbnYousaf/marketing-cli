import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TOP_LEVEL_COMMANDS } from "../../src/core/command-registry";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CLI_ENTRY = join(REPO_ROOT, "src/cli.ts");

const runCli = async (
  args: string[],
  cwd = REPO_ROOT,
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn(["bun", "run", CLI_ENTRY, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
};

type SmokeCase = {
  args: (tmpCwd: string) => string[];
  key: string;
};

const SMOKE_CASES: Record<string, SmokeCase> = {
  init: { args: (tmpCwd) => ["init", "--dry-run", "--json", "--cwd", tmpCwd], key: "brand" },
  doctor: { args: (tmpCwd) => ["doctor", "--json", "--cwd", tmpCwd], key: "checks" },
  status: { args: (tmpCwd) => ["status", "--json", "--cwd", tmpCwd], key: "health" },
  list: { args: () => ["list", "--json"], key: "skills" },
  update: { args: () => ["update", "--dry-run", "--json"], key: "skills" },
  schema: { args: () => ["schema", "status", "--json"], key: "name" },
  skill: { args: () => ["skill", "info", "cmo", "--json"], key: "name" },
  brand: { args: (tmpCwd) => ["brand", "freshness", "--json", "--cwd", tmpCwd], key: "files" },
  run: { args: () => ["run", "cmo", "--dry-run", "--json"], key: "skill" },
  transcribe: { args: () => ["transcribe", "https://example.com/audio.mp3", "--dry-run", "--json"], key: "action" },
  context: { args: (tmpCwd) => ["context", "--json", "--cwd", tmpCwd], key: "files" },
  plan: { args: (tmpCwd) => ["plan", "--json", "--cwd", tmpCwd], key: "tasks" },
  publish: { args: () => ["publish", "--list-adapters", "--json"], key: "adapters" },
  compete: { args: (tmpCwd) => ["compete", "list", "--json", "--cwd", tmpCwd], key: "urls" },
  dashboard: { args: (tmpCwd) => ["dashboard", "snapshot", "--json", "--cwd", tmpCwd], key: "health" },
  catalog: { args: () => ["catalog", "list", "--json"], key: "catalogs" },
  studio: { args: () => ["studio", "--dry-run", "--json"], key: "mode" },
  verify: { args: () => ["verify", "--dry-run", "--json"], key: "suites" },
  "ship-check": { args: () => ["ship-check", "--dry-run", "--json"], key: "checks" },
  cmo: { args: () => ["cmo", "help me market this app", "--dry-run", "--json"], key: "prompt" },
  release: { args: () => ["release", "patch", "--dry-run", "--json"], key: "version_old" },
};

describe("mktg full command surface", () => {
  test("runtime registry exposes the current top-level commands", () => {
    expect(TOP_LEVEL_COMMANDS.length).toBeGreaterThanOrEqual(20);
  });

  test("global help JSON exposes the same top-level command set as the router", async () => {
    const { exitCode, stdout } = await runCli(["--help", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as { commands: Array<{ name: string }> };
    const helpNames = parsed.commands.map((c) => c.name).sort();
    expect(helpNames).toEqual([...TOP_LEVEL_COMMANDS].sort());
  });

  test("schema JSON exposes the same top-level command set as the router", async () => {
    const { exitCode, stdout } = await runCli(["schema", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as { commands: Array<{ name: string }> };
    const schemaNames = parsed.commands.map((c) => c.name).sort();
    expect(schemaNames).toEqual([...TOP_LEVEL_COMMANDS].sort());
  });
});

describe("mktg per-command schema lookup", () => {
  for (const command of TOP_LEVEL_COMMANDS) {
    test(`schema ${command} returns a complete command schema`, async () => {
      const { exitCode, stdout } = await runCli(["schema", command, "--json"]);
      expect(exitCode).toBe(0);

      const parsed = JSON.parse(stdout) as {
        name: string;
        description: string;
        flags: unknown[];
        examples?: unknown[];
      };

      expect(parsed.name).toBe(command);
      expect(typeof parsed.description).toBe("string");
      expect(parsed.description.length).toBeGreaterThan(0);
      expect(Array.isArray(parsed.flags)).toBe(true);
      expect(Array.isArray(parsed.examples)).toBe(true);
      expect(parsed.examples!.length).toBeGreaterThan(0);
    });
  }
});

describe("mktg command smoke matrix", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mktg-command-matrix-"));

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  for (const command of TOP_LEVEL_COMMANDS) {
    test(`smoke: ${command}`, async () => {
      const smoke = SMOKE_CASES[command];
      expect(smoke).toBeDefined();

      const { exitCode, stdout } = await runCli(smoke.args(tempDir), REPO_ROOT);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();

      const parsed = JSON.parse(stdout) as Record<string, unknown>;
      expect(parsed).toBeDefined();
      expect(parsed[smoke.key]).toBeDefined();
    });
  }

  test("smoke map covers every top-level command exactly once", () => {
    expect(Object.keys(SMOKE_CASES).sort()).toEqual([...TOP_LEVEL_COMMANDS].sort());
  });
});
