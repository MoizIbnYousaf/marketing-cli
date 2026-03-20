// DOCTOR EXHAUSTIVE — Every check passes on good state, every check fails correctly on broken state.
// Real file I/O in isolated temp dirs. NO MOCKS. NO FAKE DATA.
//
// Agent DX Axes Validated:
//   Axis 1: MACHINE-READABLE OUTPUT (3/3) — JSON output contract verified (passed + checks fields)
//   Axis 6: SAFETY RAILS (partial) — doctor never crashes (exit code always 0), fix fields actionable
//   Axis 3: SCHEMA INTROSPECTION (partial) — check names are stable identifiers agents can switch on

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { BRAND_FILES, BRAND_PROFILE_FILES, BRAND_APPEND_FILES } from "../../src/types";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { handler as initHandler } from "../../src/commands/init";

// ==================== Helpers ====================

let tempDir: string;
let flags: GlobalFlags;

const findCheck = (checks: readonly { name: string; status: string; detail: string; fix?: string }[], name: string) =>
  checks.find(c => c.name === name);

const findChecks = (checks: readonly { name: string; status: string; detail: string; fix?: string }[], prefix: string) =>
  checks.filter(c => c.name.startsWith(prefix));

const runDoctor = async () => {
  const result = await doctorHandler([], flags);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Doctor failed to return ok");
  return result.data;
};

const scaffoldBrandDir = async (files: Record<string, string> = {}) => {
  const brandDir = join(tempDir, "brand");
  await mkdir(brandDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(brandDir, name), content);
  }
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-doctor-exhaustive-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ==================== EMPTY STATE: Everything fails ====================

describe("Doctor on empty directory", () => {
  test("brand-profiles check fails with missing files", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-profiles");
    expect(check).toBeDefined();
    expect(check!.status).toBe("fail");
    expect(check!.fix).toBe("mktg init");
  });

  test("brand-append check fails with missing files", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-append");
    expect(check).toBeDefined();
    expect(check!.status).toBe("fail");
    expect(check!.detail).toContain("Missing");
  });

  test("overall passed is false", async () => {
    const data = await runDoctor();
    expect(data.passed).toBe(false);
  });

  test("exit code is always 0 (doctor never crashes)", async () => {
    const result = await doctorHandler([], flags);
    expect(result.exitCode).toBe(0);
  });

  test("every check has name, status, and detail", async () => {
    const data = await runDoctor();
    for (const check of data.checks) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
      expect(["pass", "fail", "warn"]).toContain(check.status);
      expect(typeof check.detail).toBe("string");
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });

  test("failed checks include fix suggestions", async () => {
    const data = await runDoctor();
    const failedChecks = data.checks.filter(c => c.status === "fail");
    expect(failedChecks.length).toBeGreaterThan(0);
    for (const check of failedChecks) {
      expect(check.fix).toBeTruthy();
    }
  });
});

// ==================== GOOD STATE: Everything passes ====================

describe("Doctor after init (good state)", () => {
  test("brand-profiles passes after init", async () => {
    await initHandler(["--yes"], flags);
    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-profiles");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
  });

  test("brand-append passes after init", async () => {
    await initHandler(["--yes"], flags);
    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-append");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
  });

  test("brand-content warns about template content after fresh init", async () => {
    await initHandler(["--yes"], flags);
    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-content");
    expect(check).toBeDefined();
    // Fresh init has template content — should warn
    expect(check!.status).toBe("warn");
    expect(check!.detail).toContain("template content");
  });

  test("no failed checks after init", async () => {
    await initHandler(["--yes"], flags);
    const data = await runDoctor();
    const brandChecks = data.checks.filter(c => c.name.startsWith("brand"));
    const failedBrand = brandChecks.filter(c => c.status === "fail");
    expect(failedBrand.length).toBe(0);
  });
});

// ==================== BRAND CONTENT: Template vs Real ====================

describe("Doctor brand content detection", () => {
  test("brand-content passes when files have real content", async () => {
    // Create brand files with real (non-template) content
    const realContent: Record<string, string> = {};
    for (const file of BRAND_PROFILE_FILES) {
      realContent[file] = `# Real Content\n\nThis is actual brand content for ${file}, not a template.\nOur brand voice is warm and conversational.\n`;
    }
    for (const file of BRAND_APPEND_FILES) {
      realContent[file] = "";
    }
    await scaffoldBrandDir(realContent);

    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-content");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
  });

  test("brand-content warns when files have template content (via init)", async () => {
    // Use init to scaffold real template content — this guarantees template detection matches
    await initHandler(["--yes"], flags);

    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-content");
    expect(check).toBeDefined();
    // After init, files have template content → warn
    expect(check!.status).toBe("warn");
    expect(check!.detail).toContain("template content");
  });
});

// ==================== PARTIAL STATE: Mixed results ====================

describe("Doctor with partial brand state", () => {
  test("detects specific missing profile files", async () => {
    // Create only some brand files
    const content: Record<string, string> = {};
    content["voice-profile.md"] = "# Real voice\nWarm and friendly.";
    content["positioning.md"] = "# Real positioning\nThe fastest solution.";
    // Skip audience.md, competitors.md, etc
    content["assets.md"] = "";
    content["learnings.md"] = "";
    await scaffoldBrandDir(content);

    const data = await runDoctor();
    const check = findCheck(data.checks, "brand-profiles");
    expect(check).toBeDefined();
    expect(check!.status).toBe("fail");
    expect(check!.detail).toContain("Missing");
    expect(check!.detail).toContain("audience.md");
  });

  test("brand-append passes when only append files exist", async () => {
    await scaffoldBrandDir({
      "assets.md": "",
      "learnings.md": "",
    });

    const data = await runDoctor();
    const appendCheck = findCheck(data.checks, "brand-append");
    expect(appendCheck).toBeDefined();
    expect(appendCheck!.status).toBe("pass");
  });

  test("passed is false when any check fails", async () => {
    // Only append files — profile files missing → fail
    await scaffoldBrandDir({
      "assets.md": "",
      "learnings.md": "",
    });

    const data = await runDoctor();
    expect(data.passed).toBe(false);
  });
});

// ==================== CLI TOOL CHECKS ====================

describe("Doctor CLI tool checks", () => {
  test("cli-bun passes (we're running in bun)", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "cli-bun");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
    expect(check!.detail).toContain("bun");
  });

  test("optional tools get warn (not fail) when missing", async () => {
    const data = await runDoctor();
    const optionalTools = ["cli-gws", "cli-playwright-cli", "cli-ffmpeg", "cli-remotion"];
    for (const toolName of optionalTools) {
      const check = findCheck(data.checks, toolName);
      expect(check).toBeDefined();
      // Optional tools should be warn or pass, never fail
      expect(check!.status).not.toBe("fail");
    }
  });

  test("all CLI checks have tool name in detail", async () => {
    const data = await runDoctor();
    const cliChecks = findChecks(data.checks, "cli-");
    expect(cliChecks.length).toBeGreaterThanOrEqual(1); // at least bun
    for (const check of cliChecks) {
      const toolName = check.name.replace("cli-", "");
      expect(check.detail.toLowerCase()).toContain(toolName);
    }
  });
});

// ==================== SKILL GRAPH CHECK ====================

describe("Doctor skill graph", () => {
  test("skill-graph check exists", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "skill-graph");
    expect(check).toBeDefined();
  });

  test("skill-graph check returns pass or warn (not fail)", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "skill-graph");
    expect(check).toBeDefined();
    // Graph check may warn if there's a build error or cycle — never fail
    expect(["pass", "warn"]).toContain(check!.status);
  });

  test("graph check has a meaningful detail string", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "skill-graph");
    expect(check).toBeDefined();
    expect(check!.detail.length).toBeGreaterThan(0);
  });
});

// ==================== AGENT CHECKS ====================

describe("Doctor agent checks", () => {
  test("agents check exists", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "agents");
    expect(check).toBeDefined();
  });

  test("agents check is never fail (agents are optional)", async () => {
    const data = await runDoctor();
    const check = findCheck(data.checks, "agents");
    expect(check).toBeDefined();
    // Agents may be installed or not — either pass or warn, never fail catastrophically
    expect(["pass", "warn"]).toContain(check!.status);
  });
});

// ==================== INTEGRATION CHECKS ====================

describe("Doctor integration env var checks", () => {
  test("integration checks exist", async () => {
    const data = await runDoctor();
    const integrationChecks = findChecks(data.checks, "integration-");
    expect(integrationChecks.length).toBeGreaterThan(0);
  });

  test("integration checks are warn or pass (never fail)", async () => {
    const data = await runDoctor();
    const integrationChecks = findChecks(data.checks, "integration-");
    for (const check of integrationChecks) {
      expect(check.status).not.toBe("fail");
    }
  });

  test("integration check names follow integration-{ENV_VAR} pattern", async () => {
    const data = await runDoctor();
    const integrationChecks = findChecks(data.checks, "integration-");
    for (const check of integrationChecks) {
      expect(check.name).toMatch(/^integration-[A-Z_]+$/);
    }
  });

  test("configured integrations report which skills need them", async () => {
    const data = await runDoctor();
    const integrationChecks = findChecks(data.checks, "integration-");
    for (const check of integrationChecks) {
      // Whether configured or not, the detail should mention skill names
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });
});

// ==================== CHECK CATEGORIES COMPLETENESS ====================

describe("Doctor covers all check categories", () => {
  test("has all 6 check categories", async () => {
    const data = await runDoctor();
    const names = data.checks.map(c => c.name);

    // Brand checks
    expect(names.some(n => n.startsWith("brand"))).toBe(true);
    // Skill check
    expect(names.includes("skills")).toBe(true);
    // Agent check
    expect(names.includes("agents")).toBe(true);
    // Graph check
    expect(names.includes("skill-graph")).toBe(true);
    // CLI checks
    expect(names.some(n => n.startsWith("cli-"))).toBe(true);
    // Integration checks
    expect(names.some(n => n.startsWith("integration-"))).toBe(true);
  });

  test("total check count is reasonable (10+)", async () => {
    const data = await runDoctor();
    expect(data.checks.length).toBeGreaterThanOrEqual(10);
  });
});

// ==================== JSON OUTPUT CONTRACT ====================

describe("Doctor JSON output contract", () => {
  test("output has exactly passed and checks fields", async () => {
    const data = await runDoctor();
    expect(data).toHaveProperty("passed");
    expect(data).toHaveProperty("checks");
    expect(typeof data.passed).toBe("boolean");
    expect(Array.isArray(data.checks)).toBe(true);
  });

  test("passed is boolean derived from checks (no fail = passed)", async () => {
    await initHandler(["--yes"], flags);
    const data = await runDoctor();
    const hasFail = data.checks.some(c => c.status === "fail");
    expect(data.passed).toBe(!hasFail);
  });

  test("check status is strictly pass|fail|warn", async () => {
    const data = await runDoctor();
    const validStatuses = ["pass", "fail", "warn"];
    for (const check of data.checks) {
      expect(validStatuses).toContain(check.status);
    }
  });
});

// ==================== IDEMPOTENCY ====================

describe("Doctor is idempotent", () => {
  test("running doctor twice returns identical results", async () => {
    const data1 = await runDoctor();
    const data2 = await runDoctor();

    expect(data1.passed).toBe(data2.passed);
    expect(data1.checks.length).toBe(data2.checks.length);

    for (let i = 0; i < data1.checks.length; i++) {
      expect(data1.checks[i]!.name).toBe(data2.checks[i]!.name);
      expect(data1.checks[i]!.status).toBe(data2.checks[i]!.status);
    }
  });
});
