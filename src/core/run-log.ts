// mktg — Skill execution history (append-only JSONL log)
// Stores run records at .mktg/runs.jsonl in the project directory.

import { join } from "node:path";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import type { SkillRunRecord } from "../types";

const LOG_FILE = ".mktg/runs.jsonl";

export const logRun = async (
  cwd: string,
  record: SkillRunRecord,
): Promise<void> => {
  const logPath = join(cwd, LOG_FILE);
  await mkdir(join(cwd, ".mktg"), { recursive: true });
  await appendFile(logPath, JSON.stringify(record) + "\n");
};

export const getRunHistory = async (
  cwd: string,
  skillName?: string,
  limit: number = 50,
): Promise<SkillRunRecord[]> => {
  const logPath = join(cwd, LOG_FILE);
  try {
    const content = await readFile(logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    let records = lines.map(line => JSON.parse(line) as SkillRunRecord);
    if (skillName) records = records.filter(r => r.skill === skillName);
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
): Promise<Record<string, { lastRun: string; result: string; daysSince: number }>> => {
  const history = await getRunHistory(cwd, undefined, 500);
  const summary: Record<string, { lastRun: string; result: string; daysSince: number }> = {};
  for (const record of history) {
    if (!summary[record.skill]) {
      const daysSince = Math.floor((Date.now() - new Date(record.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      summary[record.skill] = { lastRun: record.timestamp, result: record.result, daysSince };
    }
  }
  return summary;
};
