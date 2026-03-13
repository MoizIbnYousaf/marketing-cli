// mktg — Structured errors, exit codes, security utilities
// Commands return errors via err() from types.ts — never throw.

import { resolve, relative, isAbsolute } from "node:path";
import { lstatSync } from "node:fs";
import { err, type CommandResult, type ExitCode } from "../types";

// Documentation URLs for common errors
export const DOCS = {
  skills: "https://github.com/moizibnyousaf/mktg#skills",
  brand: "https://github.com/moizibnyousaf/mktg#brand-files",
  commands: "https://github.com/moizibnyousaf/mktg#commands",
} as const;

// Named error constructors for common cases
export const notFound = (what: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("NOT_FOUND", `${what} not found`, suggestions, 1, docs);

export const invalidArgs = (message: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("INVALID_ARGS", message, suggestions, 2, docs);

export const missingDep = (dep: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("MISSING_DEPENDENCY", `Required dependency not found: ${dep}`, suggestions, 3, docs);

export const skillFailed = (skill: string, message: string, docs?: string): CommandResult<never> =>
  err("SKILL_FAILED", `Skill '${skill}' failed: ${message}`, [], 4, docs);

export const networkError = (message: string, docs?: string): CommandResult<never> =>
  err("NETWORK_ERROR", message, ["Check your internet connection"], 5, docs);

export const notImplemented = (command: string): CommandResult<never> =>
  err("NOT_IMPLEMENTED", `Command '${command}' is not yet implemented`, ["mktg --help"], 6);

export const missingInput = (example: string): CommandResult<never> =>
  err(
    "MISSING_INPUT",
    "Non-interactive mode requires --json input",
    [`Example: mktg init --json '${example}'`],
    2,
  );

// sandboxPath — resolve + verify a path stays within the project root
// Rejects absolute paths, traversal (..), and symlinks outside root.
export const sandboxPath = (
  root: string,
  untrusted: string,
): { ok: true; path: string } | { ok: false; message: string } => {
  // Reject absolute paths from user input
  if (isAbsolute(untrusted)) {
    return { ok: false, message: "Absolute paths are not allowed" };
  }

  // Reject obvious traversal
  if (untrusted.includes("..")) {
    return { ok: false, message: "Path traversal is not allowed" };
  }

  const resolved = resolve(root, untrusted);
  const rel = relative(root, resolved);

  // Verify resolved path starts with root (no escape via symlinks etc.)
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { ok: false, message: "Path escapes project root" };
  }

  // Check for symlink escape
  try {
    const stat = lstatSync(resolved);
    if (stat.isSymbolicLink()) {
      return { ok: false, message: "Symlinks are not allowed" };
    }
  } catch {
    // File doesn't exist yet — that's fine for writes
  }

  return { ok: true, path: resolved };
};

// Validate JSON input with safety checks
export const parseJsonInput = <T>(raw: string): { ok: true; data: T } | { ok: false; message: string } => {
  // Size limit — 64KB
  if (raw.length > 65_536) {
    return { ok: false, message: "JSON input exceeds 64KB limit" };
  }

  try {
    const parsed = JSON.parse(raw) as T;

    // Reject prototype pollution attempts
    if (typeof parsed === "object" && parsed !== null) {
      const str = JSON.stringify(parsed);
      if (str.includes('"__proto__"') || str.includes('"constructor"')) {
        return { ok: false, message: "Unsafe JSON keys detected" };
      }
    }

    return { ok: true, data: parsed };
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }
};

// Map exit code to human label (for TTY output)
export const exitCodeLabel = (code: ExitCode): string => {
  const labels: Record<ExitCode, string> = {
    0: "success",
    1: "not found",
    2: "invalid args",
    3: "dependency missing",
    4: "skill failed",
    5: "network error",
    6: "not implemented",
  };
  return labels[code];
};
