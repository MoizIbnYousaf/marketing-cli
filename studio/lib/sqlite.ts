// lib/sqlite.ts — SQLite connection + typed query helpers
// Uses bun:sqlite (built-in, no extra dep).
// Runs migrations from db/schema.sql and db/migrations/*.sql on startup.

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { existsSync, readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStudioDbPath } from "./project-root.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "db", "migrations");

export function getDbPath(): string {
  return resolveStudioDbPath(REPO_ROOT);
}

let _db: Database | null = null;

// ---------------------------------------------------------------------------
// Singleton database connection.
// Configures WAL + foreign keys and runs pending migrations on first call.
// ---------------------------------------------------------------------------
export function getDb(): Database {
  if (_db) return _db;

  _db = new Database(getDbPath(), { create: true });

  // Performance + safety pragmas
  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");
  _db.run("PRAGMA synchronous = NORMAL");

  runMigrations(_db);

  return _db;
}

// Convenience singleton — call after server init.
export const db: Database = (() => {
  // Lazily resolved when first accessed — modules importing `db` directly
  // get a Proxy that forwards to the real db once initialized.
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
  };
  return new Proxy({}, handler) as Database;
})();

// ---------------------------------------------------------------------------
// Migration runner
// Files: db/migrations/NNN_description.sql
// Tracks applied versions in schema_version table.
// ---------------------------------------------------------------------------
function runMigrations(database: Database): void {
  // Bootstrap version table
  database.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const row = database
    .query<{ version: number | null }, []>("SELECT MAX(version) as version FROM schema_version")
    .get();
  const currentVersion = row?.version ?? 0;

  if (!existsSync(MIGRATIONS_DIR)) {
    console.warn("[sqlite] Migrations directory not found:", MIGRATIONS_DIR);
    return;
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const match = file.match(/^(\d+)/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    if (version <= currentVersion) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`[sqlite] Running migration ${file}...`);

    // Run in a transaction so a partial migration leaves the DB clean
    database.transaction(() => {
      database.run(sql);
    })();

    console.log(`[sqlite] Migration ${file} applied.`);
  }
}

// ---------------------------------------------------------------------------
// Typed query helpers
// ---------------------------------------------------------------------------

/** Return all rows matching the query. */
export function queryAll<T extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
): T[] {
  return getDb()
    .query<T, SQLQueryBindings[]>(sql)
    .all(...(params as SQLQueryBindings[]));
}

/** Return one row or null. */
export function queryOne<T extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
): T | null {
  return (
    getDb()
      .query<T, SQLQueryBindings[]>(sql)
      .get(...(params as SQLQueryBindings[])) ?? null
  );
}

/** Execute a non-SELECT statement (INSERT / UPDATE / DELETE). */
export function execute(
  sql: string,
  params: readonly unknown[] = [],
): { changes: number; lastInsertRowid: number | bigint } {
  const stmt = getDb().prepare(sql);
  const result = stmt.run(...(params as SQLQueryBindings[]));
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}

/** Close the database. Call on graceful shutdown. */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
