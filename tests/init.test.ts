// E2E tests for mktg init command
// Uses real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler } from "../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-init-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg init", () => {
  test("scaffolds brand/ with 9 files", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandDir = join(tempDir, "brand");
    const brandStat = await stat(brandDir);
    expect(brandStat.isDirectory()).toBe(true);

    const expectedFiles = [
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

    for (const file of expectedFiles) {
      const filePath = join(brandDir, file);
      const exists = await Bun.file(filePath).exists();
      expect(exists).toBe(true);
    }

    expect(result.data.brand.created.length).toBe(9);
  });

  test("returns valid JSON result structure", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("doctor");
    expect(result.data).toHaveProperty("project");
    expect(result.data.brand).toHaveProperty("created");
    expect(result.data.brand).toHaveProperty("skipped");
    expect(result.data.skills).toHaveProperty("installed");
  });

  test("--dry-run does not create files", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await handler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);

    const brandDir = join(tempDir, "brand");
    const exists = await Bun.file(brandDir).exists();
    expect(exists).toBe(false);
  });

  test("skips existing brand files on re-init", async () => {
    // First init
    await handler(["--yes"], flags);

    // Second init
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created.length).toBe(0);
    expect(result.data.brand.skipped.length).toBe(9);
  });

  test("--skip-brand skips brand scaffolding", async () => {
    const result = await handler(["--yes", "--skip-brand"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created.length).toBe(0);
    expect(result.data.brand.skipped.length).toBe(0);
  });

  test("--skip-skills skips skill installation", async () => {
    const result = await handler(["--yes", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.installed.length).toBe(0);
    expect(result.data.skills.skipped.length).toBe(0);
  });

  test("exit code is 0 on success", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.exitCode).toBe(0);
  });
});

describe("Init JSON input mode", () => {
  test("accepts --json= input with business name", async () => {
    const jsonInput = JSON.stringify({ business: "CEO App", goal: "grow" });
    const result = await handler(["--yes", `--json=${jsonInput}`], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.project.name).toBe("CEO App");
    expect(result.data.project.goal).toBe("grow");
  });
});

describe("Init combined flags", () => {
  test("--skip-brand --skip-skills creates minimal result", async () => {
    const result = await handler(["--yes", "--skip-brand", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created).toHaveLength(0);
    expect(result.data.brand.skipped).toHaveLength(0);
    expect(result.data.skills.installed).toHaveLength(0);
  });
});

describe("Init installs agents", () => {
  test("agents are reported in init result", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("agents");
    expect(Array.isArray(result.data.agents.installed)).toBe(true);
  });
});
