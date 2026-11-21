import { lstatSync, realpathSync } from "node:fs"
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
  if (!realLocationInsideRoot(candidate, root)) {
    return { ok: false, message: "path resolves outside the project root through a symbolic link" }
  }

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
 * fine because both sides are resolved.
 */
function realLocationInsideRoot(candidate: string, root: string): boolean {
  try {
    const realRoot = realpathSync(root)
    let existing = candidate
    while (true) {
      try {
        lstatSync(existing)
        break
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false
        const parent = dirname(existing)
        if (parent === existing) return false
        existing = parent
      }
    }
    // Throws for a dangling symlink, which is refused too.
    const real = realpathSync(existing)
    return real === realRoot || real.startsWith(`${realRoot}${sep}`)
  } catch {
    return false
  }
}
