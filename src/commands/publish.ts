// mktg publish — Distribution pipeline with pluggable platform adapters
// Takes a campaign directory with publish.json manifest, pushes to platforms.
// --dry-run validates, --confirm executes. NDJSON streaming for progress.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { rejectControlChars, validatePathInput, parseJsonInput } from "../core/errors";
import { isTTY, writeStderr, writeStdout, bold, dim, green, yellow, red } from "../core/output";

export const schema: CommandSchema = {
  name: "publish",
  description: "Distribution pipeline — push content to platforms via pluggable adapters",
  positional: { name: "path", description: "Campaign directory or publish.json path", required: false },
  flags: [
    { name: "--confirm", type: "boolean", required: false, description: "Execute publishing (without this, publish is dry-run by default)" },
    { name: "--adapter", type: "string", required: false, description: "Run only a specific adapter (typefully, resend, file)" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream progress as NDJSON lines" },
  ],
  output: {
    campaign: "string — campaign name from manifest",
    adapters: "AdapterResult[] — per-adapter publish results",
    totalItems: "number — total content items processed",
    published: "number — items successfully published",
    failed: "number — items that failed",
    dryRun: "boolean — true if this was a validation-only run",
  },
  examples: [
    { args: "mktg publish campaigns/launch/", description: "Validate launch campaign (dry-run)" },
    { args: "mktg publish campaigns/launch/ --confirm", description: "Execute publishing" },
    { args: "mktg publish --adapter typefully --confirm", description: "Publish only to Typefully" },
    { args: "mktg publish campaigns/launch/ --ndjson", description: "Stream progress as NDJSON" },
  ],
  vocabulary: ["publish", "distribute", "push", "ship", "deploy content"],
};

// Publish manifest schema
type PublishItem = {
  readonly type: "social" | "email" | "file";
  readonly adapter: string;
  readonly content: string;
  readonly metadata?: Record<string, string>;
};

type PublishManifest = {
  readonly name: string;
  readonly version?: number;
  readonly items: readonly PublishItem[];
};

type AdapterResult = {
  readonly adapter: string;
  readonly items: number;
  readonly published: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly results: readonly { readonly item: number; readonly status: "published" | "failed" | "skipped"; readonly detail: string }[];
};

type PublishResult = {
  readonly campaign: string;
  readonly adapters: readonly AdapterResult[];
  readonly totalItems: number;
  readonly published: number;
  readonly failed: number;
  readonly dryRun: boolean;
};

// Adapter: Typefully (requires TYPEFULLY_API_KEY)
const publishTypefully = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const results: AdapterResult["results"][number][] = [];

  if (!apiKey) {
    return {
      adapter: "typefully", items: items.length, published: 0, failed: items.length,
      errors: ["TYPEFULLY_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would publish: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "typefully", item: i, status: "skipped" }));
      continue;
    }
    try {
      const resp = await fetch("https://api.typefully.com/v1/drafts/", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.content, ...item.metadata }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        results.push({ item: i, status: "published", detail: "Draft created" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "typefully", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "typefully",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

// Adapter: Resend (requires RESEND_API_KEY)
const publishResend = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const results: AdapterResult["results"][number][] = [];

  if (!apiKey) {
    return {
      adapter: "resend", items: items.length, published: 0, failed: items.length,
      errors: ["RESEND_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would send: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "resend", item: i, status: "skipped" }));
      continue;
    }
    try {
      const metadata = item.metadata ?? {};
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: metadata.from ?? "noreply@example.com",
          to: metadata.to ?? "",
          subject: metadata.subject ?? "Published via mktg",
          html: item.content,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        results.push({ item: i, status: "published", detail: "Email sent" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "resend", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "resend",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

// Adapter: File (writes to output directory — always available)
const publishFile = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  const outDir = join(cwd, ".mktg", "published");

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const filename = item.metadata?.filename ?? `item-${i}.txt`;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would write: ${filename}` });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "file", item: i, status: "skipped" }));
      continue;
    }
    try {
      const { mkdir: mkdirFs } = await import("node:fs/promises");
      await mkdirFs(outDir, { recursive: true });
      await Bun.write(join(outDir, filename), item.content);
      results.push({ item: i, status: "published", detail: `Written to ${filename}` });
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "file", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "file",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

const ADAPTERS: Record<string, (items: PublishItem[], confirm: boolean, cwd: string, ndjson: boolean) => Promise<AdapterResult>> = {
  typefully: (items, confirm, _cwd, ndjson) => publishTypefully(items, confirm, ndjson),
  resend: (items, confirm, _cwd, ndjson) => publishResend(items, confirm, ndjson),
  file: publishFile,
};

export const handler: CommandHandler<PublishResult> = async (args, flags) => {
  const confirm = args.includes("--confirm");
  const ndjson = args.includes("--ndjson");
  const isDryRun = flags.dryRun || !confirm;

  // Parse --adapter filter (must happen before positional extraction)
  let adapterFilter: string | undefined;
  const flagValues = new Set<number>(); // indices of flag values to skip
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--adapter" && args[i + 1]) { adapterFilter = args[i + 1]; flagValues.add(i + 1); break; }
    if (args[i]?.startsWith("--adapter=")) { adapterFilter = args[i]!.slice(10); break; }
  }

  const positionalArgs = args.filter((a, i) => !a.startsWith("--") && !flagValues.has(i));

  // Find publish.json
  const campaignPath = positionalArgs[0] ?? ".";
  const pathCheck = validatePathInput(flags.cwd, campaignPath);
  if (!pathCheck.ok) return err("INVALID_ARGS", pathCheck.message, [], 2);

  const manifestPath = campaignPath.endsWith("publish.json")
    ? join(flags.cwd, campaignPath)
    : join(flags.cwd, campaignPath, "publish.json");

  // Check if manifest exists; if not, check --input for inline JSON
  const manifestFile = Bun.file(manifestPath);
  let manifest: PublishManifest;

  if (await manifestFile.exists()) {
    try {
      manifest = await manifestFile.json() as PublishManifest;
    } catch {
      return err("INVALID_ARGS", "publish.json is not valid JSON", [`Check ${manifestPath}`], 2);
    }
  } else if (flags.jsonInput) {
    const parsed = parseJsonInput<PublishManifest>(flags.jsonInput);
    if (!parsed.ok) return err("INVALID_ARGS", parsed.message, [], 2);
    manifest = parsed.data;
  } else {
    return err("NOT_FOUND", "No publish.json found", [
      `Create ${manifestPath} with {name, items: [{type, adapter, content}]}`,
      "Or pass inline: mktg publish --input '{...}'",
    ], 1);
  }

  if (!manifest.items || !Array.isArray(manifest.items) || manifest.items.length === 0) {
    return err("INVALID_ARGS", "publish.json has no items", ["Add items: [{type, adapter, content}]"], 2);
  }

  // Validate items (only those matching adapter filter if set)
  for (const item of manifest.items) {
    if (adapterFilter && item.adapter !== adapterFilter) continue;
    const cc = rejectControlChars(item.content, "item content");
    if (!cc.ok) return err("INVALID_ARGS", cc.message, [], 2);
    if (!ADAPTERS[item.adapter]) {
      return err("INVALID_ARGS", `Unknown adapter '${item.adapter}'`, [`Available: ${Object.keys(ADAPTERS).join(", ")}`], 2);
    }
  }

  // Group items by adapter
  const grouped = new Map<string, PublishItem[]>();
  for (const item of manifest.items) {
    const adapter = item.adapter;
    if (adapterFilter && adapter !== adapterFilter) continue;
    const existing = grouped.get(adapter) ?? [];
    existing.push(item);
    grouped.set(adapter, existing);
  }

  // Run adapters
  const adapterResults: AdapterResult[] = [];
  for (const [adapter, items] of grouped) {
    const fn = ADAPTERS[adapter];
    if (!fn) continue;
    const result = await fn(items, confirm && !flags.dryRun, flags.cwd, ndjson);
    adapterResults.push(result);
  }

  const totalItems = adapterResults.reduce((sum, r) => sum + r.items, 0);
  const published = adapterResults.reduce((sum, r) => sum + r.published, 0);
  const failed = adapterResults.reduce((sum, r) => sum + r.failed, 0);

  const result: PublishResult = {
    campaign: manifest.name ?? "unnamed",
    adapters: adapterResults,
    totalItems,
    published,
    failed,
    dryRun: isDryRun,
  };

  // TTY display
  if (isTTY() && !flags.json && !ndjson) {
    writeStderr("");
    writeStderr(`  ${bold("mktg publish")} ${dim(`— ${manifest.name ?? "unnamed"}`)}`);
    writeStderr(`  ${isDryRun ? yellow("DRY RUN") : green("LIVE")} ${dim(`(${totalItems} items)`)}`);
    writeStderr("");
    for (const ar of adapterResults) {
      const icon = ar.failed > 0 ? red("x") : ar.published > 0 ? green("✓") : yellow("~");
      writeStderr(`  ${icon} ${bold(ar.adapter)} — ${ar.published} published, ${ar.failed} failed, ${ar.items - ar.published - ar.failed} skipped`);
      for (const e of ar.errors.slice(0, 3)) {
        writeStderr(`    ${red("!")} ${e}`);
      }
    }
    if (isDryRun) {
      writeStderr("");
      writeStderr(dim("  Add --confirm to execute publishing"));
    }
    writeStderr("");
  }

  return ok(result);
};
