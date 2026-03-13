// mktg — Skill lifecycle: validation, graph, prerequisites, registration
// Extracted from skills.ts to keep files under 300 lines.

import { join } from "node:path";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isTemplateContent } from "./brand";
import { sandboxPath } from "./errors";
import { getPackageRoot } from "./paths";
import type {
  BrandFile,
  BRAND_FILES,
  SkillsManifest,
  SkillManifestEntry,
  SkillCategory,
  SkillLayer,
  SkillFrontmatter,
  ValidationCheck,
  ValidationResult,
  SkillGraph,
  SkillGraphNode,
  SkillGraphEdge,
  PrerequisiteStatus,
  SkillInfo,
  RegisterResult,
  SkillEvaluation,
  SkillOverlapEntry,
  SkillBrandOverlap,
} from "../types";

// Re-import BRAND_FILES value (not just the type)
import { BRAND_FILES as BRAND_FILE_LIST } from "../types";

// Valid categories and layers for validation
const VALID_CATEGORIES: readonly SkillCategory[] = [
  "foundation", "strategy", "copy-content", "distribution",
  "creative", "conversion", "seo", "growth", "knowledge",
];

const VALID_LAYERS: readonly SkillLayer[] = [
  "foundation", "strategy", "execution", "distribution",
];

const VALID_TIERS = ["must-have", "nice-to-have"] as const;

// --- Frontmatter parsing ---

export const parseFrontmatter = (content: string): SkillFrontmatter | null => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match || !match[1]) return null;
  const raw = match[1];

  const result: Record<string, string | string[]> = {};
  let currentKey = "";
  let currentValue = "";
  let inArray = false;
  const arrayValues: string[] = [];

  const flushKey = () => {
    if (currentKey) {
      if (inArray) {
        result[currentKey] = [...arrayValues];
        arrayValues.length = 0;
        inArray = false;
      } else {
        result[currentKey] = currentValue.trim();
      }
    }
  };

  for (const line of raw.split("\n")) {
    // Array item: "  - value"
    if (/^\s+-\s+/.test(line) && currentKey) {
      inArray = true;
      const arrVal = line.replace(/^\s+-\s+/, "").trim();
      const arrUnquoted = (arrVal.startsWith('"') && arrVal.endsWith('"')) || (arrVal.startsWith("'") && arrVal.endsWith("'"))
        ? arrVal.slice(1, -1)
        : arrVal;
      arrayValues.push(arrUnquoted);
      continue;
    }

    // Key-value pair: "key: value" or "key: >"
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      flushKey();
      currentKey = kvMatch[1]!;
      const val = kvMatch[2]!.trim();
      // Strip YAML quotes (single or double)
      const unquoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))
        ? val.slice(1, -1)
        : val;
      currentValue = unquoted === ">" ? "" : unquoted;
      inArray = false;
      continue;
    }

    // Continuation of multi-line value (indented)
    if (/^\s+\S/.test(line) && currentKey && !inArray) {
      currentValue += " " + line.trim();
    }
  }
  flushKey();

  if (!result.name || !result.description) return null;
  const name = result.name as string;
  const description = result.description as string;
  const category = typeof result.category === "string" ? result.category : undefined;
  const tier = typeof result.tier === "string" ? result.tier : undefined;
  const reads = Array.isArray(result.reads) ? result.reads : undefined;
  const writes = Array.isArray(result.writes) ? result.writes : undefined;
  const triggers = Array.isArray(result.triggers) ? result.triggers : undefined;
  return { name, description, category, tier, reads, writes, triggers };
};

// --- Validation ---

export const validateSkill = (
  content: string,
  manifest: SkillsManifest,
): ValidationResult => {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Platform layer: Claude Code spec
  const fm = parseFrontmatter(content);

  checks.push({
    rule: "frontmatter-present",
    pass: fm !== null,
    detail: fm ? "YAML frontmatter found" : "Missing --- delimited frontmatter",
  });
  if (!fm) {
    errors.push("No valid frontmatter found");
    return { valid: false, checks, errors, warnings };
  }

  // Name format: lowercase + hyphens, max 64 chars, no reserved prefixes
  const nameValid = /^[a-z][a-z0-9-]{0,63}$/.test(fm.name);
  const reservedPrefix = fm.name.startsWith("anthropic-") || fm.name.startsWith("claude-");
  checks.push({
    rule: "name-format",
    pass: nameValid && !reservedPrefix,
    detail: !nameValid
      ? "Name must be lowercase alphanumeric + hyphens, 1-64 chars"
      : reservedPrefix
      ? "Reserved prefix: anthropic-* and claude-* are not allowed"
      : `Name '${fm.name}' is valid`,
  });
  if (!nameValid) errors.push("Invalid skill name format");
  if (reservedPrefix) errors.push("Name uses reserved prefix");

  // Description present and under 1024 chars
  const descPresent = fm.description.length > 0;
  const descLength = fm.description.length <= 1024;
  checks.push({
    rule: "description-present",
    pass: descPresent && descLength,
    detail: !descPresent
      ? "Description is empty"
      : !descLength
      ? `Description is ${fm.description.length} chars (max 1024)`
      : "Description present and within limits",
  });
  if (!descPresent) errors.push("Description is empty");
  if (!descLength) errors.push("Description exceeds 1024 chars");

  // Line count warning
  const lineCount = content.split("\n").length;
  checks.push({
    rule: "line-count",
    pass: lineCount <= 500,
    detail: `${lineCount} lines${lineCount > 500 ? " (recommended max: 500)" : ""}`,
  });
  if (lineCount > 500) warnings.push(`Skill file is ${lineCount} lines (recommended max: 500)`);

  // mktg layer: category, tier, reads/writes, depends_on
  if (fm.category !== undefined) {
    const catValid = (VALID_CATEGORIES as readonly string[]).includes(fm.category);
    checks.push({
      rule: "category-valid",
      pass: catValid,
      detail: catValid ? `Category '${fm.category}' is valid` : `Unknown category '${fm.category}'`,
    });
    if (!catValid) errors.push(`Invalid category: ${fm.category}`);
  }

  if (fm.tier !== undefined) {
    const tierValid = (VALID_TIERS as readonly string[]).includes(fm.tier);
    checks.push({
      rule: "tier-valid",
      pass: tierValid,
      detail: tierValid ? `Tier '${fm.tier}' is valid` : `Non-standard tier '${fm.tier}' (expected: must-have, nice-to-have)`,
    });
    if (!tierValid) warnings.push(`Non-standard tier: ${fm.tier}`);
  }

  // Validate reads/writes — only brand file paths are checked (paths with / are project paths, allowed)
  if (fm.reads) {
    const brandReads = fm.reads
      .map(f => f.replace(/^brand\//, ""))
      .filter(f => !f.includes("/"));
    const allValid = brandReads.every(f => (BRAND_FILE_LIST as readonly string[]).includes(f));
    checks.push({
      rule: "reads-valid",
      pass: allValid,
      detail: allValid
        ? `All ${fm.reads.length} reads are valid`
        : `Unknown brand files in reads: ${brandReads.filter(f => !(BRAND_FILE_LIST as readonly string[]).includes(f)).join(", ")}`,
    });
    if (!allValid) {
      const invalid = brandReads.filter(f => !(BRAND_FILE_LIST as readonly string[]).includes(f));
      errors.push(`Unknown brand files in reads: ${invalid.join(", ")}`);
    }
  }

  if (fm.writes) {
    const brandWrites = fm.writes
      .map(f => f.replace(/^brand\//, ""))
      .filter(f => !f.includes("/"));
    const allValid = brandWrites.every(f => (BRAND_FILE_LIST as readonly string[]).includes(f));
    checks.push({
      rule: "writes-valid",
      pass: allValid,
      detail: allValid
        ? `All ${fm.writes.length} writes are valid`
        : `Unknown brand files in writes: ${brandWrites.filter(f => !(BRAND_FILE_LIST as readonly string[]).includes(f)).join(", ")}`,
    });
    if (!allValid) {
      const invalid = brandWrites.filter(f => !(BRAND_FILE_LIST as readonly string[]).includes(f));
      errors.push(`Unknown brand files in writes: ${invalid.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
};

// --- Dependency graph ---

export const buildGraph = (manifest: SkillsManifest): SkillGraph => {
  const skillNames = Object.keys(manifest.skills);
  const nodes: SkillGraphNode[] = [];
  const edges: SkillGraphEdge[] = [];
  const layerMap: Record<SkillLayer, string[]> = {
    foundation: [], strategy: [], execution: [], distribution: [],
  };
  const dependedOnBy: Record<string, string[]> = {};

  // Build nodes and edges
  for (const [name, entry] of Object.entries(manifest.skills)) {
    nodes.push({
      name,
      category: entry.category,
      layer: entry.layer,
      tier: entry.tier,
      dependsOn: [...entry.depends_on],
    });
    layerMap[entry.layer].push(name);

    for (const dep of entry.depends_on) {
      edges.push({ from: name, to: dep });
      if (!dependedOnBy[dep]) dependedOnBy[dep] = [];
      dependedOnBy[dep].push(name);
    }
  }

  // Find roots (no deps) and leaves (nothing depends on them)
  const roots = skillNames.filter(n => manifest.skills[n]!.depends_on.length === 0);
  const leaves = skillNames.filter(n => !dependedOnBy[n] || dependedOnBy[n]!.length === 0);

  // Topological sort (Kahn's algorithm) with cycle detection
  const inDegree: Record<string, number> = {};
  for (const name of skillNames) inDegree[name] = 0;
  for (const { from: _from, to } of edges) {
    if (to in inDegree) inDegree[to] = (inDegree[to] || 0);
    // from depends on to, so from has an incoming edge in dependency order
    // Actually: from depends on to means "to" must come first
    // In Kahn's: in-degree counts how many things depend on you being done first
    // edges: from → to means "from depends on to", so in topological order, to comes before from
  }

  // Recalculate: for topological sort where A depends on B means B comes first
  // in-degree[A] = number of dependencies A has
  for (const name of skillNames) inDegree[name] = manifest.skills[name]!.depends_on.length;

  const queue: string[] = skillNames.filter(n => inDegree[n] === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    // Find skills that depend on current
    const dependents = dependedOnBy[current] || [];
    for (const dep of dependents) {
      inDegree[dep] = (inDegree[dep] ?? 1) - 1;
      if (inDegree[dep] === 0) queue.push(dep);
    }
  }

  const hasCycles = order.length !== skillNames.length;

  return {
    nodes,
    edges,
    roots,
    leaves,
    layers: {
      foundation: layerMap.foundation,
      strategy: layerMap.strategy,
      execution: layerMap.execution,
      distribution: layerMap.distribution,
    },
    order,
    hasCycles,
  };
};

// --- Reverse dependency lookup ---

export const getReverseDeps = (
  skillName: string,
  manifest: SkillsManifest,
): readonly string[] => {
  const result: string[] = [];
  for (const [name, entry] of Object.entries(manifest.skills)) {
    if (entry.depends_on.includes(skillName)) result.push(name);
  }
  return result;
};

// --- Prerequisites check ---

export const checkPrerequisites = async (
  skillName: string,
  cwd: string,
  manifest: SkillsManifest,
): Promise<PrerequisiteStatus> => {
  const entry = manifest.skills[skillName];
  if (!entry) {
    return {
      satisfied: false,
      missing: { skills: [], brandFiles: [] },
      remediation: [`Skill '${skillName}' not found in manifest`],
    };
  }

  const missingSkills: string[] = [];
  const missingBrandFiles: BrandFile[] = [];
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

  // Check reads brand files exist and have real content (not template)
  const brandDir = join(cwd, "brand");
  for (const readFile of entry.reads) {
    const normalized = readFile.replace(/^brand\//, "") as BrandFile;
    if (!(BRAND_FILE_LIST as readonly string[]).includes(normalized)) continue;

    const filePath = join(brandDir, normalized);
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      missingBrandFiles.push(normalized);
      // Find which skill writes this file
      const writer = findSkillThatWrites(normalized, manifest);
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
        const writer = findSkillThatWrites(normalized, manifest);
        remediation.push(
          writer
            ? `Run /${writer} to populate ${normalized} (currently template)`
            : `Populate brand/${normalized} (currently template content)`,
        );
      }
    }
  }

  return {
    satisfied: missingSkills.length === 0 && missingBrandFiles.length === 0,
    missing: { skills: missingSkills, brandFiles: missingBrandFiles },
    remediation,
  };
};

// Find the first skill that writes a given brand file
const findSkillThatWrites = (
  brandFile: string,
  manifest: SkillsManifest,
): string | null => {
  for (const [name, entry] of Object.entries(manifest.skills)) {
    if (entry.writes.includes(brandFile)) return name;
  }
  return null;
};

// --- Skill info ---

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

// --- Category → Layer mapping ---

const CATEGORY_TO_LAYER: Record<string, SkillLayer> = {
  foundation: "foundation",
  strategy: "strategy",
  "copy-content": "execution",
  distribution: "distribution",
  creative: "execution",
  seo: "execution",
  conversion: "execution",
  growth: "execution",
  knowledge: "foundation",
};

// --- Register skill ---

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
  const inferredDeps: string[] = [];
  for (const readFile of normalizedReads) {
    for (const [name, entry] of Object.entries(manifest.skills)) {
      if (entry.writes.includes(readFile) && !inferredDeps.includes(name)) {
        inferredDeps.push(name);
      }
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

// --- Unregister skill ---

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

// --- Evaluate skill (overlap + novelty analysis) ---

export const tokenize = (s: string): Set<string> =>
  new Set(s.toLowerCase().trim().split(/[\s\-_]+/).filter(w => w.length > 0));

export const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export const triggerSimilarity = (a: string, b: string): boolean => {
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;
  return jaccardSimilarity(tokenize(a), tokenize(b)) >= 0.5;
};

export const evaluateSkill = (
  content: string,
  manifest: SkillsManifest,
): SkillEvaluation | { error: string } => {
  const fm = parseFrontmatter(content);
  if (!fm) return { error: "No valid frontmatter found" };

  const validation = validateSkill(content, manifest);
  const fmTriggers = fm.triggers ?? [];
  const fmReads = (fm.reads ?? []).map(f => f.replace(/^brand\//, ""));
  const fmWrites = (fm.writes ?? []).map(f => f.replace(/^brand\//, ""));

  // Trigger overlap — find which existing skills share triggers
  const triggerOverlaps: SkillOverlapEntry[] = [];
  for (const [name, entry] of Object.entries(manifest.skills)) {
    const shared = fmTriggers.filter(t =>
      entry.triggers.some(et => triggerSimilarity(t, et)),
    );
    if (shared.length > 0) {
      const triggerOverlap = shared.length / Math.max(fmTriggers.length, 1);
      const readsOverlap = fmReads.length > 0
        ? fmReads.filter(f => entry.reads.includes(f)).length / fmReads.length
        : 0;
      const writesOverlap = fmWrites.length > 0
        ? fmWrites.filter(f => entry.writes.includes(f)).length / fmWrites.length
        : 0;
      const compositeScore = Math.round((triggerOverlap * 0.4 + readsOverlap * 0.3 + writesOverlap * 0.3) * 100);

      triggerOverlaps.push({
        skill: name,
        sharedTriggers: shared,
        overlapPercent: Math.round(triggerOverlap * 100),
        compositeScore,
      });
    }
  }
  triggerOverlaps.sort((a, b) => b.overlapPercent - a.overlapPercent);

  // Brand file overlap — which existing skills read/write the same files
  const brandOverlaps: SkillBrandOverlap[] = [];
  for (const [name, entry] of Object.entries(manifest.skills)) {
    const sharedReads = fmReads.filter(f => entry.reads.includes(f));
    const sharedWrites = fmWrites.filter(f => entry.writes.includes(f));
    if (sharedReads.length > 0 || sharedWrites.length > 0) {
      brandOverlaps.push({ skill: name, sharedReads, sharedWrites });
    }
  }

  // Category match
  const categoryMatches = fm.category
    ? Object.entries(manifest.skills)
        .filter(([_, e]) => e.category === fm.category)
        .map(([n]) => n)
    : [];

  // Novelty — triggers no existing skill covers
  const allExistingTriggers = Object.values(manifest.skills).flatMap(e => e.triggers);
  const uniqueTriggers = fmTriggers.filter(
    t => !allExistingTriggers.some(et => triggerSimilarity(t, et)),
  );

  // Unique reads — brand files no existing skill reads
  const allExistingReads = new Set(Object.values(manifest.skills).flatMap(e => e.reads));
  const uniqueReads = fmReads.filter(f => !allExistingReads.has(f));

  // Graph position — where would this skill sit?
  const wouldDependOn: string[] = [];
  const wouldBeDepOf: string[] = [];

  // Skills that write files this skill reads → this skill would depend on them
  for (const readFile of fmReads) {
    for (const [name, entry] of Object.entries(manifest.skills)) {
      if (entry.writes.includes(readFile) && !wouldDependOn.includes(name)) {
        wouldDependOn.push(name);
      }
    }
  }

  // Skills that read files this skill writes → they would depend on this skill
  for (const writeFile of fmWrites) {
    for (const [name, entry] of Object.entries(manifest.skills)) {
      if (entry.reads.includes(writeFile) && !wouldBeDepOf.includes(name)) {
        wouldBeDepOf.push(name);
      }
    }
  }

  return {
    name: fm.name,
    description: fm.description,
    validation,
    overlap: {
      bySkill: triggerOverlaps,
      brandFiles: brandOverlaps,
      categoryMatches,
      highestOverlap: triggerOverlaps.length > 0 ? triggerOverlaps[0]!.overlapPercent : 0,
    },
    novelty: {
      uniqueTriggers,
      uniqueReads,
      coversNewCategory: fm.category ? categoryMatches.length === 0 : false,
    },
    graphPosition: {
      layer: CATEGORY_TO_LAYER[fm.category ?? ""] ?? "execution",
      wouldDependOn,
      wouldBeDepOf,
    },
  };
};
