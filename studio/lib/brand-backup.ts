// lib/brand-backup.ts -- pre-reset safety net for brand/ files.
//
// H1-110 / A15 ship blocker: `POST /api/brand/reset?confirm=true` wiped
// every file in brand/ with no export, no undo window. Months of
// learnings.md gone on one click. Fix: before reset, atomically copy brand/
// to `.mktg/brand-backups/brand-<iso>/brand/` and return the path in the
// success response so users (and /cmo) can see the recovery artifact.
//
// Implementation notes:
//   * Uses Node's filesystem API only. No `zip`/`tar` executable is assumed.
//   * Copies to a temporary sibling then renames, so failed copies never
//     leave a final-looking partial backup.
//   * Writes under `.mktg/brand-backups/` -- already .gitignored via
//     the `.mktg/` entry.
//   * If brand/ is missing or empty, returns `{ skipped: true, ... }`
//     rather than erroring -- a first-time-user reset shouldn't fail
//     because there's nothing to back up yet.
//   * ISO timestamp uses a filename-safe format (no colons). Easy to
//     sort lexicographically in a directory listing.

import { cp, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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
  return now.toISOString().replace(/[:.]/g, "-");
}

async function backupStats(root: string): Promise<{ fileCount: number; sizeBytes: number }> {
  let fileCount = 0;
  let sizeBytes = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await backupStats(path);
      fileCount += nested.fileCount;
      sizeBytes += nested.sizeBytes;
    } else {
      fileCount += 1;
      sizeBytes += (await stat(path)).size;
    }
  }
  return { fileCount, sizeBytes };
}

/**
 * Copy a brand/ directory to `.mktg/brand-backups/brand-<iso>/brand` inside
 * `projectRoot`. Returns metadata about the artifact + a relative path
 * the UI can display.
 *
 * Signature accepts `projectRoot` so tests can run against a temp dir.
 */
export async function backupBrandDir(
  projectRoot: string = process.cwd(),
): Promise<BrandBackupResult> {
  // Go through brandRoot() so MKTG_BRAND_DIR (test harness) is honored --
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
  const filename = `brand-${backupTimestamp()}`;
  const absPath = join(backupDir, filename);
  const relPath = join(BACKUP_ROOT, filename);
  const temporaryPath = join(backupDir, `.${filename}.${randomUUID()}.tmp`);

  try {
    await mkdir(temporaryPath);
    await cp(brandDir, join(temporaryPath, "brand"), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    const metadata = await backupStats(join(temporaryPath, "brand"));
    await rename(temporaryPath, absPath);
    return {
      ok: true,
      skipped: false,
      backupPath: absPath,
      backupRelativePath: relPath,
      ...metadata,
    };
  } catch (e) {
    await rm(temporaryPath, { recursive: true, force: true }).catch(() => {});
    return {
      ok: false,
      error: `Could not copy brand backup: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
