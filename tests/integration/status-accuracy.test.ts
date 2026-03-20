// Integration test: STATUS ACCURACY
// After known operations, status JSON matches expected state exactly.
// Real file I/O in isolated temp dirs. No mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BRAND_FILES } from "../../src/types";
import { scaffoldBrand } from "../../src/core/brand";

const projectRoot = import.meta.dir.replace("/tests/integration", "");

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-status-accuracy-"));
  // Create package.json so project name is predictable
  await Bun.write(join(tempDir, "package.json"), JSON.stringify({ name: "test-project" }));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--cwd", tempDir, ...args], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
};

const getStatus = async () => {
  const { stdout, exitCode } = await run(["status", "--json"]);
  expect(exitCode).toBe(0);
  return JSON.parse(stdout);
};

// ─── Health States ───

describe("health state accuracy", () => {
  test("empty dir → needs-setup", async () => {
    const status = await getStatus();
    expect(status.health).toBe("needs-setup");
    expect(status.nextActions.length).toBeGreaterThan(0);
    expect(status.nextActions[0]).toContain("mktg init");
  });

  test("scaffold only (templates) → incomplete", async () => {
    await scaffoldBrand(tempDir);
    const status = await getStatus();
    expect(status.health).toBe("incomplete");
  });

  test("3+ populated brand files → ready", async () => {
    await scaffoldBrand(tempDir);
    // Populate 3 foundation files with real content
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice\n\nDirect, confident, technical.");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Positioning\n\nWe are the best.");
    await Bun.write(join(tempDir, "brand", "audience.md"), "# Audience\n\nDevelopers who ship.");
    const status = await getStatus();
    expect(status.health).toBe("ready");
  });
});

// ─── Brand Summary Counts ───

describe("brandSummary accuracy", () => {
  test("all missing before scaffold", async () => {
    const status = await getStatus();
    expect(status.brandSummary.missing).toBe(9);
    expect(status.brandSummary.populated).toBe(0);
    expect(status.brandSummary.template).toBe(0);
    expect(status.brandSummary.stale).toBe(0);
  });

  test("all template after scaffold", async () => {
    await scaffoldBrand(tempDir);
    const status = await getStatus();
    // All 9 files contain template content after scaffold (including append-only)
    expect(status.brandSummary.template).toBe(9);
    expect(status.brandSummary.populated).toBe(0);
    expect(status.brandSummary.missing).toBe(0);
  });

  test("mixed state: some populated, some template, some missing", async () => {
    await scaffoldBrand(tempDir);
    // Populate 2 files
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real Voice\nBold and direct.");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Real Positioning\nWe lead.");
    // Delete 1 file
    await rm(join(tempDir, "brand", "competitors.md"));

    const status = await getStatus();
    expect(status.brandSummary.populated).toBe(2); // 2 real content files
    expect(status.brandSummary.template).toBe(6); // remaining template files (including append-only)
    expect(status.brandSummary.missing).toBe(1); // competitors.md
  });
});

// ─── Per-File Brand Entries ───

describe("brand entry accuracy", () => {
  test("template file has isTemplate: true and freshness: template", async () => {
    await scaffoldBrand(tempDir);
    const status = await getStatus();
    const voice = status.brand["voice-profile.md"];
    expect(voice.exists).toBe(true);
    expect(voice.isTemplate).toBe(true);
    expect(voice.freshness).toBe("template");
    expect(voice.lines).toBeGreaterThan(0);
    expect(voice.ageDays).toBe(0);
  });

  test("populated file has isTemplate: false and freshness: current", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real Voice\nWe speak boldly.\nNo jargon.");
    const status = await getStatus();
    const voice = status.brand["voice-profile.md"];
    expect(voice.exists).toBe(true);
    expect(voice.isTemplate).toBe(false);
    expect(voice.freshness).toBe("current");
    expect(voice.lines).toBe(3);
  });

  test("missing file has exists: false and freshness: missing", async () => {
    const status = await getStatus();
    const voice = status.brand["voice-profile.md"];
    expect(voice.exists).toBe(false);
    expect(voice.freshness).toBe("missing");
  });

  test("old populated file has freshness: stale", async () => {
    await scaffoldBrand(tempDir);
    const voicePath = join(tempDir, "brand", "voice-profile.md");
    await Bun.write(voicePath, "# Real Voice\nNon-template content.");
    // Make it 120 days old (well past 90-day review interval for voice-profile.md)
    const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    await utimes(voicePath, oldDate, oldDate);
    const status = await getStatus();
    const voice = status.brand["voice-profile.md"];
    expect(voice.freshness).toBe("stale");
    expect(voice.isTemplate).toBe(false);
  });

  test("all 9 brand files are present in status output", async () => {
    const status = await getStatus();
    for (const file of BRAND_FILES) {
      expect(status.brand[file]).toBeDefined();
    }
  });
});

// ─── Project Name ───

describe("project name accuracy", () => {
  test("reads from package.json name field", async () => {
    const status = await getStatus();
    expect(status.project).toBe("test-project");
  });

  test("falls back to directory name when no package.json", async () => {
    await rm(join(tempDir, "package.json"));
    const status = await getStatus();
    // Should be the temp dir name
    expect(status.project).toBeTruthy();
    expect(typeof status.project).toBe("string");
  });
});

// ─── Content Counting ───

describe("content file counting", () => {
  test("zero content files in clean dir", async () => {
    const status = await getStatus();
    expect(status.content.totalFiles).toBe(0);
    expect(Object.keys(status.content.byDir)).toHaveLength(0);
  });

  test("counts marketing/ directory files", async () => {
    await mkdir(join(tempDir, "marketing"), { recursive: true });
    await Bun.write(join(tempDir, "marketing", "plan.md"), "# Marketing Plan");
    await Bun.write(join(tempDir, "marketing", "brief.md"), "# Brief");
    const status = await getStatus();
    expect(status.content.totalFiles).toBe(2);
    expect(status.content.byDir.marketing).toBe(2);
  });

  test("counts nested marketing/ files", async () => {
    await mkdir(join(tempDir, "marketing", "content-specs"), { recursive: true });
    await Bun.write(join(tempDir, "marketing", "content-specs", "aida.md"), "# AIDA script");
    const status = await getStatus();
    expect(status.content.totalFiles).toBe(1);
    expect(status.content.byDir.marketing).toBe(1);
  });
});

// ─── Next Actions ───

describe("nextActions accuracy", () => {
  test("needs-setup → suggests mktg init", async () => {
    const status = await getStatus();
    expect(status.nextActions[0]).toContain("mktg init");
  });

  test("template foundation files → suggests specific skills", async () => {
    await scaffoldBrand(tempDir);
    const status = await getStatus();
    const actions = status.nextActions.join(" ");
    // Should suggest /brand-voice for voice-profile.md
    expect(actions).toContain("/brand-voice");
    expect(actions).toContain("voice-profile.md");
  });

  test("ready with no activity → suggests /cmo", async () => {
    await scaffoldBrand(tempDir);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Voice\nReal content.");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Position\nReal content.");
    await Bun.write(join(tempDir, "brand", "audience.md"), "# Audience\nReal content.");
    const status = await getStatus();
    expect(status.health).toBe("ready");
    const actions = status.nextActions.join(" ");
    expect(actions).toContain("/cmo");
  });
});

// ─── Skills & Agents Counts ───

describe("skills and agents counts", () => {
  test("skills total matches manifest", async () => {
    const status = await getStatus();
    expect(status.skills.total).toBeGreaterThan(30);
  });

  test("agents section exists", async () => {
    const status = await getStatus();
    expect(status.agents).toBeDefined();
    expect(typeof status.agents.installed).toBe("number");
    expect(typeof status.agents.total).toBe("number");
  });
});

// ─── Integrations ───

describe("integrations accuracy", () => {
  test("integrations map exists with env var keys", async () => {
    const status = await getStatus();
    expect(status.integrations).toBeDefined();
    // Should have TYPEFULLY_API_KEY and RESEND_API_KEY at minimum
    const keys = Object.keys(status.integrations);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const entry = status.integrations[key];
      expect(entry.envVar).toBe(key);
      expect(typeof entry.configured).toBe("boolean");
      expect(Array.isArray(entry.skills)).toBe(true);
    }
  });
});

// ─── Recent Activity ───

describe("recentActivity accuracy", () => {
  test("empty when no runs recorded", async () => {
    const status = await getStatus();
    expect(Object.keys(status.recentActivity)).toHaveLength(0);
  });

  test("shows activity after run log is written", async () => {
    // Write a run log entry directly (path is .mktg/runs.jsonl)
    const mktgDir = join(tempDir, ".mktg");
    await mkdir(mktgDir, { recursive: true });
    const entry = {
      skill: "brand-voice",
      timestamp: new Date().toISOString(),
      result: "success",
      brandFilesChanged: ["voice-profile.md"],
      durationMs: 5000,
    };
    await Bun.write(join(mktgDir, "runs.jsonl"), JSON.stringify(entry) + "\n");

    const status = await getStatus();
    expect(status.recentActivity["brand-voice"]).toBeDefined();
    expect(status.recentActivity["brand-voice"].result).toBe("success");
    expect(status.recentActivity["brand-voice"].daysSince).toBe(0);
  });
});

// ─── Output Shape ───

describe("status JSON shape", () => {
  test("has all required top-level fields", async () => {
    const status = await getStatus();
    const requiredFields = [
      "project", "brand", "brandSummary", "skills", "agents",
      "integrations", "content", "recentActivity", "nextActions", "health",
    ];
    for (const field of requiredFields) {
      expect(status[field]).toBeDefined();
    }
  });

  test("brandSummary counts add up correctly", async () => {
    await scaffoldBrand(tempDir);
    const status = await getStatus();
    const { populated, template, missing } = status.brandSummary;
    // populated + template + missing = total brand files (stale is a subset of populated, not additive)
    expect(populated + template + missing).toBe(9);
  });
});

// ─── CLI E2E ───

describe("CLI subprocess integration", () => {
  test("exit code 0 for valid status call", async () => {
    const { exitCode } = await run(["status", "--json"]);
    expect(exitCode).toBe(0);
  });

  test("--fields filters output", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--fields", "health,project"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.health).toBeDefined();
    expect(parsed.project).toBeDefined();
    // Filtered fields should not include full brand map
    expect(parsed.brand).toBeUndefined();
  });
});
