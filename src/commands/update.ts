// mktg update — Re-copy bundled skills to installed location
// Reports what changed via content comparison.

import { ok, type CommandHandler } from "../types";
import { loadManifest, updateSkills } from "../core/skills";
import { loadAgentManifest, updateAgents } from "../core/agents";
import { bold, dim, green, yellow, isTTY } from "../core/output";

type UpdateResult = {
  readonly skills: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[] };
  readonly agents: { updated: readonly string[]; unchanged: readonly string[]; notBundled: readonly string[] };
  readonly totalSkills: number;
  readonly totalAgents: number;
};

export const handler: CommandHandler<UpdateResult> = async (_args, flags) => {
  const manifest = await loadManifest();
  const skillsUpdate = await updateSkills(manifest, flags.dryRun);

  let agentsUpdate = { updated: [] as string[], unchanged: [] as string[], notBundled: [] as string[] };
  try {
    const agentManifest = await loadAgentManifest();
    agentsUpdate = await updateAgents(agentManifest, flags.dryRun);
  } catch {
    // Agent manifest may not exist yet
  }

  const result: UpdateResult = {
    skills: skillsUpdate,
    agents: agentsUpdate,
    totalSkills: Object.keys(manifest.skills).length,
    totalAgents: agentsUpdate.updated.length + agentsUpdate.unchanged.length + agentsUpdate.notBundled.length,
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

  lines.push("");
  lines.push(dim(`  ${result.totalSkills} skills, ${result.totalAgents} agents in manifests`));
  lines.push("");

  return ok({ ...result, _display: lines.join("\n") } as unknown as UpdateResult);
};
