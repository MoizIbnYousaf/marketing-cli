// tests/e2e/real-pipeline/lib/replay.ts
//
// replayOrCapture — three-mode fixture wrapper honoring HARNESS_LIVE /
// HARNESS_CAPTURE env vars.
//
// Per the maintainer's E1 contract:
// - HARNESS_LIVE=1 always hit the real API (do NOT update golden)
// - HARNESS_CAPTURE=1 always hit live AND write/refresh the golden
// - default replay from `fixtures/golden/<api>/<key>.json`
// if present and <24h old; skip with reason otherwise
//
// The "golden" fixture IS committed to the repo (path: fixtures/golden/).
// The "captured" fixture from lib/capture.ts is for ad-hoc debugging and
// stays gitignored at fixtures/captured/. Don't confuse them.
//
// Skip semantics: when default mode runs and no golden exists (or it has
// expired), replayOrCapture returns { kind: "skipped", reason }. Callers
// should use goldenAvailable() at describe() time so bun:test skips the
// block rather than running it to completion with nothing verified.

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const GOLDEN_DIR = join(import.meta.dir, "..", "fixtures", "golden");

/** Default golden-freshness window: 24 hours. Configurable per call. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type HarnessMode = "live" | "capture" | "replay";

export interface ReplayOptions {
 /** Logical API namespace. Used in the golden file path. e.g. "postiz". */
 readonly api: string;
 /** Stable key inside the namespace. Becomes the filename without .json. */
 readonly goldenKey: string;
 /** HTTP method — metadata only. */
 readonly method: string;
 /** Logical endpoint — metadata only. */
 readonly endpoint: string;
 /** Override the default 24h freshness window. */
 readonly ttlMs?: number;
 /** Override the harness mode. Default: resolveMode() from env. */
 readonly mode?: HarnessMode;
}

export interface GoldenFixture<T = unknown> {
 readonly api: string;
 readonly goldenKey: string;
 readonly method: string;
 readonly endpoint: string;
 readonly status: number;
 readonly body: T;
 readonly capturedAt: string;
 readonly ttlMs: number;
}

export type ReplayResult<T = unknown> =
 | { readonly kind: "live" | "captured" | "replayed"; readonly body: T; readonly status: number; readonly elapsedMs: number; readonly goldenPath: string }
 | { readonly kind: "skipped"; readonly reason: string; readonly goldenPath: string };

/** Resolve mode from env (caller can override via ReplayOptions.mode). */
export function resolveMode(): HarnessMode {
 if (process.env.HARNESS_CAPTURE === "1") return "capture";
 if (process.env.HARNESS_LIVE === "1") return "live";
 return "replay";
}

/** Path on disk where the golden for this key should live. */
export function goldenPathFor(api: string, key: string): string {
 return join(GOLDEN_DIR, api, `${key}.json`);
}

/** Synchronous check — is the golden file present AND within ttl? */
export function goldenAvailable(api: string, key: string, ttlMs = DEFAULT_TTL_MS): boolean {
 const p = goldenPathFor(api, key);
 if (!existsSync(p)) return false;
 try {
 // Read ttl from file contents, not mtime — the file may have been
 // git-checked-out recently but contains a capturedAt of 3 days ago.
 // Use readFileSync so goldenAvailable stays synchronous for use in
 // describe.skipIf() conditions.
 const raw = readFileSync(p, "utf-8");
 const fx = JSON.parse(raw) as GoldenFixture;
 const age = Date.now() - new Date(fx.capturedAt).getTime();
 return age < (fx.ttlMs ?? ttlMs);
 } catch {
 return false;
 }
}

/**
 * Three-mode fixture wrapper.
 *
 * @example
 * import { replayOrCapture } from "./lib/replay";
 *
 * const res = await replayOrCapture<PostizIntegration[]>(
 * { api: "postiz", goldenKey: "integrations", method: "GET", endpoint: "/public/v1/integrations" },
 * async () => fetch(`${base}/public/v1/integrations`, { headers: { Authorization: key } }),
 * );
 * if (res.kind === "skipped") return; // suite-level skip via describe.skipIf
 * expect(res.body).toHaveLength(N);
 */
export async function replayOrCapture<T = unknown>(
 options: ReplayOptions,
 liveFn: () => Promise<Response>,
): Promise<ReplayResult<T>> {
 const mode = options.mode ?? resolveMode();
 const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
 const goldenPath = goldenPathFor(options.api, options.goldenKey);

 // REPLAY MODE: try to read golden, skip if missing/expired.
 if (mode === "replay") {
 if (!existsSync(goldenPath)) {
 return {
 kind: "skipped",
 reason:
 `no golden fixture at ${goldenPath}. ` +
 `Run once with HARNESS_CAPTURE=1 to create it, or HARNESS_LIVE=1 to skip the golden entirely.`,
 goldenPath,
 };
 }
 try {
 const raw = await readFile(goldenPath, "utf-8");
 const fx = JSON.parse(raw) as GoldenFixture<T>;
 const age = Date.now() - new Date(fx.capturedAt).getTime();
 const effectiveTtl = fx.ttlMs ?? ttlMs;
 if (age >= effectiveTtl) {
 return {
 kind: "skipped",
 reason:
 `golden fixture at ${goldenPath} is stale (${Math.round(age / 1000 / 60)} minutes old; ttl ${Math.round(effectiveTtl / 1000 / 60)} minutes). ` +
 `Refresh with HARNESS_CAPTURE=1.`,
 goldenPath,
 };
 }
 return {
 kind: "replayed",
 body: fx.body,
 status: fx.status,
 elapsedMs: 0,
 goldenPath,
 };
 } catch (e) {
 return {
 kind: "skipped",
 reason: `golden fixture at ${goldenPath} is unreadable: ${e instanceof Error ? e.message : String(e)}`,
 goldenPath,
 };
 }
 }

 // LIVE + CAPTURE both hit the real API.
 const started = performance.now();
 const res = await liveFn();
 const elapsedMs = Math.round(performance.now() - started);
 const cloned = res.clone();
 const ct = cloned.headers.get("content-type") ?? "";
 const body: T = ct.includes("application/json")
 ? await cloned.json()
 : ((await cloned.text()) as unknown as T);

 if (mode === "capture") {
 const fixture: GoldenFixture<T> = {
 api: options.api,
 goldenKey: options.goldenKey,
 method: options.method,
 endpoint: options.endpoint,
 status: res.status,
 body,
 capturedAt: new Date().toISOString(),
 ttlMs,
 };
 await mkdir(dirname(goldenPath), { recursive: true });
 await writeFile(goldenPath, JSON.stringify(fixture, null, 2));
 return { kind: "captured", body, status: res.status, elapsedMs, goldenPath };
 }

 // LIVE — return without writing golden.
 return { kind: "live", body, status: res.status, elapsedMs, goldenPath };
}
