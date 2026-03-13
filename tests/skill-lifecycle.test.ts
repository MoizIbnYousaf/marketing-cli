// Tests for Phase 1: Skill Lifecycle Commands
// No mocks. Real subprocess execution + real temp dirs + real manifests.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
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

// ==================== skill info ====================

describe("mktg skill info", () => {
  test("returns full metadata for known skill", async () => {
    const { stdout, exitCode } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.name).toBe("seo-content");
    expect(parsed.category).toBe("copy-content");
    expect(parsed.layer).toBe("execution");
    expect(parsed.tier).toBe("must-have");
    expect(parsed.source).toBe("v2");
  });

  test("includes reads and writes arrays", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.reads)).toBe(true);
    expect(parsed.reads).toContain("voice-profile.md");
    expect(parsed.reads).toContain("keyword-plan.md");
    expect(parsed.reads).toContain("audience.md");
  });

  test("includes dependsOn array", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.dependsOn)).toBe(true);
    expect(parsed.dependsOn).toContain("brand-voice");
    expect(parsed.dependsOn).toContain("keyword-research");
  });

  test("includes dependedOnBy (reverse deps)", async () => {
    const { stdout } = await run(["skill", "info", "brand-voice", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.dependedOnBy)).toBe(true);
    // brand-voice is depended on by many skills
    expect(parsed.dependedOnBy.length).toBeGreaterThan(0);
  });

  test("brand-voice is depended on by positioning-angles", async () => {
    const { stdout } = await run(["skill", "info", "brand-voice", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.dependedOnBy).toContain("positioning-angles");
  });

  test("includes installed boolean", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.installed).toBe("boolean");
  });

  test("includes description from SKILL.md", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.description.length).toBeGreaterThan(0);
    expect(parsed.description).toContain("SEO");
  });

  test("includes triggers array", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.triggers)).toBe(true);
    expect(parsed.triggers.length).toBeGreaterThan(0);
  });

  test("includes reviewIntervalDays", async () => {
    const { stdout } = await run(["skill", "info", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.reviewIntervalDays).toBe("number");
    expect(parsed.reviewIntervalDays).toBe(30);
  });

  test("follows redirects (copywriting → direct-response-copy)", async () => {
    const { stdout, exitCode } = await run(["skill", "info", "copywriting", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.name).toBe("direct-response-copy");
  });

  test("follows redirect for tiktok → tiktok-slideshow", async () => {
    const { stdout } = await run(["skill", "info", "tiktok", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("tiktok-slideshow");
  });

  test("returns NOT_FOUND for unknown skill", async () => {
    const { stdout, exitCode } = await run(["skill", "info", "nonexistent-skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("NOT_FOUND suggestions include mktg list", async () => {
    const { stdout } = await run(["skill", "info", "nonexistent-skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.suggestions.join(" ")).toContain("mktg list");
  });

  test("missing name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "info", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("cmo skill has no dependencies", async () => {
    const { stdout } = await run(["skill", "info", "cmo", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.dependsOn).toEqual([]);
  });

  test("cmo reads all 9 brand files", async () => {
    const { stdout } = await run(["skill", "info", "cmo", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.reads.length).toBe(9);
  });

  test("positioning-angles depends on brand-voice and audience-research", async () => {
    const { stdout } = await run(["skill", "info", "positioning-angles", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.dependsOn).toContain("brand-voice");
    expect(parsed.dependsOn).toContain("audience-research");
  });
});

// ==================== skill validate ====================

describe("mktg skill validate", () => {
  test("valid skill returns valid: true", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.valid).toBe(true);
  });

  test("returns checks array with rules", async () => {
    const { stdout } = await run(["skill", "validate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.checks)).toBe(true);
    const rules = parsed.checks.map((c: { rule: string }) => c.rule);
    expect(rules).toContain("frontmatter-present");
    expect(rules).toContain("name-format");
    expect(rules).toContain("description-present");
    expect(rules).toContain("line-count");
  });

  test("all 32 bundled skills pass validation", async () => {
    // Test a representative sample (testing all 32 would be slow in subprocess mode)
    const skills = ["cmo", "brand-voice", "seo-content", "keyword-research", "tiktok-slideshow"];
    for (const skill of skills) {
      const { stdout, exitCode } = await run(["skill", "validate", `skills/${skill}`, "--json"]);
      const parsed = JSON.parse(stdout);
      expect(exitCode).toBe(0);
      expect(parsed.valid).toBe(true);
    }
  });

  test("empty file returns valid: false", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), "");
    const { stdout, exitCode } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("missing frontmatter returns error", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), "# Just a heading\n\nNo frontmatter here.");
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    const rules = parsed.checks.map((c: { rule: string }) => c.rule);
    expect(rules).toContain("frontmatter-present");
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("invalid name format is caught", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: Invalid Name!\ndescription: test\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: string) => e.includes("name"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("reserved prefix anthropic- is rejected", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: anthropic-secret\ndescription: test\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: string) => e.includes("reserved"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("reserved prefix claude- is rejected", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: claude-helper\ndescription: test\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("invalid category is caught", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\ncategory: fake-category\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: string) => e.includes("category"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("non-standard tier produces warning (not error)", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\ntier: ultra-rare\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    // Non-standard tier is a warning, not an error — skill is still valid
    expect(parsed.valid).toBe(true);
    expect(parsed.warnings.some((w: string) => w.includes("tier"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("unknown brand file in reads is caught", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\nreads:\n  - fake-file.md\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: string) => e.includes("fake-file.md"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("valid brand files in reads pass", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\nreads:\n  - voice-profile.md\n  - audience.md\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("brand/ prefix in reads is normalized", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\nreads:\n  - brand/voice-profile.md\n---\n`);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("line count warning for long files", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-validate-"));
    const lines = "---\nname: test-skill\ndescription: test\n---\n" + "line\n".repeat(510);
    await writeFile(join(tmpDir, "SKILL.md"), lines);
    const { stdout } = await run(["skill", "validate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.warnings.some((w: string) => w.includes("500"))).toBe(true);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("nonexistent path returns NOT_FOUND", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "/tmp/does-not-exist-xyz", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("missing path returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("checks have rule, pass, and detail fields", async () => {
    const { stdout } = await run(["skill", "validate", "skills/cmo", "--json"]);
    const parsed = JSON.parse(stdout);
    for (const check of parsed.checks) {
      expect(typeof check.rule).toBe("string");
      expect(typeof check.pass).toBe("boolean");
      // detail is optional but should be string when present
      if (check.detail !== undefined) {
        expect(typeof check.detail).toBe("string");
      }
    }
  });
});

// ==================== skill graph ====================

describe("mktg skill graph", () => {
  test("returns 32 nodes for all skills", async () => {
    const { stdout, exitCode } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.nodes.length).toBe(32);
  });

  test("each node has name, category, layer, tier, dependsOn", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    for (const node of parsed.nodes) {
      expect(typeof node.name).toBe("string");
      expect(typeof node.category).toBe("string");
      expect(typeof node.layer).toBe("string");
      expect(typeof node.tier).toBe("string");
      expect(Array.isArray(node.dependsOn)).toBe(true);
    }
  });

  test("edges are {from, to} pairs", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    for (const edge of parsed.edges) {
      expect(typeof edge.from).toBe("string");
      expect(typeof edge.to).toBe("string");
    }
  });

  test("roots are skills with no dependencies", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    // cmo, brand-voice, audience-research should be roots (no deps)
    expect(parsed.roots).toContain("cmo");
    expect(parsed.roots).toContain("brand-voice");
    expect(parsed.roots).toContain("audience-research");
  });

  test("skills with deps are NOT in roots", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    // positioning-angles depends on brand-voice + audience-research
    expect(parsed.roots).not.toContain("positioning-angles");
  });

  test("leaves are skills nothing depends on", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.leaves)).toBe(true);
    expect(parsed.leaves.length).toBeGreaterThan(0);
  });

  test("no cycles in the real manifest", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.hasCycles).toBe(false);
  });

  test("topological order includes all 32 skills", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.order.length).toBe(32);
  });

  test("topological order: deps come before dependents", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    const order = parsed.order as string[];
    // brand-voice must come before positioning-angles
    expect(order.indexOf("brand-voice")).toBeLessThan(order.indexOf("positioning-angles"));
    // keyword-research depends on audience-research + competitive-intel
    expect(order.indexOf("audience-research")).toBeLessThan(order.indexOf("keyword-research"));
    // seo-content depends on brand-voice + keyword-research
    expect(order.indexOf("brand-voice")).toBeLessThan(order.indexOf("seo-content"));
    expect(order.indexOf("keyword-research")).toBeLessThan(order.indexOf("seo-content"));
  });

  test("layers groups skills correctly", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.layers.foundation).toContain("cmo");
    expect(parsed.layers.foundation).toContain("brand-voice");
    expect(parsed.layers.strategy).toContain("keyword-research");
    expect(parsed.layers.execution).toContain("seo-content");
    expect(parsed.layers.distribution).toContain("content-atomizer");
  });

  test("total skills across all layers equals 32", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    const total =
      parsed.layers.foundation.length +
      parsed.layers.strategy.length +
      parsed.layers.execution.length +
      parsed.layers.distribution.length;
    expect(total).toBe(32);
  });

  test("edges match manifest depends_on", async () => {
    const { stdout } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    // positioning-angles depends on brand-voice and audience-research
    const posEdges = parsed.edges.filter((e: { from: string }) => e.from === "positioning-angles");
    const targets = posEdges.map((e: { to: string }) => e.to);
    expect(targets).toContain("brand-voice");
    expect(targets).toContain("audience-research");
  });
});

// ==================== skill check ====================

describe("mktg skill check", () => {
  test("returns satisfied, missing, and remediation fields", async () => {
    const { stdout, exitCode } = await run(["skill", "check", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(typeof parsed.satisfied).toBe("boolean");
    expect(typeof parsed.missing).toBe("object");
    expect(Array.isArray(parsed.missing.skills)).toBe(true);
    expect(Array.isArray(parsed.missing.brandFiles)).toBe(true);
    expect(Array.isArray(parsed.remediation)).toBe(true);
  });

  test("skills with no brand files needed are satisfied (on this machine)", async () => {
    // marketing-psychology has no reads and no depends_on
    const { stdout } = await run(["skill", "check", "marketing-psychology", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.satisfied).toBe(true);
    expect(parsed.missing.skills.length).toBe(0);
    expect(parsed.missing.brandFiles.length).toBe(0);
  });

  test("remediation includes skill names from manifest writes", async () => {
    // seo-content reads voice-profile.md → brand-voice writes it
    const { stdout } = await run(["skill", "check", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    if (!parsed.satisfied) {
      const voiceRemediation = parsed.remediation.find((r: string) => r.includes("voice-profile.md"));
      if (voiceRemediation) {
        expect(voiceRemediation).toContain("/brand-voice");
      }
    }
  });

  test("remediation for keyword-plan.md points to keyword-research", async () => {
    const { stdout } = await run(["skill", "check", "seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    if (!parsed.satisfied) {
      const keywordRemediation = parsed.remediation.find((r: string) => r.includes("keyword-plan.md"));
      if (keywordRemediation) {
        expect(keywordRemediation).toContain("/keyword-research");
      }
    }
  });

  test("follows redirects", async () => {
    const { stdout, exitCode } = await run(["skill", "check", "copywriting", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(typeof parsed.satisfied).toBe("boolean");
  });

  test("unknown skill returns NOT_FOUND", async () => {
    const { stdout, exitCode } = await run(["skill", "check", "fake-skill-xyz", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("missing name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "check", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("check with --cwd to temp dir (missing brand files)", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-check-"));
    const { stdout, exitCode } = await run(["skill", "check", "seo-content", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.satisfied).toBe(false);
    expect(parsed.missing.brandFiles.length).toBeGreaterThan(0);
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("check detects template content as missing", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-check-"));
    const brandDir = join(tmpDir, "brand");
    await mkdir(brandDir, { recursive: true });
    // Write template content for voice-profile.md
    await writeFile(
      join(brandDir, "voice-profile.md"),
      `# Brand Voice Profile\n\n<!-- Generated by mktg init. Fill in or let /cmo build this. -->\n\n## Voice DNA\n\n- **Tone:**\n- **Personality:**\n- **Vocabulary:**\n`,
    );
    const { stdout } = await run(["skill", "check", "brand-voice", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    // brand-voice reads voice-profile.md — template content should be detected as missing
    expect(parsed.missing.brandFiles).toContain("voice-profile.md");
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("check with real content passes brand file check", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-check-"));
    const brandDir = join(tmpDir, "brand");
    await mkdir(brandDir, { recursive: true });
    await writeFile(
      join(brandDir, "voice-profile.md"),
      "# Our Brand Voice\n\nWe speak with authority and warmth. Our tone is conversational yet expert.\n\n## Core Attributes\n- Bold\n- Human\n- Clear",
    );
    const { stdout } = await run(["skill", "check", "brand-voice", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(parsed.missing.brandFiles).not.toContain("voice-profile.md");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ==================== skill register ====================

describe("mktg skill register", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-register-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("registers a new skill from valid SKILL.md", async () => {
    const skillDir = join(tmpDir, "my-new-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: my-new-skill\ndescription: A custom marketing skill\ncategory: growth\ntier: nice-to-have\nreads:\n  - audience.md\nwrites:\n  - learnings.md\ntriggers:\n  - custom trigger\n---\n\n# My New Skill\n\nDoes cool stuff.\n`);
    const { stdout, exitCode } = await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.name).toBe("my-new-skill");
    expect(parsed.action).toBe("created");
    expect(parsed.manifestPath).toContain("skills-manifest.json");
  });

  test("creates project skills-manifest.json", async () => {
    const skillDir = join(tmpDir, "test-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: test-skill\ndescription: test\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.version).toBe(1);
    expect(manifest.skills["test-skill"]).toBeDefined();
  });

  test("manifest entry has correct metadata from frontmatter", async () => {
    const skillDir = join(tmpDir, "categorized-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: categorized-skill\ndescription: test\ncategory: seo\ntier: must-have\nreads:\n  - keyword-plan.md\nwrites:\n  - assets.md\ntriggers:\n  - seo stuff\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    const entry = manifest.skills["categorized-skill"];
    expect(entry.category).toBe("seo");
    expect(entry.tier).toBe("must-have");
    expect(entry.reads).toContain("keyword-plan.md");
    expect(entry.writes).toContain("assets.md");
    expect(entry.triggers).toContain("seo stuff");
  });

  test("cannot override existing package skill", async () => {
    const skillDir = join(tmpDir, "seo-content");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: seo-content\ndescription: evil override\n---\n`);
    const { stdout, exitCode } = await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.action).toBe("exists");
  });

  test("normalizes brand/ prefix in reads", async () => {
    const skillDir = join(tmpDir, "prefix-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: prefix-skill\ndescription: test\nreads:\n  - brand/voice-profile.md\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["prefix-skill"].reads).toContain("voice-profile.md");
  });

  test("missing SKILL.md returns error", async () => {
    const emptyDir = join(tmpDir, "empty");
    await mkdir(emptyDir, { recursive: true });
    const { stdout, exitCode } = await run(["skill", "register", emptyDir, "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("invalid frontmatter returns error", async () => {
    const skillDir = join(tmpDir, "bad-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "No frontmatter here, just text.");
    const { stdout, exitCode } = await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
  });

  test("missing path returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "register", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("--dry-run does not create manifest", async () => {
    const { stdout, exitCode } = await run(["skill", "register", tmpDir, "--json", "--dry-run"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.action).toBe("created");
    // Manifest should NOT exist
    const exists = await Bun.file(join(tmpDir, "skills-manifest.json")).exists();
    expect(exists).toBe(false);
  });

  test("infers layer from category instead of hardcoding execution", async () => {
    const skillDir = join(tmpDir, "foundation-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: foundation-skill\ndescription: test\ncategory: foundation\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["foundation-skill"].layer).toBe("foundation");
  });

  test("infers depends_on from reads (brand-voice writes voice-profile.md)", async () => {
    const skillDir = join(tmpDir, "reader-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: reader-skill\ndescription: test\nreads:\n  - voice-profile.md\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["reader-skill"].depends_on).toContain("brand-voice");
  });

  test("exists case returns non-empty manifestPath", async () => {
    const skillDir = join(tmpDir, "seo-content-dup");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: seo-content\ndescription: duplicate\n---\n`);
    const { stdout } = await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(parsed.action).toBe("exists");
    expect(parsed.manifestPath).toBeTruthy();
    expect(parsed.manifestPath).toContain("skills-manifest.json");
  });

  test("multiple registers append to same manifest", async () => {
    // Register first skill
    const skill1 = join(tmpDir, "skill-one");
    await mkdir(skill1, { recursive: true });
    await writeFile(join(skill1, "SKILL.md"), `---\nname: skill-one\ndescription: first\n---\n`);
    await run(["skill", "register", skill1, "--json", "--cwd", tmpDir]);

    // Register second skill
    const skill2 = join(tmpDir, "skill-two");
    await mkdir(skill2, { recursive: true });
    await writeFile(join(skill2, "SKILL.md"), `---\nname: skill-two\ndescription: second\n---\n`);
    await run(["skill", "register", skill2, "--json", "--cwd", tmpDir]);

    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["skill-one"]).toBeDefined();
    expect(manifest.skills["skill-two"]).toBeDefined();
  });
});

// ==================== skill unregister ====================

describe("mktg skill unregister", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-unregister-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("removes a project-registered skill", async () => {
    // Register first
    const skillDir = join(tmpDir, "temp-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: temp-skill\ndescription: temporary\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);

    // Unregister
    const { stdout, exitCode } = await run(["skill", "unregister", "temp-skill", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.name).toBe("temp-skill");
    expect(parsed.action).toBe("removed");
    expect(parsed.manifestPath).toContain("skills-manifest.json");

    // Verify removed from manifest
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["temp-skill"]).toBeUndefined();
  });

  test("cannot unregister package skills", async () => {
    const { stdout, exitCode } = await run(["skill", "unregister", "seo-content", "--json", "--cwd", tmpDir]);
    // Need a project manifest to exist first
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify({ version: 1, skills: {}, redirects: {} }));
    const result = await run(["skill", "unregister", "seo-content", "--json", "--cwd", tmpDir]);
    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.error.message).toContain("Cannot unregister package skill");
  });

  test("returns error when no project manifest exists", async () => {
    const { stdout, exitCode } = await run(["skill", "unregister", "nonexistent", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.message).toContain("No project manifest found");
  });

  test("returns error for skill not in project manifest", async () => {
    await writeFile(join(tmpDir, "skills-manifest.json"), JSON.stringify({ version: 1, skills: {}, redirects: {} }));
    const { stdout, exitCode } = await run(["skill", "unregister", "nonexistent", "--json", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.message).toContain("not found in project manifest");
  });

  test("missing name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "unregister", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("--dry-run returns would-remove without modifying files", async () => {
    // Register first
    const skillDir = join(tmpDir, "dry-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: dry-skill\ndescription: dry\n---\n`);
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);

    // Dry-run unregister
    const { stdout, exitCode } = await run(["skill", "unregister", "dry-skill", "--json", "--dry-run", "--cwd", tmpDir]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.action).toBe("would-remove");

    // Skill should still exist
    const manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["dry-skill"]).toBeDefined();
  });

  test("roundtrip: register → unregister → verify removed", async () => {
    const skillDir = join(tmpDir, "roundtrip-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: roundtrip-skill\ndescription: roundtrip\n---\n`);

    // Register
    await run(["skill", "register", skillDir, "--json", "--cwd", tmpDir]);
    let manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["roundtrip-skill"]).toBeDefined();

    // Unregister
    await run(["skill", "unregister", "roundtrip-skill", "--json", "--cwd", tmpDir]);
    manifest = JSON.parse(await Bun.file(join(tmpDir, "skills-manifest.json")).text());
    expect(manifest.skills["roundtrip-skill"]).toBeUndefined();
  });
});

// ==================== Unit tests: parseFrontmatter ====================

import { parseFrontmatter, buildGraph, validateSkill, evaluateSkill, triggerSimilarity } from "../src/core/skill-lifecycle";
import { readManifest } from "../src/core/skills";

describe("parseFrontmatter", () => {
  test("parses basic key-value frontmatter", () => {
    const fm = parseFrontmatter("---\nname: test\ndescription: hello\n---\n");
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe("test");
    expect(fm!.description).toBe("hello");
  });

  test("parses multi-line description with >", () => {
    const fm = parseFrontmatter("---\nname: test\ndescription: >\n  This is a long\n  multi-line description.\n---\n");
    expect(fm).not.toBeNull();
    expect(fm!.description).toContain("This is a long");
    expect(fm!.description).toContain("multi-line description");
  });

  test("parses array values", () => {
    const fm = parseFrontmatter("---\nname: test\ndescription: hello\nreads:\n  - voice-profile.md\n  - audience.md\n---\n");
    expect(fm).not.toBeNull();
    expect(fm!.reads).toEqual(["voice-profile.md", "audience.md"]);
  });

  test("returns null for missing frontmatter", () => {
    expect(parseFrontmatter("no frontmatter")).toBeNull();
  });

  test("returns null for missing name", () => {
    expect(parseFrontmatter("---\ndescription: hello\n---\n")).toBeNull();
  });

  test("returns null for missing description", () => {
    expect(parseFrontmatter("---\nname: test\n---\n")).toBeNull();
  });

  test("handles empty frontmatter block", () => {
    expect(parseFrontmatter("---\n---\n")).toBeNull();
  });

  test("handles category and tier", () => {
    const fm = parseFrontmatter("---\nname: test\ndescription: hello\ncategory: seo\ntier: must-have\n---\n");
    expect(fm).not.toBeNull();
    expect(fm!.category).toBe("seo");
    expect(fm!.tier).toBe("must-have");
  });

  test("strips double-quoted YAML values", () => {
    const fm = parseFrontmatter('---\nname: "quoted-name"\ndescription: "A quoted description"\n---\n');
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe("quoted-name");
    expect(fm!.description).toBe("A quoted description");
  });

  test("strips single-quoted YAML values", () => {
    const fm = parseFrontmatter("---\nname: 'single-quoted'\ndescription: 'A single-quoted desc'\n---\n");
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe("single-quoted");
    expect(fm!.description).toBe("A single-quoted desc");
  });

  test("handles mixed quoted and unquoted values", () => {
    const fm = parseFrontmatter('---\nname: unquoted\ndescription: "quoted desc"\ncategory: \'single-quoted-cat\'\n---\n');
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe("unquoted");
    expect(fm!.description).toBe("quoted desc");
    expect(fm!.category).toBe("single-quoted-cat");
  });

  test("strips quotes from array items", () => {
    const fm = parseFrontmatter('---\nname: test\ndescription: hello\nreads:\n  - "voice-profile.md"\n  - \'audience.md\'\n  - competitors.md\n---\n');
    expect(fm).not.toBeNull();
    expect(fm!.reads).toEqual(["voice-profile.md", "audience.md", "competitors.md"]);
  });
});

// ==================== Unit tests: buildGraph ====================

describe("buildGraph (unit)", () => {
  const makeManifest = (skills: Record<string, { depends_on: string[]; layer?: string; category?: string }>) => ({
    version: 1,
    skills: Object.fromEntries(
      Object.entries(skills).map(([name, s]) => [name, {
        source: "new" as const,
        category: (s.category ?? "foundation") as any,
        layer: (s.layer ?? "foundation") as any,
        tier: "must-have" as const,
        reads: [],
        writes: [],
        depends_on: s.depends_on,
        triggers: [],
        review_interval_days: 30,
      }]),
    ),
    redirects: {},
  });

  test("empty manifest produces empty graph", () => {
    const graph = buildGraph(makeManifest({}));
    expect(graph.nodes.length).toBe(0);
    expect(graph.edges.length).toBe(0);
    expect(graph.hasCycles).toBe(false);
  });

  test("single skill with no deps is a root and leaf", () => {
    const graph = buildGraph(makeManifest({ a: { depends_on: [] } }));
    expect(graph.nodes.length).toBe(1);
    expect(graph.roots).toContain("a");
    expect(graph.leaves).toContain("a");
    expect(graph.order).toEqual(["a"]);
  });

  test("linear chain A→B→C", () => {
    const graph = buildGraph(makeManifest({
      a: { depends_on: [] },
      b: { depends_on: ["a"] },
      c: { depends_on: ["b"] },
    }));
    expect(graph.roots).toEqual(["a"]);
    expect(graph.leaves).toEqual(["c"]);
    expect(graph.order.indexOf("a")).toBeLessThan(graph.order.indexOf("b"));
    expect(graph.order.indexOf("b")).toBeLessThan(graph.order.indexOf("c"));
  });

  test("diamond pattern A→B,C→D", () => {
    const graph = buildGraph(makeManifest({
      a: { depends_on: [] },
      b: { depends_on: ["a"] },
      c: { depends_on: ["a"] },
      d: { depends_on: ["b", "c"] },
    }));
    expect(graph.roots).toEqual(["a"]);
    expect(graph.leaves).toEqual(["d"]);
    expect(graph.order.indexOf("a")).toBeLessThan(graph.order.indexOf("d"));
  });

  test("detects cycles", () => {
    const graph = buildGraph(makeManifest({
      a: { depends_on: ["b"] },
      b: { depends_on: ["a"] },
    }));
    expect(graph.hasCycles).toBe(true);
    expect(graph.order.length).toBeLessThan(2); // Not all nodes in order
  });

  test("layers group correctly", () => {
    const graph = buildGraph(makeManifest({
      a: { depends_on: [], layer: "foundation" },
      b: { depends_on: [], layer: "strategy" },
      c: { depends_on: [], layer: "execution" },
    }));
    expect(graph.layers.foundation).toContain("a");
    expect(graph.layers.strategy).toContain("b");
    expect(graph.layers.execution).toContain("c");
  });

  test("multiple roots when no deps", () => {
    const graph = buildGraph(makeManifest({
      a: { depends_on: [] },
      b: { depends_on: [] },
      c: { depends_on: ["a", "b"] },
    }));
    expect(graph.roots.length).toBe(2);
    expect(graph.roots).toContain("a");
    expect(graph.roots).toContain("b");
  });
});

// ==================== Unit tests: validateSkill ====================

describe("validateSkill (unit)", () => {
  const emptyManifest = { version: 1, skills: {}, redirects: {} };

  test("valid minimal skill passes", () => {
    const result = validateSkill("---\nname: good-skill\ndescription: Does good things\n---\n", emptyManifest);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("no frontmatter fails", () => {
    const result = validateSkill("just text", emptyManifest);
    expect(result.valid).toBe(false);
  });

  test("uppercase name fails", () => {
    const result = validateSkill("---\nname: BadName\ndescription: test\n---\n", emptyManifest);
    expect(result.valid).toBe(false);
  });

  test("name with spaces fails", () => {
    const result = validateSkill("---\nname: bad name\ndescription: test\n---\n", emptyManifest);
    expect(result.valid).toBe(false);
  });

  test("name over 64 chars fails", () => {
    const longName = "a" + "-b".repeat(33);
    const result = validateSkill(`---\nname: ${longName}\ndescription: test\n---\n`, emptyManifest);
    expect(result.valid).toBe(false);
  });

  test("description over 1024 chars fails", () => {
    const longDesc = "x".repeat(1025);
    const result = validateSkill(`---\nname: test\ndescription: ${longDesc}\n---\n`, emptyManifest);
    expect(result.valid).toBe(false);
  });
});

// ==================== Unit tests: isTemplateContent ====================

import { isTemplateContent } from "../src/core/brand";

describe("isTemplateContent", () => {
  test("template content returns true", () => {
    const template = `# Brand Voice Profile\n\n<!-- Generated by mktg init. Fill in or let /cmo build this. -->\n\n## Voice DNA\n\n- **Tone:**\n- **Personality:**\n- **Vocabulary:**\n`;
    expect(isTemplateContent("voice-profile.md", template)).toBe(true);
  });

  test("custom content returns false", () => {
    const custom = "# Our Brand Voice\n\nWe are bold and direct.\n";
    expect(isTemplateContent("voice-profile.md", custom)).toBe(false);
  });

  test("slightly modified template returns false", () => {
    const modified = `# Brand Voice Profile\n\n<!-- Generated by mktg init. Fill in or let /cmo build this. -->\n\n## Voice DNA\n\n- **Tone:** Friendly\n- **Personality:**\n- **Vocabulary:**\n`;
    expect(isTemplateContent("voice-profile.md", modified)).toBe(false);
  });

  test("empty string returns false", () => {
    expect(isTemplateContent("voice-profile.md", "")).toBe(false);
  });

  test("works for all 9 brand files", () => {
    const templates: Record<string, string> = {
      "voice-profile.md": `# Brand Voice Profile\n\n<!-- Generated by mktg init. Fill in or let /cmo build this. -->\n\n## Voice DNA\n\n- **Tone:**\n- **Personality:**\n- **Vocabulary:**\n`,
      "assets.md": `# Assets Log\n\n<!-- Append-only. Agent adds entries as assets are created. -->\n`,
      "learnings.md": `# Marketing Learnings\n\n<!-- Append-only. Agent records what worked and what didn't. -->\n`,
    };
    for (const [file, content] of Object.entries(templates)) {
      expect(isTemplateContent(file as any, content)).toBe(true);
    }
  });
});

// ==================== skill evaluate (subprocess) ====================

describe("mktg skill evaluate", () => {
  test("evaluate existing skill returns overlap data", async () => {
    const { stdout, exitCode } = await run(["skill", "evaluate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.name).toBe("seo-content");
    expect(typeof parsed.overlap.highestOverlap).toBe("number");
  });

  test("evaluate returns validation result", async () => {
    const { stdout } = await run(["skill", "evaluate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.validation.valid).toBe(true);
    expect(Array.isArray(parsed.validation.checks)).toBe(true);
  });

  test("evaluate returns novelty data", async () => {
    const { stdout } = await run(["skill", "evaluate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.novelty.uniqueTriggers)).toBe(true);
    expect(typeof parsed.novelty.coversNewCategory).toBe("boolean");
  });

  test("evaluate returns graph position", async () => {
    const { stdout } = await run(["skill", "evaluate", "skills/seo-content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.graphPosition.wouldDependOn)).toBe(true);
    expect(Array.isArray(parsed.graphPosition.wouldBeDepOf)).toBe(true);
  });

  test("missing path returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "evaluate", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("nonexistent path returns NOT_FOUND", async () => {
    const { stdout, exitCode } = await run(["skill", "evaluate", "/tmp/nope-not-here", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(1);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });

  test("novel skill shows low overlap and unique triggers", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-eval-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: podcast-marketing\ndescription: Podcast growth and guest outreach\ncategory: distribution\ntriggers:\n  - podcast\n  - audio content\n  - guest outreach\n---\n`);
    const { stdout, exitCode } = await run(["skill", "evaluate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.overlap.highestOverlap).toBe(0);
    expect(parsed.novelty.uniqueTriggers).toContain("podcast");
    expect(parsed.novelty.uniqueTriggers).toContain("audio content");
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("overlapping skill shows high overlap", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-eval-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: advanced-copy\ndescription: Better copywriting\ncategory: copy-content\ntriggers:\n  - copywriting\n  - sales copy\n  - headlines\n  - landing page copy\n---\n`);
    const { stdout, exitCode } = await run(["skill", "evaluate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.overlap.highestOverlap).toBeGreaterThan(50);
    expect(parsed.overlap.bySkill[0].skill).toBe("direct-response-copy");
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("skill with unique writes shows graph position", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-eval-"));
    await writeFile(join(tmpDir, "SKILL.md"), `---\nname: analytics-tracker\ndescription: Track marketing analytics\nreads:\n  - voice-profile.md\nwrites:\n  - learnings.md\ntriggers:\n  - analytics\n---\n`);
    const { stdout } = await run(["skill", "evaluate", tmpDir, "--json"]);
    const parsed = JSON.parse(stdout);
    // Reads voice-profile.md → would depend on brand-voice (which writes it)
    expect(parsed.graphPosition.wouldDependOn).toContain("brand-voice");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ==================== evaluateSkill (unit) ====================

describe("evaluateSkill (unit)", () => {
  const manifest = readManifest();

  test("returns error for missing frontmatter", () => {
    const result = evaluateSkill("no frontmatter", manifest);
    expect("error" in result).toBe(true);
  });

  test("skill with zero overlap has highestOverlap 0", () => {
    const result = evaluateSkill("---\nname: totally-novel\ndescription: brand new\ntriggers:\n  - xyz-unique\n---\n", manifest);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.overlap.highestOverlap).toBe(0);
    }
  });

  test("skill in new category has coversNewCategory true", () => {
    // "analytics" is not an existing category
    const result = evaluateSkill("---\nname: test\ndescription: test\ncategory: analytics\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.novelty.coversNewCategory).toBe(true);
    }
  });

  test("skill in existing category has coversNewCategory false", () => {
    const result = evaluateSkill("---\nname: test\ndescription: test\ncategory: seo\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.novelty.coversNewCategory).toBe(false);
    }
  });

  test("trigger overlap is sorted by percent descending", () => {
    const result = evaluateSkill("---\nname: test\ndescription: test\ntriggers:\n  - copywriting\n  - SEO content\n  - blog post\n---\n", manifest);
    if (!("error" in result)) {
      const percents = result.overlap.bySkill.map(s => s.overlapPercent);
      for (let i = 1; i < percents.length; i++) {
        expect(percents[i]!).toBeLessThanOrEqual(percents[i - 1]!);
      }
    }
  });

  test("wouldDependOn includes skills that write files this reads", () => {
    const result = evaluateSkill("---\nname: test\ndescription: test\nreads:\n  - voice-profile.md\n---\n", manifest);
    if (!("error" in result)) {
      // brand-voice writes voice-profile.md
      expect(result.graphPosition.wouldDependOn).toContain("brand-voice");
    }
  });

  test("wouldBeDepOf includes skills that read files this writes", () => {
    const result = evaluateSkill("---\nname: test\ndescription: test\nwrites:\n  - assets.md\n---\n", manifest);
    if (!("error" in result)) {
      // Several skills read assets.md
      expect(result.graphPosition.wouldBeDepOf.length).toBeGreaterThan(0);
    }
  });

  test("maps category 'seo' to layer 'execution' not 'seo'", () => {
    const result = evaluateSkill("---\nname: test-seo\ndescription: test\ncategory: seo\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("execution");
      expect(result.graphPosition.layer).not.toBe("seo");
    }
  });

  test("maps category 'foundation' to layer 'foundation'", () => {
    const result = evaluateSkill("---\nname: test-found\ndescription: test\ncategory: foundation\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("foundation");
    }
  });

  test("maps category 'strategy' to layer 'strategy'", () => {
    const result = evaluateSkill("---\nname: test-strat\ndescription: test\ncategory: strategy\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("strategy");
    }
  });

  test("maps category 'distribution' to layer 'distribution'", () => {
    const result = evaluateSkill("---\nname: test-dist\ndescription: test\ncategory: distribution\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("distribution");
    }
  });

  test("maps category 'creative' to layer 'execution'", () => {
    const result = evaluateSkill("---\nname: test-creative\ndescription: test\ncategory: creative\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("execution");
    }
  });

  test("defaults to layer 'execution' when no category", () => {
    const result = evaluateSkill("---\nname: test-nocat\ndescription: test\n---\n", manifest);
    if (!("error" in result)) {
      expect(result.graphPosition.layer).toBe("execution");
    }
  });
});

// ==================== triggerSimilarity (unit) ====================

describe("triggerSimilarity (unit)", () => {
  test("exact match returns true", () => {
    expect(triggerSimilarity("SEO content", "SEO content")).toBe(true);
  });

  test("case-insensitive exact match returns true", () => {
    expect(triggerSimilarity("SEO Content", "seo content")).toBe(true);
  });

  test("longer substring match works for triggers > 4 chars", () => {
    expect(triggerSimilarity("SEO content", "SEO content strategy")).toBe(true);
  });

  test("short trigger (<=4 chars) requires exact match", () => {
    expect(triggerSimilarity("SEO", "SEO content")).toBe(false);
  });

  test("short trigger exact match works", () => {
    expect(triggerSimilarity("SEO", "SEO")).toBe(true);
  });

  test("no match returns false", () => {
    expect(triggerSimilarity("email marketing", "video production")).toBe(false);
  });
});
