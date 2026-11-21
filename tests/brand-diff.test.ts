// Tests for brand diff — hash tracking and change detection
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
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

// ─── mktg brand diff through the real CLI: the baseline lifecycle ───

type DiffOut = {
  baselineTimestamp: string | null;
  changes: { file: string; status: string }[];
  hasChanges: boolean;
  baselineSaved: boolean;
};

const PROJECT_ROOT = import.meta.dir.replace(/\/tests$/, "");

const runDiff = async (cwd: string, extra: string[] = []): Promise<{ data: DiffOut; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", "brand", "diff", "--json", "--cwd", cwd, ...extra], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1", HOME: cwd },
  });
  const stdout = await new Response(proc.stdout).text();
  return { data: JSON.parse(stdout) as DiffOut, exitCode: await proc.exited };
};

const statusOf = (d: DiffOut, file: string): string | undefined => d.changes.find(c => c.file === file)?.status;
const baselinePath = (dir: string): string => join(dir, ".mktg", "brand-hashes.json");

describe("mktg brand diff (CLI) — baseline lifecycle", () => {
  test("first run: no baseline → null timestamp, files 'added', baseline written", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v1");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Positioning v1");
    expect(await Bun.file(baselinePath(tempDir)).exists()).toBe(false);

    const { data, exitCode } = await runDiff(tempDir);
    expect(exitCode).toBe(0);
    expect(data.baselineTimestamp).toBeNull();
    expect(data.hasChanges).toBe(true);
    expect(data.changes.map(c => c.status)).toEqual(["added", "added"]);
    expect(data.baselineSaved).toBe(true);

    const saved = await loadBrandHashes(tempDir);
    expect(Object.keys(saved!.hashes).sort()).toEqual(["positioning.md", "voice-profile.md"]);
  });

  test("second run with no edits: unchanged against the first run's baseline", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v1");
    await runDiff(tempDir);
    const first = await loadBrandHashes(tempDir);

    const { data } = await runDiff(tempDir);
    expect(data.baselineTimestamp).toBe(first!.timestamp);
    expect(data.hasChanges).toBe(false);
    expect(statusOf(data, "voice-profile.md")).toBe("unchanged");
  });

  test("edit, add and remove brand files → modified, added, deleted; then baseline advances", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v1");
    await Bun.write(join(tempDir, "brand", "assets.md"), "# Assets v1");
    await runDiff(tempDir);

    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v2");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Positioning new");
    await rm(join(tempDir, "brand", "assets.md"));

    const { data } = await runDiff(tempDir);
    expect(data.baselineTimestamp).not.toBeNull();
    expect(data.hasChanges).toBe(true);
    expect(statusOf(data, "voice-profile.md")).toBe("modified");
    expect(statusOf(data, "positioning.md")).toBe("added");
    expect(statusOf(data, "assets.md")).toBe("deleted");
    expect(data.baselineSaved).toBe(true);

    // The diff that reported those changes recorded them; the next one is clean.
    const { data: next } = await runDiff(tempDir);
    expect(next.hasChanges).toBe(false);
    expect(statusOf(next, "assets.md")).toBeUndefined();
  });

  test("--dry-run with no baseline writes nothing", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v1");
    const { data, exitCode } = await runDiff(tempDir, ["--dry-run"]);
    expect(exitCode).toBe(0);
    expect(data.baselineTimestamp).toBeNull();
    expect(statusOf(data, "voice-profile.md")).toBe("added");
    expect(data.baselineSaved).toBe(false);
    expect(existsSync(join(tempDir, ".mktg"))).toBe(false);
    expect(Array.from(new Bun.Glob("**").scanSync({ cwd: tempDir, dot: true }))).toEqual(["brand/voice-profile.md"]);
  });

  test("--dry-run with a baseline reports changes but leaves the baseline byte-identical", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v1");
    await runDiff(tempDir);
    const before = await Bun.file(baselinePath(tempDir)).text();

    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice v2");
    const { data } = await runDiff(tempDir, ["--dry-run"]);
    expect(statusOf(data, "voice-profile.md")).toBe("modified");
    expect(data.baselineSaved).toBe(false);
    expect(await Bun.file(baselinePath(tempDir)).text()).toBe(before);

    // Still modified on the next real run, because the dry run recorded nothing.
    const { data: real } = await runDiff(tempDir);
    expect(statusOf(real, "voice-profile.md")).toBe("modified");
  });

  test("no brand/ and no baseline: nothing to track, no .mktg/ created", async () => {
    const { data, exitCode } = await runDiff(tempDir);
    expect(exitCode).toBe(0);
    expect(data.changes).toEqual([]);
    expect(data.baselineSaved).toBe(false);
    expect(existsSync(join(tempDir, ".mktg"))).toBe(false);
  });

  test("schema for brand diff documents the baseline fields", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "schema", "brand", "diff", "--json"], {
      cwd: PROJECT_ROOT, stdout: "pipe", stderr: "pipe", env: { ...process.env, HOME: tempDir },
    });
    const schema = JSON.parse(await new Response(proc.stdout).text()) as { description: string; output: Record<string, string> };
    expect(schema.description).toContain("new baseline");
    expect(Object.keys(schema.output).sort()).toEqual(["baselineSaved", "baselineTimestamp", "changes", "hasChanges"]);
  });
});
