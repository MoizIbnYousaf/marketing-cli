-- Migration 003: rate_limits table
--
-- Backing store for the SQLite RateLimitStore. Sliding-window: one row per
-- mutating request, pruned by `hit_at_ms` whenever a key is incremented.
-- The in-memory store remains the default; this table is consulted only
-- when RATE_LIMIT_STORE=sqlite is set, but the table is always created so
-- switching at runtime doesn't require a migration step.

CREATE TABLE IF NOT EXISTS rate_limits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT    NOT NULL,            -- e.g. "127.0.0.1:POST"
  hit_at_ms  INTEGER NOT NULL              -- Date.now() at request time
);

-- Lookups are always by (key, hit_at_ms) for the prune+count pair.
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_hit ON rate_limits(key, hit_at_ms);

INSERT INTO schema_version (version) VALUES (3);
