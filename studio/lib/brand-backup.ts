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

import { cp, lstat, mkdir, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { brandRoot } from "./brand-files.ts";
import { scaffoldBrand } from "../../src/core/brand.ts";

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

async function rejectSymlinks(root: string): Promise<void> {
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${root}`);
  if (!rootInfo.isDirectory()) return;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${path}`);
    if (entry.isDirectory()) await rejectSymlinks(path);
  }
}

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

  try {
    await rejectSymlinks(brandDir);
  } catch (e) {
    return {
      ok: false,
      error: `Brand backup contains an unsafe symlink: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const backupDir = join(projectRoot, BACKUP_ROOT);
  try {
    await mkdir(backupDir, { recursive: true });
    const [canonicalProject, canonicalBackup] = await Promise.all([
      realpath(projectRoot),
      realpath(backupDir),
    ]);
    const backupRelative = relative(canonicalProject, canonicalBackup);
    if (backupRelative.startsWith("..") || isAbsolute(backupRelative)) {
      throw new Error(`${BACKUP_ROOT} resolves outside the project root`);
    }
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

export type BrandResetResult =
  | { ok: true; filesReset: string[] }
  | { ok: false; error: string };

/** Replace brand/ with a freshly scaffolded directory, restoring on swap failure. */
export async function resetBrandDir(
  projectRoot: string = process.cwd(),
): Promise<BrandResetResult> {
  const brandDir = brandRoot(projectRoot);
  const parent = dirname(brandDir);
  const id = randomUUID();
  const replacementRoot = join(parent, `.brand-reset-${id}.tmp`);
  const previousPath = join(parent, `.brand-previous-${id}.tmp`);
  let movedPrevious = false;

  try {
    await mkdir(parent, { recursive: true });
    await scaffoldBrand(replacementRoot);
    if (existsSync(brandDir)) {
      await rename(brandDir, previousPath);
      movedPrevious = true;
    }
    await rename(join(replacementRoot, "brand"), brandDir);
    await rm(previousPath, { recursive: true, force: true });
    movedPrevious = false;
    const filesReset = await readdir(brandDir);
    return { ok: true, filesReset: filesReset.sort() };
  } catch (e) {
    if (movedPrevious && !existsSync(brandDir)) {
      await rename(previousPath, brandDir).catch(() => {});
    }
    return {
      ok: false,
      error: `Could not reset brand/: ${e instanceof Error ? e.message : String(e)}`,
    };
  } finally {
    await rm(replacementRoot, { recursive: true, force: true }).catch(() => {});
    if (!movedPrevious) {
      await rm(previousPath, { recursive: true, force: true }).catch(() => {});
    }
  }
}
