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
//   0 = every checked skill is in-sync
//   1 = drift detected on at least one skill
//   2 = environment error (named skill missing upstream.json, every script crashed, etc.)

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
// `true` means no drift was found; the CLI process exit code reflects the same
// signal (0 vs 1) so script wrappers can branch on `$?`.
// ---------------------------------------------------------------------------

export type SkillCheckUpstreamEntry = {
  readonly name: string;
  readonly in_sync: boolean;
  readonly drift_count: number;
  readonly source_count: number;
  readonly last_checked_at: string;
  readonly error?: string;
};

export type SkillCheckUpstreamResult = {
  readonly skills: readonly SkillCheckUpstreamEntry[];
  readonly summary: { readonly total: number; readonly in_sync: number; readonly drifted: number };
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
    "summary.drifted": "number — skills with at least one drifted file",
    ok: "boolean — true when summary.drifted === 0 (no drift detected anywhere)",
  },
  examples: [
    { args: "mktg skill check-upstream --json", description: "Check every upstream skill" },
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
    return {
      name: skillName,
      in_sync: false,
      drift_count: 0,
      source_count,
      last_checked_at,
      error: `check-upstream.sh did not emit valid JSON (exit ${proc.status ?? "?"})`,
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

export const handler: CommandHandler<SkillCheckUpstreamResult> = async (args, flags) => {
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

  const entries: SkillCheckUpstreamEntry[] = [];
  for (const name of targets) {
    const entry = await checkSkill(name, skillsDir);
    entries.push(entry);
    // NDJSON streaming — emit each result as it lands so long-running scans
    // surface progress to the caller before the aggregate envelope is built.
    if (wantsNdjson) writeStdout(JSON.stringify(entry));
  }

  const inSync = entries.filter((e) => e.in_sync).length;
  const drifted = entries.length - inSync;
  const result: SkillCheckUpstreamResult = {
    skills: entries,
    summary: { total: entries.length, in_sync: inSync, drifted },
    ok: drifted === 0,
  };

  // Determine the process exit code per the task spec:
  //   0 = no drift
  //   1 = drift detected (one or more skills out of sync)
  //   2 = environment failure with no successful checks
  // The discriminated union forces ok:true → exitCode:0, so we cast through
  // when we need the {data, exitCode:1|2} combination. cli.ts only inspects
  // `ok`, `data`, and `exitCode` at runtime, so the cast is safe.
  const allErrored = entries.length > 0 && entries.every((e) => e.error !== undefined);
  if (allErrored) {
    return {
      ok: true,
      data: result,
      exitCode: 2,
    } as unknown as CommandResult<SkillCheckUpstreamResult>;
  }
  if (drifted > 0) {
    return {
      ok: true,
      data: result,
      exitCode: 1,
    } as unknown as CommandResult<SkillCheckUpstreamResult>;
  }

  // Empty case (no skills with upstream.json) and the all-clean case both
  // hit this path with exit 0 — empty is intentionally not an error so CI
  // can run the command unconditionally without special-casing first runs.
  return ok(result);
};
