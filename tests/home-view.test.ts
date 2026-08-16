// Content-first home view (bare `mktg`), compact-vs-pretty JSON, and help[]
// envelope. Real subprocess runs + real formatOutput calls, no mocks.

import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { formatOutput, applyFieldsFilter, withHelp } from "../src/core/output";
import { collapseHome, formatHomeView, type HomeView } from "../src/core/home-view";
import { ok } from "../src/types";

const ROOT = join(import.meta.dir, "..");

const run = async (args: string[], cwd = ROOT): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", join(ROOT, "src/cli.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
};

const baseFlags = { json: true, dryRun: false, fields: [], cwd: ROOT, jsonInput: undefined };

describe("compact JSON by default, --pretty opts in", () => {
  test("formatOutput emits single-line JSON without --pretty", () => {
    const out = formatOutput(ok({ a: 1, nested: { b: [1, 2] } }), baseFlags);
    expect(out).toBe('{"a":1,"nested":{"b":[1,2]}}');
    expect(out.includes("\n")).toBe(false);
  });

  test("formatOutput indents with --pretty", () => {
    const out = formatOutput(ok({ a: 1 }), { ...baseFlags, pretty: true });
    expect(out).toBe('{\n  "a": 1\n}');
  });

  test("error envelope follows the same policy", () => {
    const res = { ok: false as const, error: { code: "X", message: "m", suggestions: [] }, exitCode: 1 as const };
    expect(formatOutput(res, baseFlags).includes("\n")).toBe(false);
    expect(formatOutput(res, { ...baseFlags, pretty: true }).includes("\n")).toBe(true);
  });

  test("subprocess: piped output is compact; --pretty is indented", async () => {
    const compact = await run(["schema", "status", "--fields", "name"]);
    expect(compact.stdout).toBe('{"name":"status"}');
    const pretty = await run(["schema", "status", "--fields", "name", "--pretty"]);
    expect(pretty.stdout).toBe('{\n  "name": "status"\n}');
    expect(pretty.exitCode).toBe(0);
  });
});

describe("help[] on CommandResult", () => {
  test("ok(data, display, help) surfaces help as a top-level JSON key", () => {
    const out = formatOutput(ok({ a: 1 }, undefined, ["mktg status --json"]), baseFlags);
    expect(JSON.parse(out)).toEqual({ a: 1, help: ["mktg status --json"] });
  });

  test("data that already carries help is never clobbered", () => {
    expect(withHelp({ help: ["mine"] }, ["theirs"])).toEqual({ help: ["mine"] });
    expect(withHelp([1, 2], ["x"])).toEqual([1, 2]);
  });

  test("--fields help selects it; other fields exclude it", () => {
    const res = ok({ a: 1 }, undefined, ["mktg plan --json"]);
    const onlyHelp = applyFieldsFilter(res, ["help"]);
    expect(onlyHelp.ok && onlyHelp.data).toEqual({ help: ["mktg plan --json"] });
    const onlyA = applyFieldsFilter(res, ["a"]);
    expect(onlyA.ok && onlyA.data).toEqual({ a: 1 });
  });

  test("status --json carries help templates alongside nextActions", async () => {
    const { stdout, exitCode } = await run(["status", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.nextActions)).toBe(true);
    expect(Array.isArray(parsed.help)).toBe(true);
    expect(parsed.help.every((h: string) => h.startsWith("mktg "))).toBe(true);
  });

  test("init --dry-run --json carries help templates alongside setup.nextSteps", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mktg-home-init-"));
    try {
      const { stdout, exitCode } = await run(["init", "--dry-run", "--json", "--cwd", tmp]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Array.isArray(parsed.setup.nextSteps)).toBe(true);
      expect(parsed.help[0]).toBe("mktg status --json");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("bare `mktg` home view", () => {
  test("piped: compact JSON with bin/cwd/version/health/brand/skills/help", async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout.split("\n").length).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.description).toBe("Agent-native marketing playbook CLI");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(parsed.bin.startsWith("~/") || parsed.bin.startsWith("/")).toBe(true);
    expect(parsed.bin.includes(homedir())).toBe(false);
    expect(parsed.cwd).toBe(collapseHome(ROOT));
    expect(["ready", "incomplete", "needs-setup", "unknown"]).toContain(parsed.health);
    expect(typeof parsed.brand.populated).toBe("number");
    expect(typeof parsed.brand.total).toBe("number");
    expect(typeof parsed.skills.installed).toBe("number");
    expect(parsed.skills.total).toBeGreaterThan(0);
    expect(parsed.help.length).toBeGreaterThanOrEqual(3);
    expect(parsed.help.length).toBeLessThanOrEqual(5);
    // Home view is NOT the command list — that's `mktg --help`.
    expect(parsed.commands).toBeUndefined();
  });

  test("empty project reports needs-setup and points at mktg init", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mktg-home-empty-"));
    try {
      const { stdout } = await run(["--cwd", tmp]);
      const parsed = JSON.parse(stdout);
      expect(parsed.health).toBe("needs-setup");
      expect(parsed.help[0]).toBe("mktg init --json");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("--fields works on the home view", async () => {
    const { stdout } = await run(["--fields", "health,version"]);
    expect(Object.keys(JSON.parse(stdout)).sort()).toEqual(["health", "version"]);
  });

  test("--help keeps the full text command list", async () => {
    const { stdout } = await run(["--help", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.commands.map((c: { name: string }) => c.name)).toContain("setup");
  });

  test("collapseHome + formatHomeView", () => {
    expect(collapseHome("/home/x/proj", "/home/x")).toBe("~/proj");
    expect(collapseHome("/home/x", "/home/x")).toBe("~");
    expect(collapseHome("/home/xy/proj", "/home/x")).toBe("/home/xy/proj");
    const view: HomeView = {
      bin: "~/bin/mktg", description: "d", cwd: "~/p", version: "1.0.0", health: "ready",
      brand: { populated: 3, total: 10 }, skills: { installed: 1, total: 2 }, help: ["mktg status --json"],
    };
    const text = formatHomeView(view);
    expect(text).toContain("mktg v1.0.0");
    expect(text).toContain("3/10 populated");
    expect(text).toContain("1/2 installed");
    expect(text).toContain("mktg status --json");
    expect(text).toContain("mktg --help");
  });
});
