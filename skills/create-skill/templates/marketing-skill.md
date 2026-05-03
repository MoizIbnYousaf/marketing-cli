---
name: <skill-name>
description: |
  <What this skill does — first sentence. When to use it — second sentence.
  Trigger phrases: '<trigger1>', '<trigger2>', '<trigger3>', '<trigger4>',
  '<trigger5>'. Be specific — this field is used for routing.>
allowed-tools: []
---

# /<skill-name> — <Short Description>

<2-3 sentence overview. What this skill does, why it matters, and what makes it different from existing approaches.>

For brand memory protocol, see /cmo [rules/brand-memory.md](../cmo/rules/brand-memory.md).

## On Activation

1. Read `brand/` directory: load `voice-profile.md`, `audience.md`, `positioning.md`, `competitors.md`, `learnings.md` if present.
2. Show what loaded:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓/✗
   ├── Audience        ✓/✗
   ├── Positioning     ✓/✗
   ├── Competitors     ✓/✗
   └── Learnings       ✓/✗
   ```
3. If files missing, note suggestions at the end (e.g., run /brand-voice).
4. Assess the user's request and determine if this is the right skill.

## Phase 0: <Gate Check Name>

Gate check. Verify this skill is the right one for the request:

| Signal | Action |
|--------|--------|
| <clear match signal> | Proceed. |
| <better handled by another skill> | Skip. Route to `/<other-skill>`. |
| <needs prerequisite work> | Suggest running `/<prereq-skill>` first. |

## Phase 1: <Research/Gather/Understand>

<Description of the first substantive phase. What inputs are needed, what research to do.>

## Phase 2: <Create/Build/Analyze>

<Description of the core execution phase. The main work of the skill.>

## Phase 3: <Review/Optimize/Deliver>

<Description of the quality check and delivery phase.>

---

## Worked Example

**User request:** '<example request>'

<Walk through how the skill would handle this specific request, showing key decisions and output format.>

---

## Chain Offers

After completing, present:

- `/<next-skill-1>` — <why this follows naturally>
- `/<next-skill-2>` — <alternative next step>

---

## Anti-Patterns

| Anti-pattern | Instead |
|-------------|---------|
| <common mistake 1> | <correct approach> |
| <common mistake 2> | <correct approach> |
| <common mistake 3> | <correct approach> |

## YAGNI Principles

- <What NOT to add — thing 1>
- <What NOT to add — thing 2>
- <What NOT to add — thing 3>
