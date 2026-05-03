// mktg update — Re-copy bundled skills/agents AND optionally upgrade the
// installed npm package itself.
//
// Three modes, switched by flags:
//   1. default              → re-copy bundled skills/agents (recovery path)
//   2. --check              → query npm registry, compare semver, no writes
//   3. --upgrade            → check, then run `npm i -g marketing-cli@latest`
//
// `--dry-run` previews mutations: in --upgrade it prints the npm command
// without spawning. `--check` is read-only and ignores --dry-run.

import { ok, err, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import { loadManifest, updateSkills } from "../core/skills";
import { loadAgentManifest, updateAgents } from "../core/agents";
import { bold, dim, green, yellow, red, isTTY } from "../core/output";
import pkg from "../../package.json";

export const schema: CommandSchema = {
  name: "update",
  description:
    "Re-sync bundled skills/agents, check npm for newer mktg releases (--check), or upgrade the installed package (--upgrade)",
  flags: [
    {
      name: "--check",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Query npm registry and compare against installed version. Read-only.",
    },
    {
      name: "--upgrade",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Run `npm i -g marketing-cli@latest` if a newer version is available. Honors --dry-run.",
    },
  ],
  output: {
    "mode": "string — one of: \"sync\" | \"check\" | \"upgrade\"",
    "skills.updated": "string[] — sync mode: skills whose content changed",
    "skills.unchanged": "string[] — sync mode: skills already current",
    "skills.notBundled": "string[] — sync mode: skills in manifest but not bundled",
    "agents.updated": "string[] — sync mode: agents whose content changed",
    "agents.unchanged": "string[] — sync mode: agents already current",
    "agents.notBundled": "string[] — sync mode: agents in manifest but not bundled",
    "versionChanges": "{ skill, from, to }[] — sync mode: skills with version bumps",
    "totalSkills": "number — sync mode: total skills in manifest",
    "totalAgents": "number — sync mode: total installed/installable agents",
    "agentError": "string | null — sync mode: error if agent manifest failed to load",
    "current": "string — check/upgrade: installed marketing-cli version",
    "latest": "string — check/upgrade: latest version on the npm registry",
    "upgradeAvailable": "boolean — check/upgrade: true when latest > current",
    "upgradeCommand": "string — check/upgrade: shell command that performs the upgrade",
    "executed": "boolean — upgrade mode: true if npm install actually ran",
    "exitCode": "number | null — upgrade mode: npm install exit code (null if not run)",
    "stdout": "string — upgrade mode: captured stdout (truncated)",
    "stderr": "string — upgrade mode: captured stderr (truncated)",
  },
  examples: [
    { args: "mktg update --json", description: "Re-sync bundled skills and agents to ~/.claude/" },
    { args: "mktg update --dry-run", description: "Preview re-sync without writing" },
    { args: "mktg update --check --json", description: "Check npm for a newer marketing-cli release (read-only)" },
    { args: "mktg update --upgrade", description: "Upgrade the installed marketing-cli to the latest npm version" },
    { args: "mktg update --upgrade --dry-run", description: "Preview the npm upgrade command without running it" },
  ],
  vocabulary: ["update", "upgrade", "sync skills", "refresh", "check version", "newer version"],
};

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

type SyncResult = {
  readonly mode: "sync";
  readonly skills: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[] };
  readonly agents: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[]; failed: readonly string[] };
  readonly versionChanges: readonly { skill: string; from: string; to: string }[];
  readonly totalSkills: number;
  readonly totalAgents: number;
  readonly agentError: string | null;
};

type CheckResult = {
  readonly mode: "check";
  readonly current: string;
  readonly latest: string;
  readonly upgradeAvailable: boolean;
  readonly upgradeCommand: string;
};

type UpgradeResult = {
  readonly mode: "upgrade";
  readonly current: string;
  readonly latest: string;
  readonly upgradeAvailable: boolean;
  readonly upgradeCommand: string;
  readonly executed: boolean;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

type UpdateOutcome = SyncResult | CheckResult | UpgradeResult;

// ---------------------------------------------------------------------------
// Flag parsing
// ---------------------------------------------------------------------------

const parseUpdateFlags = (args: readonly string[]): { check: boolean; upgrade: boolean } => {
  let check = false;
  let upgrade = false;
  for (const arg of args) {
    if (arg === "--check") check = true;
    else if (arg === "--upgrade") upgrade = true;
  }
  return { check, upgrade };
};

// ---------------------------------------------------------------------------
// Semver comparison — minimal, no external deps
// ---------------------------------------------------------------------------

// Returns:
//   negative if a < b
//   0       if a === b
//   positive if a > b
// Strips leading "v" and a `-prerelease` suffix; falls back to string compare
// on malformed input rather than throwing — npm sometimes hands back odd tags.
export const compareSemver = (a: string, b: string): number => {
  const norm = (s: string) => s.trim().replace(/^v/, "").split("-")[0]!;
  const parse = (s: string): readonly number[] => {
    const parts = norm(s).split(".").map((p) => Number.parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) return [];
    return parts;
  };
  const av = parse(a);
  const bv = parse(b);
  if (av.length === 0 || bv.length === 0) {
    return norm(a).localeCompare(norm(b));
  }
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// npm registry lookup
// ---------------------------------------------------------------------------

const REGISTRY_URL = "https://registry.npmjs.org/marketing-cli/latest";
// 8s is comfortable for npm registry latency; avoids hanging the CLI.
const REGISTRY_TIMEOUT_MS = 8000;

type LatestVersionFetch =
  | { ok: true; version: string }
  | { ok: false; reason: string };

// Fetches the latest published version from the npm registry. Test seam:
// override via `setLatestVersionFetcher()` so unit tests can run without
// touching the network.
let latestVersionFetcher: () => Promise<LatestVersionFetch> = async () => {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REGISTRY_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(REGISTRY_URL, {
        signal: ctl.signal,
        headers: { accept: "application/json" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      return { ok: false, reason: `npm registry returned ${res.status}` };
    }
    const json = (await res.json()) as { version?: unknown };
    if (typeof json.version !== "string" || json.version.length === 0) {
      return { ok: false, reason: "npm registry payload missing 'version' field" };
    }
    return { ok: true, version: json.version };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `Failed to reach npm registry: ${msg}` };
  }
};

// Test-only: swap in a mock fetcher. Returns the previous one so tests can
// restore it in afterEach. Keeps production code free of test conditionals.
export const setLatestVersionFetcher = (
  fn: () => Promise<LatestVersionFetch>,
): (() => Promise<LatestVersionFetch>) => {
  const prev = latestVersionFetcher;
  latestVersionFetcher = fn;
  return prev;
};

// ---------------------------------------------------------------------------
// npm install spawn
// ---------------------------------------------------------------------------

const UPGRADE_COMMAND = "npm i -g marketing-cli@latest";

type UpgradeRun = {
  exitCode: number;
  stdout: string;
  stderr: string;
  eaccess: boolean;
};

// Test seam: override the actual spawn. Production path uses Bun.spawn.
let upgradeRunner: () => Promise<UpgradeRun> = async () => {
  // Bun.spawn is shimmed under node by core/runtime-compat.
  const proc = Bun.spawn({
    cmd: ["npm", "i", "-g", "marketing-cli@latest"],
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });
  const [stdoutText, stderrText, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  // npm's permission errors land in stderr with EACCES; surface them clearly
  // so callers can show the sudo / user-prefix guidance.
  const eaccess = /EACCES|EPERM|permission denied/i.test(stderrText);
  return { exitCode, stdout: stdoutText, stderr: stderrText, eaccess };
};

export const setUpgradeRunner = (
  fn: () => Promise<UpgradeRun>,
): (() => Promise<UpgradeRun>) => {
  const prev = upgradeRunner;
  upgradeRunner = fn;
  return prev;
};

// Truncate captured npm output to a sane size. Full transcripts can be many
// MB — agents only need a tail to diagnose failure.
const truncate = (s: string, max = 4000): string =>
  s.length <= max ? s : s.slice(s.length - max);

// ---------------------------------------------------------------------------
// Sync mode (existing behavior, factored out)
// ---------------------------------------------------------------------------

const runSync = async (
  flags: { dryRun: boolean; cwd: string; json: boolean },
): Promise<CommandResult<UpdateOutcome>> => {
  const manifest = await loadManifest();
  const skillsUpdate = await updateSkills(manifest, flags.dryRun, flags.cwd);

  let agentsUpdate = { updated: [] as string[], unchanged: [] as string[], notBundled: [] as string[], failed: [] as string[] };
  let agentError: string | null = null;
  try {
    const agentManifest = await loadAgentManifest();
    agentsUpdate = await updateAgents(agentManifest, flags.dryRun);
  } catch (e) {
    agentError = e instanceof Error ? e.message : String(e);
  }

  const result: SyncResult = {
    mode: "sync",
    skills: skillsUpdate,
    agents: agentsUpdate,
    versionChanges: skillsUpdate.versionChanges,
    totalSkills: Object.keys(manifest.skills).length,
    totalAgents: agentsUpdate.updated.length + agentsUpdate.unchanged.length,
    agentError,
  };

  if (flags.json || !isTTY()) return ok(result);

  const lines: string[] = [];
  lines.push(bold("mktg update"));
  lines.push("");

  if (flags.dryRun) {
    lines.push(dim("  (dry run — no changes written)"));
    lines.push("");
  }

  if (skillsUpdate.updated.length > 0) {
    lines.push(green(`  ~ ${skillsUpdate.updated.length} skills updated`));
    for (const name of skillsUpdate.updated) {
      lines.push(dim(`    ~ ${name}`));
    }
  }
  if (skillsUpdate.unchanged.length > 0) {
    lines.push(dim(`  = ${skillsUpdate.unchanged.length} skills unchanged`));
  }
  if (skillsUpdate.notBundled.length > 0) {
    lines.push(yellow(`  ? ${skillsUpdate.notBundled.length} skills not bundled yet`));
  }
  if (skillsUpdate.versionChanges.length > 0) {
    lines.push(green(`  ↑ ${skillsUpdate.versionChanges.length} version changes`));
    for (const vc of skillsUpdate.versionChanges) {
      lines.push(dim(`    ${vc.skill}: ${vc.from} → ${vc.to}`));
    }
  }
  if (agentsUpdate.updated.length > 0) {
    lines.push(green(`  ~ ${agentsUpdate.updated.length} agents updated`));
    for (const name of agentsUpdate.updated) {
      lines.push(dim(`    ~ ${name}`));
    }
  }
  if (agentsUpdate.unchanged.length > 0) {
    lines.push(dim(`  = ${agentsUpdate.unchanged.length} agents unchanged`));
  }
  if (agentsUpdate.failed.length > 0) {
    lines.push(red(`  ! ${agentsUpdate.failed.length} agents failed to update`));
    for (const name of agentsUpdate.failed) {
      lines.push(dim(`    ! ${name}`));
    }
  }
  if (agentError) {
    lines.push(yellow(`  ? agents skipped: ${agentError}`));
  }

  lines.push("");
  lines.push(dim(`  ${result.totalSkills} skills, ${result.totalAgents} agents in manifests`));
  lines.push("");

  return ok(result, lines.join("\n"));
};

// ---------------------------------------------------------------------------
// Check + Upgrade modes
// ---------------------------------------------------------------------------

const runCheck = async (
  flags: { json: boolean },
): Promise<CommandResult<UpdateOutcome>> => {
  const current = pkg.version as string;
  const fetched = await latestVersionFetcher();
  if (!fetched.ok) {
    return err(
      "REGISTRY_UNREACHABLE",
      fetched.reason,
      [
        "Check your internet connection.",
        "Try again, or run the upgrade manually: `npm i -g marketing-cli@latest`",
      ],
      5,
    );
  }
  const upgradeAvailable = compareSemver(fetched.version, current) > 0;
  const result: CheckResult = {
    mode: "check",
    current,
    latest: fetched.version,
    upgradeAvailable,
    upgradeCommand: UPGRADE_COMMAND,
  };

  if (flags.json || !isTTY()) return ok(result);

  const lines: string[] = [];
  lines.push(bold("mktg update --check"));
  lines.push("");
  lines.push(`  installed: ${current}`);
  lines.push(`  latest:    ${fetched.version}`);
  lines.push("");
  if (upgradeAvailable) {
    lines.push(green(`  ↑ Upgrade available — run: ${UPGRADE_COMMAND}`));
    lines.push(dim(`     or: mktg update --upgrade`));
  } else {
    lines.push(dim(`  = up to date`));
  }
  lines.push("");
  return ok(result, lines.join("\n"));
};

const runUpgrade = async (
  flags: { dryRun: boolean; json: boolean },
): Promise<CommandResult<UpdateOutcome>> => {
  const current = pkg.version as string;
  const fetched = await latestVersionFetcher();
  if (!fetched.ok) {
    return err(
      "REGISTRY_UNREACHABLE",
      fetched.reason,
      [
        "Check your internet connection.",
        "Try again, or run the upgrade manually: `npm i -g marketing-cli@latest`",
      ],
      5,
    );
  }
  const upgradeAvailable = compareSemver(fetched.version, current) > 0;

  // Nothing to do — exit 0 so callers can tell "already current" from "ran upgrade".
  if (!upgradeAvailable) {
    const result: UpgradeResult = {
      mode: "upgrade",
      current,
      latest: fetched.version,
      upgradeAvailable: false,
      upgradeCommand: UPGRADE_COMMAND,
      executed: false,
      exitCode: null,
      stdout: "",
      stderr: "",
    };
    if (flags.json || !isTTY()) return ok(result);
    const lines = [
      bold("mktg update --upgrade"),
      "",
      `  installed: ${current}`,
      `  latest:    ${fetched.version}`,
      "",
      dim("  = already at latest version, nothing to upgrade"),
      "",
    ];
    return ok(result, lines.join("\n"));
  }

  // Dry-run: preview the npm command, do not spawn.
  if (flags.dryRun) {
    const result: UpgradeResult = {
      mode: "upgrade",
      current,
      latest: fetched.version,
      upgradeAvailable: true,
      upgradeCommand: UPGRADE_COMMAND,
      executed: false,
      exitCode: null,
      stdout: "",
      stderr: "",
    };
    if (flags.json || !isTTY()) return ok(result);
    const lines = [
      bold("mktg update --upgrade --dry-run"),
      "",
      `  installed: ${current}`,
      `  latest:    ${fetched.version}`,
      "",
      yellow(`  would run: ${UPGRADE_COMMAND}`),
      dim("  (dry run — npm not invoked)"),
      "",
    ];
    return ok(result, lines.join("\n"));
  }

  // Real upgrade: spawn npm. Surface EACCES guidance loudly.
  const run = await upgradeRunner();
  const result: UpgradeResult = {
    mode: "upgrade",
    current,
    latest: fetched.version,
    upgradeAvailable: true,
    upgradeCommand: UPGRADE_COMMAND,
    executed: true,
    exitCode: run.exitCode,
    stdout: truncate(run.stdout),
    stderr: truncate(run.stderr),
  };

  if (run.exitCode !== 0) {
    const suggestions = run.eaccess
      ? [
          "Your npm prefix is root-owned. Two safe options:",
          "  1. Re-run with sudo: `sudo mktg update --upgrade`",
          "  2. Switch to a user-owned prefix (recommended): nvm, fnm, or volta",
          "Docs: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally",
        ]
      : [
          "Re-run the upgrade manually to see full npm output:",
          `  ${UPGRADE_COMMAND}`,
          "If the failure persists, check `npm config get prefix` and your npm version.",
        ];
    return err(
      run.eaccess ? "NPM_PERMISSION_DENIED" : "NPM_UPGRADE_FAILED",
      run.eaccess
        ? `npm install failed with EACCES — your global npm prefix is not writable.`
        : `npm install exited with code ${run.exitCode}.`,
      suggestions,
      run.eaccess ? 1 : 1,
    );
  }

  if (flags.json || !isTTY()) return ok(result);
  const lines = [
    bold("mktg update --upgrade"),
    "",
    `  installed: ${current}`,
    `  latest:    ${fetched.version}`,
    "",
    green(`  ✓ upgraded — npm exited 0`),
    dim(`  postinstall re-syncs skills and agents automatically.`),
    "",
  ];
  return ok(result, lines.join("\n"));
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: CommandHandler<UpdateOutcome> = async (args, flags) => {
  const { check, upgrade } = parseUpdateFlags(args);

  if (check && upgrade) {
    return err(
      "INVALID_ARGS",
      "Pass either --check or --upgrade, not both.",
      [
        "`--check` is read-only; `--upgrade` runs the install. Pick one.",
        "Examples: `mktg update --check --json`, `mktg update --upgrade`",
      ],
      2,
    );
  }

  if (upgrade) return runUpgrade({ dryRun: flags.dryRun, json: flags.json });
  if (check) return runCheck({ json: flags.json });
  return runSync({ dryRun: flags.dryRun, cwd: flags.cwd, json: flags.json });
};
