// mktg — Integration status checker
// Reads env_vars from manifest, deduplicates, checks process.env.

import type { SkillsManifest } from "../types";

export type IntegrationStatus = {
  readonly envVar: string;
  readonly configured: boolean;
  readonly skills: readonly string[];
};

// Static metadata for named integrations that support --configure
export type IntegrationConfig = {
  readonly envVar: string;
  readonly docsUrl: string;
};

export const INTEGRATION_CONFIG: Record<string, IntegrationConfig> = {
  typefully: {
    envVar: "TYPEFULLY_API_KEY",
    docsUrl: "https://typefully.com/settings/api",
  },
  resend: {
    envVar: "RESEND_API_KEY",
    docsUrl: "https://resend.com/api-keys",
  },
};

export const getIntegrationStatus = (manifest: SkillsManifest): IntegrationStatus[] => {
  const envVarToSkills = new Map<string, string[]>();

  for (const [name, meta] of Object.entries(manifest.skills)) {
    if (!meta.env_vars) continue;
    for (const envVar of meta.env_vars) {
      const existing = envVarToSkills.get(envVar) ?? [];
      existing.push(name);
      envVarToSkills.set(envVar, existing);
    }
  }

  return Array.from(envVarToSkills.entries()).map(([envVar, skills]) => ({
    envVar,
    configured: !!process.env[envVar],
    skills,
  }));
};
