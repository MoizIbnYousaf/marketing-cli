-- Migration 002: activity table
-- Stores every action /cmo logs to the studio for live feed display.

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,           -- 'skill-run' | 'brand-write' | 'publish' | 'toast' | 'navigate' | 'custom'
  skill TEXT,
  summary TEXT NOT NULL,
  detail TEXT,
  files_changed TEXT,           -- JSON array e.g. '["brand/voice-profile.md"]'
  meta TEXT,                    -- JSON object for kind-specific extras
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);

INSERT INTO schema_version (version) VALUES (2);
