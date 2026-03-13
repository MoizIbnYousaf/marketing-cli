// Tests for init parseJsonInput security fix
// No mocks. Real subprocess execution + real temp dirs.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { parseJsonInput } from "../src/core/errors";

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

// ---------- parseJsonInput unit tests ----------

describe("parseJsonInput", () => {
  test("valid JSON returns ok with parsed data", () => {
    const result = parseJsonInput<{ business: string }>('{"business":"Test"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.business).toBe("Test");
    }
  });

  test("oversized JSON (>64KB) returns error", () => {
    const big = JSON.stringify({ data: "x".repeat(70_000) });
    const result = parseJsonInput(big);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("64KB");
    }
  });

  test("JSON with __proto__ key returns error", () => {
    const result = parseJsonInput('{"__proto__":{"admin":true}}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Unsafe");
    }
  });

  test("JSON with constructor key returns error", () => {
    const result = parseJsonInput('{"constructor":{"prototype":{}}}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Unsafe");
    }
  });

  test("invalid JSON returns error", () => {
    const result = parseJsonInput("not json at all");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Invalid JSON");
    }
  });

  test("empty JSON object {} works", () => {
    const result = parseJsonInput("{}");
    expect(result.ok).toBe(true);
  });

  test("nested __proto__ deep in object returns error", () => {
    const result = parseJsonInput('{"a":{"b":{"__proto__":true}}}');
    expect(result.ok).toBe(false);
  });

  test("JSON with normal keys works fine", () => {
    const result = parseJsonInput<{ business: string; goal: string }>(
      '{"business":"My SaaS","goal":"launch"}'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.business).toBe("My SaaS");
      expect(result.data.goal).toBe("launch");
    }
  });
});

// ---------- init subprocess security tests ----------

describe("init security (subprocess)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-init-sec-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("init --yes works with --cwd to temp dir", async () => {
    const { stdout, exitCode } = await run(["init", "--yes", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.brand).toBeDefined();
    expect(parsed.skills).toBeDefined();
  });

  test("init with valid JSON input works", async () => {
    const { stdout, exitCode } = await run([
      "init", "--json", "--cwd", tmpDir, '{"business":"TestBiz","goal":"grow"}',
    ]);
    // Note: the --json flag is a global flag for JSON output, and the JSON input
    // is passed as a positional arg
    expect(exitCode).toBe(0);
  });
});
