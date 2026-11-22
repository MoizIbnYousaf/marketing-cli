// tests/unit/mktg-publish-exit4.test.ts — `mktg publish` exits 4 with the
// full result as data when an item fails (docs/EXIT_CODES.md). Studio's
// runner must hand that data to the caller, not turn it into CLI_ERROR.
// Real CLI child process, real temp project, temp HOME.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mktgPublish } from "../../lib/mktg.ts";

let project: string;
let home: string;
const savedHome = process.env.HOME;

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "mktg-studio-pub4-proj-"));
  home = mkdtempSync(join(tmpdir(), "mktg-studio-pub4-home-"));
  process.env.HOME = home;
});

afterEach(() => {
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
  rmSync(project, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

test("a publish with one failed item returns its data, with the failure in it", async () => {
  const result = await mktgPublish(
    {
      name: "studio-exit4",
      items: [
        { type: "file", adapter: "file", content: "ok", metadata: { filename: "ok.md" } },
        { type: "social", adapter: "mktg-native", content: "no provider", metadata: { providers: ["linkedin"] } },
      ],
    },
    { confirm: true, cwd: project },
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.exitCode).toBe(4);
  expect(result.data.failed).toBe(1);
  expect(result.data.writtenFiles).toBe(1);
  expect(result.data.published).toBe(0);
}, 120_000);

test("a clean publish keeps exit code 0", async () => {
  const result = await mktgPublish(
    { name: "studio-exit0", items: [{ type: "file", adapter: "file", content: "ok", metadata: { filename: "ok.md" } }] },
    { confirm: true, cwd: project },
  );
  expect(result.ok).toBe(true);
  expect(result.exitCode).toBe(0);
}, 120_000);
