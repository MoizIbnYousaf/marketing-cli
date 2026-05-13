// CMO Agent Spawning Tests
// Proves CMO can discover all 6 agents and knows when to spawn research vs review.
// Real manifest reads, no mocks.

import { describe, test, expect } from "bun:test";
import { loadAgentManifest, getAgentNames } from "../../../src/core/agents";
import { loadManifest } from "../../../src/core/skills";
import type { AgentsManifest } from "../../../src/types";

const EXPECTED_AGENTS = [
  "brand-researcher",
  "audience-researcher",
  "competitive-scanner",
  "content-reviewer",
  "seo-analyst",
];

const RESEARCH_AGENTS = ["brand-researcher", "audience-researcher", "competitive-scanner"];
const REVIEW_AGENTS = ["content-reviewer", "seo-analyst"];

describe("CMO Agent Discovery", () => {
  test("discovers all 6 agents from manifest", async () => {
    const manifest = await loadAgentManifest();
    const names = getAgentNames(manifest);

    expect(names.length).toBe(6);
    for (const expected of EXPECTED_AGENTS) {
      expect(names).toContain(expected);
    }
  });

  test("each agent has category, file, writes, reads, and tier", async () => {
    const manifest = await loadAgentManifest();

    for (const name of getAgentNames(manifest)) {
      const agent = manifest.agents[name]!;
      expect(agent).toHaveProperty("category");
      expect(agent).toHaveProperty("file");
      expect(agent).toHaveProperty("writes");
      expect(agent).toHaveProperty("reads");
      expect(agent).toHaveProperty("tier");
    }
  });

  test("agent files exist on disk", async () => {
    const manifest = await loadAgentManifest();
    const { getPackageRoot } = await import("../../../src/core/paths");
    const { join } = await import("node:path");
    const root = getPackageRoot();

    for (const name of getAgentNames(manifest)) {
      const agent = manifest.agents[name]!;
      const agentPath = join(root, "agents", agent.file);
      const exists = await Bun.file(agentPath).exists();
      expect(exists).toBe(true);
    }
  });
});

describe("CMO Research vs Review Classification", () => {
  test("3 research agents write brand files", async () => {
    const manifest = await loadAgentManifest();

    for (const name of RESEARCH_AGENTS) {
      const agent = manifest.agents[name]!;
      expect(agent.category).toBe("research");
      expect(agent.writes.length).toBeGreaterThan(0);
    }
  });

  test("2 review agents write nothing", async () => {
    const manifest = await loadAgentManifest();

    for (const name of REVIEW_AGENTS) {
      const agent = manifest.agents[name]!;
      expect(agent.category).toBe("review");
      expect(agent.writes.length).toBe(0);
    }
  });

  test("research agents are must-have tier", async () => {
    const manifest = await loadAgentManifest();

    for (const name of RESEARCH_AGENTS) {
      expect(manifest.agents[name]!.tier).toBe("must-have");
    }
  });

  test("review agents are nice-to-have tier", async () => {
    const manifest = await loadAgentManifest();

    for (const name of REVIEW_AGENTS) {
      expect(manifest.agents[name]!.tier).toBe("nice-to-have");
    }
  });
});

describe("CMO Agent-Skill Linkage", () => {
  test("research agents reference foundation skills", async () => {
    const agentManifest = await loadAgentManifest();
    const skillManifest = await loadManifest();

    const expectedLinks: Record<string, string> = {
      "brand-researcher": "brand-voice",
      "audience-researcher": "audience-research",
      "competitive-scanner": "competitive-intel",
    };

    for (const [agentName, skillName] of Object.entries(expectedLinks)) {
      const agent = agentManifest.agents[agentName]!;
      expect(agent.references_skill).toBe(skillName);
      // The referenced skill must exist in manifest
      expect(skillManifest.skills[skillName]).toBeDefined();
    }
  });

  test("agent writes align with skill writes", async () => {
    const agentManifest = await loadAgentManifest();
    const skillManifest = await loadManifest();

    // brand-researcher writes voice-profile.md, brand-voice skill also writes voice-profile.md
    const brandResearcher = agentManifest.agents["brand-researcher"]!;
    const brandVoiceSkill = skillManifest.skills["brand-voice"]!;
    expect(brandResearcher.writes).toContain("voice-profile.md");
    expect(brandVoiceSkill.writes).toContain("voice-profile.md");

    // audience-researcher writes audience.md, audience-research skill writes audience.md
    const audienceResearcher = agentManifest.agents["audience-researcher"]!;
    const audienceSkill = skillManifest.skills["audience-research"]!;
    expect(audienceResearcher.writes).toContain("audience.md");
    expect(audienceSkill.writes).toContain("audience.md");

    // competitive-scanner writes competitors.md, competitive-intel writes competitors.md
    const compScanner = agentManifest.agents["competitive-scanner"]!;
    const compSkill = skillManifest.skills["competitive-intel"]!;
    expect(compScanner.writes).toContain("competitors.md");
    expect(compSkill.writes).toContain("competitors.md");
  });
});

describe("CMO Spawning Decision Logic", () => {
  test("first-run scenario: CMO should spawn all 3 research agents", async () => {
    const manifest = await loadAgentManifest();
    // When brand files are missing (first run), CMO spawns all research agents in parallel
    // This test validates the manifest supports that — all 3 are must-have and write distinct files
    const writes = new Set<string>();
    for (const name of RESEARCH_AGENTS) {
      const agent = manifest.agents[name]!;
      for (const w of agent.writes) {
        expect(writes.has(w)).toBe(false); // No write conflicts between research agents
        writes.add(w);
      }
    }
    expect(writes.size).toBe(3); // voice-profile.md, audience.md, competitors.md
  });

  test("review agents read brand files that research agents write", async () => {
    const manifest = await loadAgentManifest();

    // content-reviewer reads voice-profile.md (written by brand-researcher)
    const contentReviewer = manifest.agents["content-reviewer"]!;
    expect(contentReviewer.reads).toContain("voice-profile.md");

    // seo-analyst reads keyword-plan.md and audience.md
    const seoAnalyst = manifest.agents["seo-analyst"]!;
    expect(seoAnalyst.reads).toContain("keyword-plan.md");
    expect(seoAnalyst.reads).toContain("audience.md");
  });

  test("review agents should only spawn after brand files exist", async () => {
    const manifest = await loadAgentManifest();

    // Review agents depend on brand files existing — verify they read files
    // that wouldn't exist on a fresh project
    for (const name of REVIEW_AGENTS) {
      const agent = manifest.agents[name]!;
      expect(agent.reads.length).toBeGreaterThan(0);
      // They don't write anything, so spawning them without data would be wasteful
      expect(agent.writes.length).toBe(0);
    }
  });
});
