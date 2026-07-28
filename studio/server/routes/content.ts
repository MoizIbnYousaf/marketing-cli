// Content workspace routes — local-first manifest + artifact APIs.
// Extracted from server.ts; binary media / SSE / conflict shapes stay outside wrapRoute.

import { join } from "node:path";
import { statSync } from "node:fs";
import { execute } from "../../lib/sqlite.ts";
import { globalEmitter } from "../../lib/sse.ts";
import { rejectControlChars } from "../../lib/validators.ts";
import {
  CONTENT_FILE_WRITE_BODY,
  CONTENT_META_PATCH_BODY,
  CONTENT_REINDEX_BODY,
} from "../../lib/schemas.ts";
import {
  assertProjectMediaPath,
  buildContentManifest,
  classifyContentAssetKind,
  contentMimeType,
  loadContentMeta,
  readContentFile,
  writeContentFile,
  writeContentMeta,
  type ContentAssetMeta,
  type ContentGroupMeta,
} from "../../lib/content-manifest.ts";
import type { RouteHttpHelpers } from "../http.ts";

export {
  CONTENT_FILE_WRITE_BODY,
  CONTENT_META_PATCH_BODY,
  CONTENT_REINDEX_BODY,
};

function parseByteRange(
  rangeHeader: string | null,
  size: number,
): { ok: true; start: number; end: number } | { ok: false } {
  if (!rangeHeader) return { ok: false };
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return { ok: false };
  const [, startRaw = "", endRaw = ""] = match;
  if (!startRaw && !endRaw) return { ok: false };

  let start: number;
  let end: number;
  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return { ok: false };
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : size - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return { ok: false };
  }
  return { ok: true, start, end: Math.min(end, size - 1) };
}

function sanitizeContentAssetPatch(patch: Record<string, unknown>): ContentAssetMeta {
  const out: ContentAssetMeta = {};
  if (typeof patch.title === "string") out.title = patch.title.slice(0, 240);
  if (
    patch.status === "draft" ||
    patch.status === "approved" ||
    patch.status === "published" ||
    patch.status === "archived"
  ) {
    out.status = patch.status;
  }
  if (Array.isArray(patch.tags)) {
    out.tags = patch.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 40);
  }
  if (typeof patch.orderKey === "string") out.orderKey = patch.orderKey.slice(0, 128);
  if (typeof patch.groupId === "string") out.groupId = patch.groupId.slice(0, 128);
  if (Array.isArray(patch.linkedMarkdownPaths)) {
    out.linkedMarkdownPaths = patch.linkedMarkdownPaths
      .filter((path): path is string => typeof path === "string")
      .slice(0, 40);
  }
  if (typeof patch.notes === "string") out.notes = patch.notes.slice(0, 8_000);
  out.updatedAt = new Date().toISOString();
  return out;
}

function sanitizeContentGroupPatch(
  id: string,
  existing: ContentGroupMeta | undefined,
  patch: Record<string, unknown>,
): ContentGroupMeta {
  return {
    title:
      typeof patch.title === "string" && patch.title.trim()
        ? patch.title.slice(0, 160)
        : (existing?.title ?? id),
    orderKey:
      typeof patch.orderKey === "string" ? patch.orderKey.slice(0, 128) : existing?.orderKey,
  };
}

/** Serve a project-local media file with HTTP Range support (also used by /api/assets/file). */
export function serveProjectAsset(
  req: Request,
  relativePath: string,
  corsHeaders: Record<string, string>,
  cwd: string,
  h: Pick<RouteHttpHelpers, "err" | "errResponse">,
): Response {
  const ctrl = rejectControlChars(relativePath, "path");
  if (!ctrl.ok) return h.err(ctrl.message, 400, corsHeaders);

  const resolved = assertProjectMediaPath(relativePath, cwd);
  if (!resolved.ok) {
    const status = resolved.message.includes("does not exist") ? 404 : 400;
    return h.errResponse(
      status === 404 ? "NOT_FOUND" : "PATH_TRAVERSAL",
      resolved.message,
      status,
      undefined,
      corsHeaders,
    );
  }

  const stat = statSync(resolved.abs);
  const contentType = contentMimeType(resolved.abs);
  const baseHeaders = {
    ...corsHeaders,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    ETag: `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`,
    "Last-Modified": stat.mtime.toUTCString(),
  };
  const range = parseByteRange(req.headers.get("range"), stat.size);
  if (range.ok) {
    const chunkSize = range.end - range.start + 1;
    return new Response(Bun.file(resolved.abs).slice(range.start, range.end + 1), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  }

  if (req.headers.has("range")) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${stat.size}`,
      },
    });
  }

  return new Response(Bun.file(resolved.abs), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(stat.size),
    },
  });
}

/**
 * Dispatch /api/cmo/content/* routes. Returns null when the path is not a content route.
 */
export async function tryContentRoutes(
  method: string,
  url: URL,
  req: Request,
  corsHeaders: Record<string, string>,
  cwd: string,
  h: RouteHttpHelpers,
): Promise<Response | null> {
  if (method === "GET" && url.pathname === "/api/cmo/content/manifest") {
    return h.respondObject(url, buildContentManifest(cwd), corsHeaders);
  }

  if (method === "GET" && url.pathname === "/api/cmo/content/file") {
    const pathQ = url.searchParams.get("path");
    if (!pathQ) return h.err("path query parameter is required", 400, corsHeaders);
    const ctrl = rejectControlChars(pathQ, "path");
    if (!ctrl.ok) return h.err(ctrl.message, 400, corsHeaders);
    try {
      return h.respondObject(url, readContentFile(pathQ, cwd), corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to read file";
      if (message.includes("does not exist")) {
        return h.errResponse("NOT_FOUND", message, 404, undefined, corsHeaders);
      }
      if (message.includes("absolute paths") || message.includes("project root")) {
        return h.errResponse("PATH_TRAVERSAL", message, 400, undefined, corsHeaders);
      }
      return h.errResponse("BAD_INPUT", message, 400, undefined, corsHeaders);
    }
  }

  if (method === "PUT" && url.pathname === "/api/cmo/content/file") {
    const body = await h.parseBody(req, CONTENT_FILE_WRITE_BODY);
    if (!body.ok) return body.res;
    const ctrl = rejectControlChars(body.data.path, "path");
    if (!ctrl.ok) return h.err(ctrl.message, 400, corsHeaders);
    if (h.isDryRun(url)) {
      return h.json({ ok: true, dryRun: true, data: { path: body.data.path } }, 200, corsHeaders);
    }

    try {
      const result = writeContentFile(
        body.data.path,
        body.data.content,
        body.data.expectedMtime,
        cwd,
      );
      if (!result.ok) {
        return h.errResponse(
          "CONFLICT",
          `File modified elsewhere at ${result.serverMtime}`,
          409,
          `Reload (GET /api/cmo/content/file?path=${encodeURIComponent(body.data.path)}) and merge`,
          corsHeaders,
        );
      }

      const payload = {
        path: result.path,
        kind: classifyContentAssetKind(result.path),
        mtime: result.mtime,
        bytes: result.bytes,
      };
      globalEmitter.publish("*", { type: "content-file-changed", payload });
      if (result.path.startsWith("brand/") && result.path.endsWith(".md")) {
        globalEmitter.publish("*", {
          type: "brand-file-changed",
          payload: {
            file: result.path.replace(/^brand\//, ""),
            brandFile: result.path.replace(/^brand\//, ""),
            path: join(cwd, result.path),
            eventType: "change",
          },
        });
      }

      try {
        const row = execute(
          `INSERT INTO activity (kind, summary, files_changed, meta)
           VALUES ('brand-write', ?, ?, ?)`,
          [
            `Wrote ${result.path} (${result.deltaChars >= 0 ? "+" : ""}${result.deltaChars} chars)`,
            JSON.stringify([result.path]),
            JSON.stringify({
              source: "content-workspace",
              bytes: result.bytes,
              deltaChars: result.deltaChars,
            }),
          ],
        );
        globalEmitter.publish("*", {
          type: "activity-new",
          payload: {
            id: Number(row.lastInsertRowid),
            kind: "brand-write",
            summary: `Wrote ${result.path}`,
            filesChanged: [result.path],
            meta: {
              source: "content-workspace",
              bytes: result.bytes,
              deltaChars: result.deltaChars,
            },
            createdAt: new Date().toISOString(),
          },
        });
      } catch {
        // Activity logging should not block the file write.
      }

      return h.json({ ok: true, data: result }, 200, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to write file";
      if (message.includes("absolute paths") || message.includes("project root")) {
        return h.errResponse("PATH_TRAVERSAL", message, 400, undefined, corsHeaders);
      }
      return h.errResponse("BAD_INPUT", message, 400, undefined, corsHeaders);
    }
  }

  if (method === "GET" && url.pathname === "/api/cmo/content/media") {
    const fileQ = url.searchParams.get("path");
    if (!fileQ) return h.err("path query parameter is required", 400, corsHeaders);
    return serveProjectAsset(req, fileQ, corsHeaders, cwd, h);
  }

  if (
    method === "GET" &&
    (url.pathname === "/api/cmo/content/events" ||
      url.pathname === "/api/cmo/content/events/stream")
  ) {
    return globalEmitter.subscribe("*", corsHeaders);
  }

  if (method === "PATCH" && url.pathname === "/api/cmo/content/meta") {
    const body = await h.parseBody(req, CONTENT_META_PATCH_BODY);
    if (!body.ok) return body.res;
    const id = body.data.assetId ?? body.data.groupId ?? "";
    const ctrl = rejectControlChars(id, body.data.assetId ? "assetId" : "groupId");
    if (!ctrl.ok) return h.err(ctrl.message, 400, corsHeaders);
    if (h.isDryRun(url)) {
      return h.json(
        { ok: true, dryRun: true, data: { id, patch: body.data.patch } },
        200,
        corsHeaders,
      );
    }

    const meta = loadContentMeta(cwd);
    if (body.data.assetId) {
      meta.assets[body.data.assetId] = {
        ...(meta.assets[body.data.assetId] ?? {}),
        ...sanitizeContentAssetPatch(body.data.patch),
      };
    } else if (body.data.groupId) {
      meta.groups[body.data.groupId] = sanitizeContentGroupPatch(
        body.data.groupId,
        meta.groups[body.data.groupId],
        body.data.patch,
      );
    }
    const saved = writeContentMeta(meta, cwd);
    globalEmitter.publish("*", {
      type: "content-meta-changed",
      payload: {
        assetId: body.data.assetId ?? null,
        groupId: body.data.groupId ?? null,
      },
    });
    return h.json({ ok: true, data: saved }, 200, corsHeaders);
  }

  if (method === "POST" && url.pathname === "/api/cmo/content/reindex") {
    // Body is optional / empty — still parse when present for schema parity.
    void CONTENT_REINDEX_BODY;
    const manifest = buildContentManifest(cwd);
    if (!h.isDryRun(url)) {
      globalEmitter.publish("*", {
        type: "content-reindexed",
        payload: { total: manifest.stats.total, generatedAt: manifest.generatedAt },
      });
    }
    return h.json(
      { ok: true, data: manifest, dryRun: h.isDryRun(url) || undefined },
      200,
      corsHeaders,
    );
  }

  return null;
}
