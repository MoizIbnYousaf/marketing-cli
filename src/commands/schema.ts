// mktg schema — Introspect CLI commands, flags, and output shapes
// Agents use this to self-discover CLI capabilities at runtime.

import { ok, err, type CommandHandler, type CommandSchema, type CommandFlag } from "../types";
import { COMMANDS, TOP_LEVEL_COMMANDS } from "../core/command-registry";
import pkg from "../../package.json";

const VERSION = pkg.version;

const GLOBAL_FLAGS: readonly CommandFlag[] = [
  { name: "--json", type: "boolean", required: false, default: false, description: "Machine-readable JSON output (always JSON when stdout is not a TTY; compact single-line by default)" },
  { name: "--pretty", type: "boolean", required: false, default: false, description: "Indent JSON output with 2 spaces (default JSON is compact for agents)" },
  { name: "--format", type: "string", required: false, default: "json", description: "Success-output format: json (default) or toon (AXI principle 1 token-efficient encoding). Errors are always JSON; --pretty is a no-op with toon" },
  { name: "--dry-run", type: "boolean", required: false, default: false, description: "Validate without writing files or side effects" },
  { name: "--fields", type: "string[]", required: false, default: [], description: "Select fields (comma-separated): top-level keys, dot paths (a.b.c), or item-level keys for collection responses (returns filtered array)" },
  { name: "--cwd", type: "string", required: false, default: ".", description: "Set working directory for brand/ and project detection" },
  { name: "--input", type: "string", required: false, default: "", description: "Raw JSON payload for mutating commands (e.g. dashboard action, brand append-learning, seo link-project)" },
];

const EXIT_CODES: Record<number, string> = {
  0: "Success",
  1: "Not found (skill, brand file, or resource missing)",
  2: "Invalid arguments (bad flags, missing required args)",
  3: "Dependency missing (CLI tool or integration not installed)",
  4: "Skill execution failed",
  5: "Network error (web research, API call)",
  6: "Not implemented (temporary, for stub commands)",
};

const loadSchemas = async (): Promise<Record<string, CommandSchema>> => {
  const modules = await Promise.all(
    TOP_LEVEL_COMMANDS
      .filter((name) => name !== "schema")
      .map(async (name) => {
        try {
          const mod = await COMMANDS[name]!();
          return mod.schema ?? null;
        } catch {
          return null;
        }
      }),
  );
  const schemas: Record<string, CommandSchema> = { schema };
  for (const s of modules) {
    if (s) schemas[s.name] = s;
  }
  return schemas;
};

export const schema: CommandSchema = {
  name: "schema",
  description: "Introspect CLI commands, flags, and output shapes — the single source of truth for any agent using this CLI",
  flags: [
    { name: "--full", type: "boolean", required: false, default: false, description: "Bare `mktg schema`: include output maps, examples, vocabulary, and full subcommand schemas for every command (default is a compact index)" },
  ],
  output: {
    "version": "string — CLI version (semver)",
    "commands": "CommandSchema[] — compact index by default: name, description, flags, positional, responseSchema, subcommands[{name, description}]. Full schemas with --full or via `mktg schema <command>`",
    "globalFlags": "CommandFlag[] — global flags with name, type, default, and description",
    "exitCodes": "Record<number, string> — exit code meanings (0=success through 6=not implemented)",
    "full": "boolean — whether commands[] carries the full schema (--full) or the compact index",
    "help": "string[] — how to get full per-command detail",
  },
  examples: [
    { args: "mktg schema --json", description: "Compact CLI index — all commands, flags, typed responseSchema, exit codes" },
    { args: "mktg schema --full --json", description: "Full CLI introspection — every command with output maps, examples, and subcommand schemas" },
    { args: "mktg schema init --json", description: "Get init command schema only" },
    { args: "mktg schema skill info --json", description: "Get subcommand schema" },
  ],
};

// Parse "type — description" strings from output field into structured schema
type ResponseField = {
  readonly field: string;
  readonly type: string;
  readonly description: string;
  readonly nested?: boolean;
  readonly enumValues?: readonly string[];
  readonly required?: boolean;
};

// Extract enum values from type strings like "'ready' | 'incomplete' | 'needs-setup'"
const extractEnumValues = (typeStr: string): string[] | null => {
  const matches = typeStr.match(/'([^']+)'/g);
  if (matches && matches.length >= 2) {
    return matches.map(s => s.replace(/'/g, ""));
  }
  return null;
};

const parseOutputToResponseSchema = (output: Readonly<Record<string, string>>): ResponseField[] => {
  const fields: ResponseField[] = [];
  for (const [key, value] of Object.entries(output)) {
    // Skip nested field descriptors (e.g., "brand.*.isTemplate")
    if (key.includes(".")) {
      const dashIdx = value.indexOf("—");
      const rawType = dashIdx > 0 ? value.substring(0, dashIdx).trim() : value.split(" ")[0] ?? "unknown";
      const desc = dashIdx > 0 ? value.substring(dashIdx + 1).trim() : value;
      const enumVals = extractEnumValues(rawType);
      fields.push({
        field: key,
        type: rawType,
        description: desc,
        nested: true,
        ...(enumVals && { enumValues: enumVals }),
      });
      continue;
    }
    // Parse "type — description" format
    const dashIdx = value.indexOf("—");
    if (dashIdx > 0) {
      const rawType = value.substring(0, dashIdx).trim();
      const desc = value.substring(dashIdx + 1).trim();
      const enumVals = extractEnumValues(rawType);
      fields.push({
        field: key,
        type: rawType,
        description: desc,
        required: true,
        ...(enumVals && { enumValues: enumVals }),
      });
    } else {
      fields.push({ field: key, type: "unknown", description: value, required: true });
    }
  }
  return fields;
};

// Enrich a command schema with machine-parseable responseSchema
const enrichSchema = (cmd: CommandSchema) => ({
  ...cmd,
  responseSchema: parseOutputToResponseSchema(cmd.output),
  ...(cmd.subcommands && {
    subcommands: cmd.subcommands.map(sub => ({
      ...sub,
      responseSchema: parseOutputToResponseSchema(sub.output),
    })),
  }),
});

// Compact index entry for the bare `mktg schema` listing: keeps the typed
// responseSchema (what agents parse) but drops the prose output map,
// examples, vocabulary, and nested subcommand detail (all reachable via
// `mktg schema <command> [<sub>]` or `--full`).
const compactSchema = (cmd: CommandSchema) => ({
  name: cmd.name,
  description: cmd.description,
  flags: cmd.flags,
  ...(cmd.positional && { positional: cmd.positional }),
  responseSchema: parseOutputToResponseSchema(cmd.output),
  ...(cmd.subcommands && {
    subcommands: cmd.subcommands.map((sub) => ({ name: sub.name, description: sub.description })),
  }),
});

export const handler: CommandHandler = async (args, _flags) => {
  const schemas = await loadSchemas();
  const wantsFull = args.includes("--full");

  // Filter out --flags from args
  const positionalArgs = args.filter(a => !a.startsWith("--"));

  // No args: compact index by default; --full restores the complete dump
  if (positionalArgs.length === 0) {
    return ok({
      version: VERSION,
      commands: Object.values(schemas).map((cmd): unknown => (wantsFull ? enrichSchema(cmd) : compactSchema(cmd))),
      globalFlags: GLOBAL_FLAGS,
      exitCodes: EXIT_CODES,
      full: wantsFull,
      help: wantsFull
        ? ["mktg schema <command> --json — single command schema"]
        : [
            "mktg schema <command> --json — full schema (output map, examples, subcommands) for one command",
            "mktg schema <command> <subcommand> --json — subcommand schema",
            "mktg schema --full --json — full schemas for every command",
          ],
    });
  }

  const cmdName = positionalArgs[0]!;
  const cmdSchema = schemas[cmdName];

  if (!cmdSchema) {
    return err(
      "NOT_FOUND",
      `No schema for command: '${cmdName}'`,
      [`Available: ${Object.keys(schemas).join(", ")}`],
      1,
    );
  }

  // Two-level: mktg schema skill info
  if (positionalArgs[1] && cmdSchema.subcommands) {
    const sub = cmdSchema.subcommands.find(s => s.name === positionalArgs[1]);
    if (!sub) {
      return err(
        "NOT_FOUND",
        `No subcommand '${positionalArgs[1]}' in '${cmdName}'`,
        [`Available: ${cmdSchema.subcommands.map(s => s.name).join(", ")}`],
        1,
      );
    }
    return ok(enrichSchema(sub));
  }

  return ok(enrichSchema(cmdSchema));
};
