// E2E Test: `mktg cmo --dry-run --json` orchestration coverage.
//
// We test three input shapes per TEST-PLAN.md row 10:
//   - VAGUE: "I don't know what to do" → routing table should suggest brainstorm
//   - SPECIFIC: "write me a landing page" → direct-response-copy
//   - WRONG-SKILL-MENTION: user names a skill that's been redirected
//
// `mktg cmo --dry-run` does not invoke claude (zero LLM cost), so we cannot
// observe live routing. What we CAN assert at the CLI layer:
//   1. The dry-run preview correctly auto-prefixes "/cmo " when missing
//   2. The argv that would be spawned is well-formed and includes the prompt
//   3. The skill routing table in cmo/SKILL.md correctly maps each input shape
//      to the expected destination skill
//   4. Skill redirects in cmo/SKILL.md actually point to skills that exist
//
// Real `mktg cmo` execution is gated on Claude Code being available + an LLM
// budget. Those live integration tests belong in Tier 3 soup-to-nuts.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SkillsManifest } from "../../../src/types";

const projectRoot = import.meta.dir.replace("/tests/e2e/skills", "");
const cmoPath = join(homedir(), ".claude", "skills", "cmo", "SKILL.md");
const playbooksPath = join(homedir(), ".claude", "skills", "cmo", "rules", "playbooks.md");
const manifestPath = join(projectRoot, "skills-manifest.json");

const runMktg = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return { stdout: stdout.trim(), exitCode: exitCode ?? -1 };
};

interface CmoPreview {
  prompt: string;
  mode: "dry-run" | "execute";
  exitCode: number;
  preview?: { cmd: string[]; env: Record<string, string> };
}

describe("E2E: mktg cmo --dry-run argv preview", () => {
  test("vague input — auto-prefixes '/cmo ' and surfaces correct argv", async () => {
    const { stdout, exitCode } = await runMktg([
      "cmo",
      "I don't know what to do",
      "--dry-run",
      "--json",
      "--fields",
      "prompt,mode,exitCode,preview.cmd",
    ]);
    expect(exitCode).toBe(0);
    const r = JSON.parse(stdout) as CmoPreview;
    expect(r.mode).toBe("dry-run");
    expect(r.exitCode).toBe(0);
    expect(r.prompt).toBe("/cmo I don't know what to do");
    expect(r.preview).toBeDefined();
    expect(r.preview!.cmd).toContain("--no-session-persistence");
    expect(r.preview!.cmd).toContain("--allowedTools");
  });

  test("specific input — landing page request preserves the user's verbatim prompt", async () => {
    const { stdout, exitCode } = await runMktg([
      "cmo",
      "write me a landing page",
      "--dry-run",
      "--json",
      "--fields",
      "prompt,preview.cmd",
    ]);
    expect(exitCode).toBe(0);
    const r = JSON.parse(stdout) as CmoPreview;
    expect(r.prompt).toBe("/cmo write me a landing page");
    // The user's words are the last positional in the spawned argv.
    expect(r.preview!.cmd[r.preview!.cmd.length - 1]).toBe("/cmo write me a landing page");
  });

  test("wrong-skill-mention — user names a redirected old skill, prompt still passes through verbatim for /cmo to handle the redirect", async () => {
    const { stdout, exitCode } = await runMktg([
      "cmo",
      "run the copywriting skill",
      "--dry-run",
      "--json",
      "--fields",
      "prompt",
    ]);
    expect(exitCode).toBe(0);
    const r = JSON.parse(stdout) as CmoPreview;
    expect(r.prompt).toBe("/cmo run the copywriting skill");
  });
});

describe("E2E: routing table in cmo/SKILL.md routes the three input shapes correctly", () => {
  test("vague intent maps to brainstorm in the disambiguation matrix", async () => {
    const cmo = await Bun.file(cmoPath).text();
    // SKILL.md disambiguation row: "what should I do" → brainstorm
    expect(cmo).toMatch(/\|\s*"what should I do"\s*\|\s*`brainstorm`\s*\|/);
  });

  test('specific landing-page intent maps to direct-response-copy', async () => {
    const cmo = await Bun.file(cmoPath).text();
    expect(cmo).toMatch(/\|\s*"landing page"\s*\|\s*`direct-response-copy`\s*\|/);
  });

  test('the "copywriting" legacy name redirects to direct-response-copy', async () => {
    const cmo = await Bun.file(cmoPath).text();
    // Skill Redirects table row.
    expect(cmo).toMatch(/\|\s*`copywriting`\s*\|\s*`direct-response-copy`\s*\|/);
  });

  test("Higgsfield trio is fully wired post-Wave-A: routing table + Marketing Studio + Soul + product photoshoot disambiguation", async () => {
    const cmo = await Bun.file(cmoPath).text();
    // Wave A reconciled the inline-vs-route guardrail; Higgsfield trio appears
    // in routing table (line ~158-160) and disambiguation (line ~234-238).
    expect(cmo).toContain("`higgsfield-generate`");
    expect(cmo).toContain("`higgsfield-soul-id`");
    expect(cmo).toContain("`higgsfield-product-photoshoot`");
    // soul-id is in Creative layer post-Wave-A (was Foundation pre-fix).
    expect(cmo).toMatch(/`higgsfield-soul-id`.*Creative/);
  });

  test("Wave A removed the inline-vs-route image-gen contradiction", async () => {
    const cmo = await Bun.file(cmoPath).text();
    // The old guardrail at line 427 said "generate inline, don't route" which
    // contradicted the routing table. Verify it's gone.
    expect(cmo).not.toMatch(/\bgenerate inline, don't route\b/);
    expect(cmo).not.toMatch(/^- \*\*Image generation: generate inline, don't route\.\*\*/m);
  });
});

describe("E2E: every routing-table skill name resolves to a real skill in the manifest", () => {
  test("every skill cited in the routing table exists in skills-manifest.json", async () => {
    const cmo = await Bun.file(cmoPath).text();
    const manifest: SkillsManifest = await Bun.file(manifestPath).json();
    const known = new Set(Object.keys(manifest.skills));
    // Backtick-wrapped skill names like `seo-content` or `direct-response-copy`.
    // We exclude obvious non-skills: mktg subcommands, file paths, modes.
    const skillRefs = new Set<string>();
    const re = /`([a-z][a-z0-9-]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cmo)) !== null) {
      const candidate = m[1]!;
      // Filter out: mktg subcommands, mode flags, file refs.
      if (candidate.startsWith("mktg")) continue;
      if (candidate.includes(".md") || candidate.includes(".json")) continue;
      if (["api", "json", "scale", "edit", "schema", "architecture", "cold-email"].includes(candidate)) continue;
      // Common false positives from disambiguation prose that are not skill IDs.
      const nonSkills = new Set([
        "brand", "marketing", "agents", "agent", "skills", "skill", "rules",
        "next-skill", "claude", "claude-code", "name", "next", "voice",
        "audience", "competitors", "landscape", "positioning", "creative-kit",
        "stack", "assets", "learnings", "keyword-plan", "voice-profile",
        "url", "fetch", "watch", "list", "diff", "update", "doctor",
        "init", "publish", "compete", "context", "transcribe", "studio",
        "plan", "status", "verify", "ship-check", "brand-memory",
        "command-reference", "cli-runtime-index", "publish-index",
        "studio-api-index", "monorepo", "output-format", "context-switch",
        "safety", "quality-gate", "playbooks", "progressive-enhancement",
        "brand-file-map", "sub-agents", "ecosystem", "error-recovery",
        "learning-loop", "studio-integration", "recency-grounding",
        "persona", "communication", "ideas-library", "analytics-guide",
        "ai-slop-patterns", "exa", "exa-mcp",
        // Status field names + setup-preference values + platform identifiers
        // that appear in /cmo's prose but are not skill IDs.
        "integrations", "no", "yes", "configured", "suggestions",
        "instagram", "reddit", "linkedin", "tiktok", "x", "twitter",
        "youtube", "pinterest", "discord", "slack", "bluesky", "mastodon",
        "threads", "facebook",
        "colors", "typography", "visual", "visualBrandStyle",
        "brandSummary", "studio_enabled", "mode",
        "selected", "distribution",
      ]);
      if (nonSkills.has(candidate)) continue;
      skillRefs.add(candidate);
    }
    const unresolved: string[] = [];
    // Skill redirects table has legacy names that intentionally don't resolve.
    // We pull the redirects section and remove its left-column from validation.
    const redirectsBlock = cmo.match(/## Skill Redirects[\s\S]+?(?=\n## )/);
    const redirectLegacy = new Set<string>();
    if (redirectsBlock) {
      const rows = redirectsBlock[0].matchAll(/\|\s*`([a-z][a-z0-9-]+)`\s*\|/g);
      for (const r of rows) redirectLegacy.add(r[1]!);
    }
    for (const ref of skillRefs) {
      if (redirectLegacy.has(ref)) continue;
      if (!known.has(ref)) unresolved.push(ref);
    }
    expect(unresolved).toEqual([]);
  });
});

describe("E2E: 12 named playbooks reference real skills only", () => {
  test("playbooks.md skill citations all resolve to manifest skills", async () => {
    const playbooks = await Bun.file(playbooksPath).text();
    const manifest: SkillsManifest = await Bun.file(manifestPath).json();
    const known = new Set(Object.keys(manifest.skills));
    const re = /`([a-z][a-z0-9-]+)`/g;
    const refs = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(playbooks)) !== null) {
      const c = m[1]!;
      if (c.startsWith("mktg")) continue;
      if (c.includes(".md") || c.includes(".json")) continue;
      // Skip sub-mode flags and obvious non-skills.
      const skip = new Set([
        "next-skill", "brand", "marketing", "scale", "edit", "cold-email",
        "json", "url", "playbooks", "ml", "edit-mode", "voice-profile",
        "voice", "audience", "competitors", "landscape", "positioning",
        "creative-kit", "keyword-plan", "stack", "assets", "learnings",
        "rules", "communication", "persona", "watering-hole", "no-fallback",
        "brand-file-map", "scrape", "import", "init",
      ]);
      if (skip.has(c)) continue;
      refs.add(c);
    }
    const unresolved: string[] = [];
    for (const r of refs) if (!known.has(r)) unresolved.push(r);
    expect(unresolved).toEqual([]);
  });

  test("Higgsfield trio appears in 3 playbooks (Visual Identity, Video Content, Full Product Launch) per Lane 10 Wave A", async () => {
    const playbooks = await Bun.file(playbooksPath).text();
    expect(playbooks).toContain("higgsfield-product-photoshoot");
    expect(playbooks).toContain("higgsfield-generate");
    expect(playbooks).toContain("higgsfield-soul-id");
  });
});
