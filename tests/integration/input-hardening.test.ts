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
import { validatePublicUrl } from "../../src/core/url-validation";

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

  // Task #15 regression: the old implementation used substring matching on
  // `%2e%2e` / `%2E%2E` which missed mixed-case pairs and single-encoded
  // forms. A single `%2e` followed by a literal `.` still decodes to `..` on
  // the consumer side, so the regex must reject the single-encoded form.
  describe("task #15: mixed-case and single-encoded path-critical chars", () => {
    test("rejects mixed-case %2e%2E", () => {
      expect(detectDoubleEncoding("%2e%2E").ok).toBe(false);
    });

    test("rejects mixed-case %2E%2e", () => {
      expect(detectDoubleEncoding("%2E%2e").ok).toBe(false);
    });

    test("rejects single-encoded %2e followed by literal dot", () => {
      expect(detectDoubleEncoding("%2e.").ok).toBe(false);
    });

    test("rejects literal dot followed by single-encoded %2e", () => {
      expect(detectDoubleEncoding(".%2e").ok).toBe(false);
    });

    test("rejects single-encoded %2E (just one)", () => {
      expect(detectDoubleEncoding("%2E").ok).toBe(false);
    });

    test("rejects encoded traversal + slash %2e%2e%2f", () => {
      expect(detectDoubleEncoding("%2e%2e%2f").ok).toBe(false);
    });

    test("rejects mixed encoded + literal %2e%2e/normal", () => {
      expect(detectDoubleEncoding("%2e%2e/normal").ok).toBe(false);
    });

    test("rejects encoded backslash %5c (Windows traversal)", () => {
      expect(detectDoubleEncoding("%5c").ok).toBe(false);
      expect(detectDoubleEncoding("%5C").ok).toBe(false);
    });

    test("rejects encoded null byte %00 (injection)", () => {
      expect(detectDoubleEncoding("file%00.md").ok).toBe(false);
    });

    test("rejects encoded LF %0a (CRLF injection)", () => {
      expect(detectDoubleEncoding("file%0a.md").ok).toBe(false);
      expect(detectDoubleEncoding("file%0A.md").ok).toBe(false);
    });

    test("rejects encoded CR %0d (CRLF injection)", () => {
      expect(detectDoubleEncoding("file%0d.md").ok).toBe(false);
      expect(detectDoubleEncoding("file%0D.md").ok).toBe(false);
    });

    // Task #23 fix 1 additions: %09 tab + belt-and-suspenders for uppercase
    // patterns (the .toLowerCase() normalization catches them too).
    test("rejects encoded tab %09 (whitespace injection)", () => {
      expect(detectDoubleEncoding("file%09hidden.md").ok).toBe(false);
      expect(detectDoubleEncoding("file%09").ok).toBe(false);
    });

    test("rejects uppercase variants via lowercase normalization", () => {
      expect(detectDoubleEncoding("%2F").ok).toBe(false);
      expect(detectDoubleEncoding("%5C").ok).toBe(false);
      expect(detectDoubleEncoding("%0A").ok).toBe(false);
      expect(detectDoubleEncoding("%0D").ok).toBe(false);
    });

    test("rejects double-encoded mixed case %252E", () => {
      expect(detectDoubleEncoding("%252E").ok).toBe(false);
      expect(detectDoubleEncoding("%252e").ok).toBe(false);
      expect(detectDoubleEncoding("%2525").ok).toBe(false);
    });

    // Sanity regression guards — legitimate paths must still pass
    test("allows clean relative path ./normal.txt", () => {
      expect(detectDoubleEncoding("./normal.txt").ok).toBe(true);
    });

    test("allows canonical brand file path", () => {
      expect(detectDoubleEncoding("brand/voice-profile.md").ok).toBe(true);
    });

    test("allows filename with dots (report-v1.2.md)", () => {
      expect(detectDoubleEncoding("report-v1.2.md").ok).toBe(true);
    });

    test("allows filename with spaces", () => {
      expect(detectDoubleEncoding("with spaces.md").ok).toBe(true);
    });
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

// ─── Task #23 fixes 2 + 3: SSRF hardening via validatePublicUrl ───
//
// Before task #23: `mktg init --from http://169.254.169.254/` fetched the
// AWS IMDS endpoint and any other private-range host with zero blocking,
// letting an adversarial agent steal cloud credentials or pivot into the
// local network. Task #23 introduces `validatePublicUrl` which blocks
// loopback, private ranges, link-local (including IMDS 169.254.169.254),
// and non-http(s) schemes before any fetch() call.

describe("task #23: validatePublicUrl SSRF hardening", () => {
  test("rejects AWS IMDS endpoint 169.254.169.254", () => {
    const result = validatePublicUrl("http://169.254.169.254/latest/meta-data/");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/169\.254|link-local|IPv4/i);
  });

  test("rejects GCP metadata.google.internal", () => {
    expect(validatePublicUrl("http://metadata.google.internal/").ok).toBe(false);
  });

  test("rejects localhost by name", () => {
    expect(validatePublicUrl("http://localhost/").ok).toBe(false);
    expect(validatePublicUrl("http://localhost:8080/api").ok).toBe(false);
  });

  test("rejects 127.0.0.1 loopback", () => {
    expect(validatePublicUrl("http://127.0.0.1/").ok).toBe(false);
    expect(validatePublicUrl("http://127.1.2.3/").ok).toBe(false);
  });

  test("rejects 0.0.0.0 this-host", () => {
    expect(validatePublicUrl("http://0.0.0.0/").ok).toBe(false);
  });

  test("rejects RFC1918 private IPv4 ranges", () => {
    expect(validatePublicUrl("http://10.0.0.1/").ok).toBe(false);
    expect(validatePublicUrl("http://10.255.255.255/").ok).toBe(false);
    expect(validatePublicUrl("http://172.16.0.1/").ok).toBe(false);
    expect(validatePublicUrl("http://172.31.255.254/").ok).toBe(false);
    expect(validatePublicUrl("http://192.168.0.1/").ok).toBe(false);
    expect(validatePublicUrl("http://192.168.255.255/").ok).toBe(false);
  });

  test("rejects CGNAT 100.64/10", () => {
    expect(validatePublicUrl("http://100.64.0.1/").ok).toBe(false);
    expect(validatePublicUrl("http://100.127.255.254/").ok).toBe(false);
  });

  test("rejects IPv6 loopback [::1]", () => {
    expect(validatePublicUrl("http://[::1]/").ok).toBe(false);
  });

  test("rejects IPv6 link-local fe80::/10", () => {
    expect(validatePublicUrl("http://[fe80::1]/").ok).toBe(false);
  });

  test("rejects IPv6 ULA fc00::/7", () => {
    expect(validatePublicUrl("http://[fc00::1]/").ok).toBe(false);
    expect(validatePublicUrl("http://[fd12::1]/").ok).toBe(false);
  });

  test("rejects IPv4-mapped IPv6 to private", () => {
    expect(validatePublicUrl("http://[::ffff:10.0.0.1]/").ok).toBe(false);
    expect(validatePublicUrl("http://[::ffff:169.254.169.254]/").ok).toBe(false);
  });

  test("rejects file:// scheme", () => {
    expect(validatePublicUrl("file:///etc/passwd").ok).toBe(false);
  });

  test("rejects javascript: scheme", () => {
    expect(validatePublicUrl("javascript:alert(1)").ok).toBe(false);
  });

  test("rejects data: scheme", () => {
    expect(validatePublicUrl("data:text/html,hello").ok).toBe(false);
  });

  test("rejects ftp:// scheme", () => {
    expect(validatePublicUrl("ftp://example.com/file").ok).toBe(false);
  });

  test("rejects empty string", () => {
    expect(validatePublicUrl("").ok).toBe(false);
  });

  test("rejects oversized URL (>2048 chars)", () => {
    expect(validatePublicUrl("https://example.com/" + "x".repeat(2100)).ok).toBe(false);
  });

  test("allows public https URL", () => {
    const result = validatePublicUrl("https://raw.githubusercontent.com/user/repo/main/manifest.json");
    expect(result.ok).toBe(true);
  });

  test("allows public http URL (plaintext still permitted)", () => {
    // We don't force HTTPS — some legitimate scrape targets are HTTP-only.
    expect(validatePublicUrl("http://example.com/").ok).toBe(true);
  });

  test("allows public IPv4 (8.8.8.8)", () => {
    expect(validatePublicUrl("http://8.8.8.8/").ok).toBe(true);
  });

  test("allows ordinary company domain", () => {
    expect(validatePublicUrl("https://stripe.com/").ok).toBe(true);
    expect(validatePublicUrl("https://shopify.com/pricing").ok).toBe(true);
  });
});

// ─── Task #15: Command-level integration — handlers reject encoded bypass ───
//
// Before task #15, `mktg skill register '%2e%2e/foo'` would skip past the
// hardening layer entirely and fall through to a generic `File not found`
// error from the filesystem read. That was a silent security regression:
// the audit trail said "validation passed, file just wasn't there" when in
// reality the validation layer was never consulted. These tests spawn the
// real CLI and verify the hardened handlers return a structured INVALID_ARGS
// error envelope — the loud, early-exit path the security model requires.

describe("task #15: skill handlers reject encoded paths at the boundary", () => {
  const run = async (args: readonly string[]): Promise<{ stdout: string; exitCode: number }> => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
      cwd: import.meta.dir.replace("/tests/integration", ""),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NO_COLOR: "1" },
    });
    const stdout = await new Response(proc.stdout).text();
    return { stdout: stdout.trim(), exitCode: await proc.exited };
  };

  test("skill register %2e%2e/foo returns INVALID_ARGS (not File not found)", async () => {
    const { stdout, exitCode } = await run(["skill", "register", "%2e%2e/foo", "--json", "--dry-run"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toMatch(/URL-encoded|double-encoded/i);
  });

  test("skill validate %2E%2E/foo returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "%2E%2E/foo", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("skill validate with mixed-case %2e%2E/foo returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "%2e%2E/foo", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("skill register with %5c (encoded backslash) returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "register", "brand%5cfoo", "--json", "--dry-run"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("skill register with null-byte injection file%00.md returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "register", "file%00.md", "--json", "--dry-run"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("skill validate with double-encoded %252e%252e returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["skill", "validate", "%252e%252e/foo", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toMatch(/double-encoded/i);
  });
});
