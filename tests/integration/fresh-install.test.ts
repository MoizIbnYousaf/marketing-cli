// Integration test: FRESH INSTALL PIPELINE
// Proves the entire init → brand → skills → agents → doctor → status pipeline
// works end-to-end on a clean directory. Real file I/O, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as initHandler } from "../../src/commands/init";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { handler as statusHandler } from "../../src/commands/status";
import { handler as listHandler } from "../../src/commands/list";
import { loadManifest } from "../../src/core/skills";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-fresh-install-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Fresh install pipeline", () => {
  test("init on clean dir creates brand/ with all 10 files", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandFiles = await readdir(join(tempDir, "brand"));
    expect(brandFiles.length).toBe(11); // 10 brand files + SCHEMA.md

    const expected = [
      "voice-profile.md",
      "positioning.md",
      "audience.md",
      "competitors.md",
      "keyword-plan.md",
      "creative-kit.md",
      "stack.md",
      "assets.md",
      "learnings.md",
    ];
    for (const file of expected) {
      expect(brandFiles).toContain(file);
    }
  });

  test("brand files contain template content (not empty)", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Every brand file should have some content
    const brandDir = join(tempDir, "brand");
    const files = await readdir(brandDir);
    for (const file of files) {
      const content = await readFile(join(brandDir, file), "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test("init installs skills to ~/.claude/skills/", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Init result should report installed skills
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
    expect(result.data.skills.failed.length).toBe(0);
  });

  test("init installs agents to ~/.claude/agents/", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Init result should report installed agents
    expect(result.data.agents.installed.length).toBeGreaterThan(0);
    expect(result.data.agents.failed.length).toBe(0);
  });

  test("init returns valid project metadata", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.project).toBeDefined();
    expect(typeof result.data.project.name).toBe("string");
    expect(result.data.project.name.length).toBeGreaterThan(0);
  });

  test("doctor passes after fresh init", async () => {
    // First init
    await initHandler(["--yes"], flags);

    // Then doctor
    const doctorResult = await doctorHandler([], flags);
    expect(doctorResult.ok).toBe(true);
    if (!doctorResult.ok) return;

    expect(doctorResult.data.passed).toBe(true);
  });

  test("doctor reports individual checks after init", async () => {
    await initHandler(["--yes"], flags);

    const doctorResult = await doctorHandler([], flags);
    expect(doctorResult.ok).toBe(true);
    if (!doctorResult.ok) return;

    // Should have multiple checks
    expect(doctorResult.data.checks.length).toBeGreaterThan(0);

    // Every check should pass or warn (warn is expected for template brand files)
    for (const check of doctorResult.data.checks) {
      expect(["pass", "warn"]).toContain(check.status);
    }

    // No check should fail after a fresh init
    const failedChecks = doctorResult.data.checks.filter((c: { status: string }) => c.status === "fail");
    expect(failedChecks.length).toBe(0);
  });

  test("status reports correctly after fresh init", async () => {
    await initHandler(["--yes"], flags);

    const statusResult = await statusHandler([], flags);
    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;

    // Health should not be needs-setup after init
    expect(statusResult.data.health).not.toBe("needs-setup");

    // Brand summary should show all 10 files exist
    const brandEntries = Object.keys(statusResult.data.brand);
    expect(brandEntries.length).toBe(10);

    // Skills should be installed
    expect(statusResult.data.skills.installed).toBeGreaterThan(0);
    const manifest = await loadManifest();
    expect(statusResult.data.skills.total).toBe(Object.keys(manifest.skills).length);

    // Agents should be installed
    expect(statusResult.data.agents.installed).toBeGreaterThan(0);
    expect(statusResult.data.agents.total).toBe(5);
  });

  test("list shows correct skill count after init", async () => {
    await initHandler(["--yes"], flags);

    const listResult = await listHandler([], flags);
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;

    const m = await loadManifest();
    expect(listResult.data.total).toBe(Object.keys(m.skills).length);
  });
});

describe("Pre-init state", () => {
  test("status reports needs-setup on clean dir", async () => {
    const statusResult = await statusHandler([], flags);
    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;

    expect(statusResult.data.health).toBe("needs-setup");
  });

  test("doctor fails on clean dir (no brand/)", async () => {
    const doctorResult = await doctorHandler([], flags);
    expect(doctorResult.ok).toBe(true);
    if (!doctorResult.ok) return;

    // Doctor should report failures when brand/ doesn't exist
    expect(doctorResult.data.passed).toBe(false);
  });
});

describe("Idempotent re-init", () => {
  test("second init skips existing brand files", async () => {
    // First init
    const first = await initHandler(["--yes"], flags);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Modify a brand file to prove it won't be overwritten
    const voicePath = join(tempDir, "brand", "voice-profile.md");
    await Bun.write(voicePath, "# Custom voice profile\nThis is real content.");

    // Second init
    const second = await initHandler(["--yes"], flags);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Brand files should be skipped (not recreated)
    expect(second.data.brand.skipped.length).toBe(10);
    expect(second.data.brand.created.length).toBe(0);

    // Custom content should be preserved
    const content = await readFile(voicePath, "utf-8");
    expect(content).toContain("Custom voice profile");
  });
});

describe("Init skip flags", () => {
  test("--skip-skills skips skill installation", async () => {
    const result = await initHandler(["--yes", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Skills should not be installed
    expect(result.data.skills.installed.length).toBe(0);
    // Brand should still be created
    expect(result.data.brand.created.length).toBe(10);
  });

  test("--skip-agents skips agent installation", async () => {
    const result = await initHandler(["--yes", "--skip-agents"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Agents should not be installed
    expect(result.data.agents.installed.length).toBe(0);
    // Skills should still be installed
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
  });

  test("--skip-brand skips brand/ scaffolding", async () => {
    const result = await initHandler(["--yes", "--skip-brand"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Brand should not be created
    expect(result.data.brand.created.length).toBe(0);
    // brand/ directory should not exist
    const brandExists = await Bun.file(join(tempDir, "brand")).exists();
    expect(brandExists).toBe(false);
    // Skills should still be installed
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
  });
});

describe("Init result structure", () => {
  test("result has all required top-level fields", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("agents");
    expect(result.data).toHaveProperty("doctor");
    expect(result.data).toHaveProperty("project");
  });

  test("brand result has created and skipped arrays", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.data.brand.created)).toBe(true);
    expect(Array.isArray(result.data.brand.skipped)).toBe(true);
  });

  test("skills result has installed, skipped, and failed arrays", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.data.skills.installed)).toBe(true);
    expect(Array.isArray(result.data.skills.skipped)).toBe(true);
    expect(Array.isArray(result.data.skills.failed)).toBe(true);
  });

  test("exit code is 0 on success", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.exitCode).toBe(0);
  });
});
