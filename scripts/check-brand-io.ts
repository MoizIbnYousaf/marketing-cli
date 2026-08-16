#!/usr/bin/env bun
// mktg — Brand I/O drift checker.
//
// Compares each skill's SKILL.md frontmatter `reads:` / `writes:` against
// skills-manifest.json `reads` / `writes`.
//
// Convention: frontmatter uses `brand/x.md`; the manifest uses bare `x.md`.
// Frontmatter entries that are not brand files (marketing/..., docs/...,
// brand/cmo-preferences.md which is not in BRAND_FILES) are ignored.
// Skills whose frontmatter declares neither key are skipped (reported as
// "undeclared") — the manifest is then the only source of truth for them.
//
// Usage: bun scripts/check-brand-io.ts   (exit 1 on drift)
// The same comparison runs in tests/manifest-brand-io.test.ts.

import { join } from "node:path";
import { existsSync } from "node:fs";
import { BRAND_FILES } from "../src/types";
import type { SkillsManifest } from "../src/types";
import { parseFrontmatter } from "../src/core/skill-frontmatter";

export type BrandIoDrift = {
  readonly skill: string;
  readonly field: "reads" | "writes";
  readonly frontmatter: readonly string[];
  readonly manifest: readonly string[];
  readonly missingInManifest: readonly string[];
  readonly extraInManifest: readonly string[];
};

export type BrandIoReport = {
  readonly checked: readonly string[];
  readonly undeclared: readonly string[];
  readonly drift: readonly BrandIoDrift[];
};

const BRAND_SET = new Set<string>(BRAND_FILES);

/** `brand/x.md` → `x.md`; drops anything that is not a known brand file. */
export const normalizeBrandRefs = (refs: readonly string[] | undefined): string[] => {
  if (!refs) return [];
  const out = new Set<string>();
  for (const ref of refs) {
    const trimmed = ref.trim().replace(/^\.\//, "");
    const bare = trimmed.startsWith("brand/") ? trimmed.slice("brand/".length) : trimmed;
    if (bare.includes("/")) continue;
    // Bare `x.md` is tolerated here (convention says `brand/x.md`) so a
    // missing prefix cannot hide real drift.
    if (BRAND_SET.has(bare)) out.add(bare);
  }
  return [...out].sort();
};

const diff = (a: readonly string[], b: readonly string[]): string[] =>
  a.filter((x) => !b.includes(x)).sort();

export const checkBrandIo = async (root: string): Promise<BrandIoReport> => {
  const manifest: SkillsManifest = await Bun.file(join(root, "skills-manifest.json")).json();
  const checked: string[] = [];
  const undeclared: string[] = [];
  const drift: BrandIoDrift[] = [];

  for (const [name, entry] of Object.entries(manifest.skills)) {
    const skillPath = join(root, "skills", name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const text = await Bun.file(skillPath).text();
    const fm = parseFrontmatter(text);
    // `reads: []` parses as a string, not an array — detect the key by hand so
    // an explicit empty list still counts as declared.
    const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const declared = /^(reads|writes)\s*:/m.test(block);
    if (!fm || !declared) {
      undeclared.push(name);
      continue;
    }
    checked.push(name);
    for (const field of ["reads", "writes"] as const) {
      const fromFm = normalizeBrandRefs(fm[field]);
      const fromManifest = [...(entry[field] ?? [])].sort();
      const missingInManifest = diff(fromFm, fromManifest);
      const extraInManifest = diff(fromManifest, fromFm);
      if (missingInManifest.length === 0 && extraInManifest.length === 0) continue;
      drift.push({ skill: name, field, frontmatter: fromFm, manifest: fromManifest, missingInManifest, extraInManifest });
    }
  }
  return { checked, undeclared, drift };
};

export const formatBrandIoReport = (report: BrandIoReport): string => {
  const lines: string[] = [];
  lines.push(`checked ${report.checked.length} skills, ${report.undeclared.length} undeclared (no reads/writes frontmatter)`);
  if (report.undeclared.length > 0) lines.push(`  undeclared: ${report.undeclared.join(", ")}`);
  if (report.drift.length === 0) {
    lines.push("no drift");
    return lines.join("\n");
  }
  lines.push(`DRIFT (${report.drift.length}):`);
  for (const d of report.drift) {
    lines.push(`  ${d.skill}.${d.field}`);
    if (d.missingInManifest.length > 0) lines.push(`    + manifest missing: ${d.missingInManifest.join(", ")}`);
    if (d.extraInManifest.length > 0) lines.push(`    - manifest extra:   ${d.extraInManifest.join(", ")}`);
  }
  return lines.join("\n");
};

if (import.meta.main) {
  const root = join(import.meta.dir, "..");
  const report = await checkBrandIo(root);
  console.log(formatBrandIoReport(report));
  process.exit(report.drift.length === 0 ? 0 : 1);
}
