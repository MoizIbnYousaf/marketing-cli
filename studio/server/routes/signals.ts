// Signals + empty-list stub routes — wrapRoute handlers from server.ts.

import { z } from "zod";
import { wrapRoute } from "../../lib/dx.ts";
import { queryAll, execute } from "../../lib/sqlite.ts";
import { rejectControlChars } from "../../lib/validators.ts";
import { safeJsonParse } from "../http.ts";

// Shared wrapped handlers for empty-stub GETs (HQ legacy signal routes, Trends, Audience, etc.)
// Each returns `{ok:true, data:[]}` and inherits the wrapper's contract:
// fields projection, NDJSON streaming, structured errors, access logging.
export const EMPTY_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({ ok: true as const, data: [] as unknown[] }),
});

export const TRENDS_HOT_CONTEXT_ROUTE = wrapRoute({
  method: "GET",
  handler: async () => ({ ok: true as const, data: null }),
});

function normalizeSignalSeverity(value: unknown): "p0" | "p1" | "watch" | "negative" | "neutral" {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "neutral";
  if (numeric >= 80) return "p0";
  if (numeric >= 60) return "p1";
  if (numeric >= 40) return "watch";
  if (numeric < 0) return "negative";
  return "neutral";
}

export function normalizeSignalRow(row: Record<string, unknown>) {
  const createdAt =
    typeof row.created_at === "string"
      ? new Date(row.created_at.endsWith("Z") ? row.created_at : `${row.created_at}Z`).toISOString()
      : new Date().toISOString();
  const updatedAt =
    typeof row.updated_at === "string"
      ? new Date(row.updated_at.endsWith("Z") ? row.updated_at : `${row.updated_at}Z`).toISOString()
      : createdAt;
  const capturedAt = Date.parse(createdAt);
  const metadata = safeJsonParse<Record<string, unknown>>(typeof row.metadata === "string" ? row.metadata : "{}", {});
  const content = typeof row.content === "string" ? row.content.replace(/^demo:\s*/i, "") : null;
  const canonicalUrl = typeof row.url === "string" ? row.url : null;
  const spikeDetected = row.spike_detected === 1 || row.spike_detected === true;
  const severity = normalizeSignalSeverity(row.severity);

  return {
    id: String(row.id),
    platform: typeof row.platform === "string" ? row.platform : "news",
    content,
    url: canonicalUrl,
    canonicalUrl,
    severity,
    spikeMultiplier:
      typeof metadata.spikeMultiplier === "number"
        ? metadata.spikeMultiplier
        : spikeDetected && typeof row.severity === "number" && row.severity > 0
          ? Math.max(1, row.severity / 20)
          : undefined,
    spikeDetected,
    feedback: typeof row.feedback === "string" ? row.feedback : "pending",
    feedbackAt:
      typeof metadata.feedbackAt === "number"
        ? metadata.feedbackAt
        : undefined,
    metadata: typeof row.metadata === "string" ? row.metadata : null,
    capturedAt: Number.isFinite(capturedAt) ? capturedAt : Date.now(),
    createdAt,
    updatedAt,
    title: typeof metadata.title === "string" ? metadata.title : undefined,
    authorHandle: typeof metadata.authorHandle === "string" ? metadata.authorHandle : null,
    externalId: typeof metadata.externalId === "string" ? metadata.externalId : null,
    hashtags: Array.isArray(metadata.hashtags)
      ? metadata.hashtags.filter((tag): tag is string => typeof tag === "string")
      : null,
    stream: typeof metadata.stream === "string" ? metadata.stream : null,
    metrics:
      metadata.metrics && typeof metadata.metrics === "object"
        ? {
            views: typeof (metadata.metrics as Record<string, unknown>).views === "number" ? (metadata.metrics as Record<string, number>).views : undefined,
            likes: typeof (metadata.metrics as Record<string, unknown>).likes === "number" ? (metadata.metrics as Record<string, number>).likes : undefined,
            comments: typeof (metadata.metrics as Record<string, unknown>).comments === "number" ? (metadata.metrics as Record<string, number>).comments : undefined,
            shares: typeof (metadata.metrics as Record<string, unknown>).shares === "number" ? (metadata.metrics as Record<string, number>).shares : undefined,
          }
        : undefined,
    trendInterest: typeof metadata.trendInterest === "number" ? metadata.trendInterest : undefined,
    trendRising: typeof metadata.trendRising === "boolean" ? metadata.trendRising : undefined,
  };
}

export const SIGNALS_LIST_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async (_input, ctx) => {
    const platform = ctx.url.searchParams.get("platform");
    const feedback = ctx.url.searchParams.get("filter");
    const where: string[] = [];
    const params: unknown[] = [];
    if (platform) {
      const c = rejectControlChars(platform, "platform");
      if (!c.ok) return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      where.push("platform = ?");
      params.push(platform);
    }
    if (feedback) {
      const c = rejectControlChars(feedback, "filter");
      if (!c.ok) return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: c.message };
      where.push("feedback = ?");
      params.push(feedback);
    }
    let sql = "SELECT * FROM signals";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY severity DESC, created_at DESC LIMIT 100";
    const rows = queryAll<Record<string, unknown>>(sql, params);
    return { ok: true as const, data: rows.map(normalizeSignalRow) };
  },
});

export const SIGNALS_BASELINE_ROUTE = wrapRoute({
  method: "GET",
  listResponse: true,
  handler: async () => ({
    ok: true as const,
    data: queryAll<Record<string, unknown>>(
      "SELECT * FROM metric_baselines ORDER BY computed_at DESC",
    ),
  }),
});

export const SIGNAL_ID_BODY = z.object({ id: z.number().int().positive() });

export const SIGNAL_DISMISS_ROUTE = wrapRoute<z.infer<typeof SIGNAL_ID_BODY>, { id: number; feedback: "dismissed" }>({
  method: "POST",
  inputSchema: SIGNAL_ID_BODY,
  dryRun: true,
  handler: async (input) => {
    const result = execute(
      "UPDATE signals SET feedback = 'dismissed', updated_at = datetime('now') WHERE id = ?",
      [input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return { ok: true as const, data: { id: input.id, feedback: "dismissed" as const } };
  },
});

export const SIGNAL_APPROVE_ROUTE = wrapRoute<z.infer<typeof SIGNAL_ID_BODY>, { id: number; feedback: "approved" }>({
  method: "POST",
  inputSchema: SIGNAL_ID_BODY,
  dryRun: true,
  handler: async (input) => {
    const result = execute(
      "UPDATE signals SET feedback = 'approved', updated_at = datetime('now') WHERE id = ?",
      [input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return { ok: true as const, data: { id: input.id, feedback: "approved" as const } };
  },
});

export const SIGNAL_FLAG_BODY = z.object({
  id: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

export const SIGNAL_FLAG_ROUTE = wrapRoute<z.infer<typeof SIGNAL_FLAG_BODY>, { id: number; feedback: "flagged"; reason: string }>({
  method: "POST",
  inputSchema: SIGNAL_FLAG_BODY,
  dryRun: true,
  handler: async (input) => {
    const reasonCheck = rejectControlChars(input.reason, "reason");
    if (!reasonCheck.ok) {
      return { ok: false as const, code: "CONTROL_CHARS_REJECTED" as const, message: reasonCheck.message };
    }
    const result = execute(
      "UPDATE signals SET feedback = 'flagged', metadata = json_patch(COALESCE(metadata,'{}'), json_object('flagReason', ?)), updated_at = datetime('now') WHERE id = ?",
      [input.reason, input.id],
    );
    if (result.changes === 0) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        status: 404,
        message: `signal row ${input.id} does not exist`,
        fix: "GET /api/signals to list valid ids",
      };
    }
    return {
      ok: true as const,
      data: { id: input.id, feedback: "flagged" as const, reason: input.reason },
    };
  },
});
