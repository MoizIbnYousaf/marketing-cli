// lib/foundation.ts — Onboarding foundation runner
//
// Spawns the 3 research agents (brand, audience, competitive) in parallel
// when onboarding kicks off. Each agent has its own job ID + SSE channel so
// the dashboard can render 3 lanes that fill independently.
//
// Best-available execution model:
//   - If a `from` URL is provided, uses `mktg init --from <url>` once for
//     all 3 (the CLI's scrape mode populates voice-profile + audience +
//     competitors in a single pass — it's actually the fastest path).
//   - Else, falls back to seeding the templates (`mktg init --skip-skills
//     --skip-agents --yes`) so the brand/ files exist for the dashboard to
//     render; the user is told to invoke /cmo for real research.
//
// All progress goes through the global SSE emitter as `foundation:progress`
// and `foundation:complete` events. The dedicated /api/onboarding/stream
// endpoint subscribes with a filter to deliver only these events.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execute } from "./sqlite.ts";
import { globalEmitter } from "./sse.ts";
import { resolveBrandTemplateRoot } from "./brand-files.ts";
import { run } from "./mktg.ts";

export type FoundationAgent =
  | "mktg-brand-researcher"
  | "mktg-audience-researcher"
  | "mktg-competitive-scanner";

export const FOUNDATION_AGENTS: readonly FoundationAgent[] = [
  "mktg-brand-researcher",
  "mktg-audience-researcher",
  "mktg-competitive-scanner",
] as const;

// Each agent owns one brand file. /cmo's research populates these.
export const AGENT_TO_FILE: Record<FoundationAgent, string> = {
  "mktg-brand-researcher": "brand/voice-profile.md",
  "mktg-audience-researcher": "brand/audience.md",
  "mktg-competitive-scanner": "brand/competitors.md",
};

export type FoundationStatus = "queued" | "running" | "complete" | "failed";

export interface FoundationProgressPayload {
  agent: FoundationAgent;
  status: FoundationStatus;
  filesChanged?: string[];
  note?: string;
  error?: string;
  durationMs?: number;
}

export interface FoundationStartOptions {
  /** Project URL to scrape via `mktg init --from`. Optional. */
  from?: string;
  /** When true, generate template stub files even without a URL. Default: true. */
  seed?: boolean;
}

export interface FoundationStartResult {
  jobIds: Record<FoundationAgent, string>;
}

interface AgentJob {
  id: string;
  agent: FoundationAgent;
  status: FoundationStatus;
  startedAt: number;
}

const inflight = new Map<string, AgentJob>();

function newJobId(): string {
  return `foundation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// SSE emitter design (lib/sse.ts) routes any wildcard `"*"` publish to ALL
// subscribers — including those on named channels like "onboarding". So one
// publish per event is enough; publishing to multiple channels causes
// duplicate delivery.
function emitProgress(payload: FoundationProgressPayload): void {
  globalEmitter.publish("*", { type: "foundation:progress", payload });
}

function emitComplete(durationMs: number, results: FoundationProgressPayload[]): void {
  const payload = {
    durationMs,
    agents: results,
    success: results.every((r) => r.status === "complete"),
  };
  globalEmitter.publish("*", { type: "foundation:complete", payload });
}

/**
 * Insert into the `activity` table AND fire the `activity-new` SSE event so
 * the Activity panel updates in real time. The DB write alone is invisible
 * to the dashboard until a refresh — both writes are required for the
 * agent-native UX contract (every action shows up in Activity).
 */
function logActivity(
  agent: FoundationAgent,
  status: FoundationStatus,
  detail: string,
  filesChanged?: string[],
): void {
  try {
    const summary = `Foundation: ${agent} ${status}`;
    const detailValue = detail || null;
    const filesValue = filesChanged?.length ? JSON.stringify(filesChanged) : null;
    const metaValue = JSON.stringify({ source: "onboarding", status });

    const result = execute(
      `INSERT INTO activity (kind, skill, summary, detail, files_changed, meta)
       VALUES ('skill-run', ?, ?, ?, ?, ?)`,
      [agent, summary, detailValue, filesValue, metaValue],
    );

    const id = Number(result.lastInsertRowid);
    globalEmitter.publish("*", {
      type: "activity-new",
      payload: {
        id,
        kind: "skill-run" as const,
        skill: agent,
        summary,
        detail: detailValue,
        filesChanged: filesChanged ?? [],
        meta: { source: "onboarding", status },
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // DB write failure should not break the foundation flow
  }
}

/**
 * Seed a brand template into the project's brand/ dir if it doesn't already
 * exist. Idempotent. Templates come from the installed mktg CLI repo.
 */
function seedTemplate(
  projectRoot: string,
  templateRoot: string | null,
  brandFile: string,
): { wrote: boolean; reason: string } {
  const target = join(projectRoot, brandFile);
  const source = templateRoot
    ? join(templateRoot, brandFile.replace(/^brand\//, ""))
    : null;

  if (existsSync(target)) {
    return { wrote: false, reason: "already exists" };
  }
  if (!source || !existsSync(source)) {
    return {
      wrote: false,
      reason: source ? `template missing at ${source}` : "marketing-cli brand templates not found",
    };
  }

  mkdirSync(join(projectRoot, "brand"), { recursive: true });
  const content = readFileSync(source, "utf-8");
  writeFileSync(target, content, "utf-8");
  return { wrote: true, reason: "seeded from template" };
}

async function runMktgInit(
  projectRoot: string,
  from: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const args = ["init", "--yes", "--skip-skills", "--skip-agents"];
  if (from) args.push("--from", from);

  const result = await run<unknown>(args, { cwd: projectRoot });
  if (result.ok) {
    return { ok: true };
  }
  return { ok: false, error: result.error.message };
}

/**
 * Kick off the foundation flow. Returns immediately with one jobId per agent.
 * Progress streams via SSE on the global, "onboarding", and "foundation"
 * channels.
 *
 * Internal contract:
 *   - All 3 jobs are marked "queued" synchronously so the SSE catches the
 *     first heartbeat.
 *   - Real work runs in a fire-and-forget chain: try `mktg init` first
 *     (covers the URL-scrape case AND the no-URL case), then per-agent seed
 *     fallback for missing files, then mark complete.
 *   - `foundation:complete` always fires, even on partial failure, with a
 *     `success: boolean` so the dashboard knows whether to advance.
 */
export function startFoundation(
  options: FoundationStartOptions = {},
  projectRoot: string = process.cwd(),
  templateRoot: string | null = resolveBrandTemplateRoot(projectRoot),
): FoundationStartResult {
  const seed = options.seed !== false;
  const from = options.from;

  const jobIds = {} as Record<FoundationAgent, string>;
  for (const agent of FOUNDATION_AGENTS) {
    const id = newJobId();
    jobIds[agent] = id;
    inflight.set(id, { id, agent, status: "queued", startedAt: Date.now() });
    emitProgress({
      agent,
      status: "queued",
      note: from
        ? "Queued — scraping from project URL"
        : "Queued — using brand templates; run /cmo for full research",
    });
    logActivity(agent, "queued", from ? `from=${from}` : "no URL provided");
  }

  void runFoundationAsync({
    jobIds,
    from,
    seed,
    projectRoot,
    templateRoot,
  });

  return { jobIds };
}

async function runFoundationAsync(opts: {
  jobIds: Record<FoundationAgent, string>;
  from?: string;
  seed: boolean;
  projectRoot: string;
  templateRoot: string | null;
}): Promise<void> {
  const start = Date.now();
  const results: FoundationProgressPayload[] = [];

  // Mark each as running before invoking the CLI so the UI lanes animate.
  for (const agent of FOUNDATION_AGENTS) {
    const job = inflight.get(opts.jobIds[agent]);
    if (job) job.status = "running";
    emitProgress({
      agent,
      status: "running",
      note: opts.from
        ? "Scraping project URL via mktg init"
        : "Seeding brand templates",
    });
  }

  // Single mktg init covers all 3 brand files when a URL is provided.
  const init = await runMktgInit(opts.projectRoot, opts.from);
  if (!init.ok && !opts.seed) {
    for (const agent of FOUNDATION_AGENTS) {
      const payload: FoundationProgressPayload = {
        agent,
        status: "failed",
        error: init.error,
        durationMs: Date.now() - start,
      };
      results.push(payload);
      emitProgress(payload);
      logActivity(agent, "failed", init.error);
      const job = inflight.get(opts.jobIds[agent]);
      if (job) job.status = "failed";
    }
    emitComplete(Date.now() - start, results);
    return;
  }

  // Per-agent finalize — check whether each brand file landed; if not and
  // seed mode is on, drop the template.
  for (const agent of FOUNDATION_AGENTS) {
    const file = AGENT_TO_FILE[agent];
    let payload: FoundationProgressPayload;

    if (existsSync(join(opts.projectRoot, file))) {
      payload = {
        agent,
        status: "complete",
        filesChanged: [file],
        note: "Brand file written",
        durationMs: Date.now() - start,
      };
    } else if (opts.seed) {
      const seedResult = seedTemplate(opts.projectRoot, opts.templateRoot, file);
      if (seedResult.wrote) {
        payload = {
          agent,
          status: "complete",
          filesChanged: [file],
          note: "Seeded from template — run /cmo to populate with research",
          durationMs: Date.now() - start,
        };
      } else {
        payload = {
          agent,
          status: "failed",
          error: seedResult.reason,
          durationMs: Date.now() - start,
        };
      }
    } else {
      payload = {
        agent,
        status: "failed",
        error: "Brand file not written and seed mode disabled",
        durationMs: Date.now() - start,
      };
    }

    results.push(payload);
    emitProgress(payload);
    logActivity(
      agent,
      payload.status,
      payload.note ?? payload.error ?? "",
      payload.filesChanged,
    );
    if (payload.filesChanged) {
      for (const f of payload.filesChanged) {
        globalEmitter.publish("*", {
          type: "brand-file-changed",
          payload: { file: f },
        });
      }
    }
    const job = inflight.get(opts.jobIds[agent]);
    if (job) job.status = payload.status;
  }

  emitComplete(Date.now() - start, results);
}
