// mktg brand — Brand memory management
import { ok, BRAND_FILES, type CommandHandler, type CommandSchema, type BrandBundle, type GlobalFlags, type CommandResult } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notFound, parseJsonInput } from "../core/errors";
import { getBrandStatus, exportBrand, importBrand, diffBrand, appendLearning, type LearningEntry } from "../core/brand";
import { resolveManifest } from "../core/skills";
import { join } from "node:path";

import { mkdir, writeFile } from "node:fs/promises";
import type { BrandFile } from "../types";

const SUBCOMMANDS = {
  "export": "Export brand memory as portable JSON bundle",
  "import": "Import brand memory from a JSON bundle",
  "update": "Write brand files from raw JSON payload via --input",
  "freshness": "Check brand file freshness against skill review intervals",
  "diff": "Show brand file changes since last status baseline",
  "append-learning": "Append a structured learning entry to brand/learnings.md",
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
    { args: "mktg brand append-learning --input '{...}' --json", description: "Append a learning entry" },
  ],
  vocabulary: ["brand export", "brand import", "brand freshness", "brand diff", "brand memory", "brand append-learning", "learning"],
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
  // Extract --file and --confirm flags
  let filePath: string | undefined;
  let confirm = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--confirm") { confirm = true; continue; }
    if (args[i] === "--file" && args[i + 1]) { filePath = args[i + 1]; i++; continue; }
    if (args[i]?.startsWith("--file=")) { filePath = args[i]!.slice(7); continue; }
  }

  if (!filePath) {
    return invalidArgs("Missing --file argument", [
      "Usage: mktg brand import --file <path> --confirm --json",
      "Example: mktg brand import --file brand-bundle.json --confirm",
    ]);
  }

  // Destructive: require --confirm or --dry-run
  if (!confirm && !flags.dryRun) {
    return invalidArgs("brand import overwrites existing brand files — pass --confirm to proceed, or --dry-run to preview", [
      "mktg brand import --file bundle.json --confirm",
      "mktg brand import --file bundle.json --dry-run",
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
  const manifest = await resolveManifest(cwd);

  // Compute per-file review intervals from manifest writers
  const reviewIntervals = new Map<string, { interval: number; writers: string[] }>();
  for (const file of BRAND_FILES) {
    const writers = Object.entries(manifest.skills)
      .filter(([_, entry]) => entry.writes.includes(file))
      .map(([name, entry]) => ({ skill: name, reviewIntervalDays: entry.review_interval_days }));
    const interval = writers.length > 0
      ? Math.min(...writers.map(w => w.reviewIntervalDays))
      : 30;
    reviewIntervals.set(file, { interval, writers: writers.map(w => w.skill) });
  }

  // Get statuses with the most restrictive review interval per file
  // getBrandStatus now handles template detection in core
  const brandStatuses = await getBrandStatus(cwd);

  // Re-assess freshness using per-file review intervals from manifest
  const files = brandStatuses.map((status) => {
    const { interval, writers } = reviewIntervals.get(status.file) ?? { interval: 30, writers: [] };

    // Override freshness with manifest-aware interval (core uses default 30 days)
    let freshness = status.freshness;
    if (status.exists && freshness === "current" && status.ageDays !== null && status.ageDays > interval) {
      freshness = "stale";
    }

    return {
      file: status.file,
      exists: status.exists,
      ageDays: status.ageDays,
      reviewIntervalDays: interval,
      freshness,
      writers,
      remediation: freshness !== "current" && writers.length > 0
        ? `Run /${writers[0]!}` : null,
    };
  });

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

// brand update --input '{"voice-profile.md": "# Voice...", "audience.md": "# Audience..."}'
// Accepts a JSON object mapping brand file names to content strings.
// Only writes valid brand file names — rejects unknown files.
const handleUpdate = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const raw = flags.jsonInput;
  if (!raw) {
    return invalidArgs("Missing --input flag with JSON payload", [
      'Usage: mktg brand update --input \'{"voice-profile.md": "# Voice Profile\\n..."}\'',
      "Payload is a JSON object mapping brand file names to content strings",
    ]);
  }

  const parsed = parseJsonInput<Record<string, string>>(raw);
  if (!parsed.ok) {
    return invalidArgs(`Invalid JSON payload: ${parsed.message}`, [
      "Payload must be a JSON object: {\"filename.md\": \"content\"}",
    ]);
  }

  const payload = parsed.data;
  const brandFileSet = new Set(BRAND_FILES as readonly string[]);
  const written: string[] = [];
  const rejected: string[] = [];

  const brandDir = join(flags.cwd, "brand");
  if (!flags.dryRun) {
    await mkdir(brandDir, { recursive: true });
  }

  for (const [fileName, content] of Object.entries(payload)) {
    if (!brandFileSet.has(fileName)) {
      rejected.push(fileName);
      continue;
    }
    if (typeof content !== "string") {
      rejected.push(fileName);
      continue;
    }
    if (!flags.dryRun) {
      await writeFile(join(brandDir, fileName), content);
    }
    written.push(fileName);
  }

  return ok({
    written,
    rejected,
    dryRun: flags.dryRun,
    brandDir,
  });
};

const handleAppendLearning = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const raw = flags.jsonInput;
  if (!raw) {
    return invalidArgs("Missing --input flag with JSON learning entry", [
      'Usage: mktg brand append-learning --input \'{"action":"...","result":"...","learning":"...","nextStep":"..."}\' --json',
      "Date is auto-filled to today if missing",
    ]);
  }

  const parsed = parseJsonInput<LearningEntry>(raw);
  if (!parsed.ok) {
    return invalidArgs(`Invalid JSON payload: ${parsed.message}`, [
      'Payload: {"action":"...","result":"...","learning":"...","nextStep":"..."}',
    ]);
  }

  const entry: LearningEntry = {
    date: parsed.data.date || new Date().toISOString().split("T")[0]!,
    action: parsed.data.action,
    result: parsed.data.result,
    learning: parsed.data.learning,
    nextStep: parsed.data.nextStep,
  };

  const result = await appendLearning(flags.cwd, entry, flags.dryRun);
  if (!result.ok) {
    return invalidArgs(`Learning validation failed: ${result.message}`, [
      "All fields (action, result, learning, nextStep) are required",
      "Fields cannot contain pipe characters (|)",
    ]);
  }

  return ok({
    appended: result.row,
    file: "brand/learnings.md",
    dryRun: flags.dryRun,
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
    case "update": return handleUpdate(subArgs, flags);
    case "freshness": return handleFreshness(subArgs, flags);
    case "diff": return handleDiff(subArgs, flags);
    case "append-learning": return handleAppendLearning(subArgs, flags);
    default: return invalidArgs(`Unknown subcommand: brand ${subcommand}`);
  }
};
