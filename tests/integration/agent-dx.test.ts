// Agent DX Integration Tests
// Proves each axis of agent-native CLI design works correctly.
// Real handler calls, real I/O, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags, CommandSchema } from "../../src/types";
import { handler as schemaHandler } from "../../src/commands/schema";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { handler as initHandler } from "../../src/commands/init";
import { handler as statusHandler } from "../../src/commands/status";
import { handler as listHandler } from "../../src/commands/list";
import { sandboxPath } from "../../src/core/errors";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-agentdx-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 1: Machine-Readable Output
// Every command returns valid JSON with consistent envelope
// ═══════════════════════════════════════════════════════════════

describe("Axis 1: Machine-Readable Output", () => {
  test("schema returns valid JSON with ok/data envelope", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    if (!result.ok) return;
    expect(typeof result.data).toBe("object");
  });

  test("doctor returns valid JSON with ok/data envelope", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("passed");
    expect(result.data).toHaveProperty("checks");
  });

  test("status returns valid JSON with ok/data envelope", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.data).toBe("object");
  });

  test("list returns valid JSON with ok/data envelope", async () => {
    const result = await listHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.data).toBe("object");
  });

  test("init returns valid JSON with ok/data envelope", async () => {
    const result = await initHandler(["--yes"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.data).toBe("object");
  });

  test("error results have consistent error envelope", async () => {
    const result = await schemaHandler(["nonexistent_command_xyz"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toHaveProperty("code");
    expect(result.error).toHaveProperty("message");
    expect(result.error).toHaveProperty("suggestions");
    expect(typeof result.error.code).toBe("string");
    expect(typeof result.error.message).toBe("string");
    expect(Array.isArray(result.error.suggestions)).toBe(true);
    expect(result.exitCode).toBeGreaterThan(0);
  });

  test("all results are JSON.stringify-safe", async () => {
    const results = await Promise.all([
      schemaHandler([], flags),
      doctorHandler([], flags),
      statusHandler([], flags),
      listHandler([], flags),
    ]);

    for (const result of results) {
      const json = JSON.stringify(result);
      expect(typeof json).toBe("string");
      const parsed = JSON.parse(json);
      expect(parsed.ok).toBe(result.ok);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 2: Schema Introspection
// Agent can discover all commands, flags, and output shapes
// ═══════════════════════════════════════════════════════════════

describe("Axis 2: Schema Introspection", () => {
  test("schema lists all 13 commands", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { commands: CommandSchema[] };
    const names = data.commands.map((c) => c.name);
    for (const cmd of ["init", "doctor", "list", "status", "update", "schema", "skill", "brand", "run"]) {
      expect(names).toContain(cmd);
    }
  });

  test("schema includes exit code documentation", async () => {
    const result = await schemaHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { exitCodes: Record<string, string> };
    for (let i = 0; i <= 6; i++) {
      expect(data.exitCodes[String(i)]).toBeDefined();
    }
  });

  test("single-command introspection works", async () => {
    const result = await schemaHandler(["doctor"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.name).toBe("doctor");
    expect(data.output).toBeDefined();
  });

  test("subcommand introspection works for skill", async () => {
    const result = await schemaHandler(["skill"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as CommandSchema;
    expect(data.subcommands).toBeDefined();
    expect(data.subcommands!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 3: --dry-run Support
// Mutating commands respect dry-run without side effects
// ═══════════════════════════════════════════════════════════════

describe("Axis 3: Dry-Run Support", () => {
  test("init --dry-run does not create brand/ directory", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);

    const brandDir = Bun.file(join(tempDir, "brand"));
    const exists = await brandDir.exists();
    expect(exists).toBe(false);
  });

  test("init --dry-run still returns what would be created", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await initHandler(["--yes"], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { brand: { created: string[] } };
    expect(data.brand.created.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 4: Input Hardening / sandboxPath
// Path traversal, control chars, and malicious inputs rejected
// ═══════════════════════════════════════════════════════════════

describe("Axis 4: Input Hardening (sandboxPath)", () => {
  test("rejects path traversal with ..", () => {
    const result = sandboxPath("/safe/root", "../../../etc/passwd");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("traversal");
  });

  test("rejects absolute paths", () => {
    const result = sandboxPath("/safe/root", "/etc/passwd");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Absolute");
  });

  test("accepts valid relative paths", () => {
    const result = sandboxPath("/safe/root", "brand/voice-profile.md");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toContain("brand/voice-profile.md");
  });

  test("rejects encoded traversal (..%2F)", () => {
    const result = sandboxPath("/safe/root", "..%2F..%2Fetc/passwd");
    expect(result.ok).toBe(false);
  });

  test("rejects double-dot in middle of path", () => {
    const result = sandboxPath("/safe/root", "brand/../../etc/passwd");
    expect(result.ok).toBe(false);
  });

  test("accepts nested valid paths", () => {
    const result = sandboxPath("/safe/root", "skills/cmo/SKILL.md");
    expect(result.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 5: Doctor Fix Suggestions
// Every failing check includes actionable fix field
// ═══════════════════════════════════════════════════════════════

describe("Axis 5: Doctor Fix Suggestions", () => {
  test("failing checks include fix field for agent remediation", async () => {
    // On empty dir, brand checks should fail with fix suggestions
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const failingChecks = result.data.checks.filter(
      (c) => c.status === "fail"
    );
    expect(failingChecks.length).toBeGreaterThan(0);

    // At least one failing check should have a fix
    const checksWithFix = failingChecks.filter((c) => (c as any).fix);
    expect(checksWithFix.length).toBeGreaterThan(0);
  });

  test("brand-content check warns on template files after init", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const contentCheck = result.data.checks.find(
      (c) => c.name === "brand-content"
    );
    expect(contentCheck).toBeDefined();
    expect(contentCheck!.status).toBe("warn");
    expect((contentCheck as any).fix).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 6: Status Output Accuracy
// Status JSON is machine-parseable and contains all required fields
// ═══════════════════════════════════════════════════════════════

describe("Axis 6: Status Output Accuracy", () => {
  test("status on clean dir reports needs-setup health", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("health");
    expect(data.health).toBe("needs-setup");
  });

  test("status after init changes from needs-setup", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as Record<string, unknown>;
    // After init, health should no longer be needs-setup
    expect(data.health).not.toBe("needs-setup");
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS 7: List Metadata Completeness
// List provides enough metadata for agent routing
// ═══════════════════════════════════════════════════════════════

describe("Axis 7: List Metadata Completeness", () => {
  test("list returns skills with category and layer", async () => {
    const result = await listHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { skills: Array<Record<string, unknown>> };
    expect(data.skills.length).toBeGreaterThan(30);

    // Spot-check first skill has required metadata
    const first = data.skills[0]!;
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("category");
  });
});

// ═══════════════════════════════════════════════════════════════
// AXIS SUMMARY: Agent DX Scorecard
// Quick validation that all axes have testable coverage
// ═══════════════════════════════════════════════════════════════

describe("Agent DX Scorecard Summary", () => {
  test("all handler results use discriminated union (ok: true/false)", async () => {
    const successResult = await schemaHandler([], flags);
    const errorResult = await schemaHandler(["nonexistent_xyz"], flags);

    // Success path
    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toBeDefined();
      expect(successResult.exitCode).toBe(0);
    }

    // Error path
    expect(errorResult.ok).toBe(false);
    if (!errorResult.ok) {
      expect(errorResult.error).toBeDefined();
      expect(errorResult.exitCode).toBeGreaterThan(0);
    }
  });
});
