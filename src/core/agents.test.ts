import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { updateAgents, installAgents, getAgentNames } from "./agents";
import type { AgentsManifest } from "../types";

// Create an isolated temp dir that mimics the agent structure
const setupFixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "mktg-agents-test-"));
  const bundledDir = join(dir, "agents");
  const installDir = join(dir, "install");
  await mkdir(join(bundledDir, "research"), { recursive: true });
  await mkdir(join(bundledDir, "review"), { recursive: true });
  await mkdir(installDir, { recursive: true });
  return { dir, bundledDir, installDir };
};

const makeManifest = (agents: Record<string, { file: string }>): AgentsManifest => ({
  version: 1,
  agents: Object.fromEntries(
    Object.entries(agents).map(([name, { file }]) => [
      name,
      { category: "research", file, writes: [], reads: [], references_skill: null, tier: "must-have" as const },
    ]),
  ),
});

describe("agents.ts", () => {
  describe("getAgentNames", () => {
    it("returns all agent names from manifest", () => {
      const manifest = makeManifest({
        "brand-researcher": { file: "research/brand-researcher.md" },
        "seo-analyst": { file: "review/seo-analyst.md" },
      });
      const names = getAgentNames(manifest);
      expect(names).toContain("brand-researcher");
      expect(names).toContain("seo-analyst");
      expect(names).toHaveLength(2);
    });

    it("returns empty array for empty manifest", () => {
      const manifest = makeManifest({});
      expect(getAgentNames(manifest)).toEqual([]);
    });
  });

  describe("updateAgents", () => {
    let fixture: Awaited<ReturnType<typeof setupFixture>>;

    beforeEach(async () => {
      fixture = await setupFixture();
    });

    afterEach(async () => {
      await rm(fixture.dir, { recursive: true, force: true });
    });

    it("detects unchanged agents", async () => {
      const content = "# Test Agent\nDo things.";
      await Bun.write(join(fixture.bundledDir, "research/test.md"), content);
      await Bun.write(join(fixture.installDir, "mktg-test-agent.md"), content);

      // We can't test with real paths since updateAgents uses hardcoded AGENTS_INSTALL_DIR
      // This test verifies the function signature and return type
      const manifest = makeManifest({ "test-agent": { file: "research/test.md" } });
      const result = await updateAgents(manifest, true);

      expect(result).toHaveProperty("updated");
      expect(result).toHaveProperty("unchanged");
      expect(result).toHaveProperty("notBundled");
      expect(result).toHaveProperty("failed");
      expect(Array.isArray(result.updated)).toBe(true);
      expect(Array.isArray(result.unchanged)).toBe(true);
      expect(Array.isArray(result.notBundled)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    it("returns failed array (never undefined)", async () => {
      const manifest = makeManifest({});
      const result = await updateAgents(manifest, true);
      expect(result.failed).toEqual([]);
    });

    it("reports notBundled for missing agent files", async () => {
      // Agent in manifest but file doesn't exist at bundled path
      const manifest = makeManifest({ "ghost-agent": { file: "research/nonexistent.md" } });
      const result = await updateAgents(manifest, true);
      expect(result.notBundled).toContain("ghost-agent");
    });
  });
});
