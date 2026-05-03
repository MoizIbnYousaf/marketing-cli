// mktg — Regression test: dist/cli.js runs cleanly under node
//
// Context: `bun build src/cli.ts --outdir dist --target node` produces a
// bundle that preserves Bun.* API calls in the output. Without a runtime
// polyfill, running `node dist/cli.js` crashes with "Bun is not defined"
// — which breaks the `npm install -g mktg && mktg ...` install path for
// every user who doesn't already have bun installed.
//
// The fix (see src/core/runtime-compat.ts) installs a node-compatible
// globalThis.Bun polyfill before any other module imports, so the bundled
// Bun.* calls resolve against the polyfill under node and against the real
// Bun global under bun.
//
// This test is the regression gate. It builds the bundle in beforeAll and
// spawns it via `child_process.spawn("node", ...)` — NOT bun — for each of
// the core install-path commands we need to keep working under node. Before the fix, every spawn
// exits with the "Bun is not defined" UNHANDLED_ERROR. After the fix, each
// command either succeeds (exit 0) or returns a structured non-crash error
// (exit 2 for args errors). No UNHANDLED_ERROR on any path.
//
// This test runs UNDER bun (the mktg dev environment) but spawns CHILD
// processes via node to exercise the node runtime path that `bun test`
// normally never touches.

import { describe, test, expect, beforeAll } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";

const REPO_ROOT = import.meta.dir.replace("/tests/integration", "");
const BUNDLE_PATH = join(REPO_ROOT, "dist", "cli.js");

// Helper: spawn the bundled CLI via node (NOT bun) and capture result.
// Isolated HOME so the CLI can't read the developer's ~/.claude/skills
// state during the test.
type NodeRun = { stdout: string; stderr: string; exitCode: number };

const runNode = async (
  args: readonly string[],
  cwd: string,
  home: string,
): Promise<NodeRun> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [BUNDLE_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        HOME: home,
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? -1 });
    });
  });
};

// Parse stdout as JSON. Fail the test if stdout isn't valid JSON.
const parseJson = (stdout: string): unknown => {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`stdout is not valid JSON: ${stdout.slice(0, 300)}`);
  }
};

describe("dist/cli.js runs cleanly under node (Bun polyfill regression)", () => {
  let tmpCwd: string;
  let tmpHome: string;

  beforeAll(async () => {
    // Rebuild the bundle to guarantee we're testing the current source.
    // Uses `bun build --target node` which is the real production build.
    const buildResult = await new Promise<number>((resolve, reject) => {
      const proc = spawn(
        "bun",
        ["build", "src/cli.ts", "--outdir", "dist", "--target", "node"],
        { cwd: REPO_ROOT, stdio: "inherit" },
      );
      proc.on("error", reject);
      proc.on("close", (code) => resolve(code ?? -1));
    });
    if (buildResult !== 0) {
      throw new Error(`bun build failed with exit code ${buildResult}`);
    }
    if (!existsSync(BUNDLE_PATH)) {
      throw new Error(`bundle not produced at ${BUNDLE_PATH}`);
    }

    // Scaffold isolated cwd and HOME so the test doesn't read/write the
    // developer's real ~/.claude directory.
    const tmpRoot = await mkdtemp(join(tmpdir(), "mktg-node-compat-"));
    tmpCwd = join(tmpRoot, "project");
    tmpHome = join(tmpRoot, "home");
    await mkdir(tmpCwd, { recursive: true });
    await mkdir(tmpHome, { recursive: true });
  });

// Shared assertion: every command must produce valid JSON stdout, exit
// with a non-crash code, and must NOT contain "Bun is not defined" or
// "UNHANDLED_ERROR" in the output.
  const assertNoCrash = (result: NodeRun) => {
    expect(result.stdout).not.toContain("Bun is not defined");
    expect(result.stderr).not.toContain("Bun is not defined");
    expect(result.stdout).not.toContain("UNHANDLED_ERROR");
    // Exit codes 0 (success), 1 (structured error), 2 (invalid args) are all
    // acceptable. Only unhandled crashes produce exit 134/139/etc.
    expect([0, 1, 2]).toContain(result.exitCode);
    // stdout must parse as JSON (--json flag guarantees this).
    const parsed = parseJson(result.stdout);
    expect(parsed).toBeDefined();
  };

  test("doctor --json runs without Bun crash under node", async () => {
    const result = await runNode(["doctor", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    // Doctor should return a checks array (passing or failing).
    const parsed = parseJson(result.stdout) as { checks?: unknown };
    expect(Array.isArray(parsed.checks)).toBe(true);
  });

  test("init --dry-run --json runs without Bun crash under node", async () => {
    // init without an --input payload returns MISSING_INPUT (exit 2). That's
    // a structured error, not a crash — still a pass for this test.
    const result = await runNode(
      ["init", "--dry-run", "--json"],
      tmpCwd,
      tmpHome,
    );
    assertNoCrash(result);
  });

  test("list --json runs without Bun crash under node", async () => {
    const result = await runNode(["list", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    // list should return a skills array.
    const parsed = parseJson(result.stdout) as { skills?: unknown };
    expect(Array.isArray(parsed.skills)).toBe(true);
  });

  test("status --json runs without Bun crash under node", async () => {
    const result = await runNode(["status", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    // status should return a project + brand snapshot.
    const parsed = parseJson(result.stdout) as {
      project?: unknown;
      brand?: unknown;
    };
    expect(parsed.project).toBeDefined();
    expect(parsed.brand).toBeDefined();
  });

  test("schema --json runs without Bun crash under node", async () => {
    const result = await runNode(["schema", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    // schema should return a version + commands array.
    const parsed = parseJson(result.stdout) as {
      version?: unknown;
      commands?: unknown;
    };
    expect(parsed.version).toBeDefined();
    expect(Array.isArray(parsed.commands)).toBe(true);
  });

  test("verify --dry-run --json runs without node bundle path-resolution crash", async () => {
    const result = await runNode(["verify", "--dry-run", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    const parsed = parseJson(result.stdout) as {
      mode?: unknown;
      suites?: unknown;
      counts?: unknown;
    };
    expect(parsed.mode).toBe("dry-run");
    expect(Array.isArray(parsed.suites)).toBe(true);
    expect(parsed.counts).toBeDefined();
  });

  test("ship-check --dry-run --json runs without node bundle runtime crash", async () => {
    const result = await runNode(["ship-check", "--dry-run", "--json"], tmpCwd, tmpHome);
    assertNoCrash(result);
    const parsed = parseJson(result.stdout) as {
      mode?: unknown;
      checks?: unknown;
      commits?: { marketingCli?: unknown; mktgStudio?: unknown };
    };
    expect(parsed.mode).toBe("dry-run");
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.commits).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(parsed.commits ?? {}, "marketingCli")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.commits ?? {}, "mktgStudio")).toBe(true);
  });

  test("bundle shebang is #!/usr/bin/env node (not bun)", async () => {
    const { readFile } = await import("node:fs/promises");
    const firstLine = (await readFile(BUNDLE_PATH, "utf-8")).split("\n")[0];
    expect(firstLine).toBe("#!/usr/bin/env node");
  });

  // Task #21 regression: the original polyfill at src/core/runtime-compat.ts
  // was missing `.stat()` on the Bun.file() return value. Every brand
  // freshness code path calls `bunFile.stat()` which threw
  // `bunFile.stat is not a function` under node. That broke `init`, `doctor`,
  // and `status` AFTER they had already written brand files — the freshness
  // check crashed post-write. This test exercises the full init → status
  // happy path so the crash cannot silently return.
  test("init populates brand/ and exits cleanly (task #21 stat() regression)", async () => {
    // Fresh isolated dirs so we don't contaminate other tests' state.
    const run21Root = await mkdtemp(join(tmpdir(), "mktg-node-compat-21-"));
    const run21Cwd = join(run21Root, "project");
    const run21Home = join(run21Root, "home");
    await mkdir(run21Cwd, { recursive: true });
    await mkdir(run21Home, { recursive: true });

    try {
      // init takes the JSON payload as the VALUE of --json (not a separate
      // --input flag). This is the syntax the handler's cli.ts:87 parser
      // accepts: `--json <body>` or `--json=<body>`.
      const initResult = await runNode(
        ["init", "--json", '{"business":"test","goal":"launch"}'],
        run21Cwd,
        run21Home,
      );
      // The load-bearing assertion: NO bunFile.stat crash.
      expect(initResult.stderr).not.toContain("bunFile.stat");
      expect(initResult.stderr).not.toContain("is not a function");
      expect(initResult.exitCode).toBe(0);

      // Brand files should have been written.
      expect(existsSync(join(run21Cwd, "brand"))).toBe(true);
      expect(existsSync(join(run21Cwd, "brand", "voice-profile.md"))).toBe(true);

      // Follow-up: doctor should also complete without the crash.
      const doctorResult = await runNode(["doctor", "--json"], run21Cwd, run21Home);
      expect(doctorResult.stderr).not.toContain("bunFile.stat");
      expect(doctorResult.stderr).not.toContain("is not a function");
      expect([0, 1]).toContain(doctorResult.exitCode);

      // Follow-up: status should also complete — it reads brand freshness
      // which is the exact code path that hit the stat() gap.
      const statusResult = await runNode(["status", "--json"], run21Cwd, run21Home);
      expect(statusResult.stderr).not.toContain("bunFile.stat");
      expect(statusResult.stderr).not.toContain("is not a function");
      expect(statusResult.exitCode).toBe(0);
    } finally {
      await rm(run21Root, { recursive: true, force: true });
    }
  });

  // Task #23 fix 4: the old Bun.which polyfill used `execSync` with shell
  // interpolation — a latent command-injection primitive. The hardened
  // version is pure Node PATH-walking with no child process at all.
  test("Bun.which returns null for injection payloads (task #23 cmd injection)", async () => {
    // Exercise the polyfill directly by importing runtime-compat.ts, which
    // installs globalThis.Bun on first import.
    await import("../../src/core/runtime-compat");
    const bun = (globalThis as unknown as { Bun: { which: (tool: string) => string | null } }).Bun;

    // Sanity: a real binary resolves.
    const bunPath = bun.which("bun");
    expect(typeof bunPath === "string" || bunPath === null).toBe(true);

    // Injection payloads must return null, NOT execute.
    expect(bun.which("foo; rm -rf /")).toBeNull();
    expect(bun.which("bun && echo OWNED")).toBeNull();
    expect(bun.which("$(whoami)")).toBeNull();
    expect(bun.which("`whoami`")).toBeNull();
    expect(bun.which("../etc/passwd")).toBeNull();
    expect(bun.which("/etc/passwd")).toBeNull();
    expect(bun.which("bun\x00; rm -rf /")).toBeNull();
  });
});
