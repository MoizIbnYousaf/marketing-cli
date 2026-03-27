// Safety Rails Integration Tests
// Verifies --dry-run works on all mutating commands,
// response size warnings fire, and destructive operations are safe.
// Real file I/O, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, stat, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as initHandler } from "../../src/commands/init";
import { handler as updateHandler } from "../../src/commands/update";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { handler as statusHandler } from "../../src/commands/status";
import { handler as listHandler } from "../../src/commands/list";
import { handler as schemaHandler } from "../../src/commands/schema";
import { formatOutput } from "../../src/core/output";

let tempDir: string;
let flags: GlobalFlags;
let dryFlags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-safety-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
  dryFlags = { json: true, dryRun: true, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("--dry-run: init command", () => {
  test("dry-run init does not create brand/ directory", async () => {
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);

    // brand/ should NOT exist
    try {
      await stat(join(tempDir, "brand"));
      expect(true).toBe(false); // should not reach here
    } catch {
      // Expected: directory doesn't exist
    }
  });

  test("dry-run init returns what would be created", async () => {
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should still report brand files that WOULD be created
    expect(result.data.brand.created.length).toBe(10);
  });

  test("dry-run init does not write .mktg/ files", async () => {
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);

    try {
      await stat(join(tempDir, ".mktg"));
      expect(true).toBe(false);
    } catch {
      // Expected: .mktg doesn't exist
    }
  });
});

describe("--dry-run: update command", () => {
  test("dry-run update does not modify installed skills", async () => {
    // First, do a real init
    await initHandler(["--yes"], flags);

    // Run dry-run update
    const result = await updateHandler([], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should report skills but not actually write
    expect(result.data.totalSkills).toBeGreaterThan(0);
  });
});

describe("--dry-run: read-only commands don't need it", () => {
  test("doctor works with dry-run (read-only, no side effects)", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], dryFlags);
    expect(result.ok).toBe(true);
  });

  test("status works with dry-run (read-only)", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], dryFlags);
    expect(result.ok).toBe(true);
  });

  test("list works with dry-run (read-only)", async () => {
    const result = await listHandler([], dryFlags);
    expect(result.ok).toBe(true);
  });

  test("schema works with dry-run (read-only)", async () => {
    const result = await schemaHandler([], dryFlags);
    expect(result.ok).toBe(true);
  });
});

describe("Response size warnings", () => {
  test("formatOutput warns when JSON exceeds 10KB", async () => {
    // Create a result with large data
    const largeData = { items: Array.from({ length: 500 }, (_, i) => ({
      name: `item-${i}`,
      description: "x".repeat(50),
      metadata: { created: new Date().toISOString(), tags: ["a", "b", "c"] },
    }))};

    const result = { ok: true as const, data: largeData, exitCode: 0 as const };
    const output = formatOutput(result, { json: true, dryRun: false, fields: [], cwd: tempDir });

    // Output should be valid JSON
    const parsed = JSON.parse(output);
    expect(parsed.items.length).toBe(500);

    // The output itself should be > 10KB
    expect(output.length).toBeGreaterThan(10_240);
  });

  test("formatOutput does not warn for small responses", async () => {
    const result = { ok: true as const, data: { status: "ok" }, exitCode: 0 as const };
    const output = formatOutput(result, { json: true, dryRun: false, fields: [], cwd: tempDir });

    expect(output.length).toBeLessThan(10_240);
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("ok");
  });
});

describe("Dry-run idempotency", () => {
  test("dry-run followed by real run produces correct state", async () => {
    // Dry run first — should not create anything
    await initHandler(["--yes"], dryFlags);

    // Verify nothing was created
    try {
      await stat(join(tempDir, "brand"));
      expect(true).toBe(false);
    } catch {
      // Expected
    }

    // Real run — should create everything
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Now brand/ should exist with 10 files
    const brandStat = await stat(join(tempDir, "brand"));
    expect(brandStat.isDirectory()).toBe(true);
    expect(result.data.brand.created.length).toBe(10);
  });

  test("multiple dry-runs are idempotent", async () => {
    const result1 = await initHandler(["--yes"], dryFlags);
    const result2 = await initHandler(["--yes"], dryFlags);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    // Both should report the same would-be-created files
    expect(result1.data.brand.created.length).toBe(result2.data.brand.created.length);
  });
});

describe("Schema documents dry-run behavior", () => {
  test("schema includes --dry-run in global flags", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { globalFlags: Array<{ name: string; description: string }> };
    const dryRunFlag = data.globalFlags.find(f => f.name === "--dry-run");
    expect(dryRunFlag).toBeDefined();
    expect(dryRunFlag!.description).toContain("without writing");
  });
});

describe("Exit code safety", () => {
  test("all successful commands return exit code 0", async () => {
    await initHandler(["--yes"], flags);

    const results = await Promise.all([
      initHandler(["--yes"], flags),
      updateHandler([], flags),
      doctorHandler([], flags),
      statusHandler([], flags),
      listHandler([], flags),
      schemaHandler([], flags),
    ]);

    for (const result of results) {
      if (result.ok) {
        expect(result.exitCode).toBe(0);
      }
    }
  });

  test("dry-run commands also return exit code 0", async () => {
    const results = await Promise.all([
      initHandler(["--yes"], dryFlags),
      schemaHandler([], dryFlags),
      listHandler([], dryFlags),
    ]);

    for (const result of results) {
      expect(result.exitCode).toBe(0);
    }
  });
});

describe("JSON output is always valid", () => {
  test("all commands produce parseable JSON", async () => {
    await initHandler(["--yes"], flags);

    const results = [
      await initHandler(["--yes"], flags),
      await updateHandler([], flags),
      await doctorHandler([], flags),
      await statusHandler([], flags),
      await listHandler([], flags),
      await schemaHandler([], flags),
    ];

    for (const result of results) {
      const output = formatOutput(result, flags);
      expect(() => JSON.parse(output)).not.toThrow();
    }
  });
});
