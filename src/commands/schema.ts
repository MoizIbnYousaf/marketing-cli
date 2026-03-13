// mktg schema — Introspect CLI commands, flags, and output shapes
// Agents use this to self-discover CLI capabilities at runtime.

import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import pkg from "../../package.json";

const VERSION = pkg.version;

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
  description: "Introspect CLI commands, flags, and output shapes",
  flags: [],
  output: {
    "version": "string — CLI version",
    "commands": "CommandSchema[] — all command schemas",
    "globalFlags": "string[] — global flag names",
  },
  examples: [
    { args: "mktg schema --json", description: "List all command schemas" },
    { args: "mktg schema init --json", description: "Get init command schema" },
    { args: "mktg schema skill info --json", description: "Get subcommand schema" },
  ],
};

export const handler: CommandHandler = async (args, _flags) => {
  const schemas = await loadSchemas();

  // Filter out --flags from args
  const positionalArgs = args.filter(a => !a.startsWith("--"));

  // No args: return all schemas
  if (positionalArgs.length === 0) {
    return ok({
      version: VERSION,
      commands: Object.values(schemas),
      globalFlags: ["--json", "--dry-run", "--fields", "--cwd"],
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
    return ok(sub);
  }

  return ok(cmdSchema);
};
