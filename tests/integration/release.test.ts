// Integration test: `mktg release`
// NO MOCKS. Real subprocess, real git repo in a temp dir, real package.json,
// real semver math, real CHANGELOG generation. Tests use --dry-run +
// MKTG_RELEASE_SKIP_TESTS=1 + --skip-publish so no real npm publish or
// `gh release create` calls happen.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = import.meta.dir.replace("/tests/integration", "");

const runCli = async (
  args: readonly string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", join(PROJECT_ROOT, "src/cli.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1", MKTG_RELEASE_SKIP_TESTS: "1", ...extraEnv },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

const sh = (cmd: string, args: readonly string[], cwd: string): { ok: boolean; stdout: string } => {
  const r = spawnSync(cmd, args as string[], { cwd, encoding: "utf-8" });
  return { ok: r.status === 0, stdout: r.stdout };
};

const initRepo = async (cwd: string, version = "1.0.0", commits: string[] = ["feat: initial commit"]): Promise<void> => {
  await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "release-test-pkg", version }, null, 2) + "\n");
  // Seed the 4 plugin manifests so `mktg release` exercises the same
  // surface area it touches in production. Pre-0.5.6 the temp repo only
  // had package.json, which gave false confidence: the bump path worked
  // in the test but the production repo's agent-packaging.test.ts went
  // red on the next bun test run. See goldthread audit + commit 61cf9b2.
  await mkdir(join(cwd, ".claude-plugin"), { recursive: true });
  await mkdir(join(cwd, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(cwd, ".claude-plugin/plugin.json"),
    JSON.stringify({ name: "release-test-pkg", version, description: "test" }, null, 2) + "\n",
  );
  await writeFile(
    join(cwd, ".claude-plugin/marketplace.json"),
    JSON.stringify(
      {
        name: "release-test-pkg",
        owner: { name: "Test", url: "https://example.com" },
        plugins: [{ name: "release-test-pkg", version, description: "test", source: "./" }],
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    join(cwd, ".codex-plugin/plugin.json"),
    JSON.stringify({ name: "release-test-pkg", version, description: "test", skills: "./skills/" }, null, 2) + "\n",
  );
  await writeFile(
    join(cwd, "gemini-extension.json"),
    JSON.stringify({ name: "release-test-pkg", version, description: "test" }, null, 2) + "\n",
  );
  sh("git", ["init", "-b", "main"], cwd);
  sh("git", ["config", "user.email", "test@example.com"], cwd);
  sh("git", ["config", "user.name", "Test"], cwd);
  sh("git", ["config", "commit.gpgsign", "false"], cwd);
  sh("git", ["config", "tag.gpgsign", "false"], cwd);
  sh("git", ["add", "."], cwd);
  // Create commits with conventional-commit style
  let first = true;
  for (const msg of commits) {
    if (first) {
      sh("git", ["commit", "-m", msg], cwd);
      first = false;
    } else {
      // Touch a file to create a new commit
      await writeFile(join(cwd, `.commit-${Math.random()}`), "x");
      sh("git", ["add", "."], cwd);
      sh("git", ["commit", "-m", msg], cwd);
    }
  }
};

let scratch: string;

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), "mktg-release-"));
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

// =========================================================================
// Dry-run plan
// =========================================================================

describe("dry-run plan", () => {
  test("returns version_old, version_new, changelog without mutating", async () => {
    await initRepo(scratch, "1.2.3", [
      "feat: add new feature",
      "fix: fix a bug",
      "docs: update README",
      "chore: bump deps",
    ]);
    const { stdout, exitCode } = await runCli(["release", "patch", "--dry-run", "--json"], scratch);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.version_old).toBe("1.2.3");
    expect(parsed.version_new).toBe("1.2.4");
    expect(parsed.bump_type).toBe("patch");
    expect(parsed.dry_run).toBe(true);
    expect(parsed.committed).toBe(false);
    expect(parsed.npm_published).toBe(false);
    expect(parsed.changelog_entries.length).toBeGreaterThan(0);

    // Confirm package.json is UNTOUCHED
    const pkg = JSON.parse(await readFile(join(scratch, "package.json"), "utf-8"));
    expect(pkg.version).toBe("1.2.3");
  });

  test("minor bump math is correct", async () => {
    await initRepo(scratch, "1.2.3");
    const { stdout } = await runCli(["release", "minor", "--dry-run", "--json"], scratch);
    const parsed = JSON.parse(stdout);
    expect(parsed.version_new).toBe("1.3.0");
  });

  test("major bump math is correct", async () => {
    await initRepo(scratch, "1.2.3");
    const { stdout } = await runCli(["release", "major", "--dry-run", "--json"], scratch);
    const parsed = JSON.parse(stdout);
    expect(parsed.version_new).toBe("2.0.0");
  });

  test("default bump is patch when omitted", async () => {
    await initRepo(scratch, "1.2.3");
    const { stdout } = await runCli(["release", "--dry-run", "--json"], scratch);
    const parsed = JSON.parse(stdout);
    expect(parsed.bump_type).toBe("patch");
    expect(parsed.version_new).toBe("1.2.4");
  });
});

// =========================================================================
// CHANGELOG generation
// =========================================================================

describe("CHANGELOG generation", () => {
  test("groups commits by conventional type", async () => {
    await initRepo(scratch, "1.0.0", [
      "feat: add A",
      "feat: add B",
      "fix: correct C",
      "chore: housekeeping",
    ]);
    const { stdout } = await runCli(["release", "patch", "--dry-run", "--json"], scratch);
    const parsed = JSON.parse(stdout);
    const types = parsed.changelog_entries.map((e: { type: string }) => e.type);
    expect(types).toContain("feat");
    expect(types).toContain("fix");
    expect(types).toContain("chore");
    // Two feats present
    expect(types.filter((t: string) => t === "feat").length).toBe(2);
  });

  test("non-conventional commits go into 'other' bucket", async () => {
    await initRepo(scratch, "1.0.0", ["initial commit", "random change"]);
    const { stdout } = await runCli(["release", "patch", "--dry-run", "--json"], scratch);
    const parsed = JSON.parse(stdout);
    const otherEntries = parsed.changelog_entries.filter((e: { type: string }) => e.type === "other");
    expect(otherEntries.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// --skip-publish + --confirm
// =========================================================================

describe("--skip-publish stops before bun publish", () => {
  test("commits + tags but does not publish", async () => {
    await initRepo(scratch, "0.1.0", ["feat: thing"]);
    const { stdout, exitCode } = await runCli(
      ["release", "minor", "--skip-publish", "--json"],
      scratch,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.dry_run).toBe(false);
    expect(parsed.committed).toBe(true);
    expect(parsed.tagged).toBe(true);
    expect(parsed.npm_published).toBe(false);
    expect(parsed.gh_release_created).toBe(false);
    expect(parsed.version_new).toBe("0.2.0");

    // Verify package.json was bumped on disk
    const pkg = JSON.parse(await readFile(join(scratch, "package.json"), "utf-8"));
    expect(pkg.version).toBe("0.2.0");

    // Verify tag exists in git
    const tags = sh("git", ["tag", "--list"], scratch);
    expect(tags.stdout).toContain("v0.2.0");

    // CHANGELOG.md exists
    let changelogExists = true;
    try { await stat(join(scratch, "CHANGELOG.md")); } catch { changelogExists = false; }
    expect(changelogExists).toBe(true);
    const changelog = await readFile(join(scratch, "CHANGELOG.md"), "utf-8");
    expect(changelog).toContain("0.2.0");
  });

  test("plugin manifests are bumped in lockstep with package.json", async () => {
    // Regression guard for the pre-0.5.6 gap: `mktg release` only touched
    // package.json, leaving the 4 plugin manifest versions stale. The next
    // `bun test` run would then fail agent-packaging.test.ts. Catch that
    // here so future contributors can't reintroduce the gap.
    await initRepo(scratch, "0.4.2", ["feat: ok"]);
    const { exitCode } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(exitCode).toBe(0);

    const pkg = JSON.parse(await readFile(join(scratch, "package.json"), "utf-8"));
    expect(pkg.version).toBe("0.4.3");

    const claude = JSON.parse(await readFile(join(scratch, ".claude-plugin/plugin.json"), "utf-8"));
    expect(claude.version).toBe("0.4.3");

    const marketplace = JSON.parse(await readFile(join(scratch, ".claude-plugin/marketplace.json"), "utf-8"));
    expect(marketplace.plugins[0].version).toBe("0.4.3");

    const codex = JSON.parse(await readFile(join(scratch, ".codex-plugin/plugin.json"), "utf-8"));
    expect(codex.version).toBe("0.4.3");

    const gemini = JSON.parse(await readFile(join(scratch, "gemini-extension.json"), "utf-8"));
    expect(gemini.version).toBe("0.4.3");

    // The single commit should carry all 5 file changes — no separate
    // hand-fix follow-up commit allowed.
    const lastCommit = sh("git", ["show", "--name-only", "--pretty=", "HEAD"], scratch);
    expect(lastCommit.stdout).toContain("package.json");
    expect(lastCommit.stdout).toContain(".claude-plugin/plugin.json");
    expect(lastCommit.stdout).toContain(".claude-plugin/marketplace.json");
    expect(lastCommit.stdout).toContain(".codex-plugin/plugin.json");
    expect(lastCommit.stdout).toContain("gemini-extension.json");
  });
});

describe("--confirm guard for full publish", () => {
  test("publish without --confirm and without --skip-publish is rejected", async () => {
    await initRepo(scratch, "1.0.0", ["feat: ok"]);
    const { stdout, exitCode } = await runCli(["release", "patch", "--json"], scratch);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toMatch(/--confirm|--skip-publish|--dry-run/);
  });
});

// =========================================================================
// Working tree dirty
// =========================================================================

describe("working tree dirty check", () => {
  test("dirty tree blocks release with WORKING_TREE_DIRTY", async () => {
    await initRepo(scratch, "1.0.0", ["feat: ok"]);
    // Introduce uncommitted change
    await writeFile(join(scratch, "untracked.txt"), "dirty");
    const { stdout, exitCode } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("WORKING_TREE_DIRTY");
  });

  test("dirty tree does NOT block --dry-run (preview-only mode)", async () => {
    await initRepo(scratch, "1.0.0", ["feat: ok"]);
    await writeFile(join(scratch, "untracked.txt"), "dirty");
    const { stdout, exitCode } = await runCli(["release", "patch", "--dry-run", "--json"], scratch);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.dry_run).toBe(true);
  });
});

// =========================================================================
// Errors + input hardening
// =========================================================================

describe("input + error handling", () => {
  test("invalid bump type → INVALID_ARGS", async () => {
    await initRepo(scratch, "1.0.0", ["feat: ok"]);
    const { stdout, exitCode } = await runCli(["release", "huge", "--dry-run", "--json"], scratch);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("missing package.json → NOT_FOUND", async () => {
    sh("git", ["init", "-b", "main"], scratch);
    sh("git", ["config", "user.email", "t@e.com"], scratch);
    sh("git", ["config", "user.name", "T"], scratch);
    const { stdout, exitCode } = await runCli(["release", "patch", "--dry-run", "--json"], scratch);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("--cwd applies to all paths", async () => {
    // Build the repo in a sub-dir, run release with --cwd targeting it.
    const sub = join(scratch, "subpkg");
    await mkdir(sub, { recursive: true });
    await initRepo(sub, "0.0.1", ["feat: x"]);
    const { stdout, exitCode } = await runCli(["release", "patch", "--dry-run", "--json", "--cwd", sub], PROJECT_ROOT);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.version_old).toBe("0.0.1");
    expect(parsed.version_new).toBe("0.0.2");
  });
});

// =========================================================================
// Schema introspection
// =========================================================================

describe("schema introspection", () => {
  test("mktg schema release exposes responseSchema", async () => {
    const { stdout, exitCode } = await runCli(["schema", "release", "--json"], PROJECT_ROOT);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("release");
    expect(Array.isArray(parsed.responseSchema)).toBe(true);
    const fields = parsed.responseSchema.map((r: { field: string }) => r.field);
    expect(fields).toContain("version_old");
    expect(fields).toContain("version_new");
    expect(fields).toContain("ok");
  });
});
