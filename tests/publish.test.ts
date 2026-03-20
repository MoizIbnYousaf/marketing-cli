// Tests for mktg publish — distribution pipeline
import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

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

describe("mktg publish", () => {
  test("returns NOT_FOUND when no publish.json exists", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const { stdout, exitCode } = await run(["publish", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
    await rm(tmp, { recursive: true, force: true });
  });

  test("validates publish.json with empty items", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    await Bun.write(join(tmp, "publish.json"), JSON.stringify({ name: "test", items: [] }));
    const { stdout, exitCode } = await run(["publish", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    await rm(tmp, { recursive: true, force: true });
  });

  test("dry-run validates publish manifest without executing", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = {
      name: "test-campaign",
      items: [
        { type: "file", adapter: "file", content: "Hello world", metadata: { filename: "test.txt" } },
      ],
    };
    await Bun.write(join(tmp, "publish.json"), JSON.stringify(manifest));
    const { stdout, exitCode } = await run(["publish", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.campaign).toBe("test-campaign");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.totalItems).toBe(1);
    expect(parsed.published).toBe(0); // dry-run = no publish
    await rm(tmp, { recursive: true, force: true });
  });

  test("--confirm with file adapter writes content", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = {
      name: "file-test",
      items: [
        { type: "file", adapter: "file", content: "Published content", metadata: { filename: "out.txt" } },
      ],
    };
    await Bun.write(join(tmp, "publish.json"), JSON.stringify(manifest));
    const { stdout, exitCode } = await run(["publish", "--confirm", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.published).toBe(1);
    expect(parsed.dryRun).toBe(false);
    // Verify file was written
    const outFile = Bun.file(join(tmp, ".mktg", "published", "out.txt"));
    expect(await outFile.exists()).toBe(true);
    expect(await outFile.text()).toBe("Published content");
    await rm(tmp, { recursive: true, force: true });
  });

  test("--adapter filters to specific adapter", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = {
      name: "multi",
      items: [
        { type: "file", adapter: "file", content: "File content" },
        { type: "social", adapter: "typefully", content: "Social post" },
      ],
    };
    await Bun.write(join(tmp, "publish.json"), JSON.stringify(manifest));
    const { stdout, exitCode } = await run(["publish", "--adapter", "file", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.totalItems).toBe(1); // only file adapter
    expect(parsed.adapters.length).toBe(1);
    expect(parsed.adapters[0].adapter).toBe("file");
    await rm(tmp, { recursive: true, force: true });
  });

  test("rejects unknown adapter", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = {
      name: "bad-adapter",
      items: [{ type: "social", adapter: "nonexistent", content: "test" }],
    };
    await Bun.write(join(tmp, "publish.json"), JSON.stringify(manifest));
    const { stdout, exitCode } = await run(["publish", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.message).toContain("nonexistent");
    await rm(tmp, { recursive: true, force: true });
  });

  test("inline manifest via --input works", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = JSON.stringify({
      name: "inline",
      items: [{ type: "file", adapter: "file", content: "Inline content" }],
    });
    const { stdout, exitCode } = await run(["publish", "--input", manifest, "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.campaign).toBe("inline");
    await rm(tmp, { recursive: true, force: true });
  });

  test("typefully adapter fails gracefully without API key", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-pub-"));
    const manifest = {
      name: "typefully-test",
      items: [{ type: "social", adapter: "typefully", content: "test post" }],
    };
    await Bun.write(join(tmp, "publish.json"), JSON.stringify(manifest));
    // Run with --confirm but no TYPEFULLY_API_KEY
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "publish", "--confirm", "--json", "--cwd", tmp], {
      cwd: import.meta.dir.replace("/tests", ""),
      stdout: "pipe", stderr: "pipe",
      env: { ...process.env, NO_COLOR: "1", TYPEFULLY_API_KEY: "" },
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.adapters[0].errors).toContain("TYPEFULLY_API_KEY not set");
    await rm(tmp, { recursive: true, force: true });
  });
});
