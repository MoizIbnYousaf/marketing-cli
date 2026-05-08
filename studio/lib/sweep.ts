// lib/sweep.ts -- periodic zombie-run sweeper for /cmo skill_runs.
//
// Motivation: /cmo in Claude Code can crash mid-skill or be interrupted
// by the user (Ctrl-C, tab close, Claude Code reload). When that happens
// a skill_runs row stays `status='running'` forever and the dashboard
// shows a spinner with no way to know it's dead (H1-33 / H1-90 / L1 P0-17,
// task A14).
//
// Fix: every SWEEP_INTERVAL_MS, run
// UPDATE skill_runs SET status='abandoned', note=... WHERE status='running'
// AND datetime(created_at) < datetime('now', '-' || :thresholdMin || ' minutes')
// Return the flipped rows so the caller can broadcast a `skill-abandoned`
// SSE event per row. Dashboard renders abandoned rows muted with a
// Re-run button (UI lands in the maintainer's follow-up).
//
// Companion: /cmo's skill wrapper should emit `skill-complete abandoned`
// on its own `finally` branch when it catches SIGINT -- that's the maintainer's // M4 work. This sweep handles the case where /cmo's process dies outright
// and the finally never runs.

import type { Database } from "bun:sqlite";

/** Per-row result for a sweep pass. */
export type AbandonedRun = {
 id: number;
 skill: string;
 createdAt: string;
 ageMs: number;
};

/** Options for a single sweep invocation. */
export type SweepOptions = {
 /**
 * Rows with status='running' older than this are flipped to 'abandoned'.
 * Default 5 minutes. Shorter values are more aggressive but risk
 * false-positive on legitimately-slow skills (landscape-scan, video-content).
 */
 thresholdMinutes?: number;
 /** ISO-now override for deterministic tests. Defaults to `datetime('now')`. */
 nowIso?: string;
};

const DEFAULT_THRESHOLD_MIN = 5;

/**
 * One sweep pass. Returns the rows that were flipped so the caller can
 * broadcast an event for each. Safe to call at any cadence; the UPDATE
 * filters by status='running' so repeated passes over the same zombie
 * only flip it once.
 */
export function sweepAbandonedSkillRuns(
 db: Database,
 opts: SweepOptions = {},
): AbandonedRun[] {
 const threshold = opts.thresholdMinutes ?? DEFAULT_THRESHOLD_MIN;
 const now = opts.nowIso ?? new Date().toISOString();

 // SELECT first so we can return the rows to the caller; the UPDATE
 // runs on the same predicate. We don't bother with a transaction --
 // a racing concurrent sweep (shouldn't happen: only one interval)
 // would just see fewer rows to flip on its next pass. Idempotent.
 const selectStmt = db.prepare(
 `SELECT id, skill, created_at
 FROM skill_runs
 WHERE status = 'running'
 AND datetime(created_at) < datetime(?, '-' || ? || ' minutes')`,
 );
 const rows = selectStmt.all(now, String(threshold)) as {
 id: number;
 skill: string;
 created_at: string;
 }[];

 if (rows.length === 0) return [];

 const note = `Abandoned by sweep: no completion within ${threshold} minutes`;
 const updateStmt = db.prepare(
 `UPDATE skill_runs
 SET status = 'abandoned', note = COALESCE(note, ?)
 WHERE status = 'running'
 AND datetime(created_at) < datetime(?, '-' || ? || ' minutes')`,
 );
 updateStmt.run(note, now, String(threshold));

 const nowMs = Date.parse(now);
 return rows.map((r) => {
 const createdMs = Date.parse(r.created_at + (r.created_at.endsWith("Z") ? "" : "Z"));
 return {
 id: r.id,
 skill: r.skill,
 createdAt: r.created_at,
 ageMs: Number.isFinite(createdMs) ? nowMs - createdMs : -1,
 };
 });
}

/** Handle for stopping a scheduled sweep; returned by startZombieSweeper. */
export type SweepHandle = {
 stop: () => void;
};

/**
 * Boot-time convenience: schedule the sweep on an interval + call an
 * onFlipped callback with the flipped rows. Returns a handle with stop()
 * for teardown (used by tests + server shutdown).
 */
export function startZombieSweeper(
 db: Database,
 onFlipped: (rows: AbandonedRun[]) => void,
 opts: SweepOptions & { intervalMs?: number } = {},
): SweepHandle {
 const intervalMs = opts.intervalMs ?? 60_000;
 const run = () => {
 try {
 const flipped = sweepAbandonedSkillRuns(db, opts);
 if (flipped.length > 0) onFlipped(flipped);
 } catch (e) {
 // Don't crash the server on a transient sqlite hiccup. Log and retry
 // next interval.
 // eslint-disable-next-line no-console
 console.error("[zombie-sweep] pass failed:", e);
 }
 };
 const timer = setInterval(run, intervalMs);
 return {
 stop: () => clearInterval(timer),
 };
}
