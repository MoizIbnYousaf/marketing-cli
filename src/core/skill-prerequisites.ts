// mktg — Skill prerequisites and info

import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isTemplateContent } from "./brand";
import { getPackageRoot } from "./paths";
import { loadCatalogManifest, computeConfiguredStatus } from "./catalogs";
import { toolAvailable, toolInstallHint } from "./tool-registry";
import { parseFrontmatter } from "./skill-frontmatter";
import { getReverseDeps, indexWriters } from "./skill-graph";
import type {
  BrandFile,
  SkillsManifest,
  PrerequisiteStatus,
  SkillInfo,
} from "../types";
import { BRAND_FILES as BRAND_FILE_LIST } from "../types";

export const checkPrerequisites = async (
  skillName: string,
  cwd: string,
  manifest: SkillsManifest,
): Promise<PrerequisiteStatus> => {
  const entry = manifest.skills[skillName];
  if (!entry) {
    return {
      satisfied: false,
      missing: { skills: [], brandFiles: [], envs: [], tools: [], catalogs: [] },
      remediation: [`Skill '${skillName}' not found in manifest`],
    };
  }

  const missingSkills: string[] = [];
  const missingBrandFiles: BrandFile[] = [];
  const missingEnvs: string[] = [];
  const missingTools: string[] = [];
  const missingCatalogs: string[] = [];
  const remediation: string[] = [];

  // Check depends_on skills are installed
  const skillsDir = join(homedir(), ".claude", "skills");
  for (const dep of entry.depends_on) {
    const depPath = join(skillsDir, dep, "SKILL.md");
    const exists = await Bun.file(depPath).exists();
    if (!exists) {
      missingSkills.push(dep);
      remediation.push(`Install skill '${dep}': mktg update`);
    }
  }

  // Check reads brand files exist and have real content (not template).
  // writerIndex is built once — findSkillThatWrites would otherwise rescan
  // every manifest entry for each missing file.
  const writerIndex = indexWriters(manifest);
  const brandDir = join(cwd, "brand");
  for (const readFile of entry.reads) {
    const normalized = readFile.replace(/^brand\//, "") as BrandFile;
    if (!(BRAND_FILE_LIST as readonly string[]).includes(normalized)) continue;

    const filePath = join(brandDir, normalized);
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      missingBrandFiles.push(normalized);
      const writer = writerIndex.get(normalized)?.[0] ?? null;
      remediation.push(
        writer
          ? `Run /${writer} to create ${normalized}`
          : `Create brand/${normalized} (no skill writes this file — create manually)`,
      );
    } else {
      // Check if it's still template content
      const content = await file.text();
      if (isTemplateContent(normalized, content)) {
        missingBrandFiles.push(normalized);
        const writer = writerIndex.get(normalized)?.[0] ?? null;
        remediation.push(
          writer
            ? `Run /${writer} to populate ${normalized} (currently template)`
            : `Populate brand/${normalized} (currently template content)`,
        );
      }
    }
  }

  // Catalogs that claim this skill (e.g. postiz → postiz skill) are loaded
  // first so env checks can honor documented base_env defaults (base_default)
  // instead of blocking on variables the runtime does not actually need.
  const catalogResult = await loadCatalogManifest();
  const claimingCatalogs = catalogResult.ok
    ? Object.values(catalogResult.manifest.catalogs).filter(c => c.skills.includes(skillName))
    : [];
  const defaultedEnvs = new Set(
    claimingCatalogs
      .filter(c => c.auth.base_default !== undefined)
      .map(c => c.auth.base_env),
  );

  // Check manifest-declared env vars (shared with doctor's integration checks)
  for (const envVar of entry.env_vars ?? []) {
    if (!process.env[envVar] && !missingEnvs.includes(envVar) && !defaultedEnvs.has(envVar)) {
      missingEnvs.push(envVar);
      remediation.push(`Set ${envVar} — mktg doctor shows integration status + signup links`);
    }
  }

  // Check manifest-declared CLI tools against the shared tool registry —
  // remediation strings are byte-identical to doctor's install hints.
  for (const tool of entry.tools ?? []) {
    if (!toolAvailable(tool) && !missingTools.includes(tool)) {
      missingTools.push(tool);
      const hint = toolInstallHint(tool);
      remediation.push(hint ? `Install ${tool}: ${hint}` : `Install ${tool} (see mktg doctor)`);
    }
  }

  // Check claiming catalogs' configured state. Env gaps merge into
  // missing.envs (deduped); the catalog itself is named so agents can route
  // to `mktg catalog info <name>`.
  for (const catalog of claimingCatalogs) {
    const status = computeConfiguredStatus(catalog);
    if (status.configured) continue;
    if (!missingCatalogs.includes(catalog.name)) missingCatalogs.push(catalog.name);
    for (const envVar of status.missingEnvs) {
      if (!missingEnvs.includes(envVar)) {
        missingEnvs.push(envVar);
        remediation.push(`Set ${envVar} for catalog '${catalog.name}' — mktg catalog info ${catalog.name} --json --fields missing_envs`);
      }
    }
  }

  return {
    satisfied:
      missingSkills.length === 0 &&
      missingBrandFiles.length === 0 &&
      missingEnvs.length === 0 &&
      missingTools.length === 0 &&
      missingCatalogs.length === 0,
    missing: { skills: missingSkills, brandFiles: missingBrandFiles, envs: missingEnvs, tools: missingTools, catalogs: missingCatalogs },
    remediation,
  };
};

export const getSkillInfo = async (
  skillName: string,
  manifest: SkillsManifest,
): Promise<SkillInfo | null> => {
  // Follow redirects
  const resolved = manifest.redirects[skillName] ?? skillName;
  const entry = manifest.skills[resolved];
  if (!entry) return null;

  // Read description from installed SKILL.md frontmatter
  let description = "";
  const skillPath = join(homedir(), ".claude", "skills", resolved, "SKILL.md");
  try {
    const content = await readFile(skillPath, "utf-8");
    const fm = parseFrontmatter(content);
    if (fm) description = fm.description;
  } catch {
    // Not installed or unreadable — try bundled
    try {
      const bundledPath = join(getPackageRoot(), "skills", resolved, "SKILL.md");
      const content = await readFile(bundledPath, "utf-8");
      const fm = parseFrontmatter(content);
      if (fm) description = fm.description;
    } catch {
      // No description available
    }
  }

  // Check installed status
  const installed = await Bun.file(skillPath).exists();

  return {
    name: resolved,
    description,
    category: entry.category,
    layer: entry.layer,
    tier: entry.tier,
    source: entry.source,
    reads: [...entry.reads],
    writes: [...entry.writes],
    dependsOn: [...entry.depends_on],
    dependedOnBy: getReverseDeps(resolved, manifest) as string[],
    triggers: [...entry.triggers],
    installed,
    reviewIntervalDays: entry.review_interval_days,
  };
};
