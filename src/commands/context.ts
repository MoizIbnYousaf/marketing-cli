// mktg context — Brand context compiler
// Compiles all brand files into one token-budgeted JSON artifact for agent consumption.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { compileBrandContext, CONTEXT_LAYERS, type ContextFileEntry } from "../core/context-compiler";
import { writeStderr, isTTY, bold, dim, green, yellow, red } from "../core/output";

// Valid layer names (keys of CONTEXT_MATRIX)
const VALID_LAYERS = CONTEXT_LAYERS;

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
  readonly budgetDropped: readonly string[];
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
    "budgetDropped": "string[] — files dropped entirely when --budget ran out (structured overflow signal)",
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
    if (!(VALID_LAYERS as readonly string[]).includes(layer)) {
      return err("INVALID_ARGS", `Unknown layer: '${layer}'`, [`Valid layers: ${VALID_LAYERS.join(", ")}`], 2);
    }
  }

  // Validate --budget
  if (budget !== undefined && (isNaN(budget) || budget < 1)) {
    return err("INVALID_ARGS", "Budget must be a positive integer", ["Example: mktg context --budget 2000"], 2);
  }

  const compiled = await compileBrandContext(cwd, {
    ...(layer !== undefined ? { layer } : {}),
    ...(budget !== undefined ? { budget } : {}),
  });

  if (ndjson) {
    for (const [file, entry] of Object.entries(compiled.files)) {
      writeStderr(JSON.stringify({ type: "brand-file", data: { file, status: entry.freshness, tokens: entry.tokens } }));
    }
  }

  const fileEntries = Object.entries(compiled.files);
  const projectName = await getProjectName(cwd);

  const result: ContextResult = {
    compiledAt: new Date().toISOString(),
    project: projectName,
    tokenEstimate: compiled.tokenEstimate,
    ...(layer && { layer }),
    files: compiled.files,
    budgetDropped: compiled.budgetDropped,
    summary: compiled.summary,
  };

  if (ndjson) {
    writeStderr(JSON.stringify({ type: "complete", data: { totalTokens: compiled.tokenEstimate, filesIncluded: fileEntries.length } }));
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
    lines.push(`  Token estimate: ${compiled.tokenEstimate}${budget ? ` (budget: ${budget})` : ""}`);
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
