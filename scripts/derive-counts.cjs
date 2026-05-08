#!/usr/bin/env node

// Single-source the skill count across every public surface.
//
// Source of truth: `skills-manifest.json`. The maintainer's mental model is
// "55 marketing skills + 1 orchestrator (cmo)" so we expose two numbers:
//
//   - marketingSkillCount = manifest.skills.length - 1 (excludes cmo)
//   - totalSkillCount     = manifest.skills.length
//
// Surfaces below get rewritten via JSON-field patches or anchored regex.
// Any string of the form "<digit>+ skills" or "<digit>+ marketing skills" in a
// targeted surface is rewritten to the canonical count.
//
// Wired as a prepack step BEFORE prepack-strip-workspaces.cjs (see
// package.json scripts.prepack). Idempotent — safe to run repeatedly.

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

const log = (message) => {
  if (process.env.MKTG_PREPACK_QUIET !== "1") {
    console.error(`[derive-counts] ${message}`);
  }
};

// ---------------------------------------------------------------------------
// Source of truth
// ---------------------------------------------------------------------------

const skillsManifestPath = path.join(REPO_ROOT, "skills-manifest.json");
const skillsManifest = JSON.parse(fs.readFileSync(skillsManifestPath, "utf-8"));
// skills-manifest.json shape: { version, redirects, skills: { <name>: {...} } }
// — the skills field is a keyed object, not an array.
const skillKeys =
  skillsManifest.skills && typeof skillsManifest.skills === "object"
    ? Object.keys(skillsManifest.skills)
    : null;
if (!skillKeys || skillKeys.length === 0) {
  console.error("[derive-counts] skills-manifest.json has no .skills entries — refusing to run.");
  process.exit(1);
}
if (!skillKeys.includes("cmo")) {
  console.error("[derive-counts] skills-manifest.json missing the `cmo` entry — refusing to run.");
  process.exit(1);
}
const totalSkillCount = skillKeys.length;
const marketingSkillCount = totalSkillCount - 1;

// Canonical strings derived from the counts.
const PLUGIN_DESCRIPTION = `Agent-native marketing playbook CLI: ${totalSkillCount} skills, 5 research/review agents, brand memory, and /cmo orchestration.`;
const PACKAGE_DESCRIPTION = `Agent-native marketing playbook: ${totalSkillCount} skills, 5 research agents, brand memory that compounds, plus a local Studio dashboard (beta). One install, then /cmo in Claude Code walks you through a 4-question setup wizard. CLI for the agent, Studio for the human.`;
const CODEX_LONG_DESCRIPTION = `Install one CLI and give your agent ${marketingSkillCount} marketing skills, 5 research/review agents, persistent brand memory, native publishing workflows, and a local marketing studio.`;

// ---------------------------------------------------------------------------
// JSON field patches
// ---------------------------------------------------------------------------

/** @type {Array<{file: string, patches: Array<{path: ReadonlyArray<string|number>, value: string}>}>} */
const JSON_PATCHES = [
  { file: "package.json",                    patches: [{ path: ["description"], value: PACKAGE_DESCRIPTION }] },
  { file: ".claude-plugin/plugin.json",      patches: [{ path: ["description"], value: PLUGIN_DESCRIPTION }] },
  { file: ".claude-plugin/marketplace.json", patches: [{ path: ["plugins", 0, "description"], value: PLUGIN_DESCRIPTION }] },
  { file: ".codex-plugin/plugin.json",       patches: [
    { path: ["description"], value: PLUGIN_DESCRIPTION },
    { path: ["interface", "longDescription"], value: CODEX_LONG_DESCRIPTION },
  ] },
  { file: "gemini-extension.json",           patches: [{ path: ["description"], value: PLUGIN_DESCRIPTION }] },
];

const setAt = (root, p, value) => {
  let cursor = root;
  for (let i = 0; i < p.length - 1; i++) {
    cursor = cursor[p[i]];
    if (cursor === null || typeof cursor !== "object") {
      throw new Error(`derive-counts: missing intermediate at ${p.slice(0, i + 1).join(".")}`);
    }
  }
  cursor[p[p.length - 1]] = value;
};

let touched = 0;

for (const { file, patches } of JSON_PATCHES) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    log(`skipping missing file: ${file}`);
    continue;
  }
  const before = fs.readFileSync(fullPath, "utf-8");
  const json = JSON.parse(before);
  for (const { path: p, value } of patches) setAt(json, p, value);
  const after = JSON.stringify(json, null, 2) + "\n";
  if (after !== before) {
    fs.writeFileSync(fullPath, after);
    log(`rewrote ${file}`);
    touched++;
  }
}

// ---------------------------------------------------------------------------
// Markdown / TS surface patches — anchored regex on count tokens.
//
// Pattern: any "(\d+)\s+(marketing\s+)?skills" inside a known surface gets
// rewritten to the canonical count. We do NOT do a global rewrite — a sweep
// would touch CHANGELOG.md (frozen historical claims) and skills/cmo/SKILL.md
// (anti-pattern callouts that already moved to 56 in commit 6af8ace). The
// surface list is explicit and small.
// ---------------------------------------------------------------------------

/** @type {Array<{file: string, replacements: Array<{pattern: RegExp, replacement: string}>}>} */
const TEXT_PATCHES = [
  {
    file: "studio/README.md",
    replacements: [
      { pattern: /(\d+)\s+marketing\s+skills/g, replacement: `${marketingSkillCount} marketing skills` },
      { pattern: /(\d+)\s+skills(\s+\+\s+studio launcher)/g, replacement: `${totalSkillCount} skills$2` },
    ],
  },
  {
    file: "studio/CLAUDE.md",
    replacements: [
      // "<n> marketing skills" → 55 marketing skills
      { pattern: /(\d+)\s+marketing\s+skills/g, replacement: `${marketingSkillCount} marketing skills` },
      // "<n> skills" (top-level total claim) → 56 skills.
      // Negative lookahead `(?![-\w)])` excludes:
      //   - "skills-manifest" (hyphenated identifiers)
      //   - "skills.json" (extensions/sentence-internal)
      //   - "skills)" — parenthesized sub-counts in section headers like
      //     "### Foundation (11 skills)" must NOT be rewritten; those are
      //     category-internal sub-totals, not the canonical total.
      { pattern: /\b(\d+)\s+skills(?![-\w)])/g, replacement: `${totalSkillCount} skills` },
    ],
  },
  {
    file: "studio/app/layout.tsx",
    replacements: [
      // The meta description is the only "<n> skills" string in this file.
      // Anchored to the surrounding "powered by /cmo" prose so we don't
      // accidentally rewrite an unrelated count.
      {
        pattern: /(powered by \/cmo[^"]*?)(\d+)(\s+skills)/g,
        replacement: `$1${totalSkillCount}$3`,
      },
    ],
  },
];

for (const { file, replacements } of TEXT_PATCHES) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    log(`skipping missing file: ${file}`);
    continue;
  }
  const before = fs.readFileSync(fullPath, "utf-8");
  let after = before;
  for (const { pattern, replacement } of replacements) {
    after = after.replace(pattern, replacement);
  }
  if (after !== before) {
    fs.writeFileSync(fullPath, after);
    log(`rewrote ${file}`);
    touched++;
  }
}

log(`done. counts: ${marketingSkillCount} marketing skills + 1 orchestrator = ${totalSkillCount} total. files touched: ${touched}.`);
