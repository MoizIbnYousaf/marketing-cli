// Tests for the opt-in TOON output format (AXI principle 1).
// Real encoder + real command handlers + real subprocess runs. No mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { encodeToon } from "../src/core/toon";
import { formatOutput } from "../src/core/output";
import { ok, err } from "../src/types";
import type { GlobalFlags } from "../src/types";
import { handler as listHandler } from "../src/commands/list";

const ROOT = join(import.meta.dir, "..");

const toonFlags: GlobalFlags = {
  json: true,
  format: "toon",
  dryRun: false,
  fields: [],
  cwd: ROOT,
};

const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
};

describe("encodeToon — uniform arrays", () => {
  test("emits a [N]{fields}: header and one row per item", () => {
    const out = encodeToon({
      issues: [
        { number: 42, title: "Fix login bug", state: "open" },
        { number: 43, title: "Add dark mode", state: "open" },
      ],
    });
    expect(out).toBe(
      ["issues[2]{number,title,state}:", "  42,Fix login bug,open", "  43,Add dark mode,open"].join("\n"),
    );
  });

  test("quotes values containing commas and doubles embedded quotes", () => {
    const out = encodeToon({
      rows: [
        { name: "a,b", note: 'say "hi"' },
        { name: "plain", note: "line1\nline2" },
      ],
    });
    const lines = out.split("\n");
    expect(lines[0]).toBe("rows[2]{name,note}:");
    // Comma forces quoting; an embedded quote both forces quoting and doubles.
    expect(lines[1]).toBe('  "a,b","say ""hi"""');
    // The quoted newline keeps both halves inside one quoted cell.
    expect(out).toContain('  plain,"line1\nline2"');
  });

  test("null and missing values become empty cells", () => {
    const out = encodeToon({ rows: [{ a: null, b: 1 }, { a: "x", b: 2 }] });
    expect(out.split("\n")[1]).toBe("  ,1");
  });

  test("empty array is a definitive empty state, not absent", () => {
    expect(encodeToon({ skills: [] })).toBe("skills[0]:");
  });

  test("primitive arrays get a [N]: block with one value per line", () => {
    expect(encodeToon({ tags: ["a", "b"] })).toBe("tags[2]:\n  a\n  b");
  });

  test("non-uniform object arrays fall back to JSON rows without losing data", () => {
    const out = encodeToon({ mixed: [{ a: 1 }, { b: 2 }] });
    const lines = out.split("\n");
    expect(lines[0]).toBe("mixed[2]:");
    expect(lines[1]).toBe('  "{""a"":1}"');
  });
});

describe("encodeToon — scalars and nesting", () => {
  test("scalars render as key: value lines", () => {
    expect(encodeToon({ project: "mktg", total: 76, ready: true })).toBe(
      ["project: mktg", "total: 76", "ready: true"].join("\n"),
    );
  });

  test("nested objects indent 2 spaces per level", () => {
    const out = encodeToon({ brand: { populated: 4, files: { total: 10 } } });
    expect(out).toBe(["brand:", "  populated: 4", "  files:", "    total: 10"].join("\n"));
  });

  test("top-level arrays carry a count and an items block", () => {
    const out = encodeToon([{ name: "a" }, { name: "b" }]);
    expect(out).toBe(["count: 2", "items[2]{name}:", "  a", "  b"].join("\n"));
  });
});

describe("encodeToon — help[] block", () => {
  test("appends help[N]: when the envelope carries help", () => {
    const out = encodeToon({ total: 1 }, ["mktg list --json", "mktg status --json"]);
    expect(out).toBe(
      ["total: 1", "help[2]:", "  mktg list --json", "  mktg status --json"].join("\n"),
    );
  });

  test("does not duplicate help already merged into the payload", () => {
    const help = ["mktg list --json"];
    const out = encodeToon({ total: 1, help }, help);
    expect(out.split("\n").filter((l) => l.startsWith("help[")).length).toBe(1);
  });
});

describe("formatOutput with --format toon", () => {
  test("success payloads serialize as TOON", () => {
    const out = formatOutput(ok({ name: "test", count: 42 }), toonFlags);
    expect(out).toBe("name: test\ncount: 42");
  });

  test("errors stay JSON — the structured error envelope is the contract", () => {
    const out = formatOutput(err("NOT_FOUND", "Skill not found", ["mktg list"]), toonFlags);
    const parsed = JSON.parse(out);
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.exitCode).toBe(1);
  });

  test("--pretty is a no-op with toon", () => {
    const plain = formatOutput(ok({ a: { b: 1 } }), toonFlags);
    const pretty = formatOutput(ok({ a: { b: 1 } }), { ...toonFlags, pretty: true });
    expect(pretty).toBe(plain);
  });
});

describe("mktg list --format toon (end-to-end via the handler)", () => {
  test("header row + one row per skill", async () => {
    const result = await listHandler([], { ...toonFlags, format: "toon" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const out = formatOutput(result, toonFlags);
    const lines = out.split("\n");
    const header = lines[0]!;
    expect(header).toMatch(/^skills\[\d+\]\{name,category,tier,installed\}:$/);
    const declared = Number(header.match(/^skills\[(\d+)\]/)![1]);
    expect(declared).toBe(result.data.skills.length);
    const rows = lines.slice(1, 1 + declared);
    expect(rows.length).toBe(declared);
    for (const row of rows) expect(row.startsWith("  ")).toBe(true);
  });

  test("subprocess: mktg list --format toon exits 0 and emits a TOON header", async () => {
    const { stdout, exitCode } = await run(["list", "--format", "toon"]);
    expect(exitCode).toBe(0);
    expect(stdout.split("\n")[0]).toMatch(/^skills\[\d+\]\{/);
  });

  test("--fields applies before encoding", async () => {
    const { stdout, exitCode } = await run(["list", "--format", "toon", "--fields", "name,tier"]);
    expect(exitCode).toBe(0);
    const lines = stdout.split("\n");
    expect(lines[0]).toMatch(/^count: \d+$/);
    expect(lines[1]).toMatch(/^items\[\d+\]\{name,tier\}:$/);
  });
});

describe("--format validation", () => {
  test("unknown --format value exits 2 with INVALID_ARGS (JSON envelope)", async () => {
    const { stdout, exitCode } = await run(["list", "--format", "yaml"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.suggestions.join(" ")).toContain("toon");
  });

  test("--format=toon (equals form) is accepted", async () => {
    const { stdout, exitCode } = await run(["list", "--format=toon"]);
    expect(exitCode).toBe(0);
    expect(stdout.split("\n")[0]).toMatch(/^skills\[\d+\]\{/);
  });

  test("default (no --format) stays JSON", async () => {
    const { stdout, exitCode } = await run(["list", "--json"]);
    expect(exitCode).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  test("--format is a documented global flag in schema + root help", async () => {
    const schema = await run(["schema", "--json"]);
    expect(JSON.parse(schema.stdout).globalFlags.map((f: { name: string }) => f.name)).toContain("--format");
    const help = await run(["--help", "--json"]);
    expect(JSON.parse(help.stdout).globalFlags).toContain("--format");
  });
});
