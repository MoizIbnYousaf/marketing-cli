// mktg — Skill execution history (append-only JSONL log)
// Stores run records at .mktg/runs.jsonl in the project directory.

import { join } from "node:path";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import type { SkillRunRecord } from "../types";

const LOG_FILE = ".mktg/runs.jsonl";

export type RunSummaryEntry = {
  readonly lastRun: string;
  readonly result: string | null;
  readonly event: "loaded" | "completed";
  readonly runCount: number;
  readonly daysSince: number;
};

export type RunHistoryFilter = {
  /** Keep only records that represent completed work (see isCompletedRecord). */
  readonly completedOnly?: boolean;
};

/**
 * Dual-read: an explicit event field wins. Pre-event records are legacy —
 * only those with real brand writes count as completed work; legacy
 * result:"success" records with empty writes were load-only and must NOT
 * unlock downstream plan/distribute steps.
 */
export const isCompletedRecord = (record: SkillRunRecord): boolean =>
  record.event === "completed" ||
  (record.event === undefined && record.brandFilesChanged.length > 0);

export const logRun = async (
  cwd: string,
  record: SkillRunRecord,
): Promise<void> => {
  const logPath = join(cwd, LOG_FILE);
  await mkdir(join(cwd, ".mktg"), { recursive: true });
  await appendFile(logPath, JSON.stringify(record) + "\n");
};

/** Parse JSONL, skipping corrupted lines instead of crashing */
const parseJsonl = (content: string): SkillRunRecord[] => {
  const lines = content.trim().split("\n").filter(Boolean);
  const records: SkillRunRecord[] = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as SkillRunRecord);
    } catch {
      // Skip corrupted lines — append-only log may have partial writes
    }
  }
  return records;
};

export const getRunHistory = async (
  cwd: string,
  skillName?: string,
  limit: number = 50,
  filter?: RunHistoryFilter,
): Promise<SkillRunRecord[]> => {
  const logPath = join(cwd, LOG_FILE);
  try {
    const content = await readFile(logPath, "utf-8");
    let records = parseJsonl(content);
    if (skillName) records = records.filter(r => r.skill === skillName);
    if (filter?.completedOnly) records = records.filter(isCompletedRecord);
    return records.slice(-limit).reverse(); // Most recent first
  } catch {
    return []; // No log file yet
  }
};

export const getLastRun = async (
  cwd: string,
  skillName: string,
): Promise<SkillRunRecord | null> => {
  const history = await getRunHistory(cwd, skillName, 1);
  return history[0] ?? null;
};

export const getRunSummary = async (
  cwd: string,
  filter?: RunHistoryFilter,
): Promise<Record<string, RunSummaryEntry>> => {
  const history = await getRunHistory(cwd, undefined, 1000, filter);
  const summary: Record<string, RunSummaryEntry> = {};
  // history is most-recent-first, so count all but only take metadata from first seen
  const counts: Record<string, number> = {};
  for (const record of history) {
    counts[record.skill] = (counts[record.skill] ?? 0) + 1;
    if (!summary[record.skill]) {
      const daysSince = Math.floor((Date.now() - new Date(record.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      summary[record.skill] = {
        lastRun: record.timestamp,
        result: record.result ?? null,
        event: isCompletedRecord(record) ? "completed" : "loaded",
        runCount: 0,
        daysSince,
      };
    }
  }
  // Fill in counts
  for (const [skill, entry] of Object.entries(summary)) {
    (summary as Record<string, RunSummaryEntry>)[skill] = { ...entry, runCount: counts[skill] ?? 0 };
  }
  return summary;
};
