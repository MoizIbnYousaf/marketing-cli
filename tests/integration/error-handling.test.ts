// Integration tests for error handling — every exit code, JSON envelopes, actionable messages
// Real CLI subprocess invocations. No mocks. Real file I/O in isolated temp dirs.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  notFound,
  invalidArgs,
  missingDep,
  skillFailed,
  networkError,
  notImplemented,
  missingInput,
  permissionError,
  ioError,
  sandboxPath,
  parseJsonInput,
  exitCodeLabel,
  DOCS,
} from "../../src/core/errors";
import { formatOutput } from "../../src/core/output";
import { ok, err } from "../../src/types";
import type { GlobalFlags, ExitCode, MktgError } from "../../src/types";

const CLI_PATH = join(import.meta.dir, "../../src/cli.ts");
const jsonFlags: GlobalFlags = { json: true, dryRun: false, fields: [], cwd: "." };

// Helper: run CLI as subprocess and return exit code + stdout
const runCli = async (args: string[], cwd?: string): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    cwd: cwd ?? process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
};

// ============================================================
// SECTION 1: Exit Code Contract
// Every exit code 0-6 is triggered and verified
// ============================================================

describe("Exit code contract", () => {
  test("exit 0 — success: mktg list --json returns 0", async () => {
    const { exitCode, stdout } = await runCli(["list", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBeGreaterThan(0);
  });

  test("exit 1 — not found: mktg run nonexistent-skill --json returns 1", async () => {
    const { exitCode, stdout } = await runCli(["run", "nonexistent-skill-xyz", "--json"]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.exitCode).toBe(1);
  });

  test("exit 2 — invalid args: mktg unknown-command --json returns 2", async () => {
    const { exitCode, stdout } = await runCli(["totally-bogus-command", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("UNKNOWN_COMMAND");
  });

  test("exit 2 — invalid args: mktg skill --json (no subcommand) returns 2", async () => {
    const { exitCode, stdout } = await runCli(["skill", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
  });

  test("exit 6 — not implemented: notImplemented constructor", () => {
    const result = notImplemented("magic");
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(6);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_IMPLEMENTED");
      expect(result.error.message).toContain("magic");
    }
  });
});

// ============================================================
// SECTION 2: JSON Error Envelope Structure
// Every error has code, message, suggestions, and exitCode in JSON
// ============================================================

describe("JSON error envelope structure", () => {
  test("error envelope contains all required fields", () => {
    const result = notFound("voice-profile.md", ["mktg init"], DOCS.brand);
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);

    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.error.message).toContain("voice-profile.md");
    expect(parsed.error.suggestions).toBeInstanceOf(Array);
    expect(parsed.error.suggestions.length).toBeGreaterThan(0);
    expect(parsed.error.docs).toBe(DOCS.brand);
    expect(parsed.exitCode).toBe(1);
  });

  test("error envelope without docs omits docs field", () => {
    const result = invalidArgs("Missing required flag");
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);

    expect(parsed.error.docs).toBeUndefined();
  });

  test("all error constructors produce valid envelopes", () => {
    const errors = [
      notFound("skill-x"),
      invalidArgs("bad flag"),
      missingDep("ffmpeg"),
      skillFailed("brand-voice", "timeout"),
      networkError("ECONNREFUSED"),
      notImplemented("future-cmd"),
      missingInput('{"key":"val"}'),
      permissionError("/brand/file.md", "write"),
      ioError("/brand/file.md", "ENOENT"),
    ];

    for (const result of errors) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.error.code).toBe("string");
        expect(result.error.code.length).toBeGreaterThan(0);
        expect(typeof result.error.message).toBe("string");
        expect(result.error.message.length).toBeGreaterThan(0);
        expect(Array.isArray(result.error.suggestions)).toBe(true);
        expect(result.exitCode).toBeGreaterThanOrEqual(1);
        expect(result.exitCode).toBeLessThanOrEqual(6);
      }
    }
  });

  test("exitCode in JSON matches the result exitCode", () => {
    const codeMap: [() => ReturnType<typeof notFound>, ExitCode][] = [
      [() => notFound("x"), 1],
      [() => invalidArgs("x"), 2],
      [() => missingDep("x"), 3],
      [() => skillFailed("x", "y"), 4],
      [() => networkError("x"), 5],
      [() => notImplemented("x"), 6],
    ];

    for (const [factory, expectedCode] of codeMap) {
      const result = factory();
      const output = formatOutput(result, jsonFlags);
      const parsed = JSON.parse(output);
      expect(parsed.exitCode).toBe(expectedCode);
      expect(result.exitCode).toBe(expectedCode);
    }
  });
});

// ============================================================
// SECTION 3: Actionable Suggestions
// Every error tells the agent what to do next
// ============================================================

describe("Actionable suggestions", () => {
  test("notFound includes suggestions when provided", () => {
    const result = notFound("brand-voice skill", ["mktg list", "mktg update"]);
    if (!result.ok) {
      expect(result.error.suggestions).toContain("mktg list");
      expect(result.error.suggestions).toContain("mktg update");
    }
  });

  test("skillFailed has default suggestions when none provided", () => {
    const result = skillFailed("seo-audit", "No keyword data");
    if (!result.ok) {
      expect(result.error.suggestions.length).toBeGreaterThan(0);
      expect(result.error.suggestions[0]).toContain("seo-audit");
      expect(result.error.suggestions).toContain("mktg doctor");
    }
  });

  test("skillFailed uses custom suggestions over defaults", () => {
    const result = skillFailed("brand-voice", "No URL", ["Provide a URL or existing content"]);
    if (!result.ok) {
      expect(result.error.suggestions[0]).toBe("Provide a URL or existing content");
      expect(result.error.suggestions).not.toContain("mktg doctor");
    }
  });

  test("networkError always suggests checking connection", () => {
    const result = networkError("ECONNREFUSED to api.example.com");
    if (!result.ok) {
      expect(result.error.suggestions).toContain("Check your internet connection");
    }
  });

  test("missingInput includes a concrete example", () => {
    const result = missingInput('{"business":"My SaaS","url":"https://example.com"}');
    if (!result.ok) {
      expect(result.error.suggestions[0]).toContain("mktg init --json");
      expect(result.error.suggestions[0]).toContain("business");
    }
  });

  test("permissionError includes ls -la suggestion", () => {
    const result = permissionError("/var/protected/file.md", "read");
    if (!result.ok) {
      expect(result.error.message).toContain("read");
      expect(result.error.message).toContain("permission denied");
      expect(result.error.suggestions[0]).toContain("ls -la");
    }
  });

  test("ioError includes path verification suggestion", () => {
    const result = ioError("brand/audience.md", "ENOENT: no such file");
    if (!result.ok) {
      expect(result.error.message).toContain("audience.md");
      expect(result.error.message).toContain("ENOENT");
      expect(result.error.suggestions[0]).toContain("Verify the path exists");
    }
  });

  test("unknown command suggests --help and lists available commands", async () => {
    const { stdout } = await runCli(["xyzzy", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.suggestions[0]).toContain("--help");
    expect(parsed.error.suggestions[1]).toContain("Available:");
    expect(parsed.error.suggestions[1]).toContain("init");
    expect(parsed.error.suggestions[1]).toContain("doctor");
  });
});

// ============================================================
// SECTION 4: Exit Code Labels
// exitCodeLabel maps every code to a human string
// ============================================================

describe("Exit code labels", () => {
  test("every exit code has a non-empty label", () => {
    const codes: ExitCode[] = [0, 1, 2, 3, 4, 5, 6];
    for (const code of codes) {
      const label = exitCodeLabel(code);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test("labels are distinct", () => {
    const codes: ExitCode[] = [0, 1, 2, 3, 4, 5, 6];
    const labels = codes.map(exitCodeLabel);
    const unique = new Set(labels);
    expect(unique.size).toBe(codes.length);
  });
});

// ============================================================
// SECTION 5: sandboxPath — Real File I/O Security
// ============================================================

describe("sandboxPath with real filesystem", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-error-int-"));
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await writeFile(join(tempDir, "brand", "voice-profile.md"), "# Voice\nTest content");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("resolves real existing file", () => {
    const result = sandboxPath(tempDir, "brand/voice-profile.md");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toBe(join(tempDir, "brand/voice-profile.md"));
    }
  });

  test("resolves path to non-existent file (for writes)", () => {
    const result = sandboxPath(tempDir, "brand/new-file.md");
    expect(result.ok).toBe(true);
  });

  test("rejects symlink pointing outside root", async () => {
    await symlink("/tmp", join(tempDir, "escape"));
    const result = sandboxPath(tempDir, "escape");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Symlinks");
    }
  });

  test("rejects absolute path", () => {
    const result = sandboxPath(tempDir, "/etc/passwd");
    expect(result.ok).toBe(false);
  });

  test("rejects .. traversal", () => {
    const result = sandboxPath(tempDir, "brand/../../etc/passwd");
    expect(result.ok).toBe(false);
  });

  test("allows deeply nested paths", () => {
    const result = sandboxPath(tempDir, "brand/deep/nested/dir/file.md");
    expect(result.ok).toBe(true);
  });
});

// ============================================================
// SECTION 6: parseJsonInput — Real JSON Security
// ============================================================

describe("parseJsonInput security", () => {
  test("parses valid small JSON", () => {
    const result = parseJsonInput<{ name: string }>('{"name":"test"}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("test");
  });

  test("rejects malformed JSON", () => {
    const result = parseJsonInput("{broken");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Invalid JSON");
  });

  test("rejects oversized JSON (>64KB)", () => {
    const huge = '{"d":"' + "x".repeat(66_000) + '"}';
    const result = parseJsonInput(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("64KB");
  });

  test("rejects __proto__ pollution", () => {
    const result = parseJsonInput('{"__proto__":{"admin":true}}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Unsafe");
  });

  test("rejects constructor pollution", () => {
    const result = parseJsonInput('{"constructor":{"prototype":{}}}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Unsafe");
  });

  test("accepts arrays", () => {
    const result = parseJsonInput<string[]>('["a","b"]');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(["a", "b"]);
  });

  test("accepts nested objects without dangerous keys", () => {
    const json = JSON.stringify({ brand: { voice: "bold", audience: { age: "25-35" } } });
    const result = parseJsonInput(json);
    expect(result.ok).toBe(true);
  });
});

// ============================================================
// SECTION 7: formatOutput Error + Success Consistency
// ============================================================

describe("formatOutput JSON consistency", () => {
  test("success output is valid JSON without error envelope", () => {
    const result = ok({ status: "healthy", skills: 42 });
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("healthy");
    expect(parsed.skills).toBe(42);
    expect(parsed.error).toBeUndefined();
  });

  test("error output is valid JSON with error envelope + exitCode", () => {
    const result = err("TEST_ERROR", "something broke", ["fix it"], 4);
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.error.code).toBe("TEST_ERROR");
    expect(parsed.error.message).toBe("something broke");
    expect(parsed.error.suggestions).toContain("fix it");
    expect(parsed.exitCode).toBe(4);
  });

  test("--fields filtering works on success data", () => {
    const result = ok({ name: "test", count: 42, extra: "hidden" });
    const flags = { ...jsonFlags, fields: ["name", "count"] };
    const output = formatOutput(result, flags);
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe("test");
    expect(parsed.count).toBe(42);
    expect(parsed.extra).toBeUndefined();
  });

  test("--fields filtering works on arrays of objects", () => {
    const result = ok([
      { name: "a", tier: "must-have", extra: 1 },
      { name: "b", tier: "nice-to-have", extra: 2 },
    ]);
    const flags = { ...jsonFlags, fields: ["name", "tier"] };
    const output = formatOutput(result, flags);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("a");
    expect(parsed[0].tier).toBe("must-have");
    expect(parsed[0].extra).toBeUndefined();
  });
});

// ============================================================
// SECTION 8: CLI-Level Error Handling (subprocess)
// ============================================================

describe("CLI subprocess error handling", () => {
  test("mktg list --json succeeds with exit 0", async () => {
    const { exitCode, stdout } = await runCli(["list", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.total).toBeGreaterThanOrEqual(42);
  });

  test("mktg run nonexistent --json returns structured error", async () => {
    const { exitCode, stdout } = await runCli(["run", "does-not-exist-at-all", "--json"]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.error.message).toContain("does-not-exist-at-all");
    expect(parsed.error.suggestions.length).toBeGreaterThan(0);
  });

  test("mktg skill info nonexistent --json returns not found", async () => {
    const { exitCode, stdout } = await runCli(["skill", "info", "nonexistent-skill-999", "--json"]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
  });

  test("mktg --version --json returns version", async () => {
    const { exitCode, stdout } = await runCli(["--version", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.version).toBe("string");
  });

  test("every JSON error from CLI is parseable and has required fields", async () => {
    // Run several known-error commands
    const errorCommands = [
      ["totally-bogus", "--json"],
      ["run", "nonexistent-xyz", "--json"],
      ["skill", "--json"],
    ];

    for (const args of errorCommands) {
      const { stdout, exitCode } = await runCli(args);
      expect(exitCode).toBeGreaterThan(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.error).toBeDefined();
      expect(typeof parsed.error.code).toBe("string");
      expect(typeof parsed.error.message).toBe("string");
      expect(Array.isArray(parsed.error.suggestions)).toBe(true);
    }
  });
});

// ============================================================
// SECTION 9: DOCS URLs
// ============================================================

describe("Documentation URLs", () => {
  test("all DOCS URLs are valid HTTPS GitHub URLs", () => {
    for (const [key, url] of Object.entries(DOCS)) {
      expect(url).toMatch(/^https:\/\/github\.com\//);
      expect(url.length).toBeGreaterThan(30);
    }
  });

  test("docs appear in error output when provided", () => {
    const result = notFound("brand/voice-profile.md", ["mktg init"], DOCS.brand);
    const output = formatOutput(result, jsonFlags);
    const parsed = JSON.parse(output);
    expect(parsed.error.docs).toBe(DOCS.brand);
  });
});
