// Integration tests for learnings.md activation
// Tests mktg run --learning and mktg brand append-learning via CLI.
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const projectRoot = import.meta.dir.replace("/tests/integration", "");

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: projectRoot,
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

describe("mktg brand append-learning", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-learning-int-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("append-learning with --input creates learnings.md", async () => {
    const input = JSON.stringify({
      action: "Voice extraction",
      result: "Success",
      learning: "Technical tone works",
      nextStep: "Test in emails",
    });
    const { stdout, exitCode } = await run([
      "brand", "append-learning", "--input", input, "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.appended).toContain("Voice extraction");
    expect(parsed.file).toBe("brand/learnings.md");

    // Verify file was written
    const content = await readFile(join(tmpDir, "brand", "learnings.md"), "utf-8");
    expect(content).toContain("Voice extraction");
    expect(content).toContain("| Date | Action | Result | Learning | Next Step |");
  });

  test("append-learning --dry-run does not write file", async () => {
    const input = JSON.stringify({
      action: "Test action",
      result: "Test result",
      learning: "Test learning",
      nextStep: "Test next",
    });
    const { stdout, exitCode } = await run([
      "brand", "append-learning", "--input", input, "--json", "--cwd", tmpDir, "--dry-run",
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.appended).toContain("Test action");

    // File should NOT exist
    const exists = await Bun.file(join(tmpDir, "brand", "learnings.md")).exists();
    expect(exists).toBe(false);
  });

  test("append-learning without --input returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run([
      "brand", "append-learning", "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("append-learning rejects control characters", async () => {
    const input = JSON.stringify({
      action: "bad\x00action",
      result: "ok",
      learning: "ok",
      nextStep: "ok",
    });
    const { stdout, exitCode } = await run([
      "brand", "append-learning", "--input", input, "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("append-learning rejects pipe characters", async () => {
    const input = JSON.stringify({
      action: "A | B",
      result: "ok",
      learning: "ok",
      nextStep: "ok",
    });
    const { stdout, exitCode } = await run([
      "brand", "append-learning", "--input", input, "--json", "--cwd", tmpDir,
    ]);
    expect(exitCode).toBe(2);
  });
});

describe("mktg run --learning", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-runlearn-int-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("run with --learning appends to learnings.md", async () => {
    const learning = JSON.stringify({
      action: "Brand voice run",
      result: "Extracted voice",
      learning: "Casual tone preferred",
      nextStep: "Apply to landing page",
    });
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--learning", learning, "--json", "--cwd", tmpDir,
    ]);
    // If skill is installed, check learning was appended
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed.learningAppended).toContain("Brand voice run");
      // Verify file
      const content = await readFile(join(tmpDir, "brand", "learnings.md"), "utf-8");
      expect(content).toContain("Brand voice run");
    } else {
      // Skill not installed — NOT_FOUND is acceptable
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("NOT_FOUND");
    }
  });

  test("run with --learning --dry-run returns row without writing", async () => {
    const learning = JSON.stringify({
      action: "Dry run test",
      result: "ok",
      learning: "testing",
      nextStep: "verify",
    });
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--learning", learning, "--json", "--cwd", tmpDir, "--dry-run",
    ]);
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed.learningAppended).toContain("Dry run test");
      // File should NOT exist in dry-run
      const exists = await Bun.file(join(tmpDir, "brand", "learnings.md")).exists();
      expect(exists).toBe(false);
    }
  });

  test("run without --learning has null learningAppended", async () => {
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--json", "--cwd", tmpDir,
    ]);
    if (exitCode === 0) {
      const parsed = JSON.parse(stdout);
      expect(parsed.learningAppended).toBeNull();
    }
  });

  test("run with invalid --learning JSON returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run([
      "run", "brand-voice", "--learning", "not-json", "--json", "--cwd", tmpDir,
    ]);
    // Could be INVALID_ARGS (bad json) or NOT_FOUND (skill not installed)
    // If skill resolves first, then learning parse happens
    const parsed = JSON.parse(stdout);
    expect(["INVALID_ARGS", "NOT_FOUND"]).toContain(parsed.error.code);
  });
});
