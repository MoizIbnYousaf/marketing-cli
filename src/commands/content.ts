// mktg content — Content registry and stats
import { type CommandHandler, type CommandSchema } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notImplemented } from "../core/errors";

const SUBCOMMANDS = {
  list: "List marketing content files with metadata",
  stats: "Show content statistics and coverage gaps",
} as const;

export const schema: CommandSchema = {
  name: "content",
  description: "Content registry and statistics — list files and analyze coverage",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags: [],
    output: {},
    examples: [{ args: `mktg content ${name} --json`, description }],
  })),
  output: {},
  examples: [
    { args: "mktg content list --json", description: "List content files" },
    { args: "mktg content stats --json", description: "Show content statistics" },
  ],
  vocabulary: ["content list", "content stats", "marketing content", "content registry"],
};

export const handler: CommandHandler = async (args, _flags) => {
  const subcommand = args.filter(a => !a.startsWith("--"))[0];
  if (!subcommand) {
    return invalidArgs("Missing subcommand", [
      `Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`,
      "Usage: mktg content <subcommand> [args]",
    ]);
  }
  if (!isKeyOf(SUBCOMMANDS, subcommand)) {
    return invalidArgs(`Unknown subcommand: content ${subcommand}`, [
      ...Object.keys(SUBCOMMANDS).map(s => `mktg content ${s}`),
    ]);
  }
  return notImplemented(`content ${subcommand}`);
};
