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
    expect(parsed.task.priority).toBe(1);
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
