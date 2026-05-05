---
name: higgsfield-soul-id
version: 0.3.0
description: |
  Use when the user wants to train a reusable face-faithful Soul Character identity
  on Higgsfield. One-time training returns a reference_id passed to Soul models in
  higgsfield-generate via `--soul-id`.
  Use this skill whenever: "train soul character", "create my Soul", "train my face",
  "make my digital twin", "build me an avatar", "create a character of me",
  "set up identity for video", "I want my face in generated images",
  "face-faithful character", "reusable character", "brand character training",
  "build a character from photos", "soul training", "soul-id create".
  After training, logs the soul_reference_id to `brand/assets.md`.
  NOT for: one-shot face swaps (use higgsfield-generate with --image),
  fictional/non-photo avatars (use higgsfield-generate with a prompt).
  Requires Higgsfield CLI + Basic plan or higher.
argument-hint: "[name] [photo paths...]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Skill
author: Higgsfield AI (ported by moiz)
license: MIT
user-invocable: true
metadata:
  openclaw:
    emoji: 🪪
---

# /higgsfield-soul-id — Train a Reusable Face Identity

Train a face-faithful Soul Character model. Reusable across all Soul-powered image and video generations in `higgsfield-generate`.

## When to use

- User wants their face (or a specific person's face) in Higgsfield-generated images/videos
- "train my soul", "create soul character", "make a digital twin", "brand character training"
- Setting up a reusable identity before a campaign requiring consistent character appearance
- The user has 5–20 photos of a face and wants them persisted as a model reference

**Route elsewhere if:**
- User just wants a one-shot image with a face reference → `higgsfield-generate` with `--image`
- User wants a fictional/non-photo avatar from a text description → `higgsfield-generate` with a prompt

## On Activation

1. Read `brand/visual-style.md` if present — check for brand character or persona notes.
2. Ask for the name to assign to the Soul (one word, used for later reference).
3. Ask for photos (5–20 face photos, local paths or upload UUIDs).
4. Confirm plan tier: Soul training requires Basic+ plan. Check `higgsfield account status`.

## Optional dependency — Higgsfield account

This skill requires the `@higgsfield/cli` binary and a Higgsfield account.

**Without the CLI installed**, return a clear actionable error:
```
higgsfield CLI not found. Install with:
  curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh
Then authenticate:
  higgsfield auth login
```

**Without an authed Higgsfield account**, the CLI itself surfaces the auth prompt — no special handling needed in the skill.

**Fallback for image generation only:** if the user just needs a one-off image and doesn't have a Higgsfield account, route them to `image-gen` (Gemini, model `gemini-3.1-flash-image-preview`, free tier). Soul Character training has no fallback — it requires Higgsfield.

## Step 0 — Bootstrap

Before any other command:

1. If `higgsfield` is not on `$PATH`, install it:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh
   ```
2. If `higgsfield account status` fails with `Session expired` / `Not authenticated`, ask the user to run `higgsfield auth login` (interactive) and wait for confirmation.
3. Soul training requires a paid plan (Basic+). If `higgsfield account status` shows free plan, tell the user before submitting.

## UX Rules

1. Be concise. No raw IDs in chat. Just say "Soul ready" with a name reference.
2. Detect language and respond in it. CLI flags stay English.
3. Ask for the smallest set of inputs: name + photos. Pick a sensible model variant.
4. Polling is silent — training takes minutes. Don't repeat status updates.

## Workflow

1. **Get name.** One word, used for later reference. Ask if missing.
2. **Get photos.** 5–20 face photos, varied angles and lighting. Local paths or already-uploaded IDs both work — `--image` accepts either.
3. **Pick variant.**
   - `--soul-2` — for image generation (default)
   - `--soul-cinematic` — for cinematic / video work
   Choose based on user's stated downstream use. Default to `--soul-2`.
4. **Submit.**
   ```bash
   higgsfield soul-id create --name "<name>" --soul-2 --image ./photo1.png --image ./photo2.png ...
   higgsfield soul-id create --name "<name>" --soul-2 --image <upload_id> --image <upload_id> ...
   ```
   CLI auto-uploads paths. Captures returned reference id.
5. **Wait.** `higgsfield soul-id wait <id>`. Silent. Default timeout 30m.
6. **Deliver.** "Soul `<name>` ready. Use in generate with `--soul-id <id>`."
7. **Log to brand assets.** Append the soul reference_id to `brand/assets.md` so it's discoverable in future sessions without re-asking.

## Use the Soul

Once trained, pass to `higgsfield-generate`:

```bash
higgsfield generate create text2image_soul_v2 --prompt "..." --soul-id <ref_id> --wait
higgsfield generate create soul_cinema_studio --prompt "..." --soul-id <ref_id> --wait
```

## Listing existing Souls

```bash
higgsfield soul-id list                   # all references
higgsfield soul-id get <id>               # one by id
```

## Errors

- `Minimum Basic plan required` — user is on free plan; tell them.
- `Training failed` — check photos quality (5+ unique faces, well-lit).
- `Session expired` → `higgsfield auth login`.

## Anti-Patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Submitting fewer than 5 photos | Training with too few images produces a weak identity — the soul drifts from the source face in generation. | Ask for at least 5 photos, ideally 10–15, varied angles and lighting conditions. See `references/photo-guide.md`. |
| Using the wrong variant for the job | `--soul-2` for a cinematic video generates identity but the model wasn't optimized for motion fidelity. | Pick `--soul-2` for stills, `--soul-cinematic` for video/cinematic work. |
| Not logging the reference_id | The user will need to re-ask for their soul IDs in every future session. | Always append the soul reference_id to `brand/assets.md` on success. |
| Trying to train on free plan | Command fails mid-run with a plan error. | Check `higgsfield account status` before submitting. Surface the plan requirement upfront. |

## Reference docs

- `references/photo-guide.md` — what photos work best
- `references/troubleshooting.md` — common training failures

## Attribution

Ported from [higgsfield-ai/skills](https://github.com/higgsfield-ai/skills) — MIT License, Copyright (c) 2026 Higgsfield AI. Adapted for mktg's drop-in contract on 2026-05-05.

Upstream version: 0.3.0
Upstream commit: 1dcfe2687c3a9092232bac55c2b6b9ae3fc717d7

Drift detection: if the upstream skill changes, re-run `mktg-steal https://github.com/higgsfield-ai/skills` to evaluate the diff.
