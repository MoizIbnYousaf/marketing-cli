// Routing regression: natural sentences must reach the skill /cmo's SKILL.md
// documents. Guards trigger-coverage scoring (skill-router.ts) and the
// manifest trigger fixes (firecrawl vs exa-search, Product Hunt, landing page).

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routePrompt } from "../src/core/skill-router";
import type { SkillsManifest } from "../src/types";

const manifest = JSON.parse(readFileSync(join(import.meta.dir, "..", "skills-manifest.json"), "utf-8")) as SkillsManifest;

const CASES: ReadonlyArray<[string, string]> = [
  ["write a landing page", "direct-response-copy"],
  ["write copy for my landing page", "direct-response-copy"],
  ["do keyword research for my saas", "keyword-research"],
  ["research a topic", "exa-search"],
  ["search the web for AI tools", "exa-search"],
  ["scrape website https://example.com", "firecrawl"],
  ["Product Hunt launch", "startup-launcher"],
  ["launch on Product Hunt", "startup-launcher"],
  ["create a launch plan", "launch-strategy"],
  ["repurpose this blog post into social posts", "content-atomizer"],
  // Routing overlap resolution: launch-day submissions vs ongoing link building
  ["submit to directories and BetaList", "startup-launcher"],
  ["directory submissions for Product Hunt week", "startup-launcher"],
  ["directory link building to raise domain authority", "off-page-seo"],
  ["get listicle placements and backlinks", "off-page-seo"],
  // One-off page vs batch/roadmap vs template-at-scale
  ["write an alternatives page for Notion", "competitor-alternatives"],
  ["build a Notion vs Coda comparison page", "competitor-alternatives"],
  ["build a programmatic SEO roadmap with a tracker", "seo-machine"],
  ["ship a batch of alternatives pages", "seo-machine"],
  ["generate template pages at scale from a keyword list", "seo-content"],
];

describe("mktg route natural phrasings", () => {
  for (const [prompt, expected] of CASES) {
    test(`"${prompt}" -> ${expected}`, () => {
      const decision = routePrompt(prompt, manifest);
      expect(decision.skill).toBe(expected);
    });
  }
});
