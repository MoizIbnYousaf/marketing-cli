import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  schema,
  handler,
  compareSemver,
  setLatestVersionFetcher,
  setUpgradeRunner,
} from "../src/commands/update";
import type { GlobalFlags } from "../src/types";

const flags = (overrides: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
  jsonInput: undefined,
  ...overrides,
});

describe("update.ts schema", () => {
  it("has correct command name", () => {
    expect(schema.name).toBe("update");
  });

  it("documents all output fields", () => {
    const fields = Object.keys(schema.output);
    // sync-mode fields preserved for backwards compatibility
    expect(fields).toContain("skills.updated");
    expect(fields).toContain("skills.unchanged");
    expect(fields).toContain("skills.notBundled");
    expect(fields).toContain("agents.updated");
    expect(fields).toContain("agents.unchanged");
    expect(fields).toContain("agents.notBundled");
    expect(fields).toContain("versionChanges");
    expect(fields).toContain("totalSkills");
    expect(fields).toContain("totalAgents");
    expect(fields).toContain("agentError");
    // new check/upgrade-mode fields
    expect(fields).toContain("mode");
    expect(fields).toContain("current");
    expect(fields).toContain("latest");
    expect(fields).toContain("upgradeAvailable");
    expect(fields).toContain("upgradeCommand");
    expect(fields).toContain("executed");
    expect(fields).toContain("exitCode");
  });

  it("has examples covering --json, --dry-run, --check, --upgrade", () => {
    const argStrings = schema.examples.map((e) => e.args);
    expect(argStrings.some((a) => a.includes("--json"))).toBe(true);
    expect(argStrings.some((a) => a.includes("--dry-run"))).toBe(true);
    expect(argStrings.some((a) => a.includes("--check"))).toBe(true);
    expect(argStrings.some((a) => a.includes("--upgrade"))).toBe(true);
  });

  it("declares --check and --upgrade flags", () => {
    const flagNames = schema.flags.map((f) => f.name);
    expect(flagNames).toContain("--check");
    expect(flagNames).toContain("--upgrade");
  });

  it("has vocabulary for agent discovery", () => {
    expect(schema.vocabulary).toBeDefined();
    expect(schema.vocabulary!.length).toBeGreaterThan(0);
    expect(schema.vocabulary).toContain("upgrade");
  });
});

describe("compareSemver", () => {
  it("returns negative when a < b", () => {
    expect(compareSemver("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareSemver("1.2.3", "1.10.0")).toBeLessThan(0);
    expect(compareSemver("0.5.3", "0.5.4")).toBeLessThan(0);
  });
  it("returns positive when a > b", () => {
    expect(compareSemver("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareSemver("1.10.0", "1.2.3")).toBeGreaterThan(0);
  });
  it("returns 0 when equal", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });
  it("strips leading 'v' and prerelease suffix", () => {
    expect(compareSemver("v1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("1.2.3-rc.1", "1.2.3")).toBe(0);
  });
});

describe("update --check", () => {
  let restoreFetcher: () => Promise<{ ok: true; version: string } | { ok: false; reason: string }>;

  afterEach(() => {
    if (restoreFetcher) setLatestVersionFetcher(restoreFetcher);
  });

  it("reports upgrade available when registry returns newer version", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({
      ok: true,
      version: "999.0.0",
    }));
    const result = await handler(["--check"], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      mode: "check",
      latest: "999.0.0",
      upgradeAvailable: true,
      upgradeCommand: "npm i -g marketing-cli@latest",
    });
    expect(typeof (result.data as any).current).toBe("string");
  });

  it("reports up-to-date when registry version matches", async () => {
    const pkg = (await import("../package.json")).default as { version: string };
    restoreFetcher = setLatestVersionFetcher(async () => ({
      ok: true,
      version: pkg.version,
    }));
    const result = await handler(["--check"], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as any).upgradeAvailable).toBe(false);
    expect((result.data as any).current).toBe(pkg.version);
    expect((result.data as any).latest).toBe(pkg.version);
  });

  it("returns NETWORK error envelope when registry is unreachable", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({
      ok: false,
      reason: "Failed to reach npm registry: ENOTFOUND",
    }));
    const result = await handler(["--check"], flags());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("REGISTRY_UNREACHABLE");
    expect(result.exitCode).toBe(5);
    expect(result.error.suggestions.join(" ")).toContain("npm i -g marketing-cli@latest");
  });

  it("--check + --json round-trips through JSON.stringify cleanly", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: "999.0.0" }));
    const result = await handler(["--check"], flags({ json: true }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.data);
    const parsed = JSON.parse(json);
    expect(parsed.mode).toBe("check");
    expect(parsed.upgradeAvailable).toBe(true);
    expect(parsed.upgradeCommand).toBe("npm i -g marketing-cli@latest");
  });
});

describe("update --upgrade", () => {
  let restoreFetcher:
    | (() => Promise<{ ok: true; version: string } | { ok: false; reason: string }>)
    | undefined;
  let restoreRunner:
    | (() => Promise<{ exitCode: number; stdout: string; stderr: string; eaccess: boolean }>)
    | undefined;

  beforeEach(() => {
    restoreFetcher = undefined;
    restoreRunner = undefined;
  });

  afterEach(() => {
    if (restoreFetcher) setLatestVersionFetcher(restoreFetcher);
    if (restoreRunner) setUpgradeRunner(restoreRunner);
  });

  it("--dry-run returns plan with executed=false and does not invoke the runner", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: "999.0.0" }));
    let runnerCalled = false;
    restoreRunner = setUpgradeRunner(async () => {
      runnerCalled = true;
      return { exitCode: 0, stdout: "", stderr: "", eaccess: false };
    });
    const result = await handler(["--upgrade"], flags({ dryRun: true }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(runnerCalled).toBe(false);
    expect((result.data as any).mode).toBe("upgrade");
    expect((result.data as any).executed).toBe(false);
    expect((result.data as any).upgradeAvailable).toBe(true);
    expect((result.data as any).upgradeCommand).toBe("npm i -g marketing-cli@latest");
  });

  it("when no upgrade available: exits 0 with executed=false, no spawn", async () => {
    const pkg = (await import("../package.json")).default as { version: string };
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: pkg.version }));
    let runnerCalled = false;
    restoreRunner = setUpgradeRunner(async () => {
      runnerCalled = true;
      return { exitCode: 0, stdout: "", stderr: "", eaccess: false };
    });
    const result = await handler(["--upgrade"], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(runnerCalled).toBe(false);
    expect((result.data as any).upgradeAvailable).toBe(false);
    expect((result.data as any).executed).toBe(false);
    expect(result.exitCode).toBe(0);
  });

  it("successful upgrade reports executed=true and exitCode 0", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: "999.0.0" }));
    restoreRunner = setUpgradeRunner(async () => ({
      exitCode: 0,
      stdout: "added 1 package in 2s\n",
      stderr: "",
      eaccess: false,
    }));
    const result = await handler(["--upgrade"], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as any).executed).toBe(true);
    expect((result.data as any).exitCode).toBe(0);
    expect((result.data as any).stdout).toContain("added 1 package");
  });

  it("EACCES failure surfaces sudo / user-prefix guidance", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: "999.0.0" }));
    restoreRunner = setUpgradeRunner(async () => ({
      exitCode: 243,
      stdout: "",
      stderr:
        "npm ERR! code EACCES\nnpm ERR! syscall mkdir\nnpm ERR! path /usr/local/lib/node_modules\n",
      eaccess: true,
    }));
    const result = await handler(["--upgrade"], flags());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NPM_PERMISSION_DENIED");
    const blob = result.error.suggestions.join("\n");
    expect(blob).toMatch(/sudo mktg update --upgrade/);
    expect(blob).toMatch(/nvm|fnm|volta/);
  });

  it("non-EACCES npm failure reports NPM_UPGRADE_FAILED with manual command", async () => {
    restoreFetcher = setLatestVersionFetcher(async () => ({ ok: true, version: "999.0.0" }));
    restoreRunner = setUpgradeRunner(async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "npm ERR! 404 Not Found - GET https://registry.npmjs.org/marketing-cli@latest",
      eaccess: false,
    }));
    const result = await handler(["--upgrade"], flags());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NPM_UPGRADE_FAILED");
    expect(result.error.suggestions.join(" ")).toContain("npm i -g marketing-cli@latest");
  });
});

describe("update flag combinations", () => {
  it("rejects --check + --upgrade together with INVALID_ARGS", async () => {
    const result = await handler(["--check", "--upgrade"], flags());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_ARGS");
    expect(result.exitCode).toBe(2);
  });
});
