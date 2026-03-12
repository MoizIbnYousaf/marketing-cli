// Agent-native consumption pattern tests
// The CMO agent is the primary user of this CLI. These test that the JSON
// contracts the CMO depends on are stable and complete.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags, ExitCode } from "../src/types";
import { formatOutput } from "../src/core/output";
import { exitCodeLabel } from "../src/core/errors";
import { handler as statusHandler } from "../src/commands/status";
import { handler as initHandler } from "../src/commands/init";

// Subprocess runner (same pattern as cli.test.ts)
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

// ---------- JSON output contract ----------

describe("JSON output contract", () => {
  test("mktg status --json output is valid JSON", async () => {
    const { stdout, exitCode } = await run(["status", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("mktg list --json output is valid JSON", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("mktg doctor --json output is valid JSON", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
    expect(exitCode).toBe(0);
  });

  test("unknown command returns valid JSON error", async () => {
    const { stdout, exitCode } = await run(["nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(exitCode).toBe(2);
  });

  test("error responses have error.code, error.message, error.suggestions", async () => {
    const { stdout } = await run(["nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.error.code).toBe("string");
    expect(typeof parsed.error.message).toBe("string");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
  });
});

// ---------- Status JSON shape ----------

describe("status JSON shape", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-test-native-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("health is one of ready, incomplete, needs-setup", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(["ready", "incomplete", "needs-setup"]).toContain(
      result.data.health,
    );
  });

  test("brand is object with 9 keys", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.data.brand)).toHaveLength(9);
  });

  test("each brand entry has exists boolean", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      expect(typeof entry.exists).toBe("boolean");
    }
  });

  test("skills has installed and total as numbers", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.skills.installed).toBe("number");
    expect(typeof result.data.skills.total).toBe("number");
  });

  test("project is a string", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.project).toBe("string");
  });

  test("content has totalFiles as number", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.content.totalFiles).toBe("number");
  });
});

// ---------- Health transitions ----------

describe("health transitions", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-test-health-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("before init: health is needs-setup", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
  });

  test("after init: health is ready (voice-profile exists)", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("ready");
  });

  test("after deleting voice-profile.md: health is incomplete", async () => {
    await initHandler(["--yes"], flags);

    // Delete voice-profile.md
    const voicePath = join(tempDir, "brand", "voice-profile.md");
    await rm(voicePath);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("incomplete");
  });

  test("after deleting entire brand/: health is needs-setup", async () => {
    await initHandler(["--yes"], flags);

    // Delete entire brand directory
    await rm(join(tempDir, "brand"), { recursive: true, force: true });

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
  });
});

// ---------- Multi-project switching ----------

describe("multi-project switching", () => {
  let tempDirA: string;
  let tempDirB: string;

  beforeEach(async () => {
    tempDirA = await mkdtemp(join(tmpdir(), "mktg-projA-"));
    tempDirB = await mkdtemp(join(tmpdir(), "mktg-projB-"));
  });

  afterEach(async () => {
    await Promise.all([
      rm(tempDirA, { recursive: true, force: true }),
      rm(tempDirB, { recursive: true, force: true }),
    ]);
  });

  test("status with --cwd reports different project names", async () => {
    const flagsA: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirA,
    };
    const flagsB: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirB,
    };

    const resultA = await statusHandler([], flagsA);
    const resultB = await statusHandler([], flagsB);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (!resultA.ok || !resultB.ok) return;

    // Different temp dirs have different names
    expect(resultA.data.project).not.toBe(resultB.data.project);
  });

  test("init in project A, status in project B still reports needs-setup", async () => {
    const flagsA: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirA,
    };
    const flagsB: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirB,
    };

    await initHandler(["--yes"], flagsA);

    const resultB = await statusHandler([], flagsB);
    expect(resultB.ok).toBe(true);
    if (!resultB.ok) return;

    expect(resultB.data.health).toBe("needs-setup");
  });

  test("init in both projects independently, both report ready", async () => {
    const flagsA: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirA,
    };
    const flagsB: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: [],
      cwd: tempDirB,
    };

    await initHandler(["--yes"], flagsA);
    await initHandler(["--yes"], flagsB);

    const resultA = await statusHandler([], flagsA);
    const resultB = await statusHandler([], flagsB);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (!resultA.ok || !resultB.ok) return;

    expect(resultA.data.health).toBe("ready");
    expect(resultB.data.health).toBe("ready");
  });
});

// ---------- --fields filtering ----------

describe("--fields filtering", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-test-fields-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("--fields health,project only returns those keys", async () => {
    const flags: GlobalFlags = {
      json: true,
      dryRun: false,
      fields: ["health", "project"],
      cwd: tempDir,
    };

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const output = formatOutput(result, flags);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty("health");
    expect(parsed).toHaveProperty("project");
    expect(parsed).not.toHaveProperty("brand");
    expect(parsed).not.toHaveProperty("skills");
    expect(parsed).not.toHaveProperty("content");
  });
});

// ---------- Idempotency ----------

describe("idempotency", () => {
  let tempDir: string;
  let flags: GlobalFlags;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-test-idempotent-"));
    flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("double init returns same result shape", async () => {
    const result1 = await initHandler(["--yes"], flags);
    const result2 = await initHandler(["--yes"], flags);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    // Same keys present
    expect(Object.keys(result1.data).sort()).toEqual(
      Object.keys(result2.data).sort(),
    );
    expect(result1.data).toHaveProperty("brand");
    expect(result2.data).toHaveProperty("brand");
    expect(result1.data).toHaveProperty("skills");
    expect(result2.data).toHaveProperty("skills");
    expect(result1.data).toHaveProperty("agents");
    expect(result2.data).toHaveProperty("agents");
    expect(result1.data).toHaveProperty("doctor");
    expect(result2.data).toHaveProperty("doctor");
    expect(result1.data).toHaveProperty("project");
    expect(result2.data).toHaveProperty("project");
  });

  test("double update returns same result shape", async () => {
    const { stdout: out1 } = await run(["update", "--json"]);
    const { stdout: out2 } = await run(["update", "--json"]);

    const parsed1 = JSON.parse(out1);
    const parsed2 = JSON.parse(out2);

    // Both should have the same top-level keys
    expect(Object.keys(parsed1).sort()).toEqual(Object.keys(parsed2).sort());
  });

  test("status called 3 times returns identical results", async () => {
    const result1 = await statusHandler([], flags);
    const result2 = await statusHandler([], flags);
    const result3 = await statusHandler([], flags);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result3.ok).toBe(true);
    if (!result1.ok || !result2.ok || !result3.ok) return;

    expect(result1.data.health).toBe(result2.data.health);
    expect(result2.data.health).toBe(result3.data.health);
    expect(result1.data.project).toBe(result2.data.project);
    expect(result2.data.project).toBe(result3.data.project);
    expect(result1.data.skills.total).toBe(result2.data.skills.total);
    expect(result2.data.skills.total).toBe(result3.data.skills.total);
  });
});

// ---------- Error recoverability ----------

describe("error recoverability", () => {
  test("all exit codes (0-6) map to labels", () => {
    const codes: ExitCode[] = [0, 1, 2, 3, 4, 5, 6];

    for (const code of codes) {
      const label = exitCodeLabel(code);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test("exit code labels are distinct", () => {
    const codes: ExitCode[] = [0, 1, 2, 3, 4, 5, 6];
    const labels = codes.map((c) => exitCodeLabel(c));
    const unique = new Set(labels);
    expect(unique.size).toBe(7);
  });

  test("every error result has suggestions array", async () => {
    // Unknown command error
    const { stdout } = await run(["nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
  });

  test("error suggestions are always an array even if empty", async () => {
    // All error constructors produce suggestions arrays
    const { stdout } = await run(["nonexistent"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);

    // Verify the suggestions array contains strings (if non-empty)
    for (const suggestion of parsed.error.suggestions) {
      expect(typeof suggestion).toBe("string");
    }
  });
});
