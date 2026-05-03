-- mktg-studio SQLite schema
-- All tables from CLAUDE.md architecture section

CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  severity INTEGER DEFAULT 0,
  spike_detected BOOLEAN DEFAULT 0,
  feedback TEXT DEFAULT 'pending',
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  skill TEXT,
  brand_files_read TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  brand_files_changed TEXT,
  result TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  skill_invoked TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  prerequisites TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publish_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adapter TEXT NOT NULL,
  providers TEXT,
  content_preview TEXT,
  result TEXT,
  items_published INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS postiz_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_baselines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,
  baseline_value REAL,
  window_days INTEGER DEFAULT 7,
  computed_at TEXT DEFAULT (datetime('now'))
);

-- Schema version tracking (used by migration runner)
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Activity feed: every action /cmo logs to the studio (added in migration 002)
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
