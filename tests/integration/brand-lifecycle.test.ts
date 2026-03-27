// Integration test: Brand Lifecycle
// scaffold → detect templates → write real content → detect freshness → stale detection
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BRAND_FILES, BRAND_PROFILE_FILES, BRAND_APPEND_FILES } from "../../src/types";
import {
  scaffoldBrand,
  getBrandStatus,
  isTemplateContent,
  assessFreshness,
  exportBrand,
  importBrand,
  computeBrandHashes,
  saveBrandHashes,
  diffBrand,
} from "../../src/core/brand";
import { handler as statusHandler } from "../../src/commands/status";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-lifecycle-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Phase 1: Scaffold brand/ from nothing", () => {
  test("scaffoldBrand creates all 10 files in brand/ directory", async () => {
    const result = await scaffoldBrand(tempDir);

    expect(result.created).toHaveLength(10);
    expect(result.skipped).toHaveLength(0);

    for (const file of BRAND_FILES) {
      const exists = await Bun.file(join(tempDir, "brand", file)).exists();
      expect(exists).toBe(true);
    }
  });

  test("every scaffolded file has non-empty content with markdown headers", async () => {
    await scaffoldBrand(tempDir);

    for (const file of BRAND_FILES) {
      const content = await Bun.file(join(tempDir, "brand", file)).text();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("#");
    }
  });

  test("scaffolding is idempotent — second call skips all files", async () => {
    await scaffoldBrand(tempDir);
    const result = await scaffoldBrand(tempDir);

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toHaveLength(10);
  });

  test("dry-run does not create any files", async () => {
    const result = await scaffoldBrand(tempDir, true);

    expect(result.created).toHaveLength(10);
    for (const file of BRAND_FILES) {
      const exists = await Bun.file(join(tempDir, "brand", file)).exists();
      expect(exists).toBe(false);
    }
  });
});

describe("Phase 2: Template detection", () => {
  test("all scaffolded files are detected as templates", async () => {
    await scaffoldBrand(tempDir);

    for (const file of BRAND_FILES) {
      const content = await Bun.file(join(tempDir, "brand", file)).text();
      expect(isTemplateContent(file, content)).toBe(true);
    }
  });

  test("overwritten file is NOT detected as template", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Our Real Voice\nWe speak with clarity.");

    const content = await Bun.file(join(tempDir, "brand", "voice-profile.md")).text();
    expect(isTemplateContent("voice-profile.md", content)).toBe(false);
  });

  test("template detection is content-based, not mtime-based", async () => {
    await scaffoldBrand(tempDir);
    // Touch the file to change mtime but keep template content
    const filePath = join(tempDir, "brand", "voice-profile.md");
    const futureDate = new Date(Date.now() + 86400000);
    await utimes(filePath, futureDate, futureDate);

    const content = await Bun.file(filePath).text();
    expect(isTemplateContent("voice-profile.md", content)).toBe(true);
  });

  test("status reports all templates after scaffold", async () => {
    await scaffoldBrand(tempDir);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      if (entry.exists) {
        expect(entry.isTemplate).toBe(true);
        expect(entry.freshness).toBe("template");
      }
    }
  });
});

describe("Phase 3: Write real content and detect changes", () => {
  test("populating 3 files transitions health from incomplete to ready", async () => {
    await scaffoldBrand(tempDir);

    // Before: all templates → incomplete
    const before = await statusHandler([], flags);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.data.health).toBe("incomplete");

    // Populate foundation files
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice\nDirect, technical, opinionated.");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Positioning\nThe only AI-native marketing CLI.");
    await Bun.write(join(tempDir, "brand", "audience.md"), "# Audience\nSolo founders building SaaS.");

    // After: 3 populated → ready
    const after = await statusHandler([], flags);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.data.health).toBe("ready");
    expect(after.data.brandSummary.populated).toBe(3);
    expect(after.data.brandSummary.template).toBe(6);
  });

  test("populated files show freshness: current (not template)", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real voice content");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const vp = result.data.brand["voice-profile.md"];
    expect(vp.isTemplate).toBe(false);
    expect(vp.freshness).toBe("current");
  });

  test("brandSummary counts match actual file states", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real content");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "Real content");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.populated).toBe(2);
    expect(result.data.brandSummary.template).toBe(8);
    expect(result.data.brandSummary.missing).toBe(0);
  });

  test("line counts reflect actual content", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand["voice-profile.md"].lines).toBe(5);
  });
});

describe("Phase 4: Freshness and staleness detection", () => {
  test("assessFreshness returns current for recent files", () => {
    const recent = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(assessFreshness(recent)).toBe("current");
  });

  test("assessFreshness returns stale for old files", () => {
    const old = Date.now() - (45 * 24 * 60 * 60 * 1000); // 45 days ago
    expect(assessFreshness(old)).toBe("stale");
  });

  test("assessFreshness respects custom review interval", () => {
    const recent = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
    expect(assessFreshness(recent, 7)).toBe("stale"); // 7-day interval
    expect(assessFreshness(recent, 14)).toBe("current"); // 14-day interval
  });

  test("getBrandStatus returns freshness for each file", async () => {
    await scaffoldBrand(tempDir);
    const statuses = await getBrandStatus(tempDir);

    expect(statuses).toHaveLength(10);
    for (const status of statuses) {
      expect(status.exists).toBe(true);
      // Freshness can be "current" or "template" depending on whether init sets a special value
      expect(["current", "template"]).toContain(status.freshness);
      expect(status.ageDays).toBe(0);
    }
  });

  test("stale files are detected by mtime manipulation", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real voice");

    // Set mtime to 60 days ago
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await utimes(join(tempDir, "brand", "voice-profile.md"), oldDate, oldDate);

    const statuses = await getBrandStatus(tempDir);
    const vp = statuses.find(s => s.file === "voice-profile.md");
    expect(vp?.freshness).toBe("stale");
    expect(vp?.ageDays).toBeGreaterThanOrEqual(59);
  });

  test("append-only files (assets.md, learnings.md) are always current", async () => {
    await scaffoldBrand(tempDir);

    // Set mtime to 60 days ago for append files
    for (const file of BRAND_APPEND_FILES) {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await utimes(join(tempDir, "brand", file), oldDate, oldDate);
    }

    const statuses = await getBrandStatus(tempDir);
    for (const file of BRAND_APPEND_FILES) {
      const status = statuses.find(s => s.file === file);
      expect(status?.freshness).toBe("current");
    }
  });

  test("stale brand files appear in status nextActions", async () => {
    await scaffoldBrand(tempDir);
    // Populate enough to be "ready"
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real voice");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "Real positioning");
    await Bun.write(join(tempDir, "brand", "audience.md"), "Real audience");

    // Make voice-profile stale
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await utimes(join(tempDir, "brand", "voice-profile.md"), oldDate, oldDate);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.stale).toBeGreaterThanOrEqual(1);
    expect(result.data.nextActions.some(a => a.includes("voice-profile.md") && a.includes("Refresh"))).toBe(true);
  });
});

describe("Phase 5: Brand diff tracking", () => {
  test("computeBrandHashes returns hashes for existing files", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);

    expect(Object.keys(hashes)).toHaveLength(10);
    for (const file of BRAND_FILES) {
      expect(typeof hashes[file]).toBe("string");
      expect(hashes[file].length).toBe(64); // SHA-256 hex
    }
  });

  test("save + diff detects no changes", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    const diff = await diffBrand(tempDir);
    expect(diff.hasChanges).toBe(false);
    expect(diff.baselineTimestamp).not.toBeNull();
  });

  test("diff detects modified file after content change", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Modify one file
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Changed voice");

    const diff = await diffBrand(tempDir);
    expect(diff.hasChanges).toBe(true);
    const modified = diff.changes.find(c => c.file === "voice-profile.md");
    expect(modified?.status).toBe("modified");
  });

  test("diff detects deleted file", async () => {
    await scaffoldBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Delete one file
    await rm(join(tempDir, "brand", "voice-profile.md"));

    const diff = await diffBrand(tempDir);
    expect(diff.hasChanges).toBe(true);
    const deleted = diff.changes.find(c => c.file === "voice-profile.md");
    expect(deleted?.status).toBe("deleted");
  });
});

describe("Phase 6: Export and import brand bundle", () => {
  test("exportBrand produces a valid bundle with all 10 files", async () => {
    await scaffoldBrand(tempDir);
    const bundle = await exportBrand(tempDir);

    expect(bundle.version).toBe(1);
    expect(typeof bundle.exportedAt).toBe("string");
    expect(Object.keys(bundle.files)).toHaveLength(10);

    for (const file of BRAND_FILES) {
      const entry = bundle.files[file];
      expect(entry).toBeDefined();
      expect(typeof entry!.content).toBe("string");
      expect(typeof entry!.sha256).toBe("string");
      expect(entry!.content.length).toBeGreaterThan(0);
    }
  });

  test("importBrand restores files to a new directory", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Imported voice");
    const bundle = await exportBrand(tempDir);

    // Import to a fresh directory
    const importDir = await mkdtemp(join(tmpdir(), "mktg-import-"));
    const result = await importBrand(importDir, bundle, false);

    expect(result.imported).toHaveLength(10);
    const importedContent = await Bun.file(join(importDir, "brand", "voice-profile.md")).text();
    expect(importedContent).toBe("# Imported voice");

    await rm(importDir, { recursive: true, force: true });
  });

  test("export → import preserves SHA-256 integrity", async () => {
    await scaffoldBrand(tempDir);
    const bundle = await exportBrand(tempDir);

    const importDir = await mkdtemp(join(tmpdir(), "mktg-integrity-"));
    await importBrand(importDir, bundle, false);

    const originalHashes = await computeBrandHashes(tempDir);
    const importedHashes = await computeBrandHashes(importDir);

    for (const file of BRAND_FILES) {
      expect(importedHashes[file]).toBe(originalHashes[file]);
    }

    await rm(importDir, { recursive: true, force: true });
  });
});

describe("Phase 7: Missing files and partial states", () => {
  test("missing brand/ directory reports needs-setup", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).toBe("needs-setup");
  });

  test("deleting a file changes brandSummary counts", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real content");

    // Delete positioning.md
    await rm(join(tempDir, "brand", "positioning.md"));

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.missing).toBe(1);
    expect(result.data.brand["positioning.md"].exists).toBe(false);
    expect(result.data.brand["positioning.md"].freshness).toBe("missing");
  });

  test("getBrandStatus returns missing for files that do not exist", async () => {
    // No scaffold — brand/ doesn't exist
    const statuses = await getBrandStatus(tempDir);
    expect(statuses).toHaveLength(10);

    for (const status of statuses) {
      expect(status.exists).toBe(false);
      expect(status.freshness).toBe("missing");
      expect(status.ageDays).toBeNull();
    }
  });

  test("scaffold after partial deletion only creates missing files", async () => {
    await scaffoldBrand(tempDir);
    await rm(join(tempDir, "brand", "voice-profile.md"));
    await rm(join(tempDir, "brand", "positioning.md"));

    const result = await scaffoldBrand(tempDir);
    expect(result.created).toHaveLength(2);
    expect(result.created).toContain("voice-profile.md");
    expect(result.created).toContain("positioning.md");
    expect(result.skipped).toHaveLength(8);
  });
});
