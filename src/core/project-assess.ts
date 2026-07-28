// Shared project/brand assessment for status, plan, and doctor.
// Single source for foundation order, skill mapping, health, and template detection.

import { join } from "node:path";
import {
  type BrandFile,
  type BrandFileStatus,
  BRAND_APPEND_FILES,
} from "../types";
import { getBrandStatus, isTemplateContent } from "./brand";

/** Foundation brand files — status next-action priority order (canonical). */
export const FOUNDATION_FILES: readonly BrandFile[] = [
  "voice-profile.md",
  "positioning.md",
  "audience.md",
  "competitors.md",
  "landscape.md",
];

/** Strategy + config files plan scans after foundation. */
export const PLAN_FOLLOWON_FILES: readonly BrandFile[] = [
  "keyword-plan.md",
  "creative-kit.md",
  "stack.md",
];

/** Brand file → skill name (no leading slash). Callers add "/" for display if needed. */
export const SKILL_FOR_BRAND_FILE: Readonly<Record<string, string>> = {
  "voice-profile.md": "brand-voice",
  "positioning.md": "positioning-angles",
  "audience.md": "audience-research",
  "competitors.md": "competitive-intel",
  "landscape.md": "landscape-scan",
  "keyword-plan.md": "keyword-research",
  "creative-kit.md": "creative",
  "stack.md": "cmo",
};

export const skillForFile = (file: string): string =>
  SKILL_FOR_BRAND_FILE[file] ?? "cmo";

export type BrandSummary = {
  readonly populated: number;
  readonly template: number;
  readonly missing: number;
  readonly stale: number;
};

export type AssessedBrandEntry = {
  readonly exists: boolean;
  readonly freshness: "current" | "stale" | "missing" | "template";
  readonly lines?: number;
  readonly ageDays?: number | null;
  readonly isTemplate?: boolean;
};

export type ProjectHealth = "ready" | "incomplete" | "needs-setup";

export type ProjectAssessment = {
  readonly projectName: string;
  readonly health: ProjectHealth;
  readonly brandStatuses: readonly BrandFileStatus[];
  readonly brand: Record<string, AssessedBrandEntry>;
  readonly brandSummary: BrandSummary;
  readonly foundationGaps: readonly BrandFile[];
  readonly templateFiles: readonly string[];
  readonly skillForFile: (file: string) => string;
};

export const getProjectName = async (cwd: string): Promise<string> => {
  try {
    const pkgPath = join(cwd, "package.json");
    const file = Bun.file(pkgPath);
    if (await file.exists()) {
      const pkg = await file.json();
      if (pkg.name) return pkg.name as string;
    }
  } catch {
    // Fall through
  }
  return cwd.split("/").pop() ?? "unknown";
};

export const assessHealth = (
  hasBrandDir: boolean,
  populated: number,
): ProjectHealth => {
  if (!hasBrandDir) return "needs-setup";
  return populated >= 3 ? "ready" : "incomplete";
};

const isAppendOnly = (file: string): boolean =>
  (BRAND_APPEND_FILES as readonly string[]).includes(file);

/**
 * Assess project brand readiness.
 * Template classification prefers getBrandStatus freshness === "template".
 * Append-only files always report freshness "current" from getBrandStatus even
 * when still scaffold content — those need a content check (status also needs
 * a content read for `lines`, so we reuse that read).
 */
export const assessProject = async (
  cwd: string,
  options: { withLines?: boolean } = {},
): Promise<ProjectAssessment> => {
  const withLines = options.withLines ?? false;
  const [brandStatuses, projectName] = await Promise.all([
    getBrandStatus(cwd),
    getProjectName(cwd),
  ]);

  const hasBrandDir = brandStatuses.some((s) => s.exists);
  const brandEntries = await Promise.all(
    brandStatuses.map(async (status) => {
      if (!status.exists) {
        return [status.file, { exists: false, freshness: "missing" as const }] as const;
      }

      // Prefer freshness from getBrandStatus (already classified templates).
      let isTemplate = status.freshness === "template";
      let freshness = status.freshness;
      let lines: number | undefined;

      // Read content when: status needs line counts, or append-only may still
      // be scaffold (getBrandStatus never marks append-only as "template").
      const needsContent = withLines || (!isTemplate && isAppendOnly(status.file));
      if (needsContent) {
        try {
          const content = await Bun.file(join(cwd, "brand", status.file)).text();
          if (withLines) lines = content.split("\n").length;
          if (!isTemplate && isAppendOnly(status.file)) {
            isTemplate = isTemplateContent(status.file, content);
          }
        } catch {
          if (withLines) lines = 0;
        }
      }

      // Match status display: template content surfaces as freshness "template"
      // even for append-only files that getBrandStatus reports as "current".
      if (isTemplate) freshness = "template";

      return [
        status.file,
        {
          exists: true,
          freshness,
          ageDays: status.ageDays,
          isTemplate,
          ...(withLines ? { lines: lines ?? 0 } : {}),
        },
      ] as const;
    }),
  );

  const brand: Record<string, AssessedBrandEntry> = Object.fromEntries(brandEntries);
  const brandValues = Object.values(brand);
  const brandSummary: BrandSummary = {
    populated: brandValues.filter((b) => b.exists && !b.isTemplate).length,
    template: brandValues.filter((b) => b.exists && b.isTemplate).length,
    missing: brandValues.filter((b) => !b.exists).length,
    stale: brandValues.filter((b) => b.freshness === "stale").length,
  };

  const templateFiles = brandStatuses
    .filter((s) => brand[s.file]?.isTemplate)
    .map((s) => s.file);

  const foundationGaps = FOUNDATION_FILES.filter((file) => {
    const entry = brand[file];
    return !entry?.exists || entry.isTemplate === true;
  });

  return {
    projectName,
    health: assessHealth(hasBrandDir, brandSummary.populated),
    brandStatuses,
    brand,
    brandSummary,
    foundationGaps,
    templateFiles,
    skillForFile,
  };
};
