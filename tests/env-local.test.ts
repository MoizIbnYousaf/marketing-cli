import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyEnvLocal, loadEnvLocal } from "../src/core/env-local";

let tempDir: string | null = null;

afterEach(async () => {
  delete process.env.POSTIZ_API_KEY;
  delete process.env.POSTIZ_API_BASE;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe("env-local loader", () => {
  test("loads .env.local values from the active project root", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(
      join(tempDir, ".env.local"),
      "POSTIZ_API_KEY='ptz_from_file'\nPOSTIZ_API_BASE=http://localhost:4007\n",
    );

    expect(loadEnvLocal(tempDir)).toEqual({
      POSTIZ_API_KEY: "ptz_from_file",
      POSTIZ_API_BASE: "http://localhost:4007",
    });
  });

  test("applyEnvLocal never overrides shell env", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(join(tempDir, ".env.local"), "POSTIZ_API_KEY=ptz_from_file\n");
    process.env.POSTIZ_API_KEY = "ptz_from_shell";

    applyEnvLocal(tempDir);

    expect(process.env.POSTIZ_API_KEY).toBe("ptz_from_shell");
  });
});
