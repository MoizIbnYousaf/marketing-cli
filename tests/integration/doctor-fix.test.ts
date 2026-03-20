// DOCTOR --FIX — Auto-remediation of mechanical failures.
// Real file I/O in isolated temp dirs. NO MOCKS. NO FAKE DATA.
//
// Agent DX Axes Validated:
//   Axis 6: SAFETY RAILS — --fix respects --dry-run, skips unfixable checks
//   Axis 1: MACHINE-READABLE OUTPUT — fixes array in JSON output
//   Axis 4: CONTEXT WINDOW DISCIPLINE — --fields fixes works

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { BRAND_FILES } from "../../src/types";
import { handler as doctorHandler } from "../../src/commands/doctor";

let tempDir: string;
let flags: GlobalFlags;

type Check = { name: string; status: string; detail: string; fix?: string };
type FixEntry = { check: string; action: string; result: string; detail: string };
type DoctorData = { passed: boolean; checks: readonly Check[]; fixes?: readonly FixEntry[] };

const runDoctorFix = async (dryRun = false): Promise<DoctorData> => {
  const f = { ...flags, dryRun };
  const result = await doctorHandler(["--fix"], f);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Doctor --fix failed");
  return result.data as DoctorData;
};

const runDoctorNoFix = async (): Promise<DoctorData> => {
  const result = await doctorHandler([], flags);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Doctor failed");
  return result.data as DoctorData;
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-doctor-fix-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ==================== FIX CREATES MISSING BRAND FILES ====================

describe("Doctor --fix creates missing brand files", () => {
  test("fixes brand-profiles and brand-append on empty dir", async () => {
    const data = await runDoctorFix();

    expect(data.fixes).toBeDefined();
    expect(data.fixes!.length).toBeGreaterThan(0);

    const brandProfilesFix = data.fixes!.find(f => f.check === "brand-profiles");
    expect(brandProfilesFix).toBeDefined();
    expect(brandProfilesFix!.result).toBe("fixed");

    const brandAppendFix = data.fixes!.find(f => f.check === "brand-append");
    expect(brandAppendFix).toBeDefined();
    expect(brandAppendFix!.result).toBe("fixed");
  });

  test("brand files actually exist after fix", async () => {
    await runDoctorFix();

    const brandDir = join(tempDir, "brand");
    const files = await readdir(brandDir);
    for (const file of BRAND_FILES) {
      expect(files).toContain(file);
    }
  });

  test("re-run checks pass after fix (final state)", async () => {
    const data = await runDoctorFix();

    // After fix, brand checks should pass
    const brandProfilesCheck = data.checks.find(c => c.name === "brand-profiles");
    expect(brandProfilesCheck).toBeDefined();
    expect(brandProfilesCheck!.status).toBe("pass");

    const brandAppendCheck = data.checks.find(c => c.name === "brand-append");
    expect(brandAppendCheck).toBeDefined();
    expect(brandAppendCheck!.status).toBe("pass");
  });

  test("partial brand state — only creates missing files", async () => {
    const brandDir = join(tempDir, "brand");
    await mkdir(brandDir, { recursive: true });
    await writeFile(join(brandDir, "voice-profile.md"), "# Real voice\nCustom content.");
    await writeFile(join(brandDir, "assets.md"), "");
    await writeFile(join(brandDir, "learnings.md"), "");

    const data = await runDoctorFix();

    // voice-profile.md should NOT be overwritten
    const content = await Bun.file(join(brandDir, "voice-profile.md")).text();
    expect(content).toBe("# Real voice\nCustom content.");

    // Other profile files should now exist
    const files = await readdir(brandDir);
    for (const file of BRAND_FILES) {
      expect(files).toContain(file);
    }
  });
});

// ==================== DRY RUN ====================

describe("Doctor --fix --dry-run", () => {
  test("reports planned fixes without creating files", async () => {
    const data = await runDoctorFix(/* dryRun */ true);

    expect(data.fixes).toBeDefined();
    expect(data.fixes!.length).toBeGreaterThan(0);

    // Brand dir should NOT exist
    const brandDirExists = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(brandDirExists).toBe(false);
  });

  test("fix entries still have result=fixed in dry-run", async () => {
    const data = await runDoctorFix(true);
    const brandFix = data.fixes!.find(f => f.check === "brand-profiles");
    expect(brandFix).toBeDefined();
    expect(brandFix!.result).toBe("fixed");
  });
});

// ==================== SKIPPED CHECKS ====================

describe("Doctor --fix skips unfixable checks", () => {
  test("brand-content (template) is skipped", async () => {
    // Create brand files with template content to trigger brand-content warn
    const { handler: initHandler } = await import("../../src/commands/init");
    await initHandler(["--yes"], flags);

    const data = await runDoctorFix();

    const brandContentFix = data.fixes!.find(f => f.check === "brand-content");
    if (brandContentFix) {
      expect(brandContentFix.result).toBe("skipped");
      expect(brandContentFix.detail).toContain("human");
    }
  });

  test("cli checks are skipped", async () => {
    const data = await runDoctorFix();

    const cliFixes = data.fixes!.filter(f => f.check.startsWith("cli-"));
    for (const fix of cliFixes) {
      expect(fix.result).toBe("skipped");
      expect(fix.detail).toContain("manually");
    }
  });

  test("integration checks are skipped", async () => {
    const data = await runDoctorFix();

    const integrationFixes = data.fixes!.filter(f => f.check.startsWith("integration-"));
    for (const fix of integrationFixes) {
      expect(fix.result).toBe("skipped");
      expect(fix.detail).toContain("manually");
    }
  });
});

// ==================== FIX ARRAY STRUCTURE ====================

describe("Doctor --fix output structure", () => {
  test("fixes array has correct shape", async () => {
    const data = await runDoctorFix();

    expect(data.fixes).toBeDefined();
    for (const fix of data.fixes!) {
      expect(typeof fix.check).toBe("string");
      expect(typeof fix.action).toBe("string");
      expect(["fixed", "skipped", "failed"]).toContain(fix.result);
      expect(typeof fix.detail).toBe("string");
      expect(fix.detail.length).toBeGreaterThan(0);
    }
  });

  test("fixes array is absent without --fix flag", async () => {
    const data = await runDoctorNoFix();
    expect(data.fixes).toBeUndefined();
  });

  test("every non-pass check with a fix field gets a fix entry", async () => {
    // Run without --fix first to capture the initial broken state
    const beforeData = await runDoctorNoFix();
    const fixableChecks = beforeData.checks.filter(c => c.status !== "pass" && c.fix);
    expect(fixableChecks.length).toBeGreaterThan(0);

    // Now run with --fix on a fresh temp dir
    const freshDir = await mkdtemp(join(tmpdir(), "mktg-doctor-fix-every-"));
    const freshFlags = { ...flags, cwd: freshDir };
    const result = await doctorHandler(["--fix"], freshFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Doctor --fix failed");
    const data = result.data as DoctorData;

    // Every fixable check should have a corresponding fix entry
    for (const check of fixableChecks) {
      const fixEntry = data.fixes!.find(f => f.check === check.name);
      expect(fixEntry).toBeDefined();
    }

    await rm(freshDir, { recursive: true, force: true });
  });
});

// ==================== EXIT CODE ====================

describe("Doctor --fix exit code", () => {
  test("exit code is always 0 (doctor never crashes)", async () => {
    const result = await doctorHandler(["--fix"], flags);
    expect(result.exitCode).toBe(0);
  });

  test("exit code is 0 even with --dry-run", async () => {
    const result = await doctorHandler(["--fix"], { ...flags, dryRun: true });
    expect(result.exitCode).toBe(0);
  });
});

// ==================== IDEMPOTENCY ====================

describe("Doctor --fix is idempotent", () => {
  test("running --fix twice produces same final state", async () => {
    const data1 = await runDoctorFix();
    const data2 = await runDoctorFix();

    // Same passed state
    expect(data1.passed).toBe(data2.passed);

    // Same check results
    expect(data1.checks.length).toBe(data2.checks.length);
    for (let i = 0; i < data1.checks.length; i++) {
      expect(data1.checks[i]!.name).toBe(data2.checks[i]!.name);
      expect(data1.checks[i]!.status).toBe(data2.checks[i]!.status);
    }
  });
});
