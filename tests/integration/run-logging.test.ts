// Integration test: RUN + LOGGING pipeline
// Verifies: logRun → JSONL format → getRunHistory → getRunSummary → getRunStats → priorRuns
// Real file I/O in isolated temp dirs. No mocks.

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  logRun,
  getRunHistory,
  getLastRun,
  getRunSummary,
  getRunStats,
} from "../../src/core/run-log";
import type { SkillRunRecord } from "../../src/types";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "mktg-run-log-test-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

// Helper to create a run record
const makeRecord = (
  skill: string,
  result: "success" | "partial" | "failed" = "success",
  timestamp?: string,
): SkillRunRecord => ({
  skill,
  timestamp: timestamp ?? new Date().toISOString(),
  result,
  brandFilesChanged: [],
});

describe("Run Logging Pipeline", () => {
  describe("logRun writes JSONL", () => {
    it("creates .mktg/runs.jsonl on first run", async () => {
      const record = makeRecord("brand-voice");
      await logRun(cwd, record);

      const content = await readFile(join(cwd, ".mktg/runs.jsonl"), "utf-8");
      expect(content).toBeTruthy();

      const parsed = JSON.parse(content.trim());
      expect(parsed.skill).toBe("brand-voice");
      expect(parsed.result).toBe("success");
    });

    it("appends multiple runs as separate lines", async () => {
      await logRun(cwd, makeRecord("brand-voice"));
      await logRun(cwd, makeRecord("seo-content"));
      await logRun(cwd, makeRecord("content-atomizer"));

      const content = await readFile(join(cwd, ".mktg/runs.jsonl"), "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(3);

      // Each line is valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it("preserves exact record fields in JSONL", async () => {
      const ts = "2026-03-20T10:00:00.000Z";
      const record = makeRecord("seo-audit", "partial", ts);
      await logRun(cwd, record);

      const content = await readFile(join(cwd, ".mktg/runs.jsonl"), "utf-8");
      const parsed = JSON.parse(content.trim());
      expect(parsed.skill).toBe("seo-audit");
      expect(parsed.result).toBe("partial");
      expect(parsed.timestamp).toBe(ts);
      expect(parsed.brandFilesChanged).toEqual([]);
    });
  });

  describe("getRunHistory", () => {
    it("returns empty array when no log exists", async () => {
      const history = await getRunHistory(cwd);
      expect(history).toEqual([]);
    });

    it("returns most recent first", async () => {
      await logRun(cwd, makeRecord("skill-a", "success", "2026-03-20T01:00:00Z"));
      await logRun(cwd, makeRecord("skill-b", "success", "2026-03-20T02:00:00Z"));
      await logRun(cwd, makeRecord("skill-c", "success", "2026-03-20T03:00:00Z"));

      const history = await getRunHistory(cwd);
      expect(history[0].skill).toBe("skill-c");
      expect(history[2].skill).toBe("skill-a");
    });

    it("filters by skill name", async () => {
      await logRun(cwd, makeRecord("brand-voice"));
      await logRun(cwd, makeRecord("seo-content"));
      await logRun(cwd, makeRecord("brand-voice"));

      const history = await getRunHistory(cwd, "brand-voice");
      expect(history).toHaveLength(2);
      expect(history.every((r) => r.skill === "brand-voice")).toBe(true);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await logRun(cwd, makeRecord(`skill-${i}`));
      }
      const history = await getRunHistory(cwd, undefined, 3);
      expect(history).toHaveLength(3);
    });

    it("survives corrupted lines in JSONL", async () => {
      // Write valid record, then garbage, then valid record
      await logRun(cwd, makeRecord("good-1"));
      const logPath = join(cwd, ".mktg/runs.jsonl");
      const { appendFile } = await import("node:fs/promises");
      await appendFile(logPath, "NOT VALID JSON\n");
      await logRun(cwd, makeRecord("good-2"));

      const history = await getRunHistory(cwd);
      expect(history).toHaveLength(2);
      expect(history[0].skill).toBe("good-2");
      expect(history[1].skill).toBe("good-1");
    });
  });

  describe("getLastRun", () => {
    it("returns null when no runs exist", async () => {
      const last = await getLastRun(cwd, "nonexistent");
      expect(last).toBeNull();
    });

    it("returns the most recent run for a skill", async () => {
      await logRun(cwd, makeRecord("brand-voice", "failed", "2026-03-20T01:00:00Z"));
      await logRun(cwd, makeRecord("brand-voice", "success", "2026-03-20T02:00:00Z"));

      const last = await getLastRun(cwd, "brand-voice");
      expect(last).not.toBeNull();
      expect(last!.result).toBe("success");
    });
  });

  describe("getRunSummary", () => {
    it("returns empty object when no runs", async () => {
      const summary = await getRunSummary(cwd);
      expect(Object.keys(summary)).toHaveLength(0);
    });

    it("aggregates run counts per skill", async () => {
      await logRun(cwd, makeRecord("brand-voice"));
      await logRun(cwd, makeRecord("brand-voice"));
      await logRun(cwd, makeRecord("seo-content"));
      await logRun(cwd, makeRecord("brand-voice"));

      const summary = await getRunSummary(cwd);
      expect(summary["brand-voice"].runCount).toBe(3);
      expect(summary["seo-content"].runCount).toBe(1);
    });

    it("captures last run result", async () => {
      await logRun(cwd, makeRecord("brand-voice", "failed"));
      await logRun(cwd, makeRecord("brand-voice", "success"));

      const summary = await getRunSummary(cwd);
      expect(summary["brand-voice"].result).toBe("success");
    });

    it("includes daysSince field", async () => {
      await logRun(cwd, makeRecord("brand-voice"));
      const summary = await getRunSummary(cwd);
      expect(typeof summary["brand-voice"].daysSince).toBe("number");
      expect(summary["brand-voice"].daysSince).toBe(0); // Just logged
    });
  });

  describe("getRunStats", () => {
    it("returns zeros when no runs", async () => {
      const stats = await getRunStats(cwd);
      expect(stats.totalRuns).toBe(0);
      expect(stats.uniqueSkills).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failedCount).toBe(0);
      expect(stats.partialCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it("counts results correctly", async () => {
      await logRun(cwd, makeRecord("skill-a", "success"));
      await logRun(cwd, makeRecord("skill-b", "success"));
      await logRun(cwd, makeRecord("skill-c", "failed"));
      await logRun(cwd, makeRecord("skill-a", "partial"));

      const stats = await getRunStats(cwd);
      expect(stats.totalRuns).toBe(4);
      expect(stats.uniqueSkills).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failedCount).toBe(1);
      expect(stats.partialCount).toBe(1);
      expect(stats.successRate).toBe(50);
    });

    it("calculates success rate as percentage", async () => {
      await logRun(cwd, makeRecord("a", "success"));
      await logRun(cwd, makeRecord("b", "success"));
      await logRun(cwd, makeRecord("c", "success"));

      const stats = await getRunStats(cwd);
      expect(stats.successRate).toBe(100);
    });
  });

  describe("priorRuns context (end-to-end)", () => {
    it("shows accumulated history across multiple runs of the same skill", async () => {
      // Simulate 3 runs of the same skill
      await logRun(cwd, makeRecord("brand-voice", "success", "2026-03-20T01:00:00Z"));
      await logRun(cwd, makeRecord("seo-content", "success", "2026-03-20T02:00:00Z"));
      await logRun(cwd, makeRecord("brand-voice", "partial", "2026-03-20T03:00:00Z"));
      await logRun(cwd, makeRecord("brand-voice", "success", "2026-03-20T04:00:00Z"));

      // Verify what an agent would see as priorRuns context
      const lastRun = await getLastRun(cwd, "brand-voice");
      const history = await getRunHistory(cwd, "brand-voice", 10000);

      expect(lastRun!.timestamp).toBe("2026-03-20T04:00:00Z");
      expect(lastRun!.result).toBe("success");
      expect(history).toHaveLength(3);

      // Summary should show correct aggregation
      const summary = await getRunSummary(cwd);
      expect(summary["brand-voice"].runCount).toBe(3);
      expect(summary["seo-content"].runCount).toBe(1);

      // Stats should reflect the full picture
      const stats = await getRunStats(cwd);
      expect(stats.totalRuns).toBe(4);
      expect(stats.uniqueSkills).toBe(2);
    });
  });
});
