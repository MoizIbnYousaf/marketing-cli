// Lane 1 E2E -- mktg run skill name validation.
//
// The CLI validator (src/commands/run.ts) was the lone gap in the
// resource-name validators. It now runs `rejectControlChars` +
// `validateResourceId` on the skill name before manifest lookup. This
// suite invokes the REAL `mktg` binary (Bun + src/cli.ts) via subprocess
// to verify the validation fires.

import { describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { resolve } from "node:path";

const CLI = resolve(import.meta.dir, "..", "..", "..", "..", "src", "cli.ts");

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runMktg(args: string[]): Promise<CliResult> {
  const proc = spawn({
    cmd: ["bun", "run", CLI, ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

describe("mktg run -- skill-name validator", () => {
  test("HAPPY: a valid known skill returns NOT_FOUND if missing or success if present (no INVALID_ARGS)", async () => {
    // Use a syntactically-valid name that almost-certainly is not registered
    // in the temp project; we want to confirm we get past the validator into
    // the manifest-lookup code path.
    const r = await runMktg(["run", "definitely-not-a-skill-but-valid-id", "--json"]);
    expect(r.exitCode).not.toBe(0);
    const body = JSON.parse(r.stdout) as { error?: { code: string } };
    // Past the validator -> manifest lookup -> NOT_FOUND.
    expect(body.error?.code).toBe("NOT_FOUND");
  });

  test("FAILURE: uppercase letters rejected by validateResourceId", async () => {
    const r = await runMktg(["run", "BadSkillName", "--json"]);
    expect(r.exitCode).toBe(2);
    const body = JSON.parse(r.stdout) as { error?: { code: string; message: string } };
    expect(body.error?.code).toBe("INVALID_ARGS");
    expect(body.error?.message.toLowerCase()).toMatch(/invalid characters|lowercase/);
  });

  test("FAILURE: shell metachar (semicolon) rejected, NOT executed as shell", async () => {
    const r = await runMktg(["run", "evil; rm -rf /tmp/should-never-exist", "--json"]);
    expect(r.exitCode).toBe(2);
    const body = JSON.parse(r.stdout) as { error?: { code: string; message: string } };
    expect(body.error?.code).toBe("INVALID_ARGS");
  });

  test("FAILURE: 10000-char skill name returns INVALID_ARGS (length cap, not 10000-char NOT_FOUND echo)", async () => {
    const longName = "a".repeat(10_000);
    const r = await runMktg(["run", longName, "--json"]);
    expect(r.exitCode).toBe(2);
    const body = JSON.parse(r.stdout) as { error?: { code: string; message: string } };
    expect(body.error?.code).toBe("INVALID_ARGS");
    // Critical regression guard from the audit: the error envelope must not
    // reflect the entire 10000-char input back. validateResourceId caps at
    // 128, so the message includes the cap text.
    expect(body.error?.message.length).toBeLessThan(500);
    expect(body.error?.message).toMatch(/128/);
  });

  test("FAILURE: empty positional after flag-trim still rejected with the missing-name path", async () => {
    const r = await runMktg(["run", "--json"]);
    expect(r.exitCode).toBe(2);
    const body = JSON.parse(r.stdout) as { error?: { code: string; message: string } };
    expect(body.error?.code).toBe("INVALID_ARGS");
    expect(body.error?.message.toLowerCase()).toMatch(/missing skill name/);
  });
});
