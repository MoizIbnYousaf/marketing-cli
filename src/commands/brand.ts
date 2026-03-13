// mktg brand — Brand memory management
import { ok, type CommandHandler, type CommandSchema, type BrandFile, type GlobalFlags, type CommandResult } from "../types";
import { isKeyOf } from "../core/routing";
import { invalidArgs, notImplemented } from "../core/errors";
import { getBrandStatus, isTemplateContent } from "../core/brand";
import { resolveManifest } from "../core/skills";
import { join } from "node:path";

const SUBCOMMANDS = {
  "export": "Export brand memory as portable JSON bundle",
  "import": "Import brand memory from a JSON bundle",
  "reset": "Reset brand/ to template defaults",
  "freshness": "Check brand file freshness against skill review intervals",
} as const;

export const schema: CommandSchema = {
  name: "brand",
  description: "Brand memory management — export, import, reset, and check freshness",
  flags: [],
  positional: { name: "subcommand", description: "Subcommand to run", required: true },
  subcommands: Object.entries(SUBCOMMANDS).map(([name, description]) => ({
    name,
    description,
    flags: [],
    output: {},
    examples: [{ args: `mktg brand ${name} --json`, description }],
  })),
  output: {},
  examples: [
    { args: "mktg brand export --json", description: "Export brand memory" },
    { args: "mktg brand freshness --json", description: "Check file freshness" },
    { args: "mktg brand reset --json", description: "Reset to defaults" },
  ],
  vocabulary: ["brand export", "brand import", "brand freshness", "brand reset", "brand memory"],
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
  const subcommand = args.filter(a => !a.startsWith("--"))[0];
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
  const subArgs = args.filter(a => !a.startsWith("--")).slice(1);
  switch (subcommand) {
    case "freshness": return handleFreshness(subArgs, flags);
    default: return notImplemented(`brand ${subcommand}`);
  }
};
