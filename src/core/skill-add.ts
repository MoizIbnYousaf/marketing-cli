// mktg — External skill chaining: find, validate, and register external skills
// Extracted to keep src/commands/skill.ts under 300 lines.

import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import type { ExternalSkillEntry, SkillsManifest } from "../types";
import { findExternalSkill, readExternalSkills } from "./skills";
import { parseFrontmatter, detectTriggerConflicts, type TriggerConflict } from "./skill-lifecycle";

export type SkillAddResult = {
  readonly name: string;
  readonly mode: "chain" | "recreate";
  readonly source_path: string;
  readonly action: "added" | "exists" | "dry-run";
  readonly conflicts: readonly TriggerConflict[];
};

export type SkillAddError =
  | { readonly kind: "not-found"; readonly source: string }
  | { readonly kind: "no-skill-md"; readonly path: string }
  | { readonly kind: "no-frontmatter" }
  | { readonly kind: "input-error"; readonly message: string };

// Core logic for `mktg skill add <source>`.
// Returns either a result or a typed error — never throws.
export const addExternalSkill = async (opts: {
  source: string;
  cwd: string;
  dryRun: boolean;
  manifest: SkillsManifest;
}): Promise<SkillAddResult | SkillAddError> => {
  const { source, cwd, dryRun, manifest } = opts;

  // 1. Find the external skill
  const foundPath = await findExternalSkill(source);
  if (!foundPath) return { kind: "not-found", source };

  // 2. Read and parse frontmatter
  const skillMdPath = join(foundPath, "SKILL.md");
  let content: string;
  try {
    content = await readFile(skillMdPath, "utf-8");
  } catch {
    return { kind: "no-skill-md", path: skillMdPath };
  }

  const fm = parseFrontmatter(content);
  if (!fm) return { kind: "no-frontmatter" };

  // 3. Check trigger conflicts
  const conflicts = detectTriggerConflicts(fm.triggers ?? [], manifest);

  // 4. Check if already registered
  const existingExternal = await readExternalSkills(cwd);
  if (existingExternal[fm.name]) {
    return { name: fm.name, mode: "chain", source_path: foundPath, action: "exists", conflicts };
  }

  // 5. Dry run — preview without writing
  if (dryRun) {
    return { name: fm.name, mode: "chain", source_path: foundPath, action: "dry-run", conflicts };
  }

  // 6. Read or create project manifest
  const projectManifestPath = join(cwd, "skills-manifest.json");
  let projectManifest: Record<string, unknown>;
  try {
    const raw = await readFile(projectManifestPath, "utf-8");
    projectManifest = JSON.parse(raw);
  } catch {
    projectManifest = { version: 1, skills: {}, redirects: {} };
  }

  // 7. Build entry and write
  const entry: ExternalSkillEntry = {
    name: fm.name,
    source_path: foundPath,
    chained_by: [],
    triggers: fm.triggers ?? [],
    env_vars: [],
    added: new Date().toISOString().slice(0, 10),
  };

  const externalSkills = (projectManifest.external_skills ?? {}) as Record<string, ExternalSkillEntry>;
  externalSkills[fm.name] = entry;
  projectManifest.external_skills = externalSkills;

  await mkdir(cwd, { recursive: true });
  await writeFile(projectManifestPath, JSON.stringify(projectManifest, null, 2) + "\n");

  return { name: fm.name, mode: "chain", source_path: foundPath, action: "added", conflicts };
};
