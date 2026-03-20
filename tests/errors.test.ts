// E2E tests for errors.ts — error constructors, sandboxPath, parseJsonInput
// No mocks. Tests real path resolution and JSON parsing.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, symlink, mkdir } from "node:fs/promises";
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
} from "../src/core/errors";
import type { ExitCode } from "../src/types";

describe("Named error constructors", () => {
  test("notFound returns exit code 1", () => {
    const result = notFound("brand-voice skill");
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.message).toContain("brand-voice skill");
  });

  test("notFound with suggestions", () => {
    const result = notFound("skill", ["mktg list", "mktg update"]);
    if (result.ok) return;
    expect(result.error.suggestions).toHaveLength(2);
  });

  test("invalidArgs returns exit code 2", () => {
    const result = invalidArgs("Missing --json flag");
    expect(result.exitCode).toBe(2);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_ARGS");
  });

  test("missingDep returns exit code 3", () => {
    const result = missingDep("ffmpeg");
    expect(result.exitCode).toBe(3);
    if (result.ok) return;
    expect(result.error.code).toBe("MISSING_DEPENDENCY");
    expect(result.error.message).toContain("ffmpeg");
  });

  test("skillFailed returns exit code 4", () => {
    const result = skillFailed("brand-voice", "No audience data");
    expect(result.exitCode).toBe(4);
    if (result.ok) return;
    expect(result.error.code).toBe("SKILL_FAILED");
    expect(result.error.message).toContain("brand-voice");
    expect(result.error.message).toContain("No audience data");
  });

  test("networkError returns exit code 5", () => {
    const result = networkError("Connection refused");
    expect(result.exitCode).toBe(5);
    if (result.ok) return;
    expect(result.error.code).toBe("NETWORK_ERROR");
    expect(result.error.suggestions).toContain("Check your internet connection");
  });

  test("notImplemented returns exit code 6", () => {
    const result = notImplemented("launch");
    expect(result.exitCode).toBe(6);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_IMPLEMENTED");
    expect(result.error.message).toContain("launch");
  });

  test("missingInput returns exit code 2 with example", () => {
    const result = missingInput('{"business":"test"}');
    expect(result.exitCode).toBe(2);
    if (result.ok) return;
    expect(result.error.code).toBe("MISSING_INPUT");
    expect(result.error.suggestions[0]).toContain('{"business":"test"}');
  });

  test("skillFailed has default suggestions when none provided", () => {
    const result = skillFailed("brand-voice", "No audience data");
    if (result.ok) return;
    expect(result.error.suggestions.length).toBeGreaterThan(0);
    expect(result.error.suggestions[0]).toContain("brand-voice");
  });

  test("skillFailed uses custom suggestions when provided", () => {
    const result = skillFailed("brand-voice", "No audience data", ["Run audience-research first"]);
    if (result.ok) return;
    expect(result.error.suggestions[0]).toBe("Run audience-research first");
  });

  test("permissionError returns exit code 1 with path", () => {
    const result = permissionError("/brand/voice-profile.md", "write");
    expect(result.exitCode).toBe(1);
    if (result.ok) return;
    expect(result.error.code).toBe("PERMISSION_ERROR");
    expect(result.error.message).toContain("write");
    expect(result.error.message).toContain("voice-profile.md");
    expect(result.error.suggestions.length).toBeGreaterThan(0);
  });

  test("ioError returns exit code 1 with path and message", () => {
    const result = ioError("brand/audience.md", "ENOENT: file not found");
    expect(result.exitCode).toBe(1);
    if (result.ok) return;
    expect(result.error.code).toBe("IO_ERROR");
    expect(result.error.message).toContain("audience.md");
    expect(result.error.message).toContain("ENOENT");
    expect(result.error.suggestions.length).toBeGreaterThan(0);
  });
});

describe("sandboxPath", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-sandbox-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("resolves valid relative path", () => {
    const result = sandboxPath(tempDir, "brand/voice-profile.md");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe(join(tempDir, "brand/voice-profile.md"));
  });

  test("rejects absolute paths", () => {
    const result = sandboxPath(tempDir, "/etc/passwd");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Absolute paths");
  });

  test("rejects path traversal with ..", () => {
    const result = sandboxPath(tempDir, "../../../etc/passwd");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("traversal");
  });

  test("rejects hidden traversal via ..", () => {
    const result = sandboxPath(tempDir, "brand/../../../etc/passwd");
    expect(result.ok).toBe(false);
  });

  test("allows nested paths", () => {
    const result = sandboxPath(tempDir, "brand/deep/nested/file.md");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toContain("brand/deep/nested/file.md");
  });

  test("rejects symlinks outside root", async () => {
    const linkPath = join(tempDir, "escape-link");
    await symlink("/tmp", linkPath);

    const result = sandboxPath(tempDir, "escape-link");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Symlinks");
  });

  test("allows paths to non-existent files (for writes)", () => {
    const result = sandboxPath(tempDir, "brand/new-file.md");
    expect(result.ok).toBe(true);
  });
});

describe("parseJsonInput", () => {
  test("parses valid JSON", () => {
    const result = parseJsonInput<{ name: string }>('{"name":"test"}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("test");
  });

  test("parses complex JSON", () => {
    const json = JSON.stringify({
      business: "CEO App",
      goal: "launch",
      channels: ["twitter", "linkedin"],
      priority: 1,
    });
    const result = parseJsonInput<Record<string, unknown>>(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.business).toBe("CEO App");
    expect(Array.isArray(result.data.channels)).toBe(true);
  });

  test("rejects invalid JSON", () => {
    const result = parseJsonInput("{not valid json}");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Invalid JSON");
  });

  test("rejects oversized JSON (>64KB)", () => {
    const huge = JSON.stringify({ data: "x".repeat(70_000) });
    const result = parseJsonInput(huge);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("64KB");
  });

  test("rejects __proto__ pollution", () => {
    const result = parseJsonInput('{"__proto__":{"admin":true}}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Unsafe");
  });

  test("rejects constructor pollution", () => {
    const result = parseJsonInput('{"constructor":{"prototype":{}}}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Unsafe");
  });

  test("allows normal objects without proto/constructor keys", () => {
    const result = parseJsonInput('{"name":"safe","value":42}');
    expect(result.ok).toBe(true);
  });

  test("parses arrays", () => {
    const result = parseJsonInput<string[]>('["a","b","c"]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(["a", "b", "c"]);
  });
});

describe("exitCodeLabel", () => {
  test("maps all exit codes to labels", () => {
    const expected: Record<ExitCode, string> = {
      0: "success",
      1: "not found",
      2: "invalid args",
      3: "dependency missing",
      4: "skill failed",
      5: "network error",
      6: "not implemented",
    };

    for (const [code, label] of Object.entries(expected)) {
      expect(exitCodeLabel(Number(code) as ExitCode)).toBe(label);
    }
  });
});
