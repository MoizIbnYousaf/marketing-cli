// Tests for per-skill versioning
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { readSkillVersions, writeSkillVersions, loadManifest } from "../src/core/skills";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-versions-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("readSkillVersions", () => {
  test("returns empty object when file does not exist", async () => {
    const versions = await readSkillVersions(tempDir);
    expect(versions).toEqual({});
  });

  test("reads existing versions file", async () => {
    const data = { "brand-voice": "1.0.0", "seo-content": "1.1.0" };
    await writeSkillVersions(tempDir, data);
    const versions = await readSkillVersions(tempDir);
    expect(versions).toEqual(data);
  });
});

describe("writeSkillVersions", () => {
  test("creates .mktg directory and writes versions", async () => {
    await writeSkillVersions(tempDir, { "cmo": "1.0.0" });
    const raw = await readFile(join(tempDir, ".mktg", "skill-versions.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ "cmo": "1.0.0" });
  });

  test("overwrites existing versions", async () => {
    await writeSkillVersions(tempDir, { "cmo": "1.0.0" });
    await writeSkillVersions(tempDir, { "cmo": "1.1.0", "seo-audit": "1.0.0" });
    const versions = await readSkillVersions(tempDir);
    expect(versions).toEqual({ "cmo": "1.1.0", "seo-audit": "1.0.0" });
  });
});

describe("manifest version field", () => {
  test("all skills in manifest have version field", async () => {
    const manifest = await loadManifest();
    for (const [name, entry] of Object.entries(manifest.skills)) {
      expect(entry.version).toBeDefined();
      expect(typeof entry.version).toBe("string");
    }
  });

  test("all versions are semver format", async () => {
    const manifest = await loadManifest();
    const semverRegex = /^\d+\.\d+\.\d+$/;
    for (const [name, entry] of Object.entries(manifest.skills)) {
      expect(semverRegex.test(entry.version!)).toBe(true);
    }
  });
});
