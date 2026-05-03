// Integration tests for --ndjson streaming across plan, run, context, and compete scan
// Verifies that handlers return correct results with --ndjson present.
// NDJSON lines go to stderr (process.stderr.write) — not captured here.
// Key assertion: return value is unchanged whether --ndjson is present or not.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as planHandler } from "../../src/commands/plan";
import { handler as contextHandler } from "../../src/commands/context";
import { handler as competeHandler } from "../../src/commands/compete";
import { handler as initHandler } from "../../src/commands/init";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-ndjson-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("plan --ndjson", () => {
  test("returns correct result with --ndjson flag (no brand dir)", async () => {
    const result = await planHandler(["--ndjson"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("health");
    expect(result.data).toHaveProperty("tasks");
    expect(result.data).toHaveProperty("generatedAt");
  });

  test("result matches non-ndjson run with brand dir", async () => {
    await initHandler(["--yes"], flags);

    const withNdjson = await planHandler(["--ndjson"], flags);
    const withoutNdjson = await planHandler([], flags);

    expect(withNdjson.ok).toBe(true);
    expect(withoutNdjson.ok).toBe(true);
    if (!withNdjson.ok || !withoutNdjson.ok) return;

    // Both should have the same shape
    expect(withNdjson.data).toHaveProperty("health");
    expect(withNdjson.data).toHaveProperty("tasks");
    expect(withNdjson.data).toHaveProperty("completedCount");
    expect(withNdjson.data).toHaveProperty("summary");

    // Core fields match
    const nd = withNdjson.data as { health: string; completedCount: number };
    const plain = withoutNdjson.data as { health: string; completedCount: number };
    expect(nd.health).toBe(plain.health);
    expect(nd.completedCount).toBe(plain.completedCount);
  });

  test("plan next subcommand still works with --ndjson in args", async () => {
    await initHandler(["--yes"], flags);
    const result = await planHandler(["next", "--ndjson"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // next returns { task: ... }
    expect(result.data).toHaveProperty("task");
  });
});

describe("context --ndjson", () => {
  test("returns correct result with --ndjson flag (no brand dir)", async () => {
    const result = await contextHandler(["--ndjson"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("compiledAt");
    expect(result.data).toHaveProperty("files");
    expect(result.data).toHaveProperty("summary");
    expect(result.data).toHaveProperty("tokenEstimate");
  });

  test("result matches non-ndjson run with brand dir", async () => {
    await initHandler(["--yes"], flags);

    const withNdjson = await contextHandler(["--ndjson"], flags);
    const withoutNdjson = await contextHandler([], flags);

    expect(withNdjson.ok).toBe(true);
    expect(withoutNdjson.ok).toBe(true);
    if (!withNdjson.ok || !withoutNdjson.ok) return;

    expect(withNdjson.data.summary.totalFiles).toBe(withoutNdjson.data.summary.totalFiles);
    expect(withNdjson.data.tokenEstimate).toBe(withoutNdjson.data.tokenEstimate);
    expect(Object.keys(withNdjson.data.files)).toEqual(Object.keys(withoutNdjson.data.files));
  });

  test("--ndjson + --layer produces correct filtered result", async () => {
    await initHandler(["--yes"], flags);

    const withNdjson = await contextHandler(["--ndjson", "--layer", "foundation"], flags);
    const withoutNdjson = await contextHandler(["--layer", "foundation"], flags);

    expect(withNdjson.ok).toBe(true);
    expect(withoutNdjson.ok).toBe(true);
    if (!withNdjson.ok || !withoutNdjson.ok) return;

    expect(withNdjson.data.summary.totalFiles).toBe(withoutNdjson.data.summary.totalFiles);
    expect(withNdjson.data.layer).toBe("foundation");
  });
});

describe("compete scan --ndjson", () => {
  test("returns correct result with --ndjson flag (empty watchlist)", async () => {
    await initHandler(["--yes"], flags);

    const result = await competeHandler(["scan", "--ndjson"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("results");
    expect((result.data as { results: unknown[] }).results).toEqual([]);
  });

  test("result matches non-ndjson scan with watchlist entry (dry-run)", async () => {
    await initHandler(["--yes"], flags);

    // Add a URL to watchlist
    await competeHandler(["watch", "https://example.com"], flags);

    const withNdjson = await competeHandler(["scan", "--ndjson"], { ...flags, dryRun: true });
    const withoutNdjson = await competeHandler(["scan"], { ...flags, dryRun: true });

    expect(withNdjson.ok).toBe(true);
    expect(withoutNdjson.ok).toBe(true);
    if (!withNdjson.ok || !withoutNdjson.ok) return;

    const nd = withNdjson.data as { results: { url: string; status: string }[] };
    const plain = withoutNdjson.data as { results: { url: string; status: string }[] };

    expect(nd.results.length).toBe(plain.results.length);
    if (nd.results.length > 0 && plain.results.length > 0) {
      expect(nd.results[0]!.url).toBe(plain.results[0]!.url);
      expect(nd.results[0]!.status).toBe(plain.results[0]!.status);
    }
  });
});
