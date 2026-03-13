// mktg — Shared path utilities
// Single source of truth for package root resolution.

import { join } from "node:path";

// Resolve the package root (where manifests and bundled skills live)
// In dev: src/core/ → go up 2 levels to project root
// In dist: dist/ → go up 1 level to project root
export const getPackageRoot = (): string => {
  const dir = import.meta.dir;
  if (dir.endsWith("/core") || dir.endsWith("/core/")) {
    return join(dir, "..", "..");
  }
  return join(dir, "..");
};
