// tests/unit/sqlite.test.ts — round-trip tests for the sqlite wrappers
//
// Uses the project DB singleton — writes to a disposable activity row so
// nothing leaks into real app data. For deeper isolation we'd swap the
// DB_PATH, but the helpers don't expose that hook today.

import { afterEach, describe, expect, test } from "bun:test";
import { queryAll, queryOne, execute, getDb, getDbPath } from "../../lib/sqlite.ts";

const TEST_KIND = "__unit_test__";

afterEach(() => {
  delete process.env.MKTG_STUDIO_DB;
  delete process.env.MKTG_PROJECT_ROOT;
});

describe("sqlite path resolution", () => {
  test("uses MKTG_STUDIO_DB when set", () => {
    process.env.MKTG_STUDIO_DB = "/tmp/custom-studio.sqlite";
    expect(getDbPath()).toBe("/tmp/custom-studio.sqlite");
  });

  test("falls back to MKTG_PROJECT_ROOT/marketing.db", () => {
    process.env.MKTG_PROJECT_ROOT = "/tmp/mktg-project-root";
    expect(getDbPath()).toBe("/tmp/mktg-project-root/marketing.db");
  });
});

describe("sqlite wrappers", () => {
  test("getDb returns a working Database instance", () => {
    const db = getDb();
    expect(db).toBeDefined();
    const row = db.query<{ v: number }, []>("SELECT 1 as v").get();
    expect(row?.v).toBe(1);
  });

  test("execute + queryOne + queryAll round-trip", () => {
    execute("DELETE FROM activity WHERE kind = ?", [TEST_KIND]);

    const inserted = execute(
      "INSERT INTO activity (kind, summary, detail) VALUES (?, ?, ?)",
      [TEST_KIND, "unit test entry", "hello"],
    );

    expect(inserted.changes).toBe(1);
    const id = Number(inserted.lastInsertRowid);
    expect(id).toBeGreaterThan(0);

    const one = queryOne<{ id: number; kind: string; summary: string }>(
      "SELECT id, kind, summary FROM activity WHERE id = ?",
      [id],
    );
    expect(one).not.toBeNull();
    expect(one?.kind).toBe(TEST_KIND);
    expect(one?.summary).toBe("unit test entry");

    const all = queryAll<{ id: number }>(
      "SELECT id FROM activity WHERE kind = ?",
      [TEST_KIND],
    );
    expect(all.length).toBe(1);

    execute("DELETE FROM activity WHERE id = ?", [id]);
    const gone = queryOne("SELECT id FROM activity WHERE id = ?", [id]);
    expect(gone).toBeNull();
  });

  test("migrations have run — schema_version table + seed tables exist", () => {
    const v = queryOne<{ version: number }>(
      "SELECT MAX(version) as version FROM schema_version",
    );
    expect(v).not.toBeNull();
    expect(v?.version).toBeGreaterThan(0);

    for (const table of ["signals", "activity", "opportunities", "publish_log"]) {
      const row = queryOne<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table],
      );
      expect(row?.name).toBe(table);
    }
  });

  test("queryOne returns null when no row matches", () => {
    const row = queryOne("SELECT id FROM activity WHERE id = ?", [-1]);
    expect(row).toBeNull();
  });

  test("queryAll returns empty array when no rows match", () => {
    const rows = queryAll("SELECT id FROM activity WHERE kind = ?", ["__no_such_kind__"]);
    expect(rows).toEqual([]);
  });
});
