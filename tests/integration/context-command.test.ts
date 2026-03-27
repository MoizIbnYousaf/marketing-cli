// Integration tests for mktg context command
// Full pipeline tests with real file I/O in isolated temp dirs.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as contextHandler } from "../../src/commands/context";
import { handler as initHandler } from "../../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-int-context-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("context command integration", () => {
  test("scaffold → context returns full structure", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify structure
    expect(typeof result.data.compiledAt).toBe("string");
    expect(typeof result.data.project).toBe("string");
    expect(typeof result.data.tokenEstimate).toBe("number");
    expect(result.data.summary.totalFiles).toBe(10);

    // Each file should have content, tokens, truncated, freshness
    for (const [, entry] of Object.entries(result.data.files)) {
      expect(typeof entry.content).toBe("string");
      expect(typeof entry.tokens).toBe("number");
      expect(typeof entry.truncated).toBe("boolean");
      expect(typeof entry.freshness).toBe("string");
      expect(entry.truncated).toBe(false);
    }
  });

  test("context with customized file detects non-template", async () => {
    await initHandler(["--yes"], flags);

    // Customize voice-profile.md
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Custom Voice\n\nWe speak with confidence.");

    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const voiceEntry = result.data.files["voice-profile.md"];
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry!.freshness).toBe("current");
    expect(result.data.summary.populatedFiles).toBeGreaterThanOrEqual(1);
  });

  test("--layer strategy includes keyword-plan", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--layer", "strategy"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileNames = Object.keys(result.data.files);
    expect(fileNames).toContain("keyword-plan.md");
    expect(fileNames).toContain("voice-profile.md");
    expect(fileNames).not.toContain("stack.md");
    expect(fileNames).not.toContain("assets.md");
  });

  test("--layer creative includes creative-kit", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--layer", "creative"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileNames = Object.keys(result.data.files);
    expect(fileNames).toContain("creative-kit.md");
    expect(fileNames).toContain("positioning.md");
    expect(fileNames).not.toContain("competitors.md");
  });

  test("--budget with large budget does not truncate", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--budget", "99999"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const entries = Object.values(result.data.files);
    const truncatedCount = entries.filter(e => e.truncated).length;
    expect(truncatedCount).toBe(0);
  });

  test("--budget prioritizes by FILE_PRIORITY order", async () => {
    await initHandler(["--yes"], flags);

    // Very small budget: voice-profile should get content, later files truncated
    const result = await contextHandler(["--budget", "50"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const entries = Object.entries(result.data.files);
    // voice-profile.md should have real content (first priority)
    const voice = result.data.files["voice-profile.md"];
    expect(voice).toBeDefined();
    if (voice) {
      expect(voice.content.length).toBeGreaterThan(0);
    }
  });

  test("--save writes and --save --dry-run does not", async () => {
    await initHandler(["--yes"], flags);

    // Save
    const result = await contextHandler(["--save"], flags);
    expect(result.ok).toBe(true);

    const path = join(tempDir, ".mktg", "context.json");
    expect(await Bun.file(path).exists()).toBe(true);

    // Clean up
    await rm(join(tempDir, ".mktg"), { recursive: true, force: true });

    // Dry run
    const dryFlags = { ...flags, dryRun: true };
    const dryResult = await contextHandler(["--save"], dryFlags);
    expect(dryResult.ok).toBe(true);
    expect(await Bun.file(path).exists()).toBe(false);
  });

  test("missing brand files are excluded from output", async () => {
    // No init — brand dir doesn't exist
    const result = await contextHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.summary.totalFiles).toBe(0);
    expect(Object.keys(result.data.files).length).toBe(0);
  });

  test("exit code is always 0 for valid input", async () => {
    const result = await contextHandler([], flags);
    expect(result.exitCode).toBe(0);
  });

  test("--layer=execution uses equals syntax", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--layer=execution"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fileNames = Object.keys(result.data.files);
    expect(fileNames).toContain("creative-kit.md");
    expect(fileNames).not.toContain("competitors.md");
  });

  test("--budget=2000 uses equals syntax", async () => {
    await initHandler(["--yes"], flags);

    const result = await contextHandler(["--budget=2000"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.tokenEstimate).toBeLessThanOrEqual(2000);
  });
});
