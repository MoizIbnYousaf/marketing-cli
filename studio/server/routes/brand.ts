// Brand docs editor routes — wrapRoute handlers extracted from server.ts.
// Note / reset / refresh remain inline in server.ts (not wrapRoute-migrated).

import { z } from "zod";
import { existsSync } from "node:fs";
import { wrapRoute } from "../../lib/dx.ts";
import { execute } from "../../lib/sqlite.ts";
import { globalEmitter } from "../../lib/sse.ts";
import { createJob, runJob } from "../../lib/jobs.ts";
import { rejectControlChars } from "../../lib/validators.ts";
import {
  listBrandFiles,
  readBrandFile,
  writeBrandFile,
  resolveBrandPath,
  getSpec as getBrandSpec,
} from "../../lib/brand-files.ts";

// Body schemas live as constants so the same Zod validator drives both
// the wire AND the JSON Schema enrichment on /api/schema (single source of truth).

export const BRAND_FILE_NAME_SCHEMA = z.string().min(1).max(128).regex(
  /^(brand\/)?[a-z0-9][a-z0-9._-]*\.md$/,
  "must be a .md file under brand/",
);

export const BRAND_WRITE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
  content: z.string().max(2_000_000), // 2MB — markdown rarely exceeds this
  expectedMtime: z.string().optional(),
});

export const BRAND_REGENERATE_BODY = z.object({
  file: BRAND_FILE_NAME_SCHEMA,
});

export const BRAND_FILES_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: listBrandFiles() as unknown[],
    meta: { fetchedAt: new Date().toISOString() },
  }),
});

export const BRAND_READ_ROUTE = wrapRoute<undefined, {
  file: string;
  content: string;
  mtime: string;
  bytes: number;
  freshness: "fresh" | "stale" | "template";
  ageDays: number | null;
}>({
  method: "GET",
  handler: async (_input, ctx) => {
    const fileQ = ctx.url.searchParams.get("file");
    if (!fileQ) {
      return { ok: false as const, code: "BAD_INPUT" as const, message: "file query parameter is required" };
    }
    const ctrl = rejectControlChars(fileQ, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(fileQ);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }
    if (!existsSync(resolved.abs)) {
      return { ok: false as const, code: "NOT_FOUND" as const, message: `brand/${resolved.rel} does not exist`, status: 404 };
    }
    try {
      const r = readBrandFile(resolved.abs);
      return {
        ok: true as const,
        data: {
          file: resolved.rel,
          content: r.content,
          mtime: r.mtime,
          bytes: r.bytes,
          freshness: r.freshness,
          ageDays: r.ageDays,
        },
        meta: { fetchedAt: new Date().toISOString() },
      };
    } catch (e) {
      return {
        ok: false as const,
        code: "INTERNAL_ERROR" as const,
        message: e instanceof Error ? e.message : "failed to read file",
        status: 500,
      };
    }
  },
});

export const BRAND_WRITE_ROUTE = wrapRoute<z.infer<typeof BRAND_WRITE_BODY>, {
  file: string;
  mtime: string;
  bytes: number;
  deltaChars: number;
}>({
  method: "POST",
  inputSchema: BRAND_WRITE_BODY,
  dryRun: true,
  handler: async (input) => {
    const ctrl = rejectControlChars(input.file, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(input.file);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }

    const result = writeBrandFile(resolved.abs, input.content, input.expectedMtime);
    if (!result.ok) {
      return {
        ok: false as const,
        code: "CONFLICT" as const,
        message: `File modified elsewhere at ${result.serverMtime}`,
        status: 409,
        fix: `Reload (GET /api/brand/read?file=${resolved.rel}) and merge — your expectedMtime was ${result.clientMtime}`,
      };
    }

    // Hook the Activity panel: every successful write becomes a brand-write
    // entry that the dashboard renders in real time.
    const summary = `Wrote brand/${resolved.rel} (${result.deltaChars >= 0 ? "+" : ""}${result.deltaChars} chars)`;
    try {
      const row = execute(
        `INSERT INTO activity (kind, summary, files_changed, meta)
         VALUES ('brand-write', ?, ?, ?)`,
        [
          summary,
          JSON.stringify([`brand/${resolved.rel}`]),
          JSON.stringify({ source: "studio", bytes: result.bytes, deltaChars: result.deltaChars }),
        ],
      );
      globalEmitter.publish("*", {
        type: "activity-new",
        payload: {
          id: Number(row.lastInsertRowid),
          kind: "brand-write" as const,
          summary,
          filesChanged: [`brand/${resolved.rel}`],
          meta: { source: "studio", bytes: result.bytes, deltaChars: result.deltaChars },
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // DB write failures don't break the file write
    }

    globalEmitter.publish("*", {
      type: "brand-file-changed",
      payload: { file: `brand/${resolved.rel}`, mtime: result.mtime, bytes: result.bytes },
    });

    return {
      ok: true as const,
      data: {
        file: resolved.rel,
        mtime: result.mtime,
        bytes: result.bytes,
        deltaChars: result.deltaChars,
      },
    };
  },
});

export const BRAND_REGENERATE_ROUTE = wrapRoute<z.infer<typeof BRAND_REGENERATE_BODY>, {
  jobId: string;
  skill: string;
  file: string;
  note: string;
}>({
  method: "POST",
  inputSchema: BRAND_REGENERATE_BODY,
  dryRun: true,
  handler: async (input) => {
    const ctrl = rejectControlChars(input.file, "file");
    if (!ctrl.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: ctrl.message };
    }
    const resolved = resolveBrandPath(input.file);
    if (!resolved.ok) {
      return { ok: false as const, code: "PATH_TRAVERSAL" as const, message: resolved.message };
    }
    const spec = getBrandSpec(resolved.rel);
    if (!spec || !spec.skill) {
      return {
        ok: false as const,
        code: "BAD_INPUT" as const,
        message: `brand/${resolved.rel} has no owning skill — append-only or manual file`,
        fix: "Pick a file from the canonical 10 with a skill owner (voice-profile, audience, competitors, …)",
      };
    }

    // The studio cannot directly invoke /cmo (no AGPL-style coupling); instead
    // we queue a job that /cmo (running in the user's Claude Code session)
    // picks up. Same pattern as /api/skill/run.
    const job = createJob(`brand:regenerate:${spec.skill}`, {
      file: resolved.rel,
      skill: spec.skill,
    });
    runJob(job.id, async (_job, emit) => {
      emit(`Queued brand/${resolved.rel} regeneration via skill ${spec.skill}. Run /cmo to execute.`);
      // Emit the skill-start event so the dashboard can render a "regenerating"
      // banner immediately; skill-complete fires when /cmo POSTs back.
      globalEmitter.publish("*", {
        type: "skill-start",
        payload: { skill: spec.skill, file: `brand/${resolved.rel}`, jobId: job.id },
      });
      return { status: "queued", skill: spec.skill, file: resolved.rel };
    });

    // Activity-feed entry so the user sees this immediately.
    try {
      const row = execute(
        `INSERT INTO activity (kind, skill, summary, files_changed, meta)
         VALUES ('skill-run', ?, ?, ?, ?)`,
        [
          spec.skill,
          `Regenerating brand/${resolved.rel}`,
          JSON.stringify([`brand/${resolved.rel}`]),
          JSON.stringify({ source: "studio", jobId: job.id, status: "queued" }),
        ],
      );
      globalEmitter.publish("*", {
        type: "activity-new",
        payload: {
          id: Number(row.lastInsertRowid),
          kind: "skill-run" as const,
          skill: spec.skill,
          summary: `Regenerating brand/${resolved.rel}`,
          filesChanged: [`brand/${resolved.rel}`],
          meta: { source: "studio", jobId: job.id, status: "queued" },
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // ignore
    }

    return {
      ok: true as const,
      data: {
        jobId: job.id,
        skill: spec.skill,
        file: resolved.rel,
        note: `Queued via job ${job.id} — /cmo executes the skill in the user's Claude Code session`,
      },
      meta: { fetchedAt: new Date().toISOString() },
    };
  },
});
