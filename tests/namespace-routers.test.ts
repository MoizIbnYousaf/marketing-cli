// Tests for namespace router commands: skill, brand, content
// No mocks. Real subprocess execution.

import { describe, test, expect } from "bun:test";

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

// ---------- skill namespace ----------

describe("mktg skill namespace", () => {
  test("mktg skill --json returns INVALID_ARGS with exit code 2", async () => {
    const { stdout, exitCode } = await run(["skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("error message mentions Missing subcommand", async () => {
    const { stdout } = await run(["skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.message).toContain("Missing subcommand");
  });

  test("error suggestions list valid subcommands", async () => {
    const { stdout } = await run(["skill", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("info");
    expect(sugText).toContain("validate");
  });

  test("mktg skill info --json without name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "info", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toContain("Missing skill name");
  });

  test("mktg skill validate --json without path returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toContain("Missing path");
  });

  test("mktg skill graph --json returns full DAG", async () => {
    const { stdout, exitCode } = await run(["skill", "graph", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);
    expect(Array.isArray(parsed.roots)).toBe(true);
    expect(Array.isArray(parsed.order)).toBe(true);
    expect(typeof parsed.hasCycles).toBe("boolean");
  });

  test("mktg skill check --json without name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "check", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("mktg skill register --json without path returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "register", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("mktg skill unregister --json without name returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "unregister", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toContain("Missing skill name");
  });

  test("mktg skill blah --json returns INVALID_ARGS with suggestions", async () => {
    const { stdout, exitCode } = await run(["skill", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(Array.isArray(parsed.error.suggestions)).toBe(true);
  });

  test("unknown subcommand suggestions include valid subcommands", async () => {
    const { stdout } = await run(["skill", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("mktg skill info");
    expect(sugText).toContain("mktg skill validate");
  });
});

// ---------- brand namespace ----------

describe("mktg brand namespace", () => {
  test("mktg brand --json returns INVALID_ARGS with exit code 2", async () => {
    const { stdout, exitCode } = await run(["brand", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("error lists valid subcommands (export, import, reset, freshness)", async () => {
    const { stdout } = await run(["brand", "--json"]);
    const parsed = JSON.parse(stdout);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("export");
    expect(sugText).toContain("import");
    expect(sugText).toContain("reset");
    expect(sugText).toContain("freshness");
  });

  test("mktg brand export --json returns NOT_IMPLEMENTED", async () => {
    const { stdout, exitCode } = await run(["brand", "export", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(6);
    expect(parsed.error.code).toBe("NOT_IMPLEMENTED");
  });

  test("mktg brand import --json returns NOT_IMPLEMENTED", async () => {
    const { stdout, exitCode } = await run(["brand", "import", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(6);
    expect(parsed.error.code).toBe("NOT_IMPLEMENTED");
  });

  test("mktg brand reset --json returns NOT_IMPLEMENTED", async () => {
    const { stdout, exitCode } = await run(["brand", "reset", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(6);
    expect(parsed.error.code).toBe("NOT_IMPLEMENTED");
  });

  test("mktg brand freshness --json returns freshness data", async () => {
    const { stdout, exitCode } = await run(["brand", "freshness", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(0);
    expect(parsed.files).toBeDefined();
    expect(parsed.summary).toBeDefined();
    expect(typeof parsed.summary.total).toBe("number");
  });

  test("mktg brand blah --json returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["brand", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("brand unknown subcommand suggestions include valid subcommands", async () => {
    const { stdout } = await run(["brand", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("mktg brand export");
  });
});

// ---------- content namespace ----------

describe("mktg content namespace", () => {
  test("mktg content --json returns INVALID_ARGS with exit code 2", async () => {
    const { stdout, exitCode } = await run(["content", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("error lists valid subcommands (list, stats)", async () => {
    const { stdout } = await run(["content", "--json"]);
    const parsed = JSON.parse(stdout);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("list");
    expect(sugText).toContain("stats");
  });

  test("mktg content list --json returns NOT_IMPLEMENTED with exit code 6", async () => {
    const { stdout, exitCode } = await run(["content", "list", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(6);
    expect(parsed.error.code).toBe("NOT_IMPLEMENTED");
  });

  test("mktg content stats --json returns NOT_IMPLEMENTED", async () => {
    const { stdout, exitCode } = await run(["content", "stats", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(6);
    expect(parsed.error.code).toBe("NOT_IMPLEMENTED");
  });

  test("mktg content blah --json returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["content", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(exitCode).toBe(2);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("content unknown subcommand suggestions include valid subcommands", async () => {
    const { stdout } = await run(["content", "blah", "--json"]);
    const parsed = JSON.parse(stdout);
    const sugText = parsed.error.suggestions.join(" ");
    expect(sugText).toContain("mktg content list");
  });
});
