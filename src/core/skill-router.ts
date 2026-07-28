// mktg — Deterministic skill router (no LLM)
// Scores a natural-language prompt against manifest triggers + playbook
// phrases. Used by `mktg route` so agents get portable routing without a
// Claude Code session. The /cmo skill remains the richer LLM router; this
// table is the portable floor both should agree on.

import type { SkillsManifest } from "../types";
import { jaccardSimilarity, tokenize } from "./skill-lifecycle";

export type RouteConfidence = "high" | "medium" | "low" | "none";

export type RouteCandidate = {
  readonly skill: string;
  readonly score: number;
  readonly matchedTriggers: readonly string[];
};

export type RouteDecision = {
  readonly skill: string | null;
  readonly playbook: string | null;
  readonly confidence: RouteConfidence;
  readonly rationale: string;
  readonly matchedTriggers: readonly string[];
  readonly candidates: readonly RouteCandidate[];
  readonly nextCommand: string | null;
};

// Named /cmo playbooks (skills/cmo/rules/playbooks.md) with route phrases.
// A playbook hit routes to its entry skill and names the playbook so agents
// can follow the multi-step protocol in the /cmo rules.
const PLAYBOOKS: ReadonlyArray<{
  readonly name: string;
  readonly phrases: readonly string[];
  readonly entrySkill: string;
}> = [
  { name: "full-product-launch", phrases: ["full product launch", "launch a product", "product launch"], entrySkill: "launch-strategy" },
  { name: "content-engine", phrases: ["content engine", "ongoing content", "content machine"], entrySkill: "seo-content" },
  { name: "founder-voice-rebrand", phrases: ["founder voice", "rebrand voice", "voice rebrand"], entrySkill: "brand-voice" },
  { name: "conversion-audit", phrases: ["conversion audit", "audit my funnel", "cro audit"], entrySkill: "page-cro" },
  { name: "retention-recovery", phrases: ["retention recovery", "save churning", "win back customers"], entrySkill: "churn-prevention" },
  { name: "visual-identity", phrases: ["visual identity", "brand look", "design system"], entrySkill: "visual-style" },
  { name: "video-content", phrases: ["video content", "make videos", "video strategy"], entrySkill: "video-content" },
  { name: "email-infrastructure", phrases: ["email infrastructure", "email setup", "transactional email setup"], entrySkill: "send-email" },
  { name: "seo-authority-build", phrases: ["seo authority", "seo strategy", "organic traffic plan"], entrySkill: "keyword-research" },
  { name: "newsletter-launch", phrases: ["newsletter launch", "start a newsletter", "newsletter strategy"], entrySkill: "newsletter" },
  { name: "studio-launch", phrases: ["studio launch", "open the dashboard", "launch the studio"], entrySkill: "cmo" },
];

const EXACT_HIT_SCORE = 3;
const SIMILARITY_HIT_SCORE = 1;
const SIMILARITY_THRESHOLD = 0.6;
const MAX_CANDIDATES = 3;
const MAX_MATCHED_TRIGGERS = 5;

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\s/-]+/g, " ").replace(/\s+/g, " ").trim();

const matchPlaybook = (prompt: string): (typeof PLAYBOOKS)[number] | null => {
  for (const playbook of PLAYBOOKS) {
    for (const phrase of playbook.phrases) {
      if (prompt.includes(phrase)) return playbook;
    }
  }
  return null;
};

/**
 * Route a prompt to a skill. Pure function over the manifest — no I/O,
 * no LLM, safe for CI. Deterministic ordering: score desc, then
 * must-have tier first, then name asc.
 */
export const routePrompt = (
  rawPrompt: string,
  manifest: SkillsManifest,
): RouteDecision => {
  const prompt = normalize(rawPrompt);
  if (prompt.length === 0) {
    return {
      skill: null,
      playbook: null,
      confidence: "none",
      rationale: "Empty prompt — nothing to route.",
      matchedTriggers: [],
      candidates: [],
      nextCommand: null,
    };
  }

  const playbook = matchPlaybook(prompt);
  const promptTokens = tokenize(prompt);

  const candidates: RouteCandidate[] = [];
  for (const [name, entry] of Object.entries(manifest.skills)) {
    let score = 0;
    const matched: string[] = [];
    for (const trigger of entry.triggers) {
      const normalizedTrigger = normalize(trigger);
      if (normalizedTrigger.length === 0) continue;
      if (prompt.includes(normalizedTrigger)) {
        score += EXACT_HIT_SCORE;
        if (matched.length < MAX_MATCHED_TRIGGERS) matched.push(trigger);
        continue;
      }
      const similarity = jaccardSimilarity(tokenize(normalizedTrigger), promptTokens);
      if (similarity >= SIMILARITY_THRESHOLD) {
        score += SIMILARITY_HIT_SCORE;
        if (matched.length < MAX_MATCHED_TRIGGERS) matched.push(trigger);
      }
    }
    // Playbook entry skill gets a nudge so it wins ties against generic hits
    if (playbook && name === playbook.entrySkill) score += EXACT_HIT_SCORE;
    if (score > 0) {
      candidates.push({ skill: name, score, matchedTriggers: matched });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tierA = manifest.skills[a.skill]?.tier === "must-have" ? 0 : 1;
    const tierB = manifest.skills[b.skill]?.tier === "must-have" ? 0 : 1;
    if (tierA !== tierB) return tierA - tierB;
    return a.skill.localeCompare(b.skill);
  });

  const top = candidates[0];
  if (!top) {
    return {
      skill: null,
      playbook: playbook?.name ?? null,
      confidence: "none",
      rationale: playbook
        ? `Prompt matches the '${playbook.name}' playbook but no skill triggers — run /cmo for LLM routing.`
        : "No skill triggers matched. Run /cmo for LLM routing, or broaden the prompt.",
      matchedTriggers: [],
      candidates: [],
      nextCommand: null,
    };
  }

  const hasExactHit = top.score >= EXACT_HIT_SCORE;
  const confidence: RouteConfidence = hasExactHit ? "high" : top.score >= 2 ? "medium" : "low";
  const rationale = [
    playbook ? `Prompt matches the '${playbook.name}' playbook.` : null,
    `Top candidate '${top.skill}' (score ${top.score}) matched triggers: ${top.matchedTriggers.join(", ") || "(none)"}.`,
    confidence === "high"
      ? "Exact trigger phrase found in prompt."
      : confidence === "medium"
        ? "Similarity-only match — consider confirming with the user."
        : "Weak similarity match — consider /cmo for LLM routing.",
  ].filter(Boolean).join(" ");

  return {
    skill: top.skill,
    playbook: playbook?.name ?? null,
    confidence,
    rationale,
    matchedTriggers: top.matchedTriggers,
    candidates: candidates.slice(0, MAX_CANDIDATES),
    nextCommand: `mktg run ${top.skill} --with-context --json`,
  };
};
