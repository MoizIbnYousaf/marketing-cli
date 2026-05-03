// lib/validators.ts — Input hardening for mktg-studio
// Ported from ~/projects/mktgmono/marketing-cli/src/core/errors.ts
// "The agent is not a trusted operator." — 6 validators, pure TypeScript, no side effects.

import { resolve, relative, isAbsolute } from "node:path";
import { lstatSync } from "node:fs";

// ---------------------------------------------------------------------------
// rejectControlChars
// Allows tabs (\t) and newlines (\n, \r) but rejects all other control chars
// plus DEL (0x7F) and Unicode control range 0x80-0x9F.
// ---------------------------------------------------------------------------
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/;

export const rejectControlChars = (
  input: string,
  fieldName = "input",
): { ok: true } | { ok: false; message: string } => {
  if (CONTROL_CHAR_RE.test(input)) {
    return {
      ok: false,
      message: `${fieldName} contains control characters — these are never valid`,
    };
  }
  return { ok: true };
};

// ---------------------------------------------------------------------------
// validateResourceId
// Allows lowercase alphanumeric, hyphens, dots, underscores.
// Max 128 chars. Must start with alphanumeric.
// ---------------------------------------------------------------------------
const VALID_RESOURCE_ID_RE = /^[a-z0-9][a-z0-9._-]*$/;

export const validateResourceId = (
  id: string,
  resourceType = "resource",
): { ok: true } | { ok: false; message: string } => {
  if (id.length === 0) {
    return { ok: false, message: `${resourceType} name cannot be empty` };
  }
  if (id.length > 128) {
    return { ok: false, message: `${resourceType} name exceeds 128 character limit` };
  }
  if (!VALID_RESOURCE_ID_RE.test(id)) {
    return {
      ok: false,
      message: `${resourceType} name '${id}' contains invalid characters — use lowercase letters, numbers, hyphens, and dots only`,
    };
  }
  return { ok: true };
};

// ---------------------------------------------------------------------------
// detectDoubleEncoding
// Catches:
//   1. Double-encoded percent signs (%25XX → decoded → new %XX)
//   2. Single-layer percent encoding of path-critical characters:
//      %2e → .  %2f → /  %5c → \  %00 → NUL  %09 → TAB  %0a → LF  %0d → CR
// ---------------------------------------------------------------------------
export const detectDoubleEncoding = (
  input: string,
): { ok: true } | { ok: false; message: string } => {
  const normalized = input.toLowerCase();

  if (/%25[0-9a-f]{2}/.test(normalized)) {
    return {
      ok: false,
      message: "Double-encoded input detected — this is never valid in path contexts",
    };
  }

  if (/%(2e|2f|5c|00|09|0a|0d)/.test(normalized)) {
    return {
      ok: false,
      message: "URL-encoded path components detected — use plain paths, not URL-encoded ones",
    };
  }

  return { ok: true };
};

// ---------------------------------------------------------------------------
// sandboxPath
// Resolves a relative path within a root directory and verifies it can't
// escape via traversal (..) or symlinks.
// ---------------------------------------------------------------------------
export const sandboxPath = (
  root: string,
  untrusted: string,
): { ok: true; path: string } | { ok: false; message: string } => {
  if (isAbsolute(untrusted)) {
    return { ok: false, message: "Absolute paths are not allowed" };
  }

  if (untrusted.includes("..")) {
    return { ok: false, message: "Path traversal is not allowed" };
  }

  const resolved = resolve(root, untrusted);
  const rel = relative(root, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { ok: false, message: "Path escapes project root" };
  }

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

// ---------------------------------------------------------------------------
// validatePathInput
// Combined path validator: control chars → double encoding → sandbox check.
// ---------------------------------------------------------------------------
export const validatePathInput = (
  root: string,
  untrusted: string,
): { ok: true; path: string } | { ok: false; message: string } => {
  const controlCheck = rejectControlChars(untrusted, "path");
  if (!controlCheck.ok) return controlCheck;

  const encodingCheck = detectDoubleEncoding(untrusted);
  if (!encodingCheck.ok) return encodingCheck;

  return sandboxPath(root, untrusted);
};

// ---------------------------------------------------------------------------
// parseJsonInput
// Size-limited (64KB) JSON parser with prototype-pollution detection.
// ---------------------------------------------------------------------------
export const parseJsonInput = <T>(
  raw: string,
): { ok: true; data: T } | { ok: false; message: string } => {
  if (raw.length > 65_536) {
    return { ok: false, message: "JSON input exceeds 64KB limit" };
  }

  try {
    const parsed = JSON.parse(raw) as T;

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
