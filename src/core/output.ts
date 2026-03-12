// mktg — Output formatting utilities
// JSON/TTY auto-detection, --fields filtering, formatOutput<T>
// Only cli.ts calls process.exit() — commands return CommandResult.

import type { CommandResult, GlobalFlags } from "../types";

export const isTTY = (): boolean =>
  typeof process.stdout.isTTY === "boolean" && process.stdout.isTTY;

const pickFields = <T>(data: T, fields: readonly string[]): Partial<T> => {
  if (!data || typeof data !== "object") return data;
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const key = field as keyof T;
    if (key in (data as object)) {
      result[field] = (data as Record<string, unknown>)[field];
    }
  }
  return result as Partial<T>;
};

// ANSI helpers for TTY output
export const dim = (s: string): string => (isTTY() ? `\x1b[2m${s}\x1b[0m` : s);
export const bold = (s: string): string => (isTTY() ? `\x1b[1m${s}\x1b[0m` : s);
export const green = (s: string): string => (isTTY() ? `\x1b[32m${s}\x1b[0m` : s);
export const red = (s: string): string => (isTTY() ? `\x1b[31m${s}\x1b[0m` : s);
export const yellow = (s: string): string => (isTTY() ? `\x1b[33m${s}\x1b[0m` : s);

// Format a successful result for terminal display
const formatForTerminal = <T>(data: T): string => {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    return data.map((item) => formatForTerminal(item)).join("\n");
  }
  if (data && typeof data === "object") {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
};

// Primary output formatter — all commands use this
export const formatOutput = <T>(
  result: CommandResult<T>,
  flags: GlobalFlags,
): string => {
  if (!result.ok) {
    return JSON.stringify({ error: result.error }, null, 2);
  }

  const filtered =
    flags.fields.length > 0
      ? pickFields(result.data, flags.fields)
      : result.data;

  if (flags.json || !isTTY()) {
    return JSON.stringify(filtered, null, 2);
  }

  return formatForTerminal(filtered);
};

// Write to stdout (content) — agents and pipes read this
export const writeStdout = (content: string): void => {
  const out = content.endsWith("\n") ? content : content + "\n";
  process.stdout.write(out);
};

// Write to stderr (metadata/progress) — agents ignore this
export const writeStderr = (content: string): void => {
  const out = content.endsWith("\n") ? content : content + "\n";
  process.stderr.write(out);
};
