// mktg — Structured errors, exit codes, security utilities
// Commands return errors via err() from types.ts — never throw.

import { resolve, relative, isAbsolute } from "node:path";
import { lstatSync } from "node:fs";
import { err, type CommandResult, type ExitCode } from "../types";
import { GITHUB_REPO_BLOB_MAIN, GITHUB_REPO_URL } from "../constants";

// Documentation URLs for common errors. Anchors/paths are verified to resolve
// against the live repo; see src/constants.ts for the base URL.
export const DOCS = {
  skills: `${GITHUB_REPO_BLOB_MAIN}/docs/skill-contract.md`,
  brand: `${GITHUB_REPO_BLOB_MAIN}/brand/SCHEMA.md`,
  commands: `${GITHUB_REPO_URL}#commands`,
} as const;

// Named error constructors for common cases
export const notFound = (what: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("NOT_FOUND", `${what} not found`, suggestions, 1, docs);

export const invalidArgs = (message: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("INVALID_ARGS", message, suggestions, 2, docs);

export const missingDep = (dep: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("MISSING_DEPENDENCY", `Required dependency not found: ${dep}`, suggestions, 3, docs);

export const skillFailed = (skill: string, message: string, suggestions: readonly string[] = [], docs?: string): CommandResult<never> =>
  err("SKILL_FAILED", `Skill '${skill}' failed: ${message}`, suggestions.length > 0 ? suggestions : [`mktg run ${skill} --help`, "mktg doctor"], 4, docs);

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

export const permissionError = (path: string, operation: string): CommandResult<never> =>
  err(
    "PERMISSION_ERROR",
    `Cannot ${operation} '${path}': permission denied`,
    [`Check file permissions: ls -la ${path}`, `Try with elevated privileges if appropriate`],
    1,
  );

export const ioError = (path: string, message: string): CommandResult<never> =>
  err(
    "IO_ERROR",
    `File operation failed on '${path}': ${message}`,
    [`Verify the path exists: ls -la ${path}`, "Check disk space and permissions"],
    1,
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

// --- Input hardening: "The agent is not a trusted operator" ---

// Reject control characters in text inputs (skill names, brand content, etc.)
// Allows tabs and newlines (needed for markdown) but rejects everything else < 0x20
// plus DEL (0x7F) and Unicode control chars (0x80-0x9F)
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/;

export const rejectControlChars = (
  input: string,
  fieldName: string = "input",
): { ok: true } | { ok: false; message: string } => {
  if (CONTROL_CHAR_RE.test(input)) {
    return { ok: false, message: `${fieldName} contains control characters — these are never valid in marketing content` };
  }
  return { ok: true };
};

// Validate resource IDs (skill names, brand file names, command names)
// Allows lowercase alphanumeric, hyphens, dots, and file extensions
// Rejects: ?, #, %, spaces, slashes, unicode, special chars
const VALID_RESOURCE_ID_RE = /^[a-z0-9][a-z0-9._-]*$/;

export const validateResourceId = (
  id: string,
  resourceType: string = "resource",
): { ok: true } | { ok: false; message: string } => {
  if (id.length === 0) {
    return { ok: false, message: `${resourceType} name cannot be empty` };
  }
  if (id.length > 128) {
    return { ok: false, message: `${resourceType} name exceeds 128 character limit` };
  }
  if (!VALID_RESOURCE_ID_RE.test(id)) {
    return { ok: false, message: `${resourceType} name '${id}' contains invalid characters — use lowercase letters, numbers, hyphens, and dots only` };
  }
  return { ok: true };
};

// Detect URL-encoded bypass attempts on path validation.
//
// This function catches two distinct classes of encoding attacks:
//
// 1. **Double-encoded percent signs** (`%25XX`). An attacker encodes the `%`
//    sign itself, hoping that one layer of decoding produces a new percent
//    sequence (e.g. `%252e` → `%2e` → `.`) that bypasses a naive one-pass
//    decoder. This is the "double encoding" the function is named for.
//
// 2. **Single-layer percent encoding of path-critical characters.** An
//    attacker substitutes `%2e` for `.`, `%2f` for `/`, `%5c` for `\`, or
//    similar. These single-level sequences bypass a validator that only
//    scans for literal `..` / `/` / `\` but then passes the string to a
//    consumer that URL-decodes it before reading the filesystem. Any such
//    input in a path context should be rejected upfront.
//
// Covered single-layer patterns (case-insensitive via `.toLowerCase()`
// normalization plus explicit character-class fallback):
//   %2e  → `.`          (path traversal)
//   %2f  → `/`          (path separator)
//   %5c  → `\`          (Windows path separator)
//   %00  → NUL          (null-byte injection)
//   %09  → TAB          (whitespace injection)
//   %0a  → LF           (CRLF injection)
//   %0d  → CR           (CRLF injection)
//
// Note: a single `%2e` is rejected — not just the adjacent pair `%2e%2e`.
// Mixed forms like `%2e.` and `.%2e` still decode to `..`, so rejecting the
// single-encoded form is the only way to catch both uniform and mixed cases
// without false negatives. Earlier implementations used `.includes('%2e%2e')`
// which missed mixed-case pairs (`%2E%2e`) and single-encoded forms entirely.
//
// Task #23 fix 1: added `%09` (tab) + a `.toLowerCase()` normalization belt-
// and-suspenders layer on top of the character-class regex. Both layers
// catch the same things on well-formed input, but the normalization layer
// is more robust against future additions to the pattern list.
export const detectDoubleEncoding = (
  input: string,
): { ok: true } | { ok: false; message: string } => {
  // Normalize case so callers can't sneak mixed-case past substring checks
  // in other validators that consume this same input.
  const normalized = input.toLowerCase();

  // Check 1: Double-encoded percent signs (%25XX) — an attacker encodes the
  // `%` itself so a one-pass decoder produces a new `%xx` sequence.
  if (/%25[0-9a-f]{2}/.test(normalized)) {
    return {
      ok: false,
      message: "Double-encoded input detected — this is never valid in path contexts",
    };
  }

  // Check 2: Single-layer percent-encoded path-critical characters. Covers
  // `.`, `/`, `\`, NUL, TAB, LF, CR in one regex pass on the normalized input.
  // Character class stays explicit rather than relying on `.toLowerCase()`
  // alone so future readers can see exactly which bytes are rejected.
  if (/%(2e|2f|5c|00|09|0a|0d)/.test(normalized)) {
    return {
      ok: false,
      message: "URL-encoded path components detected — use plain paths, not URL-encoded ones",
    };
  }

  return { ok: true };
};

// Combined input validation for paths — runs all checks
export const validatePathInput = (
  root: string,
  untrusted: string,
): { ok: true; path: string } | { ok: false; message: string } => {
  // Step 1: Reject control characters
  const controlCheck = rejectControlChars(untrusted, "path");
  if (!controlCheck.ok) return controlCheck;

  // Step 2: Detect double encoding before any decoding
  const encodingCheck = detectDoubleEncoding(untrusted);
  if (!encodingCheck.ok) return encodingCheck;

  // Step 3: Validate with sandboxPath (traversal, symlinks, absolute)
  return sandboxPath(root, untrusted);
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
