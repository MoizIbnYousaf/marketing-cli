// Real `node scripts/derive-counts.cjs` E2E. Drives the production script
// against the production skills-manifest.json and the production surface
// list. Each test runs the real binary as a subprocess and asserts the
// resulting filesystem state.
//
// Side-effect contract: tests that mutate working-tree files restore them
// in a finally{} block. If any assertion runs against a known-canonical
// state, we re-run the script after to confirm the working tree is clean.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = import.meta.dir.replace(/\/tests\/e2e\/release$/, "");
const SCRIPT = join(PROJECT_ROOT, "scripts/derive-counts.cjs");

const runScript = (): { exitCode: number; stdout: string; stderr: string } => {
  const proc = spawnSync("node", [SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    env: { ...process.env, MKTG_PREPACK_QUIET: "0" },
    timeout: 30_000,
  });
  return {
    exitCode: proc.status ?? -1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
};

const readManifestCounts = (): { total: number; marketing: number } => {
  const manifest = JSON.parse(readFileSync(join(PROJECT_ROOT, "skills-manifest.json"), "utf-8")) as {
    skills: Record<string, unknown>;
  };
  const total = Object.keys(manifest.skills).length;
  return { total, marketing: total - 1 };
};

// Tests that mutate a real surface file restore it after themselves. Track
// originals so afterEach can repair if a test crashes mid-mutation.
const filesUnderTest: Array<{ path: string; original: string }> = [];

const captureAndMutate = (relPath: string, mutator: (orig: string) => string): void => {
  const fullPath = join(PROJECT_ROOT, relPath);
  const original = readFileSync(fullPath, "utf-8");
  filesUnderTest.push({ path: fullPath, original });
  writeFileSync(fullPath, mutator(original));
};

afterEach(() => {
  for (const { path, original } of filesUnderTest.splice(0)) {
    writeFileSync(path, original);
  }
});

// ===========================================================================
// Idempotency — script is a fixed point on a clean tree
// ===========================================================================

describe("e2e: derive-counts is idempotent against a clean tree", () => {
  test("clean run touches 0 files when descriptions already canonical", () => {
    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("files touched: 0");
  });

  test("script reports the canonical counts derived from skills-manifest.json", () => {
    const counts = readManifestCounts();
    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      `${counts.marketing} marketing skills + 1 orchestrator = ${counts.total} total`,
    );
  });

  test("script aborts loudly if skills-manifest.json is malformed (no .skills)", () => {
    captureAndMutate("skills-manifest.json", () => JSON.stringify({ version: 1 }, null, 2));
    const result = runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no .skills entries");
  });
});

// ===========================================================================
// Drift correction — introduces real drift, runs script, asserts repair
// ===========================================================================

describe("e2e: derive-counts repairs real surface drift", () => {
  test("introduces '51 skills' in package.json description and the script restores 56", () => {
    const counts = readManifestCounts();
    const original = readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8");
    expect(original).not.toContain("51 skills");

    captureAndMutate("package.json", (orig) =>
      orig.replace(`${counts.total} skills`, "51 skills"),
    );

    const drifted = readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8");
    expect(drifted).toContain("51 skills");

    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("rewrote package.json");

    const repaired = readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8");
    expect(repaired).not.toContain("51 skills");
    expect(repaired).toContain(`${counts.total} skills`);
  });

  test("introduces '49 marketing skills' in studio/CLAUDE.md and the script restores the canonical count", () => {
    const counts = readManifestCounts();
    captureAndMutate("studio/CLAUDE.md", (orig) =>
      orig.replace(`${counts.marketing} marketing skills`, "49 marketing skills"),
    );

    const drifted = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(drifted).toContain("49 marketing skills");

    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("rewrote studio/CLAUDE.md");

    const repaired = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(repaired).not.toContain("49 marketing skills");
    expect(repaired).toContain(`${counts.marketing} marketing skills`);
  });

  test("introduces drift in 4-plugin description and all 4 are restored in one run", () => {
    const counts = readManifestCounts();
    captureAndMutate(".claude-plugin/plugin.json", (orig) => orig.replace(`${counts.total} skills`, "42 skills"));
    captureAndMutate(".claude-plugin/marketplace.json", (orig) =>
      orig.replace(`${counts.total} skills`, "42 skills"),
    );
    captureAndMutate(".codex-plugin/plugin.json", (orig) => orig.replace(`${counts.total} skills`, "42 skills"));
    captureAndMutate("gemini-extension.json", (orig) => orig.replace(`${counts.total} skills`, "42 skills"));

    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("rewrote .claude-plugin/plugin.json");
    expect(result.stderr).toContain("rewrote .claude-plugin/marketplace.json");
    expect(result.stderr).toContain("rewrote .codex-plugin/plugin.json");
    expect(result.stderr).toContain("rewrote gemini-extension.json");

    for (const rel of [
      ".claude-plugin/plugin.json",
      ".claude-plugin/marketplace.json",
      ".codex-plugin/plugin.json",
      "gemini-extension.json",
    ]) {
      const repaired = readFileSync(join(PROJECT_ROOT, rel), "utf-8");
      expect(repaired).not.toContain("42 skills");
    }
  });
});

// ===========================================================================
// Sub-count protection — category headers like "Foundation (11 skills)" must
// NOT be rewritten by the script's broader regex pattern.
// ===========================================================================

describe("e2e: category sub-counts are NOT touched", () => {
  test("studio/CLAUDE.md '### Foundation (11 skills)' survives a derive-counts run", () => {
    const before = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(before).toContain("Foundation (11 skills)");

    runScript();

    const after = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(after).toContain("Foundation (11 skills)");
    expect(after).toContain("Distribution (10 skills)");
    expect(after).toContain("Creative (11 skills)");
    expect(after).toContain("Copy-Content (3 skills)");
    expect(after).toContain("Growth (4 skills)");
    expect(after).toContain("Conversion (2 skills)");
  });

  test("script does not over-match 'skills-manifest.json' as a count claim", () => {
    const before = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(before).toContain("skills-manifest.json");
    runScript();
    const after = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(after).toContain("skills-manifest.json");
  });

  test("re-running the script after a successful run is a no-op (idempotent)", () => {
    const before = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    runScript();
    const middle = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    runScript();
    const after = readFileSync(join(PROJECT_ROOT, "studio/CLAUDE.md"), "utf-8");
    expect(middle).toBe(before);
    expect(after).toBe(before);
  });
});
