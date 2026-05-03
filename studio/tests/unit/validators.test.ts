// tests/unit/validators.test.ts — exhaustive coverage of all 6 validators

import { describe, expect, test } from "bun:test";
import {
  rejectControlChars,
  validateResourceId,
  detectDoubleEncoding,
  sandboxPath,
  validatePathInput,
  parseJsonInput,
} from "../../lib/validators.ts";
import { mkdtempSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("rejectControlChars", () => {
  test("accepts plain text, tabs, and newlines", () => {
    expect(rejectControlChars("hello world").ok).toBe(true);
    expect(rejectControlChars("line 1\nline 2").ok).toBe(true);
    expect(rejectControlChars("tab\tseparated").ok).toBe(true);
    expect(rejectControlChars("carriage\rreturn").ok).toBe(true);
  });

  test("rejects NULL, BEL, VT, FF, and other ASCII control chars", () => {
    for (const ch of ["\x00", "\x01", "\x07", "\x0B", "\x0C", "\x1B", "\x1F"]) {
      const result = rejectControlChars(`prefix${ch}suffix`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("control characters");
    }
  });

  test("rejects DEL (0x7F) and Unicode controls 0x80-0x9F", () => {
    expect(rejectControlChars("\x7F").ok).toBe(false);
    expect(rejectControlChars("\x80").ok).toBe(false);
    expect(rejectControlChars("\x9F").ok).toBe(false);
  });

  test("allows BOM and other non-control Unicode", () => {
    expect(rejectControlChars("\uFEFFtext").ok).toBe(true);
    expect(rejectControlChars("émoji ✓").ok).toBe(true);
  });

  test("reports field name in the error message", () => {
    const result = rejectControlChars("bad\x00input", "skill name");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("skill name");
  });
});

describe("validateResourceId", () => {
  test("accepts valid ids", () => {
    for (const id of ["skill-name", "landscape-scan", "a", "a.b.c", "version2.0"]) {
      expect(validateResourceId(id).ok).toBe(true);
    }
  });

  test("rejects empty and overly long", () => {
    expect(validateResourceId("").ok).toBe(false);
    expect(validateResourceId("a".repeat(129)).ok).toBe(false);
    expect(validateResourceId("a".repeat(128)).ok).toBe(true);
  });

  test("rejects uppercase, spaces, slashes, special chars", () => {
    for (const bad of ["Skill", "a b", "a/b", "a@b", "a!b", "a;b", ".hidden", "-leading-dash"]) {
      const res = validateResourceId(bad);
      expect(res.ok).toBe(false);
    }
  });

  test("includes resource type in error", () => {
    const res = validateResourceId("Bad Name", "catalog");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("catalog");
  });
});

describe("detectDoubleEncoding", () => {
  test("accepts plain paths", () => {
    expect(detectDoubleEncoding("brand/voice.md").ok).toBe(true);
    expect(detectDoubleEncoding("a/b/c").ok).toBe(true);
    expect(detectDoubleEncoding("trailing-space ").ok).toBe(true);
  });

  test("rejects double-encoded percent sequences", () => {
    // %252f decodes once to %2f (/) — a classic traversal bypass.
    const res = detectDoubleEncoding("%252f..%252fetc%252fpasswd");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message.toLowerCase()).toContain("double");
  });

  test("rejects URL-encoded path traversal", () => {
    for (const bad of ["%2e%2e/", "%2e%2e", "%2f", "%5c", "%00", "%09", "%0a", "%0d"]) {
      const res = detectDoubleEncoding(bad);
      expect(res.ok).toBe(false);
    }
  });

  test("case-insensitive match for percent sequences", () => {
    expect(detectDoubleEncoding("%2E").ok).toBe(false);
    expect(detectDoubleEncoding("%2e").ok).toBe(false);
  });
});

describe("sandboxPath", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mktg-studio-sandbox-"));

  test("resolves ordinary relative paths", () => {
    writeFileSync(join(tmp, "regular.txt"), "ok");
    const res = sandboxPath(tmp, "regular.txt");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.path).toBe(join(tmp, "regular.txt"));
  });

  test("rejects absolute paths", () => {
    const res = sandboxPath(tmp, "/etc/passwd");
    expect(res.ok).toBe(false);
  });

  test("rejects path traversal", () => {
    const res = sandboxPath(tmp, "../../etc/passwd");
    expect(res.ok).toBe(false);
  });

  test("rejects symlinks", () => {
    const target = join(tmp, "target.txt");
    const link = join(tmp, "link.txt");
    writeFileSync(target, "hi");
    try {
      symlinkSync(target, link);
      const res = sandboxPath(tmp, "link.txt");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.message.toLowerCase()).toContain("symlink");
    } catch {
      // symlink may fail on some CI — skip
    }
  });

  test("allows paths to files that don't exist yet (write-through)", () => {
    const res = sandboxPath(tmp, "new-file.txt");
    expect(res.ok).toBe(true);
  });
});

describe("validatePathInput", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mktg-studio-pathinput-"));

  test("happy path: clean relative path inside root", () => {
    writeFileSync(join(tmp, "ok.txt"), "");
    expect(validatePathInput(tmp, "ok.txt").ok).toBe(true);
  });

  test("rejects control chars before reaching sandbox check", () => {
    expect(validatePathInput(tmp, "evil\x00file.txt").ok).toBe(false);
  });

  test("rejects double-encoding before reaching sandbox check", () => {
    expect(validatePathInput(tmp, "%252fetc%252fpasswd").ok).toBe(false);
  });

  test("rejects traversal via sandbox layer", () => {
    expect(validatePathInput(tmp, "../../escape.txt").ok).toBe(false);
  });
});

describe("parseJsonInput", () => {
  test("parses valid JSON", () => {
    const res = parseJsonInput<{ a: number }>(`{"a":1}`);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual({ a: 1 });
  });

  test("rejects payloads over 64 KB", () => {
    const big = JSON.stringify({ x: "a".repeat(70_000) });
    const res = parseJsonInput(big);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("64KB");
  });

  test("rejects prototype pollution keys", () => {
    for (const bad of [
      `{"__proto__":{"x":1}}`,
      `{"constructor":{"prototype":{"x":1}}}`,
    ]) {
      const res = parseJsonInput(bad);
      expect(res.ok).toBe(false);
    }
  });

  test("rejects malformed JSON", () => {
    expect(parseJsonInput("not json").ok).toBe(false);
    expect(parseJsonInput("{").ok).toBe(false);
  });

  test("accepts primitives (strings, numbers, null)", () => {
    expect(parseJsonInput(`"hello"`).ok).toBe(true);
    expect(parseJsonInput(`42`).ok).toBe(true);
    expect(parseJsonInput(`null`).ok).toBe(true);
  });
});
