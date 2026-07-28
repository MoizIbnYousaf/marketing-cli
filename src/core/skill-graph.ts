// mktg — Skill dependency graph and writer index

import type {
  SkillsManifest,
  SkillLayer,
  SkillGraph,
  SkillGraphNode,
  SkillGraphEdge,
} from "../types";

/**
 * Brand-file → writer skill names (manifest iteration order).
 * First writer is used for remediation hints; all writers for dep inference.
 */
export const indexWriters = (
  manifest: SkillsManifest,
): Map<string, readonly string[]> => {
  const index = new Map<string, string[]>();
  for (const [name, entry] of Object.entries(manifest.skills)) {
    for (const w of entry.writes) {
      const existing = index.get(w);
      if (existing) existing.push(name);
      else index.set(w, [name]);
    }
  }
  return index;
};

export const buildGraph = (manifest: SkillsManifest): SkillGraph => {
  const skillNames = Object.keys(manifest.skills);
  const nodes: SkillGraphNode[] = [];
  const edges: SkillGraphEdge[] = [];
  const layerMap: Record<SkillLayer, string[]> = {
    foundation: [], strategy: [], execution: [], distribution: [], orchestrator: [],
  };
  const dependedOnBy: Record<string, string[]> = {};

  // Build nodes and edges
  for (const [name, entry] of Object.entries(manifest.skills)) {
    nodes.push({
      name,
      category: entry.category,
      layer: entry.layer,
      tier: entry.tier,
      dependsOn: [...entry.depends_on],
    });
    layerMap[entry.layer].push(name);

    for (const dep of entry.depends_on) {
      edges.push({ from: name, to: dep });
      if (!dependedOnBy[dep]) dependedOnBy[dep] = [];
      dependedOnBy[dep].push(name);
    }
  }

  // Find roots (no deps) and leaves (nothing depends on them)
  const roots = skillNames.filter(n => manifest.skills[n]!.depends_on.length === 0);
  const leaves = skillNames.filter(n => !dependedOnBy[n] || dependedOnBy[n]!.length === 0);

  // Topological sort (Kahn's algorithm) with cycle detection.
  // in-degree[A] = number of dependencies A has (A depends on B ⇒ B before A).
  const inDegree: Record<string, number> = {};
  for (const name of skillNames) inDegree[name] = manifest.skills[name]!.depends_on.length;

  const queue: string[] = skillNames.filter(n => inDegree[n] === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    // Find skills that depend on current
    const dependents = dependedOnBy[current] || [];
    for (const dep of dependents) {
      inDegree[dep] = (inDegree[dep] ?? 1) - 1;
      if (inDegree[dep] === 0) queue.push(dep);
    }
  }

  const hasCycles = order.length !== skillNames.length;

  return {
    nodes,
    edges,
    roots,
    leaves,
    layers: {
      foundation: layerMap.foundation,
      strategy: layerMap.strategy,
      execution: layerMap.execution,
      distribution: layerMap.distribution,
      orchestrator: layerMap.orchestrator,
    },
    order,
    hasCycles,
  };
};

export const getReverseDeps = (
  skillName: string,
  manifest: SkillsManifest,
): readonly string[] => {
  const result: string[] = [];
  for (const [name, entry] of Object.entries(manifest.skills)) {
    if (entry.depends_on.includes(skillName)) result.push(name);
  }
  return result;
};
