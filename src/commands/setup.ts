// mktg setup — Ambient context: install a Claude Code SessionStart hook that
// injects `mktg status` (health, brand summary, next actions) into every session.
// Idempotent: re-running detects the existing entry and reports changed:false.
// Project-scoped by default (./.claude/settings.json); --global targets
// $HOME/.claude/settings.json. --dry-run shows what would be written.

import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { hasFlag } from "../core/args";
import { bold, dim, green, isTTY } from "../core/output";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const HOOK_EVENT = "SessionStart";
export const HOOK_COMMAND = "mktg status --fields health,brandSummary,nextActions --json";
// Stable marker used to recognise (and upgrade) an entry we installed earlier.
const HOOK_MARKER = "mktg status";

export const schema: CommandSchema = {
  name: "setup",
  description: "Install a Claude Code SessionStart hook that runs `mktg status` so every session starts with live marketing context",
  flags: [
    { name: "--global", type: "boolean", required: false, default: false, description: "Write to ~/.claude/settings.json instead of ./.claude/settings.json" },
  ],
  output: {
    "installed": "boolean — hook is present after this run (true even when nothing changed)",
    "changed": "boolean — this run wrote (or would write, with --dry-run) the settings file",
    "dryRun": "boolean — true when nothing was written",
    "scope": "'project' | 'global' — which settings.json was targeted",
    "path": "string — absolute path of the settings.json",
    "hook": "{event, command} — the SessionStart hook entry",
    "settings": "object — resulting settings.json content (what was / would be written)",
  },
  examples: [
    { args: "mktg setup --json", description: "Install the hook into ./.claude/settings.json (idempotent)" },
    { args: "mktg setup --dry-run --json", description: "Preview the settings.json that would be written" },
    { args: "mktg setup --global --json", description: "Install into ~/.claude/settings.json for every project" },
  ],
  vocabulary: ["setup", "hook", "session", "ambient", "claude"],
};

type HookEntry = { readonly type: "command"; readonly command: string; readonly [k: string]: unknown };
type HookGroup = { readonly matcher?: string; readonly hooks: readonly HookEntry[]; readonly [k: string]: unknown };
type Settings = Record<string, unknown> & { hooks?: Record<string, unknown> };

type SetupResult = {
  readonly installed: boolean;
  readonly changed: boolean;
  readonly dryRun: boolean;
  readonly scope: "project" | "global";
  readonly path: string;
  readonly hook: { readonly event: string; readonly command: string };
  readonly settings: Settings;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Resolve the target settings.json. HOME is honoured so tests can redirect --global. */
export const resolveSettingsPath = (cwd: string, global: boolean): string =>
  global
    ? join(process.env.HOME || homedir(), ".claude", "settings.json")
    : join(cwd, ".claude", "settings.json");

const readSettings = (path: string): { ok: true; settings: Settings } | { ok: false; message: string } => {
  if (!existsSync(path)) return { ok: true, settings: {} };
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf-8"));
    if (!isRecord(parsed)) return { ok: false, message: `${path} is not a JSON object` };
    return { ok: true, settings: parsed as Settings };
  } catch (e) {
    return { ok: false, message: `${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
};

/** Pure merge: returns the new settings + whether anything changed. */
export const mergeSessionStartHook = (settings: Settings): { settings: Settings; changed: boolean } => {
  const hooks = isRecord(settings.hooks) ? { ...settings.hooks } : {};
  const existing = Array.isArray(hooks[HOOK_EVENT]) ? (hooks[HOOK_EVENT] as HookGroup[]) : [];
  let changed = false;
  let found = false;
  const groups: HookGroup[] = existing.map((group) => {
    if (!isRecord(group) || !Array.isArray(group.hooks)) return group;
    const entries = group.hooks.map((h) => {
      if (!isRecord(h) || typeof h.command !== "string" || !h.command.includes(HOOK_MARKER)) return h;
      found = true;
      if (h.command === HOOK_COMMAND) return h;
      changed = true; // older mktg hook variant — upgrade in place
      return { ...h, command: HOOK_COMMAND };
    });
    return { ...group, hooks: entries };
  });
  if (!found) {
    groups.push({ hooks: [{ type: "command", command: HOOK_COMMAND }] });
    changed = true;
  }
  return { settings: { ...settings, hooks: { ...hooks, [HOOK_EVENT]: groups } }, changed };
};

export const handler: CommandHandler<SetupResult> = async (args, flags) => {
  const global = hasFlag(args, "--global");
  const scope = global ? "global" : "project";
  const path = resolveSettingsPath(flags.cwd, global);

  const read = readSettings(path);
  if (!read.ok) {
    return err("SETTINGS_PARSE_ERROR", read.message, [
      `Fix or remove ${path} and re-run mktg setup`,
      "mktg setup --dry-run --json",
    ], 2);
  }

  const { settings, changed } = mergeSessionStartHook(read.settings);

  if (changed && !flags.dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
  }

  const result: SetupResult = {
    installed: true,
    changed,
    dryRun: flags.dryRun,
    scope,
    path,
    hook: { event: HOOK_EVENT, command: HOOK_COMMAND },
    settings,
  };
  const help = [
    HOOK_COMMAND,
    ...(global ? [] : ["mktg setup --global --json"]),
    "mktg status --json",
  ];

  if (flags.json || !isTTY()) return ok(result, undefined, help);

  const verb = flags.dryRun ? (changed ? "would install" : "already installed (no write needed)")
    : changed ? "installed" : "already installed";
  const lines = [
    bold(`mktg setup — ${HOOK_EVENT} hook ${verb}`),
    `  ${dim("scope")}    ${scope}`,
    `  ${dim("file")}     ${path}`,
    `  ${dim("command")}  ${HOOK_COMMAND}`,
    "",
    changed && !flags.dryRun ? green("  ✓ Every new Claude Code session now starts with live mktg context.")
      : dim("  Nothing written."),
  ];
  return ok(result, lines.join("\n"), help);
};
