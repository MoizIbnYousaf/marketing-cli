// Activity panel routes — wrapRoute handlers extracted from server.ts.
// Wire contracts unchanged: GET list, POST log, DELETE :id.

import { z } from "zod";
import { wrapRoute } from "../../lib/dx.ts";
import { queryAll, queryOne, execute } from "../../lib/sqlite.ts";
import { globalEmitter } from "../../lib/sse.ts";
import { rejectControlChars, validateResourceId } from "../../lib/validators.ts";
import { safeJsonParse } from "../http.ts";

export const ACTIVITY_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async (_input, ctx) => {
    const kind = ctx.url.searchParams.get("kind");
    const skill = ctx.url.searchParams.get("skill");
    const limit = Math.min(
      Math.max(parseInt(ctx.url.searchParams.get("limit") ?? "50", 10) || 50, 1),
      500,
    );
    const offset = Math.max(
      parseInt(ctx.url.searchParams.get("offset") ?? "0", 10) || 0,
      0,
    );

    const where: string[] = [];
    const params: unknown[] = [];
    if (kind) {
      const c = rejectControlChars(kind, "kind");
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
      where.push("kind = ?");
      params.push(kind);
    }
    if (skill) {
      const c = rejectControlChars(skill, "skill");
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
      where.push("skill = ?");
      params.push(skill);
    }

    let sql = "SELECT id, kind, skill, summary, detail, files_changed, meta, created_at FROM activity";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = queryAll<{
      id: number;
      kind: string;
      skill: string | null;
      summary: string;
      detail: string | null;
      files_changed: string | null;
      meta: string | null;
      created_at: string;
    }>(sql, params);

    return {
      ok: true as const,
      data: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        skill: r.skill,
        summary: r.summary,
        detail: r.detail,
        filesChanged: r.files_changed ? safeJsonParse<string[]>(r.files_changed, []) : [],
        meta: r.meta ? safeJsonParse<Record<string, unknown> | null>(r.meta, null) : null,
        createdAt: r.created_at,
      })),
    };
  },
});

// ActivityKind — the canonical set of /cmo event types. Mirrors the Activity
// type in lib/types/activity.ts and the icon mapping in
// components/workspace/activity-panel/activity-item.tsx. Anything outside this
// set should fail BAD_INPUT instead of writing a row the UI can't render.
export const ACTIVITY_LOG_BODY = z.object({
  kind: z.enum([
    "skill-run",
    "brand-write",
    "publish",
    "toast",
    "navigate",
    "audit",
    "note",
    "custom",
  ]),
  skill: z.string().min(1).max(128).optional(),
  summary: z.string().min(1).max(500),
  detail: z.string().max(8_000).optional(),
  filesChanged: z.array(z.string().max(512)).max(50).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const ACTIVITY_LOG_ROUTE = wrapRoute<z.infer<typeof ACTIVITY_LOG_BODY>, {
  id: number;
  kind: string;
  skill: string | null;
  summary: string;
  detail: string | null;
  filesChanged: string[];
  meta: Record<string, unknown> | null;
  createdAt: string;
}>({
  method: "POST",
  inputSchema: ACTIVITY_LOG_BODY,
  dryRun: true,
  handler: async (input) => {
    for (const [field, value] of Object.entries({
      kind: input.kind,
      summary: input.summary,
      detail: input.detail ?? "",
      skill: input.skill ?? "",
    })) {
      const c = rejectControlChars(value, field);
      if (!c.ok) {
        return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      }
    }
    if (input.skill) {
      const idCheck = validateResourceId(input.skill, "skill");
      if (!idCheck.ok) {
        return { ok: false as const, code: "INVALID_RESOURCE_ID" as const, message: idCheck.message };
      }
    }

    const result = execute(
      `INSERT INTO activity (kind, skill, summary, detail, files_changed, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.kind,
        input.skill ?? null,
        input.summary,
        input.detail ?? null,
        input.filesChanged ? JSON.stringify(input.filesChanged) : null,
        input.meta ? JSON.stringify(input.meta) : null,
      ],
    );

    const id = Number(result.lastInsertRowid);
    const payload = {
      id,
      kind: input.kind,
      skill: input.skill ?? null,
      summary: input.summary,
      detail: input.detail ?? null,
      filesChanged: input.filesChanged ?? [],
      meta: input.meta ?? null,
      createdAt: new Date().toISOString(),
    };

    globalEmitter.publish("*", { type: "activity-new", payload });

    return { ok: true as const, data: payload };
  },
});

// DELETE /api/activity/:id?confirm=true — destructive removal of one activity
// row. wrapRoute's `destructive: true` auto-gates on `?confirm=true`; without
// it the request returns `{ok:false, error:{code:"CONFIRM_REQUIRED"}}`. The
// handler reads :id from the URL path (set by the dispatcher), 404s when the
// row isn't there, otherwise deletes + emits an `activity-deleted` SSE event
// so the Activity panel can drop the row in real time.
export const ACTIVITY_DELETE_ROUTE = wrapRoute<undefined, { id: number; deleted: true }>({
  method: "DELETE",
  destructive: true,
  dryRun: true,
  handler: async (_input, ctx) => {
    const match = ctx.url.pathname.match(/^\/api\/activity\/(\d+)$/);
    if (!match) {
      return { ok: false as const, code: "BAD_INPUT" as const, message: "Path must be /api/activity/:id where :id is a positive integer" };
    }
    const id = Number(match[1]);
    const row = queryOne<{ id: number }>("SELECT id FROM activity WHERE id = ?", [id]);
    if (!row) {
      return { ok: false as const, code: "NOT_FOUND" as const, message: `activity row ${id} does not exist`, status: 404, fix: "GET /api/activity to list valid ids" };
    }
    execute("DELETE FROM activity WHERE id = ?", [id]);
    globalEmitter.publish("*", { type: "activity-deleted", payload: { id } });
    return { ok: true as const, data: { id, deleted: true as const } };
  },
});
