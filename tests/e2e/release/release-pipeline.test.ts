// Real end-to-end exercise of `mktg release` against a real temp git repo.
//
// No mocks. No fakes. Each test sets up a real on-disk repo with the same 5
// files release.ts cares about (package.json + 4 plugin manifests), invokes
// the real CLI via `bun run src/cli.ts release ...`, and asserts the
// resulting filesystem + git state. Multiple cases per scenario per the
// TEST-PLAN.md hard rules.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = import.meta.dir.replace(/\/tests\/e2e\/release$/, "");

type ProcResult = { stdout: string; stderr: string; exitCode: number };

const runCli = async (
  args: readonly string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): Promise<ProcResult> => {
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

const sh = (cmd: string, args: readonly string[], cwd: string): { ok: boolean; stdout: string; stderr: string } => {
  const r = spawnSync(cmd, args as string[], { cwd, encoding: "utf-8" });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
};

// Seed a real git repo with a real package.json + the 4 real plugin manifests.
// The shapes mirror production exactly (.codex-plugin has the nested
// `interface` object; .claude-plugin/marketplace.json has plugins[].version).
const seedRepo = async (cwd: string, version = "1.0.0", commits: string[] = ["feat: ok"]): Promise<void> => {
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ name: "e2e-release-test", version, description: "test pkg" }, null, 2) + "\n",
  );
  await mkdir(join(cwd, ".claude-plugin"), { recursive: true });
  await mkdir(join(cwd, ".codex-plugin"), { recursive: true });
  await writeFile(
    join(cwd, ".claude-plugin/plugin.json"),
    JSON.stringify({ name: "e2e-release-test", version, description: "claude plugin" }, null, 2) + "\n",
  );
  await writeFile(
    join(cwd, ".claude-plugin/marketplace.json"),
    JSON.stringify(
      {
        name: "e2e-release-test",
        owner: { name: "Test", url: "https://example.com" },
        plugins: [{ name: "e2e-release-test", version, description: "claude plugin", source: "./" }],
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    join(cwd, ".codex-plugin/plugin.json"),
    JSON.stringify(
      {
        name: "e2e-release-test",
        version,
        description: "codex plugin",
        skills: "./skills/",
        interface: { displayName: "Test", capabilities: ["Read", "Write"] },
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    join(cwd, "gemini-extension.json"),
    JSON.stringify({ name: "e2e-release-test", version, description: "gemini extension" }, null, 2) + "\n",
  );
  sh("git", ["init", "-b", "main"], cwd);
  sh("git", ["config", "user.email", "test@example.com"], cwd);
  sh("git", ["config", "user.name", "Test"], cwd);
  sh("git", ["config", "commit.gpgsign", "false"], cwd);
  sh("git", ["config", "tag.gpgsign", "false"], cwd);
  sh("git", ["add", "."], cwd);
  let first = true;
  for (const msg of commits) {
    if (first) {
      sh("git", ["commit", "-m", msg], cwd);
      first = false;
    } else {
      await writeFile(join(cwd, `.commit-${Math.random()}`), "x");
      sh("git", ["add", "."], cwd);
      sh("git", ["commit", "-m", msg], cwd);
    }
  }
};

const readVersions = async (cwd: string): Promise<{
  pkg: string;
  claudePlugin: string;
  marketplace: string;
  codex: string;
  gemini: string;
}> => {
  const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8")) as { version: string };
  const claudePlugin = JSON.parse(
    await readFile(join(cwd, ".claude-plugin/plugin.json"), "utf-8"),
  ) as { version: string };
  const marketplace = JSON.parse(
    await readFile(join(cwd, ".claude-plugin/marketplace.json"), "utf-8"),
  ) as { plugins: Array<{ version: string }> };
  const codex = JSON.parse(
    await readFile(join(cwd, ".codex-plugin/plugin.json"), "utf-8"),
  ) as { version: string };
  const gemini = JSON.parse(
    await readFile(join(cwd, "gemini-extension.json"), "utf-8"),
  ) as { version: string };
  return {
    pkg: pkg.version,
    claudePlugin: claudePlugin.version,
    marketplace: marketplace.plugins[0]!.version,
    codex: codex.version,
    gemini: gemini.version,
  };
};

let scratch: string;

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), "mktg-e2e-release-"));
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

// ===========================================================================
// Happy-path bump types — patch / minor / major all sync 5 files together
// ===========================================================================

describe("e2e: real release pipeline syncs all 5 files in one commit", () => {
  test("patch bump — all 5 files at v1.0.0 → v1.0.1", async () => {
    await seedRepo(scratch, "1.0.0", ["feat: thing"]);
    const result = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as { ok: boolean; version_new: string };
    expect(parsed.ok).toBe(true);
    expect(parsed.version_new).toBe("1.0.1");

    const versions = await readVersions(scratch);
    expect(versions.pkg).toBe("1.0.1");
    expect(versions.claudePlugin).toBe("1.0.1");
    expect(versions.marketplace).toBe("1.0.1");
    expect(versions.codex).toBe("1.0.1");
    expect(versions.gemini).toBe("1.0.1");

    // Single commit must carry every modified file. The pre-0.5.6 bug shipped
    // a commit that only touched package.json and required a hand-fix
    // follow-up (commit 61cf9b2). This assertion is the regression guard.
    const lastCommit = sh("git", ["show", "--name-only", "--pretty=", "HEAD"], scratch).stdout;
    expect(lastCommit).toContain("package.json");
    expect(lastCommit).toContain(".claude-plugin/plugin.json");
    expect(lastCommit).toContain(".claude-plugin/marketplace.json");
    expect(lastCommit).toContain(".codex-plugin/plugin.json");
    expect(lastCommit).toContain("gemini-extension.json");

    // Tag exists in git
    const tags = sh("git", ["tag", "--list"], scratch).stdout;
    expect(tags).toContain("v1.0.1");
  });

  test("minor bump — all 5 files at v2.4.7 → v2.5.0", async () => {
    await seedRepo(scratch, "2.4.7", ["feat: a", "fix: b"]);
    const result = await runCli(["release", "minor", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(0);

    const versions = await readVersions(scratch);
    const allEqual = new Set([
      versions.pkg,
      versions.claudePlugin,
      versions.marketplace,
      versions.codex,
      versions.gemini,
    ]);
    expect(allEqual.size).toBe(1);
    expect(versions.pkg).toBe("2.5.0");

    // .codex-plugin's `interface` object survives the bump — we only touched
    // .version, never the surrounding shape.
    const codexFile = JSON.parse(await readFile(join(scratch, ".codex-plugin/plugin.json"), "utf-8")) as {
      interface: { displayName: string; capabilities: string[] };
    };
    expect(codexFile.interface.displayName).toBe("Test");
    expect(codexFile.interface.capabilities).toEqual(["Read", "Write"]);
  });

  test("major bump — all 5 files at v0.99.99 → v1.0.0", async () => {
    await seedRepo(scratch, "0.99.99", ["feat!: breaking"]);
    const result = await runCli(["release", "major", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(0);

    const versions = await readVersions(scratch);
    expect(versions.pkg).toBe("1.0.0");
    expect(versions.claudePlugin).toBe("1.0.0");
    expect(versions.marketplace).toBe("1.0.0");
    expect(versions.codex).toBe("1.0.0");
    expect(versions.gemini).toBe("1.0.0");
  });
});

// ===========================================================================
// Edge — repeated bumps stay in lockstep, dirty tree blocks, dry-run no-op
// ===========================================================================

describe("e2e: edge cases stay in lockstep", () => {
  test("repeated bumps — patch then minor then major all sync", async () => {
    await seedRepo(scratch, "0.1.0", ["feat: ok"]);

    const a = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(a.exitCode).toBe(0);
    const v1 = await readVersions(scratch);
    expect(v1.pkg).toBe("0.1.1");
    expect(v1.gemini).toBe("0.1.1");

    const b = await runCli(["release", "minor", "--skip-publish", "--json"], scratch);
    expect(b.exitCode).toBe(0);
    const v2 = await readVersions(scratch);
    expect(v2.pkg).toBe("0.2.0");
    expect(v2.codex).toBe("0.2.0");
    expect(v2.marketplace).toBe("0.2.0");

    const c = await runCli(["release", "major", "--skip-publish", "--json"], scratch);
    expect(c.exitCode).toBe(0);
    const v3 = await readVersions(scratch);
    expect(v3.pkg).toBe("1.0.0");
    expect(v3.claudePlugin).toBe("1.0.0");

    // Three release commits in history
    const log = sh("git", ["log", "--oneline"], scratch).stdout;
    expect(log).toContain("chore: release v0.1.1");
    expect(log).toContain("chore: release v0.2.0");
    expect(log).toContain("chore: release v1.0.0");
  });

  test("dry-run does not mutate any of the 5 files", async () => {
    await seedRepo(scratch, "1.2.3", ["feat: ok"]);
    const before = await readVersions(scratch);
    expect(before.pkg).toBe("1.2.3");

    const result = await runCli(["release", "minor", "--dry-run", "--json"], scratch);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout) as { dry_run: boolean; version_new: string };
    expect(parsed.dry_run).toBe(true);
    expect(parsed.version_new).toBe("1.3.0");

    const after = await readVersions(scratch);
    expect(after.pkg).toBe("1.2.3");
    expect(after.claudePlugin).toBe("1.2.3");
    expect(after.marketplace).toBe("1.2.3");
    expect(after.codex).toBe("1.2.3");
    expect(after.gemini).toBe("1.2.3");
  });

  test("dirty working tree blocks the release before manifests are touched", async () => {
    await seedRepo(scratch, "1.0.0", ["feat: ok"]);
    await writeFile(join(scratch, "uncommitted.txt"), "stranger danger");

    const result = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout) as { error: { code: string; message: string } };
    expect(parsed.error.code).toBe("WORKING_TREE_DIRTY");

    const after = await readVersions(scratch);
    expect(after.pkg).toBe("1.0.0");
    expect(after.claudePlugin).toBe("1.0.0");
    expect(after.marketplace).toBe("1.0.0");
    expect(after.codex).toBe("1.0.0");
    expect(after.gemini).toBe("1.0.0");
  });
});

// ===========================================================================
// Failure — missing manifest is a release-blocking error with rollback hint
// ===========================================================================

describe("e2e: missing or malformed manifest fails loud", () => {
  test("missing gemini-extension.json blocks release with MANIFEST_SYNC_FAILED", async () => {
    await seedRepo(scratch, "1.0.0", ["feat: ok"]);
    // Delete one of the 4 manifests to simulate a contributor forgetting it.
    await rm(join(scratch, "gemini-extension.json"));
    sh("git", ["add", "-A"], scratch);
    sh("git", ["commit", "-m", "remove gemini"], scratch);

    const result = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout) as { error: { code: string; message: string; suggestions: string[] } };
    expect(parsed.error.code).toBe("MANIFEST_SYNC_FAILED");
    expect(parsed.error.message).toContain("Failed to sync plugin manifests");
    expect(parsed.error.message).toContain("1.0.1");
    expect(parsed.error.suggestions.some((s) => s.includes("gemini-extension.json"))).toBe(true);
    expect(parsed.error.suggestions.some((s) => s.includes("git checkout package.json"))).toBe(true);
  });

  test("malformed JSON in .codex-plugin/plugin.json blocks release", async () => {
    await seedRepo(scratch, "1.0.0", ["feat: ok"]);
    await writeFile(join(scratch, ".codex-plugin/plugin.json"), "{ not valid json ");
    sh("git", ["add", "-A"], scratch);
    sh("git", ["commit", "-m", "broken codex"], scratch);

    const result = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout) as { error: { code: string; message: string } };
    expect(parsed.error.code).toBe("MANIFEST_SYNC_FAILED");
    expect(parsed.error.message.toLowerCase()).toMatch(/json|parse|expected/);
  });

  test("manifest missing nested versionPath (marketplace plugins[0]) is caught", async () => {
    await seedRepo(scratch, "1.0.0", ["feat: ok"]);
    // Strip plugins[] so plugins[0].version doesn't exist.
    await writeFile(
      join(scratch, ".claude-plugin/marketplace.json"),
      JSON.stringify({ name: "e2e-release-test", owner: { name: "T", url: "https://e.com" }, plugins: [] }, null, 2) + "\n",
    );
    sh("git", ["add", "-A"], scratch);
    sh("git", ["commit", "-m", "empty plugins"], scratch);

    const result = await runCli(["release", "patch", "--skip-publish", "--json"], scratch);
    // setAt() throws when an intermediate is missing; release.ts catches and
    // returns MANIFEST_SYNC_FAILED. The exact failure path is acceptable so
    // long as the release does not silently succeed with a stale marketplace.
    expect(result.exitCode).not.toBe(0);
    if (result.exitCode === 2) {
      const parsed = JSON.parse(result.stdout) as { error: { code: string } };
      expect(parsed.error.code).toBe("MANIFEST_SYNC_FAILED");
    }
  });
});
