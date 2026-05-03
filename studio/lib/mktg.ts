// lib/mktg.ts
// Typed wrapper around the `mktg` CLI using Bun.spawn.
// Every exported function returns Promise<CommandResult<T>>.
// The mktg CLI always returns a JSON envelope when called with --json.
// CommandResult<T> shape: {ok, data, exitCode} | {ok, error, exitCode}

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProjectRoot } from "./project-root";

import type {
  CommandResult,
  StatusData,
  DoctorData,
  ListData,
  SkillEntry,
  PlanData,
  PlanNextData,
  InitData,
  RunData,
  CatalogEntry,
  CatalogListData,
  CatalogStatusData,
  PublishManifest,
  PublishResult,
  PublishAdapter,
  IntegrationsData,
  NativeAccountData,
  NativeProviderData,
  NativePostsData,
  SchemaData,
  MktgError,
  ExitCode,
} from "./types/mktg";

// ─── .env.local loader ─────────────────────────────────────────────────────
// The studio may be spawned without `.env.local` merged into process.env
// (direct `bun run server.ts`, tests, some launcher paths). Mirror what
// bin/mktg-studio.ts does so the child `mktg` process sees user-configured
// keys regardless of how the studio was booted. Shell env always wins.
//
// Cached per-cwd by mtime so repeated `mktgDoctor()` calls don't re-parse
// the file every turn. Exported for tests.

interface EnvCache {
  mtimeMs: number;
  env: Record<string, string>;
}
const ENV_CACHE = new Map<string, EnvCache>();

export function loadEnvLocal(cwd: string): Record<string, string> {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) {
    ENV_CACHE.delete(cwd);
    return {};
  }
  const mtimeMs = statSync(envPath).mtimeMs;
  const cached = ENV_CACHE.get(cwd);
  if (cached && cached.mtimeMs === mtimeMs) return cached.env;

  const env: Record<string, string> = {};
  for (const raw of readFileSync(envPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  ENV_CACHE.set(cwd, { mtimeMs, env });
  return env;
}

// ─── Core runner ───────────────────────────────────────────────────────────

/**
 * Spawn `mktg [...args, "--json"]` and parse stdout as CommandResult<T>.
 * If `opts.input` is provided it is written to stdin (for pipe-in manifests).
 * Returns a typed CommandResult — never throws.
 */
export async function run<T>(
  args: string[],
  opts: { cwd?: string; input?: string } = {},
): Promise<CommandResult<T>> {
  const cwd = opts.cwd ?? resolveProjectRoot(process.cwd());
  // Shell env wins; fallback to .env.local so `mktg doctor` sees
  // TYPEFULLY_API_KEY / POSTIZ_API_KEY / etc. even on a bare `bun run`.
  const env = { ...loadEnvLocal(cwd), ...(process.env as Record<string, string>) };

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(["mktg", ...args, "--json"], {
      cwd,
      env,
      stdin: opts.input !== undefined ? "pipe" : "inherit",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (e) {
    return spawnError(e);
  }

  // Write stdin input then close.
  // Cast to FileSink: when stdin="pipe" Bun returns a FileSink, but the type union
  // includes `number` (for inherit/fd). We only enter this branch when input is set,
  // which means stdin was "pipe", so the cast is safe.
  if (opts.input !== undefined && proc.stdin) {
    const sink = proc.stdin as import("bun").FileSink;
    sink.write(new TextEncoder().encode(opts.input));
    await sink.end();
  }

  // Cast to ReadableStream: stdout/stderr are always "pipe" above, so the type is
  // ReadableStream<Uint8Array>, but Bun's spawn overloads return a union that includes
  // `number`. The cast is safe given the spawn options above.
  const [stdout, _stderr, exitCode] = await Promise.all([
    readStream(proc.stdout as ReadableStream<Uint8Array> | null),
    readStream(proc.stderr as ReadableStream<Uint8Array> | null),
    proc.exited,
  ]);

  const raw = stdout.trim();

  // Try to parse mktg's JSON envelope directly
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isCommandResult<T>(parsed)) return parsed;
    // Parsed JSON but not a CommandResult shape — treat as data payload
    if (exitCode === 0) {
      return { ok: true, data: parsed as T, exitCode: 0 };
    }
  } catch {
    // stdout is not JSON
  }

  if (exitCode === 0) {
    // Command exited cleanly but stdout wasn't JSON — shouldn't happen with --json
    return {
      ok: false,
      error: buildError("PARSE_ERROR", `mktg ${args[0]} returned non-JSON output`, [
        "Ensure marketing-cli is installed: npm i -g marketing-cli",
        `Raw output: ${raw.slice(0, 200)}`,
      ]),
      exitCode: 4,
    };
  }

  // Non-zero exit — try to extract error from stdout
  try {
    const parsed = JSON.parse(raw) as { ok?: boolean; error?: MktgError; exitCode?: number };
    if (parsed.ok === false && parsed.error) {
      return { ok: false, error: parsed.error, exitCode: (parsed.exitCode ?? exitCode) as ExitCode };
    }
  } catch {
    // ignore
  }

  return {
    ok: false,
    error: buildError(
      "CLI_ERROR",
      `mktg ${args[0]} exited with code ${exitCode}`,
      ["Check mktg installation: which mktg", `Raw output: ${raw.slice(0, 200)}`],
    ),
    exitCode: exitCode as ExitCode,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function readStream(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array()),
  );
}

function buildError(code: string, message: string, suggestions: string[]): MktgError {
  return { code, message, suggestions };
}

function spawnError(e: unknown): CommandResult<never> {
  const detail = e instanceof Error ? e.message : String(e);
  return {
    ok: false,
    error: buildError("SPAWN_ERROR", `Failed to spawn mktg: ${detail}`, [
      "Ensure marketing-cli is installed globally: npm i -g marketing-cli",
      "Verify `mktg` is in PATH: which mktg",
    ]),
    exitCode: 3,
  };
}

function isCommandResult<T>(v: unknown): v is CommandResult<T> {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.ok === "boolean" && typeof r.exitCode === "number";
}

// ─── Typed wrappers ────────────────────────────────────────────────────────

/**
 * mktg status --json
 * Returns brand health, integration status, skill counts, next actions.
 */
export function mktgStatus(cwd?: string): Promise<CommandResult<StatusData>> {
  return run<StatusData>(["status"], { cwd });
}

/**
 * mktg doctor --json
 * Returns health checks for brand files, skills, agents, and CLI dependencies.
 */
export function mktgDoctor(cwd?: string): Promise<CommandResult<DoctorData>> {
  return run<DoctorData>(["doctor"], { cwd });
}

/**
 * mktg list --json [--routing]
 * Returns all skills and agents with install status.
 */
export function mktgList(opts: { routing?: boolean; cwd?: string } = {}): Promise<CommandResult<ListData>> {
  const args = ["list"];
  if (opts.routing) args.push("--routing");
  return run<ListData>(args, { cwd: opts.cwd });
}

/**
 * Resolve a single skill from `mktg list --routing --json`.
 * Keeps the server-side skill detail route on the same data source as the list route.
 */
export async function mktgSkillInfo(
  name: string,
  opts: { cwd?: string } = {},
): Promise<CommandResult<SkillEntry>> {
  const result = await mktgList({ routing: true, cwd: opts.cwd });
  if (!result.ok) return result;

  const skill = result.data.skills.find((entry) => entry.name === name);
  if (!skill) {
    return {
      ok: false,
      error: buildError("NOT_FOUND", `No skill found: '${name}'`, [
        "Call GET /api/skills to list valid skill names",
      ]),
      exitCode: 1,
    };
  }

  return {
    ok: true,
    data: skill,
    exitCode: 0,
  };
}

/**
 * mktg plan --json
 * Returns a prioritized task queue from project state.
 */
export function mktgPlan(cwd?: string): Promise<CommandResult<PlanData>> {
  return run<PlanData>(["plan"], { cwd });
}

/**
 * mktg plan next --json
 * Returns the single highest-priority task.
 */
export function mktgPlanNext(cwd?: string): Promise<CommandResult<PlanNextData>> {
  return run<PlanNextData>(["plan", "next"], { cwd });
}

/**
 * mktg init --json [--from <url>] [--yes] [--dry-run]
 * Bootstraps a project with brand/ files and installs skills.
 */
export function mktgInit(opts: {
  from?: string;
  yes?: boolean;
  dryRun?: boolean;
  cwd?: string;
} = {}): Promise<CommandResult<InitData>> {
  const args = ["init"];
  if (opts.from) args.push("--from", opts.from);
  if (opts.yes) args.push("--yes");
  if (opts.dryRun) args.push("--dry-run");
  return run<InitData>(args, { cwd: opts.cwd });
}

/**
 * mktg run <skill> --json
 * Logs a skill execution and returns the result.
 */
export function mktgRun(skill: string, opts: { cwd?: string } = {}): Promise<CommandResult<RunData>> {
  return run<RunData>(["run", skill], { cwd: opts.cwd });
}

/**
 * mktg catalog list --json
 * Lists registered catalogs from catalogs-manifest.json with configured status.
 */
export function mktgCatalogList(): Promise<CommandResult<CatalogListData>> {
  return run<CatalogListData>(["catalog", "list"]);
}

/**
 * mktg catalog info <name> --json
 * Returns a single CatalogEntry enriched with configured status and missing env vars.
 */
export function mktgCatalogInfo(
  name: string,
): Promise<CommandResult<CatalogEntry & { configured: boolean; missing_envs: string[] }>> {
  return run<CatalogEntry & { configured: boolean; missing_envs: string[] }>(["catalog", "info", name]);
}

/**
 * mktg catalog status --json
 * Returns configured status for all catalogs.
 */
export function mktgCatalogStatus(): Promise<CommandResult<CatalogStatusData>> {
  return run<CatalogStatusData>(["catalog", "status"]);
}

/**
 * mktg publish --json [--adapter <name>] [--confirm] < manifest.json
 * Executes the publish pipeline for a campaign manifest.
 * Pass dryRun=true (default) to validate without publishing.
 */
export function mktgPublish(
  manifest: PublishManifest,
  opts: { adapter?: string; confirm?: boolean; cwd?: string } = {},
): Promise<CommandResult<PublishResult>> {
  const args = ["publish"];
  if (opts.adapter) args.push("--adapter", opts.adapter);
  if (opts.confirm) args.push("--confirm");
  args.push("--input", JSON.stringify(manifest));
  return run<PublishResult>(args, { cwd: opts.cwd });
}

/**
 * mktg publish --list-adapters --json
 * Lists available publish adapters with env var requirements and configured status.
 */
export function mktgPublishListAdapters(): Promise<CommandResult<{ adapters: PublishAdapter[] }>> {
  return run<{ adapters: PublishAdapter[] }>(["publish", "--list-adapters"]);
}

/**
 * mktg publish --adapter <name> --list-integrations --json
 * Lists connected provider integrations for an adapter (postiz only for now).
 */
export function mktgPublishListIntegrations(adapter: string): Promise<CommandResult<IntegrationsData>> {
  return run<IntegrationsData>(["publish", "--adapter", adapter, "--list-integrations"]);
}

/**
 * mktg publish --native-account --json
 * Returns or auto-provisions the local mktg-native workspace account.
 */
export function mktgPublishNativeAccount(cwd?: string): Promise<CommandResult<NativeAccountData>> {
  return run<NativeAccountData>(["publish", "--native-account"], { cwd });
}

/**
 * mktg publish --native-upsert-provider --input '{...}' --json
 * Creates or updates a local provider for the mktg-native backend.
 */
export function mktgPublishNativeUpsertProvider(
  input: {
    id?: string;
    identifier: string;
    name: string;
    profile: string;
    picture?: string;
    disabled?: boolean;
  },
  cwd?: string,
): Promise<CommandResult<NativeProviderData>> {
  return run<NativeProviderData>(
    ["publish", "--native-upsert-provider", "--input", JSON.stringify(input)],
    { cwd },
  );
}

/**
 * mktg publish --native-list-posts --json
 * Returns locally stored mktg-native posts.
 */
export function mktgPublishNativeListPosts(cwd?: string): Promise<CommandResult<NativePostsData>> {
  return run<NativePostsData>(["publish", "--native-list-posts"], { cwd });
}

/**
 * mktg brand read <file> --json
 * Returns the raw markdown content of a brand file.
 */
export function mktgBrandRead(
  file: string,
  cwd?: string,
): Promise<CommandResult<{ content: string }>> {
  return run<{ content: string }>(["brand", "read", file], { cwd });
}

/**
 * mktg schema [<cmd>] --json
 * Returns schema for a specific command (or all commands if no cmd given).
 */
export function mktgSchema(cmd?: string): Promise<CommandResult<SchemaData>> {
  const args = ["schema"];
  if (cmd) args.push(cmd);
  return run<SchemaData>(args);
}
