---
name: cmo:work
description: "Execute a marketing plan efficiently — generate content, build assets, and distribute across channels. Use when the user has a marketing plan and wants to start producing. Triggers on 'execute the plan', 'start the campaign', 'build the content', 'run the marketing', or any request to produce marketing deliverables from a plan."
argument-hint: "[plan file path, campaign description, or content brief]"
metadata:
  version: 1.0.0
category: workflow
tier: orchestration
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
  - marketing/plans/
writes:
  - marketing/content/
  - marketing/social/
  - marketing/email/
triggers:
  - execute plan
  - start campaign
  - build content
  - run marketing
  - produce assets
---

# /cmo:work — Marketing Plan Execution

Execute a marketing plan by invoking the right skills in the right order, producing all deliverables, and tracking progress.

## Introduction

This command takes a marketing plan (from `/cmo:plan` or a brief) and executes it systematically. The focus is on **shipping complete marketing** — producing all content, building all assets, and setting up distribution.

This is step 2 of the marketing workflow cycle: **plan** -> **work** -> **review** -> **compound**.

## Input Document

<input_document> #$ARGUMENTS </input_document>

## Execution Workflow

### Phase 1: Quick Start

1. **Read Plan and Clarify**

   - Read the work document completely
   - Check `mktg status --json` for current brand state
   - Load brand context: `brand/voice-profile.md`, `brand/positioning.md`, `brand/audience.md`
   - If anything is unclear or ambiguous, ask clarifying questions now
   - Get user approval to proceed
   - **Do not skip this** — better to ask now than produce off-brand content

2. **Check Prerequisites**

   ```bash
   mktg doctor
   ```

   Verify:
   - Brand files exist that the plan references
   - Required skills are installed (`mktg list --json`)
   - Any external tools needed are available (playwright-cli, gws, etc.)

   If brand files are missing:
   - For voice: suggest running `brand-voice` first
   - For audience: suggest running `audience-research` first
   - For positioning: suggest running `positioning-angles` first
   - Or proceed with defaults if the user wants speed

3. **Build Task List**

   Parse the plan's execution phases and content table into actionable tasks:
   - Break each content asset into: research -> draft -> refine -> distribute
   - Include dependencies (e.g., landing page copy before email sequence)
   - Prioritize based on the plan's phase structure
   - Include quality check tasks between phases

### Phase 2: Execute

1. **Skill Execution Loop**

   For each content asset or tactic in the plan:

   ```
   while (tasks remain):
     - Mark task as in_progress
     - Load relevant brand context for this skill
     - Invoke the mapped mktg skill (see Skill Routing below)
     - Write output to the correct directory
     - Mark task as completed
     - Check off the corresponding item in the plan file ([ ] -> [x])
   ```

   **IMPORTANT**: Always update the plan document by checking off completed items. Use the Edit tool to change `- [ ]` to `- [x]` for each deliverable you finish.

2. **Skill Routing**

   Map plan tactics to skills:

   | Plan Says | Invoke | Output Directory |
   |-----------|--------|-----------------|
   | Landing page / sales copy | `direct-response-copy` | `marketing/content/` |
   | SEO article / blog post | `seo-content` | `marketing/content/` |
   | Email sequence | `email-sequences` | `marketing/email/` |
   | Social posts | `content-atomizer` | `marketing/social/` |
   | Lead magnet | `lead-magnet` | `marketing/content/` |
   | Newsletter | `newsletter` | `marketing/email/` |
   | Comparison page | `competitor-alternatives` | `marketing/content/` |
   | Visual assets | `creative` | `marketing/creative/` |
   | SEO audit | `seo-audit` | `marketing/audits/` |
   | CRO audit | `page-cro` | `marketing/audits/` |
   | Pricing page | `pricing-strategy` | `marketing/content/` |
   | Referral program | `referral-program` | `marketing/growth/` |
   | Free tool | `free-tool-strategy` | `marketing/growth/` |

3. **Content Production Rules**

   - Every piece of content MUST use brand voice from `brand/voice-profile.md`
   - Every piece MUST target the audience segment from the plan
   - Apply `marketing-psychology` principles where the plan specifies
   - Use `--dry-run` before any external publishing actions
   - Write all outputs with YAML front-matter for structured handoffs

4. **Progressive Output**

   After each major deliverable:
   - Announce what was produced and where it was saved
   - Show a brief preview (first few lines or key headline)
   - Continue to next task without waiting for approval (unless the plan specifies checkpoints)

5. **Distribution Setup**

   When the plan includes distribution:
   - Generate platform-specific content via `content-atomizer`
   - Prepare email sends (draft only — never send without `--dry-run` confirmation)
   - Queue social posts (draft to files, not posted)
   - Flag any actions that require manual steps (e.g., paid ads, partnerships)

### Phase 3: Quality Check

1. **Content Quality Scan**

   Review all produced content for:
   - [ ] Brand voice consistency (matches `brand/voice-profile.md`)
   - [ ] Audience alignment (speaks to the right segment)
   - [ ] Positioning accuracy (reflects `brand/positioning.md`)
   - [ ] No placeholder text or TODO markers left
   - [ ] YAML front-matter present on all files
   - [ ] Cross-links between related content pieces

2. **Completeness Check**

   - [ ] All plan items checked off (`- [x]`)
   - [ ] All content files written to correct directories
   - [ ] Distribution content generated for each channel in the plan
   - [ ] No orphaned content (everything maps to a distribution channel)

3. **CLI Validation**

   ```bash
   mktg status --json
   ```

   Verify content counts match what the plan specified.

### Phase 4: Ship It

1. **Commit Marketing Assets**

   ```bash
   git add marketing/
   git status
   git commit -m "feat(marketing): [campaign name] — [what was produced]"
   ```

2. **Summary Report**

   Present to the user:

   ```markdown
   ## Campaign Execution Complete

   **Plan:** marketing/plans/[filename]
   **Assets produced:** [count]

   ### Deliverables
   | Asset | Location | Status |
   |-------|----------|--------|
   | [name] | [path] | Done |

   ### Distribution Ready
   | Channel | Content | Status |
   |---------|---------|--------|
   | [channel] | [content] | Draft ready |

   ### Next Steps
   1. Run `/cmo:review` to quality-check all output
   2. Review drafts before publishing
   3. Use `mktg post --dry-run` to preview distribution
   ```

3. **Offer Next Steps**

   Use the **AskUserQuestion tool**:

   **Question:** "Marketing assets complete. What would you like to do next?"

   **Options:**
   1. **Run `/cmo:review`** — Quality review of all produced content
   2. **Preview distribution** — `mktg post --dry-run` to see what would be published
   3. **Adjust content** — Revise specific deliverables
   4. **Push to remote** — `git push` to share with team

## Key Principles

### Execute, Don't Deliberate
- The plan already made the decisions. Execute them.
- If something is unclear, check the plan first, then ask.
- Speed matters — marketing has a shelf life.

### Brand Voice Is Non-Negotiable
- Every word must sound like the brand.
- Load `brand/voice-profile.md` before every content skill invocation.
- If voice feels off, stop and recalibrate before producing more.

### Skills Are Your Toolkit
- Each content type maps to a specific mktg skill.
- Skills read brand context and write structured output.
- You orchestrate the skills — skills don't call each other.

### Track Progress in the Plan
- Check off items as you complete them.
- The plan is the single source of truth for campaign progress.
- Anyone should be able to open the plan and see what's done vs. remaining.

### Distribution > Creation
- Apply the 30/70 rule: 30% creation, 70% distribution.
- Every content piece should appear on 3+ channels.
- Use `content-atomizer` aggressively — one asset becomes many.

## Common Pitfalls to Avoid

- **Skipping brand context** — Content without brand voice is generic content
- **Producing without a plan** — Use `/cmo:plan` first to avoid wasted work
- **Forgetting distribution** — Great content nobody sees is wasted content
- **Publishing without review** — Always run `/cmo:review` before going live
- **Over-creating** — Produce what the plan says, not more

## Related Commands

- `/cmo:plan` — Create the plan (previous step)
- `/cmo:review` — Review output quality (next step)
- `/cmo:compound` — Document campaign learnings (after review)
- `/cmo` — Full CMO orchestration
