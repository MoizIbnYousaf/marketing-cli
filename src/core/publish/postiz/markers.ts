// mktg — Postiz sent-marker idempotency (spec §5)

import { createHash, randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { mkdir, open, readFile, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { type PostizSentMarker } from "./types";

// Spec §5.2. Stable hash across runs: campaign + content + sorted(integration_ids).
// Double-delimiter prevents field smuggling via "||" in content.
export const sentMarkerKey = (campaign: string, content: string, integrationIds: readonly string[]): string => {
  const ids = [...integrationIds].sort().join("|");
  const buf = `${campaign}||${content}||${ids}`;
  return createHash("sha256").update(buf).digest("hex");
};

export const emptySentMarker = (campaign: string): PostizSentMarker => ({
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
    if (e.state !== undefined && e.state !== "pending") return false;
  }
  return true;
};

export type SentMarkerRead =
  | { readonly state: "missing" | "present"; readonly marker: PostizSentMarker }
  | { readonly state: "corrupt"; readonly marker: null; readonly detail: string };

/**
 * Read the sent-marker without changing anything. A corrupt file is reported,
 * never archived or replaced: it may record posts Postiz already has, so the
 * caller must refuse to send rather than start from an empty marker.
 */
export const readSentMarker = async (path: string, campaign: string): Promise<SentMarkerRead> => {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { state: "missing", marker: emptySentMarker(campaign) };
    return { state: "corrupt", marker: null, detail: e instanceof Error ? e.message : String(e) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { state: "corrupt", marker: null, detail: e instanceof Error ? e.message : String(e) };
  }
  if (!isPostizSentMarker(parsed)) return { state: "corrupt", marker: null, detail: "shape mismatch" };
  // If campaign doesn't match the on-disk file, start fresh (prevents cross-campaign replay).
  if (parsed.campaign !== campaign) return { state: "present", marker: emptySentMarker(campaign) };
  return { state: "present", marker: parsed };
};

/** Write the whole marker atomically: a temp file unique to this process, then rename. */
export const persistSentMarker = async (path: string, marker: PostizSentMarker): Promise<void> => {
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(marker, null, 2));
    await rename(tmp, path);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
};

export type MarkerLock =
  | { readonly ok: true; readonly release: () => Promise<void> }
  | { readonly ok: false; readonly detail: string };

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

const tryCreateLock = async (lockPath: string): Promise<boolean> => {
  try {
    const handle = await open(lockPath, "wx");
    try { await handle.writeFile(String(process.pid)); } finally { await handle.close(); }
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw e;
  }
};

/**
 * Hold `<marker>.lock` (O_EXCL) for a confirmed run, so two runs on the same
 * campaign cannot both create every item. A lock left by a process that no
 * longer exists is taken over. Directories this call created are removed again
 * on release when they are empty, so a run that sends nothing leaves nothing.
 */
export const acquireMarkerLock = async (markerPath: string): Promise<MarkerLock> => {
  const lockPath = `${markerPath}.lock`;
  const dir = dirname(markerPath);
  let created: string | undefined;
  try {
    created = await mkdir(dir, { recursive: true });
    let acquired = await tryCreateLock(lockPath);
    if (!acquired) {
      const holder = Number.parseInt((await readFile(lockPath, "utf8").catch(() => "")).trim(), 10);
      if (Number.isInteger(holder) && holder > 0 && !isAlive(holder)) {
        await unlink(lockPath).catch(() => {});
        acquired = await tryCreateLock(lockPath);
      }
      if (!acquired) {
        return {
          ok: false,
          detail: `Another mktg publish run${Number.isInteger(holder) && holder > 0 ? ` (pid ${holder})` : ""} is sending this campaign to Postiz (lock ${lockPath}). Nothing was sent. Wait for it to finish; if no run is active, delete the lock file and re-run.`,
        };
      }
    }
  } catch (e) {
    return { ok: false, detail: `Could not lock the sent-marker (${lockPath}): ${e instanceof Error ? e.message : String(e)}. Nothing was sent.` };
  }
  return {
    ok: true,
    release: async () => {
      await unlink(lockPath).catch(() => {});
      if (created === undefined) return;
      // Remove the directories this run created, deepest first, if still empty.
      for (let d = dir; d.length >= created.length; d = dirname(d)) {
        try { await rmdir(d); } catch { break; }
        if (d === created) break;
      }
    },
  };
};

/** Remove the marker file (a run that created it and recorded nothing in it). */
export const removeSentMarker = async (path: string): Promise<void> => {
  await unlink(path).catch(() => {});
};
