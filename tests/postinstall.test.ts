import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const POSTINSTALL = join(import.meta.dir, "..", "scripts", "postinstall.cjs");
const ROOT = join(import.meta.dir, "..");

const isolatedHomeEnv = (home: string): NodeJS.ProcessEnv => {
  const env = { ...process.env, HOME: home };
  // These orb/CI variables describe the outer shell, not the test child.
  // Leaving them set makes postinstall correctly choose the real sudo user's
  // home instead of the isolated HOME this test is exercising.
  delete env.SUDO_USER;
  delete env.SUDO_UID;
  delete env.SUDO_GID;
  delete env.SUDO_COMMAND;
  return env;
};

const loadManifestSkillCount = async (): Promise<number> => {
  const manifest = JSON.parse(await readFile(join(ROOT, "skills-manifest.json"), "utf-8"));
  return Object.keys(manifest.skills).length;
};

const loadManifestAgentCount = async (): Promise<number> => {
  const manifest = JSON.parse(await readFile(join(ROOT, "agents-manifest.json"), "utf-8"));
  // Agent manifests historically used either an `agents` array or a top-level
  // map. Handle both shapes so the count stays in sync without a hardcoded
  // expected value.
  if (Array.isArray(manifest.agents)) return manifest.agents.length;
  if (manifest.agents && typeof manifest.agents === "object") return Object.keys(manifest.agents).length;
  return 0;
};

const countSkillFiles = async (home: string): Promise<number> => {
  const skillsDir = join(home, ".claude", "skills");
  if (!existsSync(skillsDir)) return 0;

  const entries = await readdir(skillsDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (existsSync(join(skillsDir, entry.name, "SKILL.md"))) count += 1;
  }
  return count;
};

const countAgentFiles = async (home: string): Promise<number> => {
  const agentsDir = join(home, ".claude", "agents");
  if (!existsSync(agentsDir)) return 0;

  const entries = await readdir(agentsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && /^mktg-.*\.md$/.test(entry.name)).length;
};

describe("npm postinstall", () => {
  test("global install copies bundled skills and agents into Claude directories", async () => {
    const home = await mkdtemp(join(tmpdir(), "mktg-postinstall-home-"));

    const result = spawnSync("node", [POSTINSTALL], {
      encoding: "utf8",
      env: {
        ...isolatedHomeEnv(home),
        MKTG_POSTINSTALL_FORCE: "1",
        MKTG_POSTINSTALL_QUIET: "1",
      },
    });

    expect(result.status).toBe(0);
    // Read counts dynamically from the manifests so the test self-updates when
    // a skill or agent is added/removed instead of failing with a hardcoded number.
    const expectedSkills = await loadManifestSkillCount();
    const expectedAgents = await loadManifestAgentCount();
    expect(await countSkillFiles(home)).toBe(expectedSkills);
    expect(await countAgentFiles(home)).toBe(expectedAgents);
    expect(existsSync(join(home, ".claude", "skills", "cmo", "SKILL.md"))).toBe(true);
    expect(existsSync(join(home, ".claude", "agents", "mktg-brand-researcher.md"))).toBe(true);
  });

  test("non-global install is side-effect free", async () => {
    const home = await mkdtemp(join(tmpdir(), "mktg-postinstall-home-"));

    const result = spawnSync("node", [POSTINSTALL], {
      encoding: "utf8",
      env: {
        ...isolatedHomeEnv(home),
        npm_config_global: "false",
        MKTG_POSTINSTALL_QUIET: "1",
      },
    });

    expect(result.status).toBe(0);
    expect(await countSkillFiles(home)).toBe(0);
    expect(await countAgentFiles(home)).toBe(0);
  });
  // A global install must not install another vendor's package unless asked.
  // An executable named `npm` placed first on PATH records its arguments, so
  // the test observes whether postinstall really invoked `npm i -g ...`
  // without touching the real global prefix or the network.
  const withRecordingNpm = async (): Promise<{ home: string; binDir: string; record: string }> => {
    const home = await mkdtemp(join(tmpdir(), "mktg-postinstall-optional-"));
    const binDir = join(home, "bin");
    const record = join(home, "npm-calls.log");
    await mkdir(binDir, { recursive: true });
    const script = `#!/bin/sh\necho "$@" >> "${record}"\n`;
    await writeFile(join(binDir, "npm"), script);
    await chmod(join(binDir, "npm"), 0o755);
    return { home, binDir, record };
  };

  test("global install does not install optional third-party CLIs by default", async () => {
    const { home, binDir, record } = await withRecordingNpm();

    const result = spawnSync("node", [POSTINSTALL], {
      encoding: "utf8",
      env: {
        ...isolatedHomeEnv(home),
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
        MKTG_POSTINSTALL_FORCE: "1",
      },
    });

    expect(result.status).toBe(0);
    expect(existsSync(record)).toBe(false);
    expect(result.stderr).toContain("optional: `npm i -g @higgsfield/cli`");
  });

  test("MKTG_INSTALL_OPTIONAL_DEPS=1 opts in to installing optional CLIs", async () => {
    const { home, binDir, record } = await withRecordingNpm();

    const result = spawnSync("node", [POSTINSTALL], {
      encoding: "utf8",
      env: {
        ...isolatedHomeEnv(home),
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
        MKTG_POSTINSTALL_FORCE: "1",
        MKTG_INSTALL_OPTIONAL_DEPS: "1",
      },
    });

    expect(result.status).toBe(0);
    expect((await readFile(record, "utf-8")).trim()).toBe("i -g @higgsfield/cli");
  });
});
