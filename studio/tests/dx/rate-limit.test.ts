// tests/dx/rate-limit.test.ts — both stores must satisfy the same contract.
//
// One test suite, two backends. The MemoryStore runs entirely in process;
// the SqliteStore writes to the project DB but uses a per-test key prefix
// so it doesn't collide with other tests using the rate_limits table.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  MemoryStore,
  SqliteStore,
  type RateLimitStore,
  _setRateLimitStoreForTests,
  _resetRateLimitStoreForTests,
  getRateLimitStore,
} from "../../lib/rate-limit-store.ts";
import { execute } from "../../lib/sqlite.ts";

// ─── Shared contract ────────────────────────────────────────────────────────

function runStoreContract(name: string, makeStore: () => RateLimitStore) {
  describe(`RateLimitStore contract — ${name}`, () => {
    let store: RateLimitStore;
    let key: string;

    beforeEach(() => {
      store = makeStore();
      // Every test gets a unique key so the SQLite store doesn't cross-contaminate.
      key = `__test_${name}_${Math.random().toString(36).slice(2, 8)}`;
    });

    afterEach(() => {
      // Clean up SQLite rows for this key
      try {
        execute("DELETE FROM rate_limits WHERE key LIKE ?", [`__test_${name}_%`]);
      } catch {
        // memory store has no DB
      }
    });

    test("first hit returns count=1", () => {
      const r = store.incr(key, 60_000, 1_000);
      expect(r.count).toBe(1);
      expect(r.oldestHitMs).toBe(1_000);
    });

    test("repeated hits within the window grow the count monotonically", () => {
      const a = store.incr(key, 60_000, 1_000);
      const b = store.incr(key, 60_000, 2_000);
      const c = store.incr(key, 60_000, 3_000);
      expect(a.count).toBe(1);
      expect(b.count).toBe(2);
      expect(c.count).toBe(3);
      expect(c.oldestHitMs).toBe(1_000);
    });

    test("hits older than `windowMs` are pruned", () => {
      // Window is 1 second. now-t < windowMs, so the t=600 hit survives at t=1500
      // (now-t = 900 < 1000) but t=0 is gone (now-t = 1500 ≥ 1000).
      store.incr(key, 1_000, 0);
      store.incr(key, 1_000, 600);
      const r = store.incr(key, 1_000, 1_500);
      expect(r.count).toBe(2);
      expect(r.oldestHitMs).toBe(600);
    });

    test("after the full window passes, the count resets to 1", () => {
      store.incr(key, 1_000, 0);
      store.incr(key, 1_000, 500);
      // 2 seconds later — all earlier hits are gone.
      const r = store.incr(key, 1_000, 2_000);
      expect(r.count).toBe(1);
      expect(r.oldestHitMs).toBe(2_000);
    });

    test("60/minute ceiling — 61st hit crosses the threshold", () => {
      let last = { count: 0, oldestHitMs: 0 };
      for (let i = 0; i < 60; i++) {
        last = store.incr(key, 60_000, 1_000 + i);
      }
      expect(last.count).toBe(60);

      const overflow = store.incr(key, 60_000, 1_100);
      expect(overflow.count).toBe(61);
      expect(overflow.oldestHitMs).toBe(1_000);
    });

    test("different keys don't bleed into each other", () => {
      store.incr(`${key}-A`, 60_000, 1_000);
      store.incr(`${key}-A`, 60_000, 2_000);
      const b = store.incr(`${key}-B`, 60_000, 3_000);
      expect(b.count).toBe(1);
    });

    test("reset() drops state", () => {
      store.incr(key, 60_000, 1_000);
      store.incr(key, 60_000, 2_000);
      store.reset();
      const after = store.incr(key, 60_000, 3_000);
      expect(after.count).toBe(1);
    });

    test("isDegraded() defaults to false on healthy backend", () => {
      store.incr(key, 60_000, 1_000);
      expect(store.isDegraded()).toBe(false);
    });
  });
}

// ─── Run contract for both backends ─────────────────────────────────────────

runStoreContract("MemoryStore", () => new MemoryStore());
runStoreContract("SqliteStore", () => new SqliteStore());

// ─── Factory selection ──────────────────────────────────────────────────────

describe("getRateLimitStore() factory", () => {
  afterEach(() => {
    _resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_STORE;
  });

  test("defaults to MemoryStore when env unset", () => {
    _resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_STORE;
    const s = getRateLimitStore();
    expect(s.kind).toBe("memory");
  });

  test("returns SqliteStore when RATE_LIMIT_STORE=sqlite", () => {
    _resetRateLimitStoreForTests();
    process.env.RATE_LIMIT_STORE = "sqlite";
    const s = getRateLimitStore();
    expect(s.kind).toBe("sqlite");
  });

  test("falls back to MemoryStore for unknown values", () => {
    _resetRateLimitStoreForTests();
    process.env.RATE_LIMIT_STORE = "redis"; // not implemented
    const s = getRateLimitStore();
    expect(s.kind).toBe("memory");
  });

  test("singleton reuses the same instance across calls", () => {
    _resetRateLimitStoreForTests();
    const a = getRateLimitStore();
    const b = getRateLimitStore();
    expect(a).toBe(b);
  });

  test("_setRateLimitStoreForTests installs an explicit instance", () => {
    const fake = new MemoryStore();
    _setRateLimitStoreForTests(fake);
    expect(getRateLimitStore()).toBe(fake);
  });
});

// ─── Degraded-fallback contract ─────────────────────────────────────────────

describe("Degraded fallback behavior", () => {
  test("checkRateLimit fails open + signals degraded when store reports it", async () => {
    // Install a store that's permanently degraded — every incr should still
    // return a count, and checkRateLimit should let the request through.
    class DegradedStore extends MemoryStore {
      override readonly kind = "memory" as const;
      override isDegraded() {
        return true;
      }
    }
    _setRateLimitStoreForTests(new DegradedStore());

    const { checkRateLimit } = await import("../../lib/dx.ts");
    const req = new Request("http://x/api/probe", { method: "POST" });
    const result = checkRateLimit(req);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.degraded).toBe(true);

    _resetRateLimitStoreForTests();
  });
});
