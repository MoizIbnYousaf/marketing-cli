// Integration test: brand reset subcommand
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scaffoldBrand } from "../../src/core/brand";
import { handler } from "../../src/commands/brand";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-reset-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const createMktgState = async (cwd: string): Promise<void> => {
  const mktgDir = join(cwd, ".mktg");
  await mkdir(join(mktgDir, "compete"), { recursive: true });
  await writeFile(join(mktgDir, "plan.json"), JSON.stringify({ tasks: [] }));
  await writeFile(join(mktgDir, "publish.log"), "published: 2026-01-01\n");
  await writeFile(join(mktgDir, "compete", "snapshot.json"), JSON.stringify({ ts: Date.now() }));
};

describe("brand reset — confirm gate", () => {
  test("missing --confirm and no --dry-run returns invalidArgs", async () => {
    const result = await handler(["reset"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
    expect(result.error.message).toContain("--confirm");
  });

  test("--dry-run bypasses --confirm requirement", async () => {
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["reset"], dryFlags);
    expect(result.ok).toBe(true);
  });
});

describe("brand reset — dry-run behaviour", () => {
  test("dry-run reports what would be cleared without deleting .mktg/", async () => {
    await createMktgState(tempDir);
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["reset"], dryFlags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { cleared: string[]; dryRun: boolean };
    expect(data.dryRun).toBe(true);
    expect(data.cleared).toContain(".mktg/");

    // Directory must still exist
    const mktgStat = await stat(join(tempDir, ".mktg"));
    expect(mktgStat.isDirectory()).toBe(true);
  });

  test("dry-run with --include-learnings reports learnings.md without modifying it", async () => {
    await scaffoldBrand(tempDir);
    await createMktgState(tempDir);
    // Write some real content to learnings.md
    await writeFile(
      join(tempDir, "brand", "learnings.md"),
      "# Learnings\n\n| Date | Action | Result | Learning | Next Step |\n|------|--------|--------|----------|----------|\n| 2026-01-01 | test | ok | good | keep going |\n",
    );

    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["reset", "--include-learnings"], dryFlags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { cleared: string[]; includedLearnings: boolean };
    expect(data.cleared).toContain("brand/learnings.md");
    expect(data.includedLearnings).toBe(true);

    // Content unchanged
    const content = await Bun.file(join(tempDir, "brand", "learnings.md")).text();
    expect(content).toContain("keep going");
  });
});

describe("brand reset — actual reset", () => {
  test("reset clears .mktg/ directory", async () => {
    await createMktgState(tempDir);
    const result = await handler(["reset", "--confirm"], flags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { cleared: string[]; dryRun: boolean };
    expect(data.cleared).toContain(".mktg/");
    expect(data.dryRun).toBe(false);

    // .mktg/ must be gone
    let exists = false;
    try {
      await stat(join(tempDir, ".mktg"));
      exists = true;
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  test("reset does NOT touch brand/ core files", async () => {
    await scaffoldBrand(tempDir);
    await createMktgState(tempDir);
    await handler(["reset", "--confirm"], flags);

    const voiceExists = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(voiceExists).toBe(true);
  });

  test("reset when .mktg/ does not exist returns ok with empty cleared array", async () => {
    const result = await handler(["reset", "--confirm"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { cleared: string[] };
    expect(data.cleared).toHaveLength(0);
  });

  test("reset with --include-learnings rewrites learnings.md to header only", async () => {
    await scaffoldBrand(tempDir);
    await writeFile(
      join(tempDir, "brand", "learnings.md"),
      "# Learnings\n\n| Date | Action | Result | Learning | Next Step |\n|------|--------|--------|----------|----------|\n| 2026-01-01 | did thing | worked | lesson | next |\n",
    );

    const result = await handler(["reset", "--confirm", "--include-learnings"], flags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { cleared: string[]; includedLearnings: boolean };
    expect(data.cleared).toContain("brand/learnings.md");
    expect(data.includedLearnings).toBe(true);

    const content = await Bun.file(join(tempDir, "brand", "learnings.md")).text();
    expect(content).toContain("# Learnings");
    // Old data row must be gone
    expect(content).not.toContain("did thing");
  });

  test("reset without --include-learnings leaves learnings.md untouched", async () => {
    await scaffoldBrand(tempDir);
    const originalContent = "# Learnings\n\nsome entries here\n";
    await writeFile(join(tempDir, "brand", "learnings.md"), originalContent);
    await createMktgState(tempDir);

    await handler(["reset", "--confirm"], flags);

    const content = await Bun.file(join(tempDir, "brand", "learnings.md")).text();
    expect(content).toBe(originalContent);
  });

  test("includedLearnings is false when --include-learnings not passed", async () => {
    const result = await handler(["reset", "--confirm"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { includedLearnings: boolean };
    expect(data.includedLearnings).toBe(false);
  });
});
