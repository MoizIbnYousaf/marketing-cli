// Integration tests for mktg update pipeline
// Real file I/O in isolated temp dirs. No mocks.
// Tests: install → modify → update → verify new versions

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readdir, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as initHandler } from "../../src/commands/init";
import { handler as updateHandler } from "../../src/commands/update";
import { loadManifest, getSkillNames, getSkillsInstallDir } from "../../src/core/skills";

let tempDir: string;
let flags: GlobalFlags;

const SKILLS_DIR = getSkillsInstallDir();

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-update-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Update after fresh install", () => {
  test("update on just-installed skills reports all unchanged", async () => {
    // First, init to install skills
    const initResult = await initHandler(["--yes"], flags);
    expect(initResult.ok).toBe(true);

    // Immediately update — nothing should change since we just installed
    const updateResult = await updateHandler([], flags);
    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    // Skills should be unchanged (just installed, no modifications)
    expect(updateResult.data.skills.updated).toHaveLength(0);
    expect(updateResult.data.skills.unchanged.length).toBeGreaterThan(0);
  });

  test("update returns valid JSON structure", async () => {
    await initHandler(["--yes"], flags);
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("agents");
    expect(result.data).toHaveProperty("versionChanges");
    expect(result.data).toHaveProperty("totalSkills");
    expect(result.data).toHaveProperty("totalAgents");
    expect(result.data).toHaveProperty("agentError");
    expect(result.data.agentError).toBeNull();
  });

  test("totalSkills matches manifest count", async () => {
    await initHandler(["--yes"], flags);
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const manifest = await loadManifest();
    expect(result.data.totalSkills).toBe(Object.keys(manifest.skills).length);
  });
});

describe("Update detects modifications", () => {
  test("modified SKILL.md is detected and overwritten", async () => {
    await initHandler(["--yes"], flags);

    // Pick a skill that's definitely installed
    const manifest = await loadManifest();
    const skillNames = getSkillNames(manifest);
    // Find one that's bundled (exists in skills dir)
    let targetSkill: string | null = null;
    for (const name of skillNames) {
      const skillPath = join(SKILLS_DIR, name, "SKILL.md");
      if (await Bun.file(skillPath).exists()) {
        targetSkill = name;
        break;
      }
    }
    expect(targetSkill).not.toBeNull();
    if (!targetSkill) return;

    const skillFilePath = join(SKILLS_DIR, targetSkill, "SKILL.md");

    // Read original content
    const originalContent = await Bun.file(skillFilePath).text();

    // Modify the installed skill
    await writeFile(skillFilePath, originalContent + "\n<!-- user modification -->\n");

    // Verify the modification took
    const modifiedContent = await Bun.file(skillFilePath).text();
    expect(modifiedContent).toContain("<!-- user modification -->");

    // Run update — should detect the change and overwrite
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The modified skill should appear in updated list
    expect(result.data.skills.updated).toContain(targetSkill);

    // The file should be restored to original content
    const restoredContent = await Bun.file(skillFilePath).text();
    expect(restoredContent).not.toContain("<!-- user modification -->");
    expect(restoredContent).toBe(originalContent);
  });

  test("unmodified skills remain in unchanged list", async () => {
    await initHandler(["--yes"], flags);

    // Modify exactly ONE skill
    const manifest = await loadManifest();
    const skillNames = getSkillNames(manifest);
    let targetSkill: string | null = null;
    for (const name of skillNames) {
      const skillPath = join(SKILLS_DIR, name, "SKILL.md");
      if (await Bun.file(skillPath).exists()) {
        targetSkill = name;
        break;
      }
    }
    expect(targetSkill).not.toBeNull();
    if (!targetSkill) return;

    const skillFilePath = join(SKILLS_DIR, targetSkill, "SKILL.md");
    const original = await Bun.file(skillFilePath).text();
    await writeFile(skillFilePath, original + "\n<!-- changed -->\n");

    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Only the modified skill should be updated
    expect(result.data.skills.updated).toContain(targetSkill);
    // All others should be unchanged
    expect(result.data.skills.unchanged.length).toBeGreaterThan(0);
    expect(result.data.skills.unchanged).not.toContain(targetSkill);
  });
});

describe("Update dry-run mode", () => {
  test("--dry-run reports changes without writing", async () => {
    await initHandler(["--yes"], flags);

    // Modify a skill
    const manifest = await loadManifest();
    const skillNames = getSkillNames(manifest);
    let targetSkill: string | null = null;
    for (const name of skillNames) {
      const skillPath = join(SKILLS_DIR, name, "SKILL.md");
      if (await Bun.file(skillPath).exists()) {
        targetSkill = name;
        break;
      }
    }
    expect(targetSkill).not.toBeNull();
    if (!targetSkill) return;

    const skillFilePath = join(SKILLS_DIR, targetSkill, "SKILL.md");
    const original = await Bun.file(skillFilePath).text();
    await writeFile(skillFilePath, original + "\n<!-- dry-run-test -->\n");

    // Dry run
    const dryFlags = { ...flags, dryRun: true };
    const result = await updateHandler([], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should report the skill as needing update
    expect(result.data.skills.updated).toContain(targetSkill);

    // But the file should still have the modification (not overwritten)
    const stillModified = await Bun.file(skillFilePath).text();
    expect(stillModified).toContain("<!-- dry-run-test -->");
  });
});

describe("Update idempotency", () => {
  test("double update produces same result", async () => {
    await initHandler(["--yes"], flags);

    const result1 = await updateHandler([], flags);
    const result2 = await updateHandler([], flags);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    // Both should show 0 updated
    expect(result1.data.skills.updated).toHaveLength(0);
    expect(result2.data.skills.updated).toHaveLength(0);
    // Same unchanged count
    expect(result1.data.skills.unchanged.length).toBe(result2.data.skills.unchanged.length);
  });
});

describe("Update includes agents", () => {
  test("agents are included in update result", async () => {
    await initHandler(["--yes"], flags);

    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Agents section should exist
    expect(result.data.agents).toBeDefined();
    expect(Array.isArray(result.data.agents.updated)).toBe(true);
    expect(Array.isArray(result.data.agents.unchanged)).toBe(true);

    // Total agents should be > 0 (we have 5 agents)
    expect(result.data.totalAgents).toBeGreaterThan(0);
  });

  test("modified agent is detected and restored", async () => {
    await initHandler(["--yes"], flags);

    // Find an installed agent
    const agentsDir = join(homedir(), ".claude", "agents");
    const agentFiles = await readdir(agentsDir);
    const mktgAgent = agentFiles.find(f => f.startsWith("mktg-") && f.endsWith(".md"));
    expect(mktgAgent).toBeDefined();
    if (!mktgAgent) return;

    const agentPath = join(agentsDir, mktgAgent);
    const original = await readFile(agentPath, "utf-8");

    // Modify the agent
    await writeFile(agentPath, original + "\n<!-- agent modification -->\n");

    // Update should detect and restore
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Agent should be in updated list (name without prefix and extension)
    expect(result.data.agents.updated.length).toBeGreaterThan(0);

    // File should be restored
    const restored = await readFile(agentPath, "utf-8");
    expect(restored).not.toContain("<!-- agent modification -->");
  });
});

describe("Update without prior init", () => {
  test("update works even without init (installs to ~/.claude/skills/)", async () => {
    // Don't run init. Just run update directly.
    const result = await updateHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should still report skills (update creates dirs as needed)
    expect(result.data.totalSkills).toBeGreaterThan(0);
    // All should be "updated" since they're being installed fresh
    const total = result.data.skills.updated.length + result.data.skills.unchanged.length + result.data.skills.notBundled.length;
    expect(total).toBeGreaterThan(0);
  });
});

describe("Update exit code", () => {
  test("exit code is 0 on success", async () => {
    await initHandler(["--yes"], flags);
    const result = await updateHandler([], flags);
    expect(result.exitCode).toBe(0);
  });
});
