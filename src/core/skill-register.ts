// mktg — Skill project-manifest registration

import { join } from "node:path";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { sandboxPath } from "./errors";
import { getPackageRoot } from "./paths";
import { parseFrontmatter, CATEGORY_TO_LAYER } from "./skill-frontmatter";
import { indexWriters } from "./skill-graph";
import type {
  SkillsManifest,
  SkillManifestEntry,
  SkillCategory,
  RegisterResult,
} from "../types";

export const registerSkill = async (
  skillPath: string,
  cwd: string,
  manifest: SkillsManifest,
): Promise<RegisterResult | { error: string }> => {
  // Resolve path: absolute paths are used directly, relative paths resolve against cwd
  let resolvedPath: string;
  if (skillPath.startsWith("/")) {
    // Absolute path — verify it's within cwd or HOME
    const { relative, isAbsolute: isAbs } = await import("node:path");
    const relToCwd = relative(cwd, skillPath);
    const relToHome = relative(homedir(), skillPath);
    if ((relToCwd.startsWith("..") || isAbs(relToCwd)) && (relToHome.startsWith("..") || isAbs(relToHome))) {
      return { error: "Path must be within project directory or home directory" };
    }
    resolvedPath = skillPath;
  } else {
    // Relative path — sandbox check
    const pathCheck = sandboxPath(cwd, skillPath);
    if (!pathCheck.ok) return { error: pathCheck.message };
    resolvedPath = pathCheck.path;
  }
  const skillMdPath = resolvedPath.endsWith("SKILL.md")
    ? resolvedPath
    : join(resolvedPath, "SKILL.md");

  // Check file size before reading (max 256KB)
  try {
    const fileStat = await stat(skillMdPath);
    if (fileStat.size > 256 * 1024) {
      return { error: "SKILL.md exceeds 256KB size limit" };
    }
  } catch {
    return { error: `File not found: ${skillMdPath}` };
  }

  const content = await readFile(skillMdPath, "utf-8");
  const fm = parseFrontmatter(content);
  if (!fm) return { error: "No valid frontmatter in SKILL.md" };

  // Check if already exists in package manifest (can't override)
  if (fm.name in manifest.skills) {
    const packageManifestPath = join(getPackageRoot(), "skills-manifest.json");
    return { name: fm.name, action: "exists", manifestPath: packageManifestPath };
  }

  // Infer layer from category
  const inferredLayer = CATEGORY_TO_LAYER[fm.category ?? ""] ?? "execution";

  // Infer depends_on from reads — skills that write files this skill reads
  const normalizedReads = (fm.reads ?? []).map(f => f.replace(/^brand\//, ""));
  const writerIndex = indexWriters(manifest);
  const inferredDeps: string[] = [];
  for (const readFile of normalizedReads) {
    for (const name of writerIndex.get(readFile) ?? []) {
      if (!inferredDeps.includes(name)) inferredDeps.push(name);
    }
  }

  // Build manifest entry from frontmatter
  const entry: SkillManifestEntry = {
    source: "new" as const,
    category: (fm.category as SkillCategory) ?? "knowledge",
    layer: inferredLayer,
    tier: (fm.tier as "must-have" | "nice-to-have") ?? "nice-to-have",
    reads: normalizedReads,
    writes: fm.writes?.map(f => f.replace(/^brand\//, "")) ?? [],
    depends_on: inferredDeps,
    triggers: fm.triggers ?? [],
    review_interval_days: 60,
  };

  // Read or create project manifest
  const projectManifestPath = join(cwd, "skills-manifest.json");
  let projectManifest: { version: number; skills: Record<string, SkillManifestEntry>; redirects: Record<string, string> };

  try {
    const raw = await readFile(projectManifestPath, "utf-8");
    projectManifest = JSON.parse(raw);
  } catch {
    projectManifest = { version: 1, skills: {}, redirects: {} };
  }

  // Add skill (additive only)
  projectManifest.skills[fm.name] = entry;

  // Write project manifest
  await mkdir(cwd, { recursive: true });
  await writeFile(projectManifestPath, JSON.stringify(projectManifest, null, 2) + "\n");

  return {
    name: fm.name,
    action: "created",
    manifestPath: projectManifestPath,
  };
};

export type UnregisterResult = {
  readonly name: string;
  readonly action: "removed";
  readonly manifestPath: string;
};

export const unregisterSkill = async (
  skillName: string,
  cwd: string,
  packageManifest: SkillsManifest,
): Promise<UnregisterResult | { error: string }> => {
  const projectManifestPath = join(cwd, "skills-manifest.json");

  // Read project manifest
  let projectManifest: { version: number; skills: Record<string, unknown>; redirects: Record<string, string> };
  try {
    const raw = await readFile(projectManifestPath, "utf-8");
    projectManifest = JSON.parse(raw);
  } catch {
    return { error: "No project manifest found (only project-registered skills can be unregistered)" };
  }

  // Cannot unregister package skills
  if (skillName in packageManifest.skills) {
    return { error: `Cannot unregister package skill '${skillName}' — only project-registered skills can be removed` };
  }

  if (!projectManifest.skills || !(skillName in projectManifest.skills)) {
    return { error: `Skill '${skillName}' not found in project manifest` };
  }

  delete projectManifest.skills[skillName];
  await writeFile(projectManifestPath, JSON.stringify(projectManifest, null, 2) + "\n");

  return { name: skillName, action: "removed", manifestPath: projectManifestPath };
};
