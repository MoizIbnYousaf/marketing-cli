import type { CommandHandler, CommandSchema, GlobalFlags, CommandResult } from "../types";

export type CommandModule = {
  handler: (args: readonly string[], flags: GlobalFlags) => Promise<CommandResult>;
  schema?: CommandSchema;
};

export type CommandLoader = () => Promise<CommandModule>;

// Lazy-loaded command registry — shared by the CLI entrypoint and integration
// tests so the top-level command surface has one authoritative source.
export const COMMANDS: Record<string, CommandLoader> = {
  init: () => import("../commands/init"),
  doctor: () => import("../commands/doctor"),
  status: () => import("../commands/status"),
  list: () => import("../commands/list"),
  update: () => import("../commands/update"),
  schema: () => import("../commands/schema"),
  skill: () => import("../commands/skill"),
  brand: () => import("../commands/brand"),
  run: () => import("../commands/run"),
  transcribe: () => import("../commands/transcribe"),
  context: () => import("../commands/context"),
  plan: () => import("../commands/plan"),
  publish: () => import("../commands/publish"),
  compete: () => import("../commands/compete"),
  dashboard: () => import("../commands/dashboard"),
  catalog: () => import("../commands/catalog"),
  studio: () => import("../commands/studio"),
  verify: () => import("../commands/verify"),
  "ship-check": () => import("../commands/ship-check"),
  cmo: () => import("../commands/cmo"),
  // Track E (frostbyte) — added 2026-05-04
  release: () => import("../commands/release"),
  propagate: () => import("../commands/propagate"),
};

export const TOP_LEVEL_COMMANDS = Object.freeze(Object.keys(COMMANDS));
