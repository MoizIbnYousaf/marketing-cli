// Publish tab routes — adapters, integrations, scheduled queue, history, native.
// Extracted from server.ts; degraded-upstream shapes stay outside wrapRoute.

import {
  diagnosePostiz,
  getScheduledPosts,
  mapPostizError,
} from "../../lib/postiz.ts";
import {
  mktgPublishListAdapters,
  mktgPublishListIntegrations,
  mktgPublishNativeAccount,
  mktgPublishNativeListPosts,
  mktgPublishNativeUpsertProvider,
  mktgPublish,
} from "../../lib/mktg.ts";
import type { PublishManifest } from "../../lib/types/mktg.ts";
import { queryAll, execute } from "../../lib/sqlite.ts";
import { globalEmitter } from "../../lib/sse.ts";
import { rejectControlChars, validateResourceId } from "../../lib/validators.ts";
import type { StudioErrorCode } from "../../lib/output.ts";
import {
  PUBLISH_BODY,
  PUBLISH_NATIVE_PROVIDER_BODY,
} from "../../lib/schemas.ts";
import { safeJsonParse, type RouteHttpHelpers } from "../http.ts";

export { PUBLISH_BODY, PUBLISH_NATIVE_PROVIDER_BODY };

/**
 * Dispatch /api/publish* routes. Returns null when the path is not a publish route.
 */
export async function tryPublishRoutes(
  method: string,
  url: URL,
  req: Request,
  corsHeaders: Record<string, string>,
  cwd: string,
  h: RouteHttpHelpers,
): Promise<Response | null> {
  // Note: when an upstream is unreachable but the route is healthy we return
  // `{ok:true, data:[], degraded:true, degradedReason:"..."}`. The route
  // itself succeeded — the *upstream* is degraded — so `ok:true` is right.
  // The `error` envelope (axis 7) is reserved for true `ok:false` failures.

  if (method === "GET" && url.pathname === "/api/publish/adapters") {
    const result = await mktgPublishListAdapters(cwd);
    if (!result.ok) {
      return h.json(
        {
          ok: true,
          data: [],
          degraded: true,
          degradedReason: result.error.message,
        },
        200,
        corsHeaders,
      );
    }
    return h.respondList(req, url, result.data.adapters, corsHeaders);
  }

  if (method === "GET" && url.pathname === "/api/publish/integrations") {
    const adapter = url.searchParams.get("adapter") ?? "postiz";
    const idCheck = validateResourceId(adapter, "adapter");
    if (!idCheck.ok) {
      return h.err(idCheck.message, 400, corsHeaders, "Use [a-z0-9._-] only");
    }

    const result = await mktgPublishListIntegrations(adapter, cwd);
    if (!result.ok) {
      return h.json(
        {
          ok: true,
          data: [],
          adapter,
          degraded: true,
          degradedReason: result.error.message,
        },
        200,
        corsHeaders,
      );
    }
    return h.respondList(req, url, result.data.integrations, {
      ...corsHeaders,
      "X-Adapter": adapter,
    });
  }

  if (method === "GET" && url.pathname === "/api/publish/postiz/diagnostics") {
    const diagnostics = await diagnosePostiz();
    return h.respondObject(url, diagnostics, corsHeaders);
  }

  if (method === "GET" && url.pathname === "/api/publish/native/account") {
    const result = await mktgPublishNativeAccount(cwd);
    if (!result.ok) return h.respondMktgError(result, corsHeaders);
    // Redact the full apiKey at the wire. apiKeyPreview is the safe
    // 6-char tail the dashboard renders; the full secret stays in the
    // user's `.mktg/native-publish/account.json` and is never returned.
    const safe = {
      ...result.data,
      account: {
        ...result.data.account,
        apiKey: undefined,
      },
    };
    delete (safe.account as { apiKey?: unknown }).apiKey;
    return h.respondObject(url, safe, corsHeaders);
  }

  if (method === "POST" && url.pathname === "/api/publish/native/providers") {
    const dryRun = url.searchParams.get("dryRun") === "true";
    const parsed = await h.parseBody(req, PUBLISH_NATIVE_PROVIDER_BODY);
    if (!parsed.ok) return parsed.res;

    for (const [field, value] of Object.entries({
      identifier: parsed.data.identifier,
      name: parsed.data.name,
      profile: parsed.data.profile,
      picture: parsed.data.picture ?? "",
    })) {
      const c = rejectControlChars(value, field);
      if (!c.ok) {
        return h.err(c.message, 400, corsHeaders, `Remove control characters from ${field}`);
      }
    }

    if (dryRun) {
      return h.json(
        { ok: true, dryRun: true, adapter: "mktg-native", input: parsed.data },
        200,
        corsHeaders,
      );
    }

    const result = await mktgPublishNativeUpsertProvider(parsed.data, cwd);
    if (!result.ok) return h.respondMktgError(result, corsHeaders);
    return h.respondObject(url, result.data, corsHeaders);
  }

  // GET /api/publish/scheduled — adapter queue (mktg-native or Postiz read-through)
  if (method === "GET" && url.pathname === "/api/publish/scheduled") {
    const adapter = url.searchParams.get("adapter") ?? "postiz";
    const adapterCheck = validateResourceId(adapter, "adapter");
    if (!adapterCheck.ok) {
      return h.err(
        adapterCheck.message,
        400,
        corsHeaders,
        "Use lowercase adapter ids like postiz or mktg-native",
      );
    }
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const defaultEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    const startDate = url.searchParams.get("startDate") ?? defaultStart;
    const endDate = url.searchParams.get("endDate") ?? defaultEnd;

    for (const [field, value] of Object.entries({ startDate, endDate })) {
      const c = rejectControlChars(value, field);
      if (!c.ok) {
        return h.err(c.message, 400, corsHeaders, `Send ${field} as a clean ISO 8601 string`);
      }
      if (Number.isNaN(Date.parse(value))) {
        return h.err(
          `${field} must be ISO 8601`,
          400,
          corsHeaders,
          "Use new Date().toISOString() format",
        );
      }
    }

    if (adapter === "mktg-native") {
      const result = await mktgPublishNativeListPosts(cwd);
      if (!result.ok) return h.respondMktgError(result, corsHeaders);

      const filtered = result.data.posts.filter(
        (post) => post.date >= startDate && post.date <= endDate,
      );
      return h.respondList(req, url, filtered, {
        ...corsHeaders,
        "X-Adapter": adapter,
      });
    }

    const result = await getScheduledPosts(startDate, endDate);
    if (!result.ok) {
      return h.json(
        {
          ok: true,
          data: [],
          degraded: true,
          degradedReason: mapPostizError(result.error),
          postizErrorKind: result.error.kind,
          adapter,
        },
        200,
        corsHeaders,
      );
    }
    return h.respondList(req, url, result.data, {
      ...corsHeaders,
      "X-Adapter": adapter,
    });
  }

  // GET /api/publish/history — local SQLite publish_log
  if (method === "GET" && url.pathname === "/api/publish/history") {
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
      500,
    );
    const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

    const rows = queryAll<{
      id: number;
      adapter: string;
      providers: string | null;
      content_preview: string | null;
      result: string | null;
      items_published: number;
      items_failed: number;
      created_at: string;
    }>(
      "SELECT id, adapter, providers, content_preview, result, items_published, items_failed, created_at FROM publish_log ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );

    const data = rows.map((r) => ({
      id: r.id,
      adapter: r.adapter,
      providers: r.providers ? safeJsonParse<string[]>(r.providers, []) : [],
      contentPreview: r.content_preview ?? "",
      result: r.result ? safeJsonParse<unknown>(r.result, null) : null,
      itemsPublished: r.items_published,
      itemsFailed: r.items_failed,
      createdAt: r.created_at,
    }));

    return h.respondList(req, url, data, corsHeaders);
  }

  if (method === "POST" && url.pathname === "/api/publish") {
    const body = await h.parseBody(req, PUBLISH_BODY);
    if (!body.ok) return body.res;

    const idCheck = validateResourceId(body.data.adapter, "adapter");
    if (!idCheck.ok) return h.err(idCheck.message, 400, corsHeaders);

    if (h.isDryRun(url)) {
      return h.json(
        { ok: true, dryRun: true, adapter: body.data.adapter },
        200,
        corsHeaders,
      );
    }

    const manifest = body.data.manifest as unknown as PublishManifest;
    const result = await mktgPublish(manifest, {
      adapter: body.data.adapter,
      confirm: body.data.confirm ?? false,
      cwd,
    });

    if (!result.ok) {
      const code: StudioErrorCode =
        result.error.code === "AUTH_MISSING" || result.error.code === "AUTH_INVALID"
          ? "UNAUTHORIZED"
          : result.error.code === "RATE_LIMITED"
            ? "RATE_LIMITED"
            : "UPSTREAM_FAILED";
      const fix = result.error.suggestions?.[0] ?? undefined;
      return h.errResponse(
        code,
        result.error.message,
        code === "UNAUTHORIZED" ? 401 : 502,
        fix,
        corsHeaders,
      );
    }

    const data = result.data;
    const adapterResults = data.adapters?.[0];
    const providers = adapterResults
      ? Array.from(
          new Set(
            (manifest.items ?? [])
              .flatMap((it) => {
                const meta = it.metadata ?? {};
                const integ = meta.integrationIdentifier;
                if (typeof integ === "string") return [integ];
                if (Array.isArray(integ)) return integ as string[];
                return [];
              })
              .filter(Boolean) as string[],
          ),
        )
      : [];

    const contentPreview = (manifest.items?.[0]?.content ?? "").slice(0, 280);

    execute(
      `INSERT INTO publish_log (adapter, providers, content_preview, result, items_published, items_failed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.data.adapter,
        providers.length ? JSON.stringify(providers) : null,
        contentPreview,
        JSON.stringify(data),
        data.published ?? 0,
        data.failed ?? 0,
      ],
    );

    globalEmitter.publish("*", {
      type: "publish-completed",
      payload: {
        adapter: body.data.adapter,
        published: data.published ?? 0,
        failed: data.failed ?? 0,
      },
    });

    return h.json({ ok: true, data }, 200, corsHeaders);
  }

  return null;
}
