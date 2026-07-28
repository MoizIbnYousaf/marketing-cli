// mktg seo — OpenSEO state sync contract (S3)
// The CLI owns state and contracts; agents own MCP intelligence. This command
// group manages the binding (.seo/openseo.json), reports honest readiness
// (including named states from the integration plan Phase 2), and merges
// agent-produced keyword sync payloads into brand/keyword-plan.md — never
// overwriting brand memory without --confirm.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema, type CommandResult } from "../types";
import { notFound, invalidArgs, rejectControlChars, parseJsonInput } from "../core/errors";
import { loadCatalogManifest, computeConfiguredStatus } from "../core/catalogs";
import { isTemplateContent } from "../core/brand";

const SEO_DIR = ".seo";
const BINDING_FILE = "openseo.json";
const SYNC_FILE = "keywords-sync.json";
const HOSTED_MCP_URL = "https://app.openseo.so/mcp";
const HOSTED_APP_URL = "https://app.openseo.so";

// ─── Types ───────────────────────────────────────────────────────────────

type SeoBinding = {
  readonly version: 1;
  readonly projectId: string;
  readonly domain: string;
  readonly mcpUrl: string;
  readonly linkedAt: string;
  readonly updatedAt: string;
  readonly lastKeywordsSync?: string;
};

type SeoReadiness = "not_configured" | "mcp_client_only" | "api_ready" | "selfhost_ready";

type KeywordSyncEntry = {
  readonly keyword: string;
  readonly intent?: string;
  readonly volume?: number;
  readonly kd?: number;
  readonly cpc?: number;
  readonly priority?: string;
  readonly cluster?: string;
  readonly notes?: string;
};

type KeywordSyncPayload = {
  readonly version: 1;
  readonly syncedAt: string;
  readonly keywords: readonly KeywordSyncEntry[];
};

const MAX_SYNC_KEYWORDS = 500;

// ─── Binding I/O ─────────────────────────────────────────────────────────

const bindingPath = (cwd: string): string => join(cwd, SEO_DIR, BINDING_FILE);
const syncPath = (cwd: string): string => join(cwd, SEO_DIR, SYNC_FILE);

const isBinding = (value: unknown): value is SeoBinding =>
  typeof value === "object" && value !== null &&
  (value as SeoBinding).version === 1 &&
  typeof (value as SeoBinding).projectId === "string" &&
  typeof (value as SeoBinding).domain === "string" &&
  typeof (value as SeoBinding).mcpUrl === "string" &&
  typeof (value as SeoBinding).linkedAt === "string" &&
  typeof (value as SeoBinding).updatedAt === "string";

const readBinding = async (cwd: string): Promise<{ binding: SeoBinding | null; corrupt: boolean }> => {
  const file = Bun.file(bindingPath(cwd));
  if (!(await file.exists())) return { binding: null, corrupt: false };
  try {
    const parsed = await file.json() as unknown;
    return isBinding(parsed) ? { binding: parsed, corrupt: false } : { binding: null, corrupt: true };
  } catch {
    return { binding: null, corrupt: true };
  }
};

const writeBinding = async (cwd: string, binding: SeoBinding): Promise<void> => {
  await mkdir(join(cwd, SEO_DIR), { recursive: true });
  const tmp = `${bindingPath(cwd)}.tmp`;
  await Bun.write(tmp, JSON.stringify(binding, null, 2) + "\n");
  const { rename } = await import("node:fs/promises");
  await rename(tmp, bindingPath(cwd));
};

// ─── Validators ──────────────────────────────────────────────────────────

const validateProjectId = (projectId: unknown): { ok: true; value: string } | { ok: false; message: string } => {
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return { ok: false, message: "projectId must be a non-empty string" };
  }
  const value = projectId.trim();
  if (value.length > 128) return { ok: false, message: "projectId exceeds 128 chars" };
  const ctrl = rejectControlChars(value, "projectId");
  if (!ctrl.ok) return { ok: false, message: ctrl.message };
  return { ok: true, value };
};

const validateDomain = (domain: unknown): { ok: true; value: string } | { ok: false; message: string } => {
  if (typeof domain !== "string" || domain.trim().length === 0) {
    return { ok: false, message: "domain must be a non-empty string (e.g. example.com)" };
  }
  const value = domain.trim().toLowerCase();
  if (value.length > 253) return { ok: false, message: "domain exceeds 253 chars" };
  const ctrl = rejectControlChars(value, "domain");
  if (!ctrl.ok) return { ok: false, message: ctrl.message };
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    return { ok: false, message: `'${value}' is not a bare hostname — pass the domain only, no protocol or path (e.g. example.com)` };
  }
  return { ok: true, value };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateSyncPayload = (raw: unknown): { ok: true; payload: KeywordSyncPayload } | { ok: false; message: string } => {
  if (!isPlainObject(raw)) return { ok: false, message: "sync payload must be a JSON object" };
  if (raw.version !== 1) return { ok: false, message: "sync payload must declare version: 1" };
  if (typeof raw.syncedAt !== "string") return { ok: false, message: "sync payload missing syncedAt (ISO timestamp)" };
  if (!Array.isArray(raw.keywords)) return { ok: false, message: "sync payload keywords must be an array" };
  if (raw.keywords.length > MAX_SYNC_KEYWORDS) {
    return { ok: false, message: `sync payload has ${raw.keywords.length} keywords — max ${MAX_SYNC_KEYWORDS} per sync (split into batches)` };
  }
  const entries: KeywordSyncEntry[] = [];
  for (const [i, item] of (raw.keywords as unknown[]).entries()) {
    if (!isPlainObject(item)) return { ok: false, message: `keywords[${i}] must be an object` };
    if (typeof item.keyword !== "string" || item.keyword.trim().length === 0) {
      return { ok: false, message: `keywords[${i}].keyword must be a non-empty string` };
    }
    const keyword = item.keyword.trim();
    if (keyword.length > 200) return { ok: false, message: `keywords[${i}].keyword exceeds 200 chars` };
    const ctrl = rejectControlChars(keyword, `keywords[${i}]`);
    if (!ctrl.ok) return { ok: false, message: ctrl.message };
    const entry: Record<string, unknown> = { keyword };
    for (const strField of ["intent", "priority", "cluster", "notes"] as const) {
      if (item[strField] !== undefined) {
        if (typeof item[strField] !== "string") return { ok: false, message: `keywords[${i}].${strField} must be a string` };
        const fc = rejectControlChars(item[strField] as string, `keywords[${i}].${strField}`);
        if (!fc.ok) return { ok: false, message: fc.message };
        entry[strField] = item[strField];
      }
    }
    for (const numField of ["volume", "kd", "cpc"] as const) {
      if (item[numField] !== undefined) {
        const n = item[numField];
        if (typeof n !== "number" || Number.isNaN(n) || n < 0) {
          return { ok: false, message: `keywords[${i}].${numField} must be a non-negative number` };
        }
        entry[numField] = n;
      }
    }
    entries.push(entry as KeywordSyncEntry);
  }
  return { ok: true, payload: { version: 1, syncedAt: raw.syncedAt, keywords: entries } };
};

// ─── Keyword-plan merge (atomic section replace/append) ─────────────────

const SYNC_SECTION_RE = /\n## OpenSEO Sync \([^\n]*\)\n[\s\S]*?(?=\n## |\s*$)/;

const buildSyncSection = (payload: KeywordSyncPayload): string => {
  const date = payload.syncedAt.slice(0, 10);
  const header = `## OpenSEO Sync (${date})\n\nSynced from OpenSEO saved keywords at ${payload.syncedAt}. Regenerate with \`mktg seo sync-keywords --confirm\`; this section is replaced atomically on each sync.\n\n| Keyword | Intent | Volume | KD | CPC | Priority | Cluster |\n| ------- | ------ | -----: | --: | --: | -------- | ------- |`;
  const rows = payload.keywords.map(k =>
    `| ${k.keyword} | ${k.intent ?? "unknown"} | ${k.volume ?? "unknown"} | ${k.kd ?? "unknown"} | ${k.cpc ?? "unknown"} | ${k.priority ?? "—"} | ${k.cluster ?? "—"} |`,
  );
  return `${header}\n${rows.join("\n")}\n`;
};

const mergeSyncSection = (existing: string, section: string): string => {
  if (SYNC_SECTION_RE.test(existing)) {
    return existing.replace(SYNC_SECTION_RE, `\n${section}`);
  }
  const trimmed = existing.endsWith("\n") ? existing : `${existing}\n`;
  return `${trimmed}\n${section}`;
};

// ─── Schema ──────────────────────────────────────────────────────────────

const statusSchema: CommandSchema = {
  name: "status",
  description: "SEO readiness snapshot: OpenSEO catalog config, project binding, .seo state inventory, and keyword-plan state. All local state — no network calls",
  flags: [],
  output: {
    catalog: "{configured, missingEnvs, mcp} — OpenSEO catalog state",
    readiness: "'not_configured' | 'mcp_client_only' | 'api_ready' | 'selfhost_ready' — named readiness (integration plan Phase 2)",
    project: "SeoBinding | null — .seo/openseo.json binding (projectId, domain, mcpUrl)",
    bindingCorrupt: "boolean — true when the binding file exists but fails validation",
    state: "{rankSnapshots, hasBacklinkOverview, gscFiles, hasKeywordsSync, keywordsSyncAt} — .seo inventory",
    keywordPlan: "'missing' | 'template' | 'populated' — brand/keyword-plan.md state",
  },
  examples: [{ args: "mktg seo status --json", description: "Full SEO readiness snapshot" }],
  vocabulary: ["seo status", "openseo status", "seo readiness"],
};

const linkSchema: CommandSchema = {
  name: "link-project",
  description: "Bind this repo to an OpenSEO project id (.seo/openseo.json). Idempotent: same project is a no-op; relinking to a different project requires --confirm",
  flags: [
    { name: "--confirm", type: "boolean", required: false, description: "Required to write or relink the binding" },
  ],
  output: {
    linked: "boolean — true when the binding was written",
    unchanged: "boolean — true when the existing binding already matched",
    binding: "SeoBinding — resulting binding (after state on write, preview on dry-run)",
    previousProjectId: "string | null — project being replaced when relinking",
  },
  examples: [
    { args: 'mktg seo link-project --input \'{"projectId":"proj_123","domain":"example.com"}\' --dry-run --json', description: "Preview binding" },
    { args: 'mktg seo link-project --input \'{"projectId":"proj_123","domain":"example.com"}\' --confirm --json', description: "Write binding" },
  ],
  vocabulary: ["seo link", "openseo project", "bind project"],
};

const syncSchema: CommandSchema = {
  name: "sync-keywords",
  description: "Merge .seo/keywords-sync.json (produced by openseo-keyword-research from OpenSEO saved keywords) into brand/keyword-plan.md as an atomic 'OpenSEO Sync' section. --dry-run previews; --confirm writes",
  flags: [
    { name: "--confirm", type: "boolean", required: false, description: "Required to write into brand/keyword-plan.md" },
  ],
  output: {
    keywords: "number — keywords in the sync payload",
    added: "number — new keywords not already in the plan's sync section",
    action: "'preview' | 'merged' | 'noop' — what happened",
    section: "string — the 'OpenSEO Sync (date)' markdown section (preview or written)",
    keywordPlan: "string — path merged into (brand/keyword-plan.md)",
  },
  examples: [
    { args: "mktg seo sync-keywords --dry-run --json", description: "Preview the merge without writing" },
    { args: "mktg seo sync-keywords --confirm --json", description: "Merge into brand/keyword-plan.md" },
  ],
  vocabulary: ["seo sync", "sync keywords", "openseo keywords"],
};

const openSchema: CommandSchema = {
  name: "open",
  description: "Print the OpenSEO app URL for the bound project (hosted, or self-host base when configured)",
  flags: [],
  output: { url: "string — app URL to open", projectId: "string | null" },
  examples: [{ args: "mktg seo open --json", description: "Get the OpenSEO app URL" }],
  vocabulary: ["seo open", "openseo app"],
};

export const schema: CommandSchema = {
  name: "seo",
  description: "OpenSEO state sync contract: project binding, readiness status, keyword sync into brand memory. Agents own MCP calls; the CLI owns state",
  flags: [],
  positional: { name: "subcommand", description: "status | link-project | sync-keywords | open", required: true },
  subcommands: [statusSchema, linkSchema, syncSchema, openSchema],
  output: {},
  examples: [
    { args: "mktg seo status --json", description: "SEO readiness snapshot" },
    { args: 'mktg seo link-project --input \'{"projectId":"proj_123","domain":"example.com"}\' --confirm --json', description: "Bind to an OpenSEO project" },
    { args: "mktg seo sync-keywords --dry-run --json", description: "Preview keyword sync" },
  ],
  vocabulary: ["seo", "openseo", "search engine optimization"],
};

// ─── Handlers ────────────────────────────────────────────────────────────

const handleStatus = async (cwd: string): Promise<CommandResult> => {
  const catalogResult = await loadCatalogManifest();
  const openseo = catalogResult.ok ? catalogResult.manifest.catalogs["openseo"] ?? null : null;
  const catalogStatus = openseo ? computeConfiguredStatus(openseo) : null;
  const { binding, corrupt } = await readBinding(cwd);

  const seoDir = join(cwd, SEO_DIR);
  const rankSnapshots = await (async () => {
    try {
      const glob = new Bun.Glob("*.json");
      let count = 0;
      for await (const _f of glob.scan({ cwd: join(seoDir, "rank-snapshots") })) count++;
      return count;
    } catch { return 0; }
  })();
  const hasBacklinkOverview = await Bun.file(join(seoDir, "backlink-overview.json")).exists();
  const gscFiles = await (async () => {
    try {
      const glob = new Bun.Glob("*.csv");
      let count = 0;
      for await (const _f of glob.scan({ cwd: join(seoDir, "gsc") })) count++;
      return count;
    } catch { return 0; }
  })();
  const syncFile = Bun.file(syncPath(cwd));
  const hasKeywordsSync = await syncFile.exists();

  const keywordPlanFile = Bun.file(join(cwd, "brand", "keyword-plan.md"));
  const keywordPlan = !(await keywordPlanFile.exists())
    ? "missing" as const
    : isTemplateContent("keyword-plan.md", await keywordPlanFile.text()) ? "template" as const : "populated" as const;

  const resolvedBase = catalogStatus?.resolvedBase ?? null;
  const isSelfHost = resolvedBase !== null && !resolvedBase.includes("openseo.so");
  const fullyConfigured = catalogStatus?.configured ?? false;
  // Named readiness (integration plan Phase 2). api_ready/selfhost_ready
  // require FULL catalog config (credential + resolved base) — a credential
  // without a reachable base is not readiness, it's a half-configured state.
  const readiness: SeoReadiness = fullyConfigured
    ? (isSelfHost ? "selfhost_ready" : "api_ready")
    : (binding || process.env.OPENSEO_MCP_CONFIGURED === "1" ? "mcp_client_only" : "not_configured");

  return ok({
    catalog: {
      registered: openseo !== null,
      configured: catalogStatus?.configured ?? false,
      missingEnvs: catalogStatus?.missingEnvs ?? [],
      mcp: openseo?.mcp ?? null,
      resolvedBase,
    },
    readiness,
    project: binding,
    bindingCorrupt: corrupt,
    state: {
      rankSnapshots,
      hasBacklinkOverview,
      gscFiles,
      hasKeywordsSync,
      keywordsSyncAt: binding?.lastKeywordsSync ?? null,
    },
    keywordPlan,
  });
};

const handleLinkProject = async (flags: { cwd: string; jsonInput: string | undefined; dryRun: boolean; confirm: boolean }): Promise<CommandResult> => {
  if (!flags.jsonInput) {
    return invalidArgs("Missing --input with binding JSON", [
      'Usage: mktg seo link-project --input \'{"projectId":"proj_123","domain":"example.com"}\' --confirm --json',
      "Optional: mcpUrl (https, defaults to hosted MCP)",
    ]);
  }
  const parsed = parseJsonInput<{ projectId?: unknown; domain?: unknown; mcpUrl?: unknown }>(flags.jsonInput);
  if (!parsed.ok) return invalidArgs(`Invalid --input JSON: ${parsed.message}`, []);

  const idCheck = validateProjectId(parsed.data.projectId);
  if (!idCheck.ok) return invalidArgs(idCheck.message, []);
  const domainCheck = validateDomain(parsed.data.domain);
  if (!domainCheck.ok) return invalidArgs(domainCheck.message, []);

  let mcpUrl = HOSTED_MCP_URL;
  if (parsed.data.mcpUrl !== undefined) {
    if (typeof parsed.data.mcpUrl !== "string" || !parsed.data.mcpUrl.startsWith("https://")) {
      return invalidArgs("mcpUrl must be an https URL", [`Hosted default: ${HOSTED_MCP_URL}`]);
    }
    mcpUrl = parsed.data.mcpUrl;
  }

  const now = new Date().toISOString();
  const { binding: existing, corrupt } = await readBinding(flags.cwd);

  if (existing && existing.projectId === idCheck.value && existing.domain === domainCheck.value && existing.mcpUrl === mcpUrl) {
    return ok({ linked: false, unchanged: true, binding: existing, previousProjectId: null });
  }

  if (corrupt) {
    return invalidArgs(`.seo/openseo.json exists but is not a valid binding — inspect it manually before relinking`, [
      "Fix or delete the corrupt file, then re-run link-project",
    ]);
  }

  const next: SeoBinding = {
    version: 1,
    projectId: idCheck.value,
    domain: domainCheck.value,
    mcpUrl,
    linkedAt: existing?.linkedAt ?? now,
    updatedAt: now,
  };

  // Relinking to a DIFFERENT project replaces state — destructive guard.
  // First-time linking is a plain mutation: --dry-run previews, no --confirm needed.
  const relinking = existing !== null && existing.projectId !== idCheck.value;
  if (relinking && !flags.confirm) {
    return ok({
      linked: false,
      unchanged: false,
      binding: next,
      previousProjectId: existing?.projectId ?? null,
      needsConfirm: true,
      hint: "Relinking replaces the existing project binding — re-run with --confirm",
    });
  }

  if (flags.dryRun) {
    return ok({ linked: false, unchanged: false, binding: next, previousProjectId: existing?.projectId ?? null, dryRun: true });
  }
  await writeBinding(flags.cwd, next);
  return ok({ linked: true, unchanged: false, binding: next, previousProjectId: existing?.projectId ?? null });
};

const handleSyncKeywords = async (flags: { cwd: string; dryRun: boolean; confirm: boolean }): Promise<CommandResult> => {
  const file = Bun.file(syncPath(flags.cwd));
  if (!(await file.exists())) {
    return notFound(".seo/keywords-sync.json", [
      "Run /openseo-keyword-research to produce a sync payload from OpenSEO saved keywords",
      'Or create the file manually: {"version":1,"syncedAt":"<iso>","keywords":[{"keyword":"..."}]}',
    ]);
  }
  let raw: unknown;
  try {
    raw = await file.json();
  } catch {
    return invalidArgs(".seo/keywords-sync.json is not valid JSON", ["Inspect the file, then re-run sync"]);
  }
  const validated = validateSyncPayload(raw);
  if (!validated.ok) return invalidArgs(validated.message, ["Fix the payload shape and re-run"]);

  const payload = validated.payload;
  const planPath = join(flags.cwd, "brand", "keyword-plan.md");
  const planFile = Bun.file(planPath);
  if (!(await planFile.exists())) {
    return notFound("brand/keyword-plan.md", [
      "Run mktg init to scaffold brand files, or /keyword-research to build the plan first",
    ]);
  }
  const existing = await planFile.text();
  if (isTemplateContent("keyword-plan.md", existing)) {
    return invalidArgs("brand/keyword-plan.md is still template content — refusing to merge into a template", [
      "Run /keyword-research or /openseo-keyword-research to populate the plan first",
    ]);
  }

  const section = buildSyncSection(payload);
  const existingSectionMatch = existing.match(SYNC_SECTION_RE);
  const added = payload.keywords.length;

  if (flags.dryRun || !flags.confirm) {
    return ok({
      keywords: payload.keywords.length,
      added,
      action: "preview",
      replacesExistingSection: existingSectionMatch !== null,
      section,
      keywordPlan: "brand/keyword-plan.md",
      needsConfirm: true,
      hint: "Re-run with --confirm to merge",
    });
  }

  const merged = mergeSyncSection(existing, section);
  await Bun.write(planPath, merged);
  const { binding } = await readBinding(flags.cwd);
  if (binding) {
    await writeBinding(flags.cwd, { ...binding, lastKeywordsSync: payload.syncedAt, updatedAt: new Date().toISOString() });
  }
  return ok({
    keywords: payload.keywords.length,
    added,
    action: "merged",
    replacesExistingSection: existingSectionMatch !== null,
    section,
    keywordPlan: "brand/keyword-plan.md",
  });
};

const handleOpen = async (cwd: string): Promise<CommandResult> => {
  const { binding } = await readBinding(cwd);
  const base = process.env.OPENSEO_API_BASE ?? null;
  const url = base ?? (binding ? binding.mcpUrl.replace(/\/mcp$/, "") : HOSTED_APP_URL);
  return ok({ url, projectId: binding?.projectId ?? null });
};

export const handler: CommandHandler = async (args, flags) => {
  const sub = args.filter(a => !a.startsWith("--"))[0];
  const confirm = args.includes("--confirm");
  switch (sub) {
    case "status": return handleStatus(flags.cwd);
    case "link-project": return handleLinkProject({ cwd: flags.cwd, jsonInput: flags.jsonInput, dryRun: flags.dryRun, confirm });
    case "sync-keywords": return handleSyncKeywords({ cwd: flags.cwd, dryRun: flags.dryRun, confirm });
    case "open": return handleOpen(flags.cwd);
    default:
      return err("INVALID_ARGS", `Unknown seo subcommand: '${sub ?? "(missing)"}'`, [
        "Available: status, link-project, sync-keywords, open",
      ], 2);
  }
};
