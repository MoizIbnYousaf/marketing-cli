import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const LOCAL_CLI_ROOT = resolve(import.meta.dir, "..", "..");

/**
 * Prefer the marketing-cli package that owns this bundled Studio instance.
 * Falling back to PATH preserves support for the legacy standalone Studio.
 */
export function resolveMktgCommand(args: readonly string[]): string[] {
  const roots = [process.env.MKTG_CLI_ROOT, LOCAL_CLI_ROOT].filter(
    (root): root is string => Boolean(root),
  );

  for (const root of roots) {
    const sourceEntry = join(root, "src", "cli.ts");
    if (existsSync(sourceEntry)) {
      return [process.execPath, "run", sourceEntry, ...args];
    }

    const distEntry = join(root, "dist", "cli.js");
    if (existsSync(distEntry)) return [process.execPath, distEntry, ...args];
  }

  return ["mktg", ...args];
}
