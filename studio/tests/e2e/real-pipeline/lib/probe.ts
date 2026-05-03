// tests/e2e/real-pipeline/lib/probe.ts
//
// probeHealthUntilReady — poll a URL until it returns 2xx, or throw on timeout.
//
// Used by setup.ts to wait for a spawned server before letting tests fire.
// Used by individual suites that want to assert a studio instance is alive
// before sending side-effecting POSTs.
//
// Design contract (Agent DX 21/21):
//  - Returns a structured result, not a boolean.
//  - Surfaces the last error so a failing probe produces a diagnosable envelope.
//  - Capped retry budget — refuses to poll forever.

export type ProbeResult =
  | { readonly ok: true; readonly elapsedMs: number; readonly attempts: number; readonly status: number }
  | { readonly ok: false; readonly elapsedMs: number; readonly attempts: number; readonly lastError: string };

export interface ProbeOptions {
  /** Max wall-clock time before giving up. Default 15_000 ms. */
  readonly timeoutMs?: number;
  /** Sleep between attempts. Default 100 ms. */
  readonly intervalMs?: number;
  /**
   * Status-code predicate. Default: 200–499 counts as "reachable"; we want
   * to know the process is up even if the health route returns 404 (though
   * the mktg-studio server returns 200).
   */
  readonly accept?: (status: number) => boolean;
  /** Fetch timeout for each individual attempt. Default 1_000 ms. */
  readonly requestTimeoutMs?: number;
}

const DEFAULTS: Required<ProbeOptions> = {
  timeoutMs: 15_000,
  intervalMs: 100,
  accept: (s) => s >= 200 && s < 500,
  requestTimeoutMs: 1_000,
};

/**
 * Poll `url` until it responds OR `timeoutMs` elapses.
 *
 * @example
 *   const res = await probeHealthUntilReady("http://127.0.0.1:31801/api/health");
 *   if (!res.ok) throw new Error(`server never came up: ${res.lastError}`);
 */
export async function probeHealthUntilReady(
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  const opts = { ...DEFAULTS, ...options };
  const start = performance.now();
  let attempts = 0;
  let lastError = "never attempted";

  while (performance.now() - start < opts.timeoutMs) {
    attempts++;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.requestTimeoutMs);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (opts.accept(res.status)) {
        return {
          ok: true,
          elapsedMs: Math.round(performance.now() - start),
          attempts,
          status: res.status,
        };
      }
      lastError = `status ${res.status} rejected by accept predicate`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await Bun.sleep(opts.intervalMs);
  }

  return {
    ok: false,
    elapsedMs: Math.round(performance.now() - start),
    attempts,
    lastError,
  };
}
