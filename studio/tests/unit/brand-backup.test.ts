// tests/unit/brand-backup.test.ts — A15 / H1-110 regression guard.
//
// Proves that `backupBrandDir(projectRoot)`:
//   1. Creates `.mktg/brand-backups/brand-<iso>/` with the brand/ tree.
//   2. Reports the correct fileCount + sizeBytes.
//   3. Returns `{ skipped: true }` when brand/ is missing or empty —
//      a first-time-user reset shouldn't fail on nothing-to-back-up.
//   4. Rejects symlink escapes and replaces existing files during reset.
//
// Uses a fresh tmp dir per test so the suite is hermetic.

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupBrandDir, resetBrandDir } from "../../lib/brand-backup.ts";
import { BRAND_TEMPLATES } from "../../../src/core/brand.ts";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "mktg-a15-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function seedBrand(names: string[]): Promise<void> {
  const brandDir = join(tmp, "brand");
  await mkdir(brandDir, { recursive: true });
  for (const n of names) {
    await writeFile(
      join(brandDir, n),
      `# ${n}\nSample content for ${n} so size > 0.\n`,
      "utf8",
    );
  }
}

describe("backupBrandDir", () => {
  test("writes an atomic directory backup under .mktg/brand-backups/ and reports metadata", async () => {
    await seedBrand(["voice-profile.md", "audience.md", "learnings.md"]);

    const r = await backupBrandDir(tmp);

    expect(r.ok).toBe(true);
    if (!r.ok || r.skipped) throw new Error("expected non-skipped success");

    expect(r.fileCount).toBe(3);
    expect(r.sizeBytes).toBeGreaterThan(0);
    expect(r.backupPath).toMatch(
      /\.mktg\/brand-backups\/brand-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
    );
    expect(existsSync(r.backupPath)).toBe(true);
    expect(r.backupRelativePath.startsWith(".mktg/brand-backups/")).toBe(true);

    // Directory has exactly one file (the backup we just wrote).
    const dir = await readdir(join(tmp, ".mktg", "brand-backups"));
    expect(dir.length).toBe(1);
    expect(dir[0]).toMatch(/^brand-/);
  });

  test("produces a directly recoverable copy without requiring zip on PATH", async () => {
    await seedBrand(["voice-profile.md", "audience.md"]);
    const originalPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const r = await backupBrandDir(tmp);
      if (!r.ok || r.skipped) throw new Error("expected non-skipped success");
      expect(await readFile(join(r.backupPath, "brand", "voice-profile.md"), "utf8"))
        .toContain("Sample content for voice-profile.md");
      expect(await readFile(join(r.backupPath, "brand", "audience.md"), "utf8"))
        .toContain("Sample content for audience.md");
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    }
  });

  test("returns skipped when brand/ does not exist (first-time reset)", async () => {
    const r = await backupBrandDir(tmp);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.skipped).toBe(true);
  });

  test("returns skipped when brand/ exists but is empty", async () => {
    await mkdir(join(tmp, "brand"), { recursive: true });
    const r = await backupBrandDir(tmp);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.skipped).toBe(true);
    if (!r.skipped) throw new Error();
    expect(r.reason).toMatch(/empty/i);
  });

  test("honors MKTG_BRAND_DIR env var (A30 harness fidelity)", async () => {
    // Seed files at a location OUTSIDE the projectRoot passed to the
    // function, and point MKTG_BRAND_DIR at that remote dir. The
    // backup should zip the remote dir, not projectRoot/brand.
    const remoteBrand = await mkdtemp(join(tmpdir(), "mktg-a30-brand-"));
    await writeFile(
      join(remoteBrand, "voice-profile.md"),
      "# voice from temp\n",
      "utf8",
    );

    const originalEnv = process.env.MKTG_BRAND_DIR;
    process.env.MKTG_BRAND_DIR = remoteBrand;
    try {
      const r = await backupBrandDir(tmp);
      expect(r.ok).toBe(true);
      if (!r.ok || r.skipped) throw new Error("expected non-skipped success");
      expect(r.fileCount).toBe(1);

      expect(await readFile(join(r.backupPath, "brand", "voice-profile.md"), "utf8"))
        .toContain("voice from temp");
    } finally {
      if (originalEnv === undefined) delete process.env.MKTG_BRAND_DIR;
      else process.env.MKTG_BRAND_DIR = originalEnv;
      await rm(remoteBrand, { recursive: true, force: true });
    }
  });

  test("returns ok:false when the backup target is not writable", async () => {
    await seedBrand(["voice-profile.md"]);

    // Make .mktg/ a regular file so the subsequent mkdir for
    // .mktg/brand-backups/ fails. This is the realistic failure mode
    // users will hit on a misconfigured disk / permission issue, and
    // the one that should *definitely* abort the reset.
    await writeFile(join(tmp, ".mktg"), "not a directory", "utf8");

    const r = await backupBrandDir(tmp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error.length).toBeGreaterThan(0);
  });

  test("rejects a backup directory that resolves outside the project", async () => {
    await seedBrand(["voice-profile.md"]);
    const outside = await mkdtemp(join(tmpdir(), "mktg-backup-outside-"));
    await mkdir(join(tmp, ".mktg"));
    await symlink(outside, join(tmp, ".mktg", "brand-backups"));
    try {
      const r = await backupBrandDir(tmp);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected failure");
      expect(r.error).toMatch(/outside the project root/i);
      expect(await readdir(outside)).toEqual([]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  test("rejects symlinks inside brand rather than archiving external content", async () => {
    await seedBrand(["voice-profile.md"]);
    const outside = join(tmp, "outside-secret.txt");
    await writeFile(outside, "do not archive");
    await symlink(outside, join(tmp, "brand", "linked-secret.txt"));
    const r = await backupBrandDir(tmp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toMatch(/unsafe symlink/i);
  });
});

describe("resetBrandDir", () => {
  test("replaces existing content with canonical templates", async () => {
    await seedBrand(["voice-profile.md", "custom.md"]);
    const r = await resetBrandDir(tmp);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    expect(await readFile(join(tmp, "brand", "voice-profile.md"), "utf8"))
      .toBe(BRAND_TEMPLATES["voice-profile.md"]);
    expect(existsSync(join(tmp, "brand", "custom.md"))).toBe(false);
    expect(r.filesReset).toContain("SCHEMA.md");
    expect(r.filesReset).toContain("learnings.md");
  });
});
