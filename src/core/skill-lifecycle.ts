// mktg — Skill lifecycle barrel: validation, graph, prerequisites, registration
// Implementation lives in focused modules; this file re-exports the public API.

export { parseFrontmatter, validateSkill } from "./skill-frontmatter";
export { buildGraph, getReverseDeps } from "./skill-graph";
export { checkPrerequisites, getSkillInfo } from "./skill-prerequisites";
export { registerSkill, unregisterSkill, type UnregisterResult } from "./skill-register";
export {
  tokenize,
  jaccardSimilarity,
  triggerSimilarity,
  evaluateSkill,
  detectTriggerConflicts,
  type TriggerConflict,
} from "./skill-evaluate";
