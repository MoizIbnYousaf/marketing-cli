// mktg skill check-upstream — Provenance drift detection for upstream-derived skills
//
// Fans across every skill folder under <cwd>/skills/ that has an upstream.json
// provenance manifest, invokes its local scripts/check-upstream.sh, parses the
// per-script JSON envelope, and aggregates the results into a single response.
//
// Per-skill check-upstream.sh contract (matches ironmint's T3 design):
//   - exit 0  → no drift detected
//   - exit 1  → drift detected (added, removed, or modified-without-note files)
//   - exit 2+ → environment error (gh missing, network failure, bad upstream.json)
//   - stdout  → a JSON object of shape:
//                 { ok, in_sync, checked_at, sources: [
//                     { name, repo, snapshot_sha, current_sha,
//                       drift: { added: [...], modified: [...], removed: [...] } },
//                   ...
//                 ] }
//
// Modified entries that carry `note: "adapted-frontmatter"` are intentional
// divergences (e.g. mktg rewrote a SKILL.md frontmatter); they are surfaced
// to the operator but do NOT count as drift for in_sync purposes — that's
// already encoded in the script's exit code, so we trust that signal.
//
// This aggregator is read-only. It does not write to upstream.json or any
// skill content; T10 (`mktg skill upgrade`) will do the actual update.
//
// Exit codes (this command):
//   0 = checks ran (in-sync OR drifted — drift is a finding, not an error;
//       branch on data.ok / data.summary.drifted / skills[].in_sync).
//       Also 0 for --dry-run (plan only, zero network) and the empty case.
//   1 = NOT_FOUND — the named skill has no upstream.json
//   2 = INVALID_ARGS (bad skill name) or environment error when EVERY script
//       crashed (gh/jq missing, bad upstream.json) and nothing could be checked
//
// --dry-run returns the plan: which skills carry upstream.json, the script
// path each would invoke, whether it exists, and its source counts. No script
// is spawned and no network call is made.

import { join } from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ok, type CommandHandler, type CommandResult, type CommandSchema } from "../types";
import {
  invalidArgs,
  notFound,
  validateResourceId,
  rejectControlChars,
  detectDoubleEncoding,
} from "../core/errors";
import { writeStdout } from "../core/output";

// ---------------------------------------------------------------------------
// Types — shape returned by the handler. `ok` here mirrors HTTP-style success:
// `true` means no drift was found. The process exit code is 0 for both
// in-sync and drifted runs — branch on `ok` / `summary.drifted`, not `$?`.
// ---------------------------------------------------------------------------

export type SkillCheckUpstreamEntry = {
  readonly name: string;
  readonly in_sync: boolean;
  readonly drift_count: number;
  readonly source_count: number;
  readonly last_checked_at: string;
  readonly error?: string;
  /** Present when `error` is set — how to fix the environment failure. */
  readonly remediation?: string;
};

export type SkillCheckUpstreamResult = {
  readonly skills: readonly SkillCheckUpstreamEntry[];
  readonly summary: { readonly total: number; readonly in_sync: number; readonly drifted: number; readonly errored: number };
  readonly ok: boolean;
};

/** --dry-run plan entry — what WOULD run for one skill. Nothing is spawned. */
export type SkillCheckUpstreamPlanEntry = {
  readonly name: string;
  readonly upstream_json: string;
  readonly script: string;
  readonly script_exists: boolean;
  /** Number of upstream sources declared in upstream.json. */
  readonly source_count: number;
  /** Total tracked files across all sources. */
  readonly file_count: number;
};

export type SkillCheckUpstreamPlan = {
  readonly dry_run: true;
  readonly network: false;
  readonly skills: readonly SkillCheckUpstreamPlanEntry[];
  readonly summary: { readonly total: number; readonly with_script: number; readonly missing_script: number };
  readonly ok: boolean;
};

// ---------------------------------------------------------------------------
// Subcommand schema — registered into src/commands/skill.ts's subcommands
// array so `mktg schema skill check-upstream --json` returns this shape.
// The `output` map drives auto-generation of `responseSchema` in schema.ts.
// ---------------------------------------------------------------------------

export const checkUpstreamSubcommand: CommandSchema = {
  name: "check-upstream",
  description:
    "Check provenance drift across skills with upstream.json — runs each skill's scripts/check-upstream.sh and aggregates results",
  flags: [
    {
      name: "--dry-run",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Return the plan only: skills with upstream.json, the check-upstream.sh path each would run, and source/file counts. Zero scripts spawned, zero network.",
    },
    {
      name: "--all",
      type: "boolean",
      required: false,
      default: true,
      description:
        "Check every skill with an upstream.json (default behavior; explicit when no positional name is given)",
    },
    {
      name: "--ndjson",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Stream one per-skill JSON object per line on stdout for incremental processing — the trailing aggregate envelope is still returned",
    },
  ],
  positional: {
    name: "name",
    description: "Single skill name to check (omit or pass --all for every upstream skill)",
    required: false,
  },
  output: {
    skills:
      "SkillCheckUpstreamEntry[] — per-skill drift results: {name, in_sync, drift_count, source_count, last_checked_at}",
    "summary.total": "number — count of skills with upstream.json that were checked",
    "summary.in_sync": "number — skills where every recorded SHA still matches upstream",
    "summary.drifted": "number — skills with at least one drifted file (errored skills are NOT counted here)",
    "summary.errored": "number — skills whose check-upstream.sh failed (env/auth/network); see skills[].error + remediation",
    ok: "boolean — true when summary.drifted === 0 and summary.errored === 0 (drift exits 0; branch on this field, not the exit code)",
    dry_run: "true — only present with --dry-run; skills[] then carries {name, upstream_json, script, script_exists, source_count, file_count}",
  },
  examples: [
    { args: "mktg skill check-upstream --json", description: "Check every upstream skill (exit 0 even when drift is found; read summary.drifted)" },
    { args: "mktg skill check-upstream --dry-run --json", description: "Plan only — list skills + scripts that would run, no network" },
    {
      args: "mktg skill check-upstream remotion-best-practices --json",
      description: "Check a single named skill",
    },
    {
      args: "mktg skill check-upstream --all --ndjson",
      description: "Stream per-skill drift results as NDJSON",
    },
    {
      args: "mktg skill check-upstream --json --fields summary.drifted",
      description: "Just the drift count for CI gating",
    },
  ],
};

// ---------------------------------------------------------------------------
// Filesystem helpers — small async wrappers so we can probe paths without
// throwing on missing entries. Symlinks are followed (consistent with the
// rest of the skill discovery code) so a tested skill can live behind a link.
// ---------------------------------------------------------------------------

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

// Discover every skill directory under <skillsDir> that ships an upstream.json
// provenance manifest. Sorted alphabetically so the response order is stable
// for snapshot-style assertions and so NDJSON consumers see a deterministic
// stream. Returns [] when the skills/ directory does not exist (empty case).
const discoverUpstreamSkills = async (skillsDir: string): Promise<string[]> => {
  if (!(await isDirectory(skillsDir))) return [];
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const candidates: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const upstreamJsonPath = join(skillsDir, e.name, "upstream.json");
    if (await fileExists(upstreamJsonPath)) candidates.push(e.name);
  }
  return candidates.sort();
};

// Count manifest files for a skill from its upstream.json. This becomes the
// per-skill `source_count` field — total files tracked across every source
// (primary, secondary, etc). When upstream.json is malformed or missing the
// expected `sources[].files[]` shape we return 0 so the rest of the pipeline
// can still surface drift even when counts are zero.
const countManifestFiles = async (upstreamJsonPath: string): Promise<number> => {
  try {
    const raw = await readFile(upstreamJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { sources?: Array<{ files?: unknown[] }> };
    const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    return sources.reduce((acc, src) => acc + (Array.isArray(src.files) ? src.files.length : 0), 0);
  } catch {
    return 0;
  }
};

// Source + file counts for the --dry-run plan. Malformed upstream.json → 0/0.
const readManifestCounts = async (upstreamJsonPath: string): Promise<{ sources: number; files: number }> => {
  try {
    const raw = await readFile(upstreamJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { sources?: Array<{ files?: unknown[] }> };
    const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    return {
      sources: sources.length,
      files: sources.reduce((acc, src) => acc + (Array.isArray(src.files) ? src.files.length : 0), 0),
    };
  } catch {
    return { sources: 0, files: 0 };
  }
};

// Aggregate drift entries from ironmint's per-source envelope into a single
// scalar. We count: every `added` entry, every `removed` entry, and every
// `modified` entry that does NOT carry an adapted-frontmatter `note`.
// Adapted-frontmatter modifications are intentional and don't count as drift,
// matching the script's own in_sync logic.
const countDriftFromSources = (sources: unknown): number => {
  if (!Array.isArray(sources)) return 0;
  let drift = 0;
  for (const s of sources) {
    if (!s || typeof s !== "object") continue;
    const driftField = (s as { drift?: unknown }).drift;
    if (!driftField || typeof driftField !== "object") continue;
    const d = driftField as { added?: unknown; modified?: unknown; removed?: unknown };
    const added = Array.isArray(d.added) ? d.added.length : 0;
    const removed = Array.isArray(d.removed) ? d.removed.length : 0;
    const modified = Array.isArray(d.modified)
      ? d.modified.filter((m) => {
          // Adapted-frontmatter entries are flagged via `note` and don't count.
          if (!m || typeof m !== "object") return true;
          return !("note" in (m as Record<string, unknown>));
        }).length
      : 0;
    drift += added + removed + modified;
  }
  return drift;
};

// Run a single skill's check-upstream.sh and translate its JSON envelope into
// a SkillCheckUpstreamEntry. The script's contract emits the ironmint shape
// (see file header). If the script is missing, the spawn fails, or output
// is unparseable, we flag the entry with an `error` field rather than
// throwing — this lets `--all` mode keep going across other skills.
const checkSkill = async (skillName: string, skillsDir: string): Promise<SkillCheckUpstreamEntry> => {
  const skillDir = join(skillsDir, skillName);
  const scriptPath = join(skillDir, "scripts", "check-upstream.sh");
  const upstreamJsonPath = join(skillDir, "upstream.json");
  const last_checked_at = new Date().toISOString();
  const source_count = await countManifestFiles(upstreamJsonPath);

  if (!(await fileExists(scriptPath))) {
    return {
      name: skillName,
      in_sync: false,
      drift_count: 0,
      source_count,
      last_checked_at,
      error: `scripts/check-upstream.sh not found for skill '${skillName}'`,
    };
  }

  const proc = spawnSync("bash", [scriptPath], {
    cwd: skillDir,
    encoding: "utf-8",
    timeout: 60_000,
    // Inherit env so gh, GH_TOKEN, GITHUB_TOKEN, etc. flow through.
  });

  if (proc.error) {
    return {
      name: skillName,
      in_sync: false,
      drift_count: 0,
      source_count,
      last_checked_at,
      error: `failed to invoke check-upstream.sh: ${proc.error.message}`,
    };
  }

  const stdout = (proc.stdout ?? "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // Surface the script's real cause (last stderr line) — the script header
    // documents exit 2 = preflight failure (missing gh/jq, manifest, gh API).
    const stderrLines = (proc.stderr ?? "").trim().split("\n").filter((l) => l.trim().length > 0);
    const cause = stderrLines.length > 0 ? stderrLines[stderrLines.length - 1]! : "no stderr output";
    const remediation = proc.status === 2
      ? "Preflight failure — run `gh auth login`, install `jq`, and check network access; then re-run"
      : "Run `bash scripts/check-upstream.sh` inside the skill dir to see the raw output";
    return {
      name: skillName,
      in_sync: false,
      drift_count: 0,
      source_count,
      last_checked_at,
      error: `check-upstream.sh did not emit valid JSON (exit ${proc.status ?? "?"}): ${cause}`,
      remediation,
    };
  }

  const obj = (parsed && typeof parsed === "object" && !Array.isArray(parsed))
    ? (parsed as Record<string, unknown>)
    : {};

  // Prefer flat fields if a script emits them (forward-compatible); otherwise
  // derive from the ironmint sources[] shape.
  const explicitDrift = typeof obj.drift_count === "number" ? obj.drift_count : null;
  const drift_count = explicitDrift !== null ? explicitDrift : countDriftFromSources(obj.sources);

  // in_sync trusts the script's exit code as the authoritative signal, then
  // double-checks against drift_count so a script that exits 0 but reports
  // drift (or vice versa) is treated as drifted out of caution.
  const scriptInSync = obj.in_sync === true;
  const in_sync = proc.status === 0 && scriptInSync && drift_count === 0;

  return {
    name: skillName,
    in_sync,
    drift_count,
    source_count,
    last_checked_at,
  };
};

// ---------------------------------------------------------------------------
// Handler — entry point invoked from src/commands/skill.ts dispatch.
// ---------------------------------------------------------------------------

export const handler: CommandHandler<SkillCheckUpstreamResult | SkillCheckUpstreamPlan> = async (args, flags) => {
  const positional = args.filter((a) => !a.startsWith("--"));
  const wantsNdjson = args.includes("--ndjson");
  const requestedName = positional[0];

  // Input hardening — every external string passes the full validator stack
  // before we go anywhere near the filesystem. validateResourceId catches
  // path separators, encoding bypasses, and oversized inputs in one pass.
  if (requestedName !== undefined) {
    const controlCheck = rejectControlChars(requestedName, "skill name");
    if (!controlCheck.ok) return invalidArgs(controlCheck.message, []);
    const encodingCheck = detectDoubleEncoding(requestedName);
    if (!encodingCheck.ok) {
      return invalidArgs(encodingCheck.message, ["Use a plain skill name like 'remotion-best-practices'"]);
    }
    const idCheck = validateResourceId(requestedName, "skill");
    if (!idCheck.ok) {
      return invalidArgs(idCheck.message, [
        "Use lowercase letters, numbers, hyphens, and dots only",
        "Example: mktg skill check-upstream remotion-best-practices --json",
      ]);
    }
  }

  const skillsDir = join(flags.cwd, "skills");
  const allUpstreamSkills = await discoverUpstreamSkills(skillsDir);

  let targets: string[];
  if (requestedName !== undefined) {
    if (!allUpstreamSkills.includes(requestedName)) {
      return notFound(`Skill '${requestedName}' with upstream.json`, [
        `Looked in: ${skillsDir}`,
        allUpstreamSkills.length === 0
          ? "No skills with upstream.json detected"
          : `Available upstream skills: ${allUpstreamSkills.join(", ")}`,
        "mktg skill check-upstream --all --json to scan everything",
      ]);
    }
    targets = [requestedName];
  } else {
    targets = allUpstreamSkills;
  }

  // --dry-run: describe the plan, spawn nothing, touch no network.
  if (flags.dryRun) {
    const planned: SkillCheckUpstreamPlanEntry[] = [];
    for (const name of targets) {
      const skillDir = join(skillsDir, name);
      const script = join(skillDir, "scripts", "check-upstream.sh");
      const upstream_json = join(skillDir, "upstream.json");
      const counts = await readManifestCounts(upstream_json);
      planned.push({
        name,
        upstream_json,
        script,
        script_exists: await fileExists(script),
        source_count: counts.sources,
        file_count: counts.files,
      });
    }
    const withScript = planned.filter((p) => p.script_exists).length;
    return ok({
      dry_run: true,
      network: false,
      skills: planned,
      summary: { total: planned.length, with_script: withScript, missing_script: planned.length - withScript },
      ok: true,
    });
  }

  const entries: SkillCheckUpstreamEntry[] = [];
  for (const name of targets) {
    const entry = await checkSkill(name, skillsDir);
    entries.push(entry);
    // NDJSON streaming — emit each result as it lands so long-running scans
    // surface progress to the caller before the aggregate envelope is built.
    if (wantsNdjson) writeStdout(JSON.stringify(entry));
  }

  const inSync = entries.filter((e) => e.in_sync).length;
  const errored = entries.filter((e) => e.error !== undefined).length;
  // Errored entries are environment failures, not drift — keep them out of
  // `drifted` so an auth failure does not masquerade as upstream drift.
  const drifted = entries.length - inSync - errored;
  const result: SkillCheckUpstreamResult = {
    skills: entries,
    summary: { total: entries.length, in_sync: inSync, drifted, errored },
    ok: drifted === 0 && errored === 0,
  };

  // Exit code (see file header): only the all-errored case is non-zero —
  // nothing could be checked, so the caller has an environment problem, not
  // a drift finding. The discriminated union forces ok:true → exitCode:0, so
  // we cast through; cli.ts only inspects `ok`, `data`, `exitCode` at runtime.
  const allErrored = entries.length > 0 && entries.every((e) => e.error !== undefined);
  if (allErrored) {
    return {
      ok: true,
      data: result,
      exitCode: 2,
    } as unknown as CommandResult<SkillCheckUpstreamResult>;
  }

  // Drift, partial errors, the empty case, and all-clean all exit 0 — drift
  // is a finding surfaced via data.ok=false / summary.drifted / skills[].in_sync,
  // never a process failure. CI gates on `--fields summary.drifted`.
  return ok(result);
};
