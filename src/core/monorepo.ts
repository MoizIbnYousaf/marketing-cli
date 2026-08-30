// Resolve the mktgmono root that hosts marketing-cli (+ optional mktg-studio).
// Shared by verify + ship-check so filesystem discovery can't drift.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

export interface RepositoryLayout {
  readonly ecosystemRoot: string;
  readonly cliRoot: string;
  readonly studioRoot: string;
}

/** Resolve both bundled and legacy sibling repository layouts. */
export const resolveRepositoryLayout = (fromUrl: string = import.meta.url): RepositoryLayout => {
  // Runtime-agnostic module dir: Bun exposes `import.meta.dir` directly, but
  // the node-installed dist bundle only guarantees `import.meta.url`.
  const here = dirname(fileURLToPath(fromUrl));
  const cliRootCandidates = [resolve(here, "..", ".."), resolve(here, "..")];
  for (const marketingCliRoot of cliRootCandidates) {
    if (!existsSync(join(marketingCliRoot, "package.json")) || !existsSync(join(marketingCliRoot, "skills-manifest.json"))) {
      continue;
    }
    const ecosystemRoot = dirname(marketingCliRoot);
    const bundledStudio = join(marketingCliRoot, "studio");
    return {
      ecosystemRoot,
      cliRoot: marketingCliRoot,
      studioRoot: existsSync(bundledStudio)
        ? bundledStudio
        : join(ecosystemRoot, "mktg-studio"),
    };
  }
  const ecosystemRoot = join(homedir(), "projects", "mktgmono");
  return {
    ecosystemRoot,
    cliRoot: join(ecosystemRoot, "marketing-cli"),
    studioRoot: join(ecosystemRoot, "mktg-studio"),
  };
};

/** Compatibility accessor for reports that expose the ecosystem root. */
export const resolveMonorepoRoot = (fromUrl: string = import.meta.url): string =>
  resolveRepositoryLayout(fromUrl).ecosystemRoot;
