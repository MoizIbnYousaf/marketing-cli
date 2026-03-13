// mktg brand — Brand memory management
import { ok, type CommandHandler, type CommandSchema, type BrandFile, type BrandBundle, type GlobalFlags, type CommandResult } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notFound, parseJsonInput } from "../core/errors";
import { getBrandStatus, isTemplateContent, exportBrand, importBrand, diffBrand } from "../core/brand";
import { resolveManifest } from "../core/skills";
import { join } from "node:path";

const SUBCOMMANDS = {
  "export": "Export brand memory as portable JSON bundle",
  "import": "Import brand memory from a JSON bundle",
  "freshness": "Check brand file freshness against skill review intervals",
  "diff": "Show brand file changes since last status baseline",
} as const;

export const schema: CommandSchema = {
  name: "brand",
  description: "Brand memory management — export, import, and check freshness",
  flags: [
    { name: "--file", type: "string", required: false, description: "Path to brand bundle JSON file (for import)" },
  ],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags: name === "import"
      ? [{ name: "--file", type: "string" as const, required: true, description: "Path to brand bundle JSON" }]
      : [],
    output: {},
    examples: [{ args: `mktg brand ${name} --json`, description }],
  })),
  output: {},
  examples: [
    { args: "mktg brand export --json", description: "Export brand memory" },
    { args: "mktg brand import --file bundle.json --json", description: "Import brand memory" },
    { args: "mktg brand freshness --json", description: "Check file freshness" },
  ],
  vocabulary: ["brand export", "brand import", "brand freshness", "brand diff", "brand memory"],
};

const handleExport = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const bundle = await exportBrand(flags.cwd);
  return ok(bundle);
};

const handleDiff = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const result = await diffBrand(flags.cwd);
  return ok(result);
};

const handleImport = async (args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  // Extract --file flag
  let filePath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      filePath = args[i + 1];
      break;
    }
    if (args[i]?.startsWith("--file=")) {
      filePath = args[i]!.slice(7);
      break;
    }
  }

  if (!filePath) {
    return invalidArgs("Missing --file argument", [
      "Usage: mktg brand import --file <path> --json",
      "Example: mktg brand import --file brand-bundle.json",
    ]);
  }

  // Read file
  const resolvedPath = filePath.startsWith("/") ? filePath : join(flags.cwd, filePath);
  const file = Bun.file(resolvedPath);
  if (!(await file.exists())) {
    return notFound(`Bundle file: ${filePath}`, [
      "Verify the file path is correct",
      "Export first: mktg brand export --json > bundle.json",
    ]);
  }

  const raw = await file.text();
  const parsed = parseJsonInput<BrandBundle>(raw);
  if (!parsed.ok) {
    return invalidArgs(`Invalid bundle: ${parsed.message}`, [
      "Bundle must be valid JSON from 'mktg brand export --json'",
    ]);
  }

  const bundle = parsed.data;
  if (bundle.version !== 1) {
    return invalidArgs(`Unsupported bundle version: ${bundle.version}`, [
      "Expected version 1",
    ]);
  }

  const result = await importBrand(flags.cwd, bundle, flags.dryRun);
  return ok({
    ...result,
    source: filePath,
    dryRun: flags.dryRun,
  });
};

const handleFreshness = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const cwd = flags.cwd;
  const brandStatuses = await getBrandStatus(cwd);
  const manifest = await resolveManifest(cwd);

  const files = await Promise.all(brandStatuses.map(async (status) => {
    const writers = Object.entries(manifest.skills)
      .filter(([_, entry]) => entry.writes.includes(status.file))
      .map(([name, entry]) => ({ skill: name, reviewIntervalDays: entry.review_interval_days }));

    const reviewInterval = writers.length > 0
      ? Math.min(...writers.map(w => w.reviewIntervalDays))
      : 30;

    let isTemplate = false;
    if (status.exists) {
      const content = await Bun.file(join(cwd, "brand", status.file)).text();
      isTemplate = isTemplateContent(status.file as BrandFile, content);
    }

    const isStale = status.exists && !isTemplate && status.ageDays !== null && status.ageDays > reviewInterval;

    return {
      file: status.file,
      exists: status.exists,
      ageDays: status.ageDays,
      reviewIntervalDays: reviewInterval,
      freshness: !status.exists ? "missing" as const
        : isTemplate ? "template" as const
        : isStale ? "stale" as const
        : "current" as const,
      writers: writers.map(w => w.skill),
      remediation: (!status.exists || isTemplate || isStale) && writers.length > 0
        ? `Run /${writers[0]!.skill}` : null,
    };
  }));

  return ok({
    files,
    summary: {
      total: files.length,
      current: files.filter(f => f.freshness === "current").length,
      stale: files.filter(f => f.freshness === "stale").length,
      template: files.filter(f => f.freshness === "template").length,
      missing: files.filter(f => f.freshness === "missing").length,
    },
    nextAction: files.find(f => f.freshness !== "current")?.remediation ?? null,
  });
};

export const handler: CommandHandler = async (args, flags) => {
  const nonFlagArgs = args.filter(a => !a.startsWith("--"));
  const subcommand = nonFlagArgs[0];
  if (!subcommand) {
    return invalidArgs("Missing subcommand", [
      `Valid: ${Object.keys(SUBCOMMANDS).join(", ")}`,
      "Usage: mktg brand <subcommand> [args]",
    ]);
  }
  if (!isKeyOf(SUBCOMMANDS, subcommand)) {
    return invalidArgs(`Unknown subcommand: brand ${subcommand}`, [
      ...Object.keys(SUBCOMMANDS).map(s => `mktg brand ${s}`),
    ]);
  }
  // Pass remaining args (including flags) to subcommand handlers
  const subArgs = args.slice(args.indexOf(subcommand) + 1);
  switch (subcommand) {
    case "export": return handleExport(subArgs, flags);
    case "import": return handleImport(subArgs, flags);
    case "freshness": return handleFreshness(subArgs, flags);
    case "diff": return handleDiff(subArgs, flags);
    default: return invalidArgs(`Unknown subcommand: brand ${subcommand}`);
  }
};
