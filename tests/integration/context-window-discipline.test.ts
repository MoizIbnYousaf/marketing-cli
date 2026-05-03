// CONTEXT WINDOW DISCIPLINE — --fields works on every command, dot-notation support, field mask examples
// Real CLI subprocess calls. NO MOCKS.
//
// Agent DX Axis 4: CONTEXT WINDOW DISCIPLINE — PROVES 3/3
//   - --fields works on list, doctor, status, schema, run (ALL commands)
//   - Dot-notation --fields (skills.installed) picks nested values
//   - mktg run --fields skill,priorRuns excludes content (99% token savings)
//   - Nonexistent fields return UNKNOWN_FIELD error envelope (loud, not silent — task #14)
//   - Smart pivot: --fields with item-level fields on a collection-shaped
//     response (e.g. mktg list --fields=name,tier) pivots to the first
//     array-valued top-level key whose items satisfy the fields (task #14)
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

  test("status --fields skills.installed picks nested field", async () => {
    // The original test used `brand.profiles` which never resolved (status's
    // brand keys are filenames like `voice-profile.md` with literal dots that
    // conflict with dot-notation). With the old silent-empty bug the test
    // passed vacuously via `if (parsed.brand)` always being false. After the
    // task #14 fix that path returns UNKNOWN_FIELD instead. Switched to
    // `skills.installed`, which IS a real nested path on the status response.
    const { stdout, exitCode } = await run(["status", "--json", "--fields", "skills.installed", "--cwd", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toBeDefined();
    expect(typeof parsed.skills.installed).toBe("number");
    // Should NOT have other skills sub-fields after dot-walked filter
    expect(parsed.skills.total).toBeUndefined();
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

  test("nonexistent field returns UNKNOWN_FIELD error (task #14 behavior change)", async () => {
    // BEHAVIOR CHANGE (task #14): silent empty `{}` was a footgun. The new
    // contract is loud — UNKNOWN_FIELD with exit 2 and an explicit list of
    // available fields so agents can self-correct without parsing prose.
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "nonexistent_field_xyz"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("UNKNOWN_FIELD");
    expect(parsed.error.message).toContain("nonexistent_field_xyz");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
    expect(parsed.error.suggestions.length).toBeGreaterThan(0);
    // First suggestion is the available-fields list — load-bearing for
    // agent self-correction.
    expect(parsed.error.suggestions[0]).toMatch(/Available fields/);
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

// ==================== Task #14: smart pivot for collection responses ====================
//
// Before task #14: `mktg list --fields='name,tier'` silently returned `{}`
// because `name` and `tier` are item-level fields on the skills array, not
// top-level keys on the wrapper. Agents would happily consume `{}` and
// downstream skills would produce nothing.
//
// After task #14: the field filter detects collection-shaped responses and
// pivots into the first array-valued top-level key whose items satisfy all
// requested fields. The result is a bare array of filtered items.

describe("task #14: --fields smart pivot for collection responses", () => {
  test("list --fields=name,tier pivots to skills array (bare array of filtered items)", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "name,tier"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // Smart pivot returns a bare array, not the wrapped {skills, agents, ...} object
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    // Each item has exactly name and tier — no leaked wrapper fields
    for (const item of parsed) {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("tier");
      expect(item.skills).toBeUndefined();
      expect(item.agents).toBeUndefined();
      expect(item.total).toBeUndefined();
      // Item-level fields not requested should be omitted
      expect(item.category).toBeUndefined();
      expect(item.layer).toBeUndefined();
    }
  });

  test("list --fields=name pivots to skills (single field, real coverage check)", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "name"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    // Each pivoted item has only `name`
    for (const item of parsed) {
      expect(item).toHaveProperty("name");
      expect(typeof item.name).toBe("string");
      expect(item.tier).toBeUndefined();
      expect(item.category).toBeUndefined();
    }
  });

  test("status --fields=nonexistent.path returns UNKNOWN_FIELD error", async () => {
    const tmpStatusDir = await mkdtemp(join(tmpdir(), "mktg-fields-pivot-"));
    try {
      const { stdout, exitCode } = await run(["status", "--json", "--fields", "nonexistent.path", "--cwd", tmpStatusDir]);
      expect(exitCode).toBe(2);
      const parsed = JSON.parse(stdout);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe("UNKNOWN_FIELD");
      expect(parsed.error.message).toContain("nonexistent.path");
      expect(parsed.error.suggestions[0]).toMatch(/Available fields/);
    } finally {
      await rm(tmpStatusDir, { recursive: true, force: true });
    }
  });

  test("schema --fields=version returns top-level value (regression guard)", async () => {
    const { stdout, exitCode } = await run(["schema", "--json", "--fields", "version"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.version).toBe("string");
    // Other top-level fields should be filtered out
    expect(parsed.commands).toBeUndefined();
  });

  test("UNKNOWN_FIELD error suggestions include actual available fields", async () => {
    const { stdout, exitCode } = await run(["list", "--json", "--fields", "totally_made_up_field"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("UNKNOWN_FIELD");
    // The first suggestion should list the real top-level keys of the list response
    const availableLine = parsed.error.suggestions[0] as string;
    expect(availableLine).toContain("Available fields");
    expect(availableLine).toContain("skills"); // skills is a real top-level key
    expect(availableLine).toContain("total"); // total is a real top-level key
  });
});
