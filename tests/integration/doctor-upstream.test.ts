// Integration test: `mktg doctor` upstream-mirrored skills check
// NO MOCKS. Real temp dir + real upstream.json fixtures + real fetched_at
// timestamps. Covers the staleness path (default mode) and the live-check
// path (--check-upstream) using a deterministic fixture script that exits
// 0 (in-sync) or 1 (drifted) without touching the network.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GlobalFlags } from "../../src/types";
import { handler as doctorHandler } from "../../src/commands/doctor";

let tempDir: string;
let flags: GlobalFlags;

const findUpstreamCheck = (
  checks: readonly { name: string; status: string; detail: string; fix?: string }[],
  skill: string,
) => checks.find((c) => c.name === `upstream-${skill}`);

const writeUpstreamSkill = async (
  root: string,
  name: string,
  fetchedAt: string,
  withScript = false,
  scriptExit = 0,
): Promise<void> => {
  const skillDir = join(root, "skills", name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "upstream.json"),
    JSON.stringify({
      version: 1,
      fetched_at: fetchedAt,
      tool: "/mktg-steal",
      sources: [
        {
          name: "primary",
          repo: "example/repo",
          branch: "main",
          snapshot_sha: "abc",
          upstream_root: "skills/source",
          local_root: `skills/${name}`,
          files: [],
        },
      ],
    }),
  );
  if (withScript) {
    await mkdir(join(skillDir, "scripts"), { recursive: true });
    const scriptPath = join(skillDir, "scripts", "check-upstream.sh");
    await writeFile(
      scriptPath,
      `#!/usr/bin/env bash\necho '{"ok":true,"in_sync":${scriptExit === 0 ? "true" : "false"}}'\nexit ${scriptExit}\n`,
    );
    await chmod(scriptPath, 0o755);
  }
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-doctor-upstream-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("doctor upstream-mirrored skills check", () => {
  test("fresh upstream.json (today) → pass", async () => {
    await writeUpstreamSkill(tempDir, "fresh-skill", new Date().toISOString());
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const check = findUpstreamCheck(result.data.checks, "fresh-skill");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
    expect(check!.detail).toContain("fresh");
  });

  test("stale upstream.json (40 days ago) → warn with fix hint", async () => {
    const stale = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await writeUpstreamSkill(tempDir, "stale-skill", stale);
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const check = findUpstreamCheck(result.data.checks, "stale-skill");
    expect(check).toBeDefined();
    expect(check!.status).toBe("warn");
    expect(check!.detail).toContain("stale");
    expect(check!.fix).toContain("mktg skill check-upstream stale-skill");
  });

  test("missing fetched_at → warn", async () => {
    const skillDir = join(tempDir, "skills", "no-fetched-at");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "upstream.json"),
      JSON.stringify({ version: 1, sources: [] }),
    );
    const result = await doctorHandler([], flags);
    if (!result.ok) return;
    const check = findUpstreamCheck(result.data.checks, "no-fetched-at");
    expect(check).toBeDefined();
    expect(check!.status).toBe("warn");
    expect(check!.detail).toContain("missing fetched_at");
  });

  test("--check-upstream invokes the live drift script", async () => {
    await writeUpstreamSkill(tempDir, "live-clean", new Date().toISOString(), true, 0);
    await writeUpstreamSkill(tempDir, "live-drifted", new Date().toISOString(), true, 1);
    const result = await doctorHandler(["--check-upstream"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const clean = findUpstreamCheck(result.data.checks, "live-clean");
    const drifted = findUpstreamCheck(result.data.checks, "live-drifted");
    expect(clean!.status).toBe("pass");
    expect(clean!.detail).toContain("in sync");
    expect(drifted!.status).toBe("warn");
    expect(drifted!.detail).toContain("drift detected");
    expect(drifted!.fix).toContain("mktg skill upgrade live-drifted");
  });

  test("no skills directory → no upstream checks emitted (does not crash)", async () => {
    const result = await doctorHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const upstreamChecks = result.data.checks.filter((c) => c.name.startsWith("upstream-"));
    expect(upstreamChecks).toHaveLength(0);
  });
});
