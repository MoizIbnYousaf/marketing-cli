// Integration test: `mktg propagate`
// NO MOCKS. Real file I/O, real git repos in temp dirs, real JSON parsing.
// Tests run against ephemeral temp repos seeded with minimal manifests.
// The CLI is invoked via `bun run src/cli.ts` with MKTG_AGENT_INVOCATION=1
// to skip interactive confirmation prompts.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = import.meta.dir.replace("/tests/integration", "");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sh = (cmd: string, args: readonly string[], cwd: string): { ok: boolean; stdout: string; stderr: string } => {
  const r = spawnSync(cmd, args as string[], { cwd, encoding: "utf-8" });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
};

const runCli = async (
  args: readonly string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", join(PROJECT_ROOT, "src/cli.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NO_COLOR: "1",
      MKTG_AGENT_INVOCATION: "1", // Skip interactive prompts
      ...extraEnv,
    },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

// Initialize a temp git repo with config
const initGitRepo = async (cwd: string): Promise<void> => {
  sh("git", ["init", "-b", "main"], cwd);
  sh("git", ["config", "user.email", "test@example.com"], cwd);
  sh("git", ["config", "user.name", "TestBot"], cwd);
  sh("git", ["config", "commit.gpgsign", "false"], cwd);
};

// Commit all changes in a repo
const commitAll = (cwd: string, msg: string): void => {
  sh("git", ["add", "-A"], cwd);
  sh("git", ["commit", "-m", msg], cwd);
};

// Minimal canonical skills-manifest.json
const makeCanonical = (skills: Record<string, object>): string =>
  JSON.stringify({
    version: 1,
    skills,
    redirects: {},
  }, null, 2);

// Minimal mirror manifest (skills-manifest.json with _changed_at/_first_seen)
const makeMirror = (skills: Record<string, object>): string =>
  JSON.stringify({
    version: 1,
    skills,
    redirects: {},
  }, null, 2);

// Minimal Ai-Agent-Skills registry
const makeRegistry = (skills: object[]): string =>
  JSON.stringify({
    version: "1.0",
    updated: "2026-01-01",
    total: skills.length,
    workAreas: {},
    collections: [],
    skills,
  }, null, 2);

// A minimal skill entry for the canonical manifest
const canonicalSkill = (overrides: Record<string, unknown> = {}): object => ({
  source: "new",
  category: "foundation",
  layer: "foundation",
  tier: "must-have",
  reads: [],
  writes: [],
  depends_on: [],
  triggers: ["tag1", "tag2"],
  review_interval_days: 30,
  version: "1.0.0",
  ...overrides,
});

// A mirror entry (canonical + timestamps)
const mirrorSkill = (overrides: Record<string, unknown> = {}): object => ({
  ...canonicalSkill(),
  _changed_at: "2026-01-01T00:00:00Z",
  _first_seen: "2026-01-01T00:00:00Z",
  ...overrides,
});

// A registry entry owned by marketing-cli
const registrySkill = (name: string, overrides: Record<string, unknown> = {}): object => ({
  name,
  description: `${name} skill`,
  category: "business",
  workArea: "marketing",
  branch: "Foundation",
  author: "MoizIbnYousaf",
  source: "MoizIbnYousaf/marketing-cli",
  license: "MIT",
  tags: ["tag1", "tag2"],
  featured: true,
  verified: false,
  origin: "curated",
  trust: "reviewed",
  syncMode: "live",
  sourceUrl: `https://github.com/MoizIbnYousaf/marketing-cli/tree/main/skills/${name}`,
  whyHere: `Keeps ${name} available from the upstream marketing-cli playbook without bundling a local copy into this library.`,
  vendored: false,
  installSource: `MoizIbnYousaf/marketing-cli/skills/${name}`,
  tier: "upstream",
  distribution: "live",
  notes: "",
  labels: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Fixture setup: three temp git repos
// ---------------------------------------------------------------------------

type Fixtures = {
  canonicalPath: string;
  mirrorPath: string;
  registryPath: string;
};

const setupFixtures = async (): Promise<Fixtures> => {
  const base = await mkdtemp(join(tmpdir(), "mktg-propagate-"));
  const canonicalPath = join(base, "marketing-cli");
  const mirrorPath = join(base, "mktg-site");
  const registryPath = join(base, "Ai-Agent-Skills");

  await mkdir(canonicalPath, { recursive: true });
  await mkdir(mirrorPath, { recursive: true });
  await mkdir(registryPath, { recursive: true });

  await initGitRepo(canonicalPath);
  await initGitRepo(mirrorPath);
  await initGitRepo(registryPath);

  return { canonicalPath, mirrorPath, registryPath };
};

const extraEnv = (f: Fixtures): Record<string, string> => ({
  MKTG_SITE_PATH: f.mirrorPath,
  AI_AGENT_SKILLS_PATH: f.registryPath,
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let fixtures: Fixtures;

beforeEach(async () => {
  fixtures = await setupFixtures();
});

afterEach(async () => {
  const base = fixtures.canonicalPath.replace("/marketing-cli", "");
  await rm(base, { recursive: true, force: true });
});

// =========================================================================
// 1. In-sync case
// =========================================================================

describe("in-sync case", () => {
  test("all 3 match → diff shows in_sync count, no changes needed", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "skill-a": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/skill-a"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/skill-a/SKILL.md"), "---\nname: skill-a\ndescription: Test skill A\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({ "skill-a": mirrorSkill() }));
    commitAll(mirrorPath, "init");

    const today = new Date().toISOString().slice(0, 10);
    await writeFile(join(registryPath, "skills.json"), makeRegistry([registrySkill("skill-a", { lastVerified: today })]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.diff.in_sync).toBe(1);
    expect(parsed.diff.add_mirror).toHaveLength(0);
    expect(parsed.diff.add_registry).toHaveLength(0);
    expect(parsed.applied).toBe(false);
    expect(parsed.pushed).toBe(false);
    expect(parsed.commits).toHaveLength(0);
  });

  test("--apply with no changes is a no-op (no commits created)", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "skill-a": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/skill-a"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/skill-a/SKILL.md"), "---\nname: skill-a\ndescription: A\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({ "skill-a": mirrorSkill() }));
    commitAll(mirrorPath, "init");

    const today = new Date().toISOString().slice(0, 10);
    await writeFile(join(registryPath, "skills.json"), makeRegistry([registrySkill("skill-a", { lastVerified: today })]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--apply", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied).toBe(true);
    expect(parsed.commits).toHaveLength(0);
  });
});

// =========================================================================
// 2. Add-only case
// =========================================================================

describe("add-only case", () => {
  test("--check reports skill missing from both mirror and registry", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "new-skill": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/new-skill"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/new-skill/SKILL.md"), "---\nname: new-skill\ndescription: A new skill\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.diff.add_mirror).toContain("new-skill");
    expect(parsed.diff.add_registry).toContain("new-skill");
    expect(parsed.applied).toBe(false);
  });

  test("--apply writes to mirror and registry, creates 2 commits", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "new-skill": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/new-skill"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/new-skill/SKILL.md"), "---\nname: new-skill\ndescription: A brand new skill\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--apply", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied).toBe(true);
    expect(parsed.commits.length).toBeGreaterThanOrEqual(2);

    // Verify mirror file was written with skill entry
    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    expect(mirrorContent.skills["new-skill"]).toBeDefined();

    // Verify registry file was written with skill entry
    const registryContent = JSON.parse(await readFile(join(registryPath, "skills.json"), "utf-8"));
    const registryEntry = registryContent.skills.find((s: { name: string }) => s.name === "new-skill");
    expect(registryEntry).toBeDefined();
    expect(registryEntry.source).toBe("MoizIbnYousaf/marketing-cli");
    expect(registryEntry.installSource).toBe("MoizIbnYousaf/marketing-cli/skills/new-skill");
    expect(registryEntry.description).toBe("A brand new skill");
  });

  test("mirror entry schema is correct after --apply", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({
      "schema-test": canonicalSkill({ triggers: ["tag1", "tag2", "tag3"] }),
    }));
    await mkdir(join(canonicalPath, "skills/schema-test"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/schema-test/SKILL.md"), "---\nname: schema-test\ndescription: Schema test skill\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    await runCli(["propagate", "--apply", "--json"], canonicalPath, extraEnv(fixtures));

    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    const entry = mirrorContent.skills["schema-test"];
    expect(entry).toBeDefined();
    // Mirror entry contains canonical fields plus timestamps
    expect(typeof entry.source).toBe("string");
    expect(typeof entry.category).toBe("string");
    expect(typeof entry.layer).toBe("string");
    expect("_changed_at" in entry).toBe(true);
    expect("_first_seen" in entry).toBe(true);
  });
});

// =========================================================================
// 3. Update-only case
// =========================================================================

describe("update case", () => {
  test("bumped version triggers update-mirror in diff", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({
      "versioned": canonicalSkill({ version: "2.0.0" }),
    }));
    await mkdir(join(canonicalPath, "skills/versioned"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/versioned/SKILL.md"), "---\nname: versioned\ndescription: Versioned skill\n---\n");
    commitAll(canonicalPath, "init");

    // Mirror has old version
    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({
      "versioned": mirrorSkill({ version: "1.0.0" }),
    }));
    commitAll(mirrorPath, "init");

    const today = new Date().toISOString().slice(0, 10);
    await writeFile(join(registryPath, "skills.json"), makeRegistry([registrySkill("versioned", { lastVerified: today })]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.diff.update_mirror).toContain("versioned");
  });

  test("--apply refreshes mirror entry with new version", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({
      "upd-skill": canonicalSkill({ version: "2.0.0" }),
    }));
    await mkdir(join(canonicalPath, "skills/upd-skill"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/upd-skill/SKILL.md"), "---\nname: upd-skill\ndescription: Updated skill\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({
      "upd-skill": mirrorSkill({ version: "1.0.0" }),
    }));
    commitAll(mirrorPath, "init");

    const today = new Date().toISOString().slice(0, 10);
    await writeFile(join(registryPath, "skills.json"), makeRegistry([registrySkill("upd-skill", { lastVerified: today })]));
    commitAll(registryPath, "init");

    await runCli(["propagate", "--apply", "--json"], canonicalPath, extraEnv(fixtures));

    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    expect(mirrorContent.skills["upd-skill"].version).toBe("2.0.0");
  });
});

// =========================================================================
// 4. Orphan case
// =========================================================================

describe("orphan case", () => {
  test("mirror has entry not in canonical → orphan-mirror detected", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({}));
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({
      "orphan": mirrorSkill(),
    }));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.diff.orphan_mirror).toContain("orphan");
  });

  test("--apply removes orphan from mirror without touching unowned registry entries", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({}));
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({
      "orphan": mirrorSkill(),
    }));
    commitAll(mirrorPath, "init");

    // Registry has an unowned entry from anthropics + an owned orphan
    const unownedEntry = {
      name: "anthropic-skill",
      source: "anthropics/skills",
      description: "An Anthropic skill",
      // ...other fields omitted for brevity
    };
    const ownedOrphan = registrySkill("owned-orphan");
    await writeFile(join(registryPath, "skills.json"), makeRegistry([unownedEntry, ownedOrphan]));
    commitAll(registryPath, "init");

    await runCli(["propagate", "--apply", "--json"], canonicalPath, extraEnv(fixtures));

    // Mirror orphan removed
    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    expect(mirrorContent.skills["orphan"]).toBeUndefined();

    // Unowned registry entry preserved
    const registryContent = JSON.parse(await readFile(join(registryPath, "skills.json"), "utf-8"));
    const anthropicEntry = registryContent.skills.find((s: { name: string }) => s.name === "anthropic-skill");
    expect(anthropicEntry).toBeDefined();

    // Owned orphan removed
    const ownedEntry = registryContent.skills.find((s: { name: string }) => s.name === "owned-orphan");
    expect(ownedEntry).toBeUndefined();
  });
});

// =========================================================================
// 5. Mixed case
// =========================================================================

describe("mixed case", () => {
  test("simultaneous add + orphan + update all handled in one --apply", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    // Canonical: skill-keep (v2) + skill-new
    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({
      "skill-keep": canonicalSkill({ version: "2.0.0" }),
      "skill-new": canonicalSkill(),
    }));
    await mkdir(join(canonicalPath, "skills/skill-keep"), { recursive: true });
    await mkdir(join(canonicalPath, "skills/skill-new"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/skill-keep/SKILL.md"), "---\nname: skill-keep\ndescription: Keep\n---\n");
    await writeFile(join(canonicalPath, "skills/skill-new/SKILL.md"), "---\nname: skill-new\ndescription: New\n---\n");
    commitAll(canonicalPath, "init");

    // Mirror: skill-keep (v1 stale) + skill-orphan (not in canonical)
    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({
      "skill-keep": mirrorSkill({ version: "1.0.0" }),
      "skill-orphan": mirrorSkill(),
    }));
    commitAll(mirrorPath, "init");

    const today = new Date().toISOString().slice(0, 10);
    await writeFile(join(registryPath, "skills.json"), makeRegistry([
      registrySkill("skill-keep", { lastVerified: today }),
    ]));
    commitAll(registryPath, "init");

    const { stdout: checkOut } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    const checkParsed = JSON.parse(checkOut);
    expect(checkParsed.diff.add_mirror).toContain("skill-new");
    expect(checkParsed.diff.add_registry).toContain("skill-new");
    expect(checkParsed.diff.update_mirror).toContain("skill-keep");
    expect(checkParsed.diff.orphan_mirror).toContain("skill-orphan");

    // Apply
    const { stdout: applyOut, exitCode } = await runCli(
      ["propagate", "--apply", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const applyParsed = JSON.parse(applyOut);
    expect(applyParsed.applied).toBe(true);
    expect(applyParsed.commits.length).toBeGreaterThan(0);

    // Verify mirror state
    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    expect(mirrorContent.skills["skill-keep"].version).toBe("2.0.0");
    expect(mirrorContent.skills["skill-new"]).toBeDefined();
    expect(mirrorContent.skills["skill-orphan"]).toBeUndefined();
  });
});

// =========================================================================
// 6. Dry-run
// =========================================================================

describe("dry-run", () => {
  test("--apply --dry-run does not write files or create commits", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "dry-skill": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/dry-skill"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/dry-skill/SKILL.md"), "---\nname: dry-skill\ndescription: Dry run skill\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--apply", "--dry-run", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.applied).toBe(false); // Dry run
    expect(parsed.commits).toHaveLength(0);
    expect(parsed.diff.add_mirror).toContain("dry-skill");

    // Mirror file unchanged
    const mirrorContent = JSON.parse(await readFile(join(mirrorPath, "skills-manifest.json"), "utf-8"));
    expect(mirrorContent.skills["dry-skill"]).toBeUndefined();
  });
});

// =========================================================================
// 7. JSON output shape validation
// =========================================================================

describe("JSON output shape", () => {
  test("--check output matches PropagateReport shape", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "shape-test": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/shape-test"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/shape-test/SKILL.md"), "---\nname: shape-test\ndescription: Shape test\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--check", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);

    // Required top-level fields
    expect(typeof parsed.diff).toBe("object");
    expect(typeof parsed.diff.in_sync).toBe("number");
    expect(Array.isArray(parsed.diff.add_mirror)).toBe(true);
    expect(Array.isArray(parsed.diff.add_registry)).toBe(true);
    expect(Array.isArray(parsed.diff.update_mirror)).toBe(true);
    expect(Array.isArray(parsed.diff.update_registry)).toBe(true);
    expect(Array.isArray(parsed.diff.orphan_mirror)).toBe(true);
    expect(Array.isArray(parsed.diff.orphan_registry)).toBe(true);
    expect(typeof parsed.applied).toBe("boolean");
    expect(typeof parsed.pushed).toBe("boolean");
    expect(Array.isArray(parsed.commits)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
    expect(typeof parsed.paths).toBe("object");
    expect(typeof parsed.paths.canonical).toBe("string");
    expect(typeof parsed.paths.mirror).toBe("string");
    expect(typeof parsed.paths.registry).toBe("string");
  });

  test("mktg schema propagate exposes responseSchema", async () => {
    const { stdout, exitCode } = await runCli(
      ["schema", "propagate", "--json"],
      fixtures.canonicalPath,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("propagate");
    expect(Array.isArray(parsed.responseSchema)).toBe(true);
    const fields = parsed.responseSchema.map((r: { field: string }) => r.field);
    expect(fields).toContain("diff.in_sync");
    expect(fields).toContain("applied");
    expect(fields).toContain("commits");
  });
});

// =========================================================================
// 8. Pre-flight: dirty working tree blocked
// =========================================================================

describe("pre-flight checks", () => {
  test("dirty mirror tree blocks --apply with WORKING_TREE_DIRTY", async () => {
    const { canonicalPath, mirrorPath, registryPath } = fixtures;

    await writeFile(join(canonicalPath, "skills-manifest.json"), makeCanonical({ "pf-skill": canonicalSkill() }));
    await mkdir(join(canonicalPath, "skills/pf-skill"), { recursive: true });
    await writeFile(join(canonicalPath, "skills/pf-skill/SKILL.md"), "---\nname: pf-skill\ndescription: Preflight\n---\n");
    commitAll(canonicalPath, "init");

    await writeFile(join(mirrorPath, "skills-manifest.json"), makeMirror({}));
    commitAll(mirrorPath, "init");

    await writeFile(join(registryPath, "skills.json"), makeRegistry([]));
    commitAll(registryPath, "init");

    // Dirty the mirror repo
    await writeFile(join(mirrorPath, "uncommitted.txt"), "dirty");

    const { stdout, exitCode } = await runCli(
      ["propagate", "--apply", "--json"],
      canonicalPath,
      extraEnv(fixtures),
    );
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("WORKING_TREE_DIRTY");
  });
});
