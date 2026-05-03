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
  readonly testEndpoint?: string;
  readonly docsUrl: string;
  readonly testHeaders?: (key: string) => Record<string, string>;
};

export const INTEGRATION_CONFIG: Record<string, IntegrationConfig> = {
  typefully: {
    envVar: "TYPEFULLY_API_KEY",
    testEndpoint: "https://api.typefully.com/v1/drafts/",
    docsUrl: "https://typefully.com/settings/api",
    testHeaders: (key) => ({ "X-API-KEY": key }),
  },
  resend: {
    envVar: "RESEND_API_KEY",
    testEndpoint: "https://api.resend.com/api-keys",
    docsUrl: "https://resend.com/api-keys",
    testHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
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
