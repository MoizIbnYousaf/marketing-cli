import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { scaffoldBrand } from "../../src/core/brand";

const projectRoot = import.meta.dir.replace("/tests/integration", "");
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-dashboard-"));
  await Bun.write(join(tempDir, "package.json"), JSON.stringify({ name: "dashboard-project" }));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const run = async (args: string[]): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--cwd", tempDir, ...args], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
};

describe("dashboard snapshot contract", () => {
  test("returns a typed dashboard snapshot", async () => {
    await scaffoldBrand(tempDir);
    const { stdout, exitCode } = await run(["dashboard", "snapshot", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.project.name).toBe("dashboard-project");
    expect(parsed.project.root).toBe(tempDir);
    expect(parsed.health).toBeDefined();
    expect(parsed.foundations.brandSummary).toBeDefined();
    expect(Array.isArray(parsed.foundations.files)).toBe(true);
    expect(Array.isArray(parsed.integrations)).toBe(true);
    expect(Array.isArray(parsed.activity.recent)).toBe(true);
    expect(Array.isArray(parsed.nextActions)).toBe(true);
    expect(parsed.biggestGap).toBeDefined();
    expect(parsed.publishReadiness).toBeDefined();
    expect(parsed.emptyState.stage).toBeDefined();
  });

  test("dry-run launch returns local session metadata", async () => {
    const { stdout, exitCode } = await run(["dashboard", "--json", "--dry-run"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.launched).toBe(false);
    expect(parsed.mode).toBe("local-first");
    expect(typeof parsed.sessionToken).toBe("string");
    expect(typeof parsed.url).toBe("string");
  });
});

describe("dashboard plan contract", () => {
  test("returns planner-focused dashboard data", async () => {
    await scaffoldBrand(tempDir);
    const { stdout, exitCode } = await run(["dashboard", "plan", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(typeof parsed.generatedAt).toBe("string");
    expect(typeof parsed.summary).toBe("string");
    expect(Array.isArray(parsed.tasks)).toBe(true);
  });
});

describe("dashboard outputs contract", () => {
  test("returns runs and outputs data with publish readiness", async () => {
    await scaffoldBrand(tempDir);
    await mkdir(join(tempDir, "marketing"), { recursive: true });
    await Bun.write(join(tempDir, "marketing", "brief.md"), "# Launch brief");

    const { stdout, exitCode } = await run(["dashboard", "outputs", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.publishReadiness).toBeDefined();
    expect(Array.isArray(parsed.recentRuns)).toBe(true);
    expect(Array.isArray(parsed.outputs)).toBe(true);
  });
});

describe("dashboard publish contract", () => {
  test("returns publish readiness, adapters, and manifests", async () => {
    await scaffoldBrand(tempDir);
    await mkdir(join(tempDir, "campaigns", "launch"), { recursive: true });
    await Bun.write(
      join(tempDir, "campaigns", "launch", "publish.json"),
      JSON.stringify({
        name: "Launch campaign",
        items: [{ type: "social", adapter: "file", content: "Hello world" }],
      }),
    );

    const { stdout, exitCode } = await run(["dashboard", "publish", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.publishReadiness).toBeDefined();
    expect(Array.isArray(parsed.adapters)).toBe(true);
    expect(Array.isArray(parsed.manifests)).toBe(true);
    expect(parsed.adapters.map((adapter: { adapter: string }) => adapter.adapter)).toEqual([
      "mktg-native",
      "postiz",
      "typefully",
      "resend",
      "file",
    ]);
  });
});

describe("dashboard system contract", () => {
  test("returns system diagnostics and capability index", async () => {
    await scaffoldBrand(tempDir);
    const { stdout, exitCode } = await run(["dashboard", "system", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.health).toBeDefined();
    expect(parsed.integrations).toBeDefined();
    expect(parsed.skills).toBeDefined();
    expect(parsed.agents).toBeDefined();
    expect(Array.isArray(parsed.capabilityIndex)).toBe(true);
  });
});

describe("dashboard compete contract", () => {
  test("returns honest competitive summary data", async () => {
    const { stdout, exitCode } = await run(["dashboard", "compete", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(typeof parsed.trackedCount).toBe("number");
    expect(typeof parsed.scannedCount).toBe("number");
    expect(Array.isArray(parsed.targets)).toBe(true);
  });
});

describe("dashboard publish contract", () => {
  test("returns publish readiness, adapters, and manifests", async () => {
    await scaffoldBrand(tempDir);
    await mkdir(join(tempDir, "campaigns", "launch"), { recursive: true });
    await Bun.write(
      join(tempDir, "campaigns", "launch", "publish.json"),
      JSON.stringify({
        name: "launch-campaign",
        items: [{ type: "file", adapter: "file", content: "hello world" }],
      }),
    );

    const { stdout, exitCode } = await run(["dashboard", "publish", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.publishReadiness).toBeDefined();
    expect(Array.isArray(parsed.adapters)).toBe(true);
    expect(Array.isArray(parsed.manifests)).toBe(true);
    expect(Array.isArray(parsed.recentActions)).toBe(true);
    expect(parsed.adapters[0].adapter).toBe("mktg-native");
  });
});

describe("dashboard system contract", () => {
  test("returns health, integrations, and capability index", async () => {
    await scaffoldBrand(tempDir);
    const { stdout, exitCode } = await run(["dashboard", "system", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(parsed.health).toBeDefined();
    expect(parsed.skills).toBeDefined();
    expect(parsed.agents).toBeDefined();
    expect(Array.isArray(parsed.integrations)).toBe(true);
    expect(Array.isArray(parsed.capabilityIndex)).toBe(true);
  });
});

describe("dashboard compete contract", () => {
  test("returns honest tracked-competitor summary without requiring network fetch", async () => {
    await scaffoldBrand(tempDir);
    await mkdir(join(tempDir, ".mktg", "compete"), { recursive: true });
    await Bun.write(
      join(tempDir, ".mktg", "compete", "watchlist.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            url: "https://competitor.example",
            addedAt: new Date().toISOString(),
            lastScan: null,
            lastTitle: null,
          },
        ],
      }),
    );

    const { stdout, exitCode } = await run(["dashboard", "compete", "--json"]);
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout);
    expect(parsed.version).toBe("1");
    expect(typeof parsed.trackedCount).toBe("number");
    expect(typeof parsed.scannedCount).toBe("number");
    expect(Array.isArray(parsed.targets)).toBe(true);
    expect(parsed.nextAction).toBeDefined();
  });
});

describe("dashboard action contract", () => {
  test("open_file rejects traversal", async () => {
    const payload = {
      actionId: "a1",
      snapshotVersion: "1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      type: "open_file",
      payload: { path: "../secret.txt" },
    };

    const { stdout, exitCode } = await run([
      "dashboard",
      "action",
      "--json",
      "--input",
      JSON.stringify(payload),
    ]);

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("copy_command resolves cleanly", async () => {
    const payload = {
      actionId: "a2",
      snapshotVersion: "1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      type: "copy_command",
      payload: { command: "mktg doctor --json" },
    };

    const { stdout, exitCode } = await run([
      "dashboard",
      "action",
      "--json",
      "--input",
      JSON.stringify(payload),
    ]);

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.allowed).toBe(true);
    expect(parsed.command).toBe("mktg doctor --json");
  });
});
