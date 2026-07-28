// Shared helpers for route modules extracted from server.ts.
// Prefer lib/* for DX/auth/validators; keep only tiny local utilities here.

/** Parse JSON or return `fallback` on any parse failure. */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
