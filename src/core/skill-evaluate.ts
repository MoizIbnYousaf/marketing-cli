// mktg — Skill overlap evaluation and trigger conflict detection

import { parseFrontmatter, validateSkill, CATEGORY_TO_LAYER } from "./skill-frontmatter";
import { indexWriters } from "./skill-graph";
import type {
  SkillsManifest,
  SkillEvaluation,
  SkillOverlapEntry,
  SkillBrandOverlap,
} from "../types";

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
  const writerIndex = indexWriters(manifest);
  for (const readFile of fmReads) {
    for (const name of writerIndex.get(readFile) ?? []) {
      if (!wouldDependOn.includes(name)) wouldDependOn.push(name);
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

export type TriggerConflict = {
  readonly trigger: string;
  readonly existingSkill: string;
};

// Checks an external skill's triggers against all existing manifest skills.
// Returns overlapping triggers with the skill name that owns them.
// Conflicts are warnings, not errors.
export const detectTriggerConflicts = (
  triggers: readonly string[],
  manifest: SkillsManifest,
): readonly TriggerConflict[] => {
  const conflicts: TriggerConflict[] = [];
  for (const trigger of triggers) {
    for (const [name, entry] of Object.entries(manifest.skills)) {
      if (entry.triggers.some(et => triggerSimilarity(trigger, et))) {
        conflicts.push({ trigger, existingSkill: name });
        break; // One match per trigger is enough
      }
    }
  }
  return conflicts;
};
