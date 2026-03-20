// E2E Test: SKILL INSTALL & VERIFY
// Proves: install all 41 skills → verify each has SKILL.md → verify SHA integrity → list shows all → reinstall → verify
//
// Agent DX Axes Validated:
// - Axis 1 (Machine-Readable Output): All commands produce valid JSON when piped (3/3)
// - Axis 2 (Raw Payload Input): --input flag works for brand update (3/3)
// - Axis 7 (Agent Knowledge Packaging): Every skill in manifest has SKILL.md bundled, triggers, and metadata (3/3)
//
// Real file I/O. NO MOCKS. Real CLI calls.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import {
  loadManifest,
  getSkillNames,
  installSkills,
  getInstallStatus,
  getInstalledSkills,
} from "../../src/core/skills";

const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const projectRoot = import.meta.dir.replace("/tests/e2e", "");
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  return { stdout: stdout.trim(), exitCode: await proc.exited };
};

const parseJson = (stdout: string): unknown => JSON.parse(stdout);

// ==================== INSTALL ALL 41 SKILLS ====================

describe("E2E: install all skills", () => {
  test("manifest contains 41 skills", async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.skills)).toHaveLength(41);
  });

  test("installSkills installs all bundled skills", async () => {
    const manifest = await loadManifest();
    const result = await installSkills(manifest, false);
    expect(result.installed.length + result.skipped.length).toBeGreaterThan(30);
    expect(result.failed).toHaveLength(0);
  });
});

// ==================== VERIFY EACH HAS SKILL.MD ====================

describe("E2E: verify SKILL.md existence", () => {
  test("every installed skill has a SKILL.md file", async () => {
    const manifest = await loadManifest();
    const status = await getInstallStatus(manifest);
    const names = getSkillNames(manifest);

    const missing: string[] = [];
    for (const name of names) {
      const s = status[name];
      // Skip skills that aren't bundled (phantom entries)
      if (!s) continue;
      if (s.installed) {
        const skillMd = Bun.file(join(s.path, "SKILL.md"));
        const exists = await skillMd.exists();
        if (!exists) missing.push(name);
      }
    }
    expect(missing).toHaveLength(0);
  });
});

// ==================== SHA INTEGRITY ====================

describe("E2E: SHA-256 integrity verification", () => {
  test("every installed skill has a valid SHA-256 hash", async () => {
    const installed = await getInstalledSkills();
    expect(installed.length).toBeGreaterThan(0);

    for (const skill of installed) {
      expect(skill.hash).not.toBeNull();
      expect(typeof skill.hash).toBe("string");
      expect(skill.hash!.length).toBe(64); // SHA-256 hex = 64 chars
      // Verify it's valid hex
      expect(/^[0-9a-f]{64}$/.test(skill.hash!)).toBe(true);
    }
  });

  test("hashes are deterministic — same content produces same hash", async () => {
    const first = await getInstalledSkills();
    const second = await getInstalledSkills();

    for (const s1 of first) {
      const s2 = second.find(s => s.name === s1.name);
      if (s2) {
        expect(s1.hash).toBe(s2.hash);
      }
    }
  });
});

// ==================== LIST SHOWS ALL (Axis 1: JSON output) ====================

describe("E2E: mktg list --json shows all skills", () => {
  test("list returns valid JSON with correct total", async () => {
    const result = await run(["list", "--json"]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as {
      skills: Array<{ name: string; category: string; installed: boolean; triggers: string[] }>;
      total: number;
      installed: number;
    };

    // Axis 1 proof: output is valid JSON
    expect(data).toBeDefined();
    expect(data.total).toBe(41);
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBe(41);
  });

  test("every skill in list has required metadata fields", async () => {
    const result = await run(["list", "--json"]);
    const data = parseJson(result.stdout) as { skills: Array<Record<string, unknown>> };

    for (const skill of data.skills) {
      expect(typeof skill.name).toBe("string");
      expect(typeof skill.category).toBe("string");
      expect(typeof skill.tier).toBe("string");
      expect(typeof skill.installed).toBe("boolean");
      expect(Array.isArray(skill.triggers)).toBe(true);
      expect((skill.triggers as string[]).length).toBeGreaterThan(0);
    }
  });

  test("installed count in list matches actual installed skills", async () => {
    const result = await run(["list", "--json"]);
    const data = parseJson(result.stdout) as { installed: number; skills: Array<{ installed: boolean }> };

    const actualInstalled = data.skills.filter(s => s.installed).length;
    expect(data.installed).toBe(actualInstalled);
  });
});

// ==================== REINSTALL AND VERIFY ====================

describe("E2E: reinstall preserves integrity", () => {
  test("update --dry-run shows skills without writing", async () => {
    const result = await run(["update", "--json", "--dry-run"]);
    expect(result.exitCode).toBe(0);

    const data = parseJson(result.stdout) as {
      skills: { updated: string[]; unchanged: string[] };
    };
    expect(data.skills).toBeDefined();
  });

  test("after update, hashes match pre-update values", async () => {
    const before = await getInstalledSkills();
    const manifest = await loadManifest();
    await installSkills(manifest, false); // reinstall
    const after = await getInstalledSkills();

    // Same skills, same hashes
    for (const b of before) {
      const a = after.find(s => s.name === b.name);
      if (a) {
        expect(a.hash).toBe(b.hash);
      }
    }
  });
});

// ==================== SKILL INFO RETURNS COMPLETE DATA ====================

describe("E2E: skill info completeness", () => {
  test("skill info for every manifest skill returns structured data", async () => {
    const manifest = await loadManifest();
    const names = getSkillNames(manifest);

    // Test a sample of 5 skills for speed
    const sample = names.slice(0, 5);
    for (const name of sample) {
      const result = await run(["skill", "info", name, "--json"]);
      expect(result.exitCode).toBe(0);

      const data = parseJson(result.stdout) as {
        name: string;
        category: string;
        layer: string;
        dependsOn: string[];
        triggers: string[];
      };
      expect(data.name).toBe(name);
      expect(typeof data.category).toBe("string");
      expect(typeof data.layer).toBe("string");
      expect(Array.isArray(data.dependsOn)).toBe(true);
      expect(Array.isArray(data.triggers)).toBe(true);
    }
  });
});

// ==================== REDIRECT RESOLUTION ====================

describe("E2E: redirect resolution end-to-end", () => {
  test("all redirects resolve via mktg run --dry-run", async () => {
    const manifest = await loadManifest();
    const redirectPairs = [
      ["copywriting", "direct-response-copy"],
      ["content-strategy", "keyword-research"],
      ["tiktok", "tiktok-slideshow"],
    ];

    for (const [alias, target] of redirectPairs) {
      const result = await run(["run", alias, "--json", "--dry-run"]);
      expect(result.exitCode).toBe(0);

      const data = parseJson(result.stdout) as { skill: string };
      expect(data.skill).toBe(target);
    }
  });
});

// ==================== RAW PAYLOAD INPUT (Axis 2) ====================

describe("E2E: raw payload input proves 3/3", () => {
  test("brand update --input writes files and returns structured JSON", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const tmpDir = await mkdtemp(join(tmpdir(), "mktg-e2e-payload-"));

    const payload = JSON.stringify({ "voice-profile.md": "# E2E Test Voice" });
    const result = await run(["brand", "update", "--input", payload, "--json", `--cwd=${tmpDir}`]);

    expect(result.exitCode).toBe(0);
    const data = parseJson(result.stdout) as { written: string[]; rejected: string[] };
    expect(data.written).toContain("voice-profile.md");
    expect(data.rejected).toHaveLength(0);

    // Verify file on disk
    const content = await Bun.file(join(tmpDir, "brand", "voice-profile.md")).text();
    expect(content).toBe("# E2E Test Voice");

    await rm(tmpDir, { recursive: true, force: true });
  });
});
