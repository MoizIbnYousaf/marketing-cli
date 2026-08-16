// mktg — Skill registry, install, and integrity verification
// Reads skills-manifest.json, copies bundled skills to ~/.claude/skills/

import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { mkdir, chmod, stat } from "node:fs/promises";
import { homedir } from "node:os";
import type { SkillsManifest, SkillManifestEntry, ExternalSkillEntry } from "../types";
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

export const findAiAgentSkillsBinary = (): string | null => {
  const pathValue = process.env.PATH ?? "";
  for (const segment of pathValue.split(":")) {
    if (!segment) continue;
    const candidate = join(segment, "ai-agent-skills");
    try {
      const result = spawnSync(candidate, ["--version"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (result.status === 0) {
        return candidate;
      }
    } catch {
      // Keep scanning PATH.
    }
  }
  return null;
};

// Upper bound for the ai-agent-skills delegation (it sparse-clones from
// GitHub). Beyond this we surface a structured failure and fall back to the
// bundled direct install instead of hanging silently.
export const AI_AGENT_SKILLS_TIMEOUT_MS = 120_000;
const delegateTimeoutMs = (): number => {
  const raw = Number(process.env.MKTG_SKILL_INSTALL_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : AI_AGENT_SKILLS_TIMEOUT_MS;
};

export const installSkillsWithAiAgentSkills = async (
  manifest: SkillsManifest,
  dryRun: boolean = false,
): Promise<{ installed: string[]; skipped: string[]; failed: Array<{ name: string; reason: string }>; delegated: boolean; binary: string | null; upToDate: boolean }> => {
  // Delegation is OPT-IN (MKTG_USE_AI_AGENT_SKILLS=1). The bundled direct
  // install ships every manifest skill inside the npm tarball, finishes in
  // milliseconds, and is always version-correct. The ai-agent-skills path
  // sparse-clones the public registry from GitHub: 80s+ cold, and the
  // registry can lag this package by whole releases (observed: 53 vs 76
  // skills), silently installing a stale set. Keep it available for users
  // who deliberately manage skills through the registry toolchain.
  if (process.env.MKTG_USE_AI_AGENT_SKILLS !== "1") {
    return { installed: [], skipped: [], failed: [], delegated: false, binary: null, upToDate: false };
  }
  const binary = findAiAgentSkillsBinary();
  if (!binary) {
    return { installed: [], skipped: [], failed: [], delegated: false, binary: null, upToDate: false };
  }

  // Cheap idempotency: when every manifest skill is already present in the
  // install dir, skip the network-bound delegation entirely. Re-running
  // `mktg init` then costs a directory scan, not a GitHub sparse-clone.
  const status = await getInstallStatus(manifest);
  const names = getSkillNames(manifest);
  if (names.length > 0 && names.every((n) => status[n]?.installed)) {
    return { installed: names, skipped: [], failed: [], delegated: true, binary, upToDate: true };
  }

  const args = ["mktg"];
  if (dryRun) {
    args.push("--dry-run");
  }
  args.push("--format", "json");

  const result = spawnSync(binary, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    timeout: delegateTimeoutMs(),
    killSignal: "SIGKILL",
  });

  if (result.error && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return {
      installed: [],
      skipped: [],
      failed: [{ name: "_delegate", reason: `SKILL_INSTALL_TIMEOUT: ai-agent-skills did not finish within ${Math.round(delegateTimeoutMs() / 1000)}s` }],
      delegated: false,
      binary,
      upToDate: false,
    };
  }

  if (result.status !== 0) {
    const detail = (result.error?.message || result.stderr || result.stdout || `exit ${result.status ?? 1}`).trim();
    return {
      installed: [],
      skipped: [],
      failed: [{ name: "_delegate", reason: detail }],
      delegated: false,
      binary,
      upToDate: false,
    };
  }

  return {
    installed: names,
    skipped: [],
    failed: [],
    delegated: true,
    binary,
    upToDate: false,
  };
};

// --- External skill discovery ---

// Search for an external skill by name across known locations.
// Returns the directory path if found, null if not.
export const findExternalSkill = async (nameOrPath: string): Promise<string | null> => {
  const home = homedir();

  // If it looks like a path (contains /), try it directly
  if (nameOrPath.includes("/")) {
    const resolved = nameOrPath.startsWith("~")
      ? nameOrPath.replace("~", home)
      : nameOrPath;
    const skillMd = resolved.endsWith("SKILL.md") ? resolved : join(resolved, "SKILL.md");
    if (await Bun.file(skillMd).exists()) {
      return resolved.endsWith("SKILL.md") ? resolved.replace(/\/SKILL\.md$/, "") : resolved;
    }
    return null;
  }

  // Search locations in priority order
  const candidates = [
    join(home, ".claude", "skills", nameOrPath, "SKILL.md"),
  ];

  // Check direct skill path first
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) {
      return candidate.replace(/\/SKILL\.md$/, "");
    }
  }

  // Search plugins directories: ~/.claude/plugins/*/skills/<name>/SKILL.md
  const pluginsDir = join(home, ".claude", "plugins");
  try {
    const glob = new Bun.Glob(`*/skills/${nameOrPath}/SKILL.md`);
    for await (const match of glob.scan(pluginsDir)) {
      return join(pluginsDir, match).replace(/\/SKILL\.md$/, "");
    }
  } catch { /* plugins dir may not exist */ }

  // Search nested plugins: ~/.claude/plugins/*/plugins/*/skills/<name>/SKILL.md
  try {
    const glob = new Bun.Glob(`*/plugins/*/skills/${nameOrPath}/SKILL.md`);
    for await (const match of glob.scan(pluginsDir)) {
      return join(pluginsDir, match).replace(/\/SKILL\.md$/, "");
    }
  } catch { /* plugins dir may not exist */ }

  return null;
};

// --- External skills in project manifest ---

// Read external_skills from the project manifest
export const readExternalSkills = async (cwd: string): Promise<Record<string, ExternalSkillEntry>> => {
  const projectManifestPath = join(cwd, "skills-manifest.json");
  const file = Bun.file(projectManifestPath);
  if (!(await file.exists())) return {};
  try {
    const raw = await file.json() as Record<string, unknown>;
    return (raw.external_skills ?? {}) as Record<string, ExternalSkillEntry>;
  } catch {
    return {};
  }
};

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
  const base: SkillsManifest = {
    version: obj.version as number,
    skills: obj.skills as Record<string, SkillManifestEntry>,
    redirects: ((obj.redirects ?? {}) as Record<string, string>),
  };
  if (obj.external_skills && typeof obj.external_skills === "object") {
    return { ...base, external_skills: obj.external_skills as Record<string, ExternalSkillEntry> };
  }
  return base;
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

// Levenshtein edit distance — small, dependency-free; used only for
// "did you mean" hints on NOT_FOUND so agents can self-correct typos
// without a full `mktg list --json` round-trip.
const editDistance = (a: string, b: string): number => {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
};

/** Top-N closest skill names (by prefix/substring, then edit distance ≤ 3). */
export const suggestSkillNames = (manifest: SkillsManifest, query: string, limit = 3): string[] => {
  const q = query.toLowerCase();
  const scored = getSkillNames(manifest)
    .map((name) => {
      const n = name.toLowerCase();
      const d = n.startsWith(q) || n.includes(q) ? 0 : editDistance(q, n);
      return { name, d };
    })
    .filter((s) => s.d <= 3)
    .sort((a, b) => a.d - b.d || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => s.name);
};
