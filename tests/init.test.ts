// E2E tests for mktg init command
// Uses real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, stat, writeFile, chmod, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler } from "../src/commands/init";
import { loadManifest, getSkillNames, getSkillsInstallDir } from "../src/core/skills";

// Delegation is skipped when every manifest skill is already installed (cheap
// idempotent re-run). To exercise the delegate path on a machine that already
// has skills, temporarily move one installed skill aside; restore in finally.
const withOneSkillMissing = async <T>(fn: () => Promise<T>): Promise<T> => {
  const manifest = await loadManifest();
  const dir = join(getSkillsInstallDir(), getSkillNames(manifest)[0]!);
  const aside = `${dir}.mktg-test-aside`;
  let moved = false;
  try {
    await rename(dir, aside);
    moved = true;
  } catch (e) {
    console.log("RENAME FAILED", (e as Error).message);
  }
  try {
    return await fn();
  } finally {
    if (moved) {
      // If something reinstalled the skill meanwhile, keep the fresh copy.
      if (await Bun.file(join(dir, "SKILL.md")).exists()) await rm(aside, { recursive: true, force: true });
      else await rename(aside, dir);
    }
  }
};

let tempDir: string;
let flags: GlobalFlags;
let originalPath: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-init-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
  originalPath = process.env.PATH;
});

afterEach(async () => {
  process.env.PATH = originalPath;
  delete process.env.MKTG_USE_AI_AGENT_SKILLS;
  await rm(tempDir, { recursive: true, force: true });
});

const createAiAgentSkillsShim = async (scriptBody: string): Promise<string> => {
  const binDir = await mkdtemp(join(tmpdir(), "mktg-ai-agent-skills-bin-"));
  const binPath = join(binDir, "ai-agent-skills");
  await writeFile(binPath, scriptBody, "utf8");
  await chmod(binPath, 0o755);
  process.env.PATH = `${binDir}:${originalPath ?? ""}`;
  // Delegation is opt-in since the bundled install became the default path.
  process.env.MKTG_USE_AI_AGENT_SKILLS = "1";
  return binDir;
};

describe("mktg init", () => {
  test("scaffolds brand/ with 10 files", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandDir = join(tempDir, "brand");
    const brandStat = await stat(brandDir);
    expect(brandStat.isDirectory()).toBe(true);

    const expectedFiles = [
      "voice-profile.md",
      "positioning.md",
      "audience.md",
      "competitors.md",
      "keyword-plan.md",
      "creative-kit.md",
      "stack.md",
      "assets.md",
      "learnings.md",
    ];

    for (const file of expectedFiles) {
      const filePath = join(brandDir, file);
      const exists = await Bun.file(filePath).exists();
      expect(exists).toBe(true);
    }

    expect(result.data.brand.created.length).toBe(10);
  });

  test("returns valid JSON result structure", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("doctor");
    expect(result.data).toHaveProperty("project");
    expect(result.data.brand).toHaveProperty("created");
    expect(result.data.brand).toHaveProperty("skipped");
    expect(result.data.skills).toHaveProperty("installed");
  });

  test("--dry-run does not create files", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await handler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);

    const brandDir = join(tempDir, "brand");
    const exists = await Bun.file(brandDir).exists();
    expect(exists).toBe(false);
  });

  test("skips existing brand files on re-init", async () => {
    // First init
    await handler(["--yes"], flags);

    // Second init
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created.length).toBe(0);
    expect(result.data.brand.skipped.length).toBe(10);
  });

  test("--skip-brand skips brand scaffolding", async () => {
    const result = await handler(["--yes", "--skip-brand"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created.length).toBe(0);
    expect(result.data.brand.skipped.length).toBe(0);
  });

  test("--skip-brand also skips --from scraping", async () => {
    const result = await handler([
      "--yes",
      "--skip-brand",
      "--from",
      "https://example.com",
    ], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(await Bun.file(join(tempDir, "brand")).exists()).toBe(false);
    expect(result.data).not.toHaveProperty("scraped");
  });

  test("--from dry-run reports only missing files and preserves existing work", async () => {
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# My real voice\n");
    const dryFlags = { ...flags, dryRun: true };
    const result = await handler([
      "--yes",
      "--skip-skills",
      "--skip-agents",
      "--from",
      "https://example.com",
    ], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const scraped = (result.data as typeof result.data & { scraped?: { filesPopulated: string[] } }).scraped;
    expect(scraped?.filesPopulated).not.toContain("voice-profile.md");
    expect(await Bun.file(join(tempDir, "brand", "voice-profile.md")).text()).toBe("# My real voice\n");
  });

  test("--skip-skills skips skill installation", async () => {
    const result = await handler(["--yes", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.installed.length).toBe(0);
    expect(result.data.skills.skipped.length).toBe(0);
  });

  test("exit code is 0 on success", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.exitCode).toBe(0);
  });
});

describe("Init JSON input mode", () => {
  test("accepts --json= input with business name", async () => {
    const jsonInput = JSON.stringify({ business: "Acme App", goal: "grow" });
    const result = await handler(["--yes", `--json=${jsonInput}`], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.project.name).toBe("Acme App");
    expect(result.data.project.goal).toBe("grow");
  });
});

describe("Init combined flags", () => {
  test("--skip-brand --skip-skills creates minimal result", async () => {
    const result = await handler(["--yes", "--skip-brand", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created).toHaveLength(0);
    expect(result.data.brand.skipped).toHaveLength(0);
    expect(result.data.skills.installed).toHaveLength(0);
  });
});

describe("Init installs agents", () => {
  test("agents are reported in init result", async () => {
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("agents");
    expect(Array.isArray(result.data.agents.installed)).toBe(true);
  });

  test("--skip-agents skips agent installation but keeps skills", async () => {
    const result = await handler(["--yes", "--skip-agents"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Agents should be empty
    expect(result.data.agents.installed).toHaveLength(0);
    expect(result.data.agents.skipped).toHaveLength(0);
    // Skills should still install
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
  });

  test("--skip-skills does not skip agents", async () => {
    const result = await handler(["--yes", "--skip-skills"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.installed).toHaveLength(0);
    // Agents should still install
    expect(result.data.agents.installed.length).toBeGreaterThan(0);
  });
});

describe("Init uses the bundled install by default (delegation is opt-in)", () => {
  test("ignores ai-agent-skills on PATH without MKTG_USE_AI_AGENT_SKILLS=1", async () => {
    const logFile = join(tempDir, "ai-agent-skills-optout.log");
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\nprintf '%s\\n' "$@" > ${logFile}\nexit 0\n`);
    delete process.env.MKTG_USE_AI_AGENT_SKILLS;

    try {
      const result = await handler(["--yes", "--skip-brand", "--skip-agents"], flags);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Shim must never have been invoked; skills come from the bundle.
      expect(await Bun.file(logFile).exists()).toBe(false);
      expect(result.data.skills.installed.length).toBeGreaterThan(40);
    } finally {
      await rm(shimDir, { recursive: true, force: true });
    }
  });
});

describe("Init delegates skill installation to ai-agent-skills when available", () => {
  test("delegates to ai-agent-skills mktg in JSON mode", async () => {
    const logFile = join(tempDir, "ai-agent-skills.log");
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\nprintf '%s\\n' \"$@\" > ${logFile}\nexit 0\n`);

    try {
      const result = await withOneSkillMissing(() => handler(["--yes", "--skip-brand", "--skip-agents"], flags));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const logged = await Bun.file(logFile).text();
      expect(logged).toContain("mktg");
      expect(logged).toContain("--format");
      expect(logged).toContain("json");
      expect(result.data.skills.installed.length).toBeGreaterThan(40);
      expect(result.data.skills.failed).toHaveLength(0);
      expect(result.data.skills.upToDate).toBe(false);
    } finally {
      await rm(shimDir, { recursive: true, force: true });
    }
  });

  test("delegated init preserves dry-run semantics", async () => {
    const logFile = join(tempDir, "ai-agent-skills-dry-run.log");
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\nprintf '%s\\n' \"$@\" > ${logFile}\nexit 0\n`);

    try {
      const dryFlags = { ...flags, dryRun: true };
      const result = await withOneSkillMissing(() => handler(["--yes", "--skip-brand", "--skip-agents"], dryFlags));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const logged = await Bun.file(logFile).text();
      expect(logged).toContain("mktg");
      expect(logged).toContain("--dry-run");
      expect(result.data.skills.installed.length).toBeGreaterThan(40);
    } finally {
      await rm(shimDir, { recursive: true, force: true });
    }
  });

  test("re-run with every skill installed skips delegation (cheap idempotent)", async () => {
    const manifest = await loadManifest();
    const dir = getSkillsInstallDir();
    const allPresent = (await Promise.all(getSkillNames(manifest).map((n) => Bun.file(join(dir, n, "SKILL.md")).exists()))).every(Boolean);
    if (!allPresent) return; // machine without a full install — nothing to assert
    const logFile = join(tempDir, "ai-agent-skills-skip.log");
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\nprintf '%s\\n' \"$@\" > ${logFile}\nexit 0\n`);
    try {
      const result = await handler(["--yes", "--skip-brand", "--skip-agents"], flags);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.skills.upToDate).toBe(true);
      expect(result.data.skills.installed.length).toBeGreaterThan(40);
      // The delegate binary was only probed for --version, never asked to install
      const logged = (await Bun.file(logFile).exists()) ? await Bun.file(logFile).text() : "";
      expect(logged).not.toContain("--format");
    } finally {
      await rm(shimDir, { recursive: true, force: true });
    }
  });

  test("hung delegate is bounded by a timeout and reports SKILL_INSTALL_TIMEOUT", async () => {
    // Shim answers --version, then hangs on the install call. With a 1s
    // timeout the delegate must be killed and reported as a structured
    // failure (init then falls back to the bundled direct install).
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\ncase "$1" in --version) echo 1.0.0; exit 0;; esac\nsleep 600\n`);
    process.env.MKTG_SKILL_INSTALL_TIMEOUT_MS = "1000";
    try {
      const { installSkillsWithAiAgentSkills } = await import("../src/core/skills");
      const start = Date.now();
      const res = await withOneSkillMissing(async () => installSkillsWithAiAgentSkills(await loadManifest(), true));
      expect(Date.now() - start).toBeLessThan(10_000);
      expect(res.delegated).toBe(false);
      expect(res.failed[0]?.reason).toContain("SKILL_INSTALL_TIMEOUT");
    } finally {
      delete process.env.MKTG_SKILL_INSTALL_TIMEOUT_MS;
      await rm(shimDir, { recursive: true, force: true });
    }
  });

  test("falls back to direct install when ai-agent-skills is unavailable", async () => {
    const emptyBinDir = await mkdtemp(join(tmpdir(), "mktg-empty-bin-"));
    process.env.PATH = emptyBinDir;

    try {
      const result = await handler(["--yes", "--skip-brand", "--skip-agents"], flags);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.skills.installed.length).toBeGreaterThan(40);
      expect(result.data.skills.failed).toHaveLength(0);
    } finally {
      await rm(emptyBinDir, { recursive: true, force: true });
    }
  });

  test("delegating skills does not skip agent installation", async () => {
    const shimDir = await createAiAgentSkillsShim(`#!/bin/sh\nexit 0\n`);

    try {
      const result = await handler(["--yes", "--skip-brand"], flags);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.skills.installed.length).toBeGreaterThan(40);
      expect(result.data.agents.installed.length).toBeGreaterThan(0);
    } finally {
      await rm(shimDir, { recursive: true, force: true });
    }
  });
});

describe("Init idempotency", () => {
  test("triple re-init produces consistent results", async () => {
    await handler(["--yes"], flags);
    await handler(["--yes"], flags);
    const result = await handler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Brand files should all be skipped on re-run
    expect(result.data.brand.created).toHaveLength(0);
    expect(result.data.brand.skipped).toHaveLength(10);
    // Skills still install (overwrite is normal)
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
  });
});

describe("Init non-TTY first-run DX", () => {
  // Regression for the 0.1.0 Quick Start break:
  // `npm i -g marketing-cli && mktg init` runs in a shell pipeline where
  // stdout is not a TTY. The previous code path returned MISSING_INPUT
  // (exit 2) there. After the fix, non-TTY with no --json and no --yes
  // auto-derives defaults and succeeds, same path as --yes.
  test("non-TTY with no flags auto-derives defaults and succeeds", async () => {
    // bun test captures stdout, so process.stdout.isTTY is already falsy.
    // Calling the handler directly with no --yes / no --json exercises
    // the non-TTY fallthrough.
    const result = await handler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brand.created.length).toBeGreaterThan(0);
    expect(result.data.skills.installed.length).toBeGreaterThan(0);
    expect(result.data.project.name).toBeTruthy();
    expect(result.data.project.goal).toBe("launch");
  });
});
