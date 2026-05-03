// mktg — Shared path utilities
// Single source of truth for package root resolution.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the directory of the current module in a runtime-agnostic way.
// Bun exposes `import.meta.dir` directly; node exposes `import.meta.url` as
// a file:// URL that needs to be converted. Using the node form works under
// both runtimes, which is required for dist/cli.js (bun build --target node)
// to execute cleanly under plain node via `npm install -g mktg && mktg ...`.
const moduleDir = (): string => dirname(fileURLToPath(import.meta.url));

// Resolve the package root (where manifests and bundled skills live)
// In dev: src/core/ → go up 2 levels to project root
// In dist: dist/ → go up 1 level to project root
export const getPackageRoot = (): string => {
  const dir = moduleDir();
  if (dir.endsWith("/core") || dir.endsWith("/core/")) {
    return join(dir, "..", "..");
  }
  return join(dir, "..");
};
