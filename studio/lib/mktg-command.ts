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

  // The child runs in the user's project. Bun would auto-load that project's
  // .env.local with no filtering; --no-env-file leaves it to the CLI's own
  // applyEnvLocal, which refuses process-control keys.
  for (const root of roots) {
    const sourceEntry = join(root, "src", "cli.ts");
    if (existsSync(sourceEntry)) {
      return [process.execPath, "--no-env-file", "run", sourceEntry, ...args];
    }

    const distEntry = join(root, "dist", "cli.js");
    if (existsSync(distEntry)) return [process.execPath, "--no-env-file", distEntry, ...args];
  }

  return ["mktg", ...args];
}
