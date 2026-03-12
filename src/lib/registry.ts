// mktg — Skill registry
// Discovers, parses, and validates SKILL.md files from the skills/ directory.
// Provides typed metadata for every installed skill.

import { join, dirname, basename } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

// --- Types ---

export type SkillFrontmatter = {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly tier: string;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  readonly triggers: readonly string[];
  readonly allowedTools: readonly string[];
};

export type RegistryEntry = {
  readonly name: string;
  readonly frontmatter: SkillFrontmatter;
  readonly body: string;
  readonly path: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
};

export type RegistryResult = {
  readonly skills: readonly RegistryEntry[];
  readonly total: number;
  readonly valid: number;
  readonly invalid: number;
};

export type ValidationError = {
  readonly skill: string;
  readonly errors: readonly string[];
};

// --- Frontmatter extraction ---

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value ? [value] : [];
  return [];
};

const toString = (value: unknown, fallback: string): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

/**
 * Extract typed SkillFrontmatter from raw parsed frontmatter data.
 * Coerces values to expected types with sensible defaults.
 */
export const extractSkillFrontmatter = (
  data: Record<string, unknown>,
  fallbackName: string,
): SkillFrontmatter => ({
  name: toString(data["name"], fallbackName),
  description: toString(data["description"], ""),
  category: toString(data["category"], ""),
  tier: toString(data["tier"], ""),
  reads: toStringArray(data["reads"]),
  writes: toStringArray(data["writes"]),
  triggers: toStringArray(data["triggers"]),
  allowedTools: toStringArray(data["allowed-tools"]),
});

// --- Validation ---

const REQUIRED_FIELDS = ["name", "description"] as const;

/**
 * Validate that a skill's frontmatter contains all required fields
 * and has well-formed values.
 */
export const validateSkill = (frontmatter: SkillFrontmatter): readonly string[] => {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (frontmatter.name && !/^[a-z0-9-]+$/.test(frontmatter.name)) {
    errors.push(`Invalid skill name "${frontmatter.name}": must be lowercase alphanumeric with hyphens`);
  }

  return errors;
};

// --- Discovery ---

/**
 * Resolve the package root directory (where skills/ lives).
 */
const getPackageRoot = (): string => join(dirname(import.meta.dir), "..");

/**
 * Get the default skills directory path.
 */
export const getSkillsDir = (): string => join(getPackageRoot(), "skills");

/**
 * Discover all SKILL.md files in a directory.
 * Returns an array of absolute paths to SKILL.md files.
 */
export const discoverSkillFiles = async (skillsDir: string): Promise<string[]> => {
  const glob = new Bun.Glob("*/SKILL.md");
  const paths: string[] = [];

  for await (const match of glob.scan({ cwd: skillsDir, absolute: true })) {
    paths.push(match);
  }

  return paths.sort();
};

/**
 * Parse a single SKILL.md file into a RegistryEntry.
 */
export const parseSkillFile = async (skillPath: string): Promise<RegistryEntry> => {
  const raw = await Bun.file(skillPath).text();
  const { data, body } = parseFrontmatter(raw);
  const dirName = basename(dirname(skillPath));
  const frontmatter = extractSkillFrontmatter(data, dirName);
  const errors = validateSkill(frontmatter);

  return {
    name: frontmatter.name,
    frontmatter,
    body: body.trim(),
    path: skillPath,
    valid: errors.length === 0,
    errors,
  };
};

// --- Registry ---

/**
 * Build a complete skill registry by scanning a skills directory.
 * Discovers all SKILL.md files, parses frontmatter, and validates each skill.
 */
export const buildRegistry = async (skillsDir?: string): Promise<RegistryResult> => {
  const dir = skillsDir ?? getSkillsDir();
  const skillFiles = await discoverSkillFiles(dir);
  const skills = await Promise.all(skillFiles.map(parseSkillFile));

  return {
    skills,
    total: skills.length,
    valid: skills.filter((s) => s.valid).length,
    invalid: skills.filter((s) => !s.valid).length,
  };
};

/**
 * Look up a single skill by name from the registry.
 */
export const findSkill = (
  registry: RegistryResult,
  name: string,
): RegistryEntry | undefined =>
  registry.skills.find((s) => s.name === name);

/**
 * Group registry skills by category.
 */
export const groupByCategory = (
  registry: RegistryResult,
): Record<string, readonly RegistryEntry[]> => {
  const groups: Record<string, RegistryEntry[]> = {};

  for (const skill of registry.skills) {
    const cat = skill.frontmatter.category || "uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(skill);
  }

  return groups;
};

/**
 * Get all validation errors across the registry.
 */
export const getValidationErrors = (
  registry: RegistryResult,
): readonly ValidationError[] =>
  registry.skills
    .filter((s) => !s.valid)
    .map((s) => ({ skill: s.name, errors: s.errors }));
