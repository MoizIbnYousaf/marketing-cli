// lib/logger.ts -- structured access logger
//
// One JSON line per request, written to stderr. Consumed by
// log shippers, tail -f, or a test spy. Deliberately tiny -- no deps,
// no colors, no formatting.

export interface AccessLogLine {
  ts: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  ip?: string;
  ua?: string;
}

/**
 * Emit one structured access log line to stderr.
 * Safe for parallel writes -- each line is a self-contained JSON object.
 */
export function logAccess(req: Request, status: number, durationMs: number): void {
  const url = new URL(req.url);
  const line: AccessLogLine = {
    ts: new Date().toISOString(),
    method: req.method,
    path: url.pathname + (url.search || ""),
    status,
    ms: Math.round(durationMs),
  };

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  if (ip) line.ip = ip;

  const ua = req.headers.get("user-agent");
  if (ua) line.ua = ua;

  process.stderr.write(JSON.stringify(line) + "\n");
}

/**
 * Wrap a fetch handler with automatic access logging.
 * The wrapped handler times itself and emits one line per request.
 */
export function withAccessLog(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const started = performance.now();
    const res = await handler(req);
    logAccess(req, res.status, performance.now() - started);
    return res;
  };
}
