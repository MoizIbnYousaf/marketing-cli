// Tests for mktg compete — competitor change monitor
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

describe("mktg compete", () => {
  test("list returns empty when no competitors tracked", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "list", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.urls).toEqual([]);
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch adds a URL to tracking", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "watch", "https://example.com", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.added).toBe("https://example.com");
    // Verify watchlist.json was created
    const wl = Bun.file(join(tmp, ".mktg", "compete", "watchlist.json"));
    expect(await wl.exists()).toBe(true);
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch rejects non-http URLs", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "watch", "ftp://bad.com", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch --dry-run does not persist", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    await run(["compete", "watch", "https://example.com", "--dry-run", "--json", "--cwd", tmp]);
    const wl = Bun.file(join(tmp, ".mktg", "compete", "watchlist.json"));
    expect(await wl.exists()).toBe(false);
    await rm(tmp, { recursive: true, force: true });
  });

  test("list shows tracked URLs after watch", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    await run(["compete", "watch", "https://example.com", "--json", "--cwd", tmp]);
    await run(["compete", "watch", "https://test.org", "--json", "--cwd", tmp]);
    const { stdout } = await run(["compete", "list", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.urls.length).toBe(2);
    expect(parsed.urls[0].url).toBe("https://example.com");
    expect(parsed.urls[1].url).toBe("https://test.org");
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch does not add duplicate URLs", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    await run(["compete", "watch", "https://example.com", "--json", "--cwd", tmp]);
    const { stdout } = await run(["compete", "watch", "https://example.com", "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.note).toBe("Already tracked");
    const { stdout: listOut } = await run(["compete", "list", "--json", "--cwd", tmp]);
    expect(JSON.parse(listOut).urls.length).toBe(1);
    await rm(tmp, { recursive: true, force: true });
  });

  test("scan returns empty when no competitors tracked", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "scan", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.results).toEqual([]);
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch rejects control characters in URL", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    // Use \x01 (SOH) instead of \x00 — null bytes can't be passed through Bun.spawn
    const { stdout, exitCode } = await run(["compete", "watch", "https://evil.com/\x01path", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    await rm(tmp, { recursive: true, force: true });
  });

  test("watch requires URL argument", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "watch", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    await rm(tmp, { recursive: true, force: true });
  });

  test("diff requires URL argument", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-comp-"));
    const { stdout, exitCode } = await run(["compete", "diff", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    await rm(tmp, { recursive: true, force: true });
  });
});
