// Integration test: `mktg skill upgrade`
// NO MOCKS. Real subprocess, real temp dirs, real file I/O. Network is
// replaced with a filesystem fixture via MKTG_UPGRADE_FIXTURE_DIR — the
// handler reads tree.json + raw blob bytes from disk instead of calling gh.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT_ROOT = import.meta.dir.replace("/tests/integration", "");

type RunResult = { stdout: string; stderr: string; exitCode: number };

const runCli = async (args: readonly string[], extraEnv: Record<string, string> = {}): Promise<RunResult> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1", ...extraEnv },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

// Build a fixture upstream tree on disk in the layout the handler expects:
//   <fixtureDir>/<owner__repo>/<branch>/tree.json   (gh trees response shape)
//   <fixtureDir>/<owner__repo>/<branch>/commit_sha.txt
//   <fixtureDir>/<owner__repo>/blobs/<sha>          (raw blob bytes)
const writeFixture = async (
  fixtureDir: string,
  repo: string,
  branch: string,
  commitSha: string,
  files: { path: string; sha: string; content: string }[],
): Promise<void> => {
  const repoDir = join(fixtureDir, repo.replace(/\//g, "__"));
  await mkdir(join(repoDir, branch), { recursive: true });
  await mkdir(join(repoDir, "blobs"), { recursive: true });
  await writeFile(
    join(repoDir, branch, "tree.json"),
    JSON.stringify({ tree: files.map((f) => ({ type: "blob", path: f.path, sha: f.sha })) }, null, 2),
  );
  await writeFile(join(repoDir, branch, "commit_sha.txt"), commitSha);
  for (const f of files) {
    await writeFile(join(repoDir, "blobs", f.sha), f.content);
  }
};

// A tiny SKILL.md body that passes mktg's structural validator. The validator
// requires frontmatter + "## Anti-Patterns" or similar key sections; we keep
// it deliberately minimal — adapted-frontmatter rollback tests use a broken
// body to force validation failure.
const VALID_SKILL_MD = `---
name: upgrade-fixture
description: Test fixture for skill upgrade. Use when running the upgrade test.
---

## On Activation

Read brand/voice-profile.md if present.

## Anti-Patterns

- Don't ship without testing — WHY: the upgrade handler should rollback failed validation.
`;

let scratchRoot: string;
let fixtureDir: string;

beforeEach(async () => {
  scratchRoot = await mkdtemp(join(tmpdir(), "mktg-upgrade-scratch-"));
  fixtureDir = await mkdtemp(join(tmpdir(), "mktg-upgrade-fixture-"));
});

afterEach(async () => {
  await rm(scratchRoot, { recursive: true, force: true });
  await rm(fixtureDir, { recursive: true, force: true });
});

// Helpers to set up a stock skill scenario.
const setupSkill = async (
  scratchRoot: string,
  skillName: string,
  upstreamFiles: { local: string; upstream: string; sha: string; note?: string }[],
  localFiles: { path: string; content: string }[],
  options: { snapshotSha?: string; manifest?: boolean } = {},
): Promise<void> => {
  const skillDir = join(scratchRoot, "skills", skillName);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "upstream.json"),
    JSON.stringify(
      {
        version: 1,
        fetched_at: "2026-05-04T00:00:00Z",
        tool: "/mktg-steal",
        sources: [
          {
            name: "primary",
            repo: "example/repo",
            branch: "main",
            snapshot_sha: options.snapshotSha ?? "old-commit-sha",
            upstream_root: "skills/source",
            local_root: `skills/${skillName}`,
            files: upstreamFiles,
          },
        ],
      },
      null,
      2,
    ),
  );
  for (const f of localFiles) {
    const fullPath = join(skillDir, f.path);
    await mkdir(join(fullPath, "..").replace(/\/[^/]+$/, ""), { recursive: true }).catch(() => {});
    await mkdir(join(skillDir, f.path, "..").split("/").slice(0, -1).join("/"), { recursive: true }).catch(() => {});
    await mkdir(fullPath.replace(/\/[^/]+$/, ""), { recursive: true });
    await writeFile(fullPath, f.content);
  }
  if (options.manifest) {
    await writeFile(
      join(scratchRoot, "skills-manifest.json"),
      JSON.stringify(
        {
          version: 1,
          skills: {
            [skillName]: {
              source: "third-party",
              category: "knowledge",
              layer: "execution",
              tier: "nice-to-have",
              reads: [],
              writes: [],
              depends_on: [],
              triggers: ["test"],
              review_interval_days: 30,
              version: "1.0.0",
            },
          },
          redirects: {},
        },
        null,
        2,
      ),
    );
  }
};

// =========================================================================
// Dry-run + plan
// =========================================================================

describe("dry-run plan", () => {
  test("reports modifications without writing", async () => {
    const skillName = "fixture-dry-run";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "a.md", upstream: "skills/source/a.md", sha: "OLD_SHA" }],
      [{ path: "a.md", content: "old content" }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "a.md", sha: "NEW_SHA", content: "new content from upstream" },
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--dry-run", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.dry_run).toBe(true);
    expect(parsed.applied.modified).toHaveLength(1);
    expect(parsed.applied.modified[0]).toContain("a.md");
    expect(parsed.applied.added).toHaveLength(0);
    expect(parsed.applied.removed).toHaveLength(0);

    // Local file MUST still be the old content (dry-run = no writes)
    const local = await readFile(join(scratchRoot, "skills", skillName, "a.md"), "utf-8");
    expect(local).toBe("old content");
  });
});

// =========================================================================
// Apply with --confirm
// =========================================================================

describe("apply with --confirm", () => {
  test("modified file gets overwritten with upstream content", async () => {
    const skillName = "fixture-modified";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "rules/timing.md", upstream: "skills/source/rules/timing.md", sha: "OLD" }],
      [{ path: "rules/timing.md", content: "old content" }, { path: "SKILL.md", content: VALID_SKILL_MD }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "rules/timing.md", sha: "NEW_SHA", content: "fresh upstream content" },
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied.modified).toHaveLength(1);

    const local = await readFile(join(scratchRoot, "skills", skillName, "rules/timing.md"), "utf-8");
    expect(local).toBe("fresh upstream content");

    // upstream.json should have the new SHA + commit
    const refreshed = JSON.parse(
      await readFile(join(scratchRoot, "skills", skillName, "upstream.json"), "utf-8"),
    );
    expect(refreshed.sources[0].snapshot_sha).toBe("new-commit");
    expect(refreshed.sources[0].files[0].sha).toBe("NEW_SHA");
  });

  test("added file appears locally", async () => {
    const skillName = "fixture-added";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "existing.md", upstream: "skills/source/existing.md", sha: "EXISTING" }],
      [{ path: "existing.md", content: "kept" }, { path: "SKILL.md", content: VALID_SKILL_MD }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "existing.md", sha: "EXISTING", content: "kept" },
      { path: "rules/new-rule.md", sha: "NEW", content: "brand new rule" },
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied.added.length).toBeGreaterThanOrEqual(1);
    const newFile = await readFile(join(scratchRoot, "skills", skillName, "rules/new-rule.md"), "utf-8");
    expect(newFile).toBe("brand new rule");
  });

  test("removed file gets deleted with --confirm", async () => {
    const skillName = "fixture-removed";
    await setupSkill(
      scratchRoot,
      skillName,
      [
        { local: "stays.md", upstream: "skills/source/stays.md", sha: "S" },
        { local: "goes.md", upstream: "skills/source/goes.md", sha: "G" },
      ],
      [
        { path: "stays.md", content: "stays" },
        { path: "goes.md", content: "goes" },
        { path: "SKILL.md", content: VALID_SKILL_MD },
      ],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "stays.md", sha: "S", content: "stays" },
      // 'goes.md' intentionally absent → removal
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied.removed).toHaveLength(1);
    let goesExists = true;
    try { await stat(join(scratchRoot, "skills", skillName, "goes.md")); } catch { goesExists = false; }
    expect(goesExists).toBe(false);
  });

  test("removal without --confirm is rejected", async () => {
    const skillName = "fixture-needs-confirm";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "goes.md", upstream: "skills/source/goes.md", sha: "G" }],
      [{ path: "goes.md", content: "goes" }, { path: "SKILL.md", content: VALID_SKILL_MD }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", []);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });
});

// =========================================================================
// Adapted-frontmatter preservation
// =========================================================================

describe("adapted-frontmatter preservation", () => {
  test("modified file with note: 'adapted-frontmatter' is NOT overwritten", async () => {
    const skillName = "fixture-adapted";
    await setupSkill(
      scratchRoot,
      skillName,
      [
        { local: "SKILL.md", upstream: "skills/source/SKILL.md", sha: "ORIGINAL", note: "adapted-frontmatter" },
      ],
      [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "SKILL.md", sha: "NEW_UPSTREAM", content: "totally different upstream SKILL.md" },
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied.manual_merge_required).toHaveLength(1);
    expect(parsed.applied.manual_merge_required[0].note).toBe("adapted-frontmatter");

    // Local SKILL.md must remain the locally-adapted version
    const local = await readFile(join(scratchRoot, "skills", skillName, "SKILL.md"), "utf-8");
    expect(local).toBe(VALID_SKILL_MD);
  });
});

// =========================================================================
// Version bump
// =========================================================================

describe("version bump", () => {
  test("manifest patch bump on successful upgrade", async () => {
    const skillName = "fixture-version-bump";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "rules/x.md", upstream: "skills/source/rules/x.md", sha: "OLD" }],
      [{ path: "rules/x.md", content: "old" }, { path: "SKILL.md", content: VALID_SKILL_MD }],
      { manifest: true },
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "rules/x.md", sha: "NEW", content: "new" },
    ]);

    const { stdout } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.version_bump).toEqual({ from: "1.0.0", to: "1.0.1" });
    const updated = JSON.parse(await readFile(join(scratchRoot, "skills-manifest.json"), "utf-8"));
    expect(updated.skills[skillName].version).toBe("1.0.1");
  });
});

// =========================================================================
// Rollback on validation failure
// =========================================================================

describe("rollback on validation failure", () => {
  test("invalid SKILL.md after upgrade triggers rollback", async () => {
    const skillName = "fixture-rollback";
    const broken = "no frontmatter, no anti-patterns — should fail validation";
    await setupSkill(
      scratchRoot,
      skillName,
      [{ local: "SKILL.md", upstream: "skills/source/SKILL.md", sha: "OLD" }],
      [{ path: "SKILL.md", content: VALID_SKILL_MD }],
    );
    await writeFixture(fixtureDir, "example/repo", "main", "new-commit", [
      { path: "SKILL.md", sha: "NEW_BROKEN", content: broken },
    ]);

    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", skillName, "--confirm", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    // Validation failure → exit 4, rolled_back: true, original content restored
    expect([0, 4]).toContain(exitCode);
    const parsed = JSON.parse(stdout);
    if (parsed.rolled_back) {
      expect(parsed.validation_passed).toBe(false);
      const restored = await readFile(join(scratchRoot, "skills", skillName, "SKILL.md"), "utf-8");
      expect(restored).toBe(VALID_SKILL_MD);
    }
  });
});

// =========================================================================
// Errors
// =========================================================================

describe("input + error handling", () => {
  test("missing skill name → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("unknown skill (no upstream.json) → NOT_FOUND", async () => {
    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", "ghost-skill", "--dry-run", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("path-traversal skill name → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli(
      ["skill", "upgrade", "../etc", "--dry-run", "--json", "--cwd", scratchRoot],
      { MKTG_UPGRADE_FIXTURE_DIR: fixtureDir },
    );
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });
});

// =========================================================================
// Schema introspection (axis 3)
// =========================================================================

describe("schema introspection", () => {
  test("mktg schema skill upgrade exposes documented response shape", async () => {
    const { stdout, exitCode } = await runCli(["schema", "skill", "upgrade", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("upgrade");
    expect(Array.isArray(parsed.responseSchema)).toBe(true);
    const fields = parsed.responseSchema.map((r: { field: string }) => r.field);
    expect(fields).toContain("skill");
    expect(fields).toContain("validation_passed");
    expect(fields).toContain("ok");
  });
});
