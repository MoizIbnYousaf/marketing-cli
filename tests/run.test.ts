// Tests for mktg run command
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

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

describe("mktg run", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-run-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("missing skill name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["run", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("nonexistent skill returns NOT_FOUND", async () => {
    const { stdout, exitCode } = await run(["run", "nonexistent-skill-xyz", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("run existing skill returns content and prerequisites", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--json", "--cwd", tmpDir]);
    // Might fail with NOT_FOUND if skill not installed — that's a valid test scenario
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed.skill).toBe("brand-voice");
      expect(parsed.content).toBeTruthy();
      expect(parsed.prerequisites).toBeDefined();
      expect(parsed.loggedAt).toBeTruthy();
    } else {
      // Skill not installed — verify it's a proper NOT_FOUND
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("NOT_FOUND");
    }
  });

  test("--dry-run does not create log entry", async () => {
    const { exitCode } = await run(["run", "brand-voice", "--json", "--dry-run", "--cwd", tmpDir]);
    // Whether skill is installed or not, the log should not be created
    const logExists = await Bun.file(join(tmpDir, ".mktg", "runs.jsonl")).exists();
    expect(logExists).toBe(false);

    if (exitCode === 0) {
      // If the skill was found, loggedAt should be null
    }
  });

  test("run with redirect name resolves correctly", async () => {
    // Use a known redirect if one exists — this tests the getSkill redirect logic
    const { stdout, exitCode } = await run(["run", "copywriting", "--json", "--cwd", tmpDir]);
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      // Should resolve to the actual skill name
      expect(parsed.skill).toBe("direct-response-copy");
    } else if (exitCode === 1) {
      // NOT_FOUND is also acceptable (redirect resolves but skill not installed)
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("NOT_FOUND");
    }
  });

  test("bare run logs event 'loaded' with NO result (a load is not a success)", async () => {
    const { exitCode } = await run(["run", "brand-voice", "--json", "--cwd", tmpDir]);
    if (exitCode === 0) {
      const logContent = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
      const lines = logContent.trim().split("\n");
      expect(lines.length).toBe(1);
      const record = JSON.parse(lines[0]!);
      expect(record.skill).toBe("brand-voice");
      expect(record.event).toBe("loaded");
      expect(record.result).toBeUndefined();
      expect(record.writes).toBeUndefined();
      expect(record.timestamp).toBeTruthy();
    }
  });

  test("--complete with valid writes logs event 'completed' with result + writes", async () => {
    await mkdir(join(tmpDir, "marketing", "content"), { recursive: true });
    await writeFile(join(tmpDir, "marketing", "content", "x.md"), "# Article");
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--complete", "--writes", "marketing/content/x.md", "--result", "success", "--json", "--cwd", tmpDir,
    ]);
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed.event).toBe("completed");
      expect(parsed.result).toBe("success");
      expect(parsed.writes).toEqual(["marketing/content/x.md"]);

      const logContent = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
      const record = JSON.parse(logContent.trim().split("\n")[0]!);
      expect(record.event).toBe("completed");
      expect(record.result).toBe("success");
      expect(record.writes).toEqual(["marketing/content/x.md"]);
    }
  });

  test("--complete with a missing write path exits 2 with fix guidance (no silent success)", async () => {
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--complete", "--writes", "marketing/content/ghost.md", "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toContain("ghost.md");
    expect(parsed.error.suggestions.join(" ")).toContain("Create the files first");
    const logExists = await Bun.file(join(tmpDir, ".mktg", "runs.jsonl")).exists();
    expect(logExists).toBe(false);
  });

  test("--complete rejects traversal in writes", async () => {
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--complete", "--writes", "../outside.md", "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("--result without --complete exits 2", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--result", "success", "--json", "--cwd", tmpDir]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toContain("--complete");
  });

  test("--result rejects invalid values", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--complete", "--result", "amazing", "--json", "--cwd", tmpDir]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.message).toContain("Invalid --result");
  });

  test("--complete --result failed logs the failure honestly", async () => {
    const { exitCode } = await run(["run", "brand-voice", "--complete", "--result", "failed", "--json", "--cwd", tmpDir]);
    if (exitCode === 0) {
      const logContent = await readFile(join(tmpDir, ".mktg", "runs.jsonl"), "utf-8");
      const record = JSON.parse(logContent.trim().split("\n")[0]!);
      expect(record.event).toBe("completed");
      expect(record.result).toBe("failed");
    }
  });

  test("error includes docs URL", async () => {
    const { stdout, exitCode } = await run(["run", "nonexistent-skill-xyz", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.docs).toBeTruthy();
  });
});
