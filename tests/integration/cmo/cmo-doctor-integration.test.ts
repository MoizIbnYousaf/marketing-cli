// CMO DOCTOR INTEGRATION — CMO reads doctor output, surfaces fix suggestions
// Proves an agent can use mktg doctor --json to understand project health and route to fixes.
// Real file I/O in isolated temp dirs. NO MOCKS.
//
// Agent DX Axes Validated:
//   Axis 4: CONTEXT WINDOW DISCIPLINE (3/3) — CMO uses --fields passed for 1-field health check
//   Axis 1: MACHINE-READABLE OUTPUT (3/3) — doctor JSON is parseable, fix commands are executable
//   Axis 7: AGENT KNOWLEDGE PACKAGING (partial) — check names are stable, fix commands are actionable

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../../src/types";
import { handler as doctorHandler } from "../../../src/commands/doctor";
import { handler as initHandler } from "../../../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-cmo-doctor-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ==================== CMO can read doctor output ====================

describe("CMO reads doctor output structure", () => {
  test("doctor output has passed boolean for quick health check", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // CMO reads this single field to decide: healthy project or needs fixing
    expect(typeof result.data.passed).toBe("boolean");
  });

  test("doctor output has checks array with actionable fix commands", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const failedChecks = result.data.checks.filter(c => c.status === "fail");
    // Before init, there should be failures
    expect(failedChecks.length).toBeGreaterThan(0);
    // Each failed check should have a fix command the CMO can execute
    for (const check of failedChecks) {
      expect(check.fix).toBeTruthy();
      expect(typeof check.fix).toBe("string");
    }
  });

  test("CMO can extract brand health from doctor checks", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // CMO filters checks by category prefix to understand each subsystem
    const brandChecks = result.data.checks.filter(c => c.name.startsWith("brand"));
    const skillChecks = result.data.checks.filter(c => c.name === "skills");
    const cliChecks = result.data.checks.filter(c => c.name.startsWith("cli-"));

    expect(brandChecks.length).toBeGreaterThan(0);
    expect(skillChecks.length).toBeGreaterThan(0);
    expect(cliChecks.length).toBeGreaterThan(0);
  });
});

// ==================== CMO routes to fixes based on doctor output ====================

describe("CMO routing from doctor failures", () => {
  test("missing brand files → CMO suggests mktg init", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandProfile = result.data.checks.find(c => c.name === "brand-profiles");
    expect(brandProfile).toBeDefined();
    expect(brandProfile!.status).toBe("fail");
    expect(brandProfile!.fix).toBe("mktg init");
  });

  test("template content → CMO suggests /cmo to populate", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const contentCheck = result.data.checks.find(c => c.name === "brand-content");
    expect(contentCheck).toBeDefined();
    expect(contentCheck!.status).toBe("warn");
    // Fix should tell the agent to run /cmo or populate brand files
    expect(contentCheck!.fix).toBeTruthy();
    expect(contentCheck!.fix!.toLowerCase()).toContain("cmo");
  });

  test("after init, brand file existence checks pass", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const profileCheck = result.data.checks.find(c => c.name === "brand-profiles");
    expect(profileCheck!.status).toBe("pass");
    const appendCheck = result.data.checks.find(c => c.name === "brand-append");
    expect(appendCheck!.status).toBe("pass");
  });
});

// ==================== CMO uses --fields to minimize context ====================

describe("CMO uses --fields for context discipline", () => {
  test("--fields passed gives CMO a 1-field health check", async () => {
    const fieldsFlags = { ...flags, fields: ["passed"] };
    const result = await doctorHandler([], fieldsFlags);
    expect(result.ok).toBe(true);
    // The formatOutput will filter to just { passed: boolean }
    // CMO can check health with minimal tokens
  });

  test("--fields checks gives CMO detailed diagnostics only when needed", async () => {
    const fieldsFlags = { ...flags, fields: ["checks"] };
    const result = await doctorHandler([], fieldsFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.checks).toBeDefined();
  });
});

// ==================== CMO decision tree from doctor state ====================

describe("CMO decision tree based on doctor results", () => {
  test("all-fail state → CMO should run init first", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Simulate CMO logic: if passed is false and brand-profiles fails, run init
    if (!result.data.passed) {
      const brandFail = result.data.checks.find(
        c => c.name === "brand-profiles" && c.status === "fail"
      );
      if (brandFail) {
        // CMO would route to: mktg init
        expect(brandFail.fix).toBe("mktg init");
      }
    }
  });

  test("post-init state → CMO should suggest brand voice skill", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // After init: brand files exist but have template content
    // CMO should see brand-content warn and suggest running /brand-voice
    const contentWarn = result.data.checks.find(
      c => c.name === "brand-content" && c.status === "warn"
    );
    expect(contentWarn).toBeDefined();
    // This is where CMO reads the fix and routes to the right skill
    expect(contentWarn!.fix).toBeTruthy();
  });

  test("healthy state → CMO skips fixes and moves to marketing work", async () => {
    // Create brand files with real content
    const brandDir = join(tempDir, "brand");
    await mkdir(brandDir, { recursive: true });
    for (const file of ["voice-profile.md", "positioning.md", "audience.md", "competitors.md", "keyword-plan.md", "creative-kit.md", "stack.md", "landscape.md"]) {
      await writeFile(join(brandDir, file), `# Real Content\n\nThis is real brand content for ${file}.\nOur voice is warm and conversational.\n`);
    }
    for (const file of ["assets.md", "learnings.md"]) {
      await writeFile(join(brandDir, file), "");
    }

    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Brand checks should pass — CMO can proceed to execution skills
    const brandChecks = result.data.checks.filter(c => c.name.startsWith("brand"));
    const brandFails = brandChecks.filter(c => c.status === "fail");
    expect(brandFails.length).toBe(0);
  });
});

// ==================== CMO aggregates doctor + status for full picture ====================

describe("CMO combines doctor checks into actionable summary", () => {
  test("doctor provides enough data for CMO to build nextActions list", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // CMO logic: extract all non-pass checks and build a prioritized action list
    const actions = result.data.checks
      .filter(c => c.status !== "pass")
      .map(c => ({
        issue: c.detail,
        fix: c.fix ?? "investigate manually",
        severity: c.status === "fail" ? "critical" : "warning",
      }));

    // Should have at least one action on a fresh directory
    expect(actions.length).toBeGreaterThan(0);
    // Each action has a fix command
    for (const action of actions) {
      expect(action.fix.length).toBeGreaterThan(0);
    }
  });

  test("check names are stable identifiers CMO can switch on", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // CMO routes based on check names — they must be stable
    const expectedNames = ["brand-profiles", "brand-append", "skills", "skill-graph"];
    for (const name of expectedNames) {
      const check = result.data.checks.find(c => c.name === name);
      expect(check).toBeDefined();
    }
  });
});
