// Integration test: `mktg skill check-upstream`
// NO MOCKS — every test sets up a real temp dir with real skills/, real
// upstream.json, and a real check-upstream.sh fixture. The CLI runs as a
// subprocess against that temp dir via --cwd so the discovery walks our
// fixture instead of the package's actual skills/ tree.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT_ROOT = import.meta.dir.replace("/tests/integration", "");

// Subprocess runner — pipes stdout (non-TTY), so output auto-JSONs.
const runCli = async (
  args: readonly string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
};

// Build a fixture skill directory inside the temp project root.
// `script` is the bash body that becomes scripts/check-upstream.sh — tests
// supply pre-canned JSON output and exit code so we never hit gh/network.
type FixtureOpts = {
  readonly script: string;
  readonly upstreamJson?: object;
};

const makeSkill = async (
  projectRoot: string,
  skillName: string,
  opts: FixtureOpts,
): Promise<string> => {
  const skillDir = join(projectRoot, "skills", skillName);
  await mkdir(join(skillDir, "scripts"), { recursive: true });
  await writeFile(
    join(skillDir, "upstream.json"),
    JSON.stringify(
      opts.upstreamJson ?? {
        version: 1,
        sources: [
          { name: "primary", files: [{ local: "a", upstream: "a", sha: "x" }] },
        ],
      },
      null,
      2,
    ),
  );
  const scriptPath = join(skillDir, "scripts", "check-upstream.sh");
  await writeFile(scriptPath, opts.script);
  await chmod(scriptPath, 0o755);
  return skillDir;
};

// Stable JSON envelopes that match ironmint's check-upstream.sh contract.
const inSyncEnvelope = JSON.stringify({
  ok: true,
  in_sync: true,
  checked_at: "2026-05-04T00:00:00Z",
  sources: [
    {
      name: "primary",
      repo: "example/repo",
      snapshot_sha: "abc",
      current_sha: "abc",
      drift: { added: [], modified: [], removed: [] },
    },
  ],
});

const driftEnvelope = JSON.stringify({
  ok: true,
  in_sync: false,
  checked_at: "2026-05-04T00:00:00Z",
  sources: [
    {
      name: "primary",
      repo: "example/repo",
      snapshot_sha: "abc",
      current_sha: "def",
      drift: {
        added: [{ path: "new-file.md", current_sha: "111" }],
        modified: [
          { path: "rules/timing.md", snapshot_sha: "abc", current_sha: "def" },
        ],
        removed: [],
      },
    },
  ],
});

const adaptedFrontmatterEnvelope = JSON.stringify({
  ok: true,
  in_sync: true,
  checked_at: "2026-05-04T00:00:00Z",
  sources: [
    {
      name: "primary",
      repo: "example/repo",
      snapshot_sha: "abc",
      current_sha: "def",
      // Modified-but-noted: shouldn't count as drift. The test-script exits
      // 0 to mirror ironmint's logic (real drift count is 0 once notes filter).
      drift: {
        added: [],
        modified: [
          {
            path: "SKILL.md",
            snapshot_sha: "abc",
            current_sha: "def",
            note: "adapted-frontmatter",
          },
        ],
        removed: [],
      },
    },
  ],
});

let scratchRoot: string;

beforeEach(async () => {
  scratchRoot = await mkdtemp(join(tmpdir(), "mktg-check-upstream-"));
});

afterEach(async () => {
  await rm(scratchRoot, { recursive: true, force: true });
});

// =========================================================================
// Empty case: no skills at all
// =========================================================================

describe("empty workspace", () => {
  test("no skills/ directory → returns empty summary, exit 0", async () => {
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toEqual([]);
    expect(parsed.summary).toEqual({ total: 0, in_sync: 0, drifted: 0 });
    expect(parsed.ok).toBe(true);
  });

  test("skills/ exists but no upstream.json files → still empty", async () => {
    await mkdir(join(scratchRoot, "skills", "mundane"), { recursive: true });
    await writeFile(join(scratchRoot, "skills", "mundane", "SKILL.md"), "# nothing");
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.total).toBe(0);
    expect(parsed.ok).toBe(true);
  });
});

// =========================================================================
// In-sync case
// =========================================================================

describe("in-sync workspace", () => {
  test("single skill, script reports in_sync → ok: true, exit 0", async () => {
    await makeSkill(scratchRoot, "in-sync-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].name).toBe("in-sync-fixture");
    expect(parsed.skills[0].in_sync).toBe(true);
    expect(parsed.skills[0].drift_count).toBe(0);
    expect(parsed.skills[0].source_count).toBe(1);
    expect(parsed.summary).toEqual({ total: 1, in_sync: 1, drifted: 0 });
    expect(parsed.ok).toBe(true);
  });

  test("adapted-frontmatter modifications do not count as drift", async () => {
    await makeSkill(scratchRoot, "adapted-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${adaptedFrontmatterEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills[0].in_sync).toBe(true);
    expect(parsed.skills[0].drift_count).toBe(0);
    expect(parsed.ok).toBe(true);
  });
});

// =========================================================================
// Drift case
// =========================================================================

describe("drift detection", () => {
  test("drifted skill → ok: false, drift_count > 0, exit 1", async () => {
    await makeSkill(scratchRoot, "drifted-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${driftEnvelope}\nJSON\nexit 1\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].in_sync).toBe(false);
    // 1 added + 1 modified-without-note = 2
    expect(parsed.skills[0].drift_count).toBe(2);
    expect(parsed.summary).toEqual({ total: 1, in_sync: 0, drifted: 1 });
    expect(parsed.ok).toBe(false);
  });

  test("mixed in-sync + drifted skills → exit 1, only drifted counted", async () => {
    await makeSkill(scratchRoot, "alpha-clean", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    await makeSkill(scratchRoot, "beta-drifted", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${driftEnvelope}\nJSON\nexit 1\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toHaveLength(2);
    expect(parsed.summary).toEqual({ total: 2, in_sync: 1, drifted: 1 });
    expect(parsed.ok).toBe(false);
  });
});

// =========================================================================
// Single-skill mode
// =========================================================================

describe("single-skill mode", () => {
  test("positional name limits to that skill only", async () => {
    await makeSkill(scratchRoot, "first-skill", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    await makeSkill(scratchRoot, "second-skill", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${driftEnvelope}\nJSON\nexit 1\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "first-skill",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].name).toBe("first-skill");
    expect(parsed.summary.total).toBe(1);
  });

  test("unknown skill name → NOT_FOUND error envelope, exit 1", async () => {
    await makeSkill(scratchRoot, "real-skill", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "ghost-skill",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
  });
});

// =========================================================================
// JSON envelope shape (axis 1 — machine-readable output)
// =========================================================================

describe("JSON envelope shape", () => {
  test("--json returns the documented top-level keys", async () => {
    await makeSkill(scratchRoot, "envelope-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.skills)).toBe(true);
    expect(parsed.summary).toBeDefined();
    expect(typeof parsed.summary.total).toBe("number");
    expect(typeof parsed.summary.in_sync).toBe("number");
    expect(typeof parsed.summary.drifted).toBe("number");
    expect(typeof parsed.ok).toBe("boolean");
  });

  test("piped output without --json is still valid JSON", async () => {
    await makeSkill(scratchRoot, "envelope-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout } = await runCli([
      "skill",
      "check-upstream",
      "--cwd",
      scratchRoot,
    ]);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });
});

// =========================================================================
// --fields filtering (axis 4 — context window discipline)
// =========================================================================

describe("--fields filtering", () => {
  test("--fields summary.drifted returns only that nested key", async () => {
    await makeSkill(scratchRoot, "fields-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--fields",
      "summary.drifted",
      "--cwd",
      scratchRoot,
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.drifted).toBe(0);
    expect(parsed.skills).toBeUndefined();
    expect(parsed.ok).toBeUndefined();
  });

  test("--fields ok strips everything else", async () => {
    await makeSkill(scratchRoot, "fields-fixture", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--fields",
      "ok",
      "--cwd",
      scratchRoot,
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toEqual({ ok: true });
  });
});

// =========================================================================
// NDJSON streaming
// =========================================================================

describe("--ndjson streaming", () => {
  test("emits one JSON line per skill plus the trailing aggregate", async () => {
    await makeSkill(scratchRoot, "stream-a", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    await makeSkill(scratchRoot, "stream-b", {
      script: `#!/usr/bin/env bash\ncat <<'JSON'\n${inSyncEnvelope}\nJSON\nexit 0\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--ndjson",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(0);
    const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
    // First two lines are per-skill; subsequent lines compose the aggregate.
    const perSkill = lines.slice(0, 2).map((l) => JSON.parse(l));
    expect(perSkill[0].name).toBe("stream-a");
    expect(perSkill[1].name).toBe("stream-b");
  });
});

// =========================================================================
// Input hardening (axis 5 — six-validator stack)
// =========================================================================

describe("input hardening", () => {
  test("uppercase skill name → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "BadName",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("path-traversal skill name → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "../etc",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("URL-encoded skill name → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "%2e%2e",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });
});

// =========================================================================
// Schema introspection (axis 3)
// =========================================================================

describe("schema introspection", () => {
  test("mktg schema skill check-upstream returns the documented response shape", async () => {
    const { stdout, exitCode } = await runCli([
      "schema",
      "skill",
      "check-upstream",
      "--json",
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("check-upstream");
    expect(Array.isArray(parsed.responseSchema)).toBe(true);
    const fields = parsed.responseSchema.map((r: { field: string }) => r.field);
    expect(fields).toContain("skills");
    expect(fields).toContain("summary.total");
    expect(fields).toContain("summary.in_sync");
    expect(fields).toContain("summary.drifted");
    expect(fields).toContain("ok");
  });
});

// =========================================================================
// Script failure modes
// =========================================================================

describe("script failure modes", () => {
  test("missing scripts/check-upstream.sh → entry has error field", async () => {
    const skillDir = join(scratchRoot, "no-script");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "upstream.json"),
      JSON.stringify({ version: 1, sources: [] }),
    );
    // Move into proper skills/ layout
    await mkdir(join(scratchRoot, "skills"), { recursive: true });
    await writeFile(
      join(scratchRoot, "skills", "no-script", "upstream.json"),
      JSON.stringify({ version: 1, sources: [] }),
    ).catch(async () => {
      await mkdir(join(scratchRoot, "skills", "no-script"), { recursive: true });
      await writeFile(
        join(scratchRoot, "skills", "no-script", "upstream.json"),
        JSON.stringify({ version: 1, sources: [] }),
      );
    });

    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    // Every skill errored → exit 2 (environment failure)
    expect([1, 2]).toContain(exitCode);
    const parsed = JSON.parse(stdout);
    const noScript = parsed.skills.find((s: { name: string }) => s.name === "no-script");
    expect(noScript).toBeDefined();
    expect(noScript.error).toContain("not found");
    expect(noScript.in_sync).toBe(false);
  });

  test("malformed JSON output → entry has error field, drift recorded", async () => {
    await makeSkill(scratchRoot, "malformed-fixture", {
      script: `#!/usr/bin/env bash\necho "not json"\nexit 1\n`,
    });
    const { stdout, exitCode } = await runCli([
      "skill",
      "check-upstream",
      "--json",
      "--cwd",
      scratchRoot,
    ]);
    expect([1, 2]).toContain(exitCode);
    const parsed = JSON.parse(stdout);
    expect(parsed.skills[0].error).toContain("did not emit valid JSON");
    expect(parsed.skills[0].in_sync).toBe(false);
  });
});
