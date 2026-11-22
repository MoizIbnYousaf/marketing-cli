// mktg publish — safety contract, driven through the real CLI.
//
// Each test runs `bun run src/cli.ts publish` as a child process in a fresh
// project with a fresh HOME and no provider keys, then checks stdout, the
// exit code and every byte under the project and HOME.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { changedPaths, makeSandbox, manifest, runPublish, snapshot, type Sandbox } from "./publish-cli-harness";

const T = 120_000;
let sb: Sandbox;

beforeEach(async () => { sb = await makeSandbox(); });
afterEach(async () => { await sb.cleanup(); });

const fileItem = { type: "file", adapter: "file", content: "hello", metadata: { filename: "out.md" } };

describe("unknown --adapter", () => {
  test("is refused with INVALID_ARGS, exit 2, the valid list, and no file written", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    const before = await snapshot(sb);
    const r = await runPublish(sb, ["--adapter", "fv-unknown", "--confirm", "--json"]);
    expect(r.exitCode).toBe(2);
    const error = (r.json as { error?: { code: string; message: string; suggestions: string[] } }).error!;
    expect(error.code).toBe("INVALID_ARGS");
    expect(error.message).toContain("fv-unknown");
    expect(error.suggestions.join(" ")).toContain("mktg-native, postiz, typefully, resend, file");
    expect(changedPaths(before, await snapshot(sb))).toEqual([]);
  }, T);

  test("is refused before a maintenance flag runs", async () => {
    await mkdir(join(sb.project, ".mktg"), { recursive: true });
    const r = await runPublish(sb, ["--adapter", "nope", "--list-integrations", "--json"]);
    expect(r.exitCode).toBe(2);
    expect((r.json as { error?: { code: string } }).error?.code).toBe("INVALID_ARGS");
  }, T);
});
