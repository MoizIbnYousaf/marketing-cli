// Integration test: brand delete subcommand
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scaffoldBrand } from "../../src/core/brand";
import { handler } from "../../src/commands/brand";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-delete-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("brand delete — argument validation", () => {
  test("missing file name returns invalidArgs", async () => {
    const result = await handler(["delete"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
    expect(result.error.message).toContain("Missing brand file name");
  });

  test("invalid resource ID (contains slash) returns invalidArgs", async () => {
    const result = await handler(["delete", "../etc/passwd"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
  });

  test("unknown brand file name returns invalidArgs", async () => {
    const result = await handler(["delete", "not-a-brand-file.md"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
    expect(result.error.message).toContain("not a valid brand file");
  });
});

describe("brand delete — file not found", () => {
  test("deleting non-existent file returns notFound", async () => {
    // No scaffold — file doesn't exist
    const result = await handler(["delete", "voice-profile.md", "--confirm"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(1);
    expect(result.error.message).toContain("voice-profile.md");
  });
});

describe("brand delete — confirm gate", () => {
  test("missing --confirm (and not --dry-run) returns invalidArgs", async () => {
    await scaffoldBrand(tempDir);
    const result = await handler(["delete", "voice-profile.md"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exitCode).toBe(2);
    expect(result.error.message).toContain("--confirm");
  });

  test("--dry-run bypasses --confirm requirement", async () => {
    await scaffoldBrand(tempDir);
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["delete", "voice-profile.md"], dryFlags);
    expect(result.ok).toBe(true);
  });
});

describe("brand delete — dry-run behaviour", () => {
  test("dry-run returns correct payload without deleting the file", async () => {
    await scaffoldBrand(tempDir);
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["delete", "voice-profile.md"], dryFlags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { deleted: string; dryRun: boolean };
    expect(data.deleted).toBe("brand/voice-profile.md");
    expect(data.dryRun).toBe(true);

    // File must still exist
    const stillExists = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(stillExists).toBe(true);
  });
});

describe("brand delete — actual deletion", () => {
  test("delete with --confirm removes the file", async () => {
    await scaffoldBrand(tempDir);
    const result = await handler(["delete", "voice-profile.md", "--confirm"], flags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { deleted: string; dryRun: boolean };
    expect(data.deleted).toBe("brand/voice-profile.md");
    expect(data.dryRun).toBe(false);

    const gone = await Bun.file(join(tempDir, "brand", "voice-profile.md")).exists();
    expect(gone).toBe(false);
  });

  test("other brand files are untouched after deletion", async () => {
    await scaffoldBrand(tempDir);
    await handler(["delete", "voice-profile.md", "--confirm"], flags);

    const positioningExists = await Bun.file(join(tempDir, "brand", "positioning.md")).exists();
    expect(positioningExists).toBe(true);
  });

  test("deleting already-deleted file returns notFound", async () => {
    await scaffoldBrand(tempDir);
    await handler(["delete", "voice-profile.md", "--confirm"], flags);

    const second = await handler(["delete", "voice-profile.md", "--confirm"], flags);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.exitCode).toBe(1);
  });
});

describe("brand delete — dependent skills", () => {
  test("response includes dependentSkills array", async () => {
    await scaffoldBrand(tempDir);
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["delete", "voice-profile.md"], dryFlags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { dependentSkills: string[] };
    // voice-profile.md is read by many skills — array should be non-empty
    expect(Array.isArray(data.dependentSkills)).toBe(true);
    expect(data.dependentSkills.length).toBeGreaterThan(0);
  });

  test("deleting assets.md (rarely read) returns dependentSkills as array", async () => {
    await scaffoldBrand(tempDir);
    const dryFlags: GlobalFlags = { ...flags, dryRun: true };
    const result = await handler(["delete", "assets.md"], dryFlags);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { dependentSkills: string[] };
    expect(Array.isArray(data.dependentSkills)).toBe(true);
  });
});
