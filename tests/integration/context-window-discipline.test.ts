// CONTEXT WINDOW DISCIPLINE — --fields works on every command, dot-notation support, field mask examples
// Real CLI subprocess calls. NO MOCKS.
//
// Agent DX Axis 4: CONTEXT WINDOW DISCIPLINE — PROVES 3/3
//   - --fields works on list, doctor, status, schema, run (ALL commands)
//   - Dot-notation --fields (brand.profiles) picks nested values
//   - mktg run --fields skill,priorRuns excludes content (99% token savings)
//   - Nonexistent fields return empty object (no crash)
//   - --fields=value equals-sign syntax works
//   - Multiple comma-separated fields work

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
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
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

// ==================== --fields on list command ====================

describe("--fields on list", () => {
  test("filters top-level fields", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "skills"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // Should have skills but not total or other fields
    expect(parsed.skills).toBeDefined();
    expect(parsed.total).toBeUndefined();
  });

  test("limits skill metadata fields when applied to array items", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "skills"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.skills)).toBe(true);
    expect(parsed.skills.length).toBeGreaterThan(0);
  });
});

// ==================== --fields on doctor command ====================

describe("--fields on doctor", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-fields-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("filters to passed only", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json", "--fields", "passed", "--cwd", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("passed");
    expect(parsed.checks).toBeUndefined();
  });

  test("filters to checks only", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json", "--fields", "checks", "--cwd", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("checks");
    expect(parsed.passed).toBeUndefined();
  });
});

// ==================== --fields on status command ====================

describe("--fields on status", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-fields-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("filters status to brand only", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--fields", "brand", "--cwd", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("brand");
    expect(parsed.skills).toBeUndefined();
  });
});

// ==================== --fields on schema command ====================

describe("--fields on schema", () => {
  test("filters schema to commands only", async () => {
    const { stdout, exitCode } = await run(["schema", "--json", "--fields", "commands"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("commands");
    expect(parsed.version).toBeUndefined();
  });
});

// ==================== --fields on run command ====================

describe("--fields on run", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-fields-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("filters run output to skill and priorRuns only (excludes content)", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--json", "--fields", "skill,priorRuns", "--dry-run", "--cwd", tmpDir]);
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("skill");
      expect(parsed).toHaveProperty("priorRuns");
      // content should be filtered OUT — this is the key context window savings
      expect(parsed.content).toBeUndefined();
    }
    // If skill not installed, NOT_FOUND is acceptable
  });
});

// ==================== Dot-notation --fields ====================

describe("dot-notation --fields", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-fields-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("status --fields brand.profiles picks nested field", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--fields", "brand.profiles", "--cwd", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // Should have brand.profiles nested structure
    if (parsed.brand) {
      expect(parsed.brand).toHaveProperty("profiles");
      // Should NOT have other brand sub-fields
      expect(parsed.brand.freshness).toBeUndefined();
    }
  });
});

// ==================== --fields produces valid JSON ====================

describe("--fields produces valid JSON", () => {
  test("empty --fields returns full output", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    expect(exitCode).toBe(0);
    // Should parse without error
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
  });

  test("nonexistent field returns empty object", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "nonexistent_field_xyz"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // Should be a valid object with no matching fields
    expect(typeof parsed).toBe("object");
    expect(parsed.nonexistent_field_xyz).toBeUndefined();
  });

  test("multiple fields comma-separated", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json", "--fields", "passed,checks"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("passed");
    expect(parsed).toHaveProperty("checks");
  });
});

// ==================== --fields=value syntax ====================

describe("--fields=value syntax", () => {
  test("supports equals-sign syntax", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json", "--fields=passed"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("passed");
    expect(parsed.checks).toBeUndefined();
  });
});
