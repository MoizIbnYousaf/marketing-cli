// mktg — Skill registry, install, and integrity verification
// Reads skills-manifest.json, copies bundled skills to ~/.claude/skills/

import { join, dirname } from "node:path";
import { mkdir, chmod, stat } from "node:fs/promises";
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
  try {
    return await file.json() as SkillsManifest;
  } catch (e) {
    throw new Error(`skills-manifest.json is corrupt at ${manifestPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
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

// Copy all files from a bundled skill directory to the install target
// Preserves directory structure and executable permissions
const copySkillDir = async (bundledDir: string, installDir: string): Promise<void> => {
  await mkdir(installDir, { recursive: true });
  const glob = new Bun.Glob("**/*");

  for await (const relPath of glob.scan(bundledDir)) {
    const src = join(bundledDir, relPath);
    const dest = join(installDir, relPath);
    await mkdir(dirname(dest), { recursive: true });
    const content = await Bun.file(src).arrayBuffer();
    await Bun.write(dest, content);

    // Preserve executable permissions (critical for scripts/)
    const srcStat = await stat(src);
    if (srcStat.mode & 0o111) {
      await chmod(dest, 0o755);
    }
  }
};

// Install all skills from the package to ~/.claude/skills/
export const installSkills = async (
  manifest: SkillsManifest,
  dryRun: boolean = false,
  cwd?: string,
): Promise<{ installed: string[]; skipped: string[]; failed: Array<{ name: string; reason: string }> }> => {
  const installed: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ name: string; reason: string }> = [];

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

    writes.push(
      (async () => {
        try {
          await copySkillDir(bundledDir, installDir);
          installed.push(name);
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e);
          failed.push({ name, reason });
        }
      })(),
    );
  }

  await Promise.all(writes);

  // Write installed versions to .mktg/skill-versions.json
  if (!dryRun && cwd && installed.length > 0) {
    const versions = await readSkillVersions(cwd);
    for (const name of installed) {
      const entry = manifest.skills[name];
      if (entry?.version) versions[name] = entry.version;
    }
    await writeSkillVersions(cwd, versions);
  }

  return { installed, skipped, failed };
};

// Check if any file in bundled skill directory differs from installed version
const hasSkillChanges = async (bundledDir: string, installedDir: string): Promise<boolean> => {
  const glob = new Bun.Glob("**/*");

  try {
    for await (const relPath of glob.scan(bundledDir)) {
      const bundledContent = await Bun.file(join(bundledDir, relPath)).arrayBuffer();
      const installedFile = Bun.file(join(installedDir, relPath));

      if (!(await installedFile.exists())) return true;
      const installedContent = await installedFile.arrayBuffer();

      // Compare byte-by-byte via views
      if (bundledContent.byteLength !== installedContent.byteLength) return true;
      const a = new Uint8Array(bundledContent);
      const b = new Uint8Array(installedContent);
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return true;
      }
    }
  } catch {
    // Bundled dir doesn't exist or can't be scanned — treat as unchanged
    return false;
  }

  return false;
};

// Update skills — re-copy bundled skills over installed ones
// Returns which skills were updated (content changed)
export const updateSkills = async (
  manifest: SkillsManifest,
  dryRun: boolean = false,
  cwd?: string,
): Promise<{ updated: string[]; unchanged: string[]; notBundled: string[]; versionChanges: Array<{ skill: string; from: string; to: string }> }> => {
  const updated: string[] = [];
  const unchanged: string[] = [];
  const notBundled: string[] = [];

  for (const name of getSkillNames(manifest)) {
    const bundledDir = getBundledSkillPath(name);
    const bundledSkillFile = join(bundledDir, "SKILL.md");

    const bundledExists = await Bun.file(bundledSkillFile).exists();
    if (!bundledExists) {
      notBundled.push(name);
      continue;
    }

    const installDir = join(SKILLS_INSTALL_DIR, name);
    const changed = await hasSkillChanges(bundledDir, installDir);

    if (!changed) {
      unchanged.push(name);
      continue;
    }

    updated.push(name);
    if (!dryRun) {
      await copySkillDir(bundledDir, installDir);
    }
  }

  // Track version changes
  const versionChanges: Array<{ skill: string; from: string; to: string }> = [];
  if (cwd) {
    const installedVersions = await readSkillVersions(cwd);
    for (const name of [...updated, ...unchanged]) {
      const manifestVersion = manifest.skills[name]?.version ?? "unknown";
      const installedVersion = installedVersions[name] ?? "unknown";
      if (manifestVersion !== installedVersion) {
        versionChanges.push({ skill: name, from: installedVersion, to: manifestVersion });
      }
    }
    // Write updated versions
    if (!dryRun && versionChanges.length > 0) {
      for (const change of versionChanges) {
        installedVersions[change.skill] = change.to;
      }
      await writeSkillVersions(cwd, installedVersions);
    }
  }

  return { updated, unchanged, notBundled, versionChanges };
};

// Get the skills install directory path
export const getSkillsInstallDir = (): string => SKILLS_INSTALL_DIR;

// --- Per-skill version tracking ---

type SkillVersionsFile = Record<string, string>; // { "brand-voice": "1.0.0" }

const MKTG_DIR = ".mktg";
const VERSIONS_FILE = "skill-versions.json";

export const readSkillVersions = async (cwd: string): Promise<SkillVersionsFile> => {
  const filePath = join(cwd, MKTG_DIR, VERSIONS_FILE);
  const file = Bun.file(filePath);
  if (!(await file.exists())) return {};
  try {
    return await file.json() as SkillVersionsFile;
  } catch {
    return {};
  }
};

export const writeSkillVersions = async (cwd: string, versions: SkillVersionsFile): Promise<void> => {
  const dirPath = join(cwd, MKTG_DIR);
  await mkdir(dirPath, { recursive: true });
  await Bun.write(join(dirPath, VERSIONS_FILE), JSON.stringify(versions, null, 2) + "\n");
};

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
