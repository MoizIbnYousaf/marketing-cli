// Unit tests for appendLearning — brand/learnings.md activation
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { appendLearning, type LearningEntry } from "../src/core/brand";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-learnings-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const validEntry: LearningEntry = {
  date: "2026-03-20",
  action: "Voice extraction",
  result: "Success",
  learning: "Technical tone resonates with devs",
  nextStep: "Test in email copy",
};

describe("appendLearning", () => {
  test("creates learnings.md with header when file does not exist", async () => {
    const result = await appendLearning(tempDir, validEntry);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const content = await Bun.file(join(tempDir, "brand", "learnings.md")).text();
    expect(content).toContain("# Marketing Learnings");
    expect(content).toContain("| Date | Action | Result | Learning | Next Step |");
    expect(content).toContain("| 2026-03-20 | Voice extraction | Success | Technical tone resonates with devs | Test in email copy |");
  });

  test("creates brand/ dir when it does not exist", async () => {
    await appendLearning(tempDir, validEntry);
    const exists = await Bun.file(join(tempDir, "brand", "learnings.md")).exists();
    expect(exists).toBe(true);
  });

  test("appends to existing file without overwriting", async () => {
    const brandDir = join(tempDir, "brand");
    await mkdir(brandDir, { recursive: true });
    const existingContent = `# Marketing Learnings\n\n| Date | Action | Result | Learning | Next Step |\n|------|--------|--------|----------|----------|\n| 2026-03-19 | Old action | Old result | Old learning | Old next |\n`;
    await writeFile(join(brandDir, "learnings.md"), existingContent);

    await appendLearning(tempDir, validEntry);

    const content = await Bun.file(join(brandDir, "learnings.md")).text();
    // Old entry preserved
    expect(content).toContain("Old action");
    // New entry appended
    expect(content).toContain("Voice extraction");
  });

  test("returns formatted row on success", async () => {
    const result = await appendLearning(tempDir, validEntry);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row).toBe("| 2026-03-20 | Voice extraction | Success | Technical tone resonates with devs | Test in email copy |");
  });

  test("dry-run returns row without writing file", async () => {
    const result = await appendLearning(tempDir, validEntry, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row).toContain("Voice extraction");

    const exists = await Bun.file(join(tempDir, "brand", "learnings.md")).exists();
    expect(exists).toBe(false);
  });

  test("rejects empty action field", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, action: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("action");
  });

  test("rejects empty result field", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, result: "" });
    expect(result.ok).toBe(false);
  });

  test("rejects empty learning field", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, learning: "" });
    expect(result.ok).toBe(false);
  });

  test("rejects empty nextStep field", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, nextStep: "" });
    expect(result.ok).toBe(false);
  });

  test("rejects empty date field", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, date: "" });
    expect(result.ok).toBe(false);
  });

  test("rejects control characters in fields", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, action: "test\x00inject" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("control characters");
  });

  test("rejects pipe characters in fields", async () => {
    const result = await appendLearning(tempDir, { ...validEntry, learning: "A | B" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("pipe");
  });

  test("multiple appends accumulate correctly", async () => {
    await appendLearning(tempDir, validEntry);
    await appendLearning(tempDir, {
      date: "2026-03-21",
      action: "Email test",
      result: "42% open rate",
      learning: "Subject line matters",
      nextStep: "A/B test emojis",
    });

    const content = await Bun.file(join(tempDir, "brand", "learnings.md")).text();
    const rows = content.split("\n").filter(line => line.startsWith("| 2026-03-"));
    expect(rows.length).toBe(2);
  });
});
