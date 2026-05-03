// publish --list-adapters integration tests
// Verifies mktg publish --list-adapters returns expected adapter shape.
// Real file I/O in isolated temp dirs. No mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler } from "../../src/commands/publish";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-test-publish-adapters-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg publish --list-adapters", () => {
  test("returns ok with adapters array", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    expect(Array.isArray(data.adapters)).toBe(true);
    expect(data.adapters.length).toBeGreaterThan(0);
  });

  test("includes mktg-native, postiz, typefully, resend, and file adapters in presentation order", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const names = data.adapters.map(a => a.name);
    expect(names).toEqual(["mktg-native", "postiz", "typefully", "resend", "file"]);
    expect(names).toContain("mktg-native");
    expect(names).toContain("postiz");
    expect(names).toContain("typefully");
    expect(names).toContain("resend");
    expect(names).toContain("file");
  });

  test("each adapter has name, envVar, and configured fields", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    for (const adapter of data.adapters) {
      expect(typeof adapter.name).toBe("string");
      expect(adapter.envVar === null || typeof adapter.envVar === "string").toBe(true);
      expect(typeof adapter.configured).toBe("boolean");
    }
  });

  test("postiz adapter has correct envVar", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const postiz = data.adapters.find(a => a.name === "postiz");
    expect(postiz).toBeDefined();
    expect(postiz!.envVar).toBe("POSTIZ_API_KEY");
  });

  test("mktg-native adapter is built-in and needs no env var", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const nativeAdapter = data.adapters.find((adapter) => adapter.name === "mktg-native");
    expect(nativeAdapter).toBeDefined();
    expect(nativeAdapter!.envVar).toBeNull();
    expect(nativeAdapter!.configured).toBe(true);
  });

  test("typefully adapter has correct envVar", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const typefully = data.adapters.find(a => a.name === "typefully");
    expect(typefully).toBeDefined();
    expect(typefully!.envVar).toBe("TYPEFULLY_API_KEY");
  });

  test("resend adapter has correct envVar", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const resend = data.adapters.find(a => a.name === "resend");
    expect(resend).toBeDefined();
    expect(resend!.envVar).toBe("RESEND_API_KEY");
  });

  test("file adapter has null envVar and is always configured", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { adapters: Array<{ name: string; envVar: string | null; configured: boolean }> };
    const file = data.adapters.find(a => a.name === "file");
    expect(file).toBeDefined();
    expect(file!.envVar).toBeNull();
    expect(file!.configured).toBe(true);
  });

  test("exits before requiring publish.json to exist", async () => {
    // tempDir has no publish.json — --list-adapters should still succeed
    const result = await handler(["--list-adapters"], flags);
    expect(result.ok).toBe(true);
  });

  test("exit code is 0 on success", async () => {
    const result = await handler(["--list-adapters"], flags);
    expect(result.exitCode).toBe(0);
  });
});
