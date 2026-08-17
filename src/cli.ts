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

import type { GlobalFlags, CommandResult, CommandSchema, OutputFormat } from "./types";
import { OUTPUT_FORMATS } from "./types";
import { formatOutput, writeStdout, applyFieldsFilter, toJson } from "./core/output";
import { COMMANDS } from "./core/command-registry";
import { applyEnvLocal } from "./core/env-local";
import { buildHomeView } from "./core/home-view";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
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
  setup      Install a Claude Code SessionStart hook that injects mktg status into every session
  dashboard  JSON command-center (snapshot, plan, outputs, publish, system, compete, action); UI via mktg studio
  catalog    Upstream catalog registry (list, info, sync, status, add)
  list       Show available skills
  update     Force-update skills
  schema     Introspect CLI commands and output shapes
  skill      Skill lifecycle management (info, validate, graph, check, register)
  brand      Brand memory management (export, import, freshness)
  run        Load a skill and log execution
  route      Score a free-text ask against skill routing triggers
  seo        OpenSEO project link / keyword sync / status
  release    Version bump + changelog + git tag (+ optional publish)
  transcribe Audio/video → transcript via whisper.cpp (YouTube, TikTok, podcasts, local files)
  context    Brand context compiler — token-budgeted JSON artifact
  publish    Distribution pipeline — push content to platforms
  compete    Competitor change monitor — detect changes, route to skills
  studio     Launch the mktg-studio dashboard (Bun API + Next.js UI)
  verify     Orchestrated test-suite runner across the mktgmono ecosystem (dry-run planning + live execution)
  ship-check Aggregated go/no-go 🟢/🟡/🔴 verdict across all ecosystem surfaces (wraps verify + git + typecheck + doctor)
  cmo        Invoke /cmo via headless Claude Code subprocess — returns structured CmoResponse for agent consumption

Flags:
  --json           Machine-readable JSON output (compact single-line by default)
  --pretty         Indent JSON output (2 spaces) for human reading
  --format <fmt>   Success-output format: json (default) or toon (AXI token-efficient); errors stay JSON
  --dry-run        Validate without writing
  --fields <f,f>   Select fields: top-level keys, dot paths (a.b.c), or item keys for collections
  --cwd <path>     Set working directory
  --input <json>   Raw JSON payload for mutating commands
  --help, -h       Show this help
  --version, -v    Show version

Environment:
  OUTPUT_FORMAT=json   Force JSON output (same as --json)
  NO_COLOR=1           Disable ANSI color codes

Note: JSON output is automatic when stdout is piped (non-TTY).
      Bare 'mktg' prints a live home view (health, brand, skills, next commands).

Run 'mktg <command> --help' for command-specific usage.`;

// Parse global flags from argv
const parseGlobalFlags = (argv: string[]): {
  command: string | undefined;
  args: string[];
  flags: GlobalFlags;
  formatError: string | undefined;
} => {
  // OUTPUT_FORMAT=json env var or non-TTY pipe auto-enables JSON
  let json = process.env.OUTPUT_FORMAT === "json" ||
    (typeof process.stdout.isTTY !== "boolean" || !process.stdout.isTTY);
  let pretty = false;
  let format: OutputFormat = "json";
  let formatError: string | undefined;
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
    } else if (arg === "--pretty") {
      pretty = true;
    } else if (arg === "--format" || arg.startsWith("--format=")) {
      const raw = arg.startsWith("--format=") ? arg.slice(9) : (argv[i + 1] ?? "");
      if (!arg.startsWith("--format=") && argv[i + 1] !== undefined) i++;
      if ((OUTPUT_FORMATS as readonly string[]).includes(raw)) {
        format = raw as OutputFormat;
      } else {
        formatError = raw;
      }
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

  return { command, args, flags: { json, pretty, format, dryRun, fields, cwd, jsonInput }, formatError };
};

// Format a command schema as readable help text
const formatSchemaAsHelp = (schema: CommandSchema, parent?: string): string => {
  const title = parent ? `mktg ${parent} ${schema.name}` : `mktg ${schema.name}`;
  const lines: string[] = [`${title} — ${schema.description}`];

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

  if (!parent && schema.subcommands && schema.subcommands.length > 0) {
    lines.push("", `Run 'mktg ${schema.name} <subcommand> --help' or 'mktg schema ${schema.name} <subcommand> --json' for subcommand flags.`);
  }

  return lines.join("\n");
};

const GLOBAL_FLAG_NAMES = new Set(["--json", "--pretty", "--format", "--dry-run", "--fields", "--cwd", "--input", "--help", "-h", "--version", "-v"]);
// The only single-dash aliases the CLI understands (-y is init's --yes).
const KNOWN_SHORT_FLAGS = new Set(["-h", "-v", "-y"]);

// Root-level (no command) unknown flags: anything dash-prefixed that is not a
// global flag. `mktg --bogus` must exit 2, not print help and exit 0.
const findUnknownRootFlags = (args: readonly string[]): string[] =>
  args.filter((arg) => {
    if (!arg.startsWith("-")) return false;
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    return !GLOBAL_FLAG_NAMES.has(name);
  });

const normalizeFlagName = (name: string): string => (name.startsWith("--") ? name : `--${name}`);

// Levenshtein for "did you mean" flag hints (tiny inputs, no perf concern)
const editDistance = (a: string, b: string): number => {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
};

// Diff the leftover `--flags` in args against the command schema (top-level +
// every subcommand's flags + global flags). Returns the unknown flags plus
// "did you mean" hints. Commands with `passthroughFlags: true` are exempt.
const findUnknownFlags = (
  schema: CommandSchema,
  args: readonly string[],
): { unknown: string[]; hints: string[] } => {
  if (schema.passthroughFlags) return { unknown: [], hints: [] };
  const known = new Set<string>(GLOBAL_FLAG_NAMES);
  for (const f of schema.flags) known.add(normalizeFlagName(f.name));
  for (const sub of schema.subcommands ?? []) for (const f of sub.flags) known.add(normalizeFlagName(f.name));
  const unknown: string[] = [];
  const hints: string[] = [];
  for (const arg of args) {
    if (arg === "--") break;
    // Short flags (-x) are unsupported except the documented aliases; negative
    // numbers and bare "-" (stdin) are values, not flags.
    if (!arg.startsWith("--")) {
      if (/^-[A-Za-z]/.test(arg) && !KNOWN_SHORT_FLAGS.has(arg)) unknown.push(arg);
      continue;
    }
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (known.has(name)) continue;
    unknown.push(name);
    const closest = Array.from(known)
      .filter((k) => k.startsWith("--"))
      .map((k) => ({ k, d: editDistance(name, k) }))
      .sort((a, b) => a.d - b.d)[0];
    if (closest && closest.d <= 3) hints.push(`Did you mean ${closest.k}?`);
  }
  return { unknown, hints };
};

const run = async () => {
const { command, args, flags, formatError } = parseGlobalFlags(process.argv.slice(2));
applyEnvLocal(flags.cwd);

  // Unknown --format value: fail loud (AXI principle 6) before any work runs.
  if (formatError !== undefined) {
    const formatResult: CommandResult<never> = {
      ok: false,
      error: {
        code: "INVALID_ARGS",
        message: formatError === ""
          ? "--format requires a value"
          : `Unknown --format value: '${formatError}'`,
        suggestions: [
          `Supported formats: ${OUTPUT_FORMATS.join(", ")} (default: json)`,
          "mktg list --format toon",
          "mktg schema --json",
        ],
      },
      exitCode: 2,
    };
    writeStdout(formatOutput(formatResult, { ...flags, format: "json" }));
    finish(2);
    return;
  }

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

  // --help → full command list; bare `mktg` → live home view (content-first).
  const wantsHelp = args.includes("--help") || args.includes("-h");
  if (!command || command === "--help" || command === "-h") {
    const unknownRoot = findUnknownRootFlags(args);
    if (unknownRoot.length > 0) {
      const rootFlagResult: CommandResult<never> = {
        ok: false,
        error: {
          code: "UNKNOWN_FLAG",
          message: `Unknown flag${unknownRoot.length > 1 ? "s" : ""}: ${unknownRoot.join(", ")}`,
          suggestions: [`Global flags: ${Array.from(GLOBAL_FLAG_NAMES).join(", ")}`, "mktg --help", "mktg schema --json"],
        },
        exitCode: 2,
      };
      writeStdout(formatOutput(rootFlagResult, flags));
      finish(2);
      return;
    }
    if (!command && !wantsHelp) {
      // Content-first home view: what state am I in and what do I run next.
      // Invalid --cwd degrades to health "unknown" rather than exiting non-zero.
      const home = applyFieldsFilter(
        await buildHomeView(flags, VERSION, resolve(process.argv[1] ?? "mktg")),
        flags.fields,
      );
      writeStdout(formatOutput(home, flags));
      finish(home.exitCode);
      return;
    }
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
        globalFlags: ["--json", "--pretty", "--format", "--dry-run", "--fields", "--cwd", "--input"],
      };
      writeStdout(toJson(structured, flags));
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
    const schema = (mod as { schema?: CommandSchema }).schema;

    // Per-command --help: delegate to command schema. When the first positional
    // names a subcommand, print that subcommand's schema instead of the parent.
    if (wantsHelp) {
      if (schema) {
        const subName = args.find((a) => !a.startsWith("-"));
        const sub = subName ? schema.subcommands?.find((s) => s.name === subName) : undefined;
        if (flags.json) {
          // Group commands: emit a compact index (subcommand names + descriptions)
          // rather than every subcommand's full flag/output map. --full or
          // `mktg schema <cmd> --json` yields the complete schema.
          const isGroup = !sub && (schema.subcommands?.length ?? 0) > 0 && !args.includes("--full");
          const payload = isGroup
            ? {
                name: schema.name,
                description: schema.description,
                flags: schema.flags,
                ...(schema.positional && { positional: schema.positional }),
                subcommands: schema.subcommands!.map((s) => ({ name: s.name, description: s.description })),
                examples: schema.examples,
                help: [`mktg ${schema.name} <subcommand> --help`, `mktg schema ${schema.name} --json`, `mktg ${schema.name} --help --full`],
              }
            : (sub ?? schema);
          writeStdout(toJson(payload, flags));
        } else {
          writeStdout(sub ? formatSchemaAsHelp(sub, schema.name) : formatSchemaAsHelp(schema));
        }
        finish(0);
        return;
      }
    }

    // --cwd must be an existing directory — otherwise brand/ detection and
    // every relative path silently resolve against nothing.
    if (!existsSync(flags.cwd) || !statSync(flags.cwd).isDirectory()) {
      const cwdResult: CommandResult<never> = {
        ok: false,
        error: {
          code: "INVALID_ARGS",
          message: `--cwd is not an existing directory: ${flags.cwd}`,
          suggestions: ["Pass an absolute path to a project directory", "Omit --cwd to use the current directory"],
        },
        exitCode: 2,
      };
      writeStdout(formatOutput(cwdResult, flags));
      finish(2);
      return;
    }

    // Reject unknown --flags (typos like --dryrun / --confrim would otherwise
    // fall through to the non-dry-run / non-confirm path).
    if (schema) {
      const { unknown, hints } = findUnknownFlags(schema, args);
      if (unknown.length > 0) {
        const flagResult: CommandResult<never> = {
          ok: false,
          error: {
            code: "UNKNOWN_FLAG",
            message: `Unknown flag${unknown.length > 1 ? "s" : ""} for 'mktg ${command}': ${unknown.join(", ")}`,
            suggestions: [...hints, `mktg schema ${command} --json`, `mktg ${command} --help`],
          },
          exitCode: 2,
        };
        writeStdout(formatOutput(flagResult, flags));
        finish(2);
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

    // formatOutput renders `display` for TTY (plus the help[] footer) and
    // compact JSON (with top-level "help") for agents.
    writeStdout(formatOutput(result, flags));
    finish(result.exitCode);
    return;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const result: CommandResult<never> = {
      ok: false,
      error: {
        code: "UNHANDLED_ERROR",
        message,
        suggestions: ["Report this bug"],
      },
      exitCode: 1,
    };
    writeStdout(formatOutput(result, flags));
    finish(1);
    return;
  }
};

run();
