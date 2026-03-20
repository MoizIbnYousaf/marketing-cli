// mktg — Output formatting utilities
// JSON/TTY auto-detection, --fields filtering, formatOutput<T>
// Only cli.ts calls process.exit() — commands return CommandResult.

import type { CommandResult, GlobalFlags } from "../types";

export const isTTY = (): boolean =>
  typeof process.stdout.isTTY === "boolean" && process.stdout.isTTY;

/** Resolve a dot-notation path like "checks.name" to a nested value */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

/** Set a value at a dot-notation path, creating intermediate objects */
const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
};

const pickFieldsOne = (data: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.includes(".")) {
      const value = getNestedValue(data, field);
      if (value !== undefined) {
        setNestedValue(result, field, value);
      }
    } else if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
};

const pickFields = <T>(data: T, fields: readonly string[]): unknown => {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? pickFieldsOne(item as Record<string, unknown>, fields)
        : item,
    );
  }
  return pickFieldsOne(data as Record<string, unknown>, fields);
};

// ANSI helpers for TTY output
export const dim = (s: string): string => (isTTY() ? `\x1b[2m${s}\x1b[0m` : s);
export const bold = (s: string): string => (isTTY() ? `\x1b[1m${s}\x1b[0m` : s);
export const green = (s: string): string => (isTTY() ? `\x1b[32m${s}\x1b[0m` : s);
export const red = (s: string): string => (isTTY() ? `\x1b[31m${s}\x1b[0m` : s);
export const yellow = (s: string): string => (isTTY() ? `\x1b[33m${s}\x1b[0m` : s);
export const cyan = (s: string): string => (isTTY() ? `\x1b[36m${s}\x1b[0m` : s);

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
    if (isTTY() && !flags.json) {
      const lines = [
        `Error [${result.error.code}]: ${result.error.message}`,
        ...result.error.suggestions.map(s => `  → ${s}`),
      ];
      if (result.error.docs) {
        lines.push(`  Docs: ${result.error.docs}`);
      }
      return lines.join("\n");
    }
    return JSON.stringify(
      { error: result.error, exitCode: result.exitCode },
      null,
      2,
    );
  }

  const filtered =
    flags.fields.length > 0
      ? pickFields(result.data, flags.fields)
      : result.data;

  if (flags.json || !isTTY()) {
    const json = JSON.stringify(filtered, null, 2);
    // Warn agents when response exceeds 10KB — large payloads can blow context windows
    if (json.length > 10_240) {
      writeStderr(`warning: response is ${Math.round(json.length / 1024)}KB — consider using --fields to reduce output size`);
    }
    return json;
  }

  // Use display field for TTY-friendly output when provided
  if (result.display) {
    return result.display;
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
