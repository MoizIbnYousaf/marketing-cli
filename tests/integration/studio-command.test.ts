// E2E tests for `mktg studio` command.
// No mocks. Real Bun.spawn of the bundled CLI against a real filesystem PATH
// for the missing-binary case, plus a real temporary shim on PATH for the
// preview-with-resolved-binary case. Also invokes the handler directly.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { GlobalFlags } from "../../src/types";
import { handler as studioHandler, schema as studioSchema } from "../../src/commands/studio";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const CLI_ENTRY = join(REPO_ROOT, "src/cli.ts");

// Absolute path to bun so we can invoke the CLI even when we scrub PATH in
// tests that exercise the MISSING_DEPENDENCY branch.
const BUN_BIN = Bun.which("bun") ?? "bun";

// Build a PATH that deliberately omits mktg-studio. We keep /usr/bin and /bin
// so routine shell tooling works if the child needs it, but neither contains
// mktg-studio. We invoke bun by absolute path, so this PATH is intentionally
// barren of JS tooling.
const SAFE_EMPTY_PATH = "/usr/bin:/bin";

let shimDir: string;
let shimPath: string;

beforeAll(async () => {
  shimDir = await mkdtemp(join(tmpdir(), "mktg-studio-shim-"));
  shimPath = join(shimDir, "mktg-studio");
  // A tiny shim that answers --version and otherwise prints a marker. The
  // handler only invokes --version in preview mode; we never hit the other
  // branch in tests because we never run in interactive launch mode.
  await writeFile(
    shimPath,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "mktg-studio 0.9.9-test"
  exit 0
fi
echo "studio-shim-invoked-with: $@"
`,
  );
  await chmod(shimPath, 0o755);
});

afterAll(async () => {
  await rm(shimDir, { recursive: true, force: true });
});

const baseFlags = (overrides: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true,
  dryRun: true,
  fields: [],
  cwd: process.cwd(),
  jsonInput: undefined,
  ...overrides,
});

describe("mktg studio — schema", () => {
  test("schema declares name, --open flag, and key output fields", () => {
    expect(studioSchema.name).toBe("studio");
    const flagNames = studioSchema.flags.map((f) => f.name);
    expect(flagNames).toContain("--open");
    expect(flagNames).toContain("--intent");
    expect(flagNames).toContain("--session");
    expect(Object.keys(studioSchema.output)).toEqual(
      expect.arrayContaining(["mode", "binary", "version", "argv", "env", "urls", "exitCode"]),
    );
    expect(studioSchema.examples.length).toBeGreaterThan(0);
  });
});

describe("mktg studio — handler (direct)", () => {
  test("preview mode works without the companion binary on PATH", async () => {
    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    process.env.PATH = SAFE_EMPTY_PATH;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    try {
      const result = await studioHandler([], baseFlags());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mode).toBe("preview");
      expect(result.data.binary).toBe("mktg-studio");
      expect(result.data.version).toBe("unresolved");
      expect(result.data.exitCode).toBeNull();
      expect(result.exitCode).toBe(0);
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
    }
  });

  test("interactive launch returns MISSING_DEPENDENCY (exit 3) when binary is not on PATH", async () => {
    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    process.env.PATH = SAFE_EMPTY_PATH;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    try {
      const result = await studioHandler([], baseFlags({ dryRun: false, json: false }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("MISSING_DEPENDENCY");
      expect(result.error.message).toContain("mktg-studio");
      expect(result.error.suggestions.length).toBeGreaterThan(0);
      expect(result.error.suggestions.some((s) => s.includes("MKTG_STUDIO_BIN"))).toBe(true);
      expect(result.error.suggestions.some((s) => s.includes("bun link"))).toBe(true);
      expect(result.error.suggestions.some((s) => s.includes("sibling checkout"))).toBe(true);
      // mktg-studio is maintainer-only today; the suggestion list should not
      // direct users at an unpublished npm package.
      expect(result.error.suggestions.some((s) => s.includes("npm i -g mktg-studio"))).toBe(false);
      expect(result.exitCode).toBe(3);
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
    }
  });

  test("preview mode resolves binary + version + forwards --open when PATH has shim", async () => {
    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    process.env.PATH = `${shimDir}:${SAFE_EMPTY_PATH}`;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    try {
      const result = await studioHandler(["--open"], baseFlags());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mode).toBe("preview");
      expect(result.data.binary).toBe(shimPath);
      expect(result.data.version).toBe("mktg-studio 0.9.9-test");
      expect(result.data.argv).toEqual(["--open"]);
      expect(result.data.env.STUDIO_PORT).toBe("3001");
      expect(result.data.env.DASHBOARD_PORT).toBe("3000");
      expect(result.data.urls.dashboard).toBe("http://localhost:3000");
      expect(result.data.urls.api).toBe("http://localhost:3001");
      expect(result.data.exitCode).toBeNull();
      expect(result.exitCode).toBe(0);
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
    }
  });

  test("preview mode resolves the in-repo studio/ subfolder and forwards CMO startup args", async () => {
    // The marketing-cli repo now ships mktg-studio as a workspace member
    // under `studio/`. The resolver prefers that local subfolder over any
    // sibling checkout or PATH binary so a fresh clone boots the dashboard
    // without a second checkout.
    const result = await studioHandler(["--open", "--intent", "cmo", "--session", "abc123"], baseFlags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("preview");
    expect(result.data.binary).toEndWith("/studio/bin/mktg-studio.ts");
    expect(result.data.binary).toBe(join(REPO_ROOT, "studio/bin/mktg-studio.ts"));
    expect(result.data.version).toMatch(/^mktg-studio /);
    expect(result.data.argv).toEqual(["--open", "--intent", "cmo", "--session", "abc123"]);
    expect(result.data.urls.dashboard).toBe("http://localhost:3000/dashboard?mode=cmo&session=abc123");
  });

  test("preview mode does not hang when a companion binary ignores --version", async () => {
    const hangDir = await mkdtemp(join(tmpdir(), "mktg-studio-hang-shim-"));
    const hangShim = join(hangDir, "mktg-studio");
    await writeFile(
      hangShim,
      `#!/bin/sh
if [ "$1" = "--version" ]; then
  sleep 5
  exit 0
fi
echo "studio-shim-invoked-with: $@"
`,
    );
    await chmod(hangShim, 0o755);

    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    process.env.PATH = `${hangDir}:${SAFE_EMPTY_PATH}`;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    try {
      const startedAt = Date.now();
      const result = await studioHandler([], baseFlags());
      const elapsedMs = Date.now() - startedAt;

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mode).toBe("preview");
      expect(result.data.version).toBe("unknown");
      expect(elapsedMs).toBeLessThan(2500);
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
      await rm(hangDir, { recursive: true, force: true });
    }
  });

  test("preview honors custom STUDIO_PORT / DASHBOARD_PORT from env", async () => {
    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    const originalStudio = process.env.STUDIO_PORT;
    const originalDash = process.env.DASHBOARD_PORT;
    process.env.PATH = `${shimDir}:${SAFE_EMPTY_PATH}`;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    process.env.STUDIO_PORT = "5001";
    process.env.DASHBOARD_PORT = "5000";
    try {
      const result = await studioHandler([], baseFlags());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.env).toEqual({ STUDIO_PORT: "5001", DASHBOARD_PORT: "5000" });
      expect(result.data.urls).toEqual({
        dashboard: "http://localhost:5000",
        api: "http://localhost:5001",
      });
      expect(result.data.argv).toEqual([]);
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
      if (originalStudio === undefined) delete process.env.STUDIO_PORT;
      else process.env.STUDIO_PORT = originalStudio;
      if (originalDash === undefined) delete process.env.DASHBOARD_PORT;
      else process.env.DASHBOARD_PORT = originalDash;
    }
  });

  test("--json alone (without --dry-run) still uses preview mode (no spawn)", async () => {
    const originalPath = process.env.PATH;
    const originalDisableLocal = process.env.MKTG_STUDIO_DISABLE_LOCAL;
    process.env.PATH = `${shimDir}:${SAFE_EMPTY_PATH}`;
    process.env.MKTG_STUDIO_DISABLE_LOCAL = "1";
    try {
      const result = await studioHandler([], baseFlags({ dryRun: false }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // With flags.json=true, handler must return preview envelope without
      // spawning the long-running child. Otherwise bun:test would hang.
      expect(result.data.mode).toBe("preview");
    } finally {
      process.env.PATH = originalPath;
      if (originalDisableLocal === undefined) delete process.env.MKTG_STUDIO_DISABLE_LOCAL;
      else process.env.MKTG_STUDIO_DISABLE_LOCAL = originalDisableLocal;
    }
  });
});

describe("mktg studio — via CLI entry (real bun spawn)", () => {
  test("`bun run src/cli.ts studio --json` returns preview without spawning", async () => {
    const proc = Bun.spawn({
      cmd: [BUN_BIN, "run", CLI_ENTRY, "studio", "--json"],
      env: { ...process.env, PATH: SAFE_EMPTY_PATH, MKTG_STUDIO_DISABLE_LOCAL: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.mode).toBe("preview");
    expect(parsed.binary).toBe("mktg-studio");
    expect(parsed.version).toBe("unresolved");
    expect(parsed.exitCode).toBeNull();
  });

  test("`bun run src/cli.ts studio --dry-run --json` with shim on PATH returns preview", async () => {
    const proc = Bun.spawn({
      cmd: [BUN_BIN, "run", CLI_ENTRY, "studio", "--dry-run", "--json", "--open"],
      env: { ...process.env, PATH: `${shimDir}:${SAFE_EMPTY_PATH}`, MKTG_STUDIO_DISABLE_LOCAL: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // cli.ts writes the success payload directly (no ok/data wrapper on stdout).
    expect(parsed.mode).toBe("preview");
    expect(parsed.binary).toBe(shimPath);
    expect(parsed.argv).toEqual(["--open"]);
  });

  test("`bun run src/cli.ts schema studio --json` includes the studio schema", async () => {
    const proc = Bun.spawn({
      cmd: [BUN_BIN, "run", CLI_ENTRY, "schema", "studio", "--json"],
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("studio");
    expect(parsed.responseSchema).toBeDefined();
    const fields = parsed.responseSchema.map((f: { field: string }) => f.field);
    expect(fields).toEqual(
      expect.arrayContaining(["mode", "binary", "version", "argv", "env", "urls", "exitCode"]),
    );
  });

  test("`--fields urls` filters to only the urls field", async () => {
    const proc = Bun.spawn({
      cmd: [
        BUN_BIN,
        "run",
        CLI_ENTRY,
        "studio",
        "--dry-run",
        "--json",
        "--fields",
        "urls",
      ],
      env: { ...process.env, PATH: `${shimDir}:${SAFE_EMPTY_PATH}`, MKTG_STUDIO_DISABLE_LOCAL: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Object.keys(parsed)).toEqual(["urls"]);
    expect(parsed.urls.dashboard).toBe("http://localhost:3000");
  });
});
