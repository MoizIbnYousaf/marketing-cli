// mktg — Postiz publish adapter loop (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

import { createHash } from "node:crypto";
import { join } from "node:path";
import { writeStdout } from "../../output";
import { type AdapterResult, type PublishItem, allFailedCounts, tallyResults } from "../types";
import { mapPostizError, postizFetch } from "./client";
import { acquireMarkerLock, persistSentMarker, readSentMarker, removeSentMarker, sentMarkerKey } from "./markers";
import { extractMediaInputs, uploadPostizMedia } from "./media";
import { type CreatePostDto, type PostizIntegration, type PostizMedia, type PostizSentMarker } from "./types";

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
// of the PublishItem.metadata type promotion in src/core/publish/types.ts.
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

type ItemResult = AdapterResult["results"][number];

const withoutEntry = (marker: PostizSentMarker, key: string): PostizSentMarker => {
  const { [key]: _dropped, ...rest } = marker.sent;
  return { ...marker, sent: rest };
};

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const unconfirmedDetail = (markerPath: string, key: string, postedAt: string): string =>
  `Unconfirmed: a previous run sent this item to Postiz at ${postedAt} but did not record Postiz's answer. ` +
  `Check Postiz for the draft before re-sending; to send it again, remove entry ${key} from ${markerPath}.`;

export const publishPostiz = async (inp: PublishPostizInput): Promise<AdapterResult> => {
  const campaignFilePart = /^[a-z0-9][a-z0-9._-]{0,127}$/.test(inp.campaign)
    ? inp.campaign
    : `campaign-${createHash("sha256").update(inp.campaign).digest("hex").slice(0, 16)}`;
  const markerPath = join(inp.cwd, ".mktg", "publish", `${campaignFilePart}-postiz.json`);

  // A confirmed run holds the campaign's marker lock for its whole length, so
  // a second run on the same campaign cannot create the same items. A dry run
  // takes no lock and writes nothing.
  if (!inp.confirm) return runPostiz(inp, markerPath);
  const lock = await acquireMarkerLock(markerPath);
  if (!lock.ok) return failAll(inp, lock.detail);
  try {
    return await runPostiz(inp, markerPath);
  } finally {
    await lock.release();
  }
};

const failAll = (inp: PublishPostizInput, detail: string): AdapterResult => {
  if (inp.ndjson) {
    for (let i = 0; i < inp.items.length; i++) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail }));
  }
  return {
    adapter: "postiz",
    items: inp.items.length,
    ...allFailedCounts(inp.items.length),
    errors: Array(inp.items.length).fill(detail),
    results: inp.items.map((_, i) => ({ item: i, status: "failed" as const, detail })),
  };
};

const runPostiz = async (inp: PublishPostizInput, markerPath: string): Promise<AdapterResult> => {
  const results: ItemResult[] = [];
  const fail = (item: number, detail: string): void => {
    results.push({ item, status: "failed", detail });
    if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item, status: "failed", detail }));
  };

  // Read only. A corrupt marker may record posts Postiz already has: refuse
  // to send rather than start from an empty marker and create them all again.
  const read = await readSentMarker(markerPath, inp.campaign);
  if (read.state === "corrupt") {
    return failAll(
      inp,
      `The Postiz sent-marker ${markerPath} is unreadable (${read.detail}). It may record posts Postiz already created, so nothing is sent. ` +
        "Inspect it, then move it aside to start over (every item is then sent again).",
    );
  }
  let marker = read.marker;
  const markerExisted = read.state === "present";

  const listRes = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!listRes.ok) {
    return failAll(inp, mapPostizError(listRes.error));
  }

  // Creates go only to the base that answered this GET (self-host: <base>/api).
  const provenBase = listRes.base;
  const identifierToId = new Map<string, string>();
  for (const int of listRes.data) {
    if (!int.disabled) identifierToId.set(int.identifier, int.id);
  }

  let hardStop = false;

  for (let i = 0; i < inp.items.length; i++) {
    if (hardStop) {
      results.push({ item: i, status: "skipped", detail: "Skipped — prior item failed with hard-stop error" });
      continue;
    }
    const item = inp.items[i]!;

    const extracted = extractProviders(item);
    if (!extracted.ok) {
      fail(i, extracted.detail);
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
      fail(i, `Unconnected provider(s): ${unconnected.join(", ")}. Connected: ${connected.join(", ") || "(none)"}. Connect in the postiz UI first.`);
      continue;
    }

    const key = sentMarkerKey(inp.campaign, item.content, resolved.map((r) => r.id));
    const entry = marker.sent[key];
    if (entry?.state === "pending") {
      fail(i, unconfirmedDetail(markerPath, key, entry.postedAt));
      continue;
    }

    if (!inp.confirm) {
      const mediaInputs = extractMediaInputs(item);
      const mediaDetail = mediaInputs.paths.length + mediaInputs.urls.length > 0
        ? ` with ${mediaInputs.paths.length + mediaInputs.urls.length} media upload(s)`
        : "";
      const detail = entry
        ? `[dry-run] already-sent (sent-marker hit); would skip`
        : `[dry-run] would draft to: ${providers.join(", ")}${mediaDetail}`;
      results.push({ item: i, status: "skipped", detail });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped" }));
      continue;
    }

    if (entry) {
      results.push({ item: i, status: "skipped", detail: "already-sent (sent-marker hit)" });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped", reason: "already-sent" }));
      continue;
    }

    const uploaded = await uploadPostizMedia(item, inp.cwd, provenBase);
    if (!uploaded.ok) {
      fail(i, uploaded.detail);
      if (uploaded.hardStop) hardStop = true;
      continue;
    }

    // Record the item as pending BEFORE the create is sent, atomically. A run
    // killed while the request is in flight leaves it pending, and the resumed
    // run reports it unconfirmed instead of creating it a second time. If the
    // marker cannot be written, nothing is sent: an unrecorded create could
    // not be skipped on the next run.
    const pending: PostizSentMarker = { ...marker, sent: { ...marker.sent, [key]: { postedAt: new Date().toISOString(), providers: [...providers], state: "pending" } } };
    try {
      await persistSentMarker(markerPath, pending);
    } catch (e) {
      fail(i, `Could not write the sent-marker ${markerPath} (${errorText(e)}); nothing was sent for this item. Make the folder writable and re-run.`);
      hardStop = true;
      continue;
    }
    marker = pending;

    const body = buildCreatePostDraft(item.content, resolved, uploaded.media) as unknown as Record<string, unknown>;
    const postRes = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body, ...(provenBase ? { base: provenBase } : {}) });
    if (!postRes.ok) {
      // A 2xx whose body is not JSON most likely created the post: keep the
      // pending entry so a re-run does not create it again.
      if (postRes.status !== null && postRes.status >= 200 && postRes.status < 300) {
        fail(
          i,
          `Postiz answered HTTP ${postRes.status} with a body that is not JSON, so the draft is not confirmed — check Postiz before re-sending. ` +
            `It is recorded as unconfirmed in ${markerPath}, so a re-run will not send it again.`,
        );
        continue;
      }
      // Rejected: nothing was created. Drop the pending entry; a marker this
      // run created that would now be empty is removed.
      marker = withoutEntry(marker, key);
      let detail = mapPostizError(postRes.error);
      try {
        if (!markerExisted && Object.keys(marker.sent).length === 0) await removeSentMarker(markerPath);
        else await persistSentMarker(markerPath, marker);
      } catch (e) {
        detail += ` The pending entry could not be removed from ${markerPath} (${errorText(e)}); a re-run will report this item unconfirmed.`;
      }
      fail(i, detail);
      if (postRes.error.kind === "rate-limited" || postRes.error.kind === "subscription-required" || postRes.error.kind === "auth-missing" || postRes.error.kind === "auth-invalid") {
        hardStop = true;
      }
      continue;
    }

    // Accepted: record it as sent, atomically, before the next request.
    marker = { ...marker, sent: { ...marker.sent, [key]: { postedAt: new Date().toISOString(), providers: [...providers] } } };
    let note = "";
    try {
      await persistSentMarker(markerPath, marker);
    } catch (e) {
      note = `; the sent-marker could not record the acceptance (${errorText(e)}), so a re-run will report this item unconfirmed rather than send it again`;
    }
    if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "draft-external", providers }));
    // The v1 postiz adapter only creates drafts (buildCreatePostDraft) —
    // postiz itself owns any later scheduling/sending.
    results.push({ item: i, status: "draft-external", detail: `draft on postiz → ${providers.join(", ")}${note}` });
  }

  return {
    adapter: "postiz",
    items: inp.items.length,
    ...tallyResults(results),
    errors: results.filter((r) => r.status === "failed").map((r) => r.detail),
    results,
  };
};
