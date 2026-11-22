import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const LOCAL_CLI_ROOT = resolve(import.meta.dir, "..", "..");
// An empty config of our own, so Bun never reads the project's bunfig.toml.
const CHILD_BUNFIG = resolve(import.meta.dir, "..", "bin", "child-bunfig.toml");

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
  // applyEnvLocal, which refuses process-control keys. --config likewise
  // keeps the project's bunfig.toml (and its `preload`) out of the child.
  for (const root of roots) {
    const sourceEntry = join(root, "src", "cli.ts");
    if (existsSync(sourceEntry)) {
      return [process.execPath, "--no-env-file", `--config=${CHILD_BUNFIG}`, "run", sourceEntry, ...args];
    }

    const distEntry = join(root, "dist", "cli.js");
    if (existsSync(distEntry)) return [process.execPath, "--no-env-file", `--config=${CHILD_BUNFIG}`, distEntry, ...args];
  }

  return ["mktg", ...args];
}
