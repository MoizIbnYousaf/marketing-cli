// E2E tests for mktg status command
// Uses real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler as statusHandler } from "../src/commands/status";
import { handler as initHandler } from "../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-status-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg status", () => {
  test("reports needs-setup before init", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
  });

  test("reports brand files after init", async () => {
    await initHandler(["--yes"], flags);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("health");
    expect(result.data).toHaveProperty("content");

    // All 9 brand files should exist after init
    const brandEntries = Object.entries(result.data.brand);
    expect(brandEntries.length).toBe(9);

    for (const [, entry] of brandEntries) {
      expect(entry.exists).toBe(true);
    }
  });

  test("reports project name", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("project");
    expect(typeof result.data.project).toBe("string");
  });

  test("reports skill install count", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills).toHaveProperty("installed");
    expect(result.data.skills).toHaveProperty("total");
    expect(result.data.skills.total).toBe(27);
  });

  test("exit code is 0", async () => {
    const result = await statusHandler([], flags);
    expect(result.exitCode).toBe(0);
  });
});
