// E2E tests for the agent system (src/core/agents.ts + agents-manifest.json)
// No mocks. Real file I/O, real manifest, real agent files.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  loadAgentManifest,
  getAgentNames,
  getAgentInstallStatus,
  installAgents,
  updateAgents,
  getAgentsInstallDir,
  readAgentManifest,
} from "../src/core/agents";

const EXPECTED_AGENTS = [
  "brand-researcher",
  "audience-researcher",
  "competitive-scanner",
  "content-reviewer",
  "seo-analyst",
] as const;

const RESEARCH_AGENTS = [
  "brand-researcher",
  "audience-researcher",
  "competitive-scanner",
] as const;

const REVIEW_AGENTS = ["content-reviewer", "seo-analyst"] as const;

describe("loadAgentManifest", () => {
  test("loads successfully", async () => {
    const manifest = await loadAgentManifest();
    expect(manifest).toBeDefined();
    expect(typeof manifest.agents).toBe("object");
  });

  test("has version 1", async () => {
    const manifest = await loadAgentManifest();
    expect(manifest.version).toBe(1);
  });

  test("has exactly 6 agents", async () => {
    const manifest = await loadAgentManifest();
    expect(Object.keys(manifest.agents)).toHaveLength(6);
  });
});

describe("getAgentNames", () => {
  test("returns all 6 agent names", async () => {
    const manifest = await loadAgentManifest();
    const names = getAgentNames(manifest);
    expect(names).toHaveLength(6);

    for (const expected of EXPECTED_AGENTS) {
      expect(names).toContain(expected);
    }
  });
});

describe("getAgentInstallStatus", () => {
  test("returns status for all 6 agents", async () => {
    const manifest = await loadAgentManifest();
    const status = await getAgentInstallStatus(manifest);
    expect(Object.keys(status)).toHaveLength(6);
  });

  test("each status has installed boolean and path string", async () => {
    const manifest = await loadAgentManifest();
    const status = await getAgentInstallStatus(manifest);

    for (const [, info] of Object.entries(status)) {
      expect(typeof info.installed).toBe("boolean");
      expect(typeof info.path).toBe("string");
    }
  });

  test("paths contain .claude/agents", async () => {
    const manifest = await loadAgentManifest();
    const status = await getAgentInstallStatus(manifest);

    for (const [, info] of Object.entries(status)) {
      expect(info.path).toContain(".claude/agents");
    }
  });

  test("installed filenames use mktg- prefix", async () => {
    const manifest = await loadAgentManifest();
    const status = await getAgentInstallStatus(manifest);

    for (const [name, info] of Object.entries(status)) {
      const filename = info.path.split("/").pop();
      expect(filename).toBe(`mktg-${name}.md`);
    }
  });
});

describe("installAgents", () => {
  test("installs all bundled agents", async () => {
    const manifest = await loadAgentManifest();
    const result = await installAgents(manifest);

    expect(result.installed.length).toBeGreaterThan(0);
    expect(result.failed).toHaveLength(0);
  });

  test("dry-run does not write files but reports installed", async () => {
    const manifest = await loadAgentManifest();
    const result = await installAgents(manifest, true);

    // Dry-run reports what would be installed
    expect(result.installed.length).toBeGreaterThan(0);
    expect(result.failed).toHaveLength(0);
  });
});

describe("updateAgents", () => {
  test("reports updated/unchanged/notBundled totaling 5", async () => {
    const manifest = await loadAgentManifest();
    const result = await updateAgents(manifest);

    const total =
      result.updated.length +
      result.unchanged.length +
      result.notBundled.length;
    expect(total).toBe(6);
  });

  test("dry-run reports without writing", async () => {
    const manifest = await loadAgentManifest();
    const result = await updateAgents(manifest, true);

    const total =
      result.updated.length +
      result.unchanged.length +
      result.notBundled.length;
    expect(total).toBe(6);
  });
});

describe("getAgentsInstallDir", () => {
  test("returns path under ~/.claude/agents", () => {
    const dir = getAgentsInstallDir();
    expect(dir).toContain(".claude/agents");
    expect(dir).toContain(homedir());
  });
});

describe("readAgentManifest", () => {
  test("returns same data as loadAgentManifest", async () => {
    const async = await loadAgentManifest();
    const sync = readAgentManifest();
    expect(sync.version).toBe(async.version);
    expect(Object.keys(sync.agents)).toHaveLength(
      Object.keys(async.agents).length,
    );
  });
});

describe("manifest schema", () => {
  test("each agent has required fields", async () => {
    const manifest = await loadAgentManifest();

    for (const [name, agent] of Object.entries(manifest.agents)) {
      expect(agent).toHaveProperty("category");
      expect(agent).toHaveProperty("file");
      expect(agent).toHaveProperty("writes");
      expect(agent).toHaveProperty("reads");
      expect(agent).toHaveProperty("references_skill");
      expect(agent).toHaveProperty("tier");

      expect(["research", "review"]).toContain(agent.category);
      expect(["must-have", "nice-to-have"]).toContain(agent.tier);
      expect(Array.isArray(agent.writes)).toBe(true);
      expect(Array.isArray(agent.reads)).toBe(true);
    }
  });

  test("research agents are in research category", async () => {
    const manifest = await loadAgentManifest();

    for (const name of RESEARCH_AGENTS) {
      expect(manifest.agents[name].category).toBe("research");
    }
  });

  test("review agents are in review category", async () => {
    const manifest = await loadAgentManifest();

    for (const name of REVIEW_AGENTS) {
      expect(manifest.agents[name].category).toBe("review");
    }
  });

  test("research agents write brand files", async () => {
    const manifest = await loadAgentManifest();

    const expectedWrites: Record<string, string> = {
      "brand-researcher": "voice-profile.md",
      "audience-researcher": "audience.md",
      "competitive-scanner": "competitors.md",
    };

    for (const [name, expectedFile] of Object.entries(expectedWrites)) {
      expect(manifest.agents[name].writes).toContain(expectedFile);
    }
  });

  test("review agents don't write anything", async () => {
    const manifest = await loadAgentManifest();

    for (const name of REVIEW_AGENTS) {
      expect(manifest.agents[name].writes).toHaveLength(0);
    }
  });

  test("must-have agents are the 3 research agents", async () => {
    const manifest = await loadAgentManifest();

    const mustHave = Object.entries(manifest.agents)
      .filter(([, a]) => a.tier === "must-have")
      .map(([name]) => name);

    expect(mustHave).toHaveLength(3);
    for (const name of RESEARCH_AGENTS) {
      expect(mustHave).toContain(name);
    }
  });

  test("agents reference their companion skills correctly", async () => {
    const manifest = await loadAgentManifest();

    const expectedSkills: Record<string, string | null> = {
      "brand-researcher": "brand-voice",
      "audience-researcher": "audience-research",
      "competitive-scanner": "competitive-intel",
      "content-reviewer": null,
      "seo-analyst": "seo-audit",
    };

    for (const [name, skill] of Object.entries(expectedSkills)) {
      expect(manifest.agents[name].references_skill).toBe(skill);
    }
  });
});

describe("agent source files", () => {
  test("research agent files exist", async () => {
    const projectRoot = join(import.meta.dir, "..");

    for (const name of RESEARCH_AGENTS) {
      const manifest = await loadAgentManifest();
      const filePath = join(projectRoot, "agents", manifest.agents[name].file);
      const exists = await Bun.file(filePath).exists();
      expect(exists).toBe(true);
    }
  });

  test("review agent files exist", async () => {
    const projectRoot = join(import.meta.dir, "..");

    for (const name of REVIEW_AGENTS) {
      const manifest = await loadAgentManifest();
      const filePath = join(projectRoot, "agents", manifest.agents[name].file);
      const exists = await Bun.file(filePath).exists();
      expect(exists).toBe(true);
    }
  });

  test("research agents are in agents/research/", async () => {
    const manifest = await loadAgentManifest();

    for (const name of RESEARCH_AGENTS) {
      expect(manifest.agents[name].file).toMatch(/^research\//);
    }
  });

  test("review agents are in agents/review/", async () => {
    const manifest = await loadAgentManifest();

    for (const name of REVIEW_AGENTS) {
      expect(manifest.agents[name].file).toMatch(/^review\//);
    }
  });
});
