// mktg publish — Distribution pipeline with pluggable platform adapters
// Takes a campaign directory with publish.json manifest, pushes to platforms.
// --dry-run validates, --confirm executes. NDJSON streaming for progress.

import { join } from "node:path";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { rejectControlChars, validatePathInput, parseJsonInput } from "../core/errors";
import { isTTY, writeStdout, bold, dim, green, yellow, red } from "../core/output";
import { hasFlag, flagValue } from "../core/args";
import {
  getNativePublishAccountSummary,
  listNativePublishPosts,
  upsertNativePublishProvider,
  type NativePublishProviderInput,
} from "../core/native-publish";
import { type AdapterResult, type PublishItem, type PublishManifest } from "../core/publish/types";
import { listNativeIntegrations } from "../core/publish/adapters";
import {
  diagnosePostiz,
  listPostizIntegrations,
  type ListIntegrationsResult,
  type PostizDiagnosticsResult,
} from "../core/publish/postiz";
import {
  ADAPTERS,
  ADAPTER_ENV_VARS,
  PRESENTATION_ADAPTER_ORDER,
} from "../core/publish/registry";

export { postizFetch, sentMarkerKey, loadSentMarker, persistSentMarker } from "../core/publish/postiz";
export { BUILTIN_PUBLISH_ADAPTERS } from "../core/publish/registry";

export const schema: CommandSchema = {
  name: "publish",
  description: "Distribution pipeline — push content to platforms via pluggable adapters",
  positional: { name: "path", description: "Campaign directory or publish.json path", required: false },
  flags: [
    { name: "--confirm", type: "boolean", required: false, description: "Execute publishing (without this, publish is dry-run by default)" },
    { name: "--adapter", type: "string", required: false, description: "Run only a specific adapter (mktg-native, postiz, typefully, resend, file)" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream progress as NDJSON lines" },
    { name: "--list-adapters", type: "boolean", required: false, description: "List available adapters with env var requirements and configured status" },
    { name: "--list-integrations", type: "boolean", required: false, description: "For adapters backed by a provider registry (mktg-native, postiz), list connected providers. Returns NOT_IMPLEMENTED for adapters without one." },
    { name: "--diagnose", type: "boolean", required: false, description: "Run adapter connection diagnostics. Currently supports --adapter postiz." },
    { name: "--native-account", type: "boolean", required: false, description: "Show or auto-provision the local mktg-native workspace account and API key" },
    { name: "--native-upsert-provider", type: "boolean", required: false, description: "Create or update a local mktg-native provider using --input JSON" },
    { name: "--native-list-posts", type: "boolean", required: false, description: "List locally stored mktg-native posts in queue/history order" },
  ],
  output: {
    campaign: "string — campaign name from manifest",
    adapters: "AdapterResult[] — per-adapter publish results",
    "adapters[].results[].status": "PublishItemStatus — per-item truth: queued-local (mktg-native) | draft-external (typefully, postiz) | sent (resend) | written-file (file) | failed | skipped",
    totalItems: "number — total content items processed",
    published: "number — items reaching a terminal adapter status (queued-local/draft-external/sent/written-file)",
    failed: "number — items that failed",
    dryRun: "boolean — true if this was a validation-only run",
  },
  examples: [
    { args: "mktg publish campaigns/launch/", description: "Validate launch campaign (dry-run)" },
    { args: "mktg publish campaigns/launch/ --confirm", description: "Execute publishing" },
    { args: "mktg publish --native-account --json", description: "Show the local mktg-native workspace account" },
    { args: "mktg publish --native-upsert-provider --input '{\"identifier\":\"linkedin\",\"name\":\"Acme LinkedIn\",\"profile\":\"acme\"}' --json", description: "Connect a local native provider" },
    { args: "mktg publish --adapter mktg-native --confirm", description: "Publish into the local mktg-native backend" },
    { args: "mktg publish --adapter postiz --confirm", description: "Publish only to Postiz" },
    { args: "mktg publish --adapter typefully --confirm", description: "Publish only to Typefully for X/threads specialist flows" },
    { args: "mktg publish campaigns/launch/ --ndjson", description: "Stream progress as NDJSON" },
    { args: "mktg publish --list-adapters --json", description: "List available adapters and their configured status" },
  ],
  vocabulary: ["publish", "distribute", "push", "ship", "deploy content"],
};

type NativeAccountResult = Awaited<ReturnType<typeof getNativePublishAccountSummary>>;
type NativeListPostsResult = { readonly adapter: "mktg-native"; readonly posts: Awaited<ReturnType<typeof listNativePublishPosts>> };
type NativeUpsertProviderResult = { readonly adapter: "mktg-native"; readonly provider: Awaited<ReturnType<typeof upsertNativePublishProvider>> };

type PublishResult = {
  readonly campaign: string;
  readonly adapters: readonly AdapterResult[];
  readonly totalItems: number;
  readonly published: number;
  readonly failed: number;
  readonly dryRun: boolean;
};

type AdapterListResult = { readonly adapters: readonly { readonly name: string; readonly envVar: string | null; readonly configured: boolean }[] };

export const handler: CommandHandler<
  PublishResult | AdapterListResult | ListIntegrationsResult | NativeAccountResult | NativeListPostsResult | NativeUpsertProviderResult | PostizDiagnosticsResult
> = async (args, flags) => {
  const confirm = hasFlag(args, "--confirm");
  const ndjson = hasFlag(args, "--ndjson");
  const isDryRun = flags.dryRun || !confirm;

  if (hasFlag(args, "--native-account")) {
    return ok(await getNativePublishAccountSummary(flags.cwd));
  }

  if (hasFlag(args, "--native-list-posts")) {
    return ok({ adapter: "mktg-native", posts: await listNativePublishPosts(flags.cwd) });
  }

  if (hasFlag(args, "--native-upsert-provider")) {
    if (!flags.jsonInput) {
      return err(
        "INVALID_ARGS",
        "--native-upsert-provider requires --input JSON",
        [
          "Example: mktg publish --native-upsert-provider --input '{\"identifier\":\"linkedin\",\"name\":\"Acme LinkedIn\",\"profile\":\"acme\"}' --json",
        ],
        2,
      );
    }
    const parsed = parseJsonInput<NativePublishProviderInput>(flags.jsonInput);
    if (!parsed.ok) {
      return err("INVALID_ARGS", parsed.message, ["Pass a valid JSON object for the native provider input"], 2);
    }
    try {
      const provider = await upsertNativePublishProvider(flags.cwd, parsed.data);
      return ok({ adapter: "mktg-native", provider });
    } catch (error) {
      return err(
        "INVALID_ARGS",
        error instanceof Error ? error.message : String(error),
        ["identifier must be lowercase and profile/name must be free of control characters"],
        2,
      );
    }
  }

  // --list-adapters: return available adapters with env var and configured status
  if (hasFlag(args, "--list-adapters")) {
    const adapters = PRESENTATION_ADAPTER_ORDER.map(name => {
      const envVar = ADAPTER_ENV_VARS[name] ?? null;
      const configured = envVar === null ? true : !!process.env[envVar];
      return { name, envVar, configured };
    });
    return ok({ adapters });
  }

  // Parse --adapter filter (must happen before positional extraction)
  const adapterFilter = flagValue(args, "--adapter");
  const flagValueIndices = new Set<number>(); // indices of flag values to skip
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--adapter" && args[i + 1]) { flagValueIndices.add(i + 1); break; }
  }

  // --list-integrations: adapter-scoped live query. Only postiz implements it today.
  if (hasFlag(args, "--diagnose")) {
    if (adapterFilter && adapterFilter !== "postiz") {
      return err(
        "NOT_IMPLEMENTED",
        "--diagnose currently supports only --adapter postiz",
        ["Try: mktg publish --adapter postiz --diagnose --json"],
        6,
      );
    }
    return ok(await diagnosePostiz());
  }

  // --list-integrations: adapter-scoped live query. Only postiz implements it today.
  if (hasFlag(args, "--list-integrations")) {
    if (!adapterFilter) {
      return err("INVALID_ARGS", "--list-integrations requires --adapter <name>", [
        "Try: mktg publish --adapter mktg-native --list-integrations --json",
        "Or:  mktg publish --adapter postiz --list-integrations --json",
      ], 2);
    }
    if (adapterFilter === "mktg-native") {
      return ok((await listNativeIntegrations(flags.cwd)).data);
    }
    if (adapterFilter !== "postiz") {
      return err(
        "NOT_IMPLEMENTED",
        `Adapter '${adapterFilter}' does not expose integrations.`,
        [
          "This flag is only supported by adapters that back their own provider registry.",
          "Try --adapter mktg-native or --adapter postiz.",
        ],
        6,
      );
    }
    const res = await listPostizIntegrations();
    if (!res.ok) {
      const suggestions = [
        "Verify POSTIZ_API_KEY and POSTIZ_API_BASE (defaults to https://api.postiz.com)",
        "Run: mktg catalog info postiz --json",
      ];
      const code =
        res.exitCode === 3 ? "POSTIZ_AUTH" :
        res.exitCode === 5 ? "POSTIZ_NETWORK" :
        "POSTIZ_BAD_REQUEST";
      return err(code, res.detail, suggestions, res.exitCode);
    }
    return ok(res.data);
  }

  const positionalArgs = args.filter((a, i) => !a.startsWith("--") && !flagValueIndices.has(i));

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
      return err("INVALID_ARGS", `Unknown adapter '${item.adapter}'`, [`Available: ${PRESENTATION_ADAPTER_ORDER.join(", ")}`], 2);
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
  const campaignName = manifest.name ?? "unnamed";
  const adapterResults: AdapterResult[] = [];
  for (const [adapter, items] of grouped) {
    const fn = ADAPTERS[adapter];
    if (!fn) continue;
    const result = await fn(items, confirm && !flags.dryRun, flags.cwd, ndjson, campaignName);
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
    writeStdout("");
    writeStdout(`  ${bold("mktg publish")} ${dim(`— ${manifest.name ?? "unnamed"}`)}`);
    writeStdout(`  ${isDryRun ? yellow("DRY RUN") : green("LIVE")} ${dim(`(${totalItems} items)`)}`);
    writeStdout("");
    for (const ar of adapterResults) {
      const icon = ar.failed > 0 ? red("x") : ar.published > 0 ? green("✓") : yellow("~");
      writeStdout(`  ${icon} ${bold(ar.adapter)} — ${ar.published} published, ${ar.failed} failed, ${ar.items - ar.published - ar.failed} skipped`);
      for (const e of ar.errors.slice(0, 3)) {
        writeStdout(`    ${red("!")} ${e}`);
      }
    }
    if (isDryRun) {
      writeStdout("");
      writeStdout(dim("  Add --confirm to execute publishing"));
    }
    writeStdout("");
  }

  return ok(result);
};
