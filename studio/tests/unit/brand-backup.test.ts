// tests/unit/brand-backup.test.ts — A15 / H1-110 regression guard.
//
// Proves that `backupBrandDir(projectRoot)`:
//   1. Creates `.mktg/brand-backups/brand-<iso>.zip` with the brand/ tree
//      inside it.
//   2. Reports the correct fileCount + sizeBytes.
//   3. Returns `{ skipped: true }` when brand/ is missing or empty —
//      a first-time-user reset shouldn't fail on nothing-to-back-up.
//   4. Returns `{ ok: false, error }` when zip fails (simulated by a
//      non-existent PATH).
//
// Uses a fresh tmp dir per test so the suite is hermetic.

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupBrandDir } from "../../lib/brand-backup.ts";

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
  test("writes a .zip under .mktg/brand-backups/ and reports metadata", async () => {
    await seedBrand(["voice-profile.md", "audience.md", "learnings.md"]);

    const r = await backupBrandDir(tmp);

    expect(r.ok).toBe(true);
    if (!r.ok || r.skipped) throw new Error("expected non-skipped success");

    expect(r.fileCount).toBe(3);
    expect(r.sizeBytes).toBeGreaterThan(0);
    expect(r.backupPath).toMatch(
      /\.mktg\/brand-backups\/brand-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/,
    );
    expect(existsSync(r.backupPath)).toBe(true);
    expect(r.backupRelativePath.startsWith(".mktg/brand-backups/")).toBe(true);

    // Directory has exactly one file (the backup we just wrote).
    const dir = await readdir(join(tmp, ".mktg", "brand-backups"));
    expect(dir.length).toBe(1);
    expect(dir[0]).toMatch(/^brand-.*\.zip$/);
  });

  test("produces a backup that `unzip -l` can list with the original file names", async () => {
    await seedBrand(["voice-profile.md", "audience.md"]);
    const r = await backupBrandDir(tmp);
    if (!r.ok || r.skipped) throw new Error("expected non-skipped success");

    // Shell out to `unzip -l` (macOS + Linux standard) to prove the
    // archive is legit, not just a file we named .zip.
    const proc = Bun.spawn(["unzip", "-l", r.backupPath], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    const exit = await proc.exited;
    expect(exit).toBe(0);
    expect(out).toContain("brand/voice-profile.md");
    expect(out).toContain("brand/audience.md");
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

      // Archive should list the remote brand dir's basename, not
      // projectRoot/brand which doesn't even exist in this test.
      const proc = Bun.spawn(["unzip", "-l", r.backupPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const out = await new Response(proc.stdout).text();
      await proc.exited;
      expect(out).toContain("voice-profile.md");
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
});
