// mktg update — Re-copy bundled skills to installed location
// Reports what changed via content comparison.

import { ok, type CommandHandler } from "../types";
import { loadManifest, updateSkills } from "../core/skills";
import { bold, dim, green, yellow, isTTY } from "../core/output";

type UpdateResult = {
  readonly updated: readonly string[];
  readonly unchanged: readonly string[];
  readonly notBundled: readonly string[];
  readonly total: number;
};

export const handler: CommandHandler<UpdateResult> = async (_args, flags) => {
  const manifest = await loadManifest();
  const { updated, unchanged, notBundled } = await updateSkills(
    manifest,
    flags.dryRun,
  );

  const result: UpdateResult = {
    updated,
    unchanged,
    notBundled,
    total: Object.keys(manifest.skills).length,
  };

  if (flags.json || !isTTY()) {
    return ok(result);
  }

  // TTY display
  const lines: string[] = [];
  lines.push(bold("mktg update"));
  lines.push("");

  if (flags.dryRun) {
    lines.push(dim("  (dry run — no changes written)"));
    lines.push("");
  }

  if (updated.length > 0) {
    lines.push(green(`  ~ ${updated.length} skills updated`));
    for (const name of updated) {
      lines.push(dim(`    ~ ${name}`));
    }
  }

  if (unchanged.length > 0) {
    lines.push(dim(`  = ${unchanged.length} skills unchanged`));
  }

  if (notBundled.length > 0) {
    lines.push(yellow(`  ? ${notBundled.length} skills not bundled yet`));
    for (const name of notBundled) {
      lines.push(dim(`    ? ${name}`));
    }
  }

  lines.push("");
  lines.push(dim(`  ${result.total} total skills in manifest`));
  lines.push("");

  return ok({ ...result, _display: lines.join("\n") } as unknown as UpdateResult);
};
