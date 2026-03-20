// mktg schema — Introspect CLI commands, flags, and output shapes
// Agents use this to self-discover CLI capabilities at runtime.

import { ok, err, type CommandHandler, type CommandSchema, type CommandFlag } from "../types";
import pkg from "../../package.json";

const VERSION = pkg.version;

const GLOBAL_FLAGS: readonly CommandFlag[] = [
  { name: "--json", type: "boolean", required: false, default: false, description: "Machine-readable JSON output (always JSON when stdout is not a TTY)" },
  { name: "--dry-run", type: "boolean", required: false, default: false, description: "Validate without writing files or side effects" },
  { name: "--fields", type: "string[]", required: false, default: [], description: "Limit output to these top-level fields (comma-separated)" },
  { name: "--cwd", type: "string", required: false, default: ".", description: "Set working directory for brand/ and project detection" },
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
  const modules = await Promise.all([
    import("./init").then(m => m.schema).catch(() => null),
    import("./doctor").then(m => m.schema).catch(() => null),
    import("./list").then(m => m.schema).catch(() => null),
    import("./status").then(m => m.schema).catch(() => null),
    import("./update").then(m => m.schema).catch(() => null),
    import("./skill").then(m => m.schema).catch(() => null),
    import("./brand").then(m => m.schema).catch(() => null),
    import("./run").then(m => m.schema).catch(() => null),
  ]);
  const schemas: Record<string, CommandSchema> = { schema };
  for (const s of modules) {
    if (s) schemas[s.name] = s;
  }
  return schemas;
};

export const schema: CommandSchema = {
  name: "schema",
  description: "Introspect CLI commands, flags, and output shapes — the single source of truth for any agent using this CLI",
  flags: [],
  output: {
    "version": "string — CLI version (semver)",
    "commands": "CommandSchema[] — full schema for every command including flags, positional args, subcommands, output shape, and examples",
    "globalFlags": "CommandFlag[] — global flags with name, type, default, and description",
    "exitCodes": "Record<number, string> — exit code meanings (0=success through 6=not implemented)",
  },
  examples: [
    { args: "mktg schema --json", description: "Full CLI introspection — all commands, flags, exit codes" },
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

export const handler: CommandHandler = async (args, _flags) => {
  const schemas = await loadSchemas();

  // Filter out --flags from args
  const positionalArgs = args.filter(a => !a.startsWith("--"));

  // No args: return all schemas with full introspection
  if (positionalArgs.length === 0) {
    return ok({
      version: VERSION,
      commands: Object.values(schemas).map(enrichSchema),
      globalFlags: GLOBAL_FLAGS,
      exitCodes: EXIT_CODES,
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
