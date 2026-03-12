// E2E tests for mktg doctor command
// Uses real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler as doctorHandler } from "../src/commands/doctor";
import { handler as initHandler } from "../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-doctor-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg doctor", () => {
  test("returns structured check results", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("passed");
    expect(result.data).toHaveProperty("checks");
    expect(Array.isArray(result.data.checks)).toBe(true);
  });

  test("reports missing brand files before init", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Before init, brand files should be missing
    const brandChecks = result.data.checks.filter((c) =>
      c.name.startsWith("brand"),
    );
    expect(brandChecks.length).toBeGreaterThan(0);

    const hasFailure = brandChecks.some((c) => c.status === "fail");
    expect(hasFailure).toBe(true);
  });

  test("brand checks pass after init", async () => {
    // Init first
    await initHandler(["--yes"], flags);

    // Then doctor
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandChecks = result.data.checks.filter((c) =>
      c.name.startsWith("brand"),
    );
    // All brand checks should pass after init
    for (const check of brandChecks) {
      expect(check.status).not.toBe("fail");
    }
  });

  test("checks CLI tools availability", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cliChecks = result.data.checks.filter((c) =>
      c.name.startsWith("cli-"),
    );
    expect(cliChecks.length).toBeGreaterThan(0);

    // bun should be found (we're running in bun)
    const bunCheck = cliChecks.find((c) => c.name === "cli-bun");
    expect(bunCheck?.status).toBe("pass");
  });

  test("exit code is 0", async () => {
    const result = await doctorHandler([], flags);
    expect(result.exitCode).toBe(0);
  });
});
