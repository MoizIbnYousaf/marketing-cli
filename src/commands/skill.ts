// mktg skill — Skill lifecycle management
import { type CommandHandler, type CommandSchema } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notImplemented } from "../core/errors";

const SUBCOMMANDS = {
  info: "Show skill metadata, dependencies, and install status",
  validate: "Validate a SKILL.md file against platform and mktg specs",
  graph: "Show skill dependency graph as DAG",
  check: "Check if skill prerequisites are satisfied",
  register: "Register a new skill in the project manifest",
} as const;

export const schema: CommandSchema = {
  name: "skill",
  description: "Skill lifecycle management — inspect, validate, and extend skills",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags: [],
    output: {},
    examples: [{ args: `mktg skill ${name} --json`, description }],
  })),
  output: {},
  examples: [
    { args: "mktg skill info seo-content --json", description: "Get skill metadata" },
    { args: "mktg skill check seo-content --json", description: "Check prerequisites" },
    { args: "mktg skill graph --json", description: "Show dependency graph" },
  ],
  vocabulary: ["skill", "validate skill", "skill dependencies", "skill graph"],
};

export const handler: CommandHandler = async (args, _flags) => {
  const subcommand = args.filter(a => !a.startsWith("--"))[0];
  if (!subcommand) {
    return invalidArgs("Missing subcommand", [
      `Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`,
      "Usage: mktg skill <subcommand> [args]",
    ]);
  }
  if (!isKeyOf(SUBCOMMANDS, subcommand)) {
    return invalidArgs(`Unknown subcommand: skill ${subcommand}`, [
      ...Object.keys(SUBCOMMANDS).map(s => `mktg skill ${s}`),
    ]);
  }
  return notImplemented(`skill ${subcommand}`);
};
