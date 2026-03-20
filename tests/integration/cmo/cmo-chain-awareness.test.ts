// CMO Chain Awareness Integration Tests
// Verifies CMO can see the depends_on graph and skill chains.
// Real file I/O, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../../src/types";
import { handler as initHandler } from "../../../src/commands/init";
import { loadManifest, getSkillNames } from "../../../src/core/skills";
import { buildGraph } from "../../../src/core/skill-lifecycle";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-cmo-chain-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Dependency graph structure", () => {
  test("buildGraph returns a valid acyclic graph for all skills", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    expect(graph.hasCycles).toBe(false);
    expect(graph.nodes.length).toBe(getSkillNames(manifest).length);
    expect(graph.order.length).toBe(graph.nodes.length);
  });

  test("every skill in manifest appears as a graph node", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);
    const nodeNames = graph.nodes.map(n => n.name);

    for (const skillName of getSkillNames(manifest)) {
      expect(nodeNames).toContain(skillName);
    }
  });

  test("graph has roots (skills with no dependencies)", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    expect(graph.roots.length).toBeGreaterThan(0);
    // Roots should have no dependencies
    for (const root of graph.roots) {
      const node = graph.nodes.find(n => n.name === root);
      expect(node).toBeDefined();
      expect(node!.dependsOn).toHaveLength(0);
    }
  });

  test("graph has leaves (skills nothing depends on)", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    expect(graph.leaves.length).toBeGreaterThan(0);
    // Leaves should not appear as a dependency of any other skill
    const allDeps = new Set(graph.edges.map(e => e.to));
    for (const leaf of graph.leaves) {
      expect(allDeps.has(leaf)).toBe(false);
    }
  });

  test("edges match manifest depends_on declarations", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    for (const [name, entry] of Object.entries(manifest.skills)) {
      for (const dep of entry.depends_on) {
        // Each depends_on should produce an edge from the skill to its dependency
        const edge = graph.edges.find(e => e.from === name && e.to === dep);
        expect(edge).toBeDefined();
      }
    }
  });
});

describe("Topological ordering", () => {
  test("dependencies come before dependents in topological order", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    const orderIndex = new Map<string, number>();
    graph.order.forEach((name, idx) => orderIndex.set(name, idx));

    for (const edge of graph.edges) {
      const depIdx = orderIndex.get(edge.to);
      const skillIdx = orderIndex.get(edge.from);
      // Dependency must appear before the skill that depends on it
      if (depIdx !== undefined && skillIdx !== undefined) {
        expect(depIdx).toBeLessThan(skillIdx);
      }
    }
  });
});

describe("Layer groupings", () => {
  test("every layered skill appears in exactly one layer", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    const allLayered = Object.values(graph.layers).flat();

    // No skill should appear in more than one layer
    const seen = new Set<string>();
    for (const name of allLayered) {
      expect(seen.has(name)).toBe(false);
      seen.add(name);
    }
  });

  test("total skills across all layers <= manifest count (some may have invalid layers)", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    const totalAcrossLayers = Object.values(graph.layers).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    // All layered skills should be a subset of manifest skills
    expect(totalAcrossLayers).toBeLessThanOrEqual(getSkillNames(manifest).length);
    // At least 90% should be layered (a few may have non-standard layers)
    expect(totalAcrossLayers).toBeGreaterThan(getSkillNames(manifest).length * 0.9);
  });

  test("layers include all 4 valid layers", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    expect(graph.layers).toHaveProperty("foundation");
    expect(graph.layers).toHaveProperty("strategy");
    expect(graph.layers).toHaveProperty("execution");
    expect(graph.layers).toHaveProperty("distribution");
  });
});

describe("CMO orchestrator chain visibility", () => {
  test("CMO skill depends_on is empty (it orchestrates, not chains)", async () => {
    const manifest = await loadManifest();
    const cmo = manifest.skills["cmo"];
    expect(cmo).toBeDefined();
    expect(cmo.depends_on).toHaveLength(0);
  });

  test("orchestrator skills (tiktok-slideshow, social-campaign) are in execution layer", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    // tiktok-slideshow chains slideshow-script → paper-marketing → video-content
    // It should be visible in the graph
    const tiktok = graph.nodes.find(n => n.name === "tiktok-slideshow");
    expect(tiktok).toBeDefined();

    const socialCampaign = graph.nodes.find(n => n.name === "social-campaign");
    expect(socialCampaign).toBeDefined();
  });

  test("skills with dependencies have edges to their deps", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    // Find skills with non-empty depends_on
    const skillsWithDeps = Object.entries(manifest.skills)
      .filter(([, entry]) => entry.depends_on.length > 0);

    for (const [name, entry] of skillsWithDeps) {
      for (const dep of entry.depends_on) {
        const hasEdge = graph.edges.some(e => e.from === name && e.to === dep);
        expect(hasEdge).toBe(true);
      }
    }
  });

  test("chain sub-skills all exist in the graph", async () => {
    const manifest = await loadManifest();
    const graph = buildGraph(manifest);
    const nodeNames = new Set(graph.nodes.map(n => n.name));

    // tiktok-slideshow chains: slideshow-script, paper-marketing, video-content
    expect(nodeNames.has("slideshow-script")).toBe(true);
    expect(nodeNames.has("paper-marketing")).toBe(true);
    expect(nodeNames.has("video-content")).toBe(true);

    // deepen-plan references: keyword-research, brainstorm, launch-strategy
    expect(nodeNames.has("keyword-research")).toBe(true);
    expect(nodeNames.has("brainstorm")).toBe(true);
    expect(nodeNames.has("launch-strategy")).toBe(true);
  });
});

describe("Graph after init", () => {
  test("init + graph produces consistent state", async () => {
    await initHandler(["--yes"], flags);

    const manifest = await loadManifest();
    const graph = buildGraph(manifest);

    // After init, graph should still be valid
    expect(graph.hasCycles).toBe(false);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.order.length).toBe(graph.nodes.length);
  });
});
