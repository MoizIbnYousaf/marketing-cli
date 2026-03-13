// Verify Bun.$ mkdir removal — source code checks + functional tests
// No mocks. Real file I/O in isolated temp dirs.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scaffoldBrand } from "../src/core/brand";

// ---------- Source code checks ----------

describe("Bun.$ mkdir removal verification", () => {
  test("skills.ts does not contain Bun.$ mkdir", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/skills.ts"), "utf-8");
    expect(content).not.toContain("Bun.$`mkdir");
  });

  test("agents.ts does not contain Bun.$ mkdir", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/agents.ts"), "utf-8");
    expect(content).not.toContain("Bun.$`mkdir");
  });

  test("brand.ts does not contain Bun.$ mkdir", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/brand.ts"), "utf-8");
    expect(content).not.toContain("Bun.$`mkdir");
  });

  test("skills.ts uses fs.mkdir import", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/skills.ts"), "utf-8");
    expect(content).toContain("mkdir");
    expect(content).toContain("node:fs/promises");
  });

  test("agents.ts uses fs.mkdir import", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/agents.ts"), "utf-8");
    expect(content).toContain("mkdir");
    expect(content).toContain("node:fs/promises");
  });

  test("brand.ts uses fs.mkdir import", () => {
    const content = readFileSync(join(import.meta.dir, "../src/core/brand.ts"), "utf-8");
    expect(content).toContain("mkdir");
    expect(content).toContain("node:fs/promises");
  });

  test("no Bun.$ mkdir calls anywhere in src/core/", () => {
    const coreFiles = ["skills.ts", "agents.ts", "brand.ts", "paths.ts", "routing.ts", "output.ts", "errors.ts"];
    for (const file of coreFiles) {
      const filePath = join(import.meta.dir, "../src/core/", file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        expect(content).not.toContain("Bun.$`mkdir");
      }
    }
  });
});

// ---------- Functional tests ----------

describe("scaffoldBrand creates directories with fs.mkdir", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-mkdir-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("creates brand/ directory in empty dir", async () => {
    const result = await scaffoldBrand(tmpDir);
    expect(result.created.length).toBeGreaterThan(0);
    expect(existsSync(join(tmpDir, "brand"))).toBe(true);
  });

  test("creates all 9 brand files", async () => {
    const result = await scaffoldBrand(tmpDir);
    expect(result.created).toHaveLength(9);
  });

  test("each brand file exists on disk after scaffold", async () => {
    await scaffoldBrand(tmpDir);
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
      expect(existsSync(join(tmpDir, "brand", file))).toBe(true);
    }
  });

  test("brand files have non-empty content", async () => {
    await scaffoldBrand(tmpDir);
    const content = readFileSync(join(tmpDir, "brand", "voice-profile.md"), "utf-8");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("Brand Voice Profile");
  });

  test("dry-run does not create any files", async () => {
    const result = await scaffoldBrand(tmpDir, true);
    expect(result.created).toHaveLength(9);
    expect(existsSync(join(tmpDir, "brand"))).toBe(false);
  });

  test("second scaffold skips existing files", async () => {
    await scaffoldBrand(tmpDir);
    const result2 = await scaffoldBrand(tmpDir);
    expect(result2.created).toHaveLength(0);
    expect(result2.skipped).toHaveLength(9);
  });

  test("nested directory creation works (brand/ does not exist)", async () => {
    expect(existsSync(join(tmpDir, "brand"))).toBe(false);
    await scaffoldBrand(tmpDir);
    expect(existsSync(join(tmpDir, "brand"))).toBe(true);
  });
});
