// mktg — Postiz sent-marker idempotency (spec §5)

import { createHash } from "node:crypto";
import { join } from "node:path";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { writeStdout } from "../../output";
import { type PostizSentMarker } from "./types";

// Spec §5.2. Stable hash across runs: campaign + content + sorted(integration_ids).
// Double-delimiter prevents field smuggling via "||" in content.
export const sentMarkerKey = (campaign: string, content: string, integrationIds: readonly string[]): string => {
  const ids = [...integrationIds].sort().join("|");
  const buf = `${campaign}||${content}||${ids}`;
  return createHash("sha256").update(buf).digest("hex");
};

const emptySentMarker = (campaign: string): PostizSentMarker => ({
  version: 1,
  campaign,
  catalog: "postiz",
  sent: {},
});

const isPostizSentMarker = (v: unknown): v is PostizSentMarker => {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  if (m.version !== 1) return false;
  if (typeof m.campaign !== "string") return false;
  if (m.catalog !== "postiz") return false;
  if (!m.sent || typeof m.sent !== "object" || Array.isArray(m.sent)) return false;
  for (const entry of Object.values(m.sent as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.postedAt !== "string") return false;
    if (!Array.isArray(e.providers) || !e.providers.every((p) => typeof p === "string")) return false;
  }
  return true;
};

const archiveCorrupt = async (path: string): Promise<void> => {
  const iso = new Date().toISOString().replace(/:/g, "-");
  const corruptPath = path.replace(/\.json$/, `.corrupt.${iso}.json`);
  try { await rename(path, corruptPath); } catch { /* best-effort */ }
};

export const loadSentMarker = async (path: string, campaign: string): Promise<PostizSentMarker> => {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return emptySentMarker(campaign);
    const raw = await file.text();
    const parsed = JSON.parse(raw) as unknown;
    if (!isPostizSentMarker(parsed)) {
      await archiveCorrupt(path);
      writeStdout(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: "shape mismatch" }));
      return emptySentMarker(campaign);
    }
    // If campaign doesn't match the on-disk file, start fresh (prevents cross-campaign replay).
    if (parsed.campaign !== campaign) return emptySentMarker(campaign);
    return parsed;
  } catch (e) {
    await archiveCorrupt(path);
    writeStdout(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: e instanceof Error ? e.message : String(e) }));
    return emptySentMarker(campaign);
  }
};

export const persistSentMarker = async (path: string, marker: PostizSentMarker): Promise<void> => {
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(marker, null, 2));
  await rename(tmp, path);
};
