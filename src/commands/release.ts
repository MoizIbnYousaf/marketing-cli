// mktg release — Orchestrates the full release pipeline:
//   git clean check → bun test → semver bump → CHANGELOG → commit → tag → bun publish → gh release.
//
// Usage:
//   mktg release [patch|minor|major] [--dry-run] [--confirm] [--skip-publish] [--json]
//
// Test seam:
//   MKTG_RELEASE_SKIP_TESTS=1 bypasses the `bun test` step. Tests use this so
//   running the release command from inside a test doesn't recursively invoke
//   the full suite. NO MOCKS — every other side effect (git, semver math,
//   CHANGELOG generation, package.json mutation) runs against the real temp
//   dir and real git repo the test sets up.

import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, stat } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import { invalidArgs, rejectControlChars } from "../core/errors";
import { applyManifestVersion, MANIFEST_SPECS } from "../core/release-manifests";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BumpType = "patch" | "minor" | "major";

type ChangelogEntry = {
  readonly type: string;
  readonly subject: string;
};

export type ReleaseResult = {
  readonly version_old: string;
  readonly version_new: string;
  readonly bump_type: BumpType;
  readonly tests_passed: boolean;
  readonly tests_skipped: boolean;
  readonly changelog_entries: readonly ChangelogEntry[];
  readonly committed: boolean;
  readonly tagged: boolean;
  readonly npm_published: boolean;
  readonly gh_release_created: boolean;
  readonly dry_run: boolean;
  readonly ok: boolean;
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const schema: CommandSchema = {
  name: "release",
  description:
    "Orchestrate the release pipeline — verify clean tree, run tests, bump version, generate CHANGELOG, commit, tag, optionally publish to npm + create a GitHub release",
  flags: [
    { name: "--dry-run", type: "boolean", required: false, default: false, description: "Preview the pipeline without writing, committing, tagging, or publishing" },
    { name: "--confirm", type: "boolean", required: false, default: false, description: "Required to actually publish (npm + gh release) — Agent DX safety guard" },
    { name: "--skip-publish", type: "boolean", required: false, default: false, description: "Bump + tag locally but stop before bun publish and gh release" },
  ],
  positional: { name: "bump", description: "Semver bump: 'patch' (default), 'minor', or 'major'", required: false },
  output: {
    version_old: "string — the package.json version before this release",
    version_new: "string — the package.json version after the bump",
    bump_type: "'patch' | 'minor' | 'major' — semver bump applied",
    tests_passed: "boolean — whether `bun test` exited 0 (true when tests_skipped is true)",
    tests_skipped: "boolean — true when tests were skipped (dry-run or MKTG_RELEASE_SKIP_TESTS)",
    changelog_entries: "Array<{type, subject}> — conventional-commit-grouped entries since last tag",
    committed: "boolean — version bump + CHANGELOG committed to git",
    tagged: "boolean — git tag v<version> created",
    npm_published: "boolean — `bun publish` succeeded (false in dry-run / --skip-publish)",
    gh_release_created: "boolean — `gh release create` succeeded (false in dry-run / --skip-publish)",
    dry_run: "boolean — true when --dry-run; no side effects occurred",
    ok: "boolean — true when the requested pipeline completed without errors",
  },
  examples: [
    { args: "mktg release patch --dry-run --json", description: "Preview a patch release plan" },
    { args: "mktg release minor --skip-publish --json", description: "Bump + tag locally, skip npm/gh" },
    { args: "mktg release major --confirm --json", description: "Full pipeline including npm publish + gh release" },
  ],
  vocabulary: ["release", "publish", "ship", "version bump", "tag", "changelog"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fileExists = async (path: string): Promise<boolean> => {
  try { await stat(path); return true; } catch { return false; }
};

const runCmd = (
  cmd: string,
  args: readonly string[],
  cwd: string,
  timeout = 300_000,
): { ok: boolean; stdout: string; stderr: string; exitCode: number } => {
  const res = spawnSync(cmd, args as string[], { cwd, encoding: "utf-8", timeout });
  return {
    ok: res.status === 0,
    stdout: (res.stdout ?? "").toString(),
    stderr: (res.stderr ?? "").toString(),
    exitCode: res.status ?? -1,
  };
};

const bumpSemver = (current: string, bump: BumpType): string => {
  const parts = current.split(".").map((p) => parseInt(p.split("-")[0] ?? "0", 10) || 0);
  while (parts.length < 3) parts.push(0);
  const [major, minor, patch] = parts as [number, number, number];
  switch (bump) {
    case "major": return `${major + 1}.0.0`;
    case "minor": return `${major}.${minor + 1}.0`;
    case "patch": return `${major}.${minor}.${patch + 1}`;
  }
};

// Parse `git log <range> --pretty='%s'` output into typed conventional-commit
// entries. Lines that don't match a conventional prefix get bucketed as 'other'
// so we never silently drop history.
const parseChangelog = (gitLogOutput: string): ChangelogEntry[] => {
  const lines = gitLogOutput.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: ChangelogEntry[] = [];
  for (const line of lines) {
    const match = line.match(/^(feat|fix|chore|docs|refactor|test|perf|style|ci|build)(\(.+?\))?(!)?:\s*(.+)$/);
    if (match) {
      entries.push({ type: match[1] ?? "other", subject: match[4] ?? line });
    } else {
      entries.push({ type: "other", subject: line });
    }
  }
  return entries;
};

const groupChangelog = (entries: readonly ChangelogEntry[]): string => {
  const groups = new Map<string, string[]>();
  for (const e of entries) {
    if (!groups.has(e.type)) groups.set(e.type, []);
    groups.get(e.type)!.push(e.subject);
  }
  const order = ["feat", "fix", "perf", "refactor", "docs", "chore", "test", "style", "ci", "build", "other"];
  const sections: string[] = [];
  for (const type of order) {
    const items = groups.get(type);
    if (!items || items.length === 0) continue;
    sections.push(`### ${type}\n\n${items.map((s) => `- ${s}`).join("\n")}`);
  }
  return sections.join("\n\n");
};

const lastReleaseTag = (cwd: string): string | null => {
  const res = runCmd("git", ["describe", "--tags", "--abbrev=0", "--match=v*"], cwd, 10_000);
  if (!res.ok) return null;
  return res.stdout.trim() || null;
};

const gitLogSince = (cwd: string, since: string | null): string => {
  const range = since ? `${since}..HEAD` : "HEAD";
  const res = runCmd("git", ["log", range, "--pretty=%s"], cwd, 30_000);
  return res.ok ? res.stdout : "";
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const VALID_BUMPS: readonly BumpType[] = ["patch", "minor", "major"] as const;

export const handler: CommandHandler<ReleaseResult> = async (args, flags) => {
  const positional = args.filter((a) => !a.startsWith("--"));
  const wantsConfirm = args.includes("--confirm");
  const wantsSkipPublish = args.includes("--skip-publish");
  const isDryRun = flags.dryRun;

  // Bump type — default patch
  const bumpRaw = positional[0] ?? "patch";
  const controlCheck = rejectControlChars(bumpRaw, "bump");
  if (!controlCheck.ok) return invalidArgs(controlCheck.message, []);
  if (!VALID_BUMPS.includes(bumpRaw as BumpType)) {
    return invalidArgs(`Invalid bump type: '${bumpRaw}'`, [`Valid: ${VALID_BUMPS.join(", ")}`, "Example: mktg release patch --json"]);
  }
  const bump = bumpRaw as BumpType;

  // Read package.json
  const pkgPath = join(flags.cwd, "package.json");
  if (!(await fileExists(pkgPath))) {
    return err("NOT_FOUND", `package.json not found at ${pkgPath}`, [`Run mktg release from a package root, or pass --cwd <path>`], 1);
  }
  let pkg: { name?: string; version?: string };
  try {
    pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  } catch (e) {
    return invalidArgs(`package.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`, []);
  }
  const versionOld = pkg.version ?? "0.0.0";
  const versionNew = bumpSemver(versionOld, bump);

  // Verify clean working tree (skip in dry-run since we expect to inspect state)
  let cleanTree = true;
  if (!isDryRun) {
    const statusRes = runCmd("git", ["status", "--porcelain"], flags.cwd, 10_000);
    cleanTree = statusRes.ok && statusRes.stdout.trim() === "";
    if (!cleanTree) {
      return err(
        "WORKING_TREE_DIRTY",
        "Working tree is not clean — commit or stash changes before releasing",
        ["git status", "git stash", "mktg release " + bump + " --dry-run --json (preview without checks)"],
        2,
      );
    }
  }

  // Run tests (skippable for tests-of-tests via env var)
  const skipTestsEnv = process.env.MKTG_RELEASE_SKIP_TESTS === "1";
  let testsPassed = true;
  const testsSkipped = isDryRun || skipTestsEnv;
  if (!testsSkipped) {
    const testRes = runCmd("bun", ["test"], flags.cwd, 600_000);
    testsPassed = testRes.ok;
    if (!testsPassed) {
      return err(
        "TESTS_FAILED",
        `bun test failed (exit ${testRes.exitCode})`,
        ["Fix failing tests then re-run", `Last lines: ${testRes.stderr.split("\n").slice(-5).join(" | ")}`],
        4,
      );
    }
  }

  // Generate CHANGELOG entries from git log since last v* tag
  const lastTag = lastReleaseTag(flags.cwd);
  const logOut = gitLogSince(flags.cwd, lastTag);
  const changelog_entries = parseChangelog(logOut);
  const grouped = groupChangelog(changelog_entries);
  const changelogBody = `## v${versionNew}\n\n${grouped || "_No notable changes._"}\n`;

  // Destructive-publish guard: actual publish requires --confirm. Tag/commit
  // alone don't require --confirm because they're local-only (the user can
  // git reset). Pushing to remote would require it but we don't push.
  const willPublish = !isDryRun && !wantsSkipPublish;
  if (willPublish && !wantsConfirm) {
    return invalidArgs(
      "release will publish to npm and create a GitHub release — pass --confirm to proceed, or --skip-publish to stop after the local tag",
      [
        `mktg release ${bump} --skip-publish --json`,
        `mktg release ${bump} --dry-run --json`,
        `mktg release ${bump} --confirm --json`,
      ],
    );
  }

  // Dry-run: report the plan and exit cleanly
  if (isDryRun) {
    return ok({
      version_old: versionOld,
      version_new: versionNew,
      bump_type: bump,
      tests_passed: true,
      tests_skipped: true,
      changelog_entries,
      committed: false,
      tagged: false,
      npm_published: false,
      gh_release_created: false,
      dry_run: true,
      ok: true,
    });
  }

  // Apply: bump package.json, sync the 4 plugin manifests, write CHANGELOG
  // entry, commit, tag. Manifest sync must run in the same commit as the
  // package.json bump because tests/agent-packaging.test.ts asserts every
  // manifest version equals pkg.version. Skipping it (the pre-0.5.6 path)
  // shipped a release commit that failed its own test suite — see
  // commit 61cf9b2 for the hand-fix that proves the gap.
  pkg.version = versionNew;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  try {
    await applyManifestVersion(flags.cwd, versionNew);
  } catch (e) {
    return err(
      "MANIFEST_SYNC_FAILED",
      `Failed to sync plugin manifests to v${versionNew}: ${e instanceof Error ? e.message : String(e)}`,
      [
        `Verify these files exist and are valid JSON: ${MANIFEST_SPECS.map((s) => s.relativePath).join(", ")}`,
        `Run 'git checkout package.json' to roll back the version bump if needed`,
      ],
      2,
    );
  }

  // Append (or create) CHANGELOG.md with the new entry on top of the existing
  // contents — idempotent re-runs would still prepend a new section, but
  // re-running with the same version is uncommon and we don't try to detect.
  const changelogPath = join(flags.cwd, "CHANGELOG.md");
  let existingChangelog = "";
  if (await fileExists(changelogPath)) existingChangelog = await readFile(changelogPath, "utf-8");
  const fullChangelog = existingChangelog.startsWith("# Changelog")
    ? existingChangelog.replace(/^# Changelog\n+/, `# Changelog\n\n${changelogBody}\n`)
    : `# Changelog\n\n${changelogBody}\n${existingChangelog}`;
  await writeFile(changelogPath, fullChangelog);

  // `git commit -am` only stages MODIFIED tracked files. The first release
  // in a fresh repo creates CHANGELOG.md as a new untracked file, so we
  // explicitly add it before commit. Subsequent releases find it already
  // tracked and the add is a no-op. Without this, the next `mktg release`
  // sees the untracked changelog from the previous run as a dirty tree.
  runCmd("git", ["add", "CHANGELOG.md"], flags.cwd, 10_000);
  const commitRes = runCmd("git", ["commit", "-am", `chore: release v${versionNew}`], flags.cwd, 30_000);
  const committed = commitRes.ok;
  if (!committed) {
    return err(
      "GIT_COMMIT_FAILED",
      `git commit failed (exit ${commitRes.exitCode})`,
      [commitRes.stderr.trim() || "Verify git is configured (user.name + user.email)"],
      2,
    );
  }

  const tagRes = runCmd("git", ["tag", `v${versionNew}`, "-m", `Release v${versionNew}`], flags.cwd, 10_000);
  const tagged = tagRes.ok;

  // Stop here if --skip-publish
  if (wantsSkipPublish) {
    return ok({
      version_old: versionOld,
      version_new: versionNew,
      bump_type: bump,
      tests_passed: testsPassed,
      tests_skipped: testsSkipped,
      changelog_entries,
      committed,
      tagged,
      npm_published: false,
      gh_release_created: false,
      dry_run: false,
      ok: tagged,
    });
  }

  // Publish to npm
  const publishRes = runCmd("bun", ["publish"], flags.cwd, 300_000);
  const npm_published = publishRes.ok;

  // Create GitHub release with CHANGELOG body. Use stdin via printf piped
  // through a temp file would be cleaner; for now we pass --notes inline.
  const ghRes = runCmd("gh", ["release", "create", `v${versionNew}`, "--title", `v${versionNew}`, "--notes", changelogBody], flags.cwd, 60_000);
  const gh_release_created = ghRes.ok;

  return ok({
    version_old: versionOld,
    version_new: versionNew,
    bump_type: bump,
    tests_passed: testsPassed,
    tests_skipped: testsSkipped,
    changelog_entries,
    committed,
    tagged,
    npm_published,
    gh_release_created,
    dry_run: false,
    ok: committed && tagged && npm_published && gh_release_created,
  });
};
