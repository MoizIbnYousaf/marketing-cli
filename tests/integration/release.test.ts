// Integration test: `mktg release`
// NO MOCKS. Real subprocess, real git repo in a temp dir, real package.json,
// real semver math, real CHANGELOG generation. Tests use --dry-run +
// MKTG_RELEASE_SKIP_TESTS=1 + --skip-publish so no real npm publish happens.
// The one --confirm test runs against an npm configuration with no login and
// a private package, and asserts the command stops before writing anything.

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

describe("a hand-written Unreleased section becomes the release notes", () => {
  test("the heading takes the version, the notes stay, no commit list is added beside them", async () => {
    await initRepo(scratch, "0.4.0", ["feat: thing"]);
    const notes = "### Fixed\n\n- **A curated note.** Written by a person, not derived from a commit subject.\n";
    await writeFile(
      join(scratch, "CHANGELOG.md"),
      `# Changelog\n\n## Unreleased\n\n${notes}\n## v0.4.0\n\n### feat\n\n- earlier\n`,
    );
    sh("git", ["add", "CHANGELOG.md"], scratch);
    sh("git", ["commit", "-m", "docs: unreleased notes"], scratch);

    const { exitCode } = await runCli(["release", "minor", "--skip-publish", "--json"], scratch);
    expect(exitCode).toBe(0);

    const changelog = await readFile(join(scratch, "CHANGELOG.md"), "utf-8");
    expect(changelog.startsWith(`# Changelog\n\n## v0.5.0\n\n${notes}`)).toBe(true);
    expect(changelog).not.toContain("## Unreleased");
    // The commit subjects are in git and in the GitHub release notes; they are
    // not repeated next to curated notes.
    expect(changelog).not.toContain("docs: unreleased notes");
    expect(changelog.match(/^## v0\.5\.0$/gm)?.length).toBe(1);
    // The older section is untouched.
    expect(changelog).toContain("## v0.4.0\n\n### feat\n\n- earlier\n");
  });

  test("an empty Unreleased section is replaced by the generated commit list", async () => {
    await initRepo(scratch, "0.6.0", ["feat: thing"]);
    await writeFile(join(scratch, "CHANGELOG.md"), "# Changelog\n\n## Unreleased\n\n## v0.6.0\n\n- earlier\n");
    sh("git", ["add", "CHANGELOG.md"], scratch);
    sh("git", ["commit", "-m", "feat: new capability"], scratch);

    const { exitCode } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(exitCode).toBe(0);

    const changelog = await readFile(join(scratch, "CHANGELOG.md"), "utf-8");
    expect(changelog).not.toContain("## Unreleased");
    expect(changelog.startsWith("# Changelog\n\n## v0.6.1\n")).toBe(true);
    expect(changelog).toContain("- new capability");
    expect(changelog).toContain("## v0.6.0\n\n- earlier\n");
  });
});

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
    expect(parsed.version_new).toBe("0.2.0");
    // The command never pushes: it says what is left, naming the branch the
    // repo is on and the tag whose push starts the Release workflow.
    const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"], scratch).stdout.trim();
    expect(parsed.next_steps[0]).toBe(`git push origin ${branch} --follow-tags`);
    expect(parsed.next_steps.join(" ")).toContain("v0.2.0");
    expect(parsed.next_steps.join(" ")).toContain("Release workflow");
    // The workflow stages the version; it is not installable until approved.
    expect(parsed.next_steps.join(" ")).toContain("stages 0.2.0 on npm");
    expect(parsed.next_steps.join(" ")).toContain("approves");
    expect("gh_release_created" in parsed).toBe(false);

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

  test("--confirm with npm lifecycle scripts disabled stops before anything is written", async () => {
    expect(sh("npm", ["--version"], scratch).ok).toBe(true);

    await initRepo(scratch, "1.5.0", ["feat: ok"]);
    const pkgPath = join(scratch, "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    await writeFile(pkgPath, JSON.stringify({ ...pkg, private: true }, null, 2) + "\n");
    sh("git", ["commit", "-am", "chore: mark private"], scratch);
    const headBefore = sh("git", ["rev-parse", "HEAD"], scratch).stdout.trim();

    // With ignore-scripts=true a publish skips prepublishOnly and prepack:
    // no fresh build, and the workspaces field ships. 0.7.0 went out that way.
    const npmHome = await mkdtemp(join(tmpdir(), "mktg-release-npm-"));
    await writeFile(join(npmHome, "user.npmrc"), "ignore-scripts=true\n");
    await writeFile(join(npmHome, "global.npmrc"), "");
    try {
      const { stdout, exitCode } = await runCli(["release", "patch", "--confirm", "--json"], scratch, {
        NPM_CONFIG_USERCONFIG: join(npmHome, "user.npmrc"),
        NPM_CONFIG_GLOBALCONFIG: join(npmHome, "global.npmrc"),
        NPM_CONFIG_TOKEN: "",
        NODE_AUTH_TOKEN: "",
      });

      expect(exitCode).toBe(3);
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("NPM_SCRIPTS_DISABLED");
      expect(parsed.error.suggestions.join(" ")).toContain("--skip-publish");
      expect(JSON.parse(await readFile(pkgPath, "utf-8")).version).toBe("1.5.0");
      expect(sh("git", ["rev-parse", "HEAD"], scratch).stdout.trim()).toBe(headBefore);
      expect(sh("git", ["tag", "--list"], scratch).stdout.trim()).toBe("");
    } finally {
      await rm(npmHome, { recursive: true, force: true });
    }
  }, 120_000);

  test("--confirm without an npm login stops before anything is written", async () => {
    // The check shells out to npm; without it the command cannot know.
    expect(sh("npm", ["--version"], scratch).ok).toBe(true);

    await initRepo(scratch, "1.4.0", ["feat: ok"]);
    // Belt and braces: a private package cannot be published even if the
    // login check were skipped.
    const pkgPath = join(scratch, "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    await writeFile(pkgPath, JSON.stringify({ ...pkg, private: true }, null, 2) + "\n");
    sh("git", ["commit", "-am", "chore: mark private"], scratch);
    const headBefore = sh("git", ["rev-parse", "HEAD"], scratch).stdout.trim();

    // An npm configuration with no credentials, outside the repo so the
    // working tree stays clean.
    const npmHome = await mkdtemp(join(tmpdir(), "mktg-release-npm-"));
    await writeFile(join(npmHome, "user.npmrc"), "");
    await writeFile(join(npmHome, "global.npmrc"), "");
    try {
      const { stdout, exitCode } = await runCli(["release", "patch", "--confirm", "--json"], scratch, {
        NPM_CONFIG_USERCONFIG: join(npmHome, "user.npmrc"),
        NPM_CONFIG_GLOBALCONFIG: join(npmHome, "global.npmrc"),
        NPM_CONFIG_TOKEN: "",
        NODE_AUTH_TOKEN: "",
      });

      expect(exitCode).toBe(3);
      const parsed = JSON.parse(stdout);
      expect(parsed.error.code).toBe("NPM_AUTH_MISSING");
      expect(parsed.error.suggestions.join(" ")).toContain("--skip-publish");
      // Nothing was bumped, committed or tagged.
      expect(JSON.parse(await readFile(pkgPath, "utf-8")).version).toBe("1.4.0");
      expect(sh("git", ["rev-parse", "HEAD"], scratch).stdout.trim()).toBe(headBefore);
      expect(sh("git", ["tag", "--list"], scratch).stdout.trim()).toBe("");
      expect(sh("git", ["status", "--porcelain"], scratch).stdout.trim()).toBe("");
    } finally {
      await rm(npmHome, { recursive: true, force: true });
    }
  }, 120_000);
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
    expect(fields).toContain("next_steps");
    // The command no longer creates the GitHub release; the workflow does.
    expect(fields).not.toContain("gh_release_created");
  });
});

// =========================================================================
// Failed stages exit non-zero and say how to recover
// =========================================================================

describe("a failed stage is not reported as success", () => {
  test("tag collision exits 4 with failed_stage 'tag' and recovery steps", async () => {
    await initRepo(scratch, "3.0.0", ["feat: thing"]);
    // Occupy the tag the release would create, so `git tag` genuinely fails.
    expect(sh("git", ["tag", "v3.0.1"], scratch).ok).toBe(true);

    const { stdout, exitCode } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);

    expect(exitCode).toBe(4);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.failed_stage).toBe("tag");
    expect(parsed.committed).toBe(true);
    expect(parsed.tagged).toBe(false);
    expect(parsed.npm_published).toBe(false);
    expect(parsed.recovery.join(" ")).toContain("git reset --hard HEAD~1");
  });

  test("a successful --skip-publish run reports no failed stage", async () => {
    await initRepo(scratch, "3.1.0", ["feat: thing"]);

    const { stdout, exitCode } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.failed_stage).toBeNull();
    expect(parsed.recovery).toEqual([]);
  });

  test("a failed stage offers recovery, not next steps", async () => {
    await initRepo(scratch, "3.3.0", ["feat: thing"]);
    expect(sh("git", ["tag", "v3.3.1"], scratch).ok).toBe(true);

    const { stdout } = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);

    const parsed = JSON.parse(stdout);
    expect(parsed.failed_stage).toBe("tag");
    expect(parsed.next_steps).toEqual([]);
  });

  test("missing --confirm is rejected before the test run starts", async () => {
    await initRepo(scratch, "3.2.0", ["feat: thing"]);

    // MKTG_RELEASE_SKIP_TESTS is cleared: if the guard ran after the tests,
    // this would launch `bun test` in the scratch repo instead of returning.
    const started = Date.now();
    const { stdout, exitCode } = await runCli(["release", "patch", "--json"], scratch, {
      MKTG_RELEASE_SKIP_TESTS: "0",
    });

    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout).error.message).toContain("--confirm");
    expect(Date.now() - started).toBeLessThan(10_000);
    // Nothing was bumped.
    const pkg = JSON.parse(await readFile(join(scratch, "package.json"), "utf-8"));
    expect(pkg.version).toBe("3.2.0");
  });
});
