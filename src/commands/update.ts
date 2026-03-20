// mktg update — Re-copy bundled skills to installed location
// Reports what changed via content comparison.

import { ok, type CommandHandler, type CommandSchema } from "../types";
import { loadManifest, updateSkills } from "../core/skills";
import { loadAgentManifest, updateAgents } from "../core/agents";
import { bold, dim, green, yellow, red, isTTY } from "../core/output";

export const schema: CommandSchema = {
  name: "update",
  description: "Re-copy bundled skills and agents to installed location",
  flags: [],
  output: {
    "skills.updated": "string[] — skills whose content changed",
    "skills.unchanged": "string[] — skills already current",
    "skills.notBundled": "string[] — skills in manifest but not bundled",
    "agents.updated": "string[] — agents whose content changed",
    "agents.unchanged": "string[] — agents already current",
    "agents.notBundled": "string[] — agents in manifest but not bundled",
    "versionChanges": "{ skill, from, to }[] — skills with version bumps",
    "totalSkills": "number — total skills in manifest",
    "totalAgents": "number — total installed/installable agents",
    "agentError": "string | null — error if agent manifest failed to load",
  },
  examples: [
    { args: "mktg update --json", description: "Update all skills and agents" },
    { args: "mktg update --dry-run", description: "Preview updates without writing" },
  ],
  vocabulary: ["update", "sync skills", "refresh"],
};

type UpdateResult = {
  readonly skills: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[] };
  readonly agents: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[]; failed: readonly string[] };
  readonly versionChanges: readonly { skill: string; from: string; to: string }[];
  readonly totalSkills: number;
  readonly totalAgents: number;
  readonly agentError: string | null;
};

export const handler: CommandHandler<UpdateResult> = async (_args, flags) => {
  const manifest = await loadManifest();
  const skillsUpdate = await updateSkills(manifest, flags.dryRun, flags.cwd);

  let agentsUpdate = { updated: [] as string[], unchanged: [] as string[], notBundled: [] as string[], failed: [] as string[] };
  let agentError: string | null = null;
  try {
    const agentManifest = await loadAgentManifest();
    agentsUpdate = await updateAgents(agentManifest, flags.dryRun);
  } catch (e) {
    agentError = e instanceof Error ? e.message : String(e);
  }

  const result: UpdateResult = {
    skills: skillsUpdate,
    agents: agentsUpdate,
    versionChanges: skillsUpdate.versionChanges,
    totalSkills: Object.keys(manifest.skills).length,
    totalAgents: agentsUpdate.updated.length + agentsUpdate.unchanged.length,
    agentError,
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

  // Skills section
  if (skillsUpdate.updated.length > 0) {
    lines.push(green(`  ~ ${skillsUpdate.updated.length} skills updated`));
    for (const name of skillsUpdate.updated) {
      lines.push(dim(`    ~ ${name}`));
    }
  }

  if (skillsUpdate.unchanged.length > 0) {
    lines.push(dim(`  = ${skillsUpdate.unchanged.length} skills unchanged`));
  }

  if (skillsUpdate.notBundled.length > 0) {
    lines.push(yellow(`  ? ${skillsUpdate.notBundled.length} skills not bundled yet`));
  }

  if (skillsUpdate.versionChanges.length > 0) {
    lines.push(green(`  ↑ ${skillsUpdate.versionChanges.length} version changes`));
    for (const vc of skillsUpdate.versionChanges) {
      lines.push(dim(`    ${vc.skill}: ${vc.from} → ${vc.to}`));
    }
  }

  // Agents section
  if (agentsUpdate.updated.length > 0) {
    lines.push(green(`  ~ ${agentsUpdate.updated.length} agents updated`));
    for (const name of agentsUpdate.updated) {
      lines.push(dim(`    ~ ${name}`));
    }
  }

  if (agentsUpdate.unchanged.length > 0) {
    lines.push(dim(`  = ${agentsUpdate.unchanged.length} agents unchanged`));
  }

  if (agentsUpdate.failed.length > 0) {
    lines.push(red(`  ! ${agentsUpdate.failed.length} agents failed to update`));
    for (const name of agentsUpdate.failed) {
      lines.push(dim(`    ! ${name}`));
    }
  }

  if (agentError) {
    lines.push(yellow(`  ? agents skipped: ${agentError}`));
  }

  lines.push("");
  lines.push(dim(`  ${result.totalSkills} skills, ${result.totalAgents} agents in manifests`));
  lines.push("");

  return ok(result, lines.join("\n"));
};
