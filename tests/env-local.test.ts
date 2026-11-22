import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyEnvLocal, isEnvLocalKeyAllowed, loadEnvLocal } from "../src/core/env-local";

let tempDir: string | null = null;
const savedNodeOptions = process.env.NODE_OPTIONS;
const STUDIO_KEYS = [
  "MKTG_STUDIO_TOKEN", "MKTG_PROJECT_ROOT", "MKTG_BRAND_DIR", "MKTG_STUDIO_DB",
  "DASHBOARD_HOST", "STUDIO_API_BASE", "NEXT_PUBLIC_STUDIO_API_BASE",
] as const;
const savedStudio: Record<string, string | undefined> = Object.fromEntries(
  STUDIO_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(async () => {
  delete process.env.POSTIZ_API_KEY;
  delete process.env.POSTIZ_API_BASE;
  delete process.env.MKTG_STUDIO_BIN;
  delete process.env.MKTG_ENV_LOCAL_PROBE;
  for (const key of STUDIO_KEYS) {
    if (savedStudio[key] === undefined) delete process.env[key];
    else process.env[key] = savedStudio[key];
  }
  if (savedNodeOptions === undefined) delete process.env.NODE_OPTIONS;
  else process.env.NODE_OPTIONS = savedNodeOptions;
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
  test("never applies keys that control process execution", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(
      join(tempDir, ".env.local"),
      "NODE_OPTIONS=--require ./evil.js\nMKTG_STUDIO_BIN=./evil.sh\nDYLD_INSERT_LIBRARIES=./evil.dylib\nMKTG_ENV_LOCAL_PROBE=ordinary\n",
    );
    delete process.env.NODE_OPTIONS;

    applyEnvLocal(tempDir);

    expect(process.env.NODE_OPTIONS).toBeUndefined();
    expect(process.env.MKTG_STUDIO_BIN).toBeUndefined();
    expect(process.env.DYLD_INSERT_LIBRARIES).toBeUndefined();
    // An ordinary project key still loads.
    expect(process.env.MKTG_ENV_LOCAL_PROBE).toBe("ordinary");
  });

  test("never applies Studio's own control keys", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(
      join(tempDir, ".env.local"),
      STUDIO_KEYS.map((key) => `${key}=from-project`).join("\n") + "\n",
    );
    for (const key of STUDIO_KEYS) delete process.env[key];

    applyEnvLocal(tempDir);

    for (const key of STUDIO_KEYS) expect(process.env[key]).toBeUndefined();
  });

  test("refuses proxy, TLS and shell start-up variables", () => {
    for (const key of [
      "HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY", "NO_PROXY", "https_proxy", "http_proxy",
      "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR",
      "BUN_CONFIG_REGISTRY", "BASH_ENV", "ZDOTDIR",
    ]) {
      expect(isEnvLocalKeyAllowed(key, {}, {})).toBe(false);
    }
  });

  test("compares keys case-insensitively", () => {
    for (const key of ["path", "node_options", "mktg_studio_auth", "foo_bin", "Npm_Config_Prefix"]) {
      expect(isEnvLocalKeyAllowed(key, {}, {})).toBe(false);
    }
    expect(isEnvLocalKeyAllowed("postiz_api_base", {}, { POSTIZ_API_KEY: "shell" })).toBe(false);
    expect(isEnvLocalKeyAllowed("POSTIZ_API_KEY", {}, {})).toBe(true);
  });

  test("does not point a shell-provided API key at a base URL from the file", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(join(tempDir, ".env.local"), "POSTIZ_API_BASE=https://attacker.example\n");
    process.env.POSTIZ_API_KEY = "ptz_from_shell";

    applyEnvLocal(tempDir);

    expect(process.env.POSTIZ_API_BASE).toBeUndefined();
  });

  test("does not point a shell-provided API key at the file's base URL even with a decoy key in the file", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(
      join(tempDir, ".env.local"),
      "POSTIZ_API_KEY=decoy\nPOSTIZ_API_BASE=https://attacker.example\n",
    );
    process.env.POSTIZ_API_KEY = "ptz_from_shell";

    applyEnvLocal(tempDir);

    expect(process.env.POSTIZ_API_KEY).toBe("ptz_from_shell");
    expect(process.env.POSTIZ_API_BASE).toBeUndefined();
  });

  test("honours a base URL when its API key is in the same file", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mktg-env-local-"));
    await writeFile(
      join(tempDir, ".env.local"),
      "POSTIZ_API_BASE=http://localhost:4007\nPOSTIZ_API_KEY=ptz_self_hosted\n",
    );

    applyEnvLocal(tempDir);

    expect(process.env.POSTIZ_API_BASE).toBe("http://localhost:4007");
    expect(process.env.POSTIZ_API_KEY).toBe("ptz_self_hosted");
  });
});
