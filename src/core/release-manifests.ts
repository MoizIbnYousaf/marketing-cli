// Plugin manifest registry — shared by `mktg release` and `agent-packaging.test.ts`.
//
// Each plugin host (Claude Code marketplace, Claude Code plugin, Codex plugin,
// Gemini extension) ships its own version field. `mktg release` must keep them
// in lockstep with `package.json.version`; `agent-packaging.test.ts` enforces
// that lockstep on every `bun test`. Both surfaces import this file so a fifth
// plugin host gets a single-line addition, not two divergent edits.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type ManifestSpec = {
  readonly relativePath: string;
  /** Path into the JSON document where the version string lives. */
  readonly versionPath: readonly (string | number)[];
};

export const MANIFEST_SPECS: readonly ManifestSpec[] = [
  { relativePath: ".claude-plugin/plugin.json", versionPath: ["version"] },
  { relativePath: ".claude-plugin/marketplace.json", versionPath: ["plugins", 0, "version"] },
  { relativePath: ".codex-plugin/plugin.json", versionPath: ["version"] },
  { relativePath: "gemini-extension.json", versionPath: ["version"] },
] as const;

const getAt = (root: unknown, path: readonly (string | number)[]): unknown => {
  let cursor: unknown = root;
  for (const key of path) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string | number, unknown>)[key];
  }
  return cursor;
};

const setAt = (root: unknown, path: readonly (string | number)[], value: string): void => {
  if (path.length === 0) throw new Error("setAt: empty path");
  let cursor = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i] as string | number;
    const next = cursor[key];
    if (next === null || typeof next !== "object") {
      throw new Error(`setAt: missing intermediate at ${path.slice(0, i + 1).join(".")}`);
    }
    cursor = next as Record<string | number, unknown>;
  }
  const tail = path[path.length - 1] as string | number;
  cursor[tail] = value;
};

/**
 * Read the version string out of every registered plugin manifest. Throws if a
 * manifest is missing or malformed — release.ts and the packaging test treat a
 * missing manifest as a release-blocking failure.
 */
export const readManifestVersions = async (
  cwd: string,
): Promise<ReadonlyMap<string, string>> => {
  const out = new Map<string, string>();
  for (const spec of MANIFEST_SPECS) {
    const fullPath = join(cwd, spec.relativePath);
    const raw = await readFile(fullPath, "utf-8");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `${spec.relativePath} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    const version = getAt(json, spec.versionPath);
    if (typeof version !== "string") {
      throw new Error(
        `${spec.relativePath} has no string version at ${spec.versionPath.join(".")}`,
      );
    }
    out.set(spec.relativePath, version);
  }
  return out;
};

/**
 * Write `version` into every registered plugin manifest, preserving the
 * surrounding JSON shape and the project's `JSON.stringify(_, null, 2) + "\n"`
 * convention. Mirrors release.ts:269-270 for the package.json bump.
 */
export const applyManifestVersion = async (cwd: string, version: string): Promise<void> => {
  for (const spec of MANIFEST_SPECS) {
    const fullPath = join(cwd, spec.relativePath);
    const raw = await readFile(fullPath, "utf-8");
    const json = JSON.parse(raw) as Record<string | number, unknown>;
    setAt(json, spec.versionPath, version);
    await writeFile(fullPath, JSON.stringify(json, null, 2) + "\n");
  }
};
