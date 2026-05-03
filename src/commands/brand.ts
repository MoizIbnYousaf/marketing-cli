// mktg brand — Brand memory management
import { ok, BRAND_FILES, type CommandHandler, type CommandSchema, type BrandBundle, type GlobalFlags, type CommandResult } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notFound, parseJsonInput, validateResourceId } from "../core/errors";
import { getBrandStatus, exportBrand, importBrand, diffBrand, appendLearning, isTemplateContent, type LearningEntry } from "../core/brand";
import { resolveManifest } from "../core/skills";
import { join } from "node:path";

import { mkdir, writeFile, rm, unlink } from "node:fs/promises";
import type { BrandFile } from "../types";

const SUBCOMMANDS = {
  "export": "Export brand memory as portable JSON bundle",
  "import": "Import brand memory from a JSON bundle",
  "update": "Write brand files from raw JSON payload via --input",
  "freshness": "Check brand file freshness against skill review intervals",
  "diff": "Show brand file changes since last status baseline",
  "append-learning": "Append a structured learning entry to brand/learnings.md",
  "claims": "Extract Claims Blacklist from landscape.md as structured JSON",
  "kit": "Parse creative-kit.md into structured brand tokens (colors, typography, visual)",
  "delete": "Delete a brand file and warn about dependent skills",
  "reset": "Wipe .mktg/ execution state (plan, publish, compete snapshots)",
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
    { args: "mktg brand claims --json", description: "Extract Claims Blacklist from landscape.md" },
    { args: "mktg brand kit --json", description: "Parse creative-kit.md into structured tokens" },
    { args: "mktg brand kit get colors --json", description: "Get just the color palette" },
    { args: "mktg brand delete voice-profile.md --confirm --json", description: "Delete a brand file (warns about dependent skills)" },
    { args: "mktg brand delete voice-profile.md --dry-run --json", description: "Preview brand file deletion without deleting" },
    { args: "mktg brand reset --confirm --json", description: "Wipe .mktg/ execution state" },
    { args: "mktg brand reset --confirm --include-learnings --json", description: "Wipe .mktg/ and clear learnings.md entries" },
  ],
  vocabulary: ["brand export", "brand import", "brand freshness", "brand diff", "brand memory", "brand append-learning", "learning", "brand claims", "claims blacklist", "brand kit", "brand tokens", "colors", "typography", "visual style", "brand delete", "brand reset", "delete brand file", "reset execution state", "clear mktg state"],
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

/** Parse a markdown table section into structured rows */
const parseMarkdownTable = (section: string): Array<{ claim: string; whyWrong: string; whatToSayInstead: string }> => {
  const lines = section.split("\n").filter(l => l.trim().startsWith("|"));
  // Need at least header + separator + 1 data row
  if (lines.length < 3) return [];

  // Skip header (line 0) and separator (line 1)
  const dataRows = lines.slice(2);
  const claims: Array<{ claim: string; whyWrong: string; whatToSayInstead: string }> = [];

  for (const row of dataRows) {
    const cells = row.split("|").map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 3) continue;
    const [claim, whyWrong, whatToSayInstead] = cells as [string, string, string];
    // Skip template placeholders and HTML comments
    if (claim!.startsWith("<!--") || !claim || claim === "wrong claim") continue;
    claims.push({ claim: claim!, whyWrong: whyWrong!, whatToSayInstead: whatToSayInstead! });
  }

  return claims;
};

const handleClaims = async (_args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const brandDir = join(flags.cwd, "brand");
  const landscapePath = join(brandDir, "landscape.md");
  const bunFile = Bun.file(landscapePath);

  if (!(await bunFile.exists())) {
    // Check if brand dir exists at all
    const brandDirFile = Bun.file(join(brandDir, "voice-profile.md"));
    if (!(await brandDirFile.exists())) {
      return notFound("brand/ directory", [
        "Run: mktg init",
        "This scaffolds the brand/ directory with template files",
      ]);
    }
    return ok({ claims: [], source: "landscape.md", freshness: "missing" as const });
  }

  const content = await bunFile.text();

  // Check if template
  if (isTemplateContent("landscape.md", content)) {
    return ok({ claims: [], source: "landscape.md", freshness: "template" as const });
  }

  // Extract ## Claims Blacklist section
  const sectionMatch = content.match(/## Claims Blacklist\n([\s\S]*?)(?=\n## |\n*$)/);
  const section = sectionMatch?.[1] ?? "";
  const claims = parseMarkdownTable(section);

  // Assess freshness
  const fileStat = await bunFile.stat();
  const ageDays = Math.max(0, Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)));
  const freshness = ageDays <= 14 ? "fresh" : "stale";

  return ok({ claims, source: "landscape.md", freshness, ageDays });
};

// ─── Kit: parse creative-kit.md into structured brand tokens ───

/** Extract a hex color from a markdown line like "- **Primary:** #6366F1 (indigo)" */
const extractHex = (line: string): string | null => {
  const match = line.match(/#([0-9a-fA-F]{6})\b/);
  return match ? `#${match[1]}` : null;
};

/** Extract the text value after the bold label: "- **Primary:** value here" → "value here" */
const extractValue = (line: string): string | null => {
  const match = line.match(/\*\*[^*]+\*\*:?\s*(.+)/);
  if (!match) return null;
  const val = match[1]!.replace(/<!--.*?-->/g, "").trim();
  return val.length > 0 ? val : null;
};

/** Extract a section by ## heading from markdown content */
const extractSection = (content: string, heading: string): string => {
  const regex = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
};

type KitTokens = {
  colors: { primary: string | null; secondary: string | null; accent: string | null; background: string | null };
  typography: { headings: string | null; body: string | null; code: string | null };
  visual: { mood: string | null; photography: string | null; icons: string | null };
  visualBrandStyle: {
    primaryAesthetic: string | null;
    lighting: string | null;
    backgrounds: string | null;
    composition: string | null;
    mood: string | null;
    avoid: string | null;
    referencePrompts: string | null;
  };
};

const parseCreativeKit = (content: string): KitTokens => {
  const colorsSection = extractSection(content, "Brand Colors");
  const typographySection = extractSection(content, "Typography");
  const visualSection = extractSection(content, "Visual Style");
  const vbsSection = extractSection(content, "Visual Brand Style");

  const colorsLines = colorsSection.split("\n");
  const typographyLines = typographySection.split("\n");
  const visualLines = visualSection.split("\n");
  const vbsLines = vbsSection.split("\n");

  const findLine = (lines: string[], key: string): string =>
    lines.find(l => l.toLowerCase().includes(key.toLowerCase())) ?? "";

  return {
    colors: {
      primary: extractHex(findLine(colorsLines, "primary")) ?? extractValue(findLine(colorsLines, "primary")),
      secondary: extractHex(findLine(colorsLines, "secondary")) ?? extractValue(findLine(colorsLines, "secondary")),
      accent: extractHex(findLine(colorsLines, "accent")) ?? extractValue(findLine(colorsLines, "accent")),
      background: extractHex(findLine(colorsLines, "background")) ?? extractValue(findLine(colorsLines, "background")),
    },
    typography: {
      headings: extractValue(findLine(typographyLines, "heading")),
      body: extractValue(findLine(typographyLines, "body")),
      code: extractValue(findLine(typographyLines, "code")),
    },
    visual: {
      mood: extractValue(findLine(visualLines, "mood")),
      photography: extractValue(findLine(visualLines, "photography")),
      icons: extractValue(findLine(visualLines, "icon")),
    },
    visualBrandStyle: {
      primaryAesthetic: extractValue(findLine(vbsLines, "primary aesthetic")),
      lighting: extractValue(findLine(vbsLines, "lighting")),
      backgrounds: extractValue(findLine(vbsLines, "background")),
      composition: extractValue(findLine(vbsLines, "composition")),
      mood: extractValue(findLine(vbsLines, "mood")),
      avoid: extractValue(findLine(vbsLines, "avoid")),
      referencePrompts: extractValue(findLine(vbsLines, "reference prompt")),
    },
  };
};

const KIT_SECTIONS = ["colors", "typography", "visual", "visualBrandStyle"] as const;
type KitSection = (typeof KIT_SECTIONS)[number];

const handleKit = async (args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  const brandDir = join(flags.cwd, "brand");
  const kitPath = join(brandDir, "creative-kit.md");
  const bunFile = Bun.file(kitPath);

  if (!(await bunFile.exists())) {
    const brandDirFile = Bun.file(join(brandDir, "voice-profile.md"));
    if (!(await brandDirFile.exists())) {
      return notFound("brand/ directory", [
        "Run: mktg init",
        "This scaffolds the brand/ directory with template files",
      ]);
    }
    return notFound("brand/creative-kit.md", [
      "Run: mktg init (scaffolds template)",
      "Or: mktg brand update --input '{\"creative-kit.md\": \"# Creative Kit\\n...\"}'"
    ]);
  }

  const content = await bunFile.text();

  // Check if template
  if (isTemplateContent("creative-kit.md", content)) {
    return ok({
      tokens: null,
      source: "creative-kit.md",
      freshness: "template" as const,
      completeness: 0,
      message: "creative-kit.md is still a template. Run /visual-style to populate it.",
    });
  }

  const tokens = parseCreativeKit(content);

  // Compute completeness: count non-null fields
  const allFields = [
    ...Object.values(tokens.colors),
    ...Object.values(tokens.typography),
    ...Object.values(tokens.visual),
    ...Object.values(tokens.visualBrandStyle),
  ];
  const filled = allFields.filter(v => v !== null).length;
  const completeness = Math.round((filled / allFields.length) * 100);

  // Handle "get" subcommand: mktg brand kit get colors
  const getIdx = args.indexOf("get");
  if (getIdx !== -1) {
    const section = args[getIdx + 1];
    if (!section) {
      return invalidArgs("Missing section name after 'get'", [
        `Valid sections: ${KIT_SECTIONS.join(", ")}`,
        "Usage: mktg brand kit get colors --json",
      ]);
    }
    if (!KIT_SECTIONS.includes(section as KitSection)) {
      return invalidArgs(`Unknown kit section: ${section}`, [
        `Valid sections: ${KIT_SECTIONS.join(", ")}`,
      ]);
    }
    return ok({
      section,
      data: tokens[section as KitSection],
      source: "creative-kit.md",
      completeness,
    });
  }

  // Assess freshness
  const fileStat = await bunFile.stat();
  const ageDays = Math.max(0, Math.floor((Date.now() - fileStat.mtimeMs) / (1000 * 60 * 60 * 24)));

  return ok({
    tokens,
    source: "creative-kit.md",
    freshness: ageDays <= 90 ? "current" : "stale",
    ageDays,
    completeness,
  });
};

const handleDelete = async (args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  // Extract file name and --confirm flag
  let fileName: string | undefined;
  let confirm = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--confirm") { confirm = true; continue; }
    if (!args[i]?.startsWith("--")) { fileName = args[i]; continue; }
  }

  if (!fileName) {
    return invalidArgs("Missing brand file name", [
      "Usage: mktg brand delete <file> --confirm --json",
      `Valid files: ${BRAND_FILES.join(", ")}`,
    ]);
  }

  // Validate resource ID
  const idCheck = validateResourceId(fileName, "brand file");
  if (!idCheck.ok) {
    return invalidArgs(idCheck.message, [
      `Valid files: ${BRAND_FILES.join(", ")}`,
    ]);
  }

  // Check it is a valid brand file
  const brandFileSet = new Set(BRAND_FILES as readonly string[]);
  if (!brandFileSet.has(fileName)) {
    return invalidArgs(`'${fileName}' is not a valid brand file`, [
      `Valid files: ${BRAND_FILES.join(", ")}`,
    ]);
  }

  const brandDir = join(flags.cwd, "brand");
  const filePath = join(brandDir, fileName);
  const fileExists = await Bun.file(filePath).exists();

  if (!fileExists) {
    return notFound(`brand/${fileName}`, [
      "Run: mktg brand freshness --json to see which files exist",
    ]);
  }

  // Find dependent skills from manifest
  const manifest = await resolveManifest(flags.cwd);
  const dependentSkills = Object.entries(manifest.skills)
    .filter(([_, entry]) => entry.reads.includes(fileName!))
    .map(([name]) => name);

  // Destructive: require --confirm or --dry-run
  if (!confirm && !flags.dryRun) {
    return invalidArgs(
      `brand delete is destructive — pass --confirm to proceed, or --dry-run to preview`,
      [
        `mktg brand delete ${fileName} --confirm`,
        `mktg brand delete ${fileName} --dry-run`,
        ...(dependentSkills.length > 0
          ? [`Warning: ${dependentSkills.length} skill(s) read this file: ${dependentSkills.join(", ")}`]
          : []),
      ],
    );
  }

  if (!flags.dryRun) {
    await unlink(filePath);
  }

  return ok({
    deleted: `brand/${fileName}`,
    dependentSkills,
    dryRun: flags.dryRun,
  });
};

const handleReset = async (args: readonly string[], flags: GlobalFlags): Promise<CommandResult> => {
  let confirm = false;
  let includeLearnings = false;
  for (const arg of args) {
    if (arg === "--confirm") { confirm = true; continue; }
    if (arg === "--include-learnings") { includeLearnings = true; continue; }
  }

  // Destructive: require --confirm or --dry-run
  if (!confirm && !flags.dryRun) {
    return invalidArgs(
      "brand reset is destructive — pass --confirm to proceed, or --dry-run to preview",
      [
        "mktg brand reset --confirm",
        "mktg brand reset --dry-run",
        "mktg brand reset --confirm --include-learnings  (also clears learnings.md entries)",
      ],
    );
  }

  const mktgDir = join(flags.cwd, ".mktg");
  const cleared: string[] = [];

  // Bun.file().exists() returns false for directories; use stat instead
  const { stat } = await import("node:fs/promises");
  let mktgDirExists = false;
  try {
    const s = await stat(mktgDir);
    mktgDirExists = s.isDirectory();
  } catch {
    mktgDirExists = false;
  }

  if (mktgDirExists) {
    cleared.push(".mktg/");
    if (!flags.dryRun) {
      await rm(mktgDir, { recursive: true, force: true });
    }
  }

  if (includeLearnings) {
    const learningsPath = join(flags.cwd, "brand", "learnings.md");
    const learningsExists = await Bun.file(learningsPath).exists();
    if (learningsExists) {
      cleared.push("brand/learnings.md");
      if (!flags.dryRun) {
        await writeFile(learningsPath, "# Learnings\n\n| Date | Action | Result | Learning | Next Step |\n|------|--------|--------|----------|----------|\n");
      }
    }
  }

  return ok({
    cleared,
    dryRun: flags.dryRun,
    includedLearnings: includeLearnings,
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
    case "claims": return handleClaims(subArgs, flags);
    case "kit": return handleKit(subArgs, flags);
    case "delete": return handleDelete(subArgs, flags);
    case "reset": return handleReset(subArgs, flags);
    default: return invalidArgs(`Unknown subcommand: brand ${subcommand}`);
  }
};
