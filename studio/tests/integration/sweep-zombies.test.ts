// tests/integration/sweep-zombies.test.ts — A14 regression guard.
//
// Asserts that sweepAbandonedSkillRuns:
//   1. Flips status='running' rows older than the threshold to 'abandoned'.
//   2. Leaves status='running' rows INSIDE the threshold untouched.
//   3. Leaves status='success' / 'failed' / other terminal states untouched.
//   4. Is idempotent — a second pass over the same rows returns 0 flips
//      (they're no longer 'running').
//   5. Writes a human-readable note only when the row has no note set.
//
// Uses a fresh in-memory Database so the test is hermetic and parallel-safe
// against the integration harness.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { sweepAbandonedSkillRuns } from "../../lib/sweep.ts";

let db: Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.run(`
    CREATE TABLE skill_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      brand_files_changed TEXT,
      result TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
});

afterAll(() => {
  db.close();
});

function insertRun(
  skill: string,
  status: string,
  createdAtIso: string,
  note: string | null = null,
): number {
  const stmt = db.prepare(
    `INSERT INTO skill_runs (skill, status, created_at, note)
     VALUES (?, ?, ?, ?) RETURNING id`,
  );
  const row = stmt.get(skill, status, createdAtIso, note) as { id: number };
  return row.id;
}

function statusOf(id: number): { status: string; note: string | null } {
  const row = db
    .prepare(`SELECT status, note FROM skill_runs WHERE id = ?`)
    .get(id) as { status: string; note: string | null };
  return row;
}

describe("sweepAbandonedSkillRuns", () => {
  test("flips running rows older than threshold to abandoned and returns their ids", () => {
    // 10 minutes ago — should flip under the default 5-minute threshold.
    const oldIso = new Date(Date.now() - 10 * 60_000).toISOString();
    const oldId = insertRun("brand-voice", "running", oldIso);

    const flipped = sweepAbandonedSkillRuns(db);

    const ids = flipped.map((r) => r.id);
    expect(ids).toContain(oldId);
    const after = statusOf(oldId);
    expect(after.status).toBe("abandoned");
    expect(after.note).toMatch(/Abandoned by sweep/);
    // ageMs for a 10-minute-old row should be >= ~10 minutes (allow drift).
    const row = flipped.find((r) => r.id === oldId)!;
    expect(row.ageMs).toBeGreaterThan(9 * 60_000);
  });

  test("leaves running rows inside threshold alone", () => {
    const freshIso = new Date(Date.now() - 30_000).toISOString();
    const freshId = insertRun("audience-research", "running", freshIso);

    const flipped = sweepAbandonedSkillRuns(db);

    expect(flipped.map((r) => r.id)).not.toContain(freshId);
    expect(statusOf(freshId).status).toBe("running");
  });

  test("leaves terminal states (success, failed, abandoned) untouched", () => {
    const oldIso = new Date(Date.now() - 30 * 60_000).toISOString();
    const successId = insertRun("keyword-research", "success", oldIso);
    const failedId = insertRun("seo-content", "failed", oldIso);
    const alreadyAbandonedId = insertRun("video-content", "abandoned", oldIso);

    const flipped = sweepAbandonedSkillRuns(db);

    const flippedIds = flipped.map((r) => r.id);
    expect(flippedIds).not.toContain(successId);
    expect(flippedIds).not.toContain(failedId);
    expect(flippedIds).not.toContain(alreadyAbandonedId);

    expect(statusOf(successId).status).toBe("success");
    expect(statusOf(failedId).status).toBe("failed");
    expect(statusOf(alreadyAbandonedId).status).toBe("abandoned");
  });

  test("is idempotent — a second pass returns zero flips", () => {
    // Pre-conditions: test above flipped one row. Run sweep again, expect 0.
    const secondPass = sweepAbandonedSkillRuns(db);
    expect(secondPass).toEqual([]);
  });

  test("preserves an existing note instead of overwriting it", () => {
    const oldIso = new Date(Date.now() - 10 * 60_000).toISOString();
    const id = insertRun("landscape-scan", "running", oldIso, "caller note");

    sweepAbandonedSkillRuns(db);

    const after = statusOf(id);
    expect(after.status).toBe("abandoned");
    expect(after.note).toBe("caller note"); // COALESCE kept the original
  });

  test("respects custom thresholdMinutes", () => {
    const twoMinOldIso = new Date(Date.now() - 2 * 60_000).toISOString();
    const id = insertRun("positioning-angles", "running", twoMinOldIso);

    // Default threshold (5m) would skip this; override to 1m so it flips.
    const flipped = sweepAbandonedSkillRuns(db, { thresholdMinutes: 1 });

    expect(flipped.map((r) => r.id)).toContain(id);
    expect(statusOf(id).status).toBe("abandoned");
  });
});
