// mktg route — Portable deterministic skill routing (no LLM)
// Scores a prompt against manifest triggers + /cmo playbook phrases and
// returns the best skill with confidence + rationale + nextCommand.
// Works in CI and any agent runtime without a Claude Code binary.

import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { invalidArgs, rejectControlChars, DOCS } from "../core/errors";
import { resolveManifest } from "../core/skills";
import { routePrompt, type RouteCandidate, type RouteConfidence } from "../core/skill-router";

export const schema: CommandSchema = {
  name: "route",
  description: "Route a natural-language prompt to the best marketing skill — deterministic trigger/playbook matching, no LLM required (use /cmo or `mktg cmo` for LLM routing)",
  positional: { name: "prompt", description: "Natural-language marketing request (all positional args are joined)", required: true },
  flags: [],
  output: {
    prompt: "string — normalized prompt that was routed",
    skill: "string | null — top candidate skill name",
    playbook: "string | null — matched /cmo playbook name when the prompt is multi-step",
    confidence: "'high' | 'medium' | 'low' | 'none' — high = exact trigger phrase hit",
    rationale: "string — why this skill was chosen (agents: read this out loud before running)",
    matchedTriggers: "string[] — manifest triggers that matched (max 5)",
    candidates: "RouteCandidate[] — top 3 {skill, score, matchedTriggers} for disambiguation",
    nextCommand: "string | null — suggested follow-up: mktg run <skill> --with-context --json",
  },
  examples: [
    { args: 'mktg route "write a show hn post" --json', description: "Route to startup-launcher or launch-strategy" },
    { args: 'mktg route "keyword research for my SaaS" --json', description: "Route to keyword-research" },
    { args: 'mktg route "launch a product" --json', description: "Playbook match: full-product-launch" },
  ],
  vocabulary: ["route", "router", "which skill", "dispatch", "orchestrate"],
};

type RouteResult = {
  readonly prompt: string;
  readonly skill: string | null;
  readonly playbook: string | null;
  readonly confidence: RouteConfidence;
  readonly rationale: string;
  readonly matchedTriggers: readonly string[];
  readonly candidates: readonly RouteCandidate[];
  readonly nextCommand: string | null;
};

export const handler: CommandHandler<RouteResult> = async (args, flags) => {
  // Prompts contain spaces — every positional token is part of the prompt.
  const positional = args.filter(a => !a.startsWith("--"));
  const rawPrompt = positional.join(" ").trim();

  if (!rawPrompt) {
    return invalidArgs("Missing prompt to route", [
      'Usage: mktg route "write a show hn post" --json',
      "For LLM routing with full context, use /cmo or mktg cmo instead",
    ], DOCS.skills);
  }
  if (rawPrompt.length > 500) {
    return invalidArgs("Prompt too long (max 500 chars)", [
      "Route is for short intent statements; long briefs belong in /cmo",
    ], DOCS.skills);
  }
  const ctrlCheck = rejectControlChars(rawPrompt, "prompt");
  if (!ctrlCheck.ok) {
    return invalidArgs(ctrlCheck.message, [], DOCS.skills);
  }

  const manifest = await resolveManifest(flags.cwd);
  const decision = routePrompt(rawPrompt, manifest);

  if (decision.skill === null) {
    // No match is a successful route evaluation with confidence "none" —
    // agents must be able to distinguish "router ran, nothing matched"
    // from a command failure. Exit 0 with guidance baked into the payload.
    return ok({
      prompt: rawPrompt,
      ...decision,
      rationale: `${decision.rationale} Suggestion: mktg list --json to browse skills, or /cmo for LLM routing.`,
    });
  }

  return ok({ prompt: rawPrompt, ...decision });
};
