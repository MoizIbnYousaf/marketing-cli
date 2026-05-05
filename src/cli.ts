#!/usr/bin/env node
// mktg — Agent-native marketing playbook CLI
// Entry point — parses global flags and routes to command handlers.
// This file owns process exit codes. Commands return CommandResult.
//
// Shebang is `node` (not `bun`) so the bundled dist/cli.js works when
// invoked via the npm-installed `mktg` symlink on machines without bun.
// Under bun, running `bun dist/cli.js` or `bun run src/cli.ts` both ignore
// the shebang. The runtime-compat shim (imported first below) polyfills
// Bun.* APIs for the node runtime path.

// MUST be the first import — installs globalThis.Bun polyfill under node
// before any downstream module that calls Bun.file / Bun.write / etc. Under
// bun, it is a no-op because the real Bun global is already present.
import "./core/runtime-compat";

import type { GlobalFlags, CommandResult, CommandSchema } from "./types";
import { formatOutput, writeStdout, writeStderr, isTTY, applyFieldsFilter } from "./core/output";
import { COMMANDS } from "./core/command-registry";
import { applyEnvLocal } from "./core/env-local";
import pkg from "../package.json";

const VERSION = pkg.version;

const finish = (code: number): void => {
  process.exitCode = code;
};

const HELP = `mktg v${VERSION} — Agent-native marketing playbook CLI

Commands:
  init       Detect project + build brand/ + install skills (--from <url>)
  doctor     Health checks + skill updates (--fix to auto-remediate)
  plan       Execution loop — prioritized task queue from project state
  status     Project marketing state snapshot
  dashboard  Local dashboard — snapshot, actions, launch
  catalog    Upstream catalog registry (list, info, sync, status, add)
  list       Show available skills
  update     Force-update skills
  schema     Introspect CLI commands and output shapes
  skill      Skill lifecycle management (info, validate, graph, check, register)
  brand      Brand memory management (export, import, freshness)
  run        Load a skill and log execution
  transcribe Audio/video → transcript via whisper.cpp (YouTube, TikTok, podcasts, local files)
  context    Brand context compiler — token-budgeted JSON artifact
  publish    Distribution pipeline — push content to platforms
  compete    Competitor change monitor — detect changes, route to skills
  studio     Launch the mktg-studio dashboard (Bun API + Next.js UI)
  verify     Orchestrated test-suite runner across the mktgmono ecosystem (dry-run planning + live execution)
  ship-check Aggregated go/no-go 🟢/🟡/🔴 verdict across all ecosystem surfaces (wraps verify + git + typecheck + doctor)
  cmo        Invoke /cmo via headless Claude Code subprocess — returns structured CmoResponse for agent consumption
  propagate  3-way sync: keep mktg-site mirror + Ai-Agent-Skills registry in sync with canonical skills-manifest

Flags:
  --json           Machine-readable JSON output
  --dry-run        Validate without writing
  --fields <f,f>   Limit output fields (comma-separated)
  --cwd <path>     Set working directory
  --help, -h       Show this help
  --version, -v    Show version

Environment:
  OUTPUT_FORMAT=json   Force JSON output (same as --json)
  NO_COLOR=1           Disable ANSI color codes

Note: JSON output is automatic when stdout is piped (non-TTY).

Run 'mktg <command> --help' for command-specific usage.`;

// Parse global flags from argv
const parseGlobalFlags = (argv: string[]): { command: string | undefined; args: string[]; flags: GlobalFlags } => {
  // OUTPUT_FORMAT=json env var or non-TTY pipe auto-enables JSON
  let json = process.env.OUTPUT_FORMAT === "json" ||
    (typeof process.stdout.isTTY !== "boolean" || !process.stdout.isTTY);
  let dryRun = false;
  let fields: string[] = [];
  let cwd = process.cwd();
  let jsonInput: string | undefined;
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
    } else if (arg === "--input" && argv[i + 1]) {
      jsonInput = argv[i + 1]!;
      i++;
    } else if (arg.startsWith("--input=")) {
      jsonInput = arg.slice(8);
    } else if (!command && !arg.startsWith("-")) {
      command = arg;
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags: { json, dryRun, fields, cwd, jsonInput } };
};

// Format a command schema as readable help text
const formatSchemaAsHelp = (schema: CommandSchema): string => {
  const lines: string[] = [`mktg ${schema.name} — ${schema.description}`];

  if (schema.subcommands && schema.subcommands.length > 0) {
    lines.push("", "Subcommands:");
    for (const sub of schema.subcommands) {
      lines.push(`  ${sub.name.padEnd(14)} ${sub.description}`);
    }
  }

  if (schema.flags.length > 0) {
    lines.push("", "Flags:");
    for (const flag of schema.flags) {
      const req = flag.required ? " (required)" : "";
      const name = flag.name.startsWith("--") ? flag.name : `--${flag.name}`;
      lines.push(`  ${name.padEnd(16)} ${flag.description}${req}`);
    }
  }

  if (schema.examples.length > 0) {
    lines.push("", "Examples:");
    for (const ex of schema.examples) {
      lines.push(`  ${ex.args}`);
      lines.push(`    ${ex.description}`);
    }
  }

  return lines.join("\n");
};

const run = async () => {
const { command, args, flags } = parseGlobalFlags(process.argv.slice(2));
applyEnvLocal(flags.cwd);

  // --version
  if (args.includes("--version") || args.includes("-v")) {
    if (flags.json) {
      writeStdout(JSON.stringify({ version: VERSION }));
    } else {
      writeStdout(`mktg v${VERSION}`);
    }
    finish(0);
    return;
  }

  // --help / no command → show global help (but NOT if a command is specified)
  const wantsHelp = args.includes("--help") || args.includes("-h");
  if (!command || command === "--help" || command === "-h") {
    if (flags.json) {
      const schemas = await Promise.all(
        Object.keys(COMMANDS).map(async (name) => {
          try {
            const mod = await COMMANDS[name]!();
            return { name, description: (mod as { schema?: CommandSchema }).schema?.description ?? "" };
          } catch { return { name, description: "" }; }
        }),
      );
      const structured = {
        version: VERSION,
        commands: schemas,
        globalFlags: ["--json", "--dry-run", "--fields", "--cwd"],
      };
      writeStdout(JSON.stringify(structured, null, 2));
    } else {
      writeStdout(HELP);
    }
    finish(0);
    return;
  }

  // Route to command
  const loader = COMMANDS[command];
  if (!loader) {
    // Handle --version as a positional (e.g., user types `mktg -v` and parser sees -v as command)
    if (command === "--version" || command === "-v") {
      if (flags.json) {
        writeStdout(JSON.stringify({ version: VERSION }));
      } else {
        writeStdout(`mktg v${VERSION}`);
      }
      finish(0);
      return;
    }

    const unknownResult = {
      ok: false as const,
      error: {
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: '${command}'`,
        suggestions: [`mktg --help`, `Available: ${Object.keys(COMMANDS).join(", ")}`],
      },
      exitCode: 2 as const,
    };
    writeStdout(formatOutput(unknownResult, flags));
    finish(2);
    return;
  }

  try {
    const mod = await loader();

    // Per-command --help: delegate to command schema
    if (wantsHelp) {
      const schema = (mod as { schema?: CommandSchema }).schema;
      if (schema) {
        if (flags.json) {
          writeStdout(JSON.stringify(schema, null, 2));
        } else {
          writeStdout(formatSchemaAsHelp(schema));
        }
        finish(0);
        return;
      }
    }

    const rawResult = await mod.handler(args, flags);

    // Apply --fields filter (may transform success result into UNKNOWN_FIELD
    // error if requested fields don't exist on the response). The transformed
    // result drives both stdout and the process exit code, so a typo'd field
    // exits with code 2 and emits a structured error envelope rather than
    // silently returning {} with exit 0.
    const result = applyFieldsFilter(rawResult, flags.fields);

    // Handle display for TTY commands that build their own output
    if (result.ok && result.display && isTTY() && !flags.json) {
      writeStdout(result.display);
      finish(result.exitCode);
      return;
    }

    writeStdout(formatOutput(result, flags));
    finish(result.exitCode);
    return;
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
    finish(1);
    return;
  }
};

run();
