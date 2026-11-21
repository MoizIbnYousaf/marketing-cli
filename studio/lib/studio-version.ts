import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * The version a user has. Studio ships inside the marketing-cli package
 * (<package>/studio), so that is <package>/package.json. studio/package.json
 * is only a fallback, for a standalone Studio checkout whose parent is not
 * marketing-cli. The launcher and /api/health both use this.
 */
export function studioVersion(studioDir: string): string {
  const candidates: Array<{ path: string; name?: string }> = [
    { path: join(studioDir, "..", "package.json"), name: "marketing-cli" },
    { path: join(studioDir, "package.json") },
  ]
  for (const { path, name } of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(path, "utf-8")) as { name?: unknown; version?: unknown }
      if (name && pkg.name !== name) continue
      if (typeof pkg.version === "string" && pkg.version.length > 0) return pkg.version
    } catch {
      // try the next candidate
    }
  }
  return "unknown"
}
