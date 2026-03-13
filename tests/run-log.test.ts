// Tests for skill execution history (run-log)
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { logRun, getRunHistory, getLastRun, getRunSummary } from "../src/core/run-log";
import type { SkillRunRecord } from "../src/types";

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

// ==================== Unit tests: run-log module ====================

describe("logRun", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("creates .mktg/runs.jsonl and appends record", async () => {
    const record: SkillRunRecord = {
      skill: "brand-voice",
      timestamp: "2026-03-13T10:00:00.000Z",
      result: "success",
      brandFilesChanged: ["voice-profile.md"],
    };
    await logRun(tmpDir, record);

    const content = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.skill).toBe("brand-voice");
    expect(parsed.result).toBe("success");
  });

  test("appends multiple records", async () => {
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T10:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "b", timestamp: "2026-03-13T11:00:00.000Z", result: "failed", brandFilesChanged: [] });

    const content = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]!).skill).toBe("a");
    expect(JSON.parse(lines[1]!).skill).toBe("b");
  });
});

describe("getRunHistory", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array when no log file", async () => {
    const history = await getRunHistory(tmpDir);
    expect(history).toEqual([]);
  });

  test("returns most recent first", async () => {
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T10:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "b", timestamp: "2026-03-13T11:00:00.000Z", result: "success", brandFilesChanged: [] });

    const history = await getRunHistory(tmpDir);
    expect(history[0]!.skill).toBe("b");
    expect(history[1]!.skill).toBe("a");
  });

  test("filters by skill name", async () => {
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T10:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "b", timestamp: "2026-03-13T11:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T12:00:00.000Z", result: "failed", brandFilesChanged: [] });

    const history = await getRunHistory(tmpDir, "a");
    expect(history.length).toBe(2);
    expect(history.every(r => r.skill === "a")).toBe(true);
  });

  test("respects limit parameter", async () => {
    for (let i = 0; i < 10; i++) {
      await logRun(tmpDir, { skill: "x", timestamp: `2026-03-13T${String(i).padStart(2, "0")}:00:00.000Z`, result: "success", brandFilesChanged: [] });
    }
    const history = await getRunHistory(tmpDir, undefined, 3);
    expect(history.length).toBe(3);
  });
});

describe("getLastRun", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns null when no history", async () => {
    const last = await getLastRun(tmpDir, "nonexistent");
    expect(last).toBeNull();
  });

  test("returns most recent run for skill", async () => {
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T10:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T12:00:00.000Z", result: "failed", brandFilesChanged: [] });

    const last = await getLastRun(tmpDir, "a");
    expect(last).not.toBeNull();
    expect(last!.result).toBe("failed");
    expect(last!.timestamp).toBe("2026-03-13T12:00:00.000Z");
  });
});

describe("getRunSummary", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns empty object when no history", async () => {
    const summary = await getRunSummary(tmpDir);
    expect(Object.keys(summary).length).toBe(0);
  });

  test("aggregates per skill with most recent info", async () => {
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T10:00:00.000Z", result: "success", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "b", timestamp: "2026-03-13T11:00:00.000Z", result: "failed", brandFilesChanged: [] });
    await logRun(tmpDir, { skill: "a", timestamp: "2026-03-13T12:00:00.000Z", result: "partial", brandFilesChanged: [] });

    const summary = await getRunSummary(tmpDir);
    expect(summary["a"]).toBeDefined();
    expect(summary["b"]).toBeDefined();
    expect(summary["a"]!.result).toBe("partial"); // most recent
    expect(summary["b"]!.result).toBe("failed");
  });
});

// ==================== CLI tests: skill history + log ====================

describe("mktg skill history", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-cli-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns empty history for fresh project", async () => {
    const { stdout, exitCode } = await run(["skill", "history", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.history).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  test("roundtrip: log → history → verify record", async () => {
    // Log a run
    await run(["skill", "log", "brand-voice", "--json", "--cwd", tmpDir]);

    // Check history
    const { stdout, exitCode } = await run(["skill", "history", "brand-voice", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.history.length).toBe(1);
    expect(parsed.history[0].skill).toBe("brand-voice");
    expect(parsed.history[0].result).toBe("success");
  });
});

describe("mktg skill log", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlog-cli-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("creates a record with default success result", async () => {
    const { stdout, exitCode } = await run(["skill", "log", "seo-content", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.skill).toBe("seo-content");
    expect(parsed.result).toBe("success");
    expect(parsed.timestamp).toBeTruthy();
  });

  test("accepts explicit result argument", async () => {
    const { stdout, exitCode } = await run(["skill", "log", "seo-content", "failed", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.result).toBe("failed");
  });

  test("missing name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "log", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("log file is valid JSONL", async () => {
    await run(["skill", "log", "a", "--json", "--cwd", tmpDir]);
    await run(["skill", "log", "b", "failed", "--json", "--cwd", tmpDir]);

    const content = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(2);
    // Each line should parse independently
    for (const line of lines) {
      const record = JSON.parse(line);
      expect(record.skill).toBeTruthy();
      expect(record.timestamp).toBeTruthy();
    }
  });

  test("--dry-run does not create log file", async () => {
    const { stdout, exitCode } = await run(["skill", "log", "test", "--json", "--dry-run", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.skill).toBe("test");

    const exists = await Bun.file(join(tmpDir, ".mktg", "runs.jsonl")).exists();
    expect(exists).toBe(false);
  });
});
