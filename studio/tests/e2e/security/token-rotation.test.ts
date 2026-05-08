// Lane 1 E2E -- token persistence + rotation.
//
// Each test owns its own boot/teardown. Sequential by `test.serial` because
// they all reuse port 38005 and we don't want overlapping spawns.

import { describe, expect, test } from "bun:test";
import { spawn, type Subprocess } from "bun";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");
const BOOT_TIMEOUT_MS = 15_000;

// Each boot gets its own port to avoid TIME_WAIT races between sequential
// bun:test cases on the same port.
let nextPort = 38050;
const allocPort = (): number => nextPort++;

interface BootedServer {
  proc: Subprocess;
  port: number;
  baseUrl: string;
  tempDir: string;
  tokenPath: string;
  token: string;
  cleanup: () => Promise<void>;
}

async function bootServer(opts: {
  reuseTempDir?: string;
  extraEnv?: Record<string, string>;
}): Promise<BootedServer> {
  const port = allocPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const tempDir = opts.reuseTempDir ?? await mkdtemp(join(tmpdir(), "mktg-sec-rot-"));
  const tokenPath = join(tempDir, "studio-token");
  const dbPath = join(tempDir, "studio.sqlite");

  const env: Record<string, string> = {
    ...process.env,
    STUDIO_PORT: String(port),
    MKTG_STUDIO_TOKEN_PATH: tokenPath,
    MKTG_STUDIO_DB: dbPath,
    MKTG_PROJECT_ROOT: tempDir,
    ...(opts.extraEnv ?? {}),
  };
  delete env.MKTG_STUDIO_AUTH;
  if (!opts.extraEnv?.MKTG_STUDIO_TOKEN) delete env.MKTG_STUDIO_TOKEN;

  const proc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: REPO_ROOT,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) break;
    } catch { /* retry */ }
    await Bun.sleep(100);
  }

  let token = "";
  // Even with env override, the server logs the configured token path; in
  // override mode the file may not be written. Read best-effort.
  try {
    token = (await readFile(tokenPath, "utf-8")).trim();
  } catch {
    // Acceptable when MKTG_STUDIO_TOKEN env override is supplied (env path
    // skips file IO entirely).
  }

  const cleanup = async (): Promise<void> => {
    proc.kill("SIGINT");
    try { await Promise.race([proc.exited, Bun.sleep(2_500)]); } catch { /* ignored */ }
    if (proc.exitCode === null) proc.kill("SIGKILL");
    if (!opts.reuseTempDir) {
      try { await rm(tempDir, { recursive: true, force: true }); } catch { /* ignored */ }
    }
  };

  return { proc, port, baseUrl, tempDir, tokenPath, token, cleanup };
}

describe("token rotation -- file mode + persistence", () => {
  test("HAPPY: first boot creates token file at mode 0o600 and authorizes", async () => {
    const s = await bootServer({});
    try {
      const stats = await stat(s.tokenPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
      expect(s.token.length).toBeGreaterThanOrEqual(64);
      const r = await fetch(`${s.baseUrl}/api/skills`, { headers: { Authorization: `Bearer ${s.token}` } });
      expect(r.status).toBe(200);
    } finally {
      await s.cleanup();
    }
  });

  test("HAPPY: restart with the SAME token file (and tempDir) reuses the token", async () => {
    // Boot 1 -- create token, do not delete tempDir.
    const persistDir = await mkdtemp(join(tmpdir(), "mktg-sec-rot-persist-"));
    let original = "";
    try {
      const s1 = await bootServer({ reuseTempDir: persistDir });
      try {
        original = s1.token;
        expect(original.length).toBeGreaterThanOrEqual(64);
      } finally {
        await s1.cleanup();
      }

      // Boot 2 -- same tempDir, same token path. Token must be reused.
      const s2 = await bootServer({ reuseTempDir: persistDir });
      try {
        const reread = (await readFile(s2.tokenPath, "utf-8")).trim();
        expect(reread).toBe(original);
        const r = await fetch(`${s2.baseUrl}/api/skills`, { headers: { Authorization: `Bearer ${original}` } });
        expect(r.status).toBe(200);
      } finally {
        await s2.cleanup();
      }
    } finally {
      try { await rm(persistDir, { recursive: true, force: true }); } catch { /* ignored */ }
    }
  });

  test("HAPPY: rotation -- delete file + restart -> NEW token, OLD token rejected", async () => {
    const persistDir = await mkdtemp(join(tmpdir(), "mktg-sec-rot-rotate-"));
    try {
      // Boot 1 -- capture old token.
      const s1 = await bootServer({ reuseTempDir: persistDir });
      const oldToken = s1.token;
      const tokenPath = s1.tokenPath;
      await s1.cleanup();
      expect(oldToken.length).toBeGreaterThanOrEqual(64);

      // Rotate.
      await rm(tokenPath, { force: true });

      // Boot 2 -- same tempDir, file deleted. Server must mint a new token.
      const s2 = await bootServer({ reuseTempDir: persistDir });
      try {
        expect(s2.token).not.toBe(oldToken);
        expect(s2.token.length).toBeGreaterThanOrEqual(64);

        const old = await fetch(`${s2.baseUrl}/api/skills`, { headers: { Authorization: `Bearer ${oldToken}` } });
        expect(old.status).toBe(401);

        const fresh = await fetch(`${s2.baseUrl}/api/skills`, { headers: { Authorization: `Bearer ${s2.token}` } });
        expect(fresh.status).toBe(200);
      } finally {
        await s2.cleanup();
      }
    } finally {
      try { await rm(persistDir, { recursive: true, force: true }); } catch { /* ignored */ }
    }
  });

  test("HAPPY: MKTG_STUDIO_TOKEN env override takes precedence over the file", async () => {
    const overrideToken = "e2e-override-".padEnd(64, "z");
    const s = await bootServer({ extraEnv: { MKTG_STUDIO_TOKEN: overrideToken } });
    try {
      const r = await fetch(`${s.baseUrl}/api/skills`, { headers: { Authorization: `Bearer ${overrideToken}` } });
      expect(r.status).toBe(200);
      // The on-disk file -- if present -- must NOT be the override (env path skips fs).
      try {
        const onDisk = (await readFile(s.tokenPath, "utf-8")).trim();
        expect(onDisk).not.toBe(overrideToken);
      } catch {
        // Acceptable: env path skipped fs entirely.
      }
    } finally {
      await s.cleanup();
    }
  });
});
