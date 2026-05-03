// mktg ship-check — Aggregated go/no-go verdict across the mktgmono ecosystem
//
// Thin wrapper on top of M1 (mktg verify) + adds the checks that verify
// doesn't own: git cleanliness, typecheck, tool health (mktg doctor),
// version/tag consistency, studio runtime (if reachable). Returns a
// structured ShipCheckReport with a 🟢/🟡/🔴 verdict.
//
// Verdict mapping:
//   🟢 every blocking check passed                → exit 0
//   🟡 non-blocking warnings present              → exit 1 (SHIP_CHECK_WARN)
//   🔴 one or more blocking checks failed         → exit 2 (SHIP_CHECK_BLOCK)
//
// Full report is written to ~/.mktg/ship-check/<iso-ts>.json regardless
// of verdict so the structured data is retrievable even when the command
// exits non-zero. The err() path surfaces the summary path in suggestions.
//
// Agent DX 21/21 notes:
//  - Axis 1: structured ShipCheckReport envelope, no prose
//  - Axis 3: schema exposes every check name + verdict enum
//  - Axis 4: --fields works over checks[].verdict / verdict / blockers[]
//  - Axis 5: --skip values validated against known check names
//  - Axis 6: --dry-run lists what would run, zero side effects
//
// M3 consumes M1's exported helpers (parseBunTestStats, runSuite) and
// M1's summary file at ~/.mktg/verify/<ts>.json. This keeps M3 thin.

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { isTTY, writeStderr, bold, dim, green, yellow, red } from "../core/output";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type CheckVerdict = "pass" | "warn" | "fail" | "skipped";

export type CheckCategory = "repo" | "tests" | "tools" | "versions" | "runtime";

export interface ShipCheck {
  readonly name: string;
  readonly category: CheckCategory;
  readonly verdict: CheckVerdict;
  /** One-line human summary. */
  readonly detail: string;
  /** Optional evidence — file path, command output, URL. */
  readonly evidence?: string;
  /** When true, a fail verdict triggers 🔴. When false, only 🟡. */
  readonly blocking: boolean;
  readonly durationMs: number;
  readonly skipReason?: string;
}

export type ShipVerdict = "🟢" | "🟡" | "🔴";

export interface ShipCheckReport {
  readonly verdict: ShipVerdict;
  readonly timestamp: string;
  readonly mktgmonoRoot: string;
  readonly checks: readonly ShipCheck[];
  /** `detail` strings of every blocking fail check. */
  readonly blockers: readonly string[];
  /** `detail` strings of every non-blocking fail or warn. */
  readonly warnings: readonly string[];
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly warned: number;
    readonly failed: number;
    readonly skipped: number;
  };
  readonly commits: {
    readonly marketingCli: string | null;
    readonly mktgStudio: string | null;
  };
  readonly durationMs: number;
  readonly summaryPath: string;
  readonly mode: "dry-run" | "execute";
}

// ------------------------------------------------------------------
// Check registry
// ------------------------------------------------------------------

interface CheckDefinition {
  readonly name: string;
  readonly category: CheckCategory;
  readonly blocking: boolean;
  readonly description: string;
}

const CHECKS: readonly CheckDefinition[] = [
  { name: "marketing-cli-clean", category: "repo", blocking: true,
    description: "marketing-cli working tree has no uncommitted changes" },
  { name: "mktg-studio-clean", category: "repo", blocking: true,
    description: "mktg-studio working tree has no uncommitted changes" },
  { name: "marketing-cli-typecheck", category: "tests", blocking: true,
    description: "marketing-cli passes bun x tsc --noEmit" },
  { name: "mktg-studio-typecheck", category: "tests", blocking: true,
    description: "mktg-studio passes bun x tsc --noEmit" },
  { name: "mktg-doctor", category: "tools", blocking: false,
    description: "mktg doctor reports no failing checks" },
  { name: "mktg-verify", category: "tests", blocking: true,
    description: "mktg verify --fail-fast passes (consumed from cached summary or fresh)" },
  { name: "version-tag-consistency", category: "versions", blocking: false,
    description: "marketing-cli package.json version matches latest git tag" },
  { name: "studio-health", category: "runtime", blocking: false,
    description: "studio /api/health responds 200 (when running)" },
];

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

export const schema: CommandSchema = {
  name: "ship-check",
  description:
    "Aggregated go/no-go verdict for shipping. Runs every check (git, tests, tools, versions, runtime), aggregates into 🟢/🟡/🔴, and writes a durable summary to ~/.mktg/ship-check/.",
  flags: [
    { name: "--dry-run", type: "boolean", required: false, default: false,
      description: "List every check that would run without executing. Zero side effects." },
    { name: "--verbose", type: "boolean", required: false, default: false,
      description: "Include full evidence (command output, file contents) in each check. Warning: inflates response size." },
    { name: "--skip", type: "string", required: false,
      description: "Comma-separated list of check names to skip. Validated against registry." },
    { name: "--fresh", type: "string", required: false, default: "true",
      description: "'true' (default) spawns mktg verify fresh. 'false' reads the most recent ~/.mktg/verify/<ts>.json summary — faster, but stale." },
  ],
  output: {
    verdict: "'🟢' | '🟡' | '🔴' — 🟢 all green, 🟡 non-blocking warnings, 🔴 blockers present",
    timestamp: "string — ISO 8601 when the check completed",
    mktgmonoRoot: "string — absolute path to the monorepo root",
    checks: "ShipCheck[] — one entry per check with name, category, verdict, detail, evidence, blocking, durationMs",
    "checks.*.verdict": "'pass' | 'warn' | 'fail' | 'skipped'",
    "checks.*.category": "'repo' | 'tests' | 'tools' | 'versions' | 'runtime'",
    blockers: "string[] — detail lines from every blocking fail check",
    warnings: "string[] — detail lines from every non-blocking fail or warn check",
    summary: "{ total, passed, warned, failed, skipped } — aggregate counts",
    commits: "{ marketingCli, mktgStudio } — HEAD SHA from each repo (null if git unavailable)",
    durationMs: "number — wall-clock time for the full run",
    summaryPath: "string — absolute path to the written summary JSON",
    mode: "'dry-run' | 'execute'",
  },
  examples: [
    { args: "mktg ship-check --json", description: "Full run, exit 0/1/2 mapped to verdict" },
    { args: "mktg ship-check --dry-run --json", description: "Plan — list every check without running" },
    { args: "mktg ship-check --json --fresh=false", description: "Reuse the last mktg verify summary (fast; may be stale)" },
    { args: "mktg ship-check --json --skip studio-health,version-tag-consistency", description: "Skip the named optional checks" },
    { args: "mktg ship-check --json --fields verdict,blockers", description: "CI-friendly: just the verdict + blockers" },
  ],
  vocabulary: ["ship-check", "ship-it", "go/no-go", "launch-readiness", "verdict"],
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const resolveMonorepoRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
  const cliRootCandidates = [resolve(here, "..", ".."), resolve(here, "..")];
  for (const marketingCliRoot of cliRootCandidates) {
    if (!existsSync(join(marketingCliRoot, "package.json")) || !existsSync(join(marketingCliRoot, "skills-manifest.json"))) {
      continue;
    }
    const candidate = resolve(marketingCliRoot, "..");
    if (existsSync(join(candidate, "marketing-cli"))) {
      return candidate;
    }
    return dirname(marketingCliRoot);
  }
  return join(homedir(), "projects", "mktgmono");
};

const parseFlagValue = (args: readonly string[], name: string): string | undefined => {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === name && args[i + 1]) return args[i + 1];
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
};

/** Run a shell command, capture output, return {exitCode, stdout, stderr, durationMs}. */
const spawnAndCapture = async (
  cmd: readonly string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> => {
  return new Promise((resolveResult) => {
    const started = performance.now();
    const proc = spawn(cmd[0]!, cmd.slice(1), {
      cwd,
      env: process.env,
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
    proc.on("error", (error) => {
      resolveResult({
        exitCode: 1,
        stdout,
        stderr: stderr ? `${stderr}\n${String(error)}` : String(error),
        durationMs: Math.round(performance.now() - started),
      });
    });
    proc.on("close", (code) => {
      resolveResult({
        exitCode: code ?? 1,
        stdout,
        stderr,
        durationMs: Math.round(performance.now() - started),
      });
    });
  });
};

const currentCliCommand = (...args: string[]): string[] => {
  const entry = process.argv[1];
  if (!entry) {
    return ["mktg", ...args];
  }
  return [process.execPath, entry, ...args];
};

// ------------------------------------------------------------------
// Individual checks
// ------------------------------------------------------------------

const checkGitClean = async (name: string, repoPath: string, verbose: boolean, blocking: boolean, category: CheckCategory): Promise<ShipCheck> => {
  if (!existsSync(repoPath)) {
    return { name, category, verdict: "skipped", detail: `${repoPath} not present`, blocking, durationMs: 0, skipReason: "repo path missing" };
  }
  const r = await spawnAndCapture(["git", "status", "--porcelain"], repoPath);
  const clean = r.exitCode === 0 && r.stdout.trim() === "";
  return {
    name,
    category,
    verdict: clean ? "pass" : "fail",
    detail: clean ? "working tree clean" : `${r.stdout.trim().split("\n").length} uncommitted change(s)`,
    ...(verbose && !clean ? { evidence: r.stdout.trim() } : {}),
    blocking,
    durationMs: r.durationMs,
  };
};

const checkTypecheck = async (name: string, repoPath: string, verbose: boolean, blocking: boolean): Promise<ShipCheck> => {
  if (!existsSync(repoPath)) {
    return { name, category: "tests", verdict: "skipped", detail: `${repoPath} not present`, blocking, durationMs: 0, skipReason: "repo path missing" };
  }
  const r = await spawnAndCapture(["bun", "x", "tsc", "--noEmit"], repoPath);
  return {
    name,
    category: "tests",
    verdict: r.exitCode === 0 ? "pass" : "fail",
    detail: r.exitCode === 0 ? "tsc clean" : `tsc reported errors (exit ${r.exitCode})`,
    ...(verbose || r.exitCode !== 0 ? { evidence: (r.stdout + r.stderr).trim().slice(-4_000) } : {}),
    blocking,
    durationMs: r.durationMs,
  };
};

const checkMktgDoctor = async (cliRoot: string, verbose: boolean): Promise<ShipCheck> => {
  const r = await spawnAndCapture(
    currentCliCommand("doctor", "--json"),
    cliRoot,
  );
  try {
    const body = JSON.parse(r.stdout) as { passed?: boolean; checks?: Array<{ name: string; status: string }> };
    const failed = (body.checks ?? []).filter((c) => c.status === "fail").map((c) => c.name);
    const warned = (body.checks ?? []).filter((c) => c.status === "warn").length;
    return {
      name: "mktg-doctor",
      category: "tools",
      verdict: body.passed === true ? "pass" : failed.length > 0 ? "fail" : "warn",
      detail: body.passed
        ? `doctor passed (${body.checks?.length ?? 0} checks, ${warned} warnings)`
        : failed.length > 0
          ? `doctor failed: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? `, +${failed.length - 3}` : ""}`
          : `doctor has ${warned} warning(s), no failures`,
      ...(verbose ? { evidence: r.stdout.slice(0, 4_000) } : {}),
      blocking: false,
      durationMs: r.durationMs,
    };
  } catch {
    return {
      name: "mktg-doctor",
      category: "tools",
      verdict: "fail",
      detail: `could not parse doctor --json output (exit ${r.exitCode})`,
      evidence: (r.stdout + r.stderr).slice(-1_000),
      blocking: false,
      durationMs: r.durationMs,
    };
  }
};

const checkMktgVerify = async (cliRoot: string, fresh: boolean, verbose: boolean): Promise<ShipCheck> => {
  const started = performance.now();

  // Prefer cached summary when --fresh=false.
  if (!fresh) {
    const verifyDir = join(homedir(), ".mktg", "verify");
    if (existsSync(verifyDir)) {
      try {
        const files = (await readdir(verifyDir)).filter((f) => f.endsWith(".json")).sort();
        const latest = files[files.length - 1];
        if (latest) {
          const body = JSON.parse(await readFile(join(verifyDir, latest), "utf-8")) as {
            mode?: string; counts?: { failed?: number; errored?: number; passed?: number }; execution?: { summaryPath: string };
          };
          const failed = body.counts?.failed ?? 0;
          const errored = body.counts?.errored ?? 0;
          return {
            name: "mktg-verify",
            category: "tests",
            verdict: failed === 0 && errored === 0 ? "pass" : "fail",
            detail: failed === 0 && errored === 0
              ? `cached verify: ${body.counts?.passed ?? 0} suites passed (from ${latest})`
              : `cached verify: ${failed} failed + ${errored} errored (from ${latest})`,
            evidence: body.execution?.summaryPath ?? join(verifyDir, latest),
            blocking: true,
            durationMs: Math.round(performance.now() - started),
          };
        }
      } catch {
        // Fall through to fresh execution.
      }
    }
  }

  // Fresh: spawn mktg verify --json --parallel 4 --fail-fast
  const r = await spawnAndCapture(
    currentCliCommand("verify", "--json", "--parallel", "4", "--fail-fast"),
    cliRoot,
  );
  try {
    const body = JSON.parse(r.stdout) as { counts?: { failed?: number; errored?: number; passed?: number }; execution?: { summaryPath?: string } } | { error?: { message: string }; exitCode?: number };
    if ("error" in body && body.error) {
      return {
        name: "mktg-verify",
        category: "tests",
        verdict: "fail",
        detail: `mktg verify failed: ${body.error.message}`,
        ...(verbose ? { evidence: r.stdout.slice(0, 4_000) } : {}),
        blocking: true,
        durationMs: r.durationMs,
      };
    }
    const counts = (body as { counts?: { failed?: number; errored?: number; passed?: number } }).counts ?? {};
    const failed = counts.failed ?? 0;
    const errored = counts.errored ?? 0;
    const summaryPath = (body as { execution?: { summaryPath?: string } }).execution?.summaryPath;
    return {
      name: "mktg-verify",
      category: "tests",
      verdict: failed === 0 && errored === 0 ? "pass" : "fail",
      detail: failed === 0 && errored === 0
        ? `${counts.passed ?? 0} suites passed`
        : `${failed} failed + ${errored} errored`,
      ...(summaryPath ? { evidence: summaryPath } : {}),
      blocking: true,
      durationMs: r.durationMs,
    };
  } catch {
    return {
      name: "mktg-verify",
      category: "tests",
      verdict: "fail",
      detail: `could not parse mktg verify output (exit ${r.exitCode})`,
      evidence: (r.stdout + r.stderr).slice(-1_000),
      blocking: true,
      durationMs: r.durationMs,
    };
  }
};

const checkVersionTagConsistency = async (cliRoot: string, verbose: boolean): Promise<ShipCheck> => {
  const started = performance.now();
  try {
    const pkg = JSON.parse(await readFile(join(cliRoot, "package.json"), "utf-8")) as { version: string };
    const tagProc = await spawnAndCapture(["git", "describe", "--tags", "--abbrev=0"], cliRoot);
    const latestTag = tagProc.stdout.trim().replace(/^v/, "");
    if (tagProc.exitCode !== 0 || !latestTag) {
      return {
        name: "version-tag-consistency",
        category: "versions",
        verdict: "warn",
        detail: "no git tag found — version cannot be cross-checked",
        ...(verbose ? { evidence: `package.json: ${pkg.version}` } : {}),
        blocking: false,
        durationMs: Math.round(performance.now() - started),
      };
    }
    const match = pkg.version === latestTag;
    return {
      name: "version-tag-consistency",
      category: "versions",
      verdict: match ? "pass" : "warn",
      detail: match
        ? `package.json ${pkg.version} matches tag v${latestTag}`
        : `package.json ${pkg.version} does NOT match latest tag v${latestTag}`,
      ...(verbose ? { evidence: `package.json: ${pkg.version} · latest tag: v${latestTag}` } : {}),
      blocking: false,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    return {
      name: "version-tag-consistency",
      category: "versions",
      verdict: "warn",
      detail: `could not read version info: ${e instanceof Error ? e.message : String(e)}`,
      blocking: false,
      durationMs: Math.round(performance.now() - started),
    };
  }
};

const checkStudioHealth = async (verbose: boolean): Promise<ShipCheck> => {
  const started = performance.now();
  const url = `http://localhost:${process.env.STUDIO_PORT ?? "3001"}/api/health`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1_500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return {
      name: "studio-health",
      category: "runtime",
      verdict: res.status === 200 ? "pass" : "warn",
      detail: res.status === 200 ? `studio /api/health → 200` : `studio /api/health → ${res.status}`,
      ...(verbose ? { evidence: url } : {}),
      blocking: false,
      durationMs: Math.round(performance.now() - started),
    };
  } catch {
    return {
      name: "studio-health",
      category: "runtime",
      verdict: "skipped",
      detail: "studio not running (no connection on health port)",
      skipReason: "studio offline — start with `mktg studio` to include this check",
      blocking: false,
      durationMs: Math.round(performance.now() - started),
    };
  }
};

const readHeadSha = async (repoPath: string): Promise<string | null> => {
  if (!existsSync(repoPath)) return null;
  try {
    const r = await spawnAndCapture(["git", "rev-parse", "HEAD"], repoPath);
    if (r.exitCode !== 0) return null;
    return r.stdout.trim();
  } catch {
    return null;
  }
};

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

const aggregateVerdict = (checks: readonly ShipCheck[]): ShipVerdict => {
  const blockingFails = checks.filter((c) => c.blocking && c.verdict === "fail");
  if (blockingFails.length > 0) return "🔴";
  const warnsOrNonBlockingFails = checks.filter((c) => c.verdict === "warn" || (!c.blocking && c.verdict === "fail"));
  if (warnsOrNonBlockingFails.length > 0) return "🟡";
  return "🟢";
};

const printTty = (report: ShipCheckReport): void => {
  writeStderr("");
  writeStderr(`  ${bold("mktg ship-check")}  ${report.verdict}`);
  writeStderr("");
  for (const c of report.checks) {
    const icon =
      c.verdict === "pass" ? green("✓") :
      c.verdict === "warn" ? yellow("!") :
      c.verdict === "fail" ? red("✗") : dim("○");
    const tail = dim(`  ${c.category}${c.blocking ? "·blocking" : ""} · ${Math.round(c.durationMs)}ms`);
    writeStderr(`  ${icon} ${c.name.padEnd(32)} ${c.detail}${tail}`);
  }
  writeStderr("");
  const s = report.summary;
  writeStderr(
    `  ${green(`${s.passed} pass`)} · ${yellow(`${s.warned} warn`)} · ${red(`${s.failed} fail`)} · ${dim(`${s.skipped} skipped`)}`,
  );
  writeStderr(`  ${dim("summary:")} ${report.summaryPath}`);
  if (report.blockers.length > 0) {
    writeStderr("");
    writeStderr(`  ${red(bold("blockers:"))}`);
    for (const b of report.blockers) writeStderr(`    ${red("✗")} ${b}`);
  }
  writeStderr("");
};

export const handler: CommandHandler<ShipCheckReport> = async (args, flags) => {
  const verbose = args.includes("--verbose");
  const freshRaw = parseFlagValue(args, "--fresh") ?? "true";
  if (freshRaw !== "true" && freshRaw !== "false") {
    return err("INVALID_ARGS", `--fresh must be 'true' or 'false'; got '${freshRaw}'`, ["Example: --fresh=false"], 2);
  }
  const fresh = freshRaw === "true";

  const skipRaw = parseFlagValue(args, "--skip");
  const skipList: string[] = skipRaw ? skipRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  for (const n of skipList) {
    const ctrl = rejectControlChars(n, "skip");
    if (!ctrl.ok) return err("INVALID_ARGS", ctrl.message, [], 2);
    const id = validateResourceId(n, "skip");
    if (!id.ok) return err("INVALID_ARGS", id.message, [`Valid checks: ${CHECKS.map((c) => c.name).join(", ")}`], 2);
    if (!CHECKS.some((c) => c.name === n)) {
      return err("INVALID_ARGS", `Unknown check: '${n}'`, [`Valid checks: ${CHECKS.map((c) => c.name).join(", ")}`], 2);
    }
  }
  const shouldSkip = (name: string): boolean => skipList.includes(name);

  const mktgmonoRoot = resolveMonorepoRoot();
  const cliRoot = join(mktgmonoRoot, "marketing-cli");
  const studioRoot = join(mktgmonoRoot, "mktg-studio");
  const started = performance.now();
  const timestamp = new Date().toISOString();

  // --- Dry-run: list what would run ---
  if (flags.dryRun) {
    const checks: ShipCheck[] = CHECKS.map((d) => ({
      name: d.name,
      category: d.category,
      verdict: shouldSkip(d.name) ? "skipped" : "pass", // pass = "would run"; schema doc clarifies
      detail: shouldSkip(d.name) ? "skipped via --skip" : d.description,
      blocking: d.blocking,
      durationMs: 0,
      ...(shouldSkip(d.name) ? { skipReason: "explicitly skipped via --skip" } : {}),
    }));
    const [mktgCliSha, studioSha] = await Promise.all([readHeadSha(cliRoot), readHeadSha(studioRoot)]);
    const report: ShipCheckReport = {
      verdict: "🟢",
      timestamp,
      mktgmonoRoot,
      checks,
      blockers: [],
      warnings: [],
      summary: { total: checks.length, passed: checks.filter((c) => c.verdict === "pass").length, warned: 0, failed: 0, skipped: checks.filter((c) => c.verdict === "skipped").length },
      commits: { marketingCli: mktgCliSha, mktgStudio: studioSha },
      durationMs: Math.round(performance.now() - started),
      summaryPath: "(dry-run — no file written)",
      mode: "dry-run",
    };
    if (isTTY() && !flags.json) printTty(report);
    return ok(report);
  }

  // --- Execute all checks ---
  const skippedStub = (def: CheckDefinition): ShipCheck => ({
    name: def.name,
    category: def.category,
    verdict: "skipped",
    detail: "skipped via --skip",
    blocking: def.blocking,
    durationMs: 0,
    skipReason: "explicitly skipped via --skip",
  });

  const tasks: Array<Promise<ShipCheck>> = [];
  for (const def of CHECKS) {
    if (shouldSkip(def.name)) {
      tasks.push(Promise.resolve(skippedStub(def)));
      continue;
    }
    switch (def.name) {
      case "marketing-cli-clean":
        tasks.push(checkGitClean(def.name, cliRoot, verbose, def.blocking, "repo"));
        break;
      case "mktg-studio-clean":
        tasks.push(checkGitClean(def.name, studioRoot, verbose, def.blocking, "repo"));
        break;
      case "marketing-cli-typecheck":
        tasks.push(checkTypecheck(def.name, cliRoot, verbose, def.blocking));
        break;
      case "mktg-studio-typecheck":
        tasks.push(checkTypecheck(def.name, studioRoot, verbose, def.blocking));
        break;
      case "mktg-doctor":
        tasks.push(checkMktgDoctor(cliRoot, verbose));
        break;
      case "mktg-verify":
        tasks.push(checkMktgVerify(cliRoot, fresh, verbose));
        break;
      case "version-tag-consistency":
        tasks.push(checkVersionTagConsistency(cliRoot, verbose));
        break;
      case "studio-health":
        tasks.push(checkStudioHealth(verbose));
        break;
      default:
        tasks.push(Promise.resolve(skippedStub(def)));
    }
  }

  const checks = await Promise.all(tasks);
  const [mktgCliSha, studioSha] = await Promise.all([readHeadSha(cliRoot), readHeadSha(studioRoot)]);

  const blockers = checks.filter((c) => c.blocking && c.verdict === "fail").map((c) => `${c.name}: ${c.detail}`);
  const warnings = checks
    .filter((c) => c.verdict === "warn" || (!c.blocking && c.verdict === "fail"))
    .map((c) => `${c.name}: ${c.detail}`);

  const verdict = aggregateVerdict(checks);

  const summaryDir = join(homedir(), ".mktg", "ship-check");
  await mkdir(summaryDir, { recursive: true });
  const summaryPath = join(summaryDir, `${timestamp.replace(/[:.]/g, "-")}.json`);

  const report: ShipCheckReport = {
    verdict,
    timestamp,
    mktgmonoRoot,
    checks,
    blockers,
    warnings,
    summary: {
      total: checks.length,
      passed: checks.filter((c) => c.verdict === "pass").length,
      warned: checks.filter((c) => c.verdict === "warn").length,
      failed: checks.filter((c) => c.verdict === "fail").length,
      skipped: checks.filter((c) => c.verdict === "skipped").length,
    },
    commits: { marketingCli: mktgCliSha, mktgStudio: studioSha },
    durationMs: Math.round(performance.now() - started),
    summaryPath,
    mode: "execute",
  };

  await writeFile(summaryPath, JSON.stringify(report, null, 2));

  if (isTTY() && !flags.json) printTty(report);

  // Map verdict to exit code per the spec
  if (verdict === "🔴") {
    return err(
      "SHIP_CHECK_BLOCK",
      `ship-check: 🔴 ${blockers.length} blocker(s) — ${blockers.slice(0, 3).join(" | ")}${blockers.length > 3 ? ` | +${blockers.length - 3}` : ""}`,
      [`Summary: ${summaryPath}`, `Resolve each blocker, then re-run: mktg ship-check --json`],
      2,
    ) as unknown as CommandResult<ShipCheckReport>;
  }
  if (verdict === "🟡") {
    return err(
      "SHIP_CHECK_WARN",
      `ship-check: 🟡 ${warnings.length} warning(s) — ${warnings.slice(0, 3).join(" | ")}${warnings.length > 3 ? ` | +${warnings.length - 3}` : ""}`,
      [`Summary: ${summaryPath}`, `Non-blocking — shipping allowed. Review and decide.`],
      1,
    ) as unknown as CommandResult<ShipCheckReport>;
  }
  return ok(report);
};
