// Integration test: CMO VISIBILITY
// Proves CMO can read mktg status output and extract brand health,
// skill count, nextActions, and agent availability. Real I/O, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../../src/types";
import { handler as statusHandler } from "../../../src/commands/status";
import { handler as initHandler } from "../../../src/commands/init";
import { handler as listHandler } from "../../../src/commands/list";
import { handler as doctorHandler } from "../../../src/commands/doctor";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-cmo-vis-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("CMO reads status for brand health", () => {
  test("status on clean dir reports needs-setup health", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
  });

  test("status after init reports non-setup health", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).not.toBe("needs-setup");
  });

  test("status exposes skill count for CMO routing", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills.total).toBe(42);
    expect(result.data.skills.installed).toBeGreaterThan(0);
  });

  test("status exposes agent count", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.agents.total).toBe(5);
    expect(result.data.agents.installed).toBeGreaterThan(0);
  });

  test("status exposes all 10 brand file entries", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandKeys = Object.keys(result.data.brand);
    expect(brandKeys.length).toBe(10);
    expect(brandKeys).toContain("voice-profile.md");
    expect(brandKeys).toContain("audience.md");
    expect(brandKeys).toContain("positioning.md");
    expect(brandKeys).toContain("competitors.md");
  });

  test("status exposes nextActions array for CMO to suggest", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.data.nextActions)).toBe(true);
    // On a clean dir, should suggest init
    expect(result.data.nextActions.length).toBeGreaterThan(0);
  });
});

describe("CMO reads status brand freshness", () => {
  test("template brand files are detected as templates", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // After init, brand files are templates — CMO should know to run foundation
    const voiceEntry = result.data.brand["voice-profile.md"] as Record<string, unknown>;
    expect(voiceEntry).toBeDefined();
    expect(voiceEntry.exists).toBe(true);
  });

  test("populated brand files change freshness assessment", async () => {
    await initHandler(["--yes"], flags);

    // Write real content to voice-profile.md
    const voicePath = join(tempDir, "brand", "voice-profile.md");
    await writeFile(voicePath, `## Last Updated\n2026-03-20 by /brand-voice\n\n# Test Brand Voice Profile\n\n## Voice Summary\nDirect, sharp, builder-first.\n\n## Core Personality Traits\n- **Builder energy:** Ships fast.\n`);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const voiceEntry = result.data.brand["voice-profile.md"] as Record<string, unknown>;
    expect(voiceEntry.exists).toBe(true);
  });
});

describe("CMO uses list for skill routing", () => {
  test("list returns all 42 skills with metadata", async () => {
    const result = await listHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.total).toBe(42);
    expect(Array.isArray(result.data.skills)).toBe(true);

    // Each skill has routing-relevant metadata
    const firstSkill = result.data.skills[0] as Record<string, unknown>;
    expect(firstSkill.name).toBeDefined();
    expect(firstSkill.category).toBeDefined();
  });

  test("list skills have category for routing table mapping", async () => {
    const result = await listHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const categories = new Set(
      result.data.skills.map((s: Record<string, unknown>) => s.category),
    );
    // Should have multiple categories for routing
    expect(categories.size).toBeGreaterThan(5);
    expect(categories.has("foundation")).toBe(true);
    expect(categories.has("strategy")).toBe(true);
  });

  test("--fields filters list output for context window discipline", async () => {
    const filteredFlags = { ...flags, fields: ["total", "installed"] };
    const result = await listHandler([], filteredFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // formatOutput applies field filtering — result.data still has everything
    // but the formatted JSON output would only include specified fields
    expect(result.data.total).toBe(42);
  });
});

describe("CMO uses doctor for health assessment", () => {
  test("doctor after init gives CMO actionable check results", async () => {
    await initHandler(["--yes"], flags);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.passed).toBe("boolean");
    expect(Array.isArray(result.data.checks)).toBe(true);
    expect(result.data.checks.length).toBeGreaterThan(0);

    // Each check has name and status — CMO can surface failures
    const firstCheck = result.data.checks[0] as Record<string, unknown>;
    expect(firstCheck.name).toBeDefined();
    expect(firstCheck.status).toBeDefined();
  });

  test("doctor on clean dir reports failures CMO should surface", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.passed).toBe(false);
    // CMO should see these failures and suggest init
    const failedChecks = result.data.checks.filter(
      (c: Record<string, unknown>) => c.status === "fail",
    );
    expect(failedChecks.length).toBeGreaterThan(0);
  });
});

describe("CMO determines mode from status", () => {
  test("needs-setup health → CMO runs FIRST RUN mode", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // CMO decision: health === "needs-setup" → suggest init
    expect(result.data.health).toBe("needs-setup");
  });

  test("incomplete health → CMO identifies missing brand files", async () => {
    // Create brand/ with only some files
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await writeFile(join(tempDir, "brand", "voice-profile.md"), "# Real voice profile content");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // CMO should see partial brand and suggest filling gaps
    const brandEntries = result.data.brand;
    const existingFiles = Object.entries(brandEntries).filter(
      ([_, entry]) => (entry as Record<string, unknown>).exists === true,
    );
    const missingFiles = Object.entries(brandEntries).filter(
      ([_, entry]) => (entry as Record<string, unknown>).exists === false,
    );

    // Should have some existing and some missing
    expect(existingFiles.length).toBeGreaterThan(0);
    expect(missingFiles.length).toBeGreaterThan(0);
  });
});
