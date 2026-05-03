// lib/rate-limit-store.ts — pluggable rate-limit backends
//
// `lib/dx.ts → checkRateLimit` calls `incr(key, windowMs)` here and decides
// whether the request is over the configured ceiling. The store implementation
// is selectable at startup via `RATE_LIMIT_STORE`:
//
//   RATE_LIMIT_STORE=memory   (default — current behavior; per-process)
//   RATE_LIMIT_STORE=sqlite   (shared across processes that share the SQLite file)
//
// Both backends implement the same sliding-window semantics so the wire
// contract doesn't drift when you switch.
//
// Out of scope: Redis, memcached, Cloudflare KV. Add later if/when the studio
// ever clusters across machines.

import { execute, queryOne } from "./sqlite.ts";

// ─── Contract ───────────────────────────────────────────────────────────────

export interface IncrResult {
  /** Total hits inside the current sliding window, INCLUDING this hit. */
  count: number;
  /** Epoch ms of the oldest hit still inside the window — used for Retry-After. */
  oldestHitMs: number;
}

export interface RateLimitStore {
  readonly kind: "memory" | "sqlite";
  /**
   * Record a hit for `key` at `now` and return the live window stats.
   * Pruning of expired hits is the store's responsibility — callers don't
   * need to clean up anything.
   */
  incr(key: string, windowMs: number, now?: number): IncrResult;
  /** Drop all state. Test-only. */
  reset(): void;
  /**
   * True when the backend is currently degraded (e.g. SQLite write failed).
   * Returned to callers so they can attach an `X-Rate-Limit-Degraded: true`
   * header instead of dropping the request.
   */
  isDegraded(): boolean;
}

// ─── In-memory store (default) ──────────────────────────────────────────────

export class MemoryStore implements RateLimitStore {
  readonly kind = "memory" as const;
  private buckets = new Map<string, number[]>();

  incr(key: string, windowMs: number, now: number = Date.now()): IncrResult {
    const cutoff = now - windowMs;
    const fresh = (this.buckets.get(key) ?? []).filter((t) => t > cutoff);
    fresh.push(now);
    this.buckets.set(key, fresh);
    return { count: fresh.length, oldestHitMs: fresh[0] ?? now };
  }

  reset(): void {
    this.buckets.clear();
  }

  isDegraded(): boolean {
    return false;
  }
}

// ─── SQLite-backed store (opt-in) ───────────────────────────────────────────

export class SqliteStore implements RateLimitStore {
  readonly kind = "sqlite" as const;
  private degraded = false;

  incr(key: string, windowMs: number, now: number = Date.now()): IncrResult {
    const cutoff = now - windowMs;

    try {
      // Sliding window in three statements, run sequentially. SQLite serializes
      // writes per-connection so concurrent calls land in a defined order — no
      // explicit transaction needed for correctness on a single connection.
      execute("DELETE FROM rate_limits WHERE key = ? AND hit_at_ms <= ?", [
        key,
        cutoff,
      ]);
      execute("INSERT INTO rate_limits (key, hit_at_ms) VALUES (?, ?)", [
        key,
        now,
      ]);
      const row = queryOne<{ c: number; o: number | null }>(
        "SELECT COUNT(*) AS c, MIN(hit_at_ms) AS o FROM rate_limits WHERE key = ?",
        [key],
      );
      this.degraded = false;
      return {
        count: row?.c ?? 1,
        oldestHitMs: row?.o ?? now,
      };
    } catch (err) {
      // DB write failed (e.g. disk full, locked, schema drift). Mark degraded
      // and let the caller decide whether to deny or attach the
      // X-Rate-Limit-Degraded header. We return count=1 so the request goes
      // through — fail-open is the right call for local dev where a strict
      // fail-closed would brick the studio after one hiccup.
      this.degraded = true;
      console.warn("[rate-limit] SQLite store degraded:", err instanceof Error ? err.message : String(err));
      return { count: 1, oldestHitMs: now };
    }
  }

  reset(): void {
    try {
      execute("DELETE FROM rate_limits", []);
      this.degraded = false;
    } catch {
      this.degraded = true;
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _store: RateLimitStore | null = null;

/** Lazy singleton — picks the implementation per `RATE_LIMIT_STORE` env. */
export function getRateLimitStore(): RateLimitStore {
  if (_store) return _store;
  const choice = (process.env.RATE_LIMIT_STORE ?? "memory").toLowerCase();
  _store = choice === "sqlite" ? new SqliteStore() : new MemoryStore();
  return _store;
}

/** Test-only: install a specific store instance. */
export function _setRateLimitStoreForTests(store: RateLimitStore): void {
  _store = store;
}

/** Test-only: reset to the env-driven default. */
export function _resetRateLimitStoreForTests(): void {
  _store = null;
}
