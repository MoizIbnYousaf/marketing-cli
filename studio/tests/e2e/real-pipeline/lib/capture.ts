// tests/e2e/real-pipeline/lib/capture.ts
//
// captureApiResponse — write a timestamped fixture to fixtures/captured/.
//
// These captures are regression artifacts. If a test fails because an external
// API changed its response shape, the captured blob is the evidence. Keeps
// a parallel-test-safe write (per-call filename with ISO timestamp).
//
// Honors the CAPTURE_FIXTURES env var — "false" disables writes for faster
// local iteration. Default is enabled.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CAPTURED_DIR = join(import.meta.dir, "..", "fixtures", "captured");

/** Slugify an endpoint path for use in filenames. */
const slug = (s: string): string =>
  s
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

/** ISO timestamp with colons replaced (filesystem-safe on all OSes). */
const isoSafe = (): string => new Date().toISOString().replace(/[:.]/g, "-");

export interface CapturedResponse<T = unknown> {
  readonly api: string;
  readonly endpoint: string;
  readonly method: string;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: T;
  readonly capturedAt: string;
  readonly elapsedMs: number;
}

export interface CaptureOptions {
  /** e.g. "postiz", "resend", "studio" — becomes the filename prefix. */
  readonly api: string;
  /** e.g. "/public/v1/integrations" — slugified into the filename. */
  readonly endpoint: string;
  /** HTTP verb for metadata. */
  readonly method: string;
  /** Override CAPTURE_FIXTURES env var for this call. */
  readonly force?: boolean;
}

/**
 * Call `fn` (which performs the real HTTP request), capture the full response
 * to disk, and return the parsed body plus the captured envelope.
 *
 * The callback receives nothing — you close over the fetch call yourself.
 * This keeps fetch signatures loose (headers, auth, bodies vary per API).
 *
 * @example
 *   const { body, captured } = await captureApiResponse(
 *     { api: "postiz", endpoint: "/public/v1/integrations", method: "GET" },
 *     async () => fetch(`${base}/public/v1/integrations`, { headers: { Authorization: key } })
 *   );
 */
export async function captureApiResponse<T = unknown>(
  options: CaptureOptions,
  fn: () => Promise<Response>,
): Promise<{ body: T; captured: CapturedResponse<T> }> {
  const started = performance.now();
  const res = await fn();
  const elapsedMs = Math.round(performance.now() - started);

  // Clone so the caller can still consume the original Response.
  const cloned = res.clone();
  const contentType = cloned.headers.get("content-type") ?? "";
  const body: T = contentType.includes("application/json")
    ? await cloned.json()
    : ((await cloned.text()) as unknown as T);

  const headers: Record<string, string> = {};
  for (const [k, v] of res.headers.entries()) headers[k] = v;

  const captured: CapturedResponse<T> = {
    api: options.api,
    endpoint: options.endpoint,
    method: options.method,
    status: res.status,
    headers,
    body,
    capturedAt: new Date().toISOString(),
    elapsedMs,
  };

  const captureEnabled =
    options.force ?? (process.env.CAPTURE_FIXTURES ?? "true") !== "false";

  if (captureEnabled) {
    await mkdir(CAPTURED_DIR, { recursive: true });
    const filename = `${slug(options.api)}-${slug(options.endpoint)}-${isoSafe()}.json`;
    await writeFile(join(CAPTURED_DIR, filename), JSON.stringify(captured, null, 2));
  }

  return { body, captured };
}
