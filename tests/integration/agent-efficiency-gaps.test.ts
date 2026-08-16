// Regression tests for the agent-efficiency / robustness gaps:
// minimal default schemas, pre-computed aggregates, definitive empty states,
// truncation size hints, unknown-flag rejection (root + short form), and
// non-interactive init under --json. Real subprocesses + real temp dirs.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { handler as listHandler } from "../../src/commands/list";
import { handler as schemaHandler } from "../../src/commands/schema";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { handler as competeHandler } from "../../src/commands/compete";
import { handler as statusHandler } from "../../src/commands/status";
import { handler as catalogHandler } from "../../src/commands/catalog";
import { truncateHeadWithHint, truncateTailWithHint } from "../../src/core/output";
import { truncateToTokens } from "../../src/core/context-compiler";
import type { GlobalFlags } from "../../src/types";

const ROOT = import.meta.dir.replace("/tests/integration", "");
const flags = (cwd = ROOT, extra: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true, dryRun: false, fields: [], cwd, jsonInput: undefined, ...extra,
});

const runCli = async (args: string[], opts: { cwd?: string; stdin?: "ignore" | "pipe" } = {}) => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    stdin: opts.stdin ?? "ignore",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { stdout: stdout.trim(), stderr, exitCode: await proc.exited };
};

describe("P2 minimal defaults: mktg list", () => {
  test("default skill items carry exactly name, category, tier, installed", async () => {
    const result = await listHandler([], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const s of result.data.skills) {
      expect(Object.keys(s).sort()).toEqual(["category", "installed", "name", "tier"]);
    }
    expect(result.data.help.some((h) => h.includes("--verbose"))).toBe(true);
    expect(typeof result.data.agentTotal).toBe("number");
    expect(result.data.externalTotal).toBe(result.data.external_skills.length);
  });

  test("--verbose adds layer/triggers/versions; --routing implies verbose", async () => {
    const verbose = await listHandler(["--verbose"], flags());
    const routing = await listHandler(["--routing"], flags());
    expect(verbose.ok && routing.ok).toBe(true);
    if (!verbose.ok || !routing.ok) return;
    expect(Array.isArray(verbose.data.skills[0]!.triggers)).toBe(true);
    expect(typeof verbose.data.skills[0]!.layer).toBe("string");
    expect(Array.isArray(routing.data.skills[0]!.triggers)).toBe(true);
  });

  test("--fields naming a verbose field opts in (no UNKNOWN_FIELD)", async () => {
    const { stdout, exitCode } = await runCli(["list", "--json", "--fields", "skills.name,skills.triggers"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.skills.triggers)).toBe(true);
  });

  test("default payload is well under the 10KB warning threshold budget of the old 33KB", async () => {
    const { stdout } = await runCli(["list", "--json"]);
    expect(stdout.length).toBeLessThan(15_000);
  });
});

describe("P2/P3: mktg schema compact index", () => {
  test("bare schema is a compact index with typed responseSchema and help", async () => {
    const result = await schemaHandler([], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { full: boolean; help: string[]; commands: Array<Record<string, unknown>> };
    expect(data.full).toBe(false);
    expect(data.help.some((h) => h.includes("--full"))).toBe(true);
    const skill = data.commands.find((c) => c.name === "skill")!;
    expect(skill.examples).toBeUndefined();
    expect(skill.output).toBeUndefined();
    expect(Array.isArray(skill.responseSchema)).toBe(true);
    for (const sub of skill.subcommands as Array<Record<string, unknown>>) {
      expect(Object.keys(sub).sort()).toEqual(["description", "name"]);
    }
  });

  test("--full restores examples/output/subcommand detail and is larger", async () => {
    const compact = await runCli(["schema", "--json"]);
    const full = await runCli(["schema", "--full", "--json"]);
    expect(compact.exitCode).toBe(0);
    expect(full.exitCode).toBe(0);
    expect(full.stdout.length).toBeGreaterThan(compact.stdout.length * 1.5);
    const parsed = JSON.parse(full.stdout);
    expect(parsed.full).toBe(true);
    expect(parsed.commands.find((c: { name: string }) => c.name === "doctor").examples.length).toBeGreaterThan(0);
  });

  test("group-command --help in JSON mode is a compact index", async () => {
    const { stdout, exitCode } = await runCli(["skill", "--help", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("skill");
    expect(parsed.subcommands.every((s: Record<string, unknown>) => s.flags === undefined)).toBe(true);
    expect(parsed.help.some((h: string) => h.includes("--full"))).toBe(true);
    const full = await runCli(["skill", "--help", "--full", "--json"]);
    expect(JSON.parse(full.stdout).subcommands[0].flags).toBeDefined();
  });
});

describe("P4 aggregates: mktg doctor summary", () => {
  test("doctor emits summary counts + summaryText consistent with checks", async () => {
    const result = await doctorHandler([], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { checks, summary, summaryText, passed } = result.data;
    expect(summary.total).toBe(checks.length);
    expect(summary.passed).toBe(checks.filter((c) => c.status === "pass").length);
    expect(summary.warned).toBe(checks.filter((c) => c.status === "warn").length);
    expect(summary.failed).toBe(checks.filter((c) => c.status === "fail").length);
    expect(summaryText).toBe(`${summary.passed} passed, ${summary.warned} warned, ${summary.failed} failed`);
    expect(passed).toBe(summary.failed === 0);
  });
});

describe("P5 empty states: compete / status / catalog", () => {
  test("compete scan with nothing tracked returns total 0 + message + help", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mktg-compete-empty-"));
    try {
      const result = await competeHandler(["scan"], flags(dir));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const data = result.data as Record<string, unknown>;
      expect(data.results).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.changed).toBe(0);
      expect(String(data.message)).toContain("mktg compete watch");
      expect(Array.isArray(data.help)).toBe(true);
      const list = await competeHandler(["list"], flags(dir));
      if (list.ok) {
        const ld = list.data as Record<string, unknown>;
        expect(ld.total).toBe(0);
        expect(typeof ld.message).toBe("string");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("status exposes recentActivityCount, integrationsSummary, brandAttention", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mktg-status-empty-"));
    try {
      const result = await statusHandler([], flags(dir));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.recentActivityCount).toBe(0);
      expect(Object.keys(result.data.recentActivity)).toHaveLength(0);
      const total = result.data.integrationsSummary.configured.length + result.data.integrationsSummary.missing.length;
      expect(total).toBe(Object.keys(result.data.integrations).length);
      // No brand dir → every file needs attention
      expect(result.data.brandAttention.length).toBe(Object.keys(result.data.brand).length);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("catalog list is compact by default with configured per item", async () => {
    const result = await catalogHandler(["list"], flags());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { catalogs: Array<Record<string, unknown>>; help: string[] };
    for (const c of data.catalogs) {
      expect(Object.keys(c).sort()).toEqual(["capabilities", "configured", "license", "name", "version_pinned"]);
    }
    expect(data.help.some((h) => h.includes("--verbose"))).toBe(true);
    // --fields naming a verbose-only key opts in
    const viaFields = await catalogHandler(["list"], flags(ROOT, { fields: ["catalogs.auth"] }));
    expect(viaFields.ok).toBe(true);
    if (viaFields.ok) expect((viaFields.data as { catalogs: Array<Record<string, unknown>> }).catalogs[0]!.auth).toBeDefined();
  });
});

describe("P3 truncation hints", () => {
  test("head/tail helpers state total size and recovery hint", () => {
    const body = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const head = truncateHeadWithHint(body, 100, "use --full");
    expect(head.truncated).toBe(true);
    expect(head.text).toContain(`${body.length} chars total`);
    expect(head.text).toContain("use --full");
    const tail = truncateTailWithHint(body, 100, "run it directly");
    expect(tail).toContain(`${body.length} chars total`);
    expect(tail.endsWith("line 199")).toBe(true);
    expect(truncateTailWithHint("short", 100, "x")).toBe("short");
  });

  test("context-compiler token truncation carries the size hint", () => {
    const body = "word ".repeat(2000);
    const { text, truncated } = truncateToTokens(body, 50);
    expect(truncated).toBe(true);
    expect(text).toContain("chars total");
    expect(text).toContain("--budget");
  });
});

describe("P6 fail loud: unknown flags at root and short form", () => {
  test("mktg --bogus-flag exits 2 with UNKNOWN_FLAG", async () => {
    const { stdout, exitCode } = await runCli(["--bogus-flag", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("UNKNOWN_FLAG");
    expect(parsed.error.message).toContain("--bogus-flag");
  });

  test("mktg status -x exits 2; -v/-h/-y still accepted", async () => {
    const bad = await runCli(["status", "-x", "--json"]);
    expect(bad.exitCode).toBe(2);
    expect(JSON.parse(bad.stdout).error.code).toBe("UNKNOWN_FLAG");
    const ver = await runCli(["-v"]);
    expect(ver.exitCode).toBe(0);
    const dir = await mkdtemp(join(tmpdir(), "mktg-init-y-"));
    try {
      const init = await runCli(["init", "-y", "--skip-skills", "--skip-agents", "--json", "--cwd", dir]);
      expect(init.exitCode).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("root help without stray flags still exits 0", async () => {
    const { exitCode } = await runCli(["--help", "--json"]);
    expect(exitCode).toBe(0);
  });
});

describe("P6 never prompt: init --json under a real PTY", () => {
  test("init --json on a TTY never opens the readline prompt", async () => {
    // Allocate a PTY via `script` so process.stdout.isTTY is true inside the
    // CLI (the exact situation an agent in tmux/herdr hits). Pre-fix this
    // blocked on two readline questions; now it must exit 0 with defaults.
    const script = Bun.which("script");
    if (!script) return; // no PTY helper on this platform — nothing to assert
    const dir = await mkdtemp(join(tmpdir(), "mktg-init-pty-"));
    try {
      const inner = ["bun", "run", "src/cli.ts", "init", "--json", "--skip-skills", "--skip-agents", "--cwd", dir];
      const argv = process.platform === "darwin"
        ? [script, "-q", "/dev/null", ...inner]
        : [script, "-q", "-e", "-c", inner.map((a) => `'${a}'`).join(" "), "/dev/null"];
      const proc = Bun.spawn(argv, { cwd: ROOT, stdout: "pipe", stderr: "pipe", stdin: "ignore", env: { ...process.env, NO_COLOR: "1" } });
      const exit = await Promise.race([proc.exited, new Promise<number>((r) => setTimeout(() => r(-1), 30_000))]);
      if (exit === -1) proc.kill();
      expect(exit).toBe(0);
      const out = await new Response(proc.stdout).text();
      expect(out).toContain('"created"');
      expect(out).not.toContain("What's the business/project?");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
