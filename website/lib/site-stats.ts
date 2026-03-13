import manifest from "../../skills-manifest.json";

type SkillsManifest = {
  skills: Record<string, unknown>;
};

const skillsManifest = manifest as SkillsManifest;

export const MARKETING_SKILL_COUNT = Object.keys(skillsManifest.skills).length;
