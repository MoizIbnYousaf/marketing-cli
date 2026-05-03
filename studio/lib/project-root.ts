import { join, relative, resolve, sep } from "node:path"

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

  return {
    ok: true,
    root,
    abs: candidate,
    rel: relative(root, candidate),
  }
}
