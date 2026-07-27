// mktg — Completion flag parsing + writes validation for `mktg run`
// Extracted from commands/run.ts to keep the command under the repo's
// 300-line rule. Pure parsing + sandboxed path validation; no logging,
// no manifest access.

import { validatePathInput } from "./errors";

export type RunFlagParse = {
  readonly resultArg: string | undefined;
  readonly writesList: readonly string[];
  readonly budget: number | undefined;
};

/** Parse --result / --writes / --budget from raw args (both `--flag value` and `--flag=value` forms). */
export const parseRunFlags = (args: readonly string[]): RunFlagParse => {
  let resultArg: string | undefined;
  const writesRaw: string[] = [];
  let budget: number | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--result" && args[i + 1]) { resultArg = args[i + 1]!; i++; }
    else if (a.startsWith("--result=")) { resultArg = a.slice(9); }
    else if (a === "--writes" && args[i + 1]) { writesRaw.push(...args[i + 1]!.split(",")); i++; }
    else if (a.startsWith("--writes=")) { writesRaw.push(...a.slice(9).split(",")); }
    else if (a === "--budget" && args[i + 1]) { budget = parseInt(args[i + 1]!, 10); i++; }
    else if (a.startsWith("--budget=")) { budget = parseInt(a.slice(9), 10); }
  }
  return {
    resultArg,
    writesList: writesRaw.map(w => w.trim()).filter(Boolean),
    budget,
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
