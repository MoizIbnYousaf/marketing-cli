// tests/e2e/real-pipeline/lib/env.ts
//
// requireEnv — harness-level env gate with structured skip-with-reason.
//
// Suites use this at top of file to declare what env vars they need; the
// returned { ok, values, missing } result plugs directly into bun:test's
// test.skipIf() idiom, so a missing key produces a clean skip rather than
// a mysterious failure mid-test.
//
// Per the maintainer's E1 contract: "refuses to boot if any of its suite's
// required env vars are missing. The error should be a skip-with-reason,
// not a test failure — so CI without keys silently passes the runnable
// subset."

export type RequireEnvResult =
 | { readonly ok: true; readonly values: Readonly<Record<string, string>> }
 | {
 readonly ok: false;
 readonly skip: true;
 readonly reason: string;
 readonly missing: readonly string[];
 };

/**
 * Check that every listed env var is set and non-empty. Returns a
 * structured result:
 * - { ok: true, values } — every key present; `values` is a frozen map.
 * - { ok: false, skip: true, reason, missing } — at least one missing;
 * suite should skip.
 *
 * @example
 * import { requireEnv } from "./lib/env";
 *
 * const env = requireEnv(["POSTIZ_API_KEY", "POSTIZ_API_BASE"]);
 *
 * describe.skipIf(!env.ok)("postiz live coverage", () => {
 * test("GET /public/v1/integrations returns the declared shape", async () => {
 * if (!env.ok) return; // type-narrow for TS
 * const res = await fetch(`${env.values.POSTIZ_API_BASE}/public/v1/integrations`, {
 * headers: { Authorization: env.values.POSTIZ_API_KEY },
 * });
 * // ...
 * });
 * });
 *
 * Empty string counts as missing — a .env file with `POSTIZ_API_KEY=`
 * (blank value) should skip, not surface a 401 mid-test.
 */
export function requireEnv(keys: readonly string[]): RequireEnvResult {
 const missing: string[] = [];
 const values: Record<string, string> = {};

 for (const key of keys) {
 const v = process.env[key];
 if (v === undefined || v === "") {
 missing.push(key);
 } else {
 values[key] = v;
 }
 }

 if (missing.length > 0) {
 const reason = `missing env: ${missing.join(", ")}. ` +
 `Copy .env.test.example to .env.test and fill in real test-account values, ` +
 `then run with \`bun --env-file=.env.test test ...\`.`;
 return { ok: false, skip: true, reason, missing };
 }

 return { ok: true, values: Object.freeze(values) };
}
