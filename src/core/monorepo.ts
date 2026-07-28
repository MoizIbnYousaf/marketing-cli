// Resolve the mktgmono root that hosts marketing-cli (+ optional mktg-studio).
// Shared by verify + ship-check so filesystem discovery can't drift.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

/** Walk from this module to the monorepo root, or fall back to ~/projects/mktgmono. */
export const resolveMonorepoRoot = (fromUrl: string = import.meta.url): string => {
  // Runtime-agnostic module dir: Bun exposes `import.meta.dir` directly, but
  // the node-installed dist bundle only guarantees `import.meta.url`.
  const here = dirname(fileURLToPath(fromUrl));
  const cliRootCandidates = [resolve(here, "..", ".."), resolve(here, "..")];
  for (const marketingCliRoot of cliRootCandidates) {
    if (!existsSync(join(marketingCliRoot, "package.json")) || !existsSync(join(marketingCliRoot, "skills-manifest.json"))) {
      continue;
    }
    const candidate = resolve(marketingCliRoot, "..");
    if (existsSync(join(candidate, "marketing-cli"))) {
      return candidate;
    }
    return dirname(marketingCliRoot);
  }
  return join(homedir(), "projects", "mktgmono");
};
