// mktg skill upgrade — Apply upstream drift to an upstream-mirrored skill
//
// Reads the skill's upstream.json, walks each source's live tree (via gh api
// or a fixture override for tests), computes the diff against recorded SHAs,
// writes new/modified blob content locally, refreshes upstream.json with the
// fresh snapshot, bumps the manifest version (semver patch), and validates
// the result. On validation failure the entire upgrade is rolled back to the
// pre-upgrade state.
//
// Special cases:
//   * Modified files with `note: "adapted-frontmatter"` are NEVER overwritten.
//     They surface in the response as `manual_merge_required` so the operator
//     can hand-merge upstream changes into the locally adapted file.
//   * Removed files require `--confirm` because deletion is destructive.
//   * Dry-run mode reports what WOULD be applied without touching disk.
//
// Test seam:
//   When MKTG_UPGRADE_FIXTURE_DIR is set, gh API calls are replaced with
//   filesystem reads against `<dir>/<owner>__<repo>/<branch>/{tree.json,
//   commit_sha.txt}` and `<dir>/<owner>__<repo>/blobs/<sha>` (raw bytes).
//   This keeps the NO MOCKS rule honest: real file I/O, real handler, no
//   network, no SDK stubs.

import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import { ok, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import {
  invalidArgs,
  notFound,
  validateResourceId,
  rejectControlChars,
  detectDoubleEncoding,
} from "../core/errors";
import { validateSkill } from "../core/skill-lifecycle";
import { resolveManifest } from "../core/skills";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpstreamFileEntry = {
  readonly local: string;
  readonly upstream: string;
  readonly sha: string;
  readonly note?: string;
};

type UpstreamSource = {
  readonly name: string;
  readonly repo: string;
  readonly branch: string;
  readonly snapshot_sha: string;
  readonly snapshot_at?: string;
  readonly upstream_root: string;
  readonly local_root: string;
  readonly files: UpstreamFileEntry[];
};

type UpstreamManifest = {
  readonly version: number;
  readonly fetched_at: string;
  readonly tool: string;
  readonly sources: UpstreamSource[];
};

type ApplySummary = {
  readonly added: string[];
  readonly modified: string[];
  readonly removed: string[];
  readonly manual_merge_required: { readonly path: string; readonly note: string }[];
};

export type SkillUpgradeResult = {
  readonly skill: string;
  readonly applied: ApplySummary;
  readonly version_bump: { readonly from: string | null; readonly to: string | null } | null;
  readonly validation_passed: boolean;
  readonly rolled_back: boolean;
  readonly dry_run: boolean;
  readonly ok: boolean;
};

// ---------------------------------------------------------------------------
// Subcommand schema — registered into src/commands/skill.ts subcommands
// ---------------------------------------------------------------------------

export const upgradeSubcommand: CommandSchema = {
  name: "upgrade",
  description:
    "Apply upstream drift to an upstream-mirrored skill — fetches fresh blob content, refreshes upstream.json, bumps version, and validates",
  flags: [
    { name: "--dry-run", type: "boolean", required: false, default: false, description: "Show what would change without writing or deleting any files" },
    { name: "--confirm", type: "boolean", required: false, default: false, description: "Required to apply removals (file deletions) — additive changes always need this for the full upgrade" },
  ],
  positional: { name: "name", description: "Skill name to upgrade (must have upstream.json)", required: true },
  output: {
    skill: "string — skill name that was upgraded",
    "applied.added": "string[] — local paths newly fetched from upstream",
    "applied.modified": "string[] — local paths overwritten with upstream content",
    "applied.removed": "string[] — local paths deleted because upstream removed them",
    "applied.manual_merge_required": "Array<{path, note}> — adapted-frontmatter files surfaced for manual merge",
    version_bump: "{from, to} | null — manifest version bump (semver patch) or null when nothing changed",
    validation_passed: "boolean — whether mktg skill validate passed after the upgrade",
    rolled_back: "boolean — true if validation failed and changes were reverted",
    dry_run: "boolean — true when --dry-run was passed; no writes occurred",
    ok: "boolean — true when upgrade applied cleanly (or dry-run preview succeeded)",
  },
  examples: [
    { args: "mktg skill upgrade remotion-best-practices --dry-run --json", description: "Preview the upgrade plan" },
    { args: "mktg skill upgrade remotion-best-practices --confirm --json", description: "Apply the upgrade including removals" },
  ],
};

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

const fileExists = async (path: string): Promise<boolean> => {
  try { await stat(path); return true; } catch { return false; }
};

const readJsonFile = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf-8")) as T;

const writeFileEnsuringDir = async (path: string, content: string | Buffer): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};

// ---------------------------------------------------------------------------
// Upstream fetch — gh in production, fixture filesystem in tests
// ---------------------------------------------------------------------------

type LiveTree = { readonly files: Map<string, string> /* upstream-relative-path → sha */; readonly commitSha: string };

const fixtureRepoDir = (root: string, repo: string): string =>
  join(root, repo.replace(/\//g, "__"));

const fetchTreeViaFixture = async (fixtureDir: string, source: UpstreamSource): Promise<LiveTree> => {
  const repoDir = fixtureRepoDir(fixtureDir, source.repo);
  const branchDir = join(repoDir, source.branch);
  const treePath = join(branchDir, "tree.json");
  const commitPath = join(branchDir, "commit_sha.txt");
  const tree = await readJsonFile<{ tree: Array<{ type: string; path: string; sha: string }> }>(treePath);
  const commitSha = (await readFile(commitPath, "utf-8")).trim();
  const files = new Map<string, string>();
  for (const entry of tree.tree ?? []) {
    if (entry.type !== "blob") continue;
    files.set(`${source.upstream_root}/${entry.path}`, entry.sha);
  }
  return { files, commitSha };
};

const fetchBlobViaFixture = async (fixtureDir: string, repo: string, sha: string): Promise<Buffer> => {
  const path = join(fixtureRepoDir(fixtureDir, repo), "blobs", sha);
  return await readFile(path);
};

const fetchTreeViaGh = (source: UpstreamSource): LiveTree => {
  const treeRes = spawnSync("gh", ["api", `repos/${source.repo}/git/trees/${source.branch}:${source.upstream_root}?recursive=1`], { encoding: "utf-8", timeout: 60_000 });
  if (treeRes.status !== 0) throw new Error(`gh api tree fetch failed for ${source.repo}@${source.branch}:${source.upstream_root} (exit ${treeRes.status}): ${treeRes.stderr}`);
  const tree = JSON.parse(treeRes.stdout) as { tree?: Array<{ type: string; path: string; sha: string }> };

  const commitRes = spawnSync("gh", ["api", `repos/${source.repo}/commits/${source.branch}`, "--jq", ".sha"], { encoding: "utf-8", timeout: 30_000 });
  if (commitRes.status !== 0) throw new Error(`gh api commit fetch failed for ${source.repo}@${source.branch} (exit ${commitRes.status}): ${commitRes.stderr}`);
  const commitSha = commitRes.stdout.trim();

  const files = new Map<string, string>();
  for (const entry of tree.tree ?? []) {
    if (entry.type !== "blob") continue;
    files.set(`${source.upstream_root}/${entry.path}`, entry.sha);
  }
  return { files, commitSha };
};

const fetchBlobViaGh = (repo: string, sha: string): Buffer => {
  const res = spawnSync("gh", ["api", `repos/${repo}/git/blobs/${sha}`, "--jq", ".content"], { encoding: "utf-8", timeout: 60_000 });
  if (res.status !== 0) throw new Error(`gh api blob fetch failed for ${repo}@${sha} (exit ${res.status}): ${res.stderr}`);
  // GitHub returns the blob base64-encoded with newlines.
  return Buffer.from(res.stdout.replace(/\s+/g, ""), "base64");
};

const fetchTree = async (source: UpstreamSource): Promise<LiveTree> => {
  const fixture = process.env.MKTG_UPGRADE_FIXTURE_DIR;
  if (fixture) return fetchTreeViaFixture(fixture, source);
  return fetchTreeViaGh(source);
};

const fetchBlob = async (repo: string, sha: string): Promise<Buffer> => {
  const fixture = process.env.MKTG_UPGRADE_FIXTURE_DIR;
  if (fixture) return fetchBlobViaFixture(fixture, repo, sha);
  return fetchBlobViaGh(repo, sha);
};

// ---------------------------------------------------------------------------
// Diff + plan
// ---------------------------------------------------------------------------

type FileChange =
  | { readonly kind: "modified"; readonly source: UpstreamSource; readonly entry: UpstreamFileEntry; readonly newSha: string }
  | { readonly kind: "added"; readonly source: UpstreamSource; readonly upstreamPath: string; readonly newSha: string }
  | { readonly kind: "removed"; readonly source: UpstreamSource; readonly entry: UpstreamFileEntry }
  | { readonly kind: "manual_merge"; readonly source: UpstreamSource; readonly entry: UpstreamFileEntry; readonly note: string };

const planChanges = async (manifest: UpstreamManifest, sourceTrees: Map<UpstreamSource, LiveTree>): Promise<FileChange[]> => {
  const changes: FileChange[] = [];
  for (const source of manifest.sources) {
    const live = sourceTrees.get(source)!;
    const known = new Map<string, UpstreamFileEntry>();
    for (const entry of source.files) known.set(entry.upstream, entry);

    // modified + manual_merge: entries we know whose live SHA changed
    for (const [upstreamPath, entry] of known) {
      const liveSha = live.files.get(upstreamPath);
      if (liveSha === undefined) {
        changes.push({ kind: "removed", source, entry });
      } else if (liveSha !== entry.sha) {
        if (entry.note === "adapted-frontmatter") {
          changes.push({ kind: "manual_merge", source, entry, note: entry.note });
        } else {
          changes.push({ kind: "modified", source, entry, newSha: liveSha });
        }
      }
    }
    // added: live files not in our manifest
    for (const [upstreamPath, liveSha] of live.files) {
      if (!known.has(upstreamPath)) changes.push({ kind: "added", source, upstreamPath, newSha: liveSha });
    }
  }
  return changes;
};

// Map an upstream path → local repo path for a given source.
const resolveLocalPath = (source: UpstreamSource, upstreamPath: string, repoRoot: string): string => {
  const prefix = `${source.upstream_root}/`;
  const rel = upstreamPath.startsWith(prefix) ? upstreamPath.slice(prefix.length) : upstreamPath;
  return join(repoRoot, source.local_root, rel);
};

// ---------------------------------------------------------------------------
// Apply + rollback
// ---------------------------------------------------------------------------

type Snapshot = { readonly path: string; readonly previous: Buffer | null };

const snapshotFile = async (path: string): Promise<Snapshot> => {
  if (await fileExists(path)) return { path, previous: await readFile(path) };
  return { path, previous: null };
};

const restoreSnapshots = async (snapshots: Snapshot[]): Promise<void> => {
  for (const snap of snapshots) {
    if (snap.previous === null) {
      await rm(snap.path, { force: true });
    } else {
      await writeFileEnsuringDir(snap.path, snap.previous);
    }
  }
};

// Bump semver patch on the skill's manifest entry. Returns {from, to} or null
// if the manifest can't be located (eg. a project-only skill not in the
// package manifest); we don't fail the upgrade in that case — version is best
// effort, validation is the authoritative gate.
const bumpManifestVersion = async (
  cwd: string,
  skillName: string,
  dryRun: boolean,
): Promise<{ from: string | null; to: string | null; manifestPath: string | null }> => {
  const candidatePaths = [join(cwd, "skills-manifest.json")];
  for (const p of candidatePaths) {
    if (!(await fileExists(p))) continue;
    const raw = JSON.parse(await readFile(p, "utf-8")) as { skills?: Record<string, { version?: string }> };
    const entry = raw.skills?.[skillName];
    if (!entry) continue;
    const from = entry.version ?? "0.0.0";
    const parts = from.split(".").map((n) => parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);
    parts[2] = (parts[2] ?? 0) + 1;
    const to = parts.join(".");
    if (!dryRun) {
      entry.version = to;
      await writeFile(p, JSON.stringify(raw, null, 2) + "\n");
    }
    return { from, to, manifestPath: p };
  }
  return { from: null, to: null, manifestPath: null };
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: CommandHandler<SkillUpgradeResult> = async (args, flags) => {
  const positional = args.filter((a) => !a.startsWith("--"));
  const skillName = positional[0];
  const wantsConfirm = args.includes("--confirm");

  if (!skillName) {
    return invalidArgs("Missing skill name", ["Usage: mktg skill upgrade <name> [--dry-run] [--confirm] [--json]"]);
  }

  const controlCheck = rejectControlChars(skillName, "skill name");
  if (!controlCheck.ok) return invalidArgs(controlCheck.message, []);
  const encodingCheck = detectDoubleEncoding(skillName);
  if (!encodingCheck.ok) return invalidArgs(encodingCheck.message, ["Use a plain skill name like 'remotion-best-practices'"]);
  const idCheck = validateResourceId(skillName, "skill");
  if (!idCheck.ok) return invalidArgs(idCheck.message, ["Use lowercase letters, numbers, hyphens, and dots only"]);

  const skillDir = join(flags.cwd, "skills", skillName);
  const upstreamJsonPath = join(skillDir, "upstream.json");
  if (!(await fileExists(upstreamJsonPath))) {
    return notFound(`upstream.json for skill '${skillName}'`, [
      `Looked at: ${upstreamJsonPath}`,
      "This command only operates on skills with a provenance manifest from /mktg-steal",
      "mktg skill check-upstream --all --json to see which skills carry upstream.json",
    ]);
  }

  let upstream: UpstreamManifest;
  try {
    upstream = await readJsonFile<UpstreamManifest>(upstreamJsonPath);
  } catch (e) {
    return invalidArgs(`upstream.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`, ["Repair the file or restore from git history"]);
  }

  // Fetch live trees for every source
  const sourceTrees = new Map<UpstreamSource, LiveTree>();
  try {
    for (const source of upstream.sources) sourceTrees.set(source, await fetchTree(source));
  } catch (e) {
    return invalidArgs(`Failed to fetch upstream tree: ${e instanceof Error ? e.message : String(e)}`, [
      "Check `gh auth status` and network connectivity",
      "Set MKTG_UPGRADE_FIXTURE_DIR for offline testing",
    ]);
  }

  const changes = await planChanges(upstream, sourceTrees);

  // If the plan involves removals and the user did not pass --confirm, refuse
  // to apply those — they're destructive. We still report them in dry-run.
  const hasRemovals = changes.some((c) => c.kind === "removed");
  const isDryRun = flags.dryRun;
  if (hasRemovals && !isDryRun && !wantsConfirm) {
    return invalidArgs("upgrade has file removals — pass --confirm to delete files, or --dry-run to preview", [
      `mktg skill upgrade ${skillName} --confirm --json`,
      `mktg skill upgrade ${skillName} --dry-run --json`,
    ]);
  }

  const applied: ApplySummary = { added: [], modified: [], removed: [], manual_merge_required: [] };

  // Build the path list before snapshotting so we capture the pre-state for
  // every file we'll touch. upstream.json + manifest are also snapshotted.
  const touchedPaths = new Set<string>();
  for (const change of changes) {
    if (change.kind === "modified" || change.kind === "removed") {
      touchedPaths.add(resolveLocalPath(change.source, change.entry.upstream, flags.cwd));
    } else if (change.kind === "added") {
      touchedPaths.add(resolveLocalPath(change.source, change.upstreamPath, flags.cwd));
    }
  }
  touchedPaths.add(upstreamJsonPath);

  // Dry-run: just report the plan, never touch disk.
  if (isDryRun) {
    for (const change of changes) {
      if (change.kind === "added") applied.added.push(resolveLocalPath(change.source, change.upstreamPath, flags.cwd));
      else if (change.kind === "modified") applied.modified.push(resolveLocalPath(change.source, change.entry.upstream, flags.cwd));
      else if (change.kind === "removed") applied.removed.push(resolveLocalPath(change.source, change.entry.upstream, flags.cwd));
      else if (change.kind === "manual_merge") applied.manual_merge_required.push({ path: resolveLocalPath(change.source, change.entry.upstream, flags.cwd), note: change.note });
    }
    return ok({
      skill: skillName,
      applied,
      version_bump: null,
      validation_passed: true,
      rolled_back: false,
      dry_run: true,
      ok: true,
    });
  }

  // Snapshot every path we may overwrite or remove (plus the manifest entry),
  // so we can roll back atomically if validation fails post-upgrade.
  const snapshots: Snapshot[] = [];
  for (const path of touchedPaths) snapshots.push(await snapshotFile(path));
  const projectManifestPath = join(flags.cwd, "skills-manifest.json");
  const projectManifestSnap = (await fileExists(projectManifestPath)) ? await snapshotFile(projectManifestPath) : null;

  try {
    // Apply file changes
    for (const change of changes) {
      if (change.kind === "added") {
        const localPath = resolveLocalPath(change.source, change.upstreamPath, flags.cwd);
        const blob = await fetchBlob(change.source.repo, change.newSha);
        await writeFileEnsuringDir(localPath, blob);
        applied.added.push(localPath);
      } else if (change.kind === "modified") {
        const localPath = resolveLocalPath(change.source, change.entry.upstream, flags.cwd);
        const blob = await fetchBlob(change.source.repo, change.newSha);
        await writeFileEnsuringDir(localPath, blob);
        applied.modified.push(localPath);
      } else if (change.kind === "removed") {
        const localPath = resolveLocalPath(change.source, change.entry.upstream, flags.cwd);
        await rm(localPath, { force: true });
        applied.removed.push(localPath);
      } else if (change.kind === "manual_merge") {
        applied.manual_merge_required.push({ path: resolveLocalPath(change.source, change.entry.upstream, flags.cwd), note: change.note });
      }
    }

    // Refresh upstream.json: rebuild sources with fresh SHAs, snapshot_sha.
    const refreshedSources: UpstreamSource[] = upstream.sources.map((source) => {
      const live = sourceTrees.get(source)!;
      const newFiles: UpstreamFileEntry[] = [];
      // Keep adapted-frontmatter entries with their ORIGINAL sha (they aren't auto-overwritten).
      for (const entry of source.files) {
        if (entry.note === "adapted-frontmatter") {
          newFiles.push(entry);
          continue;
        }
        const liveSha = live.files.get(entry.upstream);
        if (liveSha === undefined) continue; // removed from upstream → drop from manifest
        newFiles.push({ ...entry, sha: liveSha });
      }
      // Add newly-discovered upstream files
      for (const [upstreamPath, liveSha] of live.files) {
        if (newFiles.some((f) => f.upstream === upstreamPath)) continue;
        const prefix = `${source.upstream_root}/`;
        const rel = upstreamPath.startsWith(prefix) ? upstreamPath.slice(prefix.length) : upstreamPath;
        newFiles.push({ local: join(source.local_root, rel).replace(/^skills\/[^/]+\//, ""), upstream: upstreamPath, sha: liveSha });
      }
      return { ...source, snapshot_sha: live.commitSha, snapshot_at: new Date().toISOString(), files: newFiles };
    });
    const refreshedManifest: UpstreamManifest = { ...upstream, fetched_at: new Date().toISOString(), sources: refreshedSources };
    await writeFile(upstreamJsonPath, JSON.stringify(refreshedManifest, null, 2) + "\n");

    // Bump version (best effort — non-fatal if entry missing)
    const bump = await bumpManifestVersion(flags.cwd, skillName, false);

    // Validate post-upgrade SKILL.md if it exists
    let validation_passed = true;
    const skillMdPath = join(skillDir, "SKILL.md");
    if (await fileExists(skillMdPath)) {
      const content = await readFile(skillMdPath, "utf-8");
      const skillsManifest = await resolveManifest(flags.cwd);
      const result = validateSkill(content, skillsManifest);
      validation_passed = result.valid;
    }

    if (!validation_passed) {
      // Rollback file changes + manifest bump
      await restoreSnapshots(snapshots);
      if (projectManifestSnap) await restoreSnapshots([projectManifestSnap]);
      return {
        ok: true,
        data: {
          skill: skillName,
          applied,
          version_bump: bump.from && bump.to ? { from: bump.from, to: bump.to } : null,
          validation_passed: false,
          rolled_back: true,
          dry_run: false,
          ok: false,
        },
        exitCode: 4,
      } as unknown as CommandResult<SkillUpgradeResult>;
    }

    return ok({
      skill: skillName,
      applied,
      version_bump: bump.from && bump.to ? { from: bump.from, to: bump.to } : null,
      validation_passed: true,
      rolled_back: false,
      dry_run: false,
      ok: true,
    });
  } catch (e) {
    // Catastrophic failure mid-upgrade → rollback whatever we touched
    try {
      await restoreSnapshots(snapshots);
      if (projectManifestSnap) await restoreSnapshots([projectManifestSnap]);
    } catch {
      // Best effort — surface the original error to the operator
    }
    return invalidArgs(`Upgrade failed and rolled back: ${e instanceof Error ? e.message : String(e)}`, [
      "Check upstream.json is well-formed",
      "Verify gh authentication or set MKTG_UPGRADE_FIXTURE_DIR for offline mode",
    ]);
  }
};
