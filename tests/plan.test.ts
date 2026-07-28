// Tests for mktg plan — execution loop
import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BRAND_TEMPLATES } from "../src/core/brand";

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
    stdout: "pipe", stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
};

describe("mktg plan", () => {
  test("returns needs-setup when no brand/ exists", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    const { stdout, exitCode } = await run(["plan", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.health).toBe("needs-setup");
    expect(parsed.tasks.length).toBeGreaterThan(0);
    expect(parsed.tasks[0].id).toBe("init-brand");
    await rm(tmp, { recursive: true, force: true });
  });

  test("detects template brand files as needing population", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    const brandDir = join(tmp, "brand");
    await mkdir(brandDir, { recursive: true });
    await writeFile(join(brandDir, "voice-profile.md"), BRAND_TEMPLATES["voice-profile.md"]);
    await writeFile(join(brandDir, "audience.md"), BRAND_TEMPLATES["audience.md"]);
    await writeFile(join(brandDir, "positioning.md"), BRAND_TEMPLATES["positioning.md"]);
    await writeFile(join(brandDir, "competitors.md"), BRAND_TEMPLATES["competitors.md"]);
    await writeFile(join(brandDir, "keyword-plan.md"), BRAND_TEMPLATES["keyword-plan.md"]);
    await writeFile(join(brandDir, "creative-kit.md"), BRAND_TEMPLATES["creative-kit.md"]);
    await writeFile(join(brandDir, "stack.md"), BRAND_TEMPLATES["stack.md"]);
    await writeFile(join(brandDir, "assets.md"), BRAND_TEMPLATES["assets.md"]);
    await writeFile(join(brandDir, "learnings.md"), BRAND_TEMPLATES["learnings.md"]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { category: string }) => t.category === "populate")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan next returns the top priority task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    const { stdout, exitCode } = await run(["plan", "next", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.task).not.toBeNull();
    expect(parsed.task.order).toBe(0);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan complete marks a task as done", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    const { stdout, exitCode } = await run(["plan", "complete", "init-brand", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.completed).toBe("init-brand");
    // Verify plan.json was created
    const planFile = Bun.file(join(tmp, ".mktg", "plan.json"));
    expect(await planFile.exists()).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("completed tasks are excluded from plan", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    // Complete init-brand
    await run(["plan", "complete", "init-brand", "--json", "--cwd", tmp]);
    // Get plan — init-brand should not appear
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "init-brand")).toBe(false);
    expect(parsed.completedCount).toBe(1);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan --save persists plan state", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    await run(["plan", "--save", "--json", "--cwd", tmp]);
    const planFile = Bun.file(join(tmp, ".mktg", "plan.json"));
    expect(await planFile.exists()).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan --dry-run does not write plan.json", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    await run(["plan", "--save", "--dry-run", "--json", "--cwd", tmp]);
    const planFile = Bun.file(join(tmp, ".mktg", "plan.json"));
    expect(await planFile.exists()).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan complete --dry-run does not persist", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    await run(["plan", "complete", "init-brand", "--dry-run", "--json", "--cwd", tmp]);
    const planFile = Bun.file(join(tmp, ".mktg", "plan.json"));
    expect(await planFile.exists()).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("plan has summary field", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-"));
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.summary).toBe("string");
    expect(parsed.summary.length).toBeGreaterThan(0);
    await rm(tmp, { recursive: true, force: true });
  });
});

// ==================== Honesty: loads never unlock execute/distribute ====================

const seedBrandTemplates = async (tmp: string): Promise<void> => {
  const brandDir = join(tmp, "brand");
  await mkdir(brandDir, { recursive: true });
  await writeFile(join(brandDir, "voice-profile.md"), "real voice content — not the template " + "x".repeat(600));
  await writeFile(join(brandDir, "audience.md"), BRAND_TEMPLATES["audience.md"]);
};

const seedRunLog = async (tmp: string, records: ReadonlyArray<Record<string, unknown>>): Promise<void> => {
  await mkdir(join(tmp, ".mktg"), { recursive: true });
  const lines = records.map(r => JSON.stringify(r)).join("\n") + "\n";
  await writeFile(join(tmp, ".mktg", "runs.jsonl"), lines);
};

describe("plan honesty gates", () => {
  test("load-only content run does NOT produce a distribute task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await seedRunLog(tmp, [
      { skill: "seo-content", timestamp: "2026-07-20T10:00:00.000Z", event: "loaded", brandFilesChanged: [] },
    ]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "distribute-content")).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("load-only content run still counts as never-completed for execute suggestions", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await seedRunLog(tmp, [
      { skill: "seo-content", timestamp: "2026-07-20T10:00:00.000Z", event: "loaded", brandFilesChanged: [] },
    ]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "run-seo-content")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("completed content run unlocks the distribute task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await seedRunLog(tmp, [
      { skill: "seo-content", timestamp: "2026-07-20T10:00:00.000Z", event: "completed", result: "success", writes: ["marketing/content/x.md"], brandFilesChanged: [] },
    ]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "distribute-content")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("marketing/ artifacts alone (no completed content run) unlock distribute", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await mkdir(join(tmp, "marketing", "content"), { recursive: true });
    await writeFile(join(tmp, "marketing", "content", "article.md"), "# Real artifact");
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "distribute-content")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("completed distribution run suppresses the distribute task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await seedRunLog(tmp, [
      { skill: "seo-content", timestamp: "2026-07-20T10:00:00.000Z", event: "completed", result: "success", writes: ["marketing/content/x.md"], brandFilesChanged: [] },
      { skill: "content-atomizer", timestamp: "2026-07-20T11:00:00.000Z", event: "completed", result: "success", writes: ["marketing/social/a.md"], brandFilesChanged: [] },
    ]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "distribute-content")).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("legacy load (result success, no writes) does NOT unlock distribute", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    await seedBrandTemplates(tmp);
    await seedRunLog(tmp, [
      { skill: "seo-content", timestamp: "2026-07-20T10:00:00.000Z", result: "success", brandFilesChanged: [] },
    ]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "distribute-content")).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("health stays 'incomplete' when brand files exist but are all templates", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-honest-"));
    const brandDir = join(tmp, "brand");
    await mkdir(brandDir, { recursive: true });
    await writeFile(join(brandDir, "voice-profile.md"), BRAND_TEMPLATES["voice-profile.md"]);
    await writeFile(join(brandDir, "audience.md"), BRAND_TEMPLATES["audience.md"]);
    await writeFile(join(brandDir, "competitors.md"), BRAND_TEMPLATES["competitors.md"]);
    await writeFile(join(brandDir, "positioning.md"), BRAND_TEMPLATES["positioning.md"]);
    const { stdout } = await run(["plan", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    // 4 files EXIST — the old health check called this "ready". Templates are not population.
    expect(parsed.health).toBe("incomplete");
    await rm(tmp, { recursive: true, force: true });
  });
});

// ==================== S5: OpenSEO backend awareness ====================

const runWithEnv = async (
  args: string[],
  envOverrides: Record<string, string | undefined>,
): Promise<{ stdout: string; exitCode: number }> => {
  const env: Record<string, string> = { ...process.env, NO_COLOR: "1" } as Record<string, string>;
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
    stdout: "pipe", stderr: "pipe",
    env,
  });
  const stdout = await new Response(proc.stdout).text();
  return { stdout: stdout.trim(), exitCode: await proc.exited };
};

describe("plan OpenSEO backend awareness (S5)", () => {
  test("configured OpenSEO + no binding → seo-link-project task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-seo-"));
    await seedBrandTemplates(tmp);
    const { stdout } = await runWithEnv(
      ["plan", "--json", "--cwd", tmp],
      { OPENSEO_API_KEY: "k", OPENSEO_API_BASE: "https://api.openseo.so" },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "seo-link-project")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("configured OpenSEO + binding present → no seo-link-project task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-seo-"));
    await seedBrandTemplates(tmp);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "openseo.json"), JSON.stringify({
      version: 1, projectId: "p1", domain: "example.com", mcpUrl: "https://app.openseo.so/mcp",
      linkedAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
    }));
    const { stdout } = await runWithEnv(
      ["plan", "--json", "--cwd", tmp],
      { OPENSEO_API_KEY: "k", OPENSEO_API_BASE: "https://api.openseo.so" },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "seo-link-project")).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("unconfigured OpenSEO + populated keyword plan → seo-connect-openseo task", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-seo-"));
    await seedBrandTemplates(tmp);
    await writeFile(join(tmp, "brand", "keyword-plan.md"), "# Keyword Plan\n\nReal researched keywords. " + "x".repeat(400));
    const { stdout } = await runWithEnv(
      ["plan", "--json", "--cwd", tmp],
      { OPENSEO_API_KEY: undefined, OPENSEO_API_BASE: undefined },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "seo-connect-openseo")).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("unconfigured OpenSEO + template keyword plan → correctly silent", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-plan-seo-"));
    await seedBrandTemplates(tmp);
    const { stdout } = await runWithEnv(
      ["plan", "--json", "--cwd", tmp],
      { OPENSEO_API_KEY: undefined, OPENSEO_API_BASE: undefined },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "seo-connect-openseo")).toBe(false);
    expect(parsed.tasks.some((t: { id: string }) => t.id === "seo-link-project")).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });
});
