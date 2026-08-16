// mktg setup — SessionStart hook installer. Real temp dirs, HOME override for
// --global; the real ~/.claude is never touched.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handler, HOOK_COMMAND, mergeSessionStartHook, resolveSettingsPath } from "../src/commands/setup";
import { COMMANDS, TOP_LEVEL_COMMANDS } from "../src/core/command-registry";

const ROOT = join(import.meta.dir, "..");
let tmp: string;
const flags = (over: Partial<{ dryRun: boolean; cwd: string }> = {}) => ({
  json: true, dryRun: false, fields: [], cwd: tmp, jsonInput: undefined, ...over,
});

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf-8"));

beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "mktg-setup-")); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

describe("mktg setup (project scope)", () => {
  test("registered in the command registry", () => {
    expect(TOP_LEVEL_COMMANDS).toContain("setup");
    expect(COMMANDS.setup).toBeDefined();
  });

  test("first run writes ./.claude/settings.json with the SessionStart hook", async () => {
    const res = await handler([], flags());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({ installed: true, changed: true, dryRun: false, scope: "project" });
    const p = join(tmp, ".claude", "settings.json");
    expect(res.data.path).toBe(p);
    const settings = readJson(p);
    expect(settings.hooks.SessionStart[0].hooks[0]).toEqual({ type: "command", command: HOOK_COMMAND });
    expect(HOOK_COMMAND).toBe("mktg status --fields health,brandSummary,nextActions --json");
    expect(res.help).toBeDefined();
  });

  test("second run is idempotent: installed:true, changed:false, file untouched", async () => {
    await handler([], flags());
    const p = join(tmp, ".claude", "settings.json");
    const before = readFileSync(p, "utf-8");
    const res = await handler([], flags());
    expect(res.ok && res.data.installed).toBe(true);
    expect(res.ok && res.data.changed).toBe(false);
    expect(readFileSync(p, "utf-8")).toBe(before);
    expect(readJson(p).hooks.SessionStart.length).toBe(1);
  });

  test("--dry-run reports what would be written and writes nothing", async () => {
    const res = await handler([], flags({ dryRun: true }));
    expect(res.ok && res.data.dryRun).toBe(true);
    expect(res.ok && res.data.changed).toBe(true);
    expect(res.ok && res.data.settings.hooks).toBeDefined();
    expect(existsSync(join(tmp, ".claude", "settings.json"))).toBe(false);
  });

  test("preserves existing settings + other hooks", async () => {
    mkdirSync(join(tmp, ".claude"));
    const p = join(tmp, ".claude", "settings.json");
    writeFileSync(p, JSON.stringify({
      permissions: { allow: ["Bash(ls)"] },
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo hi" }] }], Stop: [] },
    }));
    const res = await handler([], flags());
    expect(res.ok && res.data.changed).toBe(true);
    const settings = readJson(p);
    expect(settings.permissions.allow).toEqual(["Bash(ls)"]);
    expect(settings.hooks.Stop).toEqual([]);
    expect(settings.hooks.SessionStart.length).toBe(2);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe("echo hi");
    expect(settings.hooks.SessionStart[1].hooks[0].command).toBe(HOOK_COMMAND);
  });

  test("upgrades an older mktg status hook variant in place", () => {
    const merged = mergeSessionStartHook({
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "mktg status --json" }] }] },
    });
    expect(merged.changed).toBe(true);
    const groups = (merged.settings.hooks as { SessionStart: Array<{ hooks: Array<{ command: string }> }> }).SessionStart;
    expect(groups.length).toBe(1);
    expect(groups[0]!.hooks[0]!.command).toBe(HOOK_COMMAND);
  });

  test("invalid settings.json is a loud SETTINGS_PARSE_ERROR (exit 2)", async () => {
    mkdirSync(join(tmp, ".claude"));
    writeFileSync(join(tmp, ".claude", "settings.json"), "{ not json");
    const res = await handler([], flags());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("SETTINGS_PARSE_ERROR");
    expect(res.exitCode).toBe(2);
  });
});

describe("mktg setup --global (HOME override)", () => {
  test("writes to $HOME/.claude/settings.json under an overridden HOME", async () => {
    const fakeHome = join(tmp, "home");
    mkdirSync(fakeHome);
    const prev = process.env.HOME;
    process.env.HOME = fakeHome;
    try {
      expect(resolveSettingsPath(tmp, true)).toBe(join(fakeHome, ".claude", "settings.json"));
      const res = await handler(["--global"], flags());
      expect(res.ok && res.data.scope).toBe("global");
      expect(res.ok && res.data.path).toBe(join(fakeHome, ".claude", "settings.json"));
      expect(readJson(join(fakeHome, ".claude", "settings.json")).hooks.SessionStart[0].hooks[0].command).toBe(HOOK_COMMAND);
      expect(existsSync(join(tmp, ".claude"))).toBe(false);
    } finally {
      process.env.HOME = prev;
    }
  });

  test("subprocess: --global honours HOME env and is idempotent", async () => {
    const fakeHome = join(tmp, "home2");
    mkdirSync(fakeHome);
    const spawn = async () => {
      const proc = Bun.spawn(["bun", "run", join(ROOT, "src/cli.ts"), "setup", "--global", "--json", "--cwd", tmp], {
        cwd: ROOT, stdout: "pipe", stderr: "pipe", env: { ...process.env, HOME: fakeHome, NO_COLOR: "1" },
      });
      const out = await new Response(proc.stdout).text();
      return { parsed: JSON.parse(out), exitCode: await proc.exited };
    };
    const first = await spawn();
    expect(first.exitCode).toBe(0);
    expect(first.parsed.changed).toBe(true);
    expect(first.parsed.path).toBe(join(fakeHome, ".claude", "settings.json"));
    const second = await spawn();
    expect(second.parsed).toMatchObject({ installed: true, changed: false });
  });
});
