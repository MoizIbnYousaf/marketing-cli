// mktg context — Brand context compiler
// Compiles all brand files into one token-budgeted JSON artifact for agent consumption.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, BRAND_FILES, type CommandHandler, type CommandSchema, type BrandFile } from "../types";
import { isTemplateContent, getBrandStatus, CONTEXT_MATRIX } from "../core/brand";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { writeStderr, isTTY, bold, dim, green, yellow, red } from "../core/output";

// Token estimation: ~4 chars per token
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Truncate content to fit a token budget, preserving leading lines
const truncateToTokens = (content: string, maxTokens: number): { text: string; truncated: boolean } => {
  if (estimateTokens(content) <= maxTokens) return { text: content, truncated: false };
  const charBudget = maxTokens * 4;
  const truncated = content.slice(0, charBudget);
  // Cut at last newline to avoid mid-line truncation
  const lastNewline = truncated.lastIndexOf("\n");
  const text = lastNewline > 0 ? truncated.slice(0, lastNewline) + "\n[...truncated]" : truncated + "\n[...truncated]";
  return { text, truncated: true };
};

// Valid layer names (keys of CONTEXT_MATRIX)
const VALID_LAYERS = Object.keys(CONTEXT_MATRIX) as (keyof typeof CONTEXT_MATRIX)[];

type ContextFileEntry = {
  readonly content: string;
  readonly tokens: number;
  readonly truncated: boolean;
  readonly freshness: string;
};

type ContextSummary = {
  readonly totalFiles: number;
  readonly populatedFiles: number;
  readonly templateFiles: number;
  readonly staleFiles: number;
};

type ContextResult = {
  readonly compiledAt: string;
  readonly project: string;
  readonly tokenEstimate: number;
  readonly layer?: string;
  readonly files: Record<string, ContextFileEntry>;
  readonly summary: ContextSummary;
};

export const schema: CommandSchema = {
  name: "context",
  description: "Compile brand files into a single token-budgeted JSON artifact for agent consumption",
  flags: [
    { name: "--layer", type: "string", required: false, description: "Filter to files relevant for a CONTEXT_MATRIX layer (foundation, strategy, execution, creative, distribution)" },
    { name: "--budget", type: "string", required: false, description: "Approximate token budget — truncates files by priority to fit" },
    { name: "--save", type: "boolean", required: false, default: false, description: "Write compiled context to .mktg/context.json" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream each brand file as a NDJSON line to stderr as it is compiled" },
  ],
  output: {
    "compiledAt": "string — ISO 8601 timestamp",
    "project": "string — project name",
    "tokenEstimate": "number — estimated total tokens",
    "layer": "string — layer filter if --layer was set",
    "files": "Record<string, ContextFileEntry> — compiled brand file contents with token counts",
    "files.*.tokens": "number — estimated tokens for this file",
    "files.*.truncated": "boolean — true if content was truncated by --budget",
    "files.*.freshness": "'current' | 'stale' | 'template' | 'missing' — file freshness state",
    "summary": "{totalFiles, populatedFiles, templateFiles, staleFiles} — counts",
  },
  examples: [
    { args: "mktg context --json", description: "Compile all brand files" },
    { args: "mktg context --layer foundation", description: "Only foundation-relevant files" },
    { args: "mktg context --budget 2000", description: "Fit within 2000 token budget" },
    { args: "mktg context --save", description: "Cache to .mktg/context.json" },
    { args: "mktg context --fields summary", description: "Just the summary counts" },
    { args: "mktg context --ndjson", description: "Stream each brand file as a NDJSON line to stderr" },
  ],
  vocabulary: ["context", "compile", "brand-context", "token-budget"],
};

// Priority order for truncation — most important files first
const FILE_PRIORITY: readonly BrandFile[] = [
  "voice-profile.md",
  "positioning.md",
  "audience.md",
  "competitors.md",
  "landscape.md",
  "keyword-plan.md",
  "creative-kit.md",
  "stack.md",
  "assets.md",
  "learnings.md",
];

// Get project name from package.json or dir name
const getProjectName = async (cwd: string): Promise<string> => {
  try {
    const file = Bun.file(join(cwd, "package.json"));
    if (await file.exists()) {
      const pkg = await file.json();
      if (pkg.name) return pkg.name as string;
    }
  } catch { /* fall through */ }
  return cwd.split("/").pop() ?? "unknown";
};

// Parse flags from args
const parseContextFlags = (args: readonly string[]): { layer?: string; budget?: number; save: boolean; ndjson: boolean } => {
  let layer: string | undefined;
  let budget: number | undefined;
  let save = false;
  let ndjson = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--layer" && args[i + 1]) {
      layer = args[i + 1]!;
      i++;
    } else if (arg.startsWith("--layer=")) {
      layer = arg.slice(8);
    } else if (arg === "--budget" && args[i + 1]) {
      budget = parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg.startsWith("--budget=")) {
      budget = parseInt(arg.slice(9), 10);
    } else if (arg === "--save") {
      save = true;
    } else if (arg === "--ndjson") {
      ndjson = true;
    }
  }

  return {
    ...(layer !== undefined ? { layer } : {}),
    ...(budget !== undefined ? { budget } : {}),
    save,
    ndjson,
  };
};

export const handler: CommandHandler<ContextResult> = async (args, flags) => {
  const cwd = flags.cwd;
  const { layer, budget, save, ndjson } = parseContextFlags(args);

  // Validate --layer input
  if (layer !== undefined) {
    const idCheck = validateResourceId(layer, "layer");
    if (!idCheck.ok) return err("INVALID_ARGS", idCheck.message, [`Valid layers: ${VALID_LAYERS.join(", ")}`], 2);
    const ctrlCheck = rejectControlChars(layer, "layer");
    if (!ctrlCheck.ok) return err("INVALID_ARGS", ctrlCheck.message, [], 2);
    if (!VALID_LAYERS.includes(layer as keyof typeof CONTEXT_MATRIX)) {
      return err("INVALID_ARGS", `Unknown layer: '${layer}'`, [`Valid layers: ${VALID_LAYERS.join(", ")}`], 2);
    }
  }

  // Validate --budget
  if (budget !== undefined && (isNaN(budget) || budget < 1)) {
    return err("INVALID_ARGS", "Budget must be a positive integer", ["Example: mktg context --budget 2000"], 2);
  }

  // Determine which files to include
  const targetFiles: readonly BrandFile[] = layer
    ? CONTEXT_MATRIX[layer as keyof typeof CONTEXT_MATRIX]
    : BRAND_FILES;

  // Read brand statuses and file contents in parallel
  const brandStatuses = await getBrandStatus(cwd);
  const statusMap = new Map(brandStatuses.map(s => [s.file, s]));

  const brandDir = join(cwd, "brand");
  const fileEntries: [string, ContextFileEntry][] = [];
  let totalPopulated = 0;
  let totalTemplate = 0;
  let totalStale = 0;

  // Read all target files
  for (const file of targetFiles) {
    const status = statusMap.get(file);
    if (!status || !status.exists) continue;

    const filePath = join(brandDir, file);
    try {
      const content = await Bun.file(filePath).text();
      const isTemplate = isTemplateContent(file, content);
      const freshness = isTemplate ? "template" : status.freshness;

      if (isTemplate) totalTemplate++;
      else totalPopulated++;
      if (status.freshness === "stale") totalStale++;

      const entry: ContextFileEntry = {
        content,
        tokens: estimateTokens(content),
        truncated: false,
        freshness,
      };
      fileEntries.push([file, entry]);
      if (ndjson) {
        writeStderr(JSON.stringify({ type: "brand-file", data: { file, status: freshness, tokens: entry.tokens } }));
      }
    } catch { /* skip unreadable files */ }
  }

  // Apply budget truncation if requested
  if (budget !== undefined && budget > 0) {
    // Sort by priority (FILE_PRIORITY order)
    const priorityOrder = new Map(FILE_PRIORITY.map((f, i) => [f, i]));
    fileEntries.sort((a, b) => (priorityOrder.get(a[0] as BrandFile) ?? 99) - (priorityOrder.get(b[0] as BrandFile) ?? 99));

    let remainingTokens = budget;
    for (let i = 0; i < fileEntries.length; i++) {
      const [name, entry] = fileEntries[i]!;
      if (remainingTokens <= 0) {
        // No budget left — truncate to nothing
        fileEntries[i] = [name, { content: "[...truncated — budget exceeded]", tokens: 0, truncated: true, freshness: entry.freshness }];
        continue;
      }
      const { text, truncated } = truncateToTokens(entry.content, remainingTokens);
      const tokens = estimateTokens(text);
      remainingTokens -= tokens;
      fileEntries[i] = [name, { content: text, tokens, truncated, freshness: entry.freshness }];
    }
  }

  const files = Object.fromEntries(fileEntries);
  const tokenEstimate = fileEntries.reduce((sum, [, e]) => sum + e.tokens, 0);
  const projectName = await getProjectName(cwd);

  const result: ContextResult = {
    compiledAt: new Date().toISOString(),
    project: projectName,
    tokenEstimate,
    ...(layer && { layer }),
    files,
    summary: {
      totalFiles: fileEntries.length,
      populatedFiles: totalPopulated,
      templateFiles: totalTemplate,
      staleFiles: totalStale,
    },
  };

  if (ndjson) {
    writeStderr(JSON.stringify({ type: "complete", data: { totalTokens: tokenEstimate, filesIncluded: fileEntries.length } }));
  }

  // Save to .mktg/context.json
  if (save) {
    if (flags.dryRun) {
      writeStderr("dry-run: would write .mktg/context.json");
    } else {
      const mktgDir = join(cwd, ".mktg");
      await mkdir(mktgDir, { recursive: true });
      await Bun.write(join(mktgDir, "context.json"), JSON.stringify(result, null, 2));
      writeStderr("Saved to .mktg/context.json");
    }
  }

  // TTY display
  if (isTTY() && !flags.json) {
    const lines: string[] = [];
    lines.push(bold(`mktg context — ${projectName}`));
    lines.push("");
    lines.push(`  Token estimate: ${tokenEstimate}${budget ? ` (budget: ${budget})` : ""}`);
    if (layer) lines.push(`  Layer: ${layer}`);
    lines.push("");
    lines.push(bold("  Files"));
    for (const [name, entry] of fileEntries) {
      const icon = entry.freshness === "current" ? green("●") :
        entry.freshness === "template" ? yellow("●") : red("●");
      const trunc = entry.truncated ? yellow(" [truncated]") : "";
      lines.push(`    ${icon} ${name} ${dim(`(${entry.tokens} tokens, ${entry.freshness})`)}${trunc}`);
    }
    lines.push("");
    lines.push(dim(`  ${result.summary.populatedFiles} populated, ${result.summary.templateFiles} template, ${result.summary.staleFiles} stale`));
    lines.push("");
    return ok(result, lines.join("\n"));
  }

  return ok(result);
};
