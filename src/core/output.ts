// mktg — Output formatting utilities
// JSON/TTY auto-detection, --fields filtering, formatOutput<T>
// Only cli.ts calls process.exit() — commands return CommandResult.

import type { CommandResult, GlobalFlags } from "../types";

export const isTTY = (): boolean =>
  typeof process.stdout.isTTY === "boolean" && process.stdout.isTTY;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Resolve a dot-notation path like "checks.name" to a nested value. When the
 * walker encounters an array, it maps the remaining path across each element
 * and returns the array of results — lets `list --fields skills.name` and
 * `catalog list --fields catalogs.capabilities.publish_adapters` work as
 * agents expect (SQL-like column projection on a collection). */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const remaining = parts.slice(i).join(".");
      return current.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? getNestedValue(item as Record<string, unknown>, remaining)
          : undefined,
      );
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[parts[i]!];
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

// ---------------------------------------------------------------------------
// Field filtering — smart pivot + loud errors
// ---------------------------------------------------------------------------
//
// The --fields filter supports three response shapes:
//
// 1. Simple object — `mktg schema --fields=version` returns `{version: ...}`.
//    Top-level keys map directly. Dot-notation walks into nested objects
//    (`brand.profiles` → response.brand.profiles).
//
// 2. Array of items — request fields apply to each item; result is the
//    filtered array. (Used internally by collection pivot.)
//
// 3. Collection-shaped object — `mktg list` returns `{skills: [...], agents: [...], total, ...}`.
//    If the user passes `--fields=name,tier` (item-level fields, not top-level
//    keys), we pivot: filter each item in the lone array-valued key, return
//    the filtered array. This makes `mktg list --fields=name,tier` return a
//    bare array of `{name, tier}` objects.
//
// When a requested field cannot be resolved at any layer, we return a loud
// error (not a silent empty `{}`) so agents can detect typos and downstream
// skills don't consume invalid fields. The error includes the list of available
// top-level fields so the agent can self-correct.

type FilterResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly missing: readonly string[]; readonly available: readonly string[] };

// Filter a single object — returns the picked subset and the list of fields
// that didn't resolve. Missing fields don't fail here; the caller decides.
const pickFromObject = (
  data: Record<string, unknown>,
  fields: readonly string[],
): { result: Record<string, unknown>; missing: string[] } => {
  const result: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const field of fields) {
    if (field.includes(".")) {
      const value = getNestedValue(data, field);
      if (value !== undefined) {
        setNestedValue(result, field, value);
      } else {
        missing.push(field);
      }
    } else if (field in data) {
      result[field] = data[field];
    } else {
      missing.push(field);
    }
  }
  return { result, missing };
};

// Collect the union of top-level keys from up to N items in an array.
// Used to surface "available fields" in error messages for collection pivots.
const collectArrayKeys = (items: readonly unknown[], limit = 10): string[] => {
  const keys = new Set<string>();
  for (const item of items.slice(0, limit)) {
    if (isObject(item)) {
      for (const key of Object.keys(item)) keys.add(key);
    }
  }
  return Array.from(keys).sort();
};

// Filter an array of objects. A field is "globally missing" only when it's
// missing on every object item — partial coverage is acceptable since some
// items may legitimately not carry every field.
const filterArrayItems = (
  items: readonly unknown[],
  fields: readonly string[],
): FilterResult => {
  const filtered: unknown[] = [];
  const missingPerItem: string[][] = [];
  for (const item of items) {
    if (isObject(item)) {
      const { result, missing } = pickFromObject(item, fields);
      filtered.push(result);
      missingPerItem.push(missing);
    } else {
      // Primitive items can't be field-filtered — pass through unchanged.
      // Treat as "all fields missing" for the global-missing check.
      filtered.push(item);
      missingPerItem.push([...fields]);
    }
  }
  // A field is globally missing if it's missing on every item.
  const globallyMissing = fields.filter((f) =>
    missingPerItem.length > 0 && missingPerItem.every((m) => m.includes(f)),
  );
  if (globallyMissing.length > 0) {
    return {
      ok: false,
      missing: globallyMissing,
      available: collectArrayKeys(items),
    };
  }
  return { ok: true, data: filtered };
};

// Find the first array-valued key whose items satisfy ALL requested fields.
// This drives the smart-pivot for collection-shaped responses like
// `mktg list` (which has skills + agents + external_skills as siblings).
//
// Iteration order matches insertion order (the canonical layout the command
// handler chose), so the "primary" collection — the one listed first in the
// response — wins when multiple arrays could satisfy the fields. This makes
// `mktg list --fields=name,tier` pivot to `skills`, not `agents`, because
// `skills` is declared first in the ListResult shape.
//
// Empty arrays are skipped so we don't pivot to a vacuous `[]` result when
// other arrays might genuinely match.
const findPivotKey = (
  obj: Record<string, unknown>,
  fields: readonly string[],
): string | null => {
  for (const [key, value] of Object.entries(obj)) {
    if (!Array.isArray(value)) continue;
    if (value.length === 0) continue;
    const trial = filterArrayItems(value as unknown[], fields);
    if (trial.ok) return key;
  }
  return null;
};

// Top-level entry point for field filtering. Handles all three shape cases
// (simple object, array, collection-shaped object) and returns either the
// filtered data or a structured error describing what couldn't be resolved.
const filterFields = <T>(data: T, fields: readonly string[]): FilterResult => {
  if (data === null || data === undefined || typeof data !== "object") {
    // Primitive — fields don't apply, pass through.
    return { ok: true, data };
  }

  if (Array.isArray(data)) {
    return filterArrayItems(data, fields);
  }

  const obj = data as Record<string, unknown>;

  // Try top-level resolution first.
  const { result: topLevel, missing: topLevelMissing } = pickFromObject(obj, fields);
  if (topLevelMissing.length === 0) {
    return { ok: true, data: topLevel };
  }

  // If EVERY requested field is missing at the top level, try a smart pivot
  // into a sibling collection. We look for the first array-valued key whose
  // items satisfy all requested fields and filter into that array. This fixes
  // `mktg list --fields=name,tier` returning empty {} when name/tier are
  // item-level fields on the skills array, not top-level keys on the wrapper.
  if (topLevelMissing.length === fields.length) {
    const pivotKey = findPivotKey(obj, fields);
    if (pivotKey !== null) {
      const items = obj[pivotKey] as unknown[];
      const pivot = filterArrayItems(items, fields);
      // findPivotKey already verified `pivot.ok`, but re-check defensively.
      if (pivot.ok) {
        return { ok: true, data: pivot.data };
      }
    }
  }

  // Some or all fields unresolved at top level and pivot didn't help.
  // Surface the unresolved set with the available top-level keys.
  return {
    ok: false,
    missing: topLevelMissing,
    available: Object.keys(obj).sort(),
  };
};

// Apply --fields to a CommandResult, transforming success → success-with-
// filtered-data or success → UNKNOWN_FIELD error. Errors pass through
// unchanged. cli.ts calls this between handler return and formatOutput so
// the resulting CommandResult drives both stdout and the process exit code.
export const applyFieldsFilter = <T>(
  result: CommandResult<T>,
  fields: readonly string[],
): CommandResult<unknown> => {
  if (!result.ok || fields.length === 0) return result;

  const filtered = filterFields(result.data, fields);
  if (filtered.ok) {
    // Preserve the display field if present — but display is rendered
    // pre-filter so we don't try to retrofit it onto the filtered shape.
    // Filtered output goes through JSON serialization or formatForTerminal.
    return {
      ok: true,
      data: filtered.data,
      exitCode: 0,
      ...(result.display !== undefined && { display: result.display }),
    };
  }

  // Loud error: report missing fields with available alternatives so the
  // agent can self-correct without parsing prose.
  const missingList = filtered.missing.join(", ");
  const availableList = filtered.available.length > 0
    ? filtered.available.join(", ")
    : "(no top-level fields detected)";
  const exampleField = filtered.available[0];
  const suggestions: string[] = [
    `Available fields: ${availableList}`,
  ];
  if (exampleField !== undefined) {
    suggestions.push(`Example: --fields='${exampleField}'`);
  }
  suggestions.push(
    "Use --json without --fields to inspect the full response shape",
  );
  return {
    ok: false,
    error: {
      code: "UNKNOWN_FIELD",
      message: `Field${filtered.missing.length === 1 ? "" : "s"} not found in response: ${missingList}`,
      suggestions,
    },
    exitCode: 2,
  };
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

  // Apply --fields filter. cli.ts also calls applyFieldsFilter upstream so
  // it can update the process exit code on UNKNOWN_FIELD errors, but the
  // operation is idempotent on already-filtered success results, so calling
  // it again here is safe. This second call exists for direct callers (unit
  // tests, library use) that don't go through cli.ts but still want the
  // filter behavior. If the filter converts the success result into an error
  // result, we restart formatOutput recursively so the error envelope path
  // handles it.
  //
  // Keep `result` immutable so its narrowed `ok: true` type still gives us
  // typed access to `result.display` below; bind the (possibly filtered)
  // payload into a separate `data` variable.
  let data: unknown = result.data;
  if (flags.fields.length > 0) {
    const refiltered = applyFieldsFilter(result, flags.fields);
    if (!refiltered.ok) {
      return formatOutput(refiltered, flags);
    }
    data = refiltered.data;
  }

  if (flags.json || !isTTY()) {
    const json = JSON.stringify(data, null, 2);
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

  return formatForTerminal(data);
};

// Write to stdout (content) — agents and pipes read this
export const writeStdout = (content: string): void => {
  process.stdout.write(content.endsWith("\n") ? content : content + "\n");
};

// Write to stderr (metadata/progress) — agents ignore this
export const writeStderr = (content: string): void => {
  process.stderr.write(content.endsWith("\n") ? content : content + "\n");
};
