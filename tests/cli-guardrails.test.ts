// Guardrails added for agent DX: unknown --flags, non-existent --cwd,
// per-subcommand --help, --fields through array paths, ndjson + --fields,
// UNHANDLED_ERROR-style envelopes always carrying ok/exitCode, and
// "did you mean" hints. Real subprocess runs, no mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { applyFieldsFilter } from "../src/core/output";
import { ok } from "../src/types";

const ROOT = join(import.meta.dir, "..");

const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
};

describe("unknown flags are rejected", () => {
  test("typo'd --dryrun exits 2 with UNKNOWN_FLAG + did-you-mean", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voice", "--dryrun", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("UNKNOWN_FLAG");
    expect(parsed.error.suggestions.join(" ")).toContain("--dry-run");
    expect(parsed.exitCode).toBe(2);
  });

  test("declared subcommand flags are accepted (brand reset --confirm --dry-run)", async () => {
    const { stdout, exitCode } = await run(["brand", "reset", "--confirm", "--dry-run", "--json"]);
    const parsed = JSON.parse(stdout);
    expect(parsed.error?.code).not.toBe("UNKNOWN_FLAG");
    expect(exitCode).not.toBe(2);
  });
});

describe("--format is opt-in and validated", () => {
  test("unknown --format value exits 2 INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["list", "--format", "xml"]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout).error.code).toBe("INVALID_ARGS");
  });

  test("--format toon emits TOON on success but keeps errors JSON", async () => {
    const okRun = await run(["list", "--format", "toon"]);
    expect(okRun.exitCode).toBe(0);
    expect(okRun.stdout.split("\n")[0]).toMatch(/^skills\[\d+\]\{/);

    const errRun = await run(["run", "no-such-skill-xyz", "--format", "toon"]);
    expect(errRun.exitCode).not.toBe(0);
    expect(JSON.parse(errRun.stdout).error).toBeDefined();
  });
});

describe("--cwd must exist", () => {
  test("non-existent --cwd exits 2 INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(["status", "--json", "--cwd", "/definitely/not/a/dir"]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout).error.code).toBe("INVALID_ARGS");
  });
});

describe("per-subcommand --help", () => {
  test("mktg skill upgrade --help --json returns the upgrade subcommand schema", async () => {
    const { stdout, exitCode } = await run(["skill", "upgrade", "--help", "--json"]);
    expect(exitCode).toBe(0);
    const schema = JSON.parse(stdout);
    expect(schema.name).toBe("upgrade");
    expect(schema.flags.map((f: { name: string }) => f.name)).toContain("--dry-run");
  });
});

describe("--fields", () => {
  test("array path whose leaf exists on no item is UNKNOWN_FIELD, not [null,...]", () => {
    const res = applyFieldsFilter(ok({ skills: [{ name: "a" }, { name: "b" }] }), ["skills.count"]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNKNOWN_FIELD");
  });

  test("array path that resolves still works", () => {
    const res = applyFieldsFilter(ok({ skills: [{ name: "a" }, { name: "b" }] }), ["skills.name"]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual({ skills: { name: ["a", "b"] } });
  });

  test("list --ndjson honours --fields per line", async () => {
    const { stdout, exitCode } = await run(["list", "--ndjson", "--fields", "name"]);
    expect(exitCode).toBe(0);
    const first = JSON.parse(stdout.split("\n")[0]!);
    expect(Object.keys(first)).toEqual(["name"]);
  });
});

describe("did-you-mean on NOT_FOUND", () => {
  test("mktg run brand-voic suggests brand-voice", async () => {
    const { stdout, exitCode } = await run(["run", "brand-voic", "--json"]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.error.suggestions[0]).toContain("brand-voice");
  });
});

describe("compete watch --dry-run is distinguishable", () => {
  test("payload carries dryRun: true", async () => {
    const { stdout } = await run(["compete", "watch", "https://example.com", "--dry-run", "--json"]);
    expect(JSON.parse(stdout).dryRun).toBe(true);
  });
});
