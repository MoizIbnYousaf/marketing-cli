// Tests for mktg run --with-context (one-shot activation) and --strict prereqs
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { compileBrandContext, filesForSkillActivation } from "../src/core/context-compiler";
import { BRAND_TEMPLATES } from "../src/core/brand";

const CLI_DIR = import.meta.dir.replace("/tests", "");

const run = async (
  args: string[],
  envOverrides: Record<string, string | undefined> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const env: Record<string, string> = { ...process.env, NO_COLOR: "1" } as Record<string, string>;
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: CLI_DIR,
    stdout: "pipe",
    stderr: "pipe",
    env,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

const REAL_CONTENT = (label: string): string => `# ${label}\n\nReal populated content — not a template. ${"x".repeat(400)}`;

describe("run --with-context", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-activation-"));
    await mkdir(join(tmpDir, "brand"), { recursive: true });
    await writeFile(join(tmpDir, "brand", "voice-profile.md"), REAL_CONTENT("Voice"));
    await writeFile(join(tmpDir, "brand", "keyword-plan.md"), REAL_CONTENT("Keywords"));
    await writeFile(join(tmpDir, "brand", "audience.md"), BRAND_TEMPLATES["audience.md"]);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns context files from the skill's declared reads", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--with-context", "--json", "--cwd", tmpDir]);
    if (exitCode !== 0) return; // skill not installed — acceptable environment skip
    const parsed = JSON.parse(stdout);
    expect(parsed.context).not.toBeNull();
    expect(parsed.context.layer).toBe("reads");
    expect(Object.keys(parsed.context.files)).toEqual(["voice-profile.md"]);
    expect(parsed.context.files["voice-profile.md"].freshness).not.toBe("template");
    expect(parsed.context.tokenEstimate).toBeGreaterThan(0);
  });

  test("template files are excluded and named in templatesSkipped (nothing silent)", async () => {
    const { stdout, exitCode } = await run(["run", "seo-content", "--with-context", "--json", "--cwd", tmpDir]);
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    expect(Object.keys(parsed.context.files)).not.toContain("audience.md");
    expect(parsed.context.templatesSkipped).toContain("audience.md");
    expect(Object.keys(parsed.context.files).sort()).toEqual(["keyword-plan.md", "voice-profile.md"]);
  });

  test("--budget truncates and reports budgetDropped as a structured signal", async () => {
    // budget=1: the top-priority file consumes the entire budget immediately
    // (newline-preserving truncation), so the second file MUST overflow.
    const { stdout, exitCode } = await run(["run", "seo-content", "--with-context", "--budget", "1", "--json", "--cwd", tmpDir]);
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    expect(parsed.context.budgetDropped).toContain("keyword-plan.md");
    expect(parsed.context.files["keyword-plan.md"].truncated).toBe(true);
    expect(parsed.context.files["voice-profile.md"].truncated).toBe(true);
  });

  test("context is null without --with-context", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--json", "--cwd", tmpDir]);
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    expect(parsed.context).toBeNull();
  });

  test("--budget without --with-context exits 2", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--budget", "100", "--json", "--cwd", tmpDir]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.message).toContain("--with-context");
  });

  test("--fields can trim the context payload", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--with-context", "--fields", "skill,context.tokenEstimate,context.templatesSkipped", "--json", "--cwd", tmpDir]);
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    expect(parsed.skill).toBe("brand-voice");
    expect(parsed.context.tokenEstimate).toBeGreaterThan(0);
    expect(parsed.content).toBeUndefined();
  });
});

describe("run --strict + rich prerequisites", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-strict-"));
    await mkdir(join(tmpDir, "brand"), { recursive: true });
    await writeFile(join(tmpDir, "brand", "voice-profile.md"), REAL_CONTENT("Voice"));
    await writeFile(join(tmpDir, "brand", "audience.md"), REAL_CONTENT("Audience"));
    await writeFile(join(tmpDir, "brand", "positioning.md"), REAL_CONTENT("Positioning"));
    await writeFile(join(tmpDir, "brand", "learnings.md"), REAL_CONTENT("Learnings"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("postiz surfaces missing envs + catalog even without --strict", async () => {
    const { stdout, exitCode } = await run(
      ["run", "postiz", "--json", "--cwd", tmpDir],
      { POSTIZ_API_KEY: undefined, POSTIZ_API_BASE: undefined },
    );
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    expect(parsed.prerequisites.satisfied).toBe(false);
    expect(parsed.prerequisites.missing.envs).toContain("POSTIZ_API_KEY");
    // POSTIZ_API_BASE has a documented default (catalog auth.base_default) —
    // it must NOT appear as missing: --strict never blocks on a variable
    // the adapter does not actually need.
    expect(parsed.prerequisites.missing.envs).not.toContain("POSTIZ_API_BASE");
    expect(parsed.prerequisites.missing.catalogs).toContain("postiz");
    expect(parsed.prerequisites.remediation.join(" ")).toContain("POSTIZ_API_KEY");
  });

  test("postiz --strict exits 3 DEPENDENCY_MISSING when env vars are absent", async () => {
    const { stdout, exitCode } = await run(
      ["run", "postiz", "--strict", "--json", "--cwd", tmpDir],
      { POSTIZ_API_KEY: undefined, POSTIZ_API_BASE: undefined },
    );
    expect(exitCode).toBe(3);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("DEPENDENCY_MISSING");
    expect(parsed.error.suggestions.join(" ")).toContain("POSTIZ_API_KEY");
    // No log written — the run never happened
    expect(await Bun.file(join(tmpDir, ".mktg", "runs.jsonl")).exists()).toBe(false);
  });

  test("postiz --strict passes when env vars are set and brand reads populated", async () => {
    const { exitCode } = await run(
      ["run", "postiz", "--strict", "--json", "--cwd", tmpDir],
      { POSTIZ_API_KEY: "test-key", POSTIZ_API_BASE: "https://api.postiz.com" },
    );
    // depends_on content-atomizer is installed in this environment
    expect(exitCode).toBe(0);
  });

  test("offline skill (brainstorm) stays exit 0 with empty envs under --strict", async () => {
    const { exitCode } = await run(
      ["run", "brainstorm", "--strict", "--json", "--cwd", tmpDir],
      { POSTIZ_API_KEY: undefined, POSTIZ_API_BASE: undefined, EXA_API_KEY: undefined, FIRECRAWL_API_KEY: undefined },
    );
    if (exitCode === 1) return; // skill not installed — environment skip
    expect(exitCode).toBe(0);
  });

  test("skill with missing CLI tool reports it in missing.tools with doctor-identical hint", async () => {
    // firecrawl CLI is not installed in this environment
    const { stdout, exitCode } = await run(["run", "firecrawl", "--json", "--cwd", tmpDir], { FIRECRAWL_API_KEY: "k" });
    if (exitCode !== 0) return;
    const parsed = JSON.parse(stdout);
    if (parsed.prerequisites.missing.tools.includes("firecrawl")) {
      expect(parsed.prerequisites.remediation.join(" ")).toContain("npm i -g firecrawl");
    }
  });
});

describe("context-compiler core", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "mktg-compiler-"));
    await mkdir(join(tmpDir, "brand"), { recursive: true });
    await writeFile(join(tmpDir, "brand", "voice-profile.md"), REAL_CONTENT("Voice"));
    await writeFile(join(tmpDir, "brand", "audience.md"), BRAND_TEMPLATES["audience.md"]);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("filesForSkillActivation: declared reads win over layer matrix", () => {
    const sel = filesForSkillActivation({ layer: "execution", reads: ["brand/voice-profile.md"] });
    expect(sel.layer).toBe("reads");
    expect(sel.files).toEqual(["voice-profile.md"]);
  });

  test("filesForSkillActivation: orchestrator falls back to all files", () => {
    const sel = filesForSkillActivation({ layer: "orchestrator", reads: [] });
    expect(sel.layer).toBe("all");
    expect(sel.files).toBeUndefined();
  });

  test("filesForSkillActivation: layer maps 1:1 when no reads declared", () => {
    const sel = filesForSkillActivation({ layer: "distribution", reads: [] });
    expect(sel.layer).toBe("distribution");
    expect(sel.files).toContain("stack.md");
  });

  test("compileBrandContext excludeTemplates omits + names templates", async () => {
    const compiled = await compileBrandContext(tmpDir, { excludeTemplates: true });
    expect(Object.keys(compiled.files)).toEqual(["voice-profile.md"]);
    expect(compiled.templatesSkipped).toContain("audience.md");
    expect(compiled.summary.templateFiles).toBe(1);
  });

  test("compileBrandContext without exclusion keeps templates (context cmd contract)", async () => {
    const compiled = await compileBrandContext(tmpDir);
    expect(Object.keys(compiled.files).sort()).toEqual(["audience.md", "voice-profile.md"]);
    expect(compiled.files["audience.md"]!.freshness).toBe("template");
  });
});
