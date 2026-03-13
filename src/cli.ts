#!/usr/bin/env bun
// mktg — Agent-native marketing playbook CLI
// Entry point — parses global flags and routes to command handlers.
// Only this file calls process.exit(). Commands return CommandResult.

import type { GlobalFlags, CommandResult } from "./types";
import { formatOutput, writeStdout, writeStderr, isTTY } from "./core/output";

const VERSION = "0.1.0";

const HELP = `mktg v${VERSION} — Agent-native marketing playbook CLI

Commands:
  init       Detect project + build brand/ + install skills
  doctor     Health checks + skill updates
  status     Project marketing state snapshot
  list       Show available skills
  update     Force-update skills
  schema     Introspect CLI commands and output shapes
  skill      Skill lifecycle management (info, validate, graph, check, register)
  brand      Brand memory management (export, import, reset, freshness)
  content    Content registry and statistics (list, stats)

Flags:
  --json           Machine-readable JSON output
  --dry-run        Validate without writing
  --fields <f,f>   Limit output fields (comma-separated)
  --cwd <path>     Set working directory
  --help, -h       Show this help
  --version, -v    Show version

Run 'mktg <command> --help' for command-specific usage.`;

// Parse global flags from argv
const parseGlobalFlags = (argv: string[]): { command: string | undefined; args: string[]; flags: GlobalFlags } => {
  let json = false;
  let dryRun = false;
  let fields: string[] = [];
  let cwd = process.cwd();
  let command: string | undefined;
  const args: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === "--json") {
      json = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--fields" && argv[i + 1]) {
      fields = argv[i + 1]!.split(",").map((f) => f.trim());
      i++;
    } else if (arg.startsWith("--fields=")) {
      fields = arg.slice(9).split(",").map((f) => f.trim());
    } else if (arg === "--cwd" && argv[i + 1]) {
      cwd = argv[i + 1]!;
      i++;
    } else if (arg.startsWith("--cwd=")) {
      cwd = arg.slice(6);
    } else if (!command && !arg.startsWith("-")) {
      command = arg;
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags: { json, dryRun, fields, cwd } };
};

// Command registry — lazy imports to keep startup fast
const COMMANDS: Record<string, () => Promise<{ handler: (args: readonly string[], flags: GlobalFlags) => Promise<CommandResult> }>> = {
  init: () => import("./commands/init"),
  doctor: () => import("./commands/doctor"),
  status: () => import("./commands/status"),
  list: () => import("./commands/list"),
  update: () => import("./commands/update"),
  schema: () => import("./commands/schema"),
  skill: () => import("./commands/skill"),
  brand: () => import("./commands/brand"),
  content: () => import("./commands/content"),
};

const run = async () => {
  const { command, args, flags } = parseGlobalFlags(process.argv.slice(2));

  // --version
  if (args.includes("--version") || args.includes("-v")) {
    if (flags.json) {
      writeStdout(JSON.stringify({ version: VERSION }));
    } else {
      writeStdout(`mktg v${VERSION}`);
    }
    process.exit(0);
  }

  // --help / no command
  if (!command || args.includes("--help") || args.includes("-h") || command === "--help" || command === "-h") {
    if (flags.json) {
      const structured = {
        version: VERSION,
        commands: Object.keys(COMMANDS).map((name) => ({ name })),
        globalFlags: ["--json", "--dry-run", "--fields", "--cwd"],
      };
      writeStdout(JSON.stringify(structured, null, 2));
    } else {
      writeStdout(HELP);
    }
    process.exit(0);
  }

  // --version
  if (command === "--version" || command === "-v") {
    if (flags.json) {
      writeStdout(JSON.stringify({ version: VERSION }));
    } else {
      writeStdout(`mktg v${VERSION}`);
    }
    process.exit(0);
  }

  // Route to command
  const loader = COMMANDS[command];
  if (!loader) {
    const result = {
      error: {
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: '${command}'`,
        suggestions: [`mktg --help`, `Available: ${Object.keys(COMMANDS).join(", ")}`],
      },
    };
    writeStdout(JSON.stringify(result, null, 2));
    process.exit(2);
  }

  try {
    const mod = await loader();
    const result = await mod.handler(args, flags);

    // Handle display for TTY commands that build their own output
    if (result.ok && result.display && isTTY() && !flags.json) {
      writeStdout(result.display);
      process.exit(result.exitCode);
    }

    writeStdout(formatOutput(result, flags));
    process.exit(result.exitCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const result = {
      error: {
        code: "UNHANDLED_ERROR",
        message,
        suggestions: ["Report this bug"],
      },
    };
    writeStdout(JSON.stringify(result, null, 2));
    process.exit(1);
  }
};

run();
