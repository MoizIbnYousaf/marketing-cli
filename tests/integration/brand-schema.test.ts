// Integration test: Brand SCHEMA.md scaffolding
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scaffoldBrand } from "../../src/core/brand";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-schema-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("SCHEMA.md scaffolding", () => {
  test("scaffoldBrand creates brand/SCHEMA.md", async () => {
    await scaffoldBrand(tempDir);

    const schemaPath = join(tempDir, "brand", "SCHEMA.md");
    const exists = await Bun.file(schemaPath).exists();
    expect(exists).toBe(true);
  });

  test("SCHEMA.md contains the files table header", async () => {
    await scaffoldBrand(tempDir);

    const content = await Bun.file(join(tempDir, "brand", "SCHEMA.md")).text();
    expect(content).toContain("# Brand Memory Schema");
    expect(content).toContain("## Files");
    expect(content).toContain("| File | Purpose | Required sections | Freshness | Writers |");
  });

  test("SCHEMA.md contains the progressive enhancement table", async () => {
    await scaffoldBrand(tempDir);

    const content = await Bun.file(join(tempDir, "brand", "SCHEMA.md")).text();
    expect(content).toContain("## Progressive Enhancement");
    expect(content).toContain("| Level | Context available | Behavior |");
    expect(content).toContain("L0");
    expect(content).toContain("L4");
  });

  test("SCHEMA.md lists all 10 brand files", async () => {
    await scaffoldBrand(tempDir);

    const content = await Bun.file(join(tempDir, "brand", "SCHEMA.md")).text();
    const expectedFiles = [
      "voice-profile.md",
      "positioning.md",
      "audience.md",
      "competitors.md",
      "landscape.md",
      "keyword-plan.md",
      "creative-kit.md",
      "stack.md",
      "assets.md",
      "learnings.md",
    ];
    for (const file of expectedFiles) {
      expect(content).toContain(file);
    }
  });

  test("scaffolding is idempotent — second call does not overwrite SCHEMA.md", async () => {
    await scaffoldBrand(tempDir);

    // Overwrite SCHEMA.md with custom content
    const schemaPath = join(tempDir, "brand", "SCHEMA.md");
    await Bun.write(schemaPath, "# Custom schema content");

    // Second scaffold should not overwrite
    const result = await scaffoldBrand(tempDir);
    expect(result.schemaCreated).toBe(false);

    const content = await Bun.file(schemaPath).text();
    expect(content).toBe("# Custom schema content");
  });

  test("schemaCreated is true on first scaffold, false on second", async () => {
    const first = await scaffoldBrand(tempDir);
    expect(first.schemaCreated).toBe(true);

    const second = await scaffoldBrand(tempDir);
    expect(second.schemaCreated).toBe(false);
  });

  test("dry-run does not create SCHEMA.md", async () => {
    const result = await scaffoldBrand(tempDir, true);

    expect(result.schemaCreated).toBe(true); // would be created
    const schemaPath = join(tempDir, "brand", "SCHEMA.md");
    const exists = await Bun.file(schemaPath).exists();
    expect(exists).toBe(false);
  });

  test("mktg init via CLI creates brand/SCHEMA.md", async () => {
    const proc = Bun.spawn(
      ["bun", "src/cli.ts", "init", "--json", '{"business":"test","goal":"launch"}', "--cwd", tempDir],
      {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    await proc.exited;

    const schemaPath = join(tempDir, "brand", "SCHEMA.md");
    const exists = await Bun.file(schemaPath).exists();
    expect(exists).toBe(true);
  });
});
