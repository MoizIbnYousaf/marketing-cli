// mktg propagate — 3-way sync of canonical → mktg-site mirror → Ai-Agent-Skills registry
//
// Usage:
//   mktg propagate              alias for --check
//   mktg propagate --check      read-only 3-way diff (no writes, no commits)
//   mktg propagate --apply      write + commit locally (no push)
//   mktg propagate --apply --push         also push to all 3 remotes
//   mktg propagate --apply --push --confirm  skip "are you sure?" prompt
//   mktg propagate --resume     re-run after partial failure (idempotent)
//   mktg propagate --dry-run    show what apply would do without committing
//   mktg propagate --json       structured CommandResult<PropagateReport>
//   mktg propagate --fields ... field filtering

import { join, resolve } from "node:path";
import { readFile, writeFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import type { SkillsManifest } from "../types";
import { invalidArgs } from "../core/errors";
import {
  computeDiff,
  summarizeDiff,
  buildUpdatedMirrorManifest,
  buildUpdatedRegistrySkills,
  type PropagateReport,
  type MirrorManifest,
  type RegistryFile,
  type SkillDiffEntry,
} from "../core/propagate";
import { resolveGitTimestamps, buildMirrorEntry } from "../core/mirror-entry";
import {
  buildRegistryEntry,
  parseSkillDescription,
  REGISTRY_SOURCE,
  type RegistryEntry,
} from "../core/registry-entry";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const schema: CommandSchema = {
  name: "propagate",
  description:
    "3-way sync: keeps mktg-site/skills-manifest.json mirror and Ai-Agent-Skills/skills.json registry in sync with the canonical marketing-cli/skills-manifest.json",
  flags: [
    { name: "--check", type: "boolean", required: false, default: true, description: "Read-only 3-way diff (default mode)" },
    { name: "--apply", type: "boolean", required: false, default: false, description: "Write changes locally and commit (does not push)" },
    { name: "--push", type: "boolean", required: false, default: false, description: "After --apply commits, push to all 3 remotes" },
    { name: "--confirm", type: "boolean", required: false, default: false, description: "Skip the confirmation prompt for --apply/--push" },
    { name: "--resume", type: "boolean", required: false, default: false, description: "Re-run after partial failure (idempotent)" },
    { name: "--dry-run", type: "boolean", required: false, default: false, description: "Show what --apply would do without committing" },
    { name: "--strict", type: "boolean", required: false, default: false, description: "Abort if any repo is not on main branch" },
  ],
  output: {
    "diff.in_sync": "number — skills that are identical across all 3 repos",
    "diff.add_mirror": "string[] — skills to add to mktg-site mirror",
    "diff.add_registry": "string[] — skills to add to Ai-Agent-Skills registry",
    "diff.update_mirror": "string[] — skills to refresh in mktg-site mirror",
    "diff.update_registry": "string[] — skills to refresh in Ai-Agent-Skills registry",
    "diff.orphan_mirror": "string[] — mirror entries not in canonical (will be removed on --apply)",
    "diff.orphan_registry": "string[] — owned registry entries not in canonical (will be removed on --apply)",
    "applied": "boolean — whether --apply wrote and committed changes",
    "pushed": "boolean — whether --push succeeded on all 3 remotes",
    "commits": "Array<{repo, sha, subject}> — commits created (empty on --check/--dry-run)",
    "warnings": "string[] — non-fatal issues (branch mismatch, missing timestamps, etc.)",
    "paths.canonical": "string — resolved path to marketing-cli",
    "paths.mirror": "string — resolved path to mktg-site",
    "paths.registry": "string — resolved path to Ai-Agent-Skills",
  },
  examples: [
    { args: "mktg propagate --json", description: "Read-only diff showing what's out of sync" },
    { args: "mktg propagate --check --json", description: "Explicit read-only diff" },
    { args: "mktg propagate --apply --json", description: "Write + commit changes locally (prompts for confirmation)" },
    { args: "mktg propagate --apply --push --confirm --json", description: "Full sync including remote push, no prompt" },
    { args: "mktg propagate --dry-run --json", description: "Show what apply would do without writing" },
  ],
  vocabulary: ["propagate", "sync", "mirror", "registry", "drift", "3-way sync"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fileExists = async (p: string): Promise<boolean> => {
  try { await stat(p); return true; } catch { return false; }
};

const runCmd = (
  cmd: string,
  args: readonly string[],
  cwd: string,
  timeout = 30_000,
): { ok: boolean; stdout: string; stderr: string } => {
  const r = spawnSync(cmd, args as string[], { cwd, encoding: "utf-8", timeout });
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim(), stderr: (r.stderr ?? "").trim() };
};

// Resolve a sibling repo path via env var → sibling lookup → error
const resolveSiblingPath = (
  envVar: string,
  siblingRelative: string,
  canonicalCwd: string,
): string | null => {
  const fromEnv = process.env[envVar];
  if (fromEnv) return resolve(fromEnv);
  const sibling = resolve(canonicalCwd, siblingRelative);
  return sibling;
};

// Check that a path is a git repo with a clean working tree
const checkGitRepo = async (
  repoPath: string,
): Promise<{ ok: boolean; dirty: boolean; branch: string; error?: string }> => {
  if (!(await fileExists(join(repoPath, ".git")))) {
    return { ok: false, dirty: false, branch: "", error: `Not a git repo: ${repoPath}` };
  }
  const statusRes = runCmd("git", ["status", "--porcelain"], repoPath, 10_000);
  const dirty = statusRes.ok ? statusRes.stdout.trim() !== "" : false;
  const branchRes = runCmd("git", ["rev-parse", "--abbrev-ref", "HEAD"], repoPath, 10_000);
  const branch = branchRes.ok ? branchRes.stdout.trim() : "unknown";
  return { ok: true, dirty, branch };
};

// Get commit SHA for HEAD in a repo
const getHeadSha = (cwd: string): string => {
  const r = runCmd("git", ["rev-parse", "HEAD"], cwd, 10_000);
  return r.ok ? r.stdout.trim().slice(0, 12) : "";
};

// Write JSON file with consistent formatting (2-space indent, trailing newline)
const writeJson = async (path: string, data: unknown): Promise<void> => {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: CommandHandler<PropagateReport> = async (args, flags) => {
  const wantsApply = args.includes("--apply");
  const wantsPush = args.includes("--push");
  const wantsConfirm = args.includes("--confirm");
  const wantsResume = args.includes("--resume");
  const wantsStrict = args.includes("--strict");
  const isDryRun = flags.dryRun;
  // Agent invocation context: non-interactive, auto-confirm
  const isAgentMode = process.env.MKTG_AGENT_INVOCATION === "1" || !process.stdout.isTTY;

  // --push requires --apply
  if (wantsPush && !wantsApply) {
    return invalidArgs("--push requires --apply", [
      "mktg propagate --apply --push --json",
      "mktg propagate --check --json (read-only diff)",
    ]);
  }

  // ---------------------------------------------------------------------------
  // Path resolution
  // ---------------------------------------------------------------------------
  const canonicalPath = flags.cwd; // marketing-cli is always the CWD
  const mirrorPath = resolveSiblingPath("MKTG_SITE_PATH", "../mktg-site", canonicalPath) ?? "";
  const registryPath = resolveSiblingPath("AI_AGENT_SKILLS_PATH", "../../Ai-Agent-Skills", canonicalPath) ?? "";

  // Verify paths exist. --check is read-only and may run in environments
  // without sibling checkouts (CI, fresh clones); a missing sibling there
  // is "not configured", not an error. --apply and --push hard-fail because
  // they need real targets to write to.
  const writeMode = wantsApply || wantsPush;
  const missingSiblings: Array<{ label: string; path: string; envVar: string }> = [];

  for (const [label, p] of [["canonical (marketing-cli)", canonicalPath], ["mirror (mktg-site)", mirrorPath], ["registry (Ai-Agent-Skills)", registryPath]] as const) {
    if (!(await fileExists(p))) {
      if (label === "canonical (marketing-cli)") {
        // Canonical is always our CWD; if it's missing something is very wrong.
        return err("NOT_FOUND", `Repo not found: ${label} at ${p}`, [
          "Run from inside a marketing-cli checkout",
        ], 1);
      }
      const envVar = label === "mirror (mktg-site)" ? "MKTG_SITE_PATH" : "AI_AGENT_SKILLS_PATH";
      missingSiblings.push({ label, path: p, envVar });
      if (writeMode) {
        return err("NOT_FOUND", `Repo not found: ${label} at ${p}`, [
          `Set ${envVar} env var to override`,
          "Expected sibling layout: mktgmono/marketing-cli, mktgmono/mktg-site, Ai-Agent-Skills",
        ], 1);
      }
    }
  }

  // Read-only mode with missing siblings: return an empty diff with a warning
  // rather than failing. This keeps `mktg propagate --check` safe to run
  // anywhere (CI smoke tests, doctor health checks, fresh clones).
  if (!writeMode && missingSiblings.length > 0) {
    const report: PropagateReport = {
      diff: { in_sync: 0, add_mirror: [], add_registry: [], update_mirror: [], update_registry: [], orphan_mirror: [], orphan_registry: [] },
      applied: false,
      pushed: false,
      commits: [],
      warnings: missingSiblings.map((s) => `${s.label} not found at ${s.path} — set ${s.envVar} to enable diff (skipped in --check mode)`),
      paths: { canonical: canonicalPath, mirror: mirrorPath, registry: registryPath },
    };
    return ok(report);
  }

  // ---------------------------------------------------------------------------
  // Load manifests
  // ---------------------------------------------------------------------------
  const canonicalManifestPath = join(canonicalPath, "skills-manifest.json");
  const mirrorManifestPath = join(mirrorPath, "skills-manifest.json");
  const registryFilePath = join(registryPath, "skills.json");

  for (const p of [canonicalManifestPath, mirrorManifestPath, registryFilePath]) {
    if (!(await fileExists(p))) {
      if (!writeMode) {
        // Read-only: empty diff + warning rather than fail
        const report: PropagateReport = {
          diff: { in_sync: 0, add_mirror: [], add_registry: [], update_mirror: [], update_registry: [], orphan_mirror: [], orphan_registry: [] },
          applied: false,
          pushed: false,
          commits: [],
          warnings: [`Manifest not found: ${p} (skipped in --check mode)`],
          paths: { canonical: canonicalPath, mirror: mirrorPath, registry: registryPath },
        };
        return ok(report);
      }
      return err("NOT_FOUND", `Manifest not found: ${p}`, [], 1);
    }
  }

  let canonical: SkillsManifest;
  let mirror: MirrorManifest;
  let registry: RegistryFile;

  try {
    canonical = JSON.parse(await readFile(canonicalManifestPath, "utf-8")) as SkillsManifest;
    mirror = JSON.parse(await readFile(mirrorManifestPath, "utf-8")) as MirrorManifest;
    registry = JSON.parse(await readFile(registryFilePath, "utf-8")) as RegistryFile;
  } catch (e) {
    return err("INVALID_JSON", `Failed to parse manifest: ${e instanceof Error ? e.message : String(e)}`, [], 2);
  }

  if (!canonical.skills) {
    return err("INVALID_JSON", "Canonical manifest is missing 'skills' key", ["Verify skills-manifest.json is valid"], 2);
  }

  const today = new Date().toISOString().slice(0, 10);

  // ---------------------------------------------------------------------------
  // Pre-flight checks (only for --apply and --push)
  // ---------------------------------------------------------------------------
  const warnings: string[] = [];

  if (wantsApply || wantsPush) {
    for (const [label, repoPath] of [["marketing-cli", canonicalPath], ["mktg-site", mirrorPath], ["Ai-Agent-Skills", registryPath]] as [string, string][]) {
      const check = await checkGitRepo(repoPath);
      if (!check.ok) {
        return err("GIT_ERROR", check.error ?? `Git check failed for ${label}`, [], 2);
      }
      if (check.dirty) {
        return err("WORKING_TREE_DIRTY", `Working tree is dirty in ${label} (${repoPath})`, [
          `git -C ${repoPath} status`,
          "Commit or stash changes before running propagate --apply",
        ], 2);
      }
      if (check.branch !== "main") {
        const msg = `${label} is on branch '${check.branch}', not 'main'`;
        if (wantsStrict) {
          return err("WRONG_BRANCH", msg, [`git -C ${repoPath} checkout main`], 2);
        }
        warnings.push(msg);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Compute diff
  // ---------------------------------------------------------------------------
  const diffEntries = computeDiff(canonical, mirror, registry, today);
  const diffSummary = summarizeDiff(diffEntries);

  const totalChanges =
    diffSummary.add_mirror.length +
    diffSummary.add_registry.length +
    diffSummary.update_mirror.length +
    diffSummary.update_registry.length +
    diffSummary.orphan_mirror.length +
    diffSummary.orphan_registry.length;

  // ---------------------------------------------------------------------------
  // --check (read-only) or --dry-run
  // ---------------------------------------------------------------------------
  if (!wantsApply || isDryRun) {
    return ok({
      diff: diffSummary,
      applied: false,
      pushed: false,
      commits: [],
      warnings,
      paths: { canonical: canonicalPath, mirror: mirrorPath, registry: registryPath },
    });
  }

  // ---------------------------------------------------------------------------
  // --apply: confirmation guard
  // ---------------------------------------------------------------------------
  if (!wantsConfirm && !isAgentMode && !wantsResume) {
    // Print summary and ask for confirmation
    process.stderr.write(`\nPropagation diff:\n`);
    process.stderr.write(`  +${diffSummary.add_mirror.length} mirror additions, ~${diffSummary.update_mirror.length} updates, -${diffSummary.orphan_mirror.length} orphans\n`);
    process.stderr.write(`  +${diffSummary.add_registry.length} registry additions, ~${diffSummary.update_registry.length} updates, -${diffSummary.orphan_registry.length} orphans\n`);
    process.stderr.write(`\nAbout to write to:\n  ${mirrorPath}\n  ${registryPath}\n`);
    if (wantsPush) {
      process.stderr.write(`About to push to remotes on all 3 repos.\n`);
    }
    process.stderr.write(`\nProceed? [y/N] `);

    // Read single keypress
    let confirmed = false;
    try {
      const buf = Buffer.alloc(1);
      const fd = (await import("node:fs")).openSync("/dev/tty", "r");
      (await import("node:fs")).readSync(fd, buf, 0, 1, null);
      (await import("node:fs")).closeSync(fd);
      confirmed = buf.toString().toLowerCase() === "y";
    } catch {
      // Not a TTY or can't read — default deny
    }
    process.stderr.write("\n");

    if (!confirmed) {
      return err("CANCELLED", "Propagation cancelled by user", ["Run with --confirm to skip the prompt", "Run with --check to preview the diff"], 5);
    }
  }

  if (totalChanges === 0) {
    return ok({
      diff: diffSummary,
      applied: true,
      pushed: false,
      commits: [],
      warnings: [...warnings, "Nothing to do — all 3 repos are in sync"],
      paths: { canonical: canonicalPath, mirror: mirrorPath, registry: registryPath },
    });
  }

  // ---------------------------------------------------------------------------
  // Apply: update mirror manifest
  // ---------------------------------------------------------------------------
  const slugsNeedingMirrorUpdate = new Set([
    ...diffSummary.add_mirror,
    ...diffSummary.update_mirror,
  ]);

  // Resolve timestamps for skills that need updating
  const timestampMap = new Map<string, { changed_at: string; first_seen: string }>();
  for (const slug of slugsNeedingMirrorUpdate) {
    const ts = resolveGitTimestamps(canonicalPath, slug);
    timestampMap.set(slug, ts);
  }

  const updatedMirror = buildUpdatedMirrorManifest(canonical, mirror, timestampMap);

  // Remove orphans from mirror
  const mirrorWithoutOrphans: MirrorManifest = {
    ...updatedMirror,
    skills: Object.fromEntries(
      Object.entries(updatedMirror.skills).filter(
        ([slug]) => !diffSummary.orphan_mirror.includes(slug),
      ),
    ) as MirrorManifest["skills"],
  };

  await writeJson(mirrorManifestPath, mirrorWithoutOrphans);

  // ---------------------------------------------------------------------------
  // Apply: update registry
  // ---------------------------------------------------------------------------
  const slugsNeedingRegistryUpdate = new Set([
    ...diffSummary.add_registry,
    ...diffSummary.update_registry,
  ]);

  const registryUpdates: RegistryEntry[] = [];

  for (const slug of slugsNeedingRegistryUpdate) {
    const manifestEntry = canonical.skills[slug];
    if (!manifestEntry) continue;

    // Try to read SKILL.md for description
    let description = "";
    const skillMdPath = join(canonicalPath, "skills", slug, "SKILL.md");
    if (await fileExists(skillMdPath)) {
      const content = await readFile(skillMdPath, "utf-8");
      description = parseSkillDescription(content);
    }

    // Fallback description if SKILL.md parse fails
    if (!description) {
      description = `${slug} skill from the marketing-cli playbook.`;
      warnings.push(`Could not parse description from ${slug}/SKILL.md — using fallback`);
    }

    registryUpdates.push(buildRegistryEntry(slug, manifestEntry, description, today));
  }

  const updatedRegistrySkills = buildUpdatedRegistrySkills(
    registry.skills,
    registryUpdates,
    diffSummary.orphan_registry,
  );

  // Build the updated registry file, preserving top-level metadata
  const updatedRegistry: RegistryFile = {
    ...registry,
    updated: today,
    total: updatedRegistrySkills.length,
    skills: updatedRegistrySkills,
  };

  await writeJson(registryFilePath, updatedRegistry);

  // ---------------------------------------------------------------------------
  // Commit changes
  // ---------------------------------------------------------------------------
  const commits: Array<{ repo: "marketing-cli" | "mktg-site" | "ai-agent-skills"; sha: string; subject: string }> = [];
  const addN = diffSummary.add_mirror.length;
  const updateM = diffSummary.update_mirror.length;
  const removeK = diffSummary.orphan_mirror.length;

  // Commit to mktg-site
  const mirrorHasChanges = addN + updateM + removeK > 0;
  if (mirrorHasChanges) {
    const mirrorMsg = `chore(skills): sync mirror with marketing-cli — +${addN} added, ~${updateM} updated, -${removeK} orphaned`;
    runCmd("git", ["add", "skills-manifest.json"], mirrorPath);
    const mirrorCommit = runCmd("git", ["commit", "-m", mirrorMsg], mirrorPath, 30_000);
    if (mirrorCommit.ok) {
      commits.push({ repo: "mktg-site", sha: getHeadSha(mirrorPath), subject: mirrorMsg });
    } else {
      warnings.push(`mktg-site commit failed: ${mirrorCommit.stderr}`);
    }
  }

  // Commit to Ai-Agent-Skills
  const addRN = diffSummary.add_registry.length;
  const updateRM = diffSummary.update_registry.length;
  const removeRK = diffSummary.orphan_registry.length;
  const registryHasChanges = addRN + updateRM + removeRK > 0;

  if (registryHasChanges) {
    const registryMsg = `chore(skills): sync marketing-cli entries — +${addRN} added, ~${updateRM} updated, -${removeRK} removed`;
    runCmd("git", ["add", "skills.json"], registryPath);
    const registryCommit = runCmd("git", ["commit", "-m", registryMsg], registryPath, 30_000);
    if (registryCommit.ok) {
      commits.push({ repo: "ai-agent-skills", sha: getHeadSha(registryPath), subject: registryMsg });
    } else {
      warnings.push(`Ai-Agent-Skills commit failed: ${registryCommit.stderr}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Push (optional)
  // ---------------------------------------------------------------------------
  let pushed = false;
  if (wantsPush && commits.length > 0) {
    pushed = true;
    const repoPaths: Array<["mktg-site" | "ai-agent-skills", string]> = [
      ["mktg-site", mirrorPath],
      ["ai-agent-skills", registryPath],
    ];
    for (const [repoLabel, repoPath] of repoPaths) {
      const hasCommit = commits.some((c) => c.repo === repoLabel);
      if (!hasCommit) continue;
      const pushRes = runCmd("git", ["push", "origin", "main"], repoPath, 60_000);
      if (!pushRes.ok) {
        pushed = false;
        warnings.push(`Push failed for ${repoLabel}: ${pushRes.stderr}`);
        warnings.push(`Recovery: cd ${repoPath} && git push origin main`);
      }
    }
  }

  return ok({
    diff: diffSummary,
    applied: true,
    pushed,
    commits,
    warnings,
    paths: { canonical: canonicalPath, mirror: mirrorPath, registry: registryPath },
  });
};
