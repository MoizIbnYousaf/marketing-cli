// mirror-entry.ts — generates a mktg-site skills-manifest.json entry
// for a single skill: the canonical SkillManifestEntry fields plus
// `_changed_at` and `_first_seen` ISO timestamps resolved via `git log`.
//
// This is a pure-ish module: the only side effect is shelling out to git.
// No file writes happen here. See propagate.ts for orchestration.

import { spawnSync } from "node:child_process";
import type { SkillManifestEntry } from "../types";

// Mirror entry = canonical manifest entry + two ISO timestamp fields
export type MirrorEntry = SkillManifestEntry & {
  readonly _changed_at: string;
  readonly _first_seen: string;
};

// Run git and return stdout (empty string on failure)
const gitOut = (args: readonly string[], cwd: string): string => {
  const r = spawnSync("git", args as string[], { cwd, encoding: "utf-8", timeout: 15_000 });
  return r.status === 0 ? (r.stdout ?? "").trim() : "";
};

// Resolve git timestamps for a skill slug from the canonical checkout.
// Returns ISO strings (empty string if no git history exists for the path).
export const resolveGitTimestamps = (
  canonicalCwd: string,
  slug: string,
): { changed_at: string; first_seen: string } => {
  const path = `skills/${slug}/SKILL.md`;

  // Most recent commit touching this file
  const changed_at = gitOut(["log", "-1", "--format=%cI", "--", path], canonicalCwd);

  // Oldest commit where this file was added (--diff-filter=A = "Added")
  const first_seen = gitOut(
    ["log", "--diff-filter=A", "--reverse", "--format=%cI", "--", path],
    canonicalCwd,
  );

  return { changed_at, first_seen };
};

// Build the mirror entry from a canonical manifest entry + resolved timestamps.
// The mirror is exactly the canonical entry shape with two extra fields appended.
export const buildMirrorEntry = (
  canonicalEntry: SkillManifestEntry,
  timestamps: { changed_at: string; first_seen: string },
): MirrorEntry => {
  return {
    ...canonicalEntry,
    _changed_at: timestamps.changed_at,
    _first_seen: timestamps.first_seen,
  };
};
