// CMO Run History Coherence Test
// Verifies: After running skills, CMO can see priorRuns data and use it
// to avoid re-suggesting already-completed work.
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  logRun,
  getRunHistory,
  getRunSummary,
  getRunStats,
  getLastRun,
} from "../../../src/core/run-log";
import type { SkillRunRecord } from "../../../src/types";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "mktg-cmo-history-test-"));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

const makeRecord = (
  skill: string,
  result: "success" | "partial" | "failed" = "success",
  brandFilesChanged: string[] = [],
): SkillRunRecord => ({
  skill,
  timestamp: new Date().toISOString(),
  result,
  brandFilesChanged,
});

describe("CMO Run History Visibility", () => {
  it("CMO sees empty history on fresh project", async () => {
    const summary = await getRunSummary(cwd);
    const stats = await getRunStats(cwd);

    expect(Object.keys(summary)).toHaveLength(0);
    expect(stats.totalRuns).toBe(0);
    expect(stats.uniqueSkills).toBe(0);
  });

  it("CMO sees which foundation skills have been run", async () => {
    // Simulate running the foundation sequence
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("audience-research", "success", ["audience.md"]));
    await logRun(cwd, makeRecord("competitive-intel", "success", ["competitors.md"]));

    const summary = await getRunSummary(cwd);

    // CMO should see all 3 foundation skills completed
    expect(summary["brand-voice"]).toBeDefined();
    expect(summary["brand-voice"].result).toBe("success");
    expect(summary["audience-research"]).toBeDefined();
    expect(summary["competitive-intel"]).toBeDefined();

    // CMO should know positioning hasn't been run
    expect(summary["positioning-angles"]).toBeUndefined();
  });

  it("CMO can determine next action from run history gaps", async () => {
    // Run brand-voice but not audience-research
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));

    const summary = await getRunSummary(cwd);
    const stats = await getRunStats(cwd);

    // Foundation skills that should be recommended next
    const foundationSkills = ["brand-voice", "audience-research", "competitive-intel", "positioning-angles"];
    const completedFoundation = foundationSkills.filter((s) => summary[s]?.result === "success");
    const missingFoundation = foundationSkills.filter((s) => !summary[s]);

    expect(completedFoundation).toContain("brand-voice");
    expect(missingFoundation).toContain("audience-research");
    expect(missingFoundation).toContain("competitive-intel");
    expect(missingFoundation).toContain("positioning-angles");
    expect(stats.uniqueSkills).toBe(1);
  });

  it("CMO sees priorRuns for a specific skill before re-running", async () => {
    // brand-voice run 3 times with different results
    await logRun(cwd, makeRecord("brand-voice", "partial", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));

    const lastRun = await getLastRun(cwd, "brand-voice");
    const history = await getRunHistory(cwd, "brand-voice", 10000);

    // CMO sees the skill was run 3 times, last was success
    expect(lastRun).not.toBeNull();
    expect(lastRun!.result).toBe("success");
    expect(history).toHaveLength(3);

    // CMO knows this skill is healthy (2/3 success)
    const successCount = history.filter((r) => r.result === "success").length;
    expect(successCount).toBe(2);
  });

  it("CMO detects failed skills that need retry", async () => {
    await logRun(cwd, makeRecord("seo-content", "failed"));
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("keyword-research", "partial"));

    const summary = await getRunSummary(cwd);
    const stats = await getRunStats(cwd);

    // CMO should prioritize retrying failed skills
    const failedSkills = Object.entries(summary)
      .filter(([, entry]) => entry.result === "failed")
      .map(([name]) => name);
    const partialSkills = Object.entries(summary)
      .filter(([, entry]) => entry.result === "partial")
      .map(([name]) => name);

    expect(failedSkills).toContain("seo-content");
    expect(partialSkills).toContain("keyword-research");
    expect(stats.failedCount).toBe(1);
    expect(stats.partialCount).toBe(1);
    expect(stats.successRate).toBe(33); // 1/3
  });

  it("CMO sees brandFilesChanged to know what's been updated", async () => {
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("audience-research", "success", ["audience.md"]));

    const history = await getRunHistory(cwd);

    // CMO can see which brand files were touched
    const allChangedFiles = history.flatMap((r) => r.brandFilesChanged);
    expect(allChangedFiles).toContain("voice-profile.md");
    expect(allChangedFiles).toContain("audience.md");

    // Files NOT yet touched
    expect(allChangedFiles).not.toContain("positioning.md");
    expect(allChangedFiles).not.toContain("competitors.md");
  });

  it("CMO tracks execution patterns over time", async () => {
    // Simulate a realistic session: foundation → strategy → execution
    await logRun(cwd, makeRecord("brand-voice", "success", ["voice-profile.md"]));
    await logRun(cwd, makeRecord("audience-research", "success", ["audience.md"]));
    await logRun(cwd, makeRecord("competitive-intel", "success", ["competitors.md"]));
    await logRun(cwd, makeRecord("positioning-angles", "success", ["positioning.md"]));
    await logRun(cwd, makeRecord("keyword-research", "success", ["keyword-plan.md"]));
    await logRun(cwd, makeRecord("seo-content", "success"));
    await logRun(cwd, makeRecord("direct-response-copy", "success"));
    await logRun(cwd, makeRecord("content-atomizer", "success"));

    const stats = await getRunStats(cwd);
    const summary = await getRunSummary(cwd);

    expect(stats.totalRuns).toBe(8);
    expect(stats.uniqueSkills).toBe(8);
    expect(stats.successRate).toBe(100);

    // CMO knows all foundation skills are done
    const foundationDone = ["brand-voice", "audience-research", "competitive-intel", "positioning-angles"]
      .every((s) => summary[s]?.result === "success");
    expect(foundationDone).toBe(true);

    // CMO knows execution skills have been used
    expect(summary["seo-content"]).toBeDefined();
    expect(summary["direct-response-copy"]).toBeDefined();
    expect(summary["content-atomizer"]).toBeDefined();
  });

  it("CMO doesn't confuse run counts between skills", async () => {
    // Run brand-voice 5 times, seo-content once
    for (let i = 0; i < 5; i++) {
      await logRun(cwd, makeRecord("brand-voice", "success"));
    }
    await logRun(cwd, makeRecord("seo-content", "success"));

    const summary = await getRunSummary(cwd);

    expect(summary["brand-voice"].runCount).toBe(5);
    expect(summary["seo-content"].runCount).toBe(1);
  });

  it("CMO sees daysSince for freshness assessment", async () => {
    await logRun(cwd, makeRecord("brand-voice", "success"));

    const summary = await getRunSummary(cwd);

    // Just ran — should be 0 days
    expect(summary["brand-voice"].daysSince).toBe(0);
    expect(typeof summary["brand-voice"].lastRun).toBe("string");
  });
});
