import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, type Stats } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

/**
 * Resolve the target marketing project root that the studio should operate on.
 *
 * Precedence:
 *   1. `MKTG_PROJECT_ROOT`
 *   2. provided default root
 */
export function resolveProjectRoot(defaultRoot: string = process.cwd()): string {
  const envRoot = process.env.MKTG_PROJECT_ROOT
  if (envRoot && envRoot.trim().length > 0) {
    return resolve(envRoot)
  }
  return resolve(defaultRoot)
}

export function resolveStudioDbPath(defaultRoot: string = process.cwd()): string {
  const envDb = process.env.MKTG_STUDIO_DB
  if (envDb && envDb.trim().length > 0) {
    return resolve(envDb)
  }
  return join(resolveProjectRoot(defaultRoot), "marketing.db")
}

export type ResolvedProjectPath =
  | { ok: true; root: string; abs: string; rel: string }
  | { ok: false; message: string }

/**
 * Resolve a possibly-relative project file path and verify it stays within the
 * resolved project root.
 */
export function resolveProjectPath(
  input: string,
  defaultRoot: string = process.cwd(),
): ResolvedProjectPath {
  if (!input || typeof input !== "string") {
    return { ok: false, message: "path is required" }
  }
  if (input.includes("\x00")) {
    return { ok: false, message: "path contains illegal characters" }
  }

  const root = resolveProjectRoot(defaultRoot)
  const candidate = input.startsWith("/") ? resolve(input) : resolve(root, input)

  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return { ok: false, message: "path escapes the project root" }
  }
  const refusal = realLocationRefusal(candidate, root)
  if (refusal) return { ok: false, message: refusal }

  return {
    ok: true,
    root,
    abs: candidate,
    rel: relative(root, candidate),
  }
}

/**
 * Follow symlinks: the deepest existing part of `candidate` (the file, or the
 * nearest existing parent for a path not yet written) must really live under
 * the real project root. A root reached through a symlink (/tmp on macOS) is
 * fine because both sides are resolved. Returns why the path is refused, or
 * null when it is inside.
 */
const SYMLINK_ESCAPE = "path resolves outside the project root through a symbolic link"
const UNRESOLVABLE = "path is too long or cannot be resolved"

function realLocationRefusal(candidate: string, root: string): string | null {
  let realRoot: string
  try {
    realRoot = realpathSync(root)
  } catch {
    return UNRESOLVABLE
  }
  let existing = candidate
  while (true) {
    try {
      lstatSync(existing)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return UNRESOLVABLE
      const parent = dirname(existing)
      if (parent === existing) return UNRESOLVABLE
      existing = parent
    }
  }
  let real: string
  try {
    real = realpathSync(existing)
  } catch (error) {
    // ENOENT here is a dangling symlink, which is refused as an escape.
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? SYMLINK_ESCAPE : UNRESOLVABLE
  }
  return real === realRoot || real.startsWith(`${realRoot}${sep}`) ? null : SYMLINK_ESCAPE
}

export type OpenedProjectFile =
  | { ok: true; fd: number; stat: Stats }
  | { ok: false; missing: boolean; message: string }

/**
 * Open a path that resolveProjectPath accepted, then confirm the file that was
 * opened is the one whose real location is inside the root. Checking before
 * opening alone loses a race with a process that swaps the path for a symlink
 * in between.
 *
 * Two checks, both after the open:
 *   - On Linux the kernel names the file a descriptor points at
 *     (/proc/self/fd/N), so that name must be under the real root. No later
 *     swap of the path can change it.
 *   - Everywhere, the path must realpath under the real root and that real
 *     path, examined WITHOUT following a final symlink (lstat), must be the
 *     same device and inode as the descriptor. Following the link here (stat)
 *     would let a path that was swapped back to the outside symlink match
 *     again.
 *
 * O_NONBLOCK keeps a FIFO from blocking the open. The caller reads through
 * `fd` and closes it.
 */
export function openProjectFile(abs: string, root: string): OpenedProjectFile {
  let fd: number
  try {
    fd = openSync(abs, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0))
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT"
    return { ok: false, missing, message: missing ? "file does not exist" : UNRESOLVABLE }
  }
  try {
    const opened = fstatSync(fd)
    const realRoot = realpathSync(root)
    const under = (path: string): boolean => path === realRoot || path.startsWith(`${realRoot}${sep}`)
    const named = process.platform === "linux" ? readlinkSync(`/proc/self/fd/${fd}`) : null
    const real = realpathSync(abs)
    const now = lstatSync(real)
    if ((named === null || under(named)) && under(real) && now.dev === opened.dev && now.ino === opened.ino) {
      return { ok: true, fd, stat: opened }
    }
  } catch {
    // fall through to the refusal
  }
  closeSync(fd)
  return { ok: false, missing: false, message: SYMLINK_ESCAPE }
}

