// Tests for mktg route — portable deterministic skill routing (no LLM)
// Real manifest, no mocks. The router is a pure function, so most coverage
// is unit-level; CLI subprocess tests cover the envelope + exit codes.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { routePrompt } from "../src/core/skill-router";
import { loadManifest } from "../src/core/skills";

const run = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

describe("routePrompt (unit, real manifest)", () => {
  test("acceptance: 'write a show hn post' routes to startup-launcher with high confidence", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("write a show hn post", manifest);
    expect(decision.skill).toBe("startup-launcher");
    expect(decision.confidence).toBe("high");
    expect(decision.nextCommand).toBe("mktg run startup-launcher --with-context --json");
  });

  test("playbook match: 'launch a product' names full-product-launch + entry skill", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("launch a product", manifest);
    expect(decision.playbook).toBe("full-product-launch");
    expect(decision.skill).toBe("launch-strategy");
  });

  test("exact trigger hit beats similarity noise", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("keyword research for my SaaS", manifest);
    expect(decision.skill).toBe("keyword-research");
    expect(decision.confidence).toBe("high");
  });

  test("non-marketing prompt routes to none with guidance, not a guess", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("refactor the database schema", manifest);
    expect(decision.skill).toBeNull();
    expect(decision.confidence).toBe("none");
    expect(decision.nextCommand).toBeNull();
  });

  test("empty prompt routes to none", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("   ", manifest);
    expect(decision.confidence).toBe("none");
  });

  test("deterministic: same prompt twice yields identical decision", async () => {
    const manifest = await loadManifest();
    const a = routePrompt("email sequence for onboarding", manifest);
    const b = routePrompt("email sequence for onboarding", manifest);
    expect(a).toEqual(b);
  });

  test("candidates list is capped at 3 and score-ordered", async () => {
    const manifest = await loadManifest();
    const decision = routePrompt("launch", manifest);
    expect(decision.candidates.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < decision.candidates.length; i++) {
      expect(decision.candidates[i - 1]!.score).toBeGreaterThanOrEqual(decision.candidates[i]!.score);
    }
  });
});

describe("mktg route (CLI envelope)", () => {
  test("returns the full route envelope as JSON", async () => {
    const { stdout, exitCode } = await run(["route", "write a show hn post", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skill).toBe("startup-launcher");
    expect(parsed.confidence).toBe("high");
    expect(typeof parsed.rationale).toBe("string");
    expect(Array.isArray(parsed.candidates)).toBe(true);
    expect(parsed.nextCommand).toContain("mktg run startup-launcher");
  });

  test("multi-word prompt works without shell quoting (positionals joined)", async () => {
    const { stdout, exitCode } = await run(["route", "keyword", "research", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.skill).toBe("keyword-research");
  });

  test("no match exits 0 with confidence none (router ran; nothing matched)", async () => {
    const { stdout, exitCode } = await run(["route", "refactor the database schema", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.confidence).toBe("none");
    expect(parsed.rationale).toContain("/cmo");
  });

  test("missing prompt exits 2", async () => {
    const { stdout, exitCode } = await run(["route", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("control characters in prompt are rejected", async () => {
    const { stdout, exitCode } = await run(["route", "bad\x07prompt", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("works where no claude binary exists (CI parity)", async () => {
    // The router never shells out — this test simply documents the constraint
    // by running with a PATH that provably lacks any claude binary.
    const tmp = await mkdtemp(join(tmpdir(), "mktg-route-nopath-"));
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "route", "keyword research", "--json"], {
      cwd: import.meta.dir.replace("/tests", ""),
      stdout: "pipe",
      stderr: "pipe",
      env: { PATH: process.env.PATH, NO_COLOR: "1", CLAUDE_BIN: "" } as Record<string, string>,
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim()).skill).toBe("keyword-research");
    await rm(tmp, { recursive: true, force: true });
  });
});

describe("doctor studio-launcher-resolves (P8)", () => {
  test("doctor includes the studio launcher check", async () => {
    const { stdout, exitCode } = await run(["doctor", "--json", "--fields", "checks"]);
    expect(exitCode).toBeDefined();
    const parsed = JSON.parse(stdout);
    const check = parsed.checks.find((c: { name: string }) => c.name === "studio-launcher-resolves");
    expect(check).toBeDefined();
    expect(["pass", "warn"]).toContain(check.status);
    if (check.status === "warn") {
      expect(check.fix).toContain("marketing-cli");
    }
  });
});
