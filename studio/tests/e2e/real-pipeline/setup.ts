// tests/e2e/real-pipeline/setup.ts
//
// Orchestration module for the real-pipeline E2E harness.
//
// One exported createHarness() returns a RealPipelineHarness with:
//   - A real brand/ directory provisioned in a temp dir
//   - A real mktg-studio server spawned on a test port (STUDIO_TEST_PORT,
//     default 31801 — non-standard so it doesn't clash with dev)
//   - A real SQLite database under the temp dir
//   - A teardown() that kills the server, removes the temp dir, flushes
//     SSE subscribers, and releases the port
//
// Callers (E2, I1, I2, I3, I4, H3, J1, J2, J3, J4) import createHarness()
// in beforeAll and call harness.teardown() in afterAll.
//
// /cmo bridging is deferred to M4 (mktg cmo — CLI-invokable /cmo with
// structured output). Suites that need /cmo today use the Claude Code
// Agent tool directly; once M4 lands, this module will expose a
// driveCmo() helper.

import { spawn, type Subprocess } from "bun";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { probeHealthUntilReady } from "./lib/probe";

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");

/** Brand file seed — minimal, enough for skills that read brand/ to find data. */
const BRAND_SEED: ReadonlyArray<readonly [string, string]> = [
  ["voice-profile.md", "# Brand voice\n\nDirect, plain-language, anti-hype. Lowercase where possible. Never uses the word 'delve' or 'landscape'. Test-seeded brand voice for the real-pipeline harness.\n"],
  ["audience.md",      "# Audience\n\nSolo builders and small teams shipping SaaS. Test seed.\n"],
  ["positioning.md",   "# Positioning\n\nThe anti-course marketing stack. Test seed.\n"],
  ["competitors.md",   "# Competitors\n\nTest seed — no real competitors recorded.\n"],
  ["landscape.md",     "# Landscape\n\nTest seed. No Claims Blacklist entries yet.\n\n## Claims Blacklist\n\n(empty)\n"],
  ["keyword-plan.md",  "# Keyword plan\n\nTest seed.\n"],
  ["creative-kit.md",  "# Creative kit\n\nTest seed. Primary color #0066ff, font Inter.\n"],
  ["stack.md",         "# Stack\n\nTest seed — Bun, Next.js, SQLite.\n"],
  ["assets.md",        "# Assets\n\n(append-only log, starts empty)\n"],
  ["learnings.md",     "# Learnings\n\n(append-only log, starts empty)\n"],
];

export interface RealPipelineHarness {
  /** Absolute path to the temp dir. Contains `brand/` + whatever the server writes. */
  readonly tempDir: string;
  /** Absolute path to the seeded `brand/` directory inside tempDir. */
  readonly brandDir: string;
  /** Port the server listens on. */
  readonly studioPort: number;
  /** `http://127.0.0.1:<studioPort>` */
  readonly studioBaseUrl: string;
  /** The Bun subprocess running server.ts. Alive until teardown. */
  readonly serverProc: Subprocess;
  /** Teardown — kill server, remove temp dir, idempotent. */
  teardown(): Promise<void>;
}

export interface HarnessOptions {
  /** Override STUDIO_TEST_PORT. Default: env or 31801. */
  readonly studioPort?: number;
  /** Skip brand/ seeding (for tests that want a pristine temp dir). Default false. */
  readonly skipBrandSeed?: boolean;
  /** Extra env vars to pass to the spawned server. */
  readonly env?: Record<string, string>;
}

const DEFAULT_STUDIO_PORT = Number(process.env.STUDIO_TEST_PORT ?? "31801");

/**
 * Create a fresh real-pipeline harness. Idempotent cleanup on teardown.
 *
 * @example
 *   const harness = await createHarness();
 *   afterAll(() => harness.teardown());
 *
 *   const res = await fetch(`${harness.studioBaseUrl}/api/health`);
 *   expect(res.status).toBe(200);
 */
export async function createHarness(options: HarnessOptions = {}): Promise<RealPipelineHarness> {
  const studioPort = options.studioPort ?? DEFAULT_STUDIO_PORT;

  // 1. Temp dir.
  const tempDir = await mkdtemp(join(tmpdir(), "mktg-studio-e2e-"));
  const brandDir = join(tempDir, "brand");

  // 2. Seed brand/ (unless skipped).
  if (!options.skipBrandSeed) {
    await mkdir(brandDir, { recursive: true });
    for (const [name, content] of BRAND_SEED) {
      await writeFile(join(brandDir, name), content);
    }
  }

  // 3. Spawn the real server, cwd = tempDir so it reads the seeded brand/.
  const serverProc = spawn({
    cmd: ["bun", "run", "server.ts"],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...(options.env ?? {}),
      STUDIO_PORT: String(studioPort),
      MKTG_STUDIO_DB: join(tempDir, "studio.sqlite"),
      MKTG_BRAND_DIR: brandDir,
      MKTG_STUDIO_AUTH: "disabled",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  // 4. Wait for health.
  const probe = await probeHealthUntilReady(
    `http://127.0.0.1:${studioPort}/api/health`,
    { timeoutMs: 15_000 },
  );
  if (!probe.ok) {
    // Dump stderr so the failure is diagnosable.
    const stderr = await new Response(serverProc.stderr).text().catch(() => "<stderr unreadable>");
    serverProc.kill("SIGKILL");
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `real-pipeline harness: server did not come up on :${studioPort} in ${probe.elapsedMs}ms ` +
      `(${probe.attempts} attempts, last error: ${probe.lastError}).\nStderr:\n${stderr}`,
    );
  }

  // 5. Return handle.
  let tornDown = false;
  const teardown = async (): Promise<void> => {
    if (tornDown) return;
    tornDown = true;
    try {
      serverProc.kill("SIGINT");
      await Promise.race([serverProc.exited, Bun.sleep(2_000)]);
      if (serverProc.exitCode === null) serverProc.kill("SIGKILL");
    } catch {
      // already gone
    }
    await rm(tempDir, { recursive: true, force: true });
  };

  return {
    tempDir,
    brandDir,
    studioPort,
    studioBaseUrl: `http://127.0.0.1:${studioPort}`,
    serverProc,
    teardown,
  };
}
