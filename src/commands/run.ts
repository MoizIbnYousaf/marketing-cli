// mktg run — Load a skill for agent consumption
// Checks prerequisites, reads SKILL.md content, and logs execution.

import { join } from "node:path";
import type { CommandHandler, CommandSchema, PrerequisiteStatus } from "../types";
import { ok } from "../types";
import { invalidArgs, notFound, DOCS } from "../core/errors";
import { resolveManifest, getSkill, getSkillsInstallDir } from "../core/skills";
import { checkPrerequisites } from "../core/skill-lifecycle";
import { logRun } from "../core/run-log";

export const schema: CommandSchema = {
  name: "run",
  description: "Load a skill for agent consumption — checks prerequisites and logs execution",
  positional: { name: "skill", description: "Skill name to run", required: true },
  flags: [],
  output: {
    skill: "string — resolved skill name",
    content: "string — full SKILL.md content",
    prerequisites: "PrerequisiteStatus — prerequisite check results",
    loggedAt: "string — ISO timestamp of logged run",
  },
  examples: [
    { args: "mktg run seo-content --json", description: "Load SEO content skill for agent" },
    { args: "mktg run brand-voice --dry-run", description: "Preview without logging" },
  ],
  vocabulary: ["run", "execute", "load skill"],
};

type RunResult = {
  readonly skill: string;
  readonly content: string;
  readonly prerequisites: PrerequisiteStatus;
  readonly loggedAt: string | null;
};

export const handler: CommandHandler<RunResult> = async (args, flags) => {
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const skillName = positionalArgs[0];
  if (!skillName) {
    return invalidArgs("Missing skill name", ["Usage: mktg run <skill-name>", "mktg list --json to see available skills"], DOCS.skills);
  }

  const manifest = await resolveManifest(flags.cwd);
  const resolved = getSkill(manifest, skillName);
  if (!resolved) {
    return notFound(`Skill '${skillName}'`, [
      "mktg list --json to see all available skills",
      "Check spelling — redirects are followed automatically",
    ], DOCS.skills);
  }

  // Check prerequisites (warn but don't block — progressive enhancement)
  const prerequisites = await checkPrerequisites(resolved.name, flags.cwd, manifest);

  // Read SKILL.md from install directory
  const skillMdPath = join(getSkillsInstallDir(), resolved.name, "SKILL.md");
  const skillFile = Bun.file(skillMdPath);
  if (!(await skillFile.exists())) {
    return notFound(`Installed skill '${resolved.name}'`, [
      "Run 'mktg update' to install skills",
      "Run 'mktg init' if this is a fresh setup",
    ], DOCS.skills);
  }

  const content = await skillFile.text();
  const now = new Date().toISOString();

  // Log execution (unless dry-run)
  if (!flags.dryRun) {
    await logRun(flags.cwd, {
      skill: resolved.name,
      timestamp: now,
      result: "success",
      brandFilesChanged: [],
    });
  }

  return ok({
    skill: resolved.name,
    content,
    prerequisites,
    loggedAt: flags.dryRun ? null : now,
  });
};
