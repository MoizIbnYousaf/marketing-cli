// Tests for brand export/import round-trip
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffoldBrand, exportBrand, importBrand } from "../src/core/brand";
import type { BrandBundle } from "../src/types";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("brand export", () => {
  test("exports all 10 brand files after scaffold", async () => {
    await scaffoldBrand(tempDir);
    const bundle = await exportBrand(tempDir);
    expect(bundle.version).toBe(1);
    expect(bundle.exportedAt).toBeDefined();
    expect(Object.keys(bundle.files)).toHaveLength(10);
    for (const entry of Object.values(bundle.files)) {
      expect(entry!.content.length).toBeGreaterThan(0);
      expect(entry!.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("exports empty bundle when brand/ does not exist", async () => {
    const bundle = await exportBrand(tempDir);
    expect(bundle.version).toBe(1);
    expect(Object.keys(bundle.files)).toHaveLength(0);
  });

  test("omits missing files without error", async () => {
    await scaffoldBrand(tempDir);
    // Delete a few files
    await rm(join(tempDir, "brand", "assets.md"));
    await rm(join(tempDir, "brand", "learnings.md"));
    const bundle = await exportBrand(tempDir);
    expect(Object.keys(bundle.files)).toHaveLength(7);
    expect(bundle.files["assets.md"]).toBeUndefined();
    expect(bundle.files["learnings.md"]).toBeUndefined();
  });
});

describe("brand import", () => {
  test("round-trip: scaffold → export → wipe → import → verify", async () => {
    await scaffoldBrand(tempDir);
    // Modify a file to make it non-template
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Custom Voice\nWe speak boldly.");
    const bundle = await exportBrand(tempDir);

    // Wipe brand dir
    await rm(join(tempDir, "brand"), { recursive: true, force: true });

    // Import
    const result = await importBrand(tempDir, bundle, false);
    expect(result.imported).toHaveLength(10);
    expect(result.skipped).toHaveLength(0);

    // Verify content matches
    const content = await Bun.file(join(tempDir, "brand", "voice-profile.md")).text();
    expect(content).toBe("# Custom Voice\nWe speak boldly.");
  });

  test("partial bundle only imports included files", async () => {
    const bundle: BrandBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: "test",
      files: {
        "voice-profile.md": { content: "# Voice", sha256: "abc" },
        "positioning.md": { content: "# Positioning", sha256: "def" },
        "audience.md": { content: "# Audience", sha256: "ghi" },
      },
    };
    const result = await importBrand(tempDir, bundle, false);
    expect(result.imported).toHaveLength(3);
    expect(result.skipped).toHaveLength(7); // 9 - 3
    expect(result.imported).toContain("voice-profile.md");
  });

  test("dry-run returns preview without writing", async () => {
    const bundle: BrandBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: "test",
      files: {
        "voice-profile.md": { content: "# Voice", sha256: "abc" },
      },
    };
    const result = await importBrand(tempDir, bundle, true);
    expect(result.imported).toHaveLength(1);
    // File should NOT exist
    const exists = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(exists).toBe(false);
  });

  test("import creates brand/ dir if missing", async () => {
    const bundle: BrandBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: "test",
      files: {
        "voice-profile.md": { content: "# Voice", sha256: "abc" },
      },
    };
    await importBrand(tempDir, bundle, false);
    const exists = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(exists).toBe(true);
  });
});

describe("brand export/import CLI integration", () => {
  const projectRoot = import.meta.dir.replace("/tests", "");

  const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--cwd", tempDir, ...args], {
      cwd: projectRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NO_COLOR: "1" },
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return { stdout: stdout.trim(), exitCode };
  };

  test("mktg brand export --json --cwd produces valid bundle", async () => {
    await scaffoldBrand(tempDir);
    const { stdout, exitCode } = await run(["brand", "export", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.version).toBe(1);
    expect(parsed.files).toBeDefined();
  });

  test("mktg brand import --file nonexistent --json returns NOT_FOUND", async () => {
    const { stdout, exitCode } = await run(["brand", "import", "--file", "/tmp/nonexistent-bundle-xyz.json", "--confirm", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("full CLI round-trip: export → import", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Our Angle\nWe are different.");

    // Export
    const { stdout: exportOut } = await run(["brand", "export", "--json"]);
    const bundle = JSON.parse(exportOut);

    // Write bundle to file
    const bundlePath = join(tempDir, "bundle.json");
    await Bun.write(bundlePath, JSON.stringify(bundle));

    // Wipe brand
    await rm(join(tempDir, "brand"), { recursive: true, force: true });

    // Import
    const { stdout: importOut, exitCode } = await run(["brand", "import", "--file", bundlePath, "--confirm", "--json"]);
    const result = JSON.parse(importOut);
    expect(exitCode).toBe(0);
    expect(result.imported).toHaveLength(10);

    // Verify
    const content = await Bun.file(join(tempDir, "brand", "positioning.md")).text();
    expect(content).toBe("# Our Angle\nWe are different.");
  });
});
