// Integration test: INPUT HARDENING (Agent DX Axis 5 — score 3/3)
// Fuzz-style tests proving the CLI rejects malicious inputs at every boundary.
// "The agent is not a trusted operator."

import { describe, test, expect } from "bun:test";
import {
  sandboxPath,
  rejectControlChars,
  validateResourceId,
  detectDoubleEncoding,
  validatePathInput,
  parseJsonInput,
} from "../../src/core/errors";

// ─── Control Character Rejection ───

describe("rejectControlChars", () => {
  test("allows normal text", () => {
    expect(rejectControlChars("Hello world").ok).toBe(true);
  });

  test("allows tabs and newlines (needed for markdown)", () => {
    expect(rejectControlChars("Line 1\nLine 2\tindented").ok).toBe(true);
  });

  test("allows carriage return (Windows line endings)", () => {
    expect(rejectControlChars("Line 1\r\nLine 2").ok).toBe(true);
  });

  test("rejects null byte", () => {
    expect(rejectControlChars("hello\x00world").ok).toBe(false);
  });

  test("rejects bell character", () => {
    expect(rejectControlChars("hello\x07world").ok).toBe(false);
  });

  test("rejects backspace", () => {
    expect(rejectControlChars("hello\x08world").ok).toBe(false);
  });

  test("rejects escape character", () => {
    expect(rejectControlChars("hello\x1Bworld").ok).toBe(false);
  });

  test("rejects DEL (0x7F)", () => {
    expect(rejectControlChars("hello\x7Fworld").ok).toBe(false);
  });

  test("rejects C1 control chars (0x80-0x9F)", () => {
    expect(rejectControlChars("hello\x80world").ok).toBe(false);
    expect(rejectControlChars("hello\x9Fworld").ok).toBe(false);
  });

  test("includes field name in error message", () => {
    const result = rejectControlChars("hello\x00", "skill name");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("skill name");
  });

  test("allows unicode (emoji, Arabic, CJK)", () => {
    expect(rejectControlChars("مرحبا بالعالم").ok).toBe(true);
    expect(rejectControlChars("你好世界").ok).toBe(true);
  });
});

// ─── Resource ID Validation ───

describe("validateResourceId", () => {
  test("allows valid skill names", () => {
    expect(validateResourceId("brand-voice").ok).toBe(true);
    expect(validateResourceId("seo-content").ok).toBe(true);
    expect(validateResourceId("ai-seo").ok).toBe(true);
    expect(validateResourceId("voice-profile.md").ok).toBe(true);
  });

  test("rejects empty string", () => {
    expect(validateResourceId("").ok).toBe(false);
  });

  test("rejects names over 128 chars", () => {
    expect(validateResourceId("a".repeat(129)).ok).toBe(false);
    expect(validateResourceId("a".repeat(128)).ok).toBe(true);
  });

  test("rejects question marks", () => {
    const result = validateResourceId("skill?name");
    expect(result.ok).toBe(false);
  });

  test("rejects hash symbols", () => {
    expect(validateResourceId("skill#fragment").ok).toBe(false);
  });

  test("rejects percent signs", () => {
    expect(validateResourceId("skill%20name").ok).toBe(false);
  });

  test("rejects spaces", () => {
    expect(validateResourceId("skill name").ok).toBe(false);
  });

  test("rejects slashes", () => {
    expect(validateResourceId("skill/name").ok).toBe(false);
    expect(validateResourceId("skill\\name").ok).toBe(false);
  });

  test("rejects uppercase", () => {
    expect(validateResourceId("BrandVoice").ok).toBe(false);
  });

  test("rejects names starting with dot or hyphen", () => {
    expect(validateResourceId(".hidden").ok).toBe(false);
    expect(validateResourceId("-flag").ok).toBe(false);
  });

  test("includes resource type in error message", () => {
    const result = validateResourceId("bad?name", "skill");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("skill");
  });
});

// ─── Double Encoding Detection ───

describe("detectDoubleEncoding", () => {
  test("allows plain text", () => {
    expect(detectDoubleEncoding("brand-voice").ok).toBe(true);
  });

  test("allows normal file paths", () => {
    expect(detectDoubleEncoding("brand/voice-profile.md").ok).toBe(true);
  });

  test("rejects double-encoded percent (%25XX)", () => {
    expect(detectDoubleEncoding("%252F").ok).toBe(false); // double-encoded /
    expect(detectDoubleEncoding("%252E%252E").ok).toBe(false); // double-encoded ..
  });

  test("rejects URL-encoded path separators", () => {
    expect(detectDoubleEncoding("%2F").ok).toBe(false);
    expect(detectDoubleEncoding("%2f").ok).toBe(false);
  });

  test("rejects URL-encoded dots (traversal attempt)", () => {
    expect(detectDoubleEncoding("%2e%2e").ok).toBe(false);
    expect(detectDoubleEncoding("%2E%2E").ok).toBe(false);
  });
});

// ─── sandboxPath (existing + enhanced) ───

describe("sandboxPath", () => {
  const root = "/tmp/test-project";

  test("allows valid relative paths", () => {
    const result = sandboxPath(root, "brand/voice-profile.md");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.path).toBe("/tmp/test-project/brand/voice-profile.md");
  });

  test("rejects absolute paths", () => {
    expect(sandboxPath(root, "/etc/passwd").ok).toBe(false);
  });

  test("rejects .. traversal", () => {
    expect(sandboxPath(root, "../../../etc/passwd").ok).toBe(false);
    expect(sandboxPath(root, "brand/../../etc/passwd").ok).toBe(false);
  });

  test("rejects single .. component", () => {
    expect(sandboxPath(root, "..").ok).toBe(false);
  });
});

// ─── validatePathInput (combined) ───

describe("validatePathInput", () => {
  const root = "/tmp/test-project";

  test("allows clean paths", () => {
    const result = validatePathInput(root, "brand/voice-profile.md");
    expect(result.ok).toBe(true);
  });

  test("rejects paths with control chars", () => {
    expect(validatePathInput(root, "brand/voice\x00.md").ok).toBe(false);
  });

  test("rejects double-encoded paths", () => {
    expect(validatePathInput(root, "brand%252Fvoice.md").ok).toBe(false);
  });

  test("rejects traversal", () => {
    expect(validatePathInput(root, "../../../etc/shadow").ok).toBe(false);
  });

  test("rejects absolute + control combo", () => {
    expect(validatePathInput(root, "/etc/\x00passwd").ok).toBe(false);
  });
});

// ─── parseJsonInput (existing + enhanced) ───

describe("parseJsonInput", () => {
  test("parses valid JSON", () => {
    const result = parseJsonInput<{ name: string }>('{"name":"test"}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("test");
  });

  test("rejects invalid JSON", () => {
    expect(parseJsonInput("not json").ok).toBe(false);
  });

  test("rejects oversized JSON (>64KB)", () => {
    const big = JSON.stringify({ data: "x".repeat(65_537) });
    expect(parseJsonInput(big).ok).toBe(false);
  });

  test("rejects __proto__ pollution", () => {
    expect(parseJsonInput('{"__proto__":{"admin":true}}').ok).toBe(false);
  });

  test("rejects constructor pollution", () => {
    expect(parseJsonInput('{"constructor":{"prototype":{}}}').ok).toBe(false);
  });
});

// ─── Fuzz-Style Attack Vectors ───

describe("fuzz: attack vectors an agent might produce", () => {
  const root = "/tmp/test-project";

  test("null byte injection in skill name", () => {
    expect(validateResourceId("brand-voice\x00.md").ok).toBe(false);
  });

  test("embedded query params in resource ID", () => {
    expect(validateResourceId("skill?admin=true").ok).toBe(false);
  });

  test("URL fragment injection", () => {
    expect(validateResourceId("skill#__proto__").ok).toBe(false);
  });

  test("unicode normalization attack (fullwidth slash)", () => {
    // Fullwidth solidus U+FF0F should fail resource ID validation
    expect(validateResourceId("skill\uFF0Fname").ok).toBe(false);
  });

  test("path traversal via encoded dots", () => {
    expect(detectDoubleEncoding("%2e%2e%2fetc%2fpasswd").ok).toBe(false);
  });

  test("null byte path traversal", () => {
    expect(validatePathInput(root, "brand\x00/../../../etc/passwd").ok).toBe(false);
  });

  test("windows-style traversal", () => {
    expect(sandboxPath(root, "brand\\..\\..\\etc\\passwd").ok).toBe(false);
  });

  test("mixed traversal techniques", () => {
    expect(validatePathInput(root, "brand/./../../etc/passwd").ok).toBe(false);
  });

  test("extremely long input", () => {
    expect(validateResourceId("a".repeat(200)).ok).toBe(false);
  });

  test("JSON with nested prototype pollution", () => {
    const payload = '{"a":{"b":{"__proto__":{"polluted":true}}}}';
    expect(parseJsonInput(payload).ok).toBe(false);
  });

  test("control chars in JSON values", () => {
    // JSON.parse actually handles control chars by spec, but our rejectControlChars catches them
    const result = rejectControlChars('{"name":"hello\x00world"}');
    expect(result.ok).toBe(false);
  });
});
