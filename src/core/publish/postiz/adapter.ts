// mktg — Postiz publish adapter loop (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

import { join } from "node:path";
import { writeStdout } from "../../output";
import { type AdapterResult, type PublishItem } from "../types";
import { mapPostizError, postizFetch } from "./client";
import { loadSentMarker, persistSentMarker, sentMarkerKey } from "./markers";
import { extractMediaInputs, uploadPostizMedia } from "./media";
import { type CreatePostDto, type PostizIntegration, type PostizMedia } from "./types";

const buildCreatePostDraft = (
  content: string,
  resolved: readonly { readonly provider: string; readonly id: string }[],
  media: readonly PostizMedia[] = [],
): CreatePostDto => ({
  type: "draft",
  shortLink: false,
  date: new Date().toISOString(),
  tags: [],
  posts: resolved.map(({ id }) => ({
    integration: { id },
    value: [{ content, image: media }],
  })),
});

// Defensively read item.metadata.providers across current-narrow and
// future-wide types. Validates at runtime so the adapter works regardless
// of the PublishItem.metadata type promotion in src/types.ts.
const extractProviders = (item: PublishItem): { ok: true; providers: readonly string[] } | { ok: false; detail: string } => {
  const meta = (item as { metadata?: Record<string, unknown> }).metadata;
  if (!meta || typeof meta !== "object") {
    return { ok: false, detail: "Missing item.metadata.providers[] — add at least one postiz identifier (e.g., \"linkedin\", \"bluesky\")" };
  }
  const providers = (meta as Record<string, unknown>).providers;
  if (!Array.isArray(providers) || providers.length === 0) {
    return { ok: false, detail: "Missing item.metadata.providers[] — add at least one postiz identifier (e.g., \"linkedin\", \"bluesky\")" };
  }
  if (!providers.every((p) => typeof p === "string")) {
    return { ok: false, detail: "item.metadata.providers[] must contain only strings (postiz identifiers)" };
  }
  return { ok: true, providers: providers as readonly string[] };
};

// Spec §3. Two-step flow: resolve via GET /integrations → POST /posts per item.
type PublishPostizInput = {
  readonly campaign: string;
  readonly items: readonly PublishItem[];
  readonly confirm: boolean;
  readonly cwd: string;
  readonly ndjson: boolean;
};

export const publishPostiz = async (inp: PublishPostizInput): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  const buildFailAll = (detail: string): AdapterResult => ({
    adapter: "postiz",
    items: inp.items.length,
    published: 0,
    failed: inp.items.length,
    errors: Array(inp.items.length).fill(detail),
    results: inp.items.map((_, i) => ({ item: i, status: "failed" as const, detail })),
  });

  const markerPath = join(inp.cwd, ".mktg", "publish", `${inp.campaign}-postiz.json`);
  const marker = await loadSentMarker(markerPath, inp.campaign);

  const listRes = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!listRes.ok) {
    return buildFailAll(mapPostizError(listRes.error));
  }

  const identifierToId = new Map<string, string>();
  for (const int of listRes.data) {
    if (!int.disabled) identifierToId.set(int.identifier, int.id);
  }

  let published = 0;
  let failed = 0;
  let hardStop = false;

  for (let i = 0; i < inp.items.length; i++) {
    if (hardStop) {
      results.push({ item: i, status: "skipped", detail: "Skipped — prior item failed with hard-stop error" });
      continue;
    }
    const item = inp.items[i]!;

    const extracted = extractProviders(item);
    if (!extracted.ok) {
      results.push({ item: i, status: "failed", detail: extracted.detail });
      failed++;
      continue;
    }
    const providers = extracted.providers;

    const resolved: { provider: string; id: string }[] = [];
    const unconnected: string[] = [];
    for (const provider of providers) {
      const id = identifierToId.get(provider);
      if (id) resolved.push({ provider, id });
      else unconnected.push(provider);
    }

    if (unconnected.length > 0) {
      const connected = Array.from(identifierToId.keys()).sort();
      results.push({
        item: i,
        status: "failed",
        detail: `Unconnected provider(s): ${unconnected.join(", ")}. Connected: ${connected.join(", ") || "(none)"}. Connect in the postiz UI first.`,
      });
      failed++;
      continue;
    }

    if (!inp.confirm) {
      const mediaInputs = extractMediaInputs(item);
      const mediaDetail = mediaInputs.paths.length + mediaInputs.urls.length > 0
        ? ` with ${mediaInputs.paths.length + mediaInputs.urls.length} media upload(s)`
        : "";
      results.push({ item: i, status: "skipped", detail: `[dry-run] would draft to: ${providers.join(", ")}${mediaDetail}` });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped" }));
      continue;
    }

    const key = sentMarkerKey(inp.campaign, item.content, resolved.map((r) => r.id));
    if (marker.sent[key]) {
      results.push({ item: i, status: "skipped", detail: "already-sent (sent-marker hit)" });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped", reason: "already-sent" }));
      continue;
    }

    const uploaded = await uploadPostizMedia(item, inp.cwd);
    if (!uploaded.ok) {
      results.push({ item: i, status: "failed", detail: uploaded.detail });
      failed++;
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail: uploaded.detail }));
      if (uploaded.hardStop) hardStop = true;
      continue;
    }

    const body = buildCreatePostDraft(item.content, resolved, uploaded.media) as unknown as Record<string, unknown>;
    const postRes = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body });
    if (!postRes.ok) {
      const detail = mapPostizError(postRes.error);
      results.push({ item: i, status: "failed", detail });
      failed++;
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail }));
      if (postRes.error.kind === "rate-limited" || postRes.error.kind === "subscription-required" || postRes.error.kind === "auth-missing" || postRes.error.kind === "auth-invalid") {
        hardStop = true;
      }
      continue;
    }

    marker.sent[key] = { postedAt: new Date().toISOString(), providers: [...providers] };
    if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "draft-external", providers }));
    // The v1 postiz adapter only creates drafts (buildCreatePostDraft) —
    // postiz itself owns any later scheduling/sending.
    results.push({ item: i, status: "draft-external", detail: `draft on postiz → ${providers.join(", ")}` });
    published++;
  }

  // Best-effort persist — never crash if disk write fails.
  await persistSentMarker(markerPath, marker).catch((e) => {
    writeStdout(JSON.stringify({ type: "postiz-sent-marker-write-failed", path: markerPath, detail: e instanceof Error ? e.message : String(e) }));
  });

  return {
    adapter: "postiz",
    items: inp.items.length,
    published,
    failed,
    errors: results.filter((r) => r.status === "failed").map((r) => r.detail),
    results,
  };
};
