// E2E tests for mktg status command
// Uses real file I/O in isolated temp directories, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../src/types";
import { handler as statusHandler } from "../src/commands/status";
import { handler as initHandler } from "../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-status-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg status", () => {
  test("reports needs-setup before init", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("needs-setup");
  });

  test("reports brand files after init", async () => {
    await initHandler(["--yes"], flags);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("skills");
    expect(result.data).toHaveProperty("health");
    expect(result.data).toHaveProperty("content");

    // All 10 brand files should exist after init
    const brandEntries = Object.entries(result.data.brand);
    expect(brandEntries.length).toBe(10);

    for (const [, entry] of brandEntries) {
      expect(entry.exists).toBe(true);
    }
  });

  test("reports project name", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("project");
    expect(typeof result.data.project).toBe("string");
  });

  test("reports skill install count", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.skills).toHaveProperty("installed");
    expect(result.data.skills).toHaveProperty("total");
    expect(result.data.skills.total).toBeGreaterThanOrEqual(39);
  });

  test("exit code is 0", async () => {
    const result = await statusHandler([], flags);
    expect(result.exitCode).toBe(0);
  });
});

describe("Health transitions", () => {
  test("needs-setup → incomplete after init (all templates)", async () => {
    // Before init
    const before = await statusHandler([], flags);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.data.health).toBe("needs-setup");

    // After init — all files are still templates, so health is incomplete
    await initHandler(["--yes"], flags);
    const after = await statusHandler([], flags);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.data.health).toBe("incomplete");
  });

  test("incomplete → ready when 3+ brand files are populated", async () => {
    await initHandler(["--yes"], flags);

    // Populate 3 brand files with non-template content
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Our real voice\nWe are bold and direct.");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Real positioning\nWe own the market.");
    await Bun.write(join(tempDir, "brand", "audience.md"), "# Real audience\nDevelopers aged 25-40.");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).toBe("ready");
  });

  test("ready → incomplete when voice-profile deleted", async () => {
    await initHandler(["--yes"], flags);

    // Populate enough files to be "ready"
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real voice");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "# Real positioning");
    await Bun.write(join(tempDir, "brand", "audience.md"), "# Real audience");

    // Delete voice-profile.md — drops below 3 populated
    const { rm: rmFile } = await import("node:fs/promises");
    await rmFile(join(tempDir, "brand", "voice-profile.md"));

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).toBe("incomplete");
  });

  test("ready → needs-setup when entire brand/ deleted", async () => {
    await initHandler(["--yes"], flags);

    const { rm: rmDir } = await import("node:fs/promises");
    await rmDir(join(tempDir, "brand"), { recursive: true, force: true });

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).toBe("needs-setup");
  });
});

describe("Status JSON shape for agent consumption", () => {
  test("brand object has exactly 9 keys after init", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const brandKeys = Object.keys(result.data.brand);
    expect(brandKeys).toHaveLength(10);
    expect(brandKeys).toContain("voice-profile.md");
    expect(brandKeys).toContain("positioning.md");
    expect(brandKeys).toContain("audience.md");
    expect(brandKeys).toContain("competitors.md");
    expect(brandKeys).toContain("keyword-plan.md");
    expect(brandKeys).toContain("creative-kit.md");
    expect(brandKeys).toContain("stack.md");
    expect(brandKeys).toContain("assets.md");
    expect(brandKeys).toContain("learnings.md");
  });

  test("each brand entry has exists boolean", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      expect(typeof entry.exists).toBe("boolean");
    }
  });

  test("skills has installed and total as numbers", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.skills.installed).toBe("number");
    expect(typeof result.data.skills.total).toBe("number");
  });

  test("content has totalFiles as number", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof result.data.content.totalFiles).toBe("number");
  });

  test("status includes agents section", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("agents");
    expect(typeof result.data.agents.installed).toBe("number");
    expect(typeof result.data.agents.total).toBe("number");
  });
});

describe("Multi-project switching via --cwd", () => {
  test("different cwds report different project names", async () => {
    const dir1 = await mkdtemp(join(tmpdir(), "mktg-proj1-"));
    const dir2 = await mkdtemp(join(tmpdir(), "mktg-proj2-"));

    await Bun.write(join(dir1, "package.json"), JSON.stringify({ name: "project-alpha" }));
    await Bun.write(join(dir2, "package.json"), JSON.stringify({ name: "project-beta" }));

    const flags1 = { ...flags, cwd: dir1 };
    const flags2 = { ...flags, cwd: dir2 };

    const r1 = await statusHandler([], flags1);
    const r2 = await statusHandler([], flags2);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    expect(r1.data.project).toBe("project-alpha");
    expect(r2.data.project).toBe("project-beta");

    const { rm: rmDir } = await import("node:fs/promises");
    await rmDir(dir1, { recursive: true, force: true });
    await rmDir(dir2, { recursive: true, force: true });
  });

  test("init in project A, status in project B still needs-setup", async () => {
    const dirA = await mkdtemp(join(tmpdir(), "mktg-projA-"));
    const dirB = await mkdtemp(join(tmpdir(), "mktg-projB-"));

    const flagsA = { ...flags, cwd: dirA };
    const flagsB = { ...flags, cwd: dirB };

    await initHandler(["--yes"], flagsA);

    const resultB = await statusHandler([], flagsB);
    expect(resultB.ok).toBe(true);
    if (!resultB.ok) return;
    expect(resultB.data.health).toBe("needs-setup");

    const { rm: rmDir } = await import("node:fs/promises");
    await rmDir(dirA, { recursive: true, force: true });
    await rmDir(dirB, { recursive: true, force: true });
  });
});

describe("Template detection", () => {
  test("brand files after init are marked isTemplate: true", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      if (entry.exists) {
        expect(entry.isTemplate).toBe(true);
      }
    }
  });

  test("populated brand files are marked isTemplate: false", async () => {
    await initHandler(["--yes"], flags);

    // Overwrite voice-profile with real content
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Our Brand Voice\nWe speak with authority and warmth.");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const voiceEntry = result.data.brand["voice-profile.md"];
    expect(voiceEntry.isTemplate).toBe(false);

    // Other files should still be templates
    const positioningEntry = result.data.brand["positioning.md"];
    expect(positioningEntry.isTemplate).toBe(true);
  });

  test("health is incomplete when all brand files are templates", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("incomplete");
  });

  test("health is ready when 3+ files are non-template", async () => {
    await initHandler(["--yes"], flags);

    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real content 1");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "Real content 2");
    await Bun.write(join(tempDir, "brand", "audience.md"), "Real content 3");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("ready");
  });

  test("each brand entry includes lines count", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      if (entry.exists) {
        expect(typeof entry.lines).toBe("number");
        expect(entry.lines).toBeGreaterThan(0);
      }
    }
  });
});

describe("Integrations in status output", () => {
  test("includes integrations in status output", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("integrations");
    expect(typeof result.data.integrations).toBe("object");
  });

  test("integrations contain TYPEFULLY_API_KEY and RESEND_API_KEY", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.integrations).toHaveProperty("TYPEFULLY_API_KEY");
    expect(result.data.integrations).toHaveProperty("RESEND_API_KEY");
  });

  test("each integration has configured boolean and skills array", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.integrations)) {
      expect(typeof entry.configured).toBe("boolean");
      expect(Array.isArray(entry.skills)).toBe(true);
      expect(typeof entry.envVar).toBe("string");
    }
  });

  test("RESEND_API_KEY lists all 3 resend skills", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const resend = result.data.integrations["RESEND_API_KEY"];
    expect(resend.skills).toContain("send-email");
    expect(resend.skills).toContain("resend-inbound");
    expect(resend.skills).toContain("agent-email-inbox");
    expect(resend.skills).toHaveLength(3);
  });
});

describe("Idempotency", () => {
  test("status called 3 times returns identical health", async () => {
    const r1 = await statusHandler([], flags);
    const r2 = await statusHandler([], flags);
    const r3 = await statusHandler([], flags);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    if (!r1.ok || !r2.ok || !r3.ok) return;

    expect(r1.data.health).toBe(r2.data.health);
    expect(r2.data.health).toBe(r3.data.health);
  });
});

describe("Brand freshness in JSON output", () => {
  test("brand entries include freshness field with valid values", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validFreshness = ["current", "stale", "missing", "template"];
    for (const [, entry] of Object.entries(result.data.brand)) {
      expect(entry).toHaveProperty("freshness");
      expect(validFreshness).toContain(entry.freshness);
    }
  });

  test("missing brand files have freshness: missing", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      if (!entry.exists) {
        expect(entry.freshness).toBe("missing");
      }
    }
  });

  test("template brand files have freshness: template", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      if (entry.exists && entry.isTemplate) {
        expect(entry.freshness).toBe("template");
      }
    }
  });

  test("populated brand files have freshness: current or stale", async () => {
    await initHandler(["--yes"], flags);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Real voice content");
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const vp = result.data.brand["voice-profile.md"];
    expect(["current", "stale"]).toContain(vp.freshness);
  });
});

describe("Brand summary counts", () => {
  test("brandSummary exists with correct shape", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("brandSummary");
    expect(typeof result.data.brandSummary.populated).toBe("number");
    expect(typeof result.data.brandSummary.template).toBe("number");
    expect(typeof result.data.brandSummary.missing).toBe("number");
    expect(typeof result.data.brandSummary.stale).toBe("number");
  });

  test("before init: all 10 missing", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.missing).toBe(10);
    expect(result.data.brandSummary.populated).toBe(0);
    expect(result.data.brandSummary.template).toBe(0);
  });

  test("after init: all 10 template", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.template).toBe(10);
    expect(result.data.brandSummary.populated).toBe(0);
    expect(result.data.brandSummary.missing).toBe(0);
  });

  test("after populating 3 files: 3 populated, 6 template", async () => {
    await initHandler(["--yes"], flags);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real voice content");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "Real positioning content");
    await Bun.write(join(tempDir, "brand", "audience.md"), "Real audience content");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.brandSummary.populated).toBe(3);
    expect(result.data.brandSummary.template).toBe(7);
  });
});

describe("Next actions", () => {
  test("nextActions exists as array", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.data.nextActions)).toBe(true);
  });

  test("needs-setup suggests mktg init", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.nextActions.length).toBeGreaterThan(0);
    expect(result.data.nextActions[0]).toContain("mktg init");
  });

  test("after init: suggests populating foundation files", async () => {
    await initHandler(["--yes"], flags);
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const actions = result.data.nextActions;
    expect(actions.some(a => a.includes("voice-profile.md"))).toBe(true);
    expect(actions.some(a => a.includes("/brand-voice"))).toBe(true);
  });

  test("when ready with no activity: suggests /cmo", async () => {
    await initHandler(["--yes"], flags);
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "Real voice");
    await Bun.write(join(tempDir, "brand", "positioning.md"), "Real positioning");
    await Bun.write(join(tempDir, "brand", "audience.md"), "Real audience");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.nextActions.some(a => a.includes("/cmo"))).toBe(true);
  });
});

describe("Recent activity", () => {
  test("recentActivity exists as object", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveProperty("recentActivity");
    expect(typeof result.data.recentActivity).toBe("object");
  });

  test("recentActivity is empty when no runs logged", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.data.recentActivity)).toHaveLength(0);
  });
});

describe("Content breakdown", () => {
  test("content includes byDir breakdown", async () => {
    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.content).toHaveProperty("totalFiles");
    expect(result.data.content).toHaveProperty("byDir");
    expect(typeof result.data.content.byDir).toBe("object");
  });

  test("byDir reflects actual content directories", async () => {
    const { mkdir: mkdirFs } = await import("node:fs/promises");
    await mkdirFs(join(tempDir, "campaigns"), { recursive: true });
    await Bun.write(join(tempDir, "campaigns", "test.md"), "# Test campaign");

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.content.totalFiles).toBe(1);
    expect(result.data.content.byDir.campaigns).toBe(1);
  });
});
