// lib/jobs.ts -- In-memory job queue
//
// Jobs are ephemeral (process-lifecycle). On completion, results are written
// to the skill_runs SQLite table for persistence across restarts.
//
// SSE progress events are published per-job via getJobEmitter(id).

import { randomUUID } from "node:crypto";
import { globalEmitter, getJobEmitter, removeJobEmitter } from "./sse.ts";
import { execute } from "./sqlite.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface Job {
  id: string;
  kind: string;
  args: Record<string, unknown>;
  status: JobStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  result: unknown;
  error: string | null;
  /** SSE progress log -- one entry per publish call */
  log: Array<{ ts: number; message: string }>;
}

export type WorkerFn = (
  job: Job,
  emit: (message: string) => void,
) => Promise<unknown>;

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const jobs = new Map<string, Job>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new job and add it to the in-memory queue.
 * Returns the Job object immediately (status = "queued").
 */
export function createJob(kind: string, args: Record<string, unknown> = {}): Job {
  const job: Job = {
    id: randomUUID(),
    kind,
    args,
    status: "queued",
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
    log: [],
  };

  jobs.set(job.id, job);

  console.log(`[jobs] Created job ${job.id} (${kind})`);

  // Publish creation event on global channel
  globalEmitter.publish("*", {
    type: "job-created",
    payload: { id: job.id, kind, status: "queued" },
  });

  return job;
}

/**
 * Execute a job with the provided worker function.
 * Transitions: queued → running → success | failed
 * Emits SSE progress events on the job's own emitter.
 * Writes result to skill_runs table on completion.
 *
 * Does NOT await -- fire-and-forget; callers poll via getJob(id).
 */
export function runJob(id: string, worker: WorkerFn): void {
  const job = jobs.get(id);
  if (!job) {
    console.error(`[jobs] runJob: job ${id} not found`);
    return;
  }

  if (job.status !== "queued") {
    console.warn(`[jobs] runJob: job ${id} is already ${job.status}`);
    return;
  }

  const jobEmitter = getJobEmitter(id);

  const emit = (message: string) => {
    const entry = { ts: Date.now(), message };
    job.log.push(entry);
    jobEmitter.publish<{ message: string; jobId: string }>(id, {
      type: "job-log",
      payload: { jobId: id, message },
    });
    globalEmitter.publish("*", {
      type: "job-log",
      payload: { jobId: id, message },
    });
  };

  const start = Date.now();
  job.status = "running";
  job.startedAt = new Date();

  globalEmitter.publish("*", {
    type: "job-started",
    payload: { id, kind: job.kind },
  });

  emit(`Job ${id} (${job.kind}) started`);

  // Execute worker asynchronously
  Promise.resolve()
    .then(() => worker(job, emit))
    .then((result) => {
      job.status = "success";
      job.completedAt = new Date();
      job.result = result;

      const durationMs = Date.now() - start;
      emit(`Job ${id} completed in ${durationMs}ms`);

      globalEmitter.publish("*", {
        type: "job-completed",
        payload: { id, kind: job.kind, status: "success", durationMs },
      });

      // Persist to skill_runs
      _persistSkillRun(job, durationMs);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      job.status = "failed";
      job.completedAt = new Date();
      job.error = message;

      const durationMs = Date.now() - start;
      emit(`Job ${id} failed: ${message}`);

      globalEmitter.publish("*", {
        type: "job-failed",
        payload: { id, kind: job.kind, status: "failed", error: message, durationMs },
      });

      _persistSkillRun(job, durationMs);
    })
    .finally(() => {
      // Remove per-job emitter after a short grace period
      // so late SSE subscribers can still read the final event
      setTimeout(() => removeJobEmitter(id), 30_000);
    });
}

/**
 * Retrieve a job by id, or null if not found.
 */
export function getJob(id: string): Job | null {
  return jobs.get(id) ?? null;
}

/**
 * Retrieve all jobs (snapshot).
 */
export function listJobs(): Job[] {
  return Array.from(jobs.values());
}

/**
 * Cancel a queued job (running jobs cannot be cancelled via this API).
 */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || job.status !== "queued") return false;
  job.status = "cancelled";
  job.completedAt = new Date();
  globalEmitter.publish("*", { type: "job-cancelled", payload: { id } });
  return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _persistSkillRun(job: Job, durationMs: number): void {
  try {
    execute(
      `INSERT INTO skill_runs (skill, status, duration_ms, result, note, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        job.kind,
        job.status,
        durationMs,
        job.result !== null ? JSON.stringify(job.result) : null,
        job.error ?? null,
      ],
    );
  } catch (err) {
    // DB might not be initialized in test env -- swallow
    console.warn("[jobs] Failed to persist skill_run:", err);
  }
}
