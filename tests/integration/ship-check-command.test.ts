// E2E tests for `mktg ship-check` — real Bun.spawn, no mocks.

import { describe, test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  handler as shipCheckHandler,
  schema as shipCheckSchema,
  type ShipCheckReport,
} from "../../src/commands/ship-check";
import type { GlobalFlags } from "../../src/types";

const baseFlags = (overrides: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
  jsonInput: undefined,
  ...overrides,
});

describe("mktg ship-check — schema", () => {
  test("declares every M3 flag", () => {
    const names = shipCheckSchema.flags.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(["--dry-run", "--verbose", "--skip", "--fresh"]));
  });

  test("output shape advertises verdict/blockers/warnings/checks/summary/commits", () => {
    const keys = Object.keys(shipCheckSchema.output);
    expect(keys).toEqual(
      expect.arrayContaining([
        "verdict", "blockers", "warnings", "checks", "summary", "commits", "summaryPath",
      ]),
    );
  });
});

describe("mktg ship-check — input validation", () => {
  test("rejects --fresh with non 'true'/'false' value", async () => {
    const res = await shipCheckHandler(["--fresh", "maybe"], baseFlags());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("--fresh");
  });

  test("rejects unknown --skip name with structured error + valid-list", async () => {
    const res = await shipCheckHandler(
      ["--skip", "no-such-check"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.suggestions.some((s) => s.includes("Valid checks"))).toBe(true);
  });

  test("rejects --skip with control chars", async () => {
    const res = await shipCheckHandler(
      ["--skip", "bad\x00check"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
  });
});

describe("mktg ship-check --dry-run", () => {
  test("lists every check, writes no summary file, exits 0", async () => {
    const res = await shipCheckHandler([], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.mode).toBe("dry-run");
    expect(res.data.checks.length).toBe(8);
    expect(res.data.summaryPath).toBe("(dry-run — no file written)");
    expect(res.data.verdict).toBe("pass");
    expect(res.data.icon).toBe("🟢");
    // Commits populated from git even in dry-run
    expect(res.data.commits.marketingCli).toBeTruthy();
    expect(res.data.commits.mktgStudio).toBe(res.data.commits.marketingCli);
  });

  test("--skip removes the named check from the run", async () => {
    const res = await shipCheckHandler(
      ["--skip", "studio-health,version-tag-consistency"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const skipped = res.data.checks.filter((c) => c.verdict === "skipped").map((c) => c.name);
    expect(skipped).toEqual(
      expect.arrayContaining(["studio-health", "version-tag-consistency"]),
    );
    expect(res.data.summary.skipped).toBe(2);
  });
});

describe("mktg ship-check — execute (partial: fast checks only)", () => {
  // Run a tight execute path: skip the slow ones (mktg-verify, both
  // typechecks, studio-health) so the test finishes in a few seconds.
  // This still exercises the full handler: verdict aggregation, summary
  // file write, commits capture, exit-code mapping.

  test("full-skip execute writes summary file, returns verdict pass, commits populated", async () => {
    // Skip every check so the test is deterministic regardless of real repo
    // state. This exercises the handler's end-to-end structure (verdict
    // aggregation, summary-file write, commits capture, summary path
    // returned in ok()) without depending on the tree being clean or
    // external tools being reachable.
    const res = await shipCheckHandler(
      [
        "--skip",
        "marketing-cli-clean,mktg-studio-clean,marketing-cli-typecheck,mktg-studio-typecheck,mktg-doctor,mktg-verify,version-tag-consistency,studio-health",
      ],
      baseFlags({ dryRun: false }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.verdict).toBe("pass");
    expect(res.data.icon).toBe("🟢");
    expect(res.data.mode).toBe("execute");
    expect(res.data.summaryPath.startsWith(join(homedir(), ".mktg", "ship-check"))).toBe(true);
    expect(existsSync(res.data.summaryPath)).toBe(true);
    expect(res.data.summary.skipped).toBe(8);
    expect(res.data.summary.failed).toBe(0);
    expect(res.data.commits.marketingCli).toBeTruthy();

    const onDisk = JSON.parse(await readFile(res.data.summaryPath, "utf-8")) as ShipCheckReport;
    expect(onDisk.verdict).toBe("pass");
    expect(onDisk.checks.length).toBe(8);
    expect(onDisk.checks.every((c) => c.verdict === "skipped")).toBe(true);
  }, 20_000);

  test("verdict mapping: blocker fail → verdict 'block', exit 4, full report as data", async () => {
    // Run the real git-clean checks; when the working tree is dirty the
    // handler must return the FULL report (not an error envelope) with
    // data.verdict === 'block' and exitCode 4 so blockers[] is readable
    // straight from stdout.
    const res = await shipCheckHandler(
      [
        "--skip",
        "marketing-cli-typecheck,mktg-studio-typecheck,mktg-doctor,mktg-verify,version-tag-consistency,studio-health",
      ],
      baseFlags({ dryRun: false }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(existsSync(res.data.summaryPath)).toBe(true);
    const onDisk = JSON.parse(await readFile(res.data.summaryPath, "utf-8")) as ShipCheckReport;
    if (res.data.verdict === "block") {
      expect(res.exitCode).toBe(4);
      expect(res.data.icon).toBe("🔴");
      expect(res.data.blockers.length).toBeGreaterThan(0);
      expect(onDisk.verdict).toBe("block");
    } else {
      // Tree happens to be clean — pass/warn both exit 0.
      expect(res.exitCode).toBe(0);
      expect(["pass", "warn"]).toContain(res.data.verdict);
      expect(onDisk.verdict).toBe(res.data.verdict);
    }
  }, 20_000);

  test("verdict mapping: warnings only → verdict 'warn', exit 0 (non-blocking)", async () => {
    // Skip every blocking check; keep version-tag-consistency (non-blocking,
    // warns when no tag or a mismatch) and mktg-doctor (non-blocking). Whatever
    // those report, the result must be exit 0 with verdict pass|warn — never
    // block, never a non-zero exit.
    const res = await shipCheckHandler(
      [
        "--skip",
        "marketing-cli-clean,mktg-studio-clean,marketing-cli-typecheck,mktg-studio-typecheck,mktg-verify,mktg-doctor,studio-health",
      ],
      baseFlags({ dryRun: false }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.exitCode).toBe(0);
    expect(["pass", "warn"]).toContain(res.data.verdict);
    expect(res.data.blockers).toEqual([]);
    if (res.data.verdict === "warn") {
      expect(res.data.icon).toBe("🟡");
      expect(res.data.warnings.length).toBeGreaterThan(0);
    }
  }, 20_000);
});
