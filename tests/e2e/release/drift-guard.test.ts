// Real regression-guard E2E for tests/skill-count-drift.test.ts.
//
// We don't unit-test the regex; we PROVE the production guard catches a real
// drift by invoking `bun test tests/skill-count-drift.test.ts` as a real
// subprocess against a real-mutated working tree, then restoring the file.
//
// Failure-mode assertion: the spawned subprocess exits non-zero, the stderr
// names the offending file:line, and the message includes the canonical
// fix command so a reader knows what to do.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = import.meta.dir.replace(/\/tests\/e2e\/release$/, "");

const runDriftGuard = (): { exitCode: number; combined: string } => {
  const proc = spawnSync(
    "bun",
    ["test", "tests/skill-count-drift.test.ts", "--bail"],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 60_000,
    },
  );
  return {
    exitCode: proc.status ?? -1,
    combined: `${proc.stdout ?? ""}\n${proc.stderr ?? ""}`,
  };
};

// Restore guard. If a test crashes mid-mutation, this puts the working tree
// back so the rest of the test suite (and the real repo) isn't corrupted.
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
// Baseline — guard passes on a canonical tree
// ===========================================================================

describe("e2e: drift guard passes on a canonical tree", () => {
  test("with no drift introduced, the guard exits 0", () => {
    const result = runDriftGuard();
    expect(result.exitCode).toBe(0);
    expect(result.combined).toContain("0 fail");
  });
});

// ===========================================================================
// Drift in 3 different surface types — JSON desc, plugin manifest, markdown
// ===========================================================================

describe("e2e: drift guard catches real drift across surface types", () => {
  test("drift in package.json description fails the guard with file:line + fix command", () => {
    captureAndMutate("package.json", (orig) =>
      // The current canonical description contains "56 skills". Replace with
      // a clearly wrong number to trigger the guard. Don't touch surrounding
      // structure — JSON.parse must still succeed.
      orig.replace(/\b\d+ skills/, "999 skills"),
    );

    const result = runDriftGuard();
    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toContain("Skill-count drift");
    expect(result.combined).toMatch(/package\.json:\d+/);
    expect(result.combined).toContain('saw "999 skills"');
    expect(result.combined).toContain("Run: node ./scripts/derive-counts.cjs");
  });

  test("drift in studio/CLAUDE.md (top-level total) fails the guard with file:line", () => {
    captureAndMutate("studio/CLAUDE.md", (orig) =>
      // Replace one of the top-level totals (line 184: "skills-manifest.json — 56 skills:")
      // with a wrong number. Stay clear of "(11 skills)" sub-counts which the
      // guard intentionally ignores.
      orig.replace(/\b56 skills:/, "777 skills:"),
    );

    const result = runDriftGuard();
    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toMatch(/studio\/CLAUDE\.md:\d+/);
    expect(result.combined).toContain('saw "777 skills"');
  });

  test("drift in a plugin manifest description fails the guard", () => {
    captureAndMutate(".codex-plugin/plugin.json", (orig) =>
      orig.replace(/\b56 skills/, "888 skills"),
    );

    const result = runDriftGuard();
    expect(result.exitCode).not.toBe(0);
    expect(result.combined).toMatch(/\.codex-plugin\/plugin\.json:\d+/);
    expect(result.combined).toContain('saw "888 skills"');
  });
});

// ===========================================================================
// What the guard intentionally ignores — sub-counts in parens, identifiers
// ===========================================================================

describe("e2e: drift guard does not falsely fire on intentionally-ignored shapes", () => {
  test("category sub-counts in parens — '(99 skills)' — do NOT trigger the guard", () => {
    // studio/CLAUDE.md uses "### Foundation (11 skills)" etc. The guard's
    // negative-lookahead regex `(?![-\w)])` excludes parenthesized counts on
    // purpose because they are category-internal sub-totals, not the
    // canonical total. Inject a wrong sub-count and verify the guard ignores it.
    captureAndMutate("studio/CLAUDE.md", (orig) =>
      orig.replace("Foundation (11 skills)", "Foundation (99 skills)"),
    );

    const result = runDriftGuard();
    // The guard must STILL pass — sub-counts are out of scope for it.
    expect(result.exitCode).toBe(0);
    expect(result.combined).toContain("0 fail");
  });

  test("identifier-shaped tokens like 'skills-manifest' do NOT trigger the guard", () => {
    // Verify the guard ignores hyphenated identifiers.
    captureAndMutate("studio/CLAUDE.md", (orig) =>
      orig.replace("skills-manifest.json", "skills-INVALID-name.json"),
    );

    const result = runDriftGuard();
    // Hyphenated identifier is not a count-claim, so the guard ignores it.
    expect(result.exitCode).toBe(0);
  });

  test("after restoring the file, the guard exits 0 again — clean state recoverable", () => {
    // Drift, fail, restore (afterEach), and re-run — must be green again.
    captureAndMutate("package.json", (orig) => orig.replace(/\b\d+ skills/, "111 skills"));
    const drifted = runDriftGuard();
    expect(drifted.exitCode).not.toBe(0);

    // Manually restore mid-test before afterEach, then re-run.
    const tracked = filesUnderTest.shift();
    expect(tracked).toBeTruthy();
    if (tracked) writeFileSync(tracked.path, tracked.original);

    const restored = runDriftGuard();
    expect(restored.exitCode).toBe(0);
  });
});
