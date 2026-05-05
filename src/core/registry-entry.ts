// registry-entry.ts — generates an Ai-Agent-Skills skills.json entry
// for a single skill, derived from its SkillManifestEntry + SKILL.md frontmatter.
//
// Source of truth for field shapes: the existing "MoizIbnYousaf/marketing-cli"
// entries in the live Ai-Agent-Skills registry (verified 2026-05-04).
//
// IMPORTANT: Only entries with source === "MoizIbnYousaf/marketing-cli" are ever
// created or managed by propagate. Entries from anthropics/skills, openai/skills,
// etc. are NEVER touched.

import type { SkillManifestEntry, SkillLayer } from "../types";

// The canonical source string we own in the registry
export const REGISTRY_SOURCE = "MoizIbnYousaf/marketing-cli" as const;

// Shape of a single Ai-Agent-Skills registry entry (derived from live entries)
export type RegistryEntry = {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly workArea: string;
  readonly branch: string;
  readonly author: string;
  readonly source: string;
  readonly license: string;
  readonly tags: readonly string[];
  readonly featured: boolean;
  readonly verified: boolean;
  readonly origin: string;
  readonly trust: string;
  readonly syncMode: string;
  readonly sourceUrl: string;
  readonly whyHere: string;
  readonly vendored: boolean;
  readonly installSource: string;
  readonly tier: string;
  readonly distribution: string;
  readonly notes: string;
  readonly labels: readonly string[];
};

// All marketing-cli sourced skills map to workArea: "marketing".
// The Ai-Agent-Skills registry's canonical workArea IDs are: frontend, backend,
// mobile, workflow, agent-engineering, marketing. Sub-categories live in `branch`
// instead. The registry's validator (lib/catalog-mutations.cjs) rejects any
// other workArea value. Verified against `.workAreas[]` in skills.json.
const layerToWorkArea = (_layer: SkillLayer): string => "marketing";

// Map manifest category → branch string (matches live registry convention).
// Live entries use Title Case of the canonical category name.
const categoryToBranch = (category: string): string => {
  const branchMap: Record<string, string> = {
    "foundation": "Foundation",
    "strategy": "Strategy",
    "copy-content": "Copy & Content",
    "distribution": "Distribution",
    "creative": "Creative",
    "conversion": "Conversion",
    "seo": "SEO",
    "growth": "Growth",
    "knowledge": "Knowledge",
  };
  return branchMap[category] ?? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Parse YAML frontmatter description from SKILL.md content.
// Returns empty string if not found.
export const parseSkillDescription = (skillMdContent: string): string => {
  const lines = skillMdContent.split("\n");
  let inFrontmatter = false;
  let inDescription = false;
  let descLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && line.trim() === "---") {
      // End of frontmatter
      break;
    }
    if (!inFrontmatter) continue;

    // Multi-line description: "description: |" or "description: >-"
    if (/^description:\s*[|>-]/.test(line)) {
      inDescription = true;
      continue;
    }
    // Inline description
    const inlineMatch = line.match(/^description:\s+"(.+)"$/) ??
                        line.match(/^description:\s+'(.+)'$/) ??
                        line.match(/^description:\s+(.+)$/);
    if (inlineMatch && !inDescription) {
      const val = (inlineMatch[1] ?? "").trim();
      if (val && val !== "|" && val !== ">-" && val !== ">") {
        return val;
      }
      if (val === "|" || val === ">-" || val === ">") {
        inDescription = true;
      }
      continue;
    }

    if (inDescription) {
      // Continuation line (must be indented)
      if (line.startsWith("  ")) {
        descLines.push(line.trim());
      } else {
        // No longer in description block
        break;
      }
    }
  }

  return descLines.join(" ").trim();
};

// Build a registry entry for a marketing-cli skill.
//
// If the skill has `upstream.primary` set, we still set source to
// REGISTRY_SOURCE because the skill is *installed* via marketing-cli.
// The installSource always points to marketing-cli regardless.
export const buildRegistryEntry = (
  slug: string,
  manifestEntry: SkillManifestEntry,
  description: string,
  today: string, // YYYY-MM-DD
): RegistryEntry => {
  const { category, layer, tier, triggers } = manifestEntry;

  // Tags: first 6 trigger phrases (matching live registry convention)
  const tags = triggers.slice(0, 6);

  const workArea = layerToWorkArea(layer);
  const branch = categoryToBranch(category);
  const sourceUrl = `https://github.com/MoizIbnYousaf/marketing-cli/tree/main/skills/${slug}`;
  const installSource = `MoizIbnYousaf/marketing-cli/skills/${slug}`;

  const whyHere = `Keeps ${slug} available from the upstream marketing-cli playbook without bundling a local copy into this library.`;

  return {
    name: slug,
    description,
    category: "business",
    workArea,
    branch,
    author: "MoizIbnYousaf",
    source: REGISTRY_SOURCE,
    license: "MIT",
    tags,
    featured: tier === "must-have",
    verified: false,
    origin: "curated",
    trust: "reviewed",
    syncMode: "live",
    sourceUrl,
    whyHere,
    vendored: false,
    installSource,
    tier: "upstream",
    distribution: "live",
    notes: "",
    labels: [],
  };
};
