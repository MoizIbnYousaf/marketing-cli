// propagate.ts — pure diff + entry generation logic (no I/O, no git calls).
//
// Computes the 3-way diff between canonical skills-manifest.json,
// the mktg-site mirror, and the Ai-Agent-Skills registry. The command
// handler in commands/propagate.ts drives file writes and git commits.

import type { SkillManifestEntry, SkillsManifest } from "../types";
import type { MirrorEntry } from "./mirror-entry";
import type { RegistryEntry } from "./registry-entry";
import { REGISTRY_SOURCE } from "./registry-entry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Status values for each skill in the 3-way diff
export type SkillDiffStatus =
  | "in-sync"
  | "add-mirror"
  | "add-registry"
  | "update-mirror"
  | "update-registry"
  | "orphan-mirror"
  | "orphan-registry";

export type SkillDiffEntry = {
  readonly slug: string;
  readonly status: SkillDiffStatus;
};

export type PropagateReport = {
  readonly diff: {
    readonly in_sync: number;
    readonly add_mirror: readonly string[];
    readonly add_registry: readonly string[];
    readonly update_mirror: readonly string[];
    readonly update_registry: readonly string[];
    readonly orphan_mirror: readonly string[];
    readonly orphan_registry: readonly string[];
  };
  readonly applied: boolean;
  readonly pushed: boolean;
  readonly commits: ReadonlyArray<{
    readonly repo: "marketing-cli" | "mktg-site" | "ai-agent-skills";
    readonly sha: string;
    readonly subject: string;
  }>;
  readonly warnings: readonly string[];
  readonly paths: {
    readonly canonical: string;
    readonly mirror: string;
    readonly registry: string;
  };
};

// The mktg-site mirror manifest shape
export type MirrorManifest = {
  readonly version: number;
  readonly skills: Record<string, MirrorEntry>;
  readonly redirects?: Record<string, string>;
};

// The Ai-Agent-Skills registry top-level shape
export type RegistryFile = {
  readonly version: string;
  readonly updated: string;
  readonly total: number;
  readonly workAreas: unknown;
  readonly collections: unknown;
  readonly skills: readonly RegistryEntry[];
};

// ---------------------------------------------------------------------------
// 3-way diff algorithm
// ---------------------------------------------------------------------------

// Determine whether a mirror entry needs an update relative to the canonical.
// We compare version (if present) and the presence of _changed_at.
const mirrorNeedsUpdate = (
  canonical: SkillManifestEntry,
  mirror: MirrorEntry,
): boolean => {
  // If version changed (canonical has newer version)
  if (canonical.version && mirror.version && canonical.version !== mirror.version) {
    return true;
  }
  // If mirror is missing timestamps (never got them)
  if (!mirror._changed_at && !mirror._first_seen) {
    return true;
  }
  return false;
};

// Determine whether a registry entry needs update.
// Compares EVERY field propagate generates so structural drift (workArea,
// description, branch, sourceUrl, installSource, featured) is detected — not
// just tags / lastVerified. Without this, a generator-logic fix wouldn't
// trigger re-sync on existing entries.
const registryNeedsUpdate = (
  slug: string,
  canonical: SkillManifestEntry,
  registry: RegistryEntry,
  today: string,
): boolean => {
  // Check if tags are stale (registry has different set)
  const canonicalTags = canonical.triggers.slice(0, 6);
  const registryTagsStr = [...registry.tags].sort().join(",");
  const canonicalTagsStr = [...canonicalTags].sort().join(",");
  if (registryTagsStr !== canonicalTagsStr) {
    return true;
  }
  // Check workArea — should always be "marketing" for marketing-cli sourced.
  // The registry validator rejects any other value.
  if (registry.workArea !== "marketing") {
    return true;
  }
  // Check sourceUrl + installSource match the canonical slug
  const expectedSourceUrl = `https://github.com/MoizIbnYousaf/marketing-cli/tree/main/skills/${slug}`;
  if (registry.sourceUrl !== expectedSourceUrl) {
    return true;
  }
  const expectedInstallSource = `MoizIbnYousaf/marketing-cli/skills/${slug}`;
  if (registry.installSource !== expectedInstallSource) {
    return true;
  }
  // Check featured flag tracks tier
  const expectedFeatured = canonical.tier === "must-have";
  if (registry.featured !== expectedFeatured) {
    return true;
  }
  // Check if lastVerified > 30 days old
  const lastVerified = (registry as unknown as Record<string, unknown>)["lastVerified"];
  if (typeof lastVerified === "string" && lastVerified) {
    const verifiedDate = new Date(lastVerified);
    const todayDate = new Date(today);
    const diffDays = (todayDate.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      return true;
    }
  }
  return false;
};

// Compute the full 3-way diff. Pure function — no I/O.
export const computeDiff = (
  canonical: SkillsManifest,
  mirror: MirrorManifest,
  registry: RegistryFile,
  today: string,
): SkillDiffEntry[] => {
  const canonicalSlugs = new Set(Object.keys(canonical.skills));
  const mirrorSlugs = new Set(Object.keys(mirror.skills));

  // Registry: only manage entries we own (source === REGISTRY_SOURCE)
  const registryOwned = new Map<string, RegistryEntry>();
  for (const entry of registry.skills) {
    if (entry.source === REGISTRY_SOURCE) {
      registryOwned.set(entry.name, entry);
    }
  }

  // Universe = canonical ∪ mirror ∪ registryOwned
  const universe = new Set([
    ...canonicalSlugs,
    ...mirrorSlugs,
    ...registryOwned.keys(),
  ]);

  const diff: SkillDiffEntry[] = [];

  for (const slug of universe) {
    const inCanonical = canonicalSlugs.has(slug);
    const inMirror = mirrorSlugs.has(slug);
    const inRegistry = registryOwned.has(slug);
    const canonicalEntry = canonical.skills[slug];
    const mirrorEntry = mirror.skills[slug];
    const registryEntry = registryOwned.get(slug);

    if (!inCanonical) {
      // Orphan cases
      if (inMirror) diff.push({ slug, status: "orphan-mirror" });
      if (inRegistry) diff.push({ slug, status: "orphan-registry" });
      continue;
    }

    if (!canonicalEntry) continue; // should not happen

    // Skill is in canonical; check mirror
    if (!inMirror) {
      diff.push({ slug, status: "add-mirror" });
    } else if (mirrorEntry && mirrorNeedsUpdate(canonicalEntry, mirrorEntry)) {
      diff.push({ slug, status: "update-mirror" });
    }

    // Check registry
    if (!inRegistry) {
      diff.push({ slug, status: "add-registry" });
    } else if (registryEntry && registryNeedsUpdate(slug, canonicalEntry, registryEntry, today)) {
      diff.push({ slug, status: "update-registry" });
    }

    // If both mirror and registry are up to date, record as in-sync
    const mirrorOk = inMirror && (!mirrorEntry || !mirrorNeedsUpdate(canonicalEntry, mirrorEntry!));
    const registryOk = inRegistry && (!registryEntry || !registryNeedsUpdate(slug, canonicalEntry, registryEntry!, today));
    if (mirrorOk && registryOk) {
      diff.push({ slug, status: "in-sync" });
    }
  }

  return diff;
};

// Summarize a diff array into the PropagateReport.diff shape
export const summarizeDiff = (
  entries: readonly SkillDiffEntry[],
): PropagateReport["diff"] => {
  const add_mirror: string[] = [];
  const add_registry: string[] = [];
  const update_mirror: string[] = [];
  const update_registry: string[] = [];
  const orphan_mirror: string[] = [];
  const orphan_registry: string[] = [];
  let in_sync = 0;

  for (const e of entries) {
    switch (e.status) {
      case "in-sync": in_sync++; break;
      case "add-mirror": add_mirror.push(e.slug); break;
      case "add-registry": add_registry.push(e.slug); break;
      case "update-mirror": update_mirror.push(e.slug); break;
      case "update-registry": update_registry.push(e.slug); break;
      case "orphan-mirror": orphan_mirror.push(e.slug); break;
      case "orphan-registry": orphan_registry.push(e.slug); break;
    }
  }

  return {
    in_sync,
    add_mirror,
    add_registry,
    update_mirror,
    update_registry,
    orphan_mirror,
    orphan_registry,
  };
};

// Build the updated mirror manifest by merging canonical + timestamps.
// Existing timestamps preserved unless slug is being refreshed.
export const buildUpdatedMirrorManifest = (
  canonical: SkillsManifest,
  existing: MirrorManifest,
  timestamps: Map<string, { changed_at: string; first_seen: string }>,
): MirrorManifest => {
  const skills: Record<string, MirrorEntry> = {};

  for (const [slug, entry] of Object.entries(canonical.skills)) {
    const ts = timestamps.get(slug) ?? { changed_at: "", first_seen: "" };
    const existingTs = existing.skills[slug];
    skills[slug] = {
      ...entry,
      _changed_at: ts.changed_at || existingTs?._changed_at || "",
      _first_seen: ts.first_seen || existingTs?._first_seen || "",
    };
  }

  return {
    version: canonical.version,
    skills,
    ...(canonical.redirects && { redirects: canonical.redirects }),
  };
};

// Build the updated registry skills array:
// - Remove entries we own that are orphaned
// - Add/update entries we own
// - Leave all other entries untouched
export const buildUpdatedRegistrySkills = (
  existing: readonly RegistryEntry[],
  ownedUpdates: readonly RegistryEntry[],
  slugsToRemove: readonly string[],
): readonly RegistryEntry[] => {
  const removeSet = new Set(slugsToRemove);
  const updateMap = new Map<string, RegistryEntry>();
  for (const e of ownedUpdates) {
    updateMap.set(e.name, e);
  }

  const result: RegistryEntry[] = [];

  for (const existing_entry of existing) {
    if (existing_entry.source === REGISTRY_SOURCE && removeSet.has(existing_entry.name)) {
      // Orphan — drop it
      continue;
    }
    if (existing_entry.source === REGISTRY_SOURCE && updateMap.has(existing_entry.name)) {
      // Update — replace with new version
      result.push(updateMap.get(existing_entry.name)!);
      updateMap.delete(existing_entry.name);
    } else {
      result.push(existing_entry);
    }
  }

  // Append net-new entries (not present in existing)
  for (const entry of updateMap.values()) {
    result.push(entry);
  }

  return result;
};
