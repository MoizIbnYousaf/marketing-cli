// Unit tests for mktg context command
// Real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler as contextHandler } from "../src/commands/context";
import { handler as initHandler } from "../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-context-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg context", () => {
  test("returns empty files when no brand dir", async () => {
    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.summary.totalFiles).toBe(0);
    expect(result.data.tokenEstimate).toBe(0);
    expect(Object.keys(result.data.files).length).toBe(0);
  });

  test("compiles all brand files after init", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.summary.totalFiles).toBe(9);
    expect(result.data.tokenEstimate).toBeGreaterThan(0);
    expect(result.data).toHaveProperty("compiledAt");
    expect(result.data).toHaveProperty("project");
    expect(result.data).toHaveProperty("files");
    expect(result.data).toHaveProperty("summary");
  });

  test("marks template files correctly", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // All files after init should be templates (profile files) or current (append-only)
    const voiceEntry = result.data.files["voice-profile.md"];
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry!.freshness).toBe("template");
  });

  test("token estimation is ~4 chars per token", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Check a single file's token count
    const voiceEntry = result.data.files["voice-profile.md"];
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry!.tokens).toBe(Math.ceil(voiceEntry!.content.length / 4));
  });
});

describe("--layer filtering", () => {
  test("foundation layer includes only foundation files", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--layer", "foundation"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileNames = Object.keys(result.data.files);
    expect(fileNames).toContain("voice-profile.md");
    expect(fileNames).toContain("positioning.md");
    expect(fileNames).toContain("audience.md");
    expect(fileNames).toContain("competitors.md");
    expect(fileNames).not.toContain("keyword-plan.md");
    expect(fileNames).not.toContain("stack.md");
    expect(result.data.layer).toBe("foundation");
  });

  test("distribution layer includes correct files", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--layer", "distribution"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileNames = Object.keys(result.data.files);
    expect(fileNames).toContain("voice-profile.md");
    expect(fileNames).toContain("audience.md");
    expect(fileNames).toContain("stack.md");
    expect(fileNames).not.toContain("competitors.md");
  });

  test("invalid layer returns error", async () => {
    const result = await contextHandler(["--layer", "nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("INVALID_ARGS");
    expect(result.exitCode).toBe(2);
  });
});

describe("--budget truncation", () => {
  test("truncates to fit token budget", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--budget", "100"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Token estimation is approximate (~4 chars/token), allow small overshoot from truncation markers
    expect(result.data.tokenEstimate).toBeLessThanOrEqual(150);
    // Some files should be truncated with a budget this small
    const entries = Object.values(result.data.files);
    const truncatedCount = entries.filter(e => e.truncated).length;
    expect(truncatedCount).toBeGreaterThan(0);
  });

  test("invalid budget returns error", async () => {
    const result = await contextHandler(["--budget", "0"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("INVALID_ARGS");
  });

  test("negative budget returns error", async () => {
    const result = await contextHandler(["--budget", "-5"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("INVALID_ARGS");
  });
});

describe("--save flag", () => {
  test("saves context to .mktg/context.json", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--save"], flags);
    expect(result.ok).toBe(true);

    const savedFile = Bun.file(join(tempDir, ".mktg", "context.json"));
    expect(await savedFile.exists()).toBe(true);
    const saved = await savedFile.json();
    expect(saved).toHaveProperty("compiledAt");
    expect(saved).toHaveProperty("files");
  });

  test("dry-run does not write file", async () => {
    await initHandler(["--yes"], flags);
    const dryFlags = { ...flags, dryRun: true };

    const result = await contextHandler(["--save"], dryFlags);
    expect(result.ok).toBe(true);

    const savedFile = Bun.file(join(tempDir, ".mktg", "context.json"));
    expect(await savedFile.exists()).toBe(false);
  });
});

describe("input hardening", () => {
  test("rejects control chars in layer", async () => {
    const result = await contextHandler(["--layer", "found\x00ation"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
  });

  test("rejects invalid resource id in layer", async () => {
    const result = await contextHandler(["--layer", "../etc/passwd"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
  });
});
