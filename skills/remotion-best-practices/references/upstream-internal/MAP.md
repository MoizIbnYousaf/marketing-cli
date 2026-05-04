# Upstream Internal — Applicability Map

These files are mirrored verbatim from `remotion-dev/remotion/.claude/` for completeness ("any/everything from upstream"). Most are Remotion-team-internal dev workflow and not directly relevant to making marketing videos. Use this map to decide what to load.

## How the agent should use this

When the user says X, load the rules in HIGH first. Only fall back to MEDIUM if the HIGH coverage was insufficient. Almost never load LOW unless the user is contributing to Remotion itself.

## HIGH applicability — load when relevant

| File | When to load | Why |
|---|---|---|
| skills/add-sfx/SKILL.md | User wants sound effects in a composition | Concrete sfx integration patterns from the Remotion team. |
| skills/docs-demo/SKILL.md | Building a demonstration composition (e.g., the CRT terminal demo in /cmo-remotion) | Encodes Remotion's own documentation-demo conventions — clean, reproducible compositions. |
| skills/video-report/SKILL.md | Generating a programmatic report-style video | Pattern for parametric report compositions. |

## MEDIUM applicability — load occasionally

| File | When to load | Why |
|---|---|---|
| skills/writing-docs/SKILL.md | Writing technical narration / on-screen explainer text | Remotion-team's voice/style guide for docs. Useful when narration script needs a Remotion-product flavor. |

## LOW applicability — usually skip

These are Remotion-repo-maintainer workflow. Skip unless contributing to Remotion itself.

| File | What it does |
|---|---|
| skills/add-cli-option/SKILL.md | Adding a flag to the Remotion CLI |
| skills/add-expert/SKILL.md | Adding a knowledge entry to Remotion's "expert" system |
| skills/add-new-package/SKILL.md | Scaffolding a new package in the Remotion monorepo |
| skills/fix-dependabot/SKILL.md | Resolving dependabot PRs in the Remotion repo |
| skills/pr-name/SKILL.md | Naming a PR in the Remotion repo |
| skills/pr/SKILL.md | Opening a PR in the Remotion repo |
| skills/web-renderer-test/SKILL.md | Running Remotion's web renderer test suite |
| commands/add-bug.md | Adding a bug report |
| commands/checkout.md | Git checkout helper |
| commands/formatting.md | Code formatting workflow |
| commands/release.md | Releasing a new Remotion version |
| commands/update-chrome-binaries-test-region.md | Chrome binary regen workflow |
| commands/update-stars.md | Updating star count in docs |
| commands/upgrade-caniuse.md | Updating caniuse data |
| commands/upgrade-mediabunny.md | Upgrading the mediabunny dep |

## Provenance

Mirrored from https://github.com/remotion-dev/remotion/tree/main/.claude on 2026-05-04 (snapshot SHA c81be54c9e7f89204202afef2ff1f9e0b75b7ed7). See ../../upstream.json for full file-level SHAs and drift checking.
