// mktg — Brand context compiler (shared core)
// Token estimation, priority truncation, layer/file selection, template
// handling. Consumed by `mktg context` (full envelope) and
// `mktg run <skill> --with-context` (one-shot activation envelope).

import { join } from "node:path";
import { BRAND_FILES, type BrandFile } from "../types";
import { isTemplateContent, getBrandStatus, CONTEXT_MATRIX } from "./brand";

// Token estimation: ~4 chars per token
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Truncate content to fit a token budget, preserving leading lines
export const truncateToTokens = (content: string, maxTokens: number): { text: string; truncated: boolean } => {
  if (estimateTokens(content) <= maxTokens) return { text: content, truncated: false };
  const charBudget = maxTokens * 4;
  const truncated = content.slice(0, charBudget);
  // Cut at last newline to avoid mid-line truncation
  const lastNewline = truncated.lastIndexOf("\n");
  const text = lastNewline > 0 ? truncated.slice(0, lastNewline) + "\n[...truncated]" : truncated + "\n[...truncated]";
  return { text, truncated: true };
};

// Priority order for truncation — most important files first
export const FILE_PRIORITY: readonly BrandFile[] = [
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

export const CONTEXT_LAYERS = Object.keys(CONTEXT_MATRIX) as (keyof typeof CONTEXT_MATRIX)[];

export type ContextFileEntry = {
  readonly content: string;
  readonly tokens: number;
  readonly truncated: boolean;
  readonly freshness: string;
};

export type CompiledContext = {
  readonly files: Record<string, ContextFileEntry>;
  readonly tokenEstimate: number;
  /** Files dropped entirely because the budget ran out (structured signal). */
  readonly budgetDropped: readonly string[];
  /** Existing template files excluded from output (only when excludeTemplates). */
  readonly templatesSkipped: readonly string[];
  readonly summary: {
    readonly totalFiles: number;
    readonly populatedFiles: number;
    readonly templateFiles: number;
    readonly staleFiles: number;
  };
};

export type CompileContextOptions = {
  /** CONTEXT_MATRIX layer name. Ignored when `files` is set. */
  readonly layer?: string;
  /** Explicit brand-file selection (wins over layer). */
  readonly files?: readonly BrandFile[];
  /** Approximate token budget — truncates files by FILE_PRIORITY. */
  readonly budget?: number;
  /** Exclude template-content files from output (reported in templatesSkipped). */
  readonly excludeTemplates?: boolean;
};

export const compileBrandContext = async (
  cwd: string,
  options: CompileContextOptions = {},
): Promise<CompiledContext> => {
  const { layer, files, budget, excludeTemplates = false } = options;

  const targetFiles: readonly BrandFile[] = files
    ?? (layer ? CONTEXT_MATRIX[layer as keyof typeof CONTEXT_MATRIX] : BRAND_FILES);

  const brandStatuses = await getBrandStatus(cwd);
  const statusMap = new Map(brandStatuses.map(s => [s.file, s]));

  const brandDir = join(cwd, "brand");
  const fileEntries: [string, ContextFileEntry][] = [];
  const templatesSkipped: string[] = [];
  let totalPopulated = 0;
  let totalTemplate = 0;
  let totalStale = 0;

  for (const file of targetFiles) {
    const status = statusMap.get(file);
    if (!status || !status.exists) continue;

    const filePath = join(brandDir, file);
    try {
      const content = await Bun.file(filePath).text();
      const isTemplate = isTemplateContent(file, content);
      const freshness = isTemplate ? "template" : status.freshness;

      if (isTemplate) {
        totalTemplate++;
        if (excludeTemplates) {
          templatesSkipped.push(file);
          continue;
        }
      } else {
        totalPopulated++;
      }
      if (status.freshness === "stale") totalStale++;

      const entry: ContextFileEntry = {
        content,
        tokens: estimateTokens(content),
        truncated: false,
        freshness,
      };
      fileEntries.push([file, entry]);
    } catch { /* skip unreadable files */ }
  }

  const budgetDropped: string[] = [];
  if (budget !== undefined && budget > 0) {
    const priorityOrder = new Map(FILE_PRIORITY.map((f, i) => [f, i]));
    fileEntries.sort((a, b) => (priorityOrder.get(a[0] as BrandFile) ?? 99) - (priorityOrder.get(b[0] as BrandFile) ?? 99));

    let remainingTokens = budget;
    for (let i = 0; i < fileEntries.length; i++) {
      const [name, entry] = fileEntries[i]!;
      if (remainingTokens <= 0) {
        fileEntries[i] = [name, { content: "[...truncated — budget exceeded]", tokens: 0, truncated: true, freshness: entry.freshness }];
        budgetDropped.push(name);
        continue;
      }
      const { text, truncated } = truncateToTokens(entry.content, remainingTokens);
      const tokens = estimateTokens(text);
      remainingTokens -= tokens;
      fileEntries[i] = [name, { content: text, tokens, truncated, freshness: entry.freshness }];
    }
  }

  const filesOut = Object.fromEntries(fileEntries);
  const tokenEstimate = fileEntries.reduce((sum, [, e]) => sum + e.tokens, 0);

  return {
    files: filesOut,
    tokenEstimate,
    budgetDropped,
    templatesSkipped,
    summary: {
      totalFiles: fileEntries.length,
      populatedFiles: totalPopulated,
      templateFiles: totalTemplate,
      staleFiles: totalStale,
    },
  };
};

/**
 * Select context files for a skill's activation envelope:
 * declared manifest reads win; orchestrators and unknown layers get the
 * full matrix; everything else maps 1:1 to a CONTEXT_MATRIX layer.
 */
export const filesForSkillActivation = (entry: {
  readonly layer: string;
  readonly reads: readonly string[];
}): { files: readonly BrandFile[] | undefined; layer: string } => {
  const readFiles = entry.reads
    .map(f => f.replace(/^brand\//, ""))
    .filter((f): f is BrandFile => (BRAND_FILES as readonly string[]).includes(f));
  if (readFiles.length > 0) {
    return { files: readFiles, layer: "reads" };
  }
  if (entry.layer === "orchestrator" || !(entry.layer in CONTEXT_MATRIX)) {
    return { files: undefined, layer: "all" };
  }
  return { files: CONTEXT_MATRIX[entry.layer as keyof typeof CONTEXT_MATRIX], layer: entry.layer };
};
