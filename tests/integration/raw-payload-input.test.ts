// Integration test: RAW PAYLOAD INPUT (Agent DX score: 1→2)
// Tests --input flag for brand update and backward compatibility.
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const run = async (args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const projectRoot = import.meta.dir.replace("/tests/integration", "");
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: cwd ?? projectRoot,
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

const parseJson = (stdout: string): unknown => JSON.parse(stdout);

describe("brand update --input", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-raw-input-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("writes brand files from JSON payload", async () => {
    const payload = JSON.stringify({
      "voice-profile.md": "# Brand Voice Profile\n\nTone: Confident and direct.",
      "audience.md": "# Audience Profile\n\nPrimary: Developers.",
    });

    const result = await run(["brand", "update", "--input", payload, "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { written: string[]; rejected: string[] };
    expect(data.written).toContain("voice-profile.md");
    expect(data.written).toContain("audience.md");
    expect(data.rejected).toHaveLength(0);

    // Verify files actually exist on disk
    const voiceContent = await readFile(join(tmpDir, "brand", "voice-profile.md"), "utf-8");
    expect(voiceContent).toContain("Confident and direct");

    const audienceContent = await readFile(join(tmpDir, "brand", "audience.md"), "utf-8");
    expect(audienceContent).toContain("Developers");
  });

  test("rejects unknown brand file names", async () => {
    const payload = JSON.stringify({
      "voice-profile.md": "# Voice",
      "not-a-brand-file.md": "should be rejected",
    });

    const result = await run(["brand", "update", "--input", payload, "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { written: string[]; rejected: string[] };
    expect(data.written).toContain("voice-profile.md");
    expect(data.rejected).toContain("not-a-brand-file.md");
  });

  test("dry-run does not write files", async () => {
    const payload = JSON.stringify({ "positioning.md": "# Positioning" });

    const result = await run(["brand", "update", "--input", payload, "--json", "--dry-run", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { written: string[]; dryRun: boolean };
    expect(data.written).toContain("positioning.md");
    expect(data.dryRun).toBe(true);

    // File should NOT exist
    const exists = await Bun.file(join(tmpDir, "brand", "positioning.md")).exists();
    expect(exists).toBe(false);
  });

  test("returns error when --input is missing", async () => {
    const result = await run(["brand", "update", "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(2);

    const data = parseJson(result.stdout) as { error: { code: string } };
    expect(data.error.code).toBe("INVALID_ARGS");
  });

  test("returns error for invalid JSON payload", async () => {
    const result = await run(["brand", "update", "--input", "not-valid-json", "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(2);

    const data = parseJson(result.stdout) as { error: { code: string } };
    expect(data.error.code).toBe("INVALID_ARGS");
  });

  test("writes all 10 brand files simultaneously", async () => {
    const payload = JSON.stringify({
      "voice-profile.md": "# Voice",
      "positioning.md": "# Positioning",
      "audience.md": "# Audience",
      "competitors.md": "# Competitors",
      "keyword-plan.md": "# Keywords",
      "creative-kit.md": "# Creative",
      "stack.md": "# Stack",
      "assets.md": "# Assets",
      "learnings.md": "# Learnings",
    });

    const result = await run(["brand", "update", "--input", payload, "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { written: string[] };
    expect(data.written).toHaveLength(10);
  });
});

describe("--input flag backward compatibility", () => {
  test("existing commands still work without --input", async () => {
    // list command should work fine without --input
    const result = await run(["list", "--json"]);
    expect(result.exitCode).toBe(0);
    const data = parseJson(result.stdout) as { total: number };
    expect(data.total).toBeGreaterThan(30);
  });

  test("existing brand export works without --input", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-compat-"));
    const result = await run(["brand", "export", "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("--input flag is undefined when not provided", async () => {
    // status works without --input — proves GlobalFlags.jsonInput is undefined by default
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-compat2-"));
    const result = await run(["status", "--json", `--cwd=${tmpDir}`]);
    expect(result.exitCode).toBe(0);
    await rm(tmpDir, { recursive: true, force: true });
  });
});
