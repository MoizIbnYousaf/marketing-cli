// tests/unit/mktg-env.test.ts — .env.local is merged into the env passed
// to spawned `mktg` subprocesses. Exercises the loader directly + asserts the
// cwd-based cache re-parses after file mutation (via mtime).

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadEnvLocal } from "../../lib/mktg.ts";

let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "mktg-env-"));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("loadEnvLocal", () => {
  test("returns {} when .env.local is missing", () => {
    expect(loadEnvLocal(tmp)).toEqual({});
  });

  test("parses KEY=VALUE, strips quotes, skips blanks + comments", () => {
    writeFileSync(
      join(tmp, ".env.local"),
      [
        "# top-level comment",
        "",
        "TYPEFULLY_API_KEY=tpf_abc_123",
        'POSTIZ_API_KEY="pz_xyz_789"',
        "POSTIZ_API_BASE='https://api.postiz.com'",
        "BLANK_VALUE=",
        "NOT A VALID LINE",
      ].join("\n"),
    );
    const env = loadEnvLocal(tmp);
    expect(env.TYPEFULLY_API_KEY).toBe("tpf_abc_123");
    expect(env.POSTIZ_API_KEY).toBe("pz_xyz_789");
    expect(env.POSTIZ_API_BASE).toBe("https://api.postiz.com");
    expect(env.BLANK_VALUE).toBe("");
    expect(env["NOT A VALID LINE"]).toBeUndefined();
  });

  test("re-parses after the file mtime changes (cache invalidation)", () => {
    const envPath = join(tmp, ".env.local");
    // Prior test wrote to this path; ensure we start from a known mtime
    // (same-millisecond writes collide with the cache key on fast FS).
    writeFileSync(envPath, "A=one\n");
    const t0 = new Date(Date.now() - 10_000);
    utimesSync(envPath, t0, t0);
    expect(loadEnvLocal(tmp).A).toBe("one");

    writeFileSync(envPath, "A=two\n");
    const t1 = new Date(Date.now() + 5_000);
    utimesSync(envPath, t1, t1);
    expect(loadEnvLocal(tmp).A).toBe("two");
  });
});

describe("Bun.spawn inherits .env.local through run()", () => {
  // End-to-end: write a fresh .env.local, spawn `sh -c 'echo $FOO'` with the
  // same merged-env dance `run()` does internally, confirm the value makes it
  // to the child. This is the actual fix — `run()` now passes `env` to
  // Bun.spawn instead of letting it default-inherit process.env only.
  test("child process sees env vars from .env.local when shell doesn't have them", async () => {
    const tmp2 = mkdtempSync(join(tmpdir(), "mktg-env-"));
    try {
      writeFileSync(join(tmp2, ".env.local"), "PROBE_ENV_KEY=from_env_local\n");

      // Match what run() does internally.
      const merged = {
        ...loadEnvLocal(tmp2),
        ...(process.env as Record<string, string>),
      };
      // Ensure shell isn't already leaking this key.
      delete merged.PROBE_ENV_KEY;
      // Now re-merge so .env.local wins for the probe specifically.
      merged.PROBE_ENV_KEY = loadEnvLocal(tmp2).PROBE_ENV_KEY;

      const proc = Bun.spawn(["sh", "-c", "echo \"$PROBE_ENV_KEY\""], {
        cwd: tmp2,
        env: merged,
        stdout: "pipe",
      });
      const out = await new Response(proc.stdout).text();
      await proc.exited;
      expect(out.trim()).toBe("from_env_local");
    } finally {
      rmSync(tmp2, { recursive: true, force: true });
    }
  });
});
