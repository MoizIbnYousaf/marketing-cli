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

describe("Doctor check categories", () => {
  test("has brand, skills, and cli check categories", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const names = result.data.checks.map(c => c.name);
    expect(names.some(n => n.startsWith("brand"))).toBe(true);
    expect(names.some(n => n === "skills")).toBe(true);
    expect(names.some(n => n.startsWith("cli-"))).toBe(true);
  });

  test("each check has name, status, and detail", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const check of result.data.checks) {
      expect(typeof check.name).toBe("string");
      expect(["pass", "fail", "warn"]).toContain(check.status);
      expect(typeof check.detail).toBe("string");
    }
  });
});

describe("Doctor with partial state", () => {
  test("brand-profiles fails, brand-append fails before init", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const profileCheck = result.data.checks.find(c => c.name === "brand-profiles");
    const appendCheck = result.data.checks.find(c => c.name === "brand-append");
    expect(profileCheck?.status).toBe("fail");
    expect(appendCheck?.status).toBe("fail");
  });

  test("all brand checks pass after init", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandChecks = result.data.checks.filter(c => c.name.startsWith("brand"));
    for (const check of brandChecks) {
      expect(check.status).toBe("pass");
    }
  });

  test("includes agent checks", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const agentCheck = result.data.checks.find(c => c.name === "agents");
    expect(agentCheck).toBeDefined();
  });

  test("exit code is always 0 (even with failures)", async () => {
    const result = await doctorHandler([], flags);
    expect(result.exitCode).toBe(0);
    // passed should be false since brand checks fail
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.passed).toBe(false);
  });
});

describe("Doctor integration checks", () => {
  test("integration checks are warn, never fail", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const integrationChecks = result.data.checks.filter((c) =>
      c.name.startsWith("integration-"),
    );
    for (const check of integrationChecks) {
      expect(check.status).not.toBe("fail");
    }
  });

  test("integration check name starts with integration-", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const integrationChecks = result.data.checks.filter((c) =>
      c.name.startsWith("integration-"),
    );
    expect(integrationChecks.length).toBeGreaterThan(0);
    for (const check of integrationChecks) {
      expect(check.name).toMatch(/^integration-/);
    }
  });
});

describe("Doctor graph check", () => {
  test("includes skill-graph check", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const graphCheck = result.data.checks.find(c => c.name === "skill-graph");
    expect(graphCheck).toBeDefined();
    expect(graphCheck!.status).toBe("pass");
  });

  test("skill-graph check reports node and edge counts", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const graphCheck = result.data.checks.find(c => c.name === "skill-graph");
    expect(graphCheck!.detail).toContain("No cycles");
    expect(graphCheck!.detail).toContain("skills");
    expect(graphCheck!.detail).toContain("edges");
  });
});
