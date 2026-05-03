// lib/brand-backup.ts — pre-reset safety net for brand/ files.
//
// H1-110 / A15 ship blocker: `POST /api/brand/reset?confirm=true` wiped
// every file in brand/ with no export, no undo window. Months of
// learnings.md gone on one click. Fix: before reset, zip brand/ to
// `.mktg/brand-backups/brand-<iso>.zip` and return the path in the
// success response so users (and /cmo) can see the recovery artifact.
//
// Implementation notes:
//   * Uses the system `zip` binary (macOS ships it; Linux too; Windows
//     via Git Bash / WSL). Bun has no built-in zip and pulling in a
//     deflate dep for one backup path is overkill.
//   * Writes under `.mktg/brand-backups/` — already .gitignored via
//     the `.mktg/` entry.
//   * If brand/ is missing or empty, returns `{ skipped: true, ... }`
//     rather than erroring — a first-time-user reset shouldn't fail
//     because there's nothing to back up yet.
//   * ISO timestamp uses a filename-safe format (no colons). Easy to
//     sort lexicographically in a directory listing.

import { mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { brandRoot } from "./brand-files.ts";

export type BrandBackupResult =
  | {
      ok: true;
      skipped: false;
      backupPath: string;
      backupRelativePath: string;
      fileCount: number;
      sizeBytes: number;
    }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

const BACKUP_ROOT = ".mktg/brand-backups";

/** ISO timestamp sanitized for use in filenames. */
function backupTimestamp(now = new Date()): string {
  return now.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

/**
 * Zip a brand/ directory to `.mktg/brand-backups/brand-<iso>.zip` inside
 * `projectRoot`. Returns metadata about the artifact + a relative path
 * the UI can display.
 *
 * Signature accepts `projectRoot` so tests can run against a temp dir.
 */
export async function backupBrandDir(
  projectRoot: string = process.cwd(),
): Promise<BrandBackupResult> {
  // Go through brandRoot() so MKTG_BRAND_DIR (test harness) is honored —
  // a reset during an E1 suite zips the TEMP brand/, not the dev's real
  // one (A30).
  const brandDir = brandRoot(projectRoot);
  if (!existsSync(brandDir)) {
    return { ok: true, skipped: true, reason: "brand/ does not exist yet" };
  }

  let entries: string[];
  try {
    entries = await readdir(brandDir);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read brand/: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (entries.length === 0) {
    return { ok: true, skipped: true, reason: "brand/ is empty" };
  }

  const backupDir = join(projectRoot, BACKUP_ROOT);
  try {
    await mkdir(backupDir, { recursive: true });
  } catch (e) {
    return {
      ok: false,
      error: `Could not create ${BACKUP_ROOT}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const filename = `brand-${backupTimestamp()}.zip`;
  const absPath = join(backupDir, filename);
  const relPath = join(BACKUP_ROOT, filename);

  // `zip -r -q <out> <name>` — the -q silences stdout; we only want the
  // exit code. Run from the brand dir's PARENT so the archive uses the
  // brand dir's basename as the entry prefix (`brand/<name>` typically,
  // or whatever the tail of MKTG_BRAND_DIR is when the test harness
  // redirects us).
  const zipCwd = dirname(brandDir);
  const zipEntry = basename(brandDir);
  const proc = Bun.spawn(["zip", "-r", "-q", absPath, zipEntry], {
    cwd: zipCwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    return {
      ok: false,
      error: `zip exited ${exitCode}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
    };
  }

  let sizeBytes = 0;
  try {
    const stat = await Bun.file(absPath).size;
    sizeBytes = stat;
  } catch {
    // non-fatal
  }

  return {
    ok: true,
    skipped: false,
    backupPath: absPath,
    backupRelativePath: relPath,
    fileCount: entries.length,
    sizeBytes,
  };
}
