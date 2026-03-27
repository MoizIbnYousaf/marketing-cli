// Tests for brand diff — hash tracking and change detection
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffoldBrand, computeBrandHashes, saveBrandHashes, loadBrandHashes, diffBrand } from "../src/core/brand";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-diff-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("computeBrandHashes", () => {
  test("computes SHA-256 for all existing brand files", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    expect(Object.keys(hashes)).toHaveLength(10);
    for (const hash of Object.values(hashes)) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("skips missing files", async () => {
    // No brand dir
    const hashes = await computeBrandHashes(tempDir);
    expect(Object.keys(hashes)).toHaveLength(0);
  });
});

describe("saveBrandHashes / loadBrandHashes", () => {
  test("round-trip save and load", async () => {
    const hashes = { "voice-profile.md": "abc123", "positioning.md": "def456" };
    await saveBrandHashes(tempDir, hashes);
    const loaded = await loadBrandHashes(tempDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.hashes).toEqual(hashes);
    expect(loaded!.timestamp).toBeDefined();
  });

  test("load returns null when no baseline exists", async () => {
    const loaded = await loadBrandHashes(tempDir);
    expect(loaded).toBeNull();
  });
});

describe("diffBrand", () => {
  test("no baseline — all existing files show as added", async () => {
    await scaffoldBrand(tempDir);
    const result = await diffBrand(tempDir);
    expect(result.baselineTimestamp).toBeNull();
    expect(result.hasChanges).toBe(true);
    expect(result.changes.every(c => c.status === "added")).toBe(true);
    expect(result.changes).toHaveLength(10);
  });

  test("unchanged after baseline — all unchanged", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);
    const result = await diffBrand(tempDir);
    expect(result.baselineTimestamp).not.toBeNull();
    expect(result.hasChanges).toBe(false);
    expect(result.changes.every(c => c.status === "unchanged")).toBe(true);
  });

  test("modified file shows as modified", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Modify a file
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Changed Voice");

    const result = await diffBrand(tempDir);
    expect(result.hasChanges).toBe(true);
    const voiceChange = result.changes.find(c => c.file === "voice-profile.md");
    expect(voiceChange?.status).toBe("modified");
  });

  test("deleted file shows as deleted", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Delete a file
    await rm(join(tempDir, "brand", "assets.md"));

    const result = await diffBrand(tempDir);
    expect(result.hasChanges).toBe(true);
    const assetChange = result.changes.find(c => c.file === "assets.md");
    expect(assetChange?.status).toBe("deleted");
  });

  test("new file added after baseline shows as added", async () => {
    // Start with partial brand
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice");

    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Add a new file
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Positioning");

    const result = await diffBrand(tempDir);
    expect(result.hasChanges).toBe(true);
    const posChange = result.changes.find(c => c.file === "positioning.md");
    expect(posChange?.status).toBe("added");
  });
});
