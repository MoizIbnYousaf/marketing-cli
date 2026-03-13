// mktg — Skill registry, install, and integrity verification
// Reads skills-manifest.json, copies bundled skills to ~/.claude/skills/

import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import type { SkillsManifest, SkillManifestEntry } from "../types";
import { getPackageRoot } from "./paths";

// Where skills get installed for the agent
const SKILLS_INSTALL_DIR = join(homedir(), ".claude", "skills");

// Load the manifest from package root
export const loadManifest = async (): Promise<SkillsManifest> => {
  const manifestPath = join(getPackageRoot(), "skills-manifest.json");
  const file = Bun.file(manifestPath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`skills-manifest.json not found at ${manifestPath}`);
  }
  return file.json() as Promise<SkillsManifest>;
};

// Get all skill names from manifest
export const getSkillNames = (manifest: SkillsManifest): string[] =>
  Object.keys(manifest.skills);

// Get skill metadata by name (follows redirects)
export const getSkill = (
  manifest: SkillsManifest,
  name: string,
): { name: string; meta: SkillManifestEntry } | null => {
  // Check redirects first
  const resolved = manifest.redirects[name] ?? name;
  const meta = manifest.skills[resolved];
  if (!meta) return null;
  return { name: resolved, meta };
};

// List skills grouped by category
export const groupByCategory = (
  manifest: SkillsManifest,
): Record<string, Array<{ name: string; meta: SkillManifestEntry }>> => {
  const groups: Record<string, Array<{ name: string; meta: SkillManifestEntry }>> = {};

  for (const [name, meta] of Object.entries(manifest.skills)) {
    const cat = meta.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ name, meta });
  }

  return groups;
};

// Check which skills are installed
export const getInstallStatus = async (
  manifest: SkillsManifest,
): Promise<Record<string, { installed: boolean; path: string }>> => {
  const result: Record<string, { installed: boolean; path: string }> = {};

  for (const name of getSkillNames(manifest)) {
    const skillDir = join(SKILLS_INSTALL_DIR, name);
    const skillFile = join(skillDir, "SKILL.md");
    const exists = await Bun.file(skillFile).exists();
    result[name] = { installed: exists, path: skillDir };
  }

  return result;
};

// Find the bundled skill source (in the package's skills/ directory)
const getBundledSkillPath = (skillName: string): string =>
  join(getPackageRoot(), "skills", skillName);

// Install all skills from the package to ~/.claude/skills/
export const installSkills = async (
  manifest: SkillsManifest,
  dryRun: boolean = false,
): Promise<{ installed: string[]; skipped: string[]; failed: string[] }> => {
  const installed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  // Ensure install dir exists
  if (!dryRun) {
    await mkdir(SKILLS_INSTALL_DIR, { recursive: true });
  }

  const writes: Promise<void>[] = [];

  for (const name of getSkillNames(manifest)) {
    const bundledDir = getBundledSkillPath(name);
    const bundledSkillFile = join(bundledDir, "SKILL.md");
    const bundledFile = Bun.file(bundledSkillFile);

    const bundledExists = await bundledFile.exists();
    if (!bundledExists) {
      // Skill is in manifest but not bundled yet (phantom or pending)
      skipped.push(name);
      continue;
    }

    if (dryRun) {
      installed.push(name);
      continue;
    }

    const installDir = join(SKILLS_INSTALL_DIR, name);
    const installFile = join(installDir, "SKILL.md");

    writes.push(
      (async () => {
        try {
          await mkdir(installDir, { recursive: true });
          const content = await bundledFile.text();
          await Bun.write(installFile, content);

          // Copy references/ if they exist
          const refsDir = join(bundledDir, "references");
          const refsFile = Bun.file(refsDir);
          try {
            // Use glob to find reference files
            const glob = new Bun.Glob("**/*");
            const refInstallDir = join(installDir, "references");
            await mkdir(refInstallDir, { recursive: true });

            for await (const path of glob.scan(refsDir)) {
              const src = join(refsDir, path);
              const dest = join(refInstallDir, path);
              const destDir = dirname(dest);
              await mkdir(destDir, { recursive: true });
              const srcContent = await Bun.file(src).text();
              await Bun.write(dest, srcContent);
            }
          } catch {
            // No references dir — that's fine
          }

          installed.push(name);
        } catch (e) {
          failed.push(name);
        }
      })(),
    );
  }

  await Promise.all(writes);

  return { installed, skipped, failed };
};

// Update skills — re-copy bundled skills over installed ones
// Returns which skills were updated (content changed)
export const updateSkills = async (
  manifest: SkillsManifest,
  dryRun: boolean = false,
): Promise<{ updated: string[]; unchanged: string[]; notBundled: string[] }> => {
  const updated: string[] = [];
  const unchanged: string[] = [];
  const notBundled: string[] = [];

  for (const name of getSkillNames(manifest)) {
    const bundledPath = join(getBundledSkillPath(name), "SKILL.md");
    const installedPath = join(SKILLS_INSTALL_DIR, name, "SKILL.md");

    const bundledFile = Bun.file(bundledPath);
    const installedFile = Bun.file(installedPath);

    const bundledExists = await bundledFile.exists();
    if (!bundledExists) {
      notBundled.push(name);
      continue;
    }

    const installedExists = await installedFile.exists();
    const bundledContent = await bundledFile.text();

    if (installedExists) {
      const installedContent = await installedFile.text();
      if (bundledContent === installedContent) {
        unchanged.push(name);
        continue;
      }
    }

    updated.push(name);
    if (!dryRun) {
      const installDir = join(SKILLS_INSTALL_DIR, name);
      await mkdir(installDir, { recursive: true });
      await Bun.write(installedPath, bundledContent);
    }
  }

  return { updated, unchanged, notBundled };
};

// Get the skills install directory path
export const getSkillsInstallDir = (): string => SKILLS_INSTALL_DIR;

// --- Sync/convenience aliases used by list, status, update commands ---

// Synchronous manifest reader (reads from bundled JSON via import)
// The other commands use this as readManifest() without await
let _cachedManifest: SkillsManifest | null = null;

export const readManifest = (): SkillsManifest => {
  if (_cachedManifest) return _cachedManifest;
  // Bun supports sync require for JSON
  const manifestPath = join(getPackageRoot(), "skills-manifest.json");
  const raw = require(manifestPath) as SkillsManifest;
  _cachedManifest = raw;
  return raw;
};

// Get installed skills as array with name + hash (for update diffing)
type InstalledSkill = { name: string; hash: string | null };

export const getInstalledSkills = async (): Promise<InstalledSkill[]> => {
  const manifest = readManifest();
  const results: InstalledSkill[] = [];

  for (const name of getSkillNames(manifest)) {
    const skillFile = join(SKILLS_INSTALL_DIR, name, "SKILL.md");
    const file = Bun.file(skillFile);
    const exists = await file.exists();

    if (exists) {
      const content = await file.arrayBuffer();
      const hasher = new Bun.CryptoHasher("sha256");
      hasher.update(content);
      const hash = hasher.digest("hex");
      results.push({ name, hash });
    }
  }

  return results;
};

// --- Manifest resolution for project-level skill extensions ---

// Runtime validator for raw manifest data
export const parseManifest = (raw: unknown): SkillsManifest | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== "number") return null;
  if (!obj.skills || typeof obj.skills !== "object") return null;
  return {
    version: obj.version as number,
    skills: obj.skills as Record<string, SkillManifestEntry>,
    redirects: ((obj.redirects ?? {}) as Record<string, string>),
  };
};

// Merge a project manifest into the base package manifest
// SECURITY: project skills cannot override package skills
export const mergeManifests = (
  base: SkillsManifest,
  project: SkillsManifest,
): SkillsManifest => {
  const merged = { ...base.skills };
  for (const [name, entry] of Object.entries(project.skills)) {
    if (name in base.skills) continue; // SECURITY: project cannot override package skills
    merged[name] = entry;
  }
  return {
    version: base.version,
    skills: merged,
    redirects: base.redirects, // project redirects IGNORED
  };
};

// Resolve the effective manifest: package manifest + optional project manifest
export const resolveManifest = async (cwd: string): Promise<SkillsManifest> => {
  const packageManifest = await loadManifest();
  const projectManifestPath = join(cwd, "skills-manifest.json");
  const projectFile = Bun.file(projectManifestPath);
  if (!(await projectFile.exists())) return packageManifest;

  try {
    const raw = await projectFile.json();
    const projectManifest = parseManifest(raw);
    if (!projectManifest) return packageManifest;
    return mergeManifests(packageManifest, projectManifest);
  } catch {
    return packageManifest;
  }
};
