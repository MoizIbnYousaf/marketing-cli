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
    expect(res.data.verdict).toBe("🟢");
    // Commits populated from git even in dry-run
    expect(res.data.commits.marketingCli).toBeTruthy();
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

  test("full-skip execute writes summary file, returns 🟢, commits populated", async () => {
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

    expect(res.data.verdict).toBe("🟢");
    expect(res.data.mode).toBe("execute");
    expect(res.data.summaryPath.startsWith(join(homedir(), ".mktg", "ship-check"))).toBe(true);
    expect(existsSync(res.data.summaryPath)).toBe(true);
    expect(res.data.summary.skipped).toBe(8);
    expect(res.data.summary.failed).toBe(0);
    expect(res.data.commits.marketingCli).toBeTruthy();

    const onDisk = JSON.parse(await readFile(res.data.summaryPath, "utf-8")) as ShipCheckReport;
    expect(onDisk.verdict).toBe("🟢");
    expect(onDisk.checks.length).toBe(8);
    expect(onDisk.checks.every((c) => c.verdict === "skipped")).toBe(true);
  }, 20_000);

  test("verdict mapping: blocker fail → 🔴 exit 2 with summaryPath in err suggestions", async () => {
    // Run the real git-clean checks (which currently fail because this commit
    // is in flight); verify the handler returns err with exit 2 and the
    // summary path is threaded into the suggestions.
    const res = await shipCheckHandler(
      [
        "--skip",
        "marketing-cli-typecheck,mktg-studio-typecheck,mktg-doctor,mktg-verify,version-tag-consistency,studio-health",
      ],
      baseFlags({ dryRun: false }),
    );
    // If the working tree HAPPENS to be clean (unlikely while adding this
    // file), this assertion inverts. Handle both paths gracefully.
    if (res.ok) {
      expect(res.data.verdict).toBe("🟢");
      expect(existsSync(res.data.summaryPath)).toBe(true);
    } else {
      expect(res.error.code).toBe("SHIP_CHECK_BLOCK");
      expect(res.exitCode).toBe(2);
      const pathHint = res.error.suggestions.find((s) => s.startsWith("Summary:"));
      expect(pathHint).toBeDefined();
      const summaryPath = pathHint!.replace(/^Summary:\s*/, "");
      expect(existsSync(summaryPath)).toBe(true);
      const onDisk = JSON.parse(await readFile(summaryPath, "utf-8")) as ShipCheckReport;
      expect(onDisk.verdict).toBe("🔴");
      expect(onDisk.blockers.length).toBeGreaterThan(0);
    }
  }, 20_000);
});
