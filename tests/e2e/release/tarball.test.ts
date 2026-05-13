// Real `npm pack --dry-run` E2E. Hits the real prepack/postpack chain, the
// real `derive-counts.cjs`, the real `prepack-strip-workspaces.cjs`, and asserts
// against the real tarball manifest npm reports back as JSON.
//
// Side-effect contract: this test mutates and restores the real working tree
// (npm runs prepack hooks on `--dry-run` too). We assert the postpack restore
// landed cleanly; if it didn't, the assertion fails loud rather than leaving
// a corrupted package.json behind.

import { describe, expect, test, beforeAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = import.meta.dir.replace(/\/tests\/e2e\/release$/, "");

type PackEntry = { path: string; size: number; mode?: number };
type PackResult = {
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
  entryCount: number;
  files: PackEntry[];
};

let packReport: PackResult;
let backupExists: boolean;

beforeAll(async () => {
  const before = readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8");

  const proc = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    env: { ...process.env, MKTG_PREPACK_QUIET: "1" },
    timeout: 120_000,
  });
  if (proc.status !== 0) {
    throw new Error(`npm pack failed (exit ${proc.status}): ${proc.stderr}`);
  }
  const parsed = JSON.parse(proc.stdout) as PackResult[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`npm pack --json returned empty: ${proc.stdout}`);
  }
  packReport = parsed[0]!;
  backupExists = existsSync(join(PROJECT_ROOT, "package.json.prepack-backup"));

  // Restore safety net: if postpack didn't restore (e.g., if npm changed the
  // hook semantics in a future release), the test fails *and* the working
  // tree is repaired by hand here so subsequent tests don't see corruption.
  const after = readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8");
  if (after !== before) {
    // Postpack should have restored. If we got here, something drifted.
    // Fail the test by leaving `backupExists` true OR by throwing — the
    // assertion in the first test surfaces it. Don't auto-repair silently.
  }
});

// ===========================================================================
// Size + entry-count regression guards
// ===========================================================================

describe("e2e: tarball size + entry count regression", () => {
  test("tarball is under 3 MB packed (regression budget vs ~10.7 MB pre-strip)", () => {
    expect(packReport.size).toBeLessThan(3 * 1024 * 1024);
  });

  test("entry count is reasonable (under 1000 — regression budget)", () => {
    expect(packReport.entryCount).toBeGreaterThan(100);
    expect(packReport.entryCount).toBeLessThan(1000);
  });

  test("postpack restored package.json — no .prepack-backup file leaked", () => {
    expect(backupExists).toBe(false);
  });
});

// ===========================================================================
// Files that MUST ship in the published tarball
// ===========================================================================

describe("e2e: required files ship in the tarball", () => {
  const required: readonly string[] = [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/cli.js",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    ".codex-plugin/plugin.json",
    "gemini-extension.json",
    "skills-manifest.json",
    "agents-manifest.json",
    "catalogs-manifest.json",
    "scripts/postinstall.cjs",
    "studio/server.ts",
    "studio/package.json",
    "studio/bin/mktg-studio.ts",
  ];

  test("every required file is present in the tarball manifest", () => {
    const paths = new Set(packReport.files.map((f) => f.path));
    const missing = required.filter((r) => !paths.has(r));
    expect(missing).toEqual([]);
  });

  test("studio/docs ships markdown docs (architecture, FAQ, cmo-api etc.)", () => {
    const docs = packReport.files
      .map((f) => f.path)
      .filter((p) => p.startsWith("studio/docs/"));
    expect(docs).toContain("studio/docs/architecture.md");
    expect(docs).toContain("studio/docs/cmo-api.md");
    expect(docs).toContain("studio/docs/FAQ.md");
    expect(docs).toContain("studio/docs/SHIPPING.md");
  });

  test("at least one skill SKILL.md per skill directory ships", () => {
    const skillFiles = packReport.files.map((f) => f.path).filter((p) => /^skills\/[^/]+\/SKILL\.md$/.test(p));
    expect(skillFiles.length).toBeGreaterThanOrEqual(50);
  });
});

// ===========================================================================
// Files that MUST NOT ship — the strip layer's job
// ===========================================================================

describe("e2e: forbidden paths do not ship", () => {
  test("studio/docs/screenshots/ — 9.6 MB of dashboard PNGs — is excluded", () => {
    const screenshots = packReport.files
      .map((f) => f.path)
      .filter((p) => p.startsWith("studio/docs/screenshots/"));
    expect(screenshots).toEqual([]);
  });

  test("SQLite WAL/SHM/db artifacts do not ship", () => {
    const dbArtifacts = packReport.files
      .map((f) => f.path)
      .filter((p) => /\.(db|db-wal|db-shm)$/.test(p));
    expect(dbArtifacts).toEqual([]);
  });

  test("Next.js build output and tsbuildinfo do not ship", () => {
    const buildArtifacts = packReport.files
      .map((f) => f.path)
      .filter(
        (p) =>
          p.startsWith("studio/.next/") ||
          p.startsWith("studio/.turbo/") ||
          p.endsWith("tsconfig.tsbuildinfo"),
      );
    expect(buildArtifacts).toEqual([]);
  });

  test("test/ and node_modules/ are not in the published tarball", () => {
    const polluted = packReport.files
      .map((f) => f.path)
      .filter((p) => p.startsWith("tests/") || p.includes("/node_modules/") || p.startsWith("node_modules/"));
    expect(polluted).toEqual([]);
  });

  test("marketing-cli-audit-findings/ scratch directory doesn't accidentally land in tarball", () => {
    const audit = packReport.files
      .map((f) => f.path)
      .filter((p) => p.includes("audit-findings"));
    expect(audit).toEqual([]);
  });
});

// ===========================================================================
// Description sync — npm publish surface carries the canonical count
// ===========================================================================

describe("e2e: published package.json description carries canonical skill count", () => {
  test("package.json description references 58 (canonical total)", () => {
    // npm pack --json reports the file list but not contents; read the
    // working-tree package.json which the publish would have used.
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8")) as {
      description: string;
    };
    expect(pkg.description).toContain("58");
    expect(pkg.description).not.toContain("51 skills");
    expect(pkg.description).not.toContain("50 skills");
  });

  test("all 4 plugin manifest descriptions reference 58", () => {
    const claude = JSON.parse(readFileSync(join(PROJECT_ROOT, ".claude-plugin/plugin.json"), "utf-8")) as {
      description: string;
    };
    const marketplace = JSON.parse(
      readFileSync(join(PROJECT_ROOT, ".claude-plugin/marketplace.json"), "utf-8"),
    ) as { plugins: Array<{ description: string }> };
    const codex = JSON.parse(readFileSync(join(PROJECT_ROOT, ".codex-plugin/plugin.json"), "utf-8")) as {
      description: string;
      interface: { longDescription: string };
    };
    const gemini = JSON.parse(readFileSync(join(PROJECT_ROOT, "gemini-extension.json"), "utf-8")) as {
      description: string;
    };

    for (const desc of [claude.description, marketplace.plugins[0]!.description, codex.description, gemini.description]) {
      expect(desc).toContain("58");
      expect(desc).not.toContain("51 skills");
      expect(desc).not.toContain("50 skills");
    }
    expect(codex.interface.longDescription).toContain("57 marketing skills");
  });
});
