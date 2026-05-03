// Integration test: mktg skill add — External skill chaining
// Real file I/O in isolated temp dirs. NO MOCKS. NO FAKE DATA.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

// CLI runner — spawns the real CLI process
const run = async (args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const projectRoot = import.meta.dir.replace("/tests/integration", "");
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: cwd ?? projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

const parseJson = (stdout: string): unknown => {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse JSON: ${stdout.slice(0, 200)}`);
  }
};

// Helper: scaffold a fake external skill in a temp dir that looks like ~/.claude/skills/<name>/
const scaffoldExternalSkill = async (
  baseDir: string,
  name: string,
  triggers: string[] = [],
): Promise<string> => {
  const skillDir = join(baseDir, name);
  await mkdir(skillDir, { recursive: true });
  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: "Test external skill ${name}"`,
    ...(triggers.length > 0 ? ["triggers:"] : []),
    ...triggers.map(t => `  - "${t}"`),
    "---",
    "",
    `# ${name}`,
    "",
    "This is a test external skill.",
  ].join("\n");
  await writeFile(join(skillDir, "SKILL.md"), frontmatter);
  return skillDir;
};

describe("mktg skill add", () => {
  let tmpDir: string;
  let externalSkillsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-skill-add-"));
    externalSkillsDir = join(tmpDir, "external-skills");
    await mkdir(externalSkillsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 1. Add from a path that exists — registers in external_skills
  test("adds an external skill from a direct path", async () => {
    const skillDir = await scaffoldExternalSkill(externalSkillsDir, "test-research");
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    const result = await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as {
      name: string;
      mode: string;
      source_path: string;
      action: string;
      conflicts: unknown[];
    };
    expect(data.name).toBe("test-research");
    expect(data.mode).toBe("chain");
    expect(data.source_path).toBe(skillDir);
    expect(data.action).toBe("added");
    expect(Array.isArray(data.conflicts)).toBe(true);

    // Verify project manifest was written with external_skills
    const manifestRaw = await readFile(join(projectDir, "skills-manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.external_skills).toBeDefined();
    expect(manifest.external_skills["test-research"]).toBeDefined();
    expect(manifest.external_skills["test-research"].source_path).toBe(skillDir);
  });

  // 2. Add a skill that doesn't exist — returns notFound error
  test("returns not-found for nonexistent skill", async () => {
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    const result = await run(["skill", "add", "nonexistent-skill-xyz-999", "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(1);

    const data = parseJson(result.stdout) as { error: { code: string; suggestions: string[] } };
    expect(data.error.code).toBe("NOT_FOUND");
    expect(data.error.suggestions.length).toBeGreaterThan(0);
  });

  // 3. Add a skill that conflicts with existing triggers — returns conflicts
  test("detects trigger conflicts with existing skills", async () => {
    // Use a trigger that matches an existing mktg skill (e.g., "SEO" matches seo-audit)
    const skillDir = await scaffoldExternalSkill(
      externalSkillsDir,
      "my-seo-tool",
      ["SEO audit", "technical SEO"],
    );
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    const result = await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { conflicts: Array<{ trigger: string; existingSkill: string }> };
    // Should find at least one conflict since "SEO audit" overlaps with seo-audit triggers
    expect(data.conflicts.length).toBeGreaterThan(0);
    expect(data.conflicts[0]).toHaveProperty("trigger");
    expect(data.conflicts[0]).toHaveProperty("existingSkill");
  });

  // 4. Add with --dry-run — returns preview, no manifest write
  test("dry-run previews without writing manifest", async () => {
    const skillDir = await scaffoldExternalSkill(externalSkillsDir, "dry-run-skill");
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    const result = await run(["skill", "add", skillDir, "--dry-run", "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { action: string; name: string };
    expect(data.action).toBe("dry-run");
    expect(data.name).toBe("dry-run-skill");

    // Verify no manifest was written
    const manifestExists = await Bun.file(join(projectDir, "skills-manifest.json")).exists();
    expect(manifestExists).toBe(false);
  });

  // 5. Add a skill that's already registered — returns action: "exists"
  test("returns exists for already-registered skill", async () => {
    const skillDir = await scaffoldExternalSkill(externalSkillsDir, "already-added");
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    // First add
    const first = await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);
    expect(first.exitCode).toBe(0);
    const firstData = parseJson(first.stdout) as { action: string };
    expect(firstData.action).toBe("added");

    // Second add — should return "exists"
    const second = await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);
    expect(second.exitCode).toBe(0);
    const secondData = parseJson(second.stdout) as { action: string };
    expect(secondData.action).toBe("exists");
  });

  // 6. Verify mktg list --json includes external_skills after add
  test("list --json includes external_skills after add", async () => {
    const skillDir = await scaffoldExternalSkill(externalSkillsDir, "list-test-skill");
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    // Add the external skill
    await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);

    // Check list output includes external_skills
    const result = await run(["list", "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as {
      skills: unknown[];
      external_skills: Array<{ name: string; source_path: string; source_exists: boolean }>;
      total: number;
    };
    expect(Array.isArray(data.external_skills)).toBe(true);
    expect(data.external_skills.length).toBe(1);
    expect(data.external_skills[0]!.name).toBe("list-test-skill");
    expect(typeof data.external_skills[0]!.source_exists).toBe("boolean");
    // Internal skill count should NOT include external skills
    expect(data.total).toBe(data.skills.length);
  });

  // 7. Verify mktg doctor --json checks external skill health
  test("doctor --json checks external skill health", async () => {
    const skillDir = await scaffoldExternalSkill(externalSkillsDir, "doctor-test-skill");
    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });

    // Add the external skill
    await run(["skill", "add", skillDir, "--json", `--cwd=${projectDir}`]);

    // Run doctor — skill exists so should pass
    const result = await run(["doctor", "--json", `--cwd=${projectDir}`]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as { checks: Array<{ name: string; status: string; detail: string }> };
    const externalCheck = data.checks.find(c => c.name === "external-skills");
    expect(externalCheck).toBeDefined();
    expect(externalCheck!.status).toBe("pass");
    expect(externalCheck!.detail).toContain("1 external skill");

    // Now delete the skill source and re-check — should fail
    await rm(skillDir, { recursive: true, force: true });
    const result2 = await run(["doctor", "--json", `--cwd=${projectDir}`]);
    const data2 = parseJson(result2.stdout) as { checks: Array<{ name: string; status: string }> };
    const failedCheck = data2.checks.find(c => c.name === "external-doctor-test-skill");
    expect(failedCheck).toBeDefined();
    expect(failedCheck!.status).toBe("fail");
  });
});

describe("mktg skill add — input validation", () => {
  test("returns error when no source provided", async () => {
    const result = await run(["skill", "add", "--json"]);
    expect(result.exitCode).toBe(2);

    const data = parseJson(result.stdout) as { error: { code: string } };
    expect(data.error.code).toBe("INVALID_ARGS");
  });
});
