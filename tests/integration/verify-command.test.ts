// E2E tests for `mktg verify` — real Bun.spawn of src/cli.ts, no mocks.
// Covers dry-run + execute paths, flag parsing + validation + summary file.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";
import {
  handler as verifyHandler,
  parseBunTestStats,
  schema as verifySchema,
  type VerifyReport,
} from "../../src/commands/verify";
import type { GlobalFlags } from "../../src/types";

// --- Low-level unit coverage ---------------------------------------------

describe("parseBunTestStats", () => {
  test("parses the conventional bun test footer", () => {
    const out = `bun test v1.3.8 (abcdef)
tests/something.test.ts:
...
 42 pass
  0 fail
 167 expect() calls
Ran 42 tests across 7 files. [1.50s]
`;
    expect(parseBunTestStats(out)).toEqual({ pass: 42, fail: 0, expect: 167 });
  });

  test("returns null when pass/fail are absent (typecheck output)", () => {
    expect(parseBunTestStats("tsc --noEmit clean\n")).toBeNull();
  });

  test("tolerates expect() line being absent", () => {
    const out = ` 1 pass\n 0 fail\n`;
    expect(parseBunTestStats(out)).toEqual({ pass: 1, fail: 0, expect: 0 });
  });
});

// --- Schema surface ------------------------------------------------------

describe("mktg verify — schema", () => {
  test("declares the Pass 2 flags", () => {
    const flagNames = verifySchema.flags.map((f) => f.name);
    expect(flagNames).toEqual(
      expect.arrayContaining(["--suite", "--dry-run", "--fail-fast", "--parallel", "--capture"]),
    );
  });

  test("output shape includes execute-mode fields", () => {
    const keys = Object.keys(verifySchema.output);
    expect(keys).toEqual(expect.arrayContaining(["results", "execution", "counts"]));
  });
});

// --- Handler-level behavior (direct invocation, no cli.ts) ---------------

const baseFlags = (overrides: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
  jsonInput: undefined,
  ...overrides,
});

describe("mktg verify — input validation", () => {
  test("rejects unknown --suite with structured error", async () => {
    const res = await verifyHandler(["--suite", "no-such-suite"], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("Unknown suite");
    expect(res.exitCode).toBe(2);
  });

  test("rejects --parallel out of range", async () => {
    const res = await verifyHandler(["--parallel", "99"], baseFlags());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("--parallel");
  });

  test("rejects --parallel non-numeric", async () => {
    const res = await verifyHandler(["--parallel", "abc"], baseFlags());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
  });

  test("rejects --capture with traversal", async () => {
    const res = await verifyHandler(["--capture", "../escape"], baseFlags());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("traversal");
  });

  test("rejects --suite with control chars", async () => {
    const res = await verifyHandler(["--suite", "bad\x00name"], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
  });
});

describe("mktg verify --dry-run — Pass 1 surface preserved", () => {
  test("returns a plan with counts, no results, no execution", async () => {
    const res = await verifyHandler([], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.mode).toBe("dry-run");
    expect(res.data.counts.total).toBe(15);
    expect(res.data.results).toBeUndefined();
    expect(res.data.execution).toBeUndefined();
  });

  test("--suite filter narrows the plan", async () => {
    const res = await verifyHandler(
      ["--suite", "marketing-cli-typecheck"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const willRunNames = res.data.suites.filter((s) => s.willRun).map((s) => s.name);
    expect(willRunNames).toEqual(["marketing-cli-typecheck"]);
  });
});

// --- Full execute path ---------------------------------------------------
//
// Pick a suite that:
//  (a) already exists on disk (reachable)
//  (b) has no requiredEnv (envSatisfied without .env.test)
//  (c) runs in <20s so the test suite doesn't hang
//
// marketing-cli-typecheck (bun x tsc --noEmit) fits all three.

describe("mktg verify execute — marketing-cli-typecheck", () => {
  let captureDir: string;

  beforeAll(async () => {
    captureDir = await mkdtemp(join(tmpdir(), "mktg-verify-capture-"));
  });
  afterAll(async () => {
    await rm(captureDir, { recursive: true, force: true });
  });

  test("executes a real suite, records result, writes summary", async () => {
    const res = await verifyHandler(
      ["--suite", "marketing-cli-typecheck", "--capture", captureDir],
      baseFlags({ dryRun: false }),
    );
    // marketing-cli-typecheck should pass on a clean tree.
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.mode).toBe("execute");
    expect(res.data.results).toBeDefined();
    const executed = (res.data.results ?? []).filter((r) => r.status !== "skipped");
    expect(executed.length).toBe(1);
    expect(executed[0]!.name).toBe("marketing-cli-typecheck");
    expect(executed[0]!.exitCode).toBe(0);
    expect(executed[0]!.status).toBe("pass");
    expect(res.data.counts.passed).toBe(1);
    expect(res.data.counts.failed).toBe(0);

    // --capture wrote files
    expect(executed[0]!.captureFiles).toBeDefined();
    expect(existsSync(executed[0]!.captureFiles!.stdout)).toBe(true);
    expect(existsSync(executed[0]!.captureFiles!.stderr)).toBe(true);

    // Summary landed at ~/.mktg/verify/<ts>.json
    expect(res.data.execution?.summaryPath).toBeDefined();
    const summaryPath = res.data.execution!.summaryPath;
    expect(summaryPath.startsWith(join(homedir(), ".mktg", "verify"))).toBe(true);
    expect(existsSync(summaryPath)).toBe(true);
    const summary = JSON.parse(await readFile(summaryPath, "utf-8")) as VerifyReport;
    expect(summary.mode).toBe("execute");
    expect(summary.execution?.summaryPath).toBe(summaryPath);
  }, 60_000);
});
