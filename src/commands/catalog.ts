// mktg catalog — Manage upstream-catalog registry
// Subcommands: list, info, sync, status, add. Read-only except `add`.

import { ok, err, type CommandHandler, type CommandResult, type CommandSchema, type CatalogEntry, type GlobalFlags, type CatalogLoadResult } from "../types";
import { invalidArgs, notFound, rejectControlChars, validateResourceId, parseJsonInput } from "../core/errors";
import { loadCatalogManifest, getCatalog, computeConfiguredStatus, DEFAULT_BUILTIN_PUBLISH_ADAPTERS } from "../core/catalogs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Convert a CatalogLoadResult failure into a CommandResult error envelope.
// Only called when !result.ok.
const loadErrorToResult = (result: Exclude<CatalogLoadResult, { ok: true }>): CommandResult<never> => {
  if (result.reason === "manifest-missing") {
    return err(
      "CATALOG_MANIFEST_INVALID",
      `catalogs-manifest.json not found at ${result.path}`,
      ["Run `mktg catalog add <name> --input '{...}' --confirm` to create the manifest", "Or ship catalogs-manifest.json in the package root"],
      2,
    );
  }
  if (result.reason === "manifest-invalid") {
    return err(
      "CATALOG_MANIFEST_INVALID",
      `catalogs-manifest.json is malformed: ${result.detail}`,
      result.path ? [`Offending path: ${result.path}`, "Manifest must include `name`, `version`, `capabilities`, `auth`, `transport`, `license`. See `src/types.ts` (CatalogsManifest) for the full schema."] : ["Manifest must include `name`, `version`, `capabilities`, `auth`, `transport`, `license`. See `src/types.ts` (CatalogsManifest) for the full schema."],
      2,
    );
  }
  if (result.reason === "collision") {
    const lines = result.collisions.map(c =>
      `- ${c.kind}:${c.adapter} declared by: ${c.declaredBy.join(", ")}`,
    );
    return err(
      "CATALOG_COLLISION",
      `Two or more catalogs declare the same adapter name`,
      ["Adapter names must be globally unique across all catalogs + built-in adapters:", ...lines, "Rename one or remove the duplicate"],
      2,
    );
  }
  // license-denied
  const lines = result.denials.map(d =>
    `- '${d.catalog}' (license: ${d.license}) declares transport: '${d.transport}'${d.sdk_reference ? `, sdk_reference: '${d.sdk_reference}'` : ""}`,
  );
  return err(
    "CATALOG_LICENSE_DENIED",
    "Copyleft-licensed catalog cannot declare transport: 'sdk' or a non-null sdk_reference",
    [...lines, "Copyleft catalogs must use transport: 'http' AND sdk_reference: null (raw-fetch path)"],
    2,
  );
};

// Parse `mktg catalog <sub> <name>` — slices past the subcommand token, then
// runs hardening on the positional name. Every subcommand that takes a name
// must call this so input validation lives in one place.
const parseNamePositional = (
  args: readonly string[],
  subcommand: string,
): { ok: true; name: string } | { ok: false; result: CommandResult<never> } => {
  const positional = args.filter(a => !a.startsWith("--"));
  // positional[0] === subcommand, positional[1] is the name
  const name = positional[1];
  if (!name) {
    return {
      ok: false,
      result: invalidArgs(
        `Missing catalog name for 'catalog ${subcommand}'`,
        [`Usage: mktg catalog ${subcommand} <name> [--json]`, "mktg catalog list --json to see registered catalogs"],
      ),
    };
  }
  const idCheck = validateResourceId(name, "catalog");
  if (!idCheck.ok) return { ok: false, result: invalidArgs(idCheck.message) };
  const ctrlCheck = rejectControlChars(name, "catalog");
  if (!ctrlCheck.ok) return { ok: false, result: invalidArgs(ctrlCheck.message) };
  return { ok: true, name };
};

// ---------------------------------------------------------------------------
// Subcommand schemas
// ---------------------------------------------------------------------------

export const listSchema: CommandSchema = {
  name: "list",
  description: "List registered catalogs from catalogs-manifest.json",
  flags: [],
  output: {
    "catalogs": "CatalogEntry[] — registered catalogs in manifest order",
    "catalogs.*.name": "string — catalog identifier",
    "catalogs.*.repo_url": "string — upstream GitHub repo URL",
    "catalogs.*.docs_url": "string — upstream documentation URL",
    "catalogs.*.license": "string — SPDX license identifier",
    "catalogs.*.version_pinned": "string — upstream release tag",
    "catalogs.*.transport": "'sdk' | 'http' — how this catalog talks to upstream",
    "catalogs.*.sdk_reference": "string | null — npm package when transport='sdk'; null when transport='http'",
    "catalogs.*.auth.style": "'bearer' | 'basic' | 'oauth2' | 'none'",
    "catalogs.*.auth.base_env": "string — env var name for API base URL",
    "catalogs.*.auth.credential_envs": "string[] — env var names for credentials",
    "catalogs.*.auth.header_format": "'bearer' | 'bare' — HTTP Authorization header format (optional)",
    "catalogs.*.capabilities.publish_adapters": "string[] — publish adapter names this catalog contributes",
    "catalogs.*.capabilities.scheduling_adapters": "string[] — scheduling adapter names",
    "catalogs.*.capabilities.email_adapters": "string[] — email adapter names",
    "catalogs.*.skills": "string[] — SKILL.md names this catalog contributes",
    "installed": "number — catalogs whose auth envs are all set in process.env",
    "total": "number — total catalogs registered",
  },
  examples: [
    { args: "mktg catalog list --json", description: "Full catalog list" },
    { args: "mktg catalog list --fields catalogs.name --json", description: "Just catalog names" },
  ],
  vocabulary: ["catalog list", "list catalogs", "upstream"],
};

export const infoSchema: CommandSchema = {
  name: "info",
  description: "Show full metadata for a single catalog, with computed env-configured state",
  flags: [],
  positional: { name: "name", description: "Catalog identifier", required: true },
  output: {
    "name": "string — catalog identifier",
    "repo_url": "string",
    "docs_url": "string",
    "license": "string — SPDX identifier",
    "version_pinned": "string — upstream release tag",
    "transport": "'sdk' | 'http'",
    "sdk_reference": "string | null",
    "auth.style": "'bearer' | 'basic' | 'oauth2' | 'none'",
    "auth.base_env": "string",
    "auth.credential_envs": "string[]",
    "auth.header_format": "'bearer' | 'bare'",
    "capabilities.publish_adapters": "string[]",
    "capabilities.scheduling_adapters": "string[]",
    "capabilities.email_adapters": "string[]",
    "skills": "string[]",
    "configured": "boolean — true iff every auth env var is set in process.env",
    "missing_envs": "string[] — auth env var names that are currently unset",
    "resolved_base": "string | null — process.env[auth.base_env] if set, else null",
  },
  examples: [
    { args: "mktg catalog info postiz --json", description: "Full postiz metadata + configured status" },
    { args: "mktg catalog info postiz --fields configured,missing_envs --json", description: "Just runtime readiness" },
  ],
  vocabulary: ["catalog info", "catalog metadata"],
};

export const syncSchema: CommandSchema = {
  name: "sync",
  description: "Check each catalog's pinned version against upstream (v1: read-only, reports drift without mutating)",
  flags: [
    { name: "--dry-run", type: "boolean", required: false, default: false, description: "Preview version diffs without writing (v1 is always read-only — flag accepted for forward-compat)" },
    { name: "--catalog", type: "string", required: false, description: "Limit sync to a single catalog" },
  ],
  output: {
    "catalogs": "Array<{name, from_version, to_version, changed}> — per-catalog diff",
    "catalogs.*.name": "string",
    "catalogs.*.from_version": "string — currently pinned version",
    "catalogs.*.to_version": "string | null — latest upstream tag, or null on network error",
    "catalogs.*.changed": "boolean — true if from_version !== to_version",
    "catalogs.*.error": "string | undefined — present when upstream check failed",
    "summary.total": "number",
    "summary.changed": "number — catalogs with pending bumps",
    "summary.errors": "number — upstream check failures",
    "dryRun": "boolean",
  },
  examples: [
    { args: "mktg catalog sync --json", description: "Check all catalogs for upstream version drift" },
    { args: "mktg catalog sync --catalog postiz --json", description: "Check one catalog only" },
  ],
  vocabulary: ["catalog sync", "upstream version"],
};

export const statusSchema: CommandSchema = {
  name: "status",
  description: "Health snapshot across all catalogs: configured + reachable",
  flags: [],
  output: {
    "catalogs": "Array<{name, configured, healthy, detail}>",
    "catalogs.*.name": "string",
    "catalogs.*.configured": "boolean — all auth env vars set",
    "catalogs.*.healthy": "boolean | null — reachable + auth ok (null when unconfigured or read-only path)",
    "catalogs.*.detail": "string — human-readable status message",
    "summary.total": "number",
    "summary.configured": "number",
    "summary.healthy": "number",
  },
  examples: [
    { args: "mktg catalog status --json", description: "All catalog health at a glance" },
    { args: "mktg catalog status --fields summary --json", description: "Summary counts only" },
  ],
  vocabulary: ["catalog status", "catalog health"],
};

export const addSchema: CommandSchema = {
  name: "add",
  description: "Register a new catalog in catalogs-manifest.json (mutating)",
  flags: [
    { name: "--dry-run", type: "boolean", required: false, default: false, description: "Preview the manifest change without writing" },
    { name: "--confirm", type: "boolean", required: false, default: false, description: "Required to actually write the manifest" },
  ],
  positional: { name: "name", description: "Catalog identifier (must match resource-id regex)", required: true },
  output: {
    "name": "string — catalog identifier that was added",
    "added": "boolean — true when manifest was written; false on --dry-run or confirm-missing",
    "location": "string — absolute path to catalogs-manifest.json",
    "before": "CatalogEntry | null — previous entry when this was an overwrite",
    "after": "CatalogEntry — final entry",
    "dryRun": "boolean",
  },
  examples: [
    { args: `mktg catalog add postiz --input '{...}' --dry-run --json`, description: "Preview adding postiz via inline JSON" },
    { args: `mktg catalog add postiz --input '{...}' --confirm --json`, description: "Actually write postiz to manifest" },
  ],
  vocabulary: ["catalog add", "register catalog", "new catalog"],
};

// Umbrella schema — subcommands carry the non-empty output maps.
export const schema: CommandSchema = {
  name: "catalog",
  description: "Manage upstream-catalog registry (list, info, sync, status, add). Catalogs are external OSS projects mktg integrates with via SDK or raw HTTP.",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: [listSchema, infoSchema, syncSchema, statusSchema, addSchema],
  output: {},
  examples: [
    { args: "mktg catalog list --json", description: "List registered catalogs" },
    { args: "mktg catalog info postiz --json", description: "Show postiz metadata" },
    { args: "mktg catalog status --json", description: "Health check across all catalogs" },
  ],
  vocabulary: ["catalog", "catalogs", "upstream", "integration"],
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

type ListResult = {
  readonly catalogs: readonly CatalogEntry[];
  readonly installed: number;
  readonly total: number;
};

const handleList = async (): Promise<CommandResult<ListResult>> => {
  const result = await loadCatalogManifest();
  if (!result.ok) return loadErrorToResult(result);

  const catalogs = Object.values(result.manifest.catalogs);
  let installed = 0;
  for (const c of catalogs) {
    const { configured } = computeConfiguredStatus(c);
    if (configured) installed++;
  }
  return ok({ catalogs, installed, total: catalogs.length });
};

type InfoResult = CatalogEntry & {
  readonly configured: boolean;
  readonly missing_envs: readonly string[];
  readonly resolved_base: string | null;
};

const handleInfo = async (args: readonly string[]): Promise<CommandResult<InfoResult>> => {
  const parsed = parseNamePositional(args, "info");
  if (!parsed.ok) return parsed.result;

  const result = await loadCatalogManifest();
  if (!result.ok) return loadErrorToResult(result);

  const entry = getCatalog(result.manifest, parsed.name);
  if (!entry) {
    return err(
      "CATALOG_NOT_FOUND",
      `Catalog '${parsed.name}' not found in catalogs-manifest.json`,
      [`Registered catalogs: ${Object.keys(result.manifest.catalogs).join(", ") || "(none)"}`, "mktg catalog list --json"],
      1,
    );
  }
  const status = computeConfiguredStatus(entry);
  return ok({
    ...entry,
    configured: status.configured,
    missing_envs: status.missingEnvs,
    resolved_base: status.resolvedBase,
  });
};

type SyncItem = {
  readonly name: string;
  readonly from_version: string;
  readonly to_version: string | null;
  readonly changed: boolean;
  readonly error?: string;
};

type SyncResult = {
  readonly catalogs: readonly SyncItem[];
  readonly summary: { readonly total: number; readonly changed: number; readonly errors: number };
  readonly dryRun: boolean;
};

const parseSyncFlags = (args: readonly string[]): { catalogFilter?: string } => {
  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    if (args[i] === "--catalog" && next !== undefined) return { catalogFilter: next };
    const a = args[i];
    if (a && a.startsWith("--catalog=")) return { catalogFilter: a.slice(10) };
  }
  return {};
};

const handleSync = async (args: readonly string[]): Promise<CommandResult<SyncResult>> => {
  const result = await loadCatalogManifest();
  if (!result.ok) return loadErrorToResult(result);

  const { catalogFilter } = parseSyncFlags(args);
  const entries = Object.values(result.manifest.catalogs).filter(c =>
    !catalogFilter || c.name === catalogFilter,
  );

  // v1: read-only. We do NOT hit the network in this implementation — that
  // comes in a follow-up PR that wires GitHub Releases API. Returning
  // to_version: null with a clear detail is honest about the v1 scope.
  const items: SyncItem[] = entries.map(c => ({
    name: c.name,
    from_version: c.version_pinned,
    to_version: null,
    changed: false,
    error: "upstream version check not yet implemented — see plan v2 §Phase A-prime",
  }));

  return ok({
    catalogs: items,
    summary: {
      total: items.length,
      changed: items.filter(i => i.changed).length,
      errors: items.filter(i => i.error !== undefined).length,
    },
    dryRun: true,
  });
};

type StatusItem = {
  readonly name: string;
  readonly configured: boolean;
  readonly healthy: boolean | null;
  readonly detail: string;
};

type StatusResult = {
  readonly catalogs: readonly StatusItem[];
  readonly summary: { readonly total: number; readonly configured: number; readonly healthy: number };
};

const handleStatus = async (): Promise<CommandResult<StatusResult>> => {
  const result = await loadCatalogManifest();
  if (!result.ok) return loadErrorToResult(result);

  const items: StatusItem[] = Object.values(result.manifest.catalogs).map(c => {
    const s = computeConfiguredStatus(c);
    const detail = s.configured
      ? `configured — ${c.transport} transport to ${s.resolvedBase ?? "<no base>"}`
      : `unconfigured — missing: ${s.missingEnvs.join(", ")}`;
    return {
      name: c.name,
      configured: s.configured,
      // v1 does not actually ping the upstream; "healthy" stays null until a
      // follow-up wires health probes. configured=false → healthy=null is honest.
      healthy: null,
      detail,
    };
  });

  return ok({
    catalogs: items,
    summary: {
      total: items.length,
      configured: items.filter(i => i.configured).length,
      healthy: items.filter(i => i.healthy === true).length,
    },
  });
};

type AddResult = {
  readonly name: string;
  readonly added: boolean;
  readonly location: string;
  readonly before: CatalogEntry | null;
  readonly after: CatalogEntry;
  readonly dryRun: boolean;
};

// Shape-validate a user-supplied CatalogEntry. We delegate to the loader's
// shape validator by synthesizing a single-entry manifest and loading it.
const validateEntryShape = async (
  entry: unknown,
  name: string,
): Promise<{ ok: true; entry: CatalogEntry } | { ok: false; detail: string; path: string }> => {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return { ok: false, detail: "entry must be an object", path: "" };
  }
  const withName = { ...(entry as object), name };
  const syntheticManifest = { version: 1, catalogs: { [name]: withName } };
  const { _testing } = await import("../core/catalogs");
  const check = _testing.validateShape(syntheticManifest);
  if (!check.ok) {
    return { ok: false, detail: check.detail, path: check.path };
  }
  return { ok: true, entry: check.manifest.catalogs[name]! };
};

const handleAdd = async (args: readonly string[], flags: GlobalFlags): Promise<CommandResult<AddResult>> => {
  const parsed = parseNamePositional(args, "add");
  if (!parsed.ok) return parsed.result;

  const raw = flags.jsonInput;
  if (!raw) {
    return invalidArgs(
      "Missing --input flag with CatalogEntry JSON payload",
      [
        "Usage: mktg catalog add <name> --input '<json>' --confirm --json",
        "Example: mktg catalog add postiz --input '{\"name\":\"postiz\",...}' --dry-run --json",
      ],
    );
  }
  const payload = parseJsonInput<unknown>(raw);
  if (!payload.ok) return invalidArgs(`Invalid catalog JSON: ${payload.message}`);

  const shapeCheck = await validateEntryShape(payload.data, parsed.name);
  if (!shapeCheck.ok) {
    return err(
      "CATALOG_MANIFEST_INVALID",
      `Payload fails CatalogEntry shape check: ${shapeCheck.detail}`,
      shapeCheck.path ? [`Offending path: ${shapeCheck.path}`, "Entry must include `name`, `version`, `capabilities`, `auth`, `transport`, `license`. See `src/types.ts` (CatalogEntry) for the full schema."] : ["Entry must include `name`, `version`, `capabilities`, `auth`, `transport`, `license`. See `src/types.ts` (CatalogEntry) for the full schema."],
      2,
    );
  }

  // Destructive-op gate: require either --dry-run OR --confirm; default to dry-run.
  const confirm = args.includes("--confirm");
  const explicitDryRun = args.includes("--dry-run") || flags.dryRun;
  const effectiveDryRun = explicitDryRun || !confirm;

  const { loadCatalogManifest: loader } = await import("../core/catalogs");
  const current = await loader();
  // Build merged manifest. If current load failed with manifest-missing, start empty.
  const existingCatalogs = current.ok ? current.manifest.catalogs : {};
  if (!current.ok && current.reason !== "manifest-missing") {
    return loadErrorToResult(current);
  }
  const before = existingCatalogs[parsed.name] ?? null;
  const mergedCatalogs = { ...existingCatalogs, [parsed.name]: shapeCheck.entry };
  const mergedManifest = { version: 1, catalogs: mergedCatalogs };

  // Collision + license gate on the merged shape (no write if it would fail).
  const { detectAdapterCollisions, detectLicenseDenials } = await import("../core/catalogs");
  const collisions = detectAdapterCollisions(mergedManifest, { publish_adapters: DEFAULT_BUILTIN_PUBLISH_ADAPTERS });
  if (collisions.length > 0) {
    return loadErrorToResult({ ok: false, reason: "collision", collisions });
  }
  const denials = detectLicenseDenials(mergedManifest);
  if (denials.length > 0) {
    return loadErrorToResult({ ok: false, reason: "license-denied", denials });
  }

  const { getPackageRoot } = await import("../core/paths");
  const { join } = await import("node:path");
  const manifestPath = join(getPackageRoot(), "catalogs-manifest.json");

  if (!effectiveDryRun) {
    await Bun.write(manifestPath, JSON.stringify(mergedManifest, null, 2) + "\n");
  }

  return ok({
    name: parsed.name,
    added: !effectiveDryRun,
    location: manifestPath,
    before,
    after: shapeCheck.entry,
    dryRun: effectiveDryRun,
  });
};

// ---------------------------------------------------------------------------
// Subcommand router
// ---------------------------------------------------------------------------

export const handler: CommandHandler = async (args, flags) => {
  const positional = args.filter(a => !a.startsWith("--"));
  const sub = positional[0];

  if (!sub) {
    return invalidArgs(
      "Missing subcommand",
      [
        "Usage: mktg catalog <list | info | sync | status | add> [...args]",
        "mktg catalog list --json",
      ],
    );
  }

  switch (sub) {
    case "list": return handleList();
    case "info": return handleInfo(args);
    case "sync": return handleSync(args);
    case "status": return handleStatus();
    case "add": return handleAdd(args, flags);
    default:
      return invalidArgs(
        `Unknown catalog subcommand: '${sub}'`,
        ["Available: list, info, sync, status, add"],
      );
  }
};
