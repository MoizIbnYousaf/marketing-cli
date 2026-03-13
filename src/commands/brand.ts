// mktg brand — Brand memory management
import { type CommandHandler, type CommandSchema } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notImplemented } from "../core/errors";

const SUBCOMMANDS = {
  "export": "Export brand memory as portable JSON bundle",
  "import": "Import brand memory from a JSON bundle",
  "reset": "Reset brand/ to template defaults",
  "freshness": "Check brand file freshness against skill review intervals",
} as const;

export const schema: CommandSchema = {
  name: "brand",
  description: "Brand memory management — export, import, reset, and check freshness",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags: [],
    output: {},
    examples: [{ args: `mktg brand ${name} --json`, description }],
  })),
  output: {},
  examples: [
    { args: "mktg brand export --json", description: "Export brand memory" },
    { args: "mktg brand freshness --json", description: "Check file freshness" },
    { args: "mktg brand reset --json", description: "Reset to defaults" },
  ],
  vocabulary: ["brand export", "brand import", "brand freshness", "brand reset", "brand memory"],
};

export const handler: CommandHandler = async (args, _flags) => {
  const subcommand = args.filter(a => !a.startsWith("--"))[0];
  if (!subcommand) {
    return invalidArgs("Missing subcommand", [
      `Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`,
      "Usage: mktg brand <subcommand> [args]",
    ]);
  }
  if (!isKeyOf(SUBCOMMANDS, subcommand)) {
    return invalidArgs(`Unknown subcommand: brand ${subcommand}`, [
      ...Object.keys(SUBCOMMANDS).map(s => `mktg brand ${s}`),
    ]);
  }
  return notImplemented(`brand ${subcommand}`);
};
