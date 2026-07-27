// mktg — Completion flag parsing + writes validation for `mktg run`
// Extracted from commands/run.ts to keep the command under the repo's
// 300-line rule. Pure parsing + sandboxed path validation; no logging,
// no manifest access.

import { validatePathInput } from "./errors";
import { flagValue, flagValues } from "./args";

const VALID_RUN_RESULTS = ["success", "partial", "failed"] as const;
export type RunOutcome = typeof VALID_RUN_RESULTS[number];

/** Type guard — lets callers validate before narrowing instead of casting. */
export const isRunOutcome = (value: string): value is RunOutcome =>
  (VALID_RUN_RESULTS as readonly string[]).includes(value);

export const RUN_OUTCOME_VALUES = VALID_RUN_RESULTS;

export type RunFlagParse = {
  readonly resultArg: string | undefined;
  readonly writesList: readonly string[];
  readonly budget: number | undefined;
};

/** Parse --result / --writes / --budget via the canonical args helpers. */
export const parseRunFlags = (args: readonly string[]): RunFlagParse => {
  const budgetRaw = flagValue(args, "--budget");
  return {
    resultArg: flagValue(args, "--result"),
    writesList: flagValues(args, "--writes"),
    budget: budgetRaw !== undefined ? parseInt(budgetRaw, 10) : undefined,
  };
};

export type WritesValidation =
  | { readonly ok: true; readonly writes: readonly string[] }
  | { readonly ok: false; readonly message: string };

/**
 * Validate completion write paths: every path must pass the full sandbox
 * pipeline (control chars → double-encoding → traversal/absolute) AND exist
 * on disk. Recording work that didn't happen is the exact lie `--complete`
 * exists to prevent, so invalid writes fail loudly with per-path detail.
 */
export const validateCompletionWrites = async (
  cwd: string,
  writesList: readonly string[],
): Promise<WritesValidation> => {
  const validated: string[] = [];
  const writeErrors: string[] = [];
  for (const w of writesList) {
    const check = validatePathInput(cwd, w);
    if (!check.ok) {
      writeErrors.push(`'${w}': ${check.message}`);
      continue;
    }
    if (!(await Bun.file(check.path).exists())) {
      writeErrors.push(`'${w}': file does not exist`);
      continue;
    }
    validated.push(w);
  }
  if (writeErrors.length > 0) {
    return { ok: false, message: `Invalid --writes: ${writeErrors.join("; ")}` };
  }
  return { ok: true, writes: validated };
};
