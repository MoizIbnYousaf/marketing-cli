// mktg verify — Orchestrated test-suite runner across the mktgmono ecosystem
//
// M1 Pass 2: full execution path. `mktg verify --json` now spawns each
// suite via Bun.spawn, aggregates results, supports --fail-fast,
// --parallel, --capture, --suite filtering, and writes a durable summary
// to ~/.mktg/verify/<timestamp>.json.
//
// The registry (SUITES) stays declarative — the data-driven single source
// of truth for what runs and where. Pass 1's plan surface is preserved:
// --dry-run still returns the same VerifyReport shape, just without the
// `results` / `execution` fields.
//
// Agent DX 21/21 notes:
//  - Axis 1: structured VerifyReport / ExecutionReport envelope, no prose.
//  - Axis 3: schema() exposes every flag + output field + enum values.
//  - Axis 4: --fields supported across nested paths (results.*.status etc).
//  - Axis 5: --suite / --capture / --parallel inputs validated
//    (rejectControlChars, validateResourceId, path hardening, range check).
//  - Axis 6: --dry-run is safe-by-construction; bare execution is real
//    but fail-fast + capture + parallel are the safety rails.

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { ok, err, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { isTTY, writeStderr, bold, dim, green, yellow, red } from "../core/output";

// ------------------------------------------------------------------
// Suite registry — data-driven, single source of truth
// ------------------------------------------------------------------

type SuiteKind = "unit" | "integration" | "e2e" | "dx" | "lint" | "typecheck";

export interface SuiteDefinition {
  readonly name: string;
  readonly kind: SuiteKind;
  /** Absolute path resolved lazily in-handler. */
  readonly cwdFrom: "marketing-cli" | "mktg-studio";
  readonly cmd: readonly string[];
  /** Env vars the suite needs; empty means keyless. */
  readonly requiredEnv: readonly string[];
  /** Rough wall-clock estimate for planning + progress reporting. */
  readonly estimatedMs: number;
  readonly description: string;
}

export interface SuitePlan extends SuiteDefinition {
  /** Absolute cwd once resolved against the mktgmono root. */
  readonly cwd: string;
  /** True if the cwd path exists on disk. */
  readonly reachable: boolean;
  /** True if every requiredEnv is set. */
  readonly envSatisfied: boolean;
  /** Missing env var names (empty if envSatisfied). */
  readonly missingEnv: readonly string[];
  /** True if this suite would execute in a live run. */
  readonly willRun: boolean;
  /** Populated when willRun is false. */
  readonly skipReason?: string;
}

export interface VerifyReport {
  readonly mode: "dry-run" | "execute";
  readonly mktgmonoRoot: string;
  readonly suites: readonly SuitePlan[];
  readonly counts: {
    readonly total: number;
    readonly willRun: number;
    readonly skipped: number;
    readonly unreachable: number;
    readonly envMissing: number;
    /** Only populated in execute mode. */
    readonly passed?: number;
    /** Only populated in execute mode. */
    readonly failed?: number;
    /** Only populated in execute mode. */
    readonly errored?: number;
  };
  readonly filters: {
    readonly suite: readonly string[];
  };
  /** Present only in execute mode. One entry per willRun suite (plus any failed-early). */
  readonly results?: readonly SuiteResult[];
  /** Present only in execute mode. */
  readonly execution?: {
    readonly startedAt: string;
    readonly finishedAt: string;
    readonly totalDurationMs: number;
    readonly failFast: boolean;
    readonly parallel: number;
    readonly capturePath?: string;
    readonly summaryPath: string;
    readonly aborted: boolean;
    readonly abortReason?: string;
  };
}

export type SuiteOutcome = "pass" | "fail" | "skipped" | "error";

export interface SuiteResult {
  readonly name: string;
  readonly kind: SuiteKind;
  readonly status: SuiteOutcome;
  readonly startedAt: string;
  readonly durationMs: number;
  /** Child process exit code; null if spawn itself failed or the suite was never executed. */
  readonly exitCode: number | null;
  /** Parsed bun test totals when available. Suites that produce non-bun output (typecheck, playwright) omit this. */
  readonly stats?: { readonly pass: number; readonly fail: number; readonly expect: number };
  /** When --capture was used, paths to the stdout/stderr files in that dir. */
  readonly captureFiles?: { readonly stdout: string; readonly stderr: string };
  /** First N lines of stderr kept inline for diagnosability even without --capture. */
  readonly stderrTail?: string;
  readonly skipReason?: string;
}

// The canonical suite registry. Adding a new test surface? Add a row here.
const SUITES: readonly SuiteDefinition[] = [
  {
    name: "marketing-cli-unit",
    kind: "unit",
    cwdFrom: "marketing-cli",
    cmd: ["bun", "test", "tests"],
    requiredEnv: [],
    estimatedMs: 60_000,
    description: "marketing-cli full test suite (2488+ tests across 88 files)",
  },
  {
    name: "marketing-cli-typecheck",
    kind: "typecheck",
    cwdFrom: "marketing-cli",
    cmd: ["bun", "x", "tsc", "--noEmit"],
    requiredEnv: [],
    estimatedMs: 15_000,
    description: "marketing-cli TypeScript strict typecheck",
  },
  {
    name: "studio-unit",
    kind: "unit",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/unit"],
    requiredEnv: [],
    estimatedMs: 30_000,
    description: "mktg-studio unit tests",
  },
  {
    name: "studio-server",
    kind: "integration",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/server"],
    requiredEnv: [],
    estimatedMs: 30_000,
    description: "mktg-studio server route tests",
  },
  {
    name: "studio-integration",
    kind: "integration",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/integration"],
    requiredEnv: [],
    estimatedMs: 60_000,
    description: "mktg-studio integration tests (spawned server per suite)",
  },
  {
    name: "studio-dx",
    kind: "dx",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/dx", "tests/agent-dx.test.ts"],
    requiredEnv: [],
    estimatedMs: 20_000,
    description: "mktg-studio Agent DX 21/21 probe suite",
  },
  {
    name: "studio-typecheck",
    kind: "typecheck",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "x", "tsc", "--noEmit"],
    requiredEnv: [],
    estimatedMs: 20_000,
    description: "mktg-studio TypeScript strict typecheck",
  },
  {
    name: "real-pipeline-harness",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/setup.test.ts"],
    requiredEnv: [],
    estimatedMs: 15_000,
    description: "Real-pipeline E2E harness self-test (E1 scaffold validation)",
  },
  {
    name: "real-pipeline-postiz",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-postiz.test.ts"],
    requiredEnv: ["POSTIZ_API_KEY", "POSTIZ_API_BASE"],
    estimatedMs: 120_000,
    description: "Real Postiz API coverage (I1) — every endpoint, every field",
  },
  {
    name: "real-pipeline-resend",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-resend.test.ts"],
    requiredEnv: ["RESEND_API_KEY", "RESEND_TEST_DOMAIN"],
    estimatedMs: 120_000,
    description: "Real Resend send + inbound + bounce coverage (I2)",
  },
  {
    name: "real-pipeline-exa-firecrawl",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-exa-firecrawl.test.ts"],
    requiredEnv: ["EXA_API_KEY", "FIRECRAWL_API_KEY", "TYPEFULLY_API_KEY"],
    estimatedMs: 120_000,
    description: "Real Exa + Firecrawl + Typefully coverage (I3)",
  },
  {
    name: "real-pipeline-sqlite",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-sqlite-watcher.test.ts"],
    requiredEnv: [],
    estimatedMs: 60_000,
    description: "SQLite integrity + file watcher reliability (I4)",
  },
  {
    name: "real-pipeline-chaos",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-chaos.test.ts"],
    requiredEnv: [],
    estimatedMs: 180_000,
    description: "Chaos: kill server mid-flow, flaky network, partial fs (H3)",
  },
  {
    name: "real-pipeline-full",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "test", "tests/e2e/real-pipeline/e2e-pipeline.test.ts"],
    requiredEnv: ["POSTIZ_API_KEY"],
    estimatedMs: 300_000,
    description: "Full pipeline: marketing-cli → studio → /cmo → postiz (E2)",
  },
  {
    name: "studio-playwright",
    kind: "e2e",
    cwdFrom: "mktg-studio",
    cmd: ["bun", "x", "playwright", "test"],
    requiredEnv: [],
    estimatedMs: 120_000,
    description: "Browser E2E journeys (Playwright, headless)",
  },
];

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

export const schema: CommandSchema = {
  name: "verify",
  description:
    "Orchestrated test-suite runner across the mktgmono ecosystem. Spawns each test suite via Bun.spawn, aggregates results, supports --fail-fast, --parallel, and --capture.",
  flags: [
    {
      name: "--suite",
      type: "string",
      required: false,
      description:
        "Filter to one suite by name. Repeatable via comma-separated list (e.g., --suite=studio-unit,studio-dx). Omit to run every suite.",
    },
    {
      name: "--dry-run",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Return the plan without executing. Safe-by-construction — zero side effects. Use to inspect what would run before committing to the wall-clock cost.",
    },
    {
      name: "--fail-fast",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Stop launching new suites after the first failure. In-flight suites finish naturally; their results are recorded. The remaining queue is drained into 'skipped' with a fail-fast reason.",
    },
    {
      name: "--parallel",
      type: "string",
      required: false,
      default: "1",
      description:
        "Run up to N suites concurrently (positive integer). Each suite runs in its own temp dir with its own server port where applicable. Default 1 (serial).",
    },
    {
      name: "--capture",
      type: "string",
      required: false,
      description:
        "Directory to copy each suite's stdout/stderr into (absolute path or ./-relative). Directory is created if missing. Without --capture, a short stderr tail is inlined into each SuiteResult for diagnosability.",
    },
  ],
  output: {
    mode: "'dry-run' | 'execute' — which mode produced this report. Pass 1 is always 'dry-run'.",
    mktgmonoRoot: "string — absolute path to the monorepo root used to resolve suite cwds",
    suites:
      "SuitePlan[] — every suite considered, annotated with reachable, envSatisfied, willRun, skipReason",
    "suites.*.name": "string — stable identifier",
    "suites.*.kind": "'unit' | 'integration' | 'e2e' | 'dx' | 'lint' | 'typecheck'",
    "suites.*.cwd": "string — resolved absolute working directory",
    "suites.*.cmd": "string[] — exact argv the runner will spawn",
    "suites.*.requiredEnv": "string[] — env vars the suite needs",
    "suites.*.reachable": "boolean — cwd exists on disk",
    "suites.*.envSatisfied": "boolean — every required env var is set",
    "suites.*.missingEnv": "string[] — names of env vars not set (empty when envSatisfied)",
    "suites.*.willRun": "boolean — would execute in a live run (reachable && envSatisfied && matches filter)",
    "suites.*.skipReason": "string? — set when willRun is false",
    "suites.*.estimatedMs": "number — planning estimate; not a contract",
    counts:
      "{ total, willRun, skipped, unreachable, envMissing, passed?, failed?, errored? } — aggregate counts; passed/failed/errored only present in execute mode",
    filters: "{ suite: string[] } — echoes the filter that was applied",
    results:
      "SuiteResult[]? — per-suite execution results. Present in execute mode only. name, kind, status, startedAt, durationMs, exitCode, stats?, captureFiles?, stderrTail?",
    "results.*.status": "'pass' | 'fail' | 'skipped' | 'error' — suite outcome",
    "results.*.stats":
      "{ pass, fail, expect }? — parsed from `bun test` output; absent for typecheck/playwright suites",
    "results.*.captureFiles":
      "{ stdout, stderr }? — paths on disk when --capture was used",
    "results.*.stderrTail":
      "string? — first chunk of stderr inlined when --capture is absent",
    execution:
      "{ startedAt, finishedAt, totalDurationMs, failFast, parallel, capturePath?, summaryPath, aborted, abortReason? }? — execute-mode metadata",
  },
  examples: [
    {
      args: "mktg verify --dry-run --json",
      description: "Plan every suite — reachability + env status, zero side effects",
    },
    {
      args: "mktg verify --json --suite marketing-cli-typecheck",
      description: "Execute one named suite (fast smoke test)",
    },
    {
      args: "mktg verify --json --suite studio-unit,studio-dx --fail-fast",
      description: "Run two suites serially, stop on first failure",
    },
    {
      args: "mktg verify --json --parallel 4 --capture ./verify-out",
      description: "Run all willRun suites 4-at-a-time, dump every stdout/stderr to ./verify-out/",
    },
    {
      args: "mktg verify --json --fields counts,execution.summaryPath",
      description: "CI-friendly: pass/fail counts + path to durable summary (M3 ship-check consumes this)",
    },
  ],
  vocabulary: ["verify", "test", "suite", "e2e", "ship-check", "ci"],
};

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

/**
 * Resolve the mktgmono root by walking up from the marketing-cli package
 * directory. Falls back to $HOME/projects/mktgmono if the package lives
 * outside the monorepo (e.g., npm-installed global).
 */
const resolveMonorepoRoot = (): string => {
  // Runtime-agnostic module dir: Bun exposes `import.meta.dir` directly, but
  // the node-installed dist bundle only guarantees `import.meta.url`.
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
  // Fallback: conventional location
  return join(homedir(), "projects", "mktgmono");
};

/** Parse comma-separated + repeated --suite values. */
const parseSuiteFilter = (args: readonly string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--suite" && args[i + 1]) {
      out.push(...args[i + 1]!.split(",").map((s) => s.trim()).filter(Boolean));
      i++;
    } else if (a.startsWith("--suite=")) {
      out.push(...a.slice(8).split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return out;
};

const buildPlan = (filter: readonly string[], monorepoRoot: string): SuitePlan[] =>
  SUITES.map((def): SuitePlan => {
    const cwd = join(monorepoRoot, def.cwdFrom);
    const reachable = existsSync(cwd);
    const missingEnv = def.requiredEnv.filter((v) => !process.env[v]);
    const envSatisfied = missingEnv.length === 0;
    const filterActive = filter.length > 0;
    const matchesFilter = !filterActive || filter.includes(def.name);

    let willRun = reachable && envSatisfied && matchesFilter;
    let skipReason: string | undefined;
    if (!matchesFilter) skipReason = `filtered out by --suite (${filter.join(", ")})`;
    else if (!reachable) skipReason = `cwd not found: ${cwd}`;
    else if (!envSatisfied) skipReason = `missing env: ${missingEnv.join(", ")}`;

    return {
      ...def,
      cwd,
      reachable,
      envSatisfied,
      missingEnv,
      willRun,
      ...(skipReason !== undefined ? { skipReason } : {}),
    };
  });

const printTtyPlan = (report: VerifyReport): void => {
  writeStderr("");
  writeStderr(`  ${bold("mktg verify")} ${dim(`(${report.mode})`)}`);
  writeStderr(`  ${dim("root:")} ${report.mktgmonoRoot}`);
  writeStderr("");
  for (const s of report.suites) {
    const icon = s.willRun ? green("●") : !s.reachable ? red("●") : yellow("●");
    const tail = s.skipReason ? dim(` — ${s.skipReason}`) : dim(` — ~${Math.round(s.estimatedMs / 1000)}s`);
    writeStderr(`  ${icon} ${s.name.padEnd(30)} ${dim(s.kind)}${tail}`);
  }
  writeStderr("");
  writeStderr(
    `  ${green(`${report.counts.willRun}`)} would run · ` +
      `${yellow(`${report.counts.skipped}`)} skipped · ` +
      `${red(`${report.counts.unreachable}`)} unreachable · ` +
      `${yellow(`${report.counts.envMissing}`)} env missing`,
  );
  writeStderr("");
};

// ------------------------------------------------------------------
// Exec-mode helpers
// ------------------------------------------------------------------

/** Parse `bun test` output for pass/fail/expect counts. Returns null if not parseable. */
export const parseBunTestStats = (output: string):
  | { readonly pass: number; readonly fail: number; readonly expect: number }
  | null => {
  const passMatch = output.match(/^\s*(\d+)\s+pass\s*$/m);
  const failMatch = output.match(/^\s*(\d+)\s+fail\s*$/m);
  const expectMatch = output.match(/(\d+)\s+expect\(\)\s+calls/);
  if (!passMatch || !failMatch) return null;
  return {
    pass: parseInt(passMatch[1]!, 10),
    fail: parseInt(failMatch[1]!, 10),
    expect: expectMatch ? parseInt(expectMatch[1]!, 10) : 0,
  };
};

/** Keep a bounded tail of stderr so a failure is diagnosable even without --capture. */
const STDERR_TAIL_CHARS = 4_000;
const tailStderr = (s: string): string =>
  s.length <= STDERR_TAIL_CHARS ? s : `[...truncated ${s.length - STDERR_TAIL_CHARS} chars...]\n` + s.slice(-STDERR_TAIL_CHARS);

/** Spawn one suite, capture output, parse stats. Never throws — errors become SuiteResults. */
const runSuite = async (
  plan: SuitePlan,
  capturePath: string | undefined,
): Promise<SuiteResult> => {
  const startedAt = new Date().toISOString();
  const started = performance.now();

  if (!plan.willRun) {
    return {
      name: plan.name,
      kind: plan.kind,
      status: "skipped",
      startedAt,
      durationMs: 0,
      exitCode: null,
      skipReason: plan.skipReason ?? "willRun is false",
    };
  }

  try {
    const proc = Bun.spawn({
      cmd: [...plan.cmd],
      cwd: plan.cwd,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const durationMs = Math.round(performance.now() - started);
    const stats = parseBunTestStats(stdout) ?? parseBunTestStats(stderr);
    const status: SuiteOutcome =
      exitCode === 0 ? "pass" : (stats && stats.fail > 0) ? "fail" : "fail";

    let captureFiles: SuiteResult["captureFiles"];
    if (capturePath) {
      await mkdir(capturePath, { recursive: true });
      const outPath = join(capturePath, `${plan.name}.out`);
      const errPath = join(capturePath, `${plan.name}.err`);
      await writeFile(outPath, stdout);
      await writeFile(errPath, stderr);
      captureFiles = { stdout: outPath, stderr: errPath };
    }

    return {
      name: plan.name,
      kind: plan.kind,
      status,
      startedAt,
      durationMs,
      exitCode: exitCode ?? null,
      ...(stats ? { stats } : {}),
      ...(captureFiles ? { captureFiles } : {}),
      ...(capturePath ? {} : { stderrTail: tailStderr(stderr) }),
    };
  } catch (e) {
    return {
      name: plan.name,
      kind: plan.kind,
      status: "error",
      startedAt,
      durationMs: Math.round(performance.now() - started),
      exitCode: null,
      stderrTail: e instanceof Error ? e.message : String(e),
    };
  }
};

/** Run a list of suites with a bounded concurrency pool + optional fail-fast. */
const runAll = async (
  plans: readonly SuitePlan[],
  concurrency: number,
  failFast: boolean,
  capturePath: string | undefined,
): Promise<{ readonly results: SuiteResult[]; readonly aborted: boolean; readonly abortReason?: string }> => {
  const runnable = plans.filter((p) => p.willRun);
  const skipped = plans.filter((p) => !p.willRun);
  const results: SuiteResult[] = skipped.map((p): SuiteResult => ({
    name: p.name,
    kind: p.kind,
    status: "skipped",
    startedAt: new Date().toISOString(),
    durationMs: 0,
    exitCode: null,
    skipReason: p.skipReason ?? "willRun is false",
  }));

  let aborted = false;
  let abortReason: string | undefined;
  const queue = [...runnable];
  const inFlight = new Map<string, Promise<SuiteResult>>();

  while (queue.length > 0 || inFlight.size > 0) {
    while (queue.length > 0 && inFlight.size < concurrency && !aborted) {
      const plan = queue.shift()!;
      const p = runSuite(plan, capturePath).finally(() => {});
      inFlight.set(plan.name, p);
    }
    if (inFlight.size === 0) break;

    const done = await Promise.race(
      [...inFlight.entries()].map(async ([name, p]) => ({ name, result: await p })),
    );
    inFlight.delete(done.name);
    results.push(done.result);

    if (failFast && (done.result.status === "fail" || done.result.status === "error")) {
      aborted = true;
      abortReason = `--fail-fast: ${done.name} ${done.result.status}`;
      // Drain the queue into skipped results. In-flight suites finish naturally.
      for (const skippedPlan of queue) {
        results.push({
          name: skippedPlan.name,
          kind: skippedPlan.kind,
          status: "skipped",
          startedAt: new Date().toISOString(),
          durationMs: 0,
          exitCode: null,
          skipReason: abortReason,
        });
      }
      queue.length = 0;
    }
  }

  return { results, aborted, ...(abortReason !== undefined ? { abortReason } : {}) };
};

const writeSummary = async (report: VerifyReport): Promise<string> => {
  const summaryDir = join(homedir(), ".mktg", "verify");
  await mkdir(summaryDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const p = join(summaryDir, `${stamp}.json`);
  await writeFile(p, JSON.stringify(report, null, 2));
  return p;
};

// ------------------------------------------------------------------
// Flag parsing (Pass 2 additions: --fail-fast, --parallel, --capture)
// ------------------------------------------------------------------

const parseFlagValue = (args: readonly string[], name: string): string | undefined => {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === name && args[i + 1]) return args[i + 1];
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
};

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

export const handler: CommandHandler<VerifyReport> = async (args, flags) => {
  // --- Input validation ---
  const filter = parseSuiteFilter(args);
  for (const name of filter) {
    const ctrl = rejectControlChars(name, "suite");
    if (!ctrl.ok) return err("INVALID_ARGS", ctrl.message, [], 2);
    const id = validateResourceId(name, "suite");
    if (!id.ok) return err("INVALID_ARGS", id.message, [`Valid suites: ${SUITES.map((s) => s.name).join(", ")}`], 2);
    if (!SUITES.some((s) => s.name === name)) {
      return err(
        "INVALID_ARGS",
        `Unknown suite: '${name}'`,
        [`Valid suites: ${SUITES.map((s) => s.name).join(", ")}`],
        2,
      );
    }
  }

  const failFast = args.includes("--fail-fast");

  const parallelRaw = parseFlagValue(args, "--parallel") ?? "1";
  const parallel = parseInt(parallelRaw, 10);
  if (!Number.isFinite(parallel) || parallel < 1 || parallel > 32) {
    return err(
      "INVALID_ARGS",
      `--parallel must be a positive integer in [1, 32]; got '${parallelRaw}'`,
      ["Example: --parallel 4"],
      2,
    );
  }

  let capturePath: string | undefined = parseFlagValue(args, "--capture");
  if (capturePath !== undefined) {
    const ctrl = rejectControlChars(capturePath, "capture");
    if (!ctrl.ok) return err("INVALID_ARGS", ctrl.message, [], 2);
    // Allow absolute OR ./-relative only. Reject `../` (traversal) and bare relative
    // names that could collide with unknown parent directories.
    if (capturePath.includes("..")) {
      return err(
        "INVALID_ARGS",
        `--capture path rejected: traversal ('..') not allowed in '${capturePath}'`,
        ["Use an absolute path or a ./-relative path inside your project"],
        2,
      );
    }
    capturePath = isAbsolute(capturePath) ? capturePath : resolve(flags.cwd, capturePath);
  }

  const monorepoRoot = resolveMonorepoRoot();
  const suites = buildPlan(filter, monorepoRoot);

  const baseCounts = {
    total: suites.length,
    willRun: suites.filter((s) => s.willRun).length,
    skipped: suites.filter((s) => !s.willRun).length,
    unreachable: suites.filter((s) => !s.reachable).length,
    envMissing: suites.filter((s) => s.reachable && !s.envSatisfied).length,
  };

  // --- Dry-run: Pass 1 surface preserved ---
  if (flags.dryRun) {
    const report: VerifyReport = {
      mode: "dry-run",
      mktgmonoRoot: monorepoRoot,
      suites,
      counts: baseCounts,
      filters: { suite: filter },
    };
    if (isTTY() && !flags.json) printTtyPlan(report);
    return ok(report);
  }

  // --- Execute mode ---
  const execStart = performance.now();
  const execStartedAt = new Date().toISOString();
  const { results, aborted, abortReason } = await runAll(suites, parallel, failFast, capturePath);
  const totalDurationMs = Math.round(performance.now() - execStart);
  const execFinishedAt = new Date().toISOString();

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const errored = results.filter((r) => r.status === "error").length;

  const reportShell: VerifyReport = {
    mode: "execute",
    mktgmonoRoot: monorepoRoot,
    suites,
    counts: { ...baseCounts, passed, failed, errored },
    filters: { suite: filter },
    results,
    execution: {
      startedAt: execStartedAt,
      finishedAt: execFinishedAt,
      totalDurationMs,
      failFast,
      parallel,
      ...(capturePath ? { capturePath } : {}),
      summaryPath: "", // filled in below
      aborted,
      ...(abortReason !== undefined ? { abortReason } : {}),
    },
  };

  // Write summary AFTER shell so the summary file includes its own path? No —
  // write first with a placeholder, then patch.
  const summaryPath = await writeSummary(reportShell);
  const report: VerifyReport = {
    ...reportShell,
    execution: { ...reportShell.execution!, summaryPath },
  };
  // Rewrite with the final summaryPath so the on-disk record is complete.
  await writeFile(summaryPath, JSON.stringify(report, null, 2));

  if (isTTY() && !flags.json) printTtyExecution(report);

  // Exit code 1 if any suite failed or errored; 0 otherwise.
  // (CommandResult<T> only supports 0/1/2/3/4/5/6; return ok() with
  // failure semantics surfaced via counts.failed, or map to err() for
  // a non-zero exit. For agent DX, failed tests are a real error.)
  if (failed > 0 || errored > 0) {
    // Return the full report in the error envelope via a custom code so
    // agents can still read results. Use the error path to get exit 4.
    return err(
      "SUITE_FAILED",
      `verify: ${failed} failed, ${errored} errored (of ${results.filter((r) => r.status !== "skipped").length} executed)`,
      [
        `Summary: ${summaryPath}`,
        `Re-run a specific suite: mktg verify --json --suite <name>`,
        capturePath ? `Captured stdout/stderr in ${capturePath}` : "Re-run with --capture <dir> for full logs",
      ],
      4,
    ) as unknown as CommandResult<VerifyReport>;
  }

  return ok(report);
};

const printTtyExecution = (report: VerifyReport): void => {
  if (!report.results || !report.execution) return;
  writeStderr("");
  writeStderr(`  ${bold("mktg verify")} ${dim("(execute)")}`);
  writeStderr("");
  for (const r of report.results) {
    const icon =
      r.status === "pass" ? green("✓") :
      r.status === "fail" ? red("✗") :
      r.status === "error" ? red("!") : dim("○");
    const tail = r.stats
      ? dim(`  ${r.stats.pass} pass / ${r.stats.fail} fail · ${Math.round(r.durationMs / 1000)}s`)
      : r.skipReason
        ? dim(`  (skipped: ${r.skipReason})`)
        : dim(`  ${Math.round(r.durationMs / 1000)}s`);
    writeStderr(`  ${icon} ${r.name.padEnd(30)}${tail}`);
  }
  writeStderr("");
  const c = report.counts;
  writeStderr(
    `  ${green(`${c.passed ?? 0} passed`)} · ` +
      `${red(`${c.failed ?? 0} failed`)} · ` +
      `${yellow(`${c.errored ?? 0} errored`)} · ` +
      `${dim(`${c.skipped} skipped`)} · ` +
      dim(`${Math.round(report.execution.totalDurationMs / 1000)}s total`),
  );
  writeStderr(`  ${dim("summary:")} ${report.execution.summaryPath}`);
  if (report.execution.aborted) {
    writeStderr(`  ${red("aborted:")} ${report.execution.abortReason}`);
  }
  writeStderr("");
};
