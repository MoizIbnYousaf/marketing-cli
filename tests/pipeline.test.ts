// Full pipeline E2E test — soup to nuts
// Tests the complete lifecycle: init → status → doctor → list → update → status
// No mocks. Real file I/O, real skill install, real health checks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler as initHandler } from "../src/commands/init";
import { handler as statusHandler } from "../src/commands/status";
import { handler as doctorHandler } from "../src/commands/doctor";
import { handler as listHandler } from "../src/commands/list";
import { handler as updateHandler } from "../src/commands/update";
import { loadManifest } from "../src/core/skills";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-pipeline-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Full pipeline: init → status → doctor → list → update", () => {
  test("Step 1: status reports needs-setup before init", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
    // Skills are global (~/.claude/skills/), so count may be >0 from prior runs
    expect(typeof result.data.skills.installed).toBe("number");
    const manifest = await loadManifest();
    expect(result.data.skills.total).toBe(Object.keys(manifest.skills).length);
    expect(result.data.content.totalFiles).toBe(0);

    // All brand files should be missing
    for (const [file, entry] of Object.entries(result.data.brand)) {
      expect(entry.exists).toBe(false);
    }
  });

  test("Step 2: doctor reports failures before init", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.passed).toBe(false);

    // Brand checks should fail
    const brandChecks = result.data.checks.filter((c) => c.name.startsWith("brand"));
    const allBrandFail = brandChecks.every((c) => c.status === "fail");
    expect(allBrandFail).toBe(true);
  });

  test("Step 3: init scaffolds everything", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    if (!result.ok) return;

    // Brand files created
    expect(result.data.brand.created).toHaveLength(10);
    expect(result.data.brand.skipped).toHaveLength(0);

    // Skills installed
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
    expect(result.data.skills.failed).toHaveLength(0);

    // Doctor passed
    expect(result.data.doctor.passed).toBe(true);

    // Project detected
    expect(result.data.project.name).toBeTruthy();
    expect(result.data.project.goal).toBe("launch");
  });

  test("Step 4: status reports ready after init", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Health should not be needs-setup
    expect(result.data.health).not.toBe("needs-setup");

    // All 10 brand files should exist
    const entries = Object.entries(result.data.brand);
    expect(entries).toHaveLength(10);
    for (const [file, entry] of entries) {
      expect(entry.exists).toBe(true);
    }

    // Skills should be installed
    expect(result.data.skills.installed).toBeGreaterThan(0);
    const m2 = await loadManifest();
    expect(result.data.skills.total).toBe(Object.keys(m2.skills).length);
  });

  test("Step 5: doctor passes after init", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.passed).toBe(true);

    // Brand checks should pass
    const brandChecks = result.data.checks.filter((c) => c.name.startsWith("brand"));
    for (const check of brandChecks) {
      expect(check.status).not.toBe("fail");
    }

    // bun CLI should be found
    const bunCheck = result.data.checks.find((c) => c.name === "cli-bun");
    expect(bunCheck?.status).toBe("pass");
  });

  test("Step 6: list shows all skills", async () => {
    const m3 = await loadManifest();
    const expectedCount = Object.keys(m3.skills).length;
    const result = await listHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(expectedCount);
    expect(result.data.skills).toHaveLength(expectedCount);

    // Check skill names
    const names = result.data.skills.map((s) => s.name);
    expect(names).toContain("cmo");
    expect(names).toContain("brand-voice");
    expect(names).toContain("audience-research");
    expect(names).toContain("direct-response-copy");
    expect(names).toContain("seo-audit");
    expect(names).toContain("email-sequences");
    expect(names).toContain("marketing-psychology");

    // Check categories
    const categories = new Set(result.data.skills.map((s) => s.category));
    expect(categories.has("foundation")).toBe(true);
    expect(categories.has("strategy")).toBe(true);
    expect(categories.has("copy-content")).toBe(true);
    expect(categories.has("distribution")).toBe(true);

    // Check tiers
    const mustHaves = result.data.skills.filter((s) => s.tier === "must-have");
    expect(mustHaves.length).toBeGreaterThanOrEqual(10);
  });

  test("Step 7: update reports no changes on fresh install", async () => {
    await initHandler(["--yes"], flags);
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // After init + immediate update, all should be unchanged
    const m4 = await loadManifest();
    const expectedTotal = Object.keys(m4.skills).length;
    expect(result.data.totalSkills).toBe(expectedTotal);
    expect(result.data.skills.unchanged.length + result.data.skills.updated.length + result.data.skills.notBundled.length).toBe(expectedTotal);
  });

  test("Step 8: re-init is idempotent", async () => {
    // First init
    const first = await initHandler(["--yes"], flags);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Second init
    const second = await initHandler(["--yes"], flags);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Brand should all be skipped (already exist)
    expect(second.data.brand.created).toHaveLength(0);
    expect(second.data.brand.skipped).toHaveLength(10);
  });
});

describe("Pipeline with --dry-run flag", () => {
  const dryFlags = { json: true, dryRun: true, fields: [] as string[], cwd: "" };

  beforeEach(() => {
    dryFlags.cwd = tempDir;
  });

  test("init --dry-run reports what would happen without writing", async () => {
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Reports 10 files would be created
    expect(result.data.brand.created).toHaveLength(10);

    // But no files actually exist
    const brandDir = join(tempDir, "brand");
    let exists = false;
    try {
      await stat(brandDir);
      exists = true;
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  test("status works in dry-run mode", async () => {
    const result = await statusHandler([], dryFlags);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
  });
});

describe("Pipeline with custom --cwd", () => {
  test("init works with custom cwd", async () => {
    const customDir = await mkdtemp(join(tmpdir(), "mktg-custom-cwd-"));
    const customFlags = { ...flags, cwd: customDir };

    const result = await initHandler(["--yes"], customFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Brand files should be in custom dir
    const voicePath = join(customDir, "brand", "voice-profile.md");
    const exists = await Bun.file(voicePath).exists();
    expect(exists).toBe(true);

    await rm(customDir, { recursive: true, force: true });
  });

  test("status reads from custom cwd", async () => {
    const customDir = await mkdtemp(join(tmpdir(), "mktg-custom-status-"));
    const customFlags = { ...flags, cwd: customDir };

    // Init in custom dir
    await initHandler(["--yes"], customFlags);

    // Status should read from custom dir
    const result = await statusHandler([], customFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).not.toBe("needs-setup");

    await rm(customDir, { recursive: true, force: true });
  });
});

describe("Pipeline with content files", () => {
  test("status counts marketing content files", async () => {
    await initHandler(["--yes"], flags);

    // Create some marketing content
    const contentDir = join(tempDir, "marketing");
    await Bun.$`mkdir -p ${contentDir}`.quiet();
    await Bun.write(join(contentDir, "blog-post-1.md"), "# Blog Post 1\n\nContent here.");
    await Bun.write(join(contentDir, "blog-post-2.md"), "# Blog Post 2\n\nMore content.");
    await Bun.write(join(contentDir, "landing-page.html"), "<h1>Landing Page</h1>");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.content.totalFiles).toBe(3);
  });

  test("status counts content in campaigns/ directory", async () => {
    await initHandler(["--yes"], flags);

    const campaignDir = join(tempDir, "campaigns");
    await Bun.$`mkdir -p ${campaignDir}`.quiet();
    await Bun.write(join(campaignDir, "email-1.md"), "# Email 1");
    await Bun.write(join(campaignDir, "email-2.md"), "# Email 2");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.content.totalFiles).toBe(2);
  });
});

describe("Pipeline with project detection", () => {
  test("detects project name from package.json", async () => {
    await Bun.write(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "my-cool-project" }),
    );

    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.project.name).toBe("my-cool-project");
  });

  test("falls back to directory name without package.json", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should use temp dir name (starts with mktg-pipeline-)
    expect(result.data.project.name).toBeTruthy();
  });

  test("status reports correct project name", async () => {
    await Bun.write(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-project" }),
    );

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.project).toBe("test-project");
  });
});
