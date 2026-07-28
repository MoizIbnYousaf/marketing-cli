// mktg — Skill frontmatter parsing and validation

import type {
  SkillsManifest,
  SkillCategory,
  SkillLayer,
  SkillFrontmatter,
  ValidationCheck,
  ValidationResult,
} from "../types";
import { BRAND_FILES as BRAND_FILE_LIST } from "../types";

const VALID_CATEGORIES: readonly SkillCategory[] = [
  "foundation", "strategy", "copy-content", "distribution",
  "creative", "conversion", "seo", "growth", "knowledge",
];

const VALID_LAYERS: readonly SkillLayer[] = [
  "foundation", "strategy", "execution", "distribution", "orchestrator",
];

const VALID_TIERS = ["must-have", "nice-to-have"] as const;

/** Category → layer inference used by register and evaluate. */
export const CATEGORY_TO_LAYER: Record<string, SkillLayer> = {
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
