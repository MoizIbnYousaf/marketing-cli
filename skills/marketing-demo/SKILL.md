---
name: marketing-demo
description: Record product demos and walkthroughs for marketing content. Use when the user wants to create a product demo video, walkthrough GIF, feature showcase, onboarding video, social media product clip, or any visual marketing asset showing the product in action. Adapted from CE's feature-video pattern for marketing use cases.
category: content
tier: nice-to-have
reads:
  - brand/voice.md
  - brand/positioning.md
  - brand/audience.md
writes:
  - marketing/demos/
triggers:
  - product demo
  - demo video
  - walkthrough video
  - feature showcase
  - record demo
  - marketing video
  - product walkthrough
  - screen recording
  - GIF demo
  - onboarding video
  - product tour
---

# Marketing Demo Recording

<command_purpose>Record polished product demos and walkthroughs for use in marketing content — landing pages, social media, email campaigns, and sales decks.</command_purpose>

## Introduction

<role>Marketing Content Producer specializing in product demo videos and walkthroughs</role>

This skill creates marketing-ready product demos by recording browser interactions:
- Landing page hero demos (auto-playing GIF/video showing the product)
- Social media product clips (short, punchy feature highlights)
- Email campaign visuals (GIF walkthroughs embedded in emails)
- Sales deck assets (step-by-step feature demonstrations)
- Onboarding content (guided product tours for new users)
- Documentation visuals (how-to GIFs for help articles)

## Prerequisites

<requirements>
- Product accessible via URL (local dev server or live URL)
- agent-browser CLI installed
- `ffmpeg` installed (for video/GIF conversion)
- `rclone` configured (optional, for cloud upload)
- `brand/` directory (optional, informs demo style and messaging)
</requirements>

## Setup

**Check installation:**
```bash
command -v agent-browser >/dev/null 2>&1 && echo "agent-browser: OK" || echo "agent-browser: NOT INSTALLED"
command -v ffmpeg >/dev/null 2>&1 && echo "ffmpeg: OK" || echo "ffmpeg: NOT INSTALLED"
```

**Install if needed:**
```bash
bun install -g agent-browser && agent-browser install
brew install ffmpeg  # macOS
```

## On Activation

1. Read `brand/voice.md` if it exists for tone and style guidance
2. Read `brand/positioning.md` if it exists for value proposition framing
3. Read `brand/audience.md` if it exists for audience-appropriate demo complexity
4. Determine demo type and target platform
5. Plan the recording flow

## Main Tasks

### 1. Determine Demo Type

<demo_type>

Ask the user what kind of demo they need:

| Type | Duration | Format | Use Case |
|------|----------|--------|----------|
| **Hero demo** | 5-15s | GIF/MP4 | Landing page auto-play, above the fold |
| **Feature highlight** | 10-30s | GIF/MP4 | Show one specific feature in action |
| **Full walkthrough** | 30-90s | MP4 | Complete user flow for sales or onboarding |
| **Social clip** | 5-15s | MP4/GIF | Twitter, LinkedIn, Instagram product posts |
| **Email GIF** | 3-8s | GIF (<1MB) | Embedded in email campaigns |
| **How-to** | 15-60s | GIF/MP4 | Help docs, knowledge base articles |

Use AskUserQuestion:
```markdown
**What type of demo do you need?**

1. **Hero demo** — Landing page auto-play (5-15s GIF/MP4)
2. **Feature highlight** — Single feature showcase (10-30s)
3. **Full walkthrough** — Complete user flow (30-90s MP4)
4. **Social clip** — Short product clip for social media (5-15s)
5. **Email GIF** — Lightweight GIF for email campaigns (<1MB)
6. **How-to** — Step-by-step tutorial visual (15-60s)
```

</demo_type>

### 2. Plan the Shot List

<plan_shots>

Before recording, create a detailed shot list based on the demo type.

**For a Hero Demo:**
1. Opening state — clean, appealing starting view (2-3s)
2. Key action — the "wow moment" of the product (3-5s)
3. Result — satisfying outcome/success state (2-3s)

**For a Feature Highlight:**
1. Context — where the feature lives in the product (2-3s)
2. Before state — what it looks like before the action (2-3s)
3. Action — user performing the key interaction (5-10s)
4. After state — the result, showing value delivered (3-5s)

**For a Full Walkthrough:**
1. Starting point — homepage or dashboard (3-5s)
2. Navigation — getting to the feature (3-5s)
3. Setup — any configuration needed (5-10s)
4. Core action — the main feature demonstration (10-20s)
5. Result — success state and value delivered (5-10s)
6. Next steps — what happens after (3-5s)

Present the plan to user for confirmation:
```markdown
**Proposed Demo Flow**

**Type:** [demo type]
**Target duration:** ~[X] seconds
**Platform:** [where it will be used]

**Shot list:**
1. [Shot description] (~Xs)
2. [Shot description] (~Xs)
3. [Shot description] (~Xs)

**Starting URL:** [URL]

Does this look right?
1. Yes, start recording
2. Modify the flow
3. Add/remove steps
```

**If brand/positioning.md exists:** Frame the demo around the documented value proposition. Lead with the benefit the user cares about, not the feature.

</plan_shots>

### 3. Setup Recording Environment

<setup_recording>

**Create output directories:**
```bash
mkdir -p tmp/screenshots tmp/demos marketing/demos
```

**Configure browser viewport based on platform:**

| Platform | Viewport | Notes |
|----------|----------|-------|
| Landing page hero | 1280x800 | Standard desktop |
| Social (Twitter/LinkedIn) | 1280x720 | 16:9 ratio |
| Social (Instagram) | 1080x1080 | Square crop |
| Email | 600x400 | Email-safe width |
| Docs/Help | 1024x768 | Readable at smaller sizes |

**Prepare the product state:**
- Ensure demo data is loaded (realistic names, content, not "test123")
- Clear any error states or notifications
- Set the UI to a clean starting state

</setup_recording>

### 4. Record the Demo

<record_demo>

Execute the planned shot list, capturing screenshots at each step.

**Step-by-step recording pattern:**

```bash
# Frame 1: Opening state
agent-browser open "[URL]"
agent-browser wait 2000
agent-browser screenshot tmp/screenshots/01-opening.png

# Frame 2: Navigation/setup
agent-browser snapshot -i  # Get interactive element refs
agent-browser click @[nav-ref]
agent-browser wait 1500
agent-browser screenshot tmp/screenshots/02-navigate.png

# Frame 3: Key action
agent-browser snapshot -i
agent-browser click @[action-ref]
agent-browser wait 1000
agent-browser screenshot tmp/screenshots/03-action.png

# Frame 4: Typing/input (if applicable)
agent-browser fill @[input-ref] "[demo text]"
agent-browser wait 500
agent-browser screenshot tmp/screenshots/04-input.png

# Frame 5: Result/success state
agent-browser wait 2000
agent-browser screenshot tmp/screenshots/05-result.png
```

**Recording tips:**
- Wait after each action for animations to complete
- Capture intermediate states for smoother playback
- Use realistic demo data (real names, plausible content)
- Add extra frames before/after key moments for pacing

**For headed mode (user wants to watch):**
```bash
agent-browser --headed open "[URL]"
agent-browser --headed snapshot -i
agent-browser --headed click @[ref]
```

</record_demo>

### 5. Convert to Video/GIF

<convert_output>

Convert captured screenshots into the appropriate format.

**High-quality MP4 (landing pages, social, sales decks):**
```bash
ffmpeg -y -framerate 0.5 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:-2" \
  tmp/demos/demo.mp4
```

**Preview GIF (landing pages, GitHub, docs):**
```bash
ffmpeg -y -framerate 0.5 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -vf "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" \
  -loop 0 tmp/demos/demo.gif
```

**Email-optimized GIF (<1MB):**
```bash
ffmpeg -y -framerate 0.3 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -vf "scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse" \
  -loop 0 tmp/demos/demo-email.gif
```

**Social media square crop (Instagram):**
```bash
ffmpeg -y -framerate 0.5 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -c:v libx264 -pix_fmt yuv420p \
  -vf "scale=1080:-2,crop=1080:1080:(in_w-1080)/2:(in_h-1080)/2" \
  tmp/demos/demo-square.mp4
```

**Adjust framerate based on demo type:**
- Hero demo: `-framerate 0.5` (2s per frame, smooth auto-play)
- Feature highlight: `-framerate 0.75` (1.3s per frame)
- Full walkthrough: `-framerate 1` (1s per frame, faster pacing)
- Email GIF: `-framerate 0.3` (3s per frame, fewer frames = smaller file)

</convert_output>

### 6. Upload and Distribute

<upload>

**Option A: Upload with rclone (if configured):**
```bash
rclone listremotes  # Check available remotes

PUBLIC_BASE_URL="https://<your-public-domain>.r2.dev"

rclone copy tmp/demos/ r2:<bucket>/marketing/demos/[project-name]/ --s3-no-check-bucket --progress

# Verify URLs
DEMO_URL="$PUBLIC_BASE_URL/marketing/demos/[project-name]/demo.mp4"
curl -I "$DEMO_URL" | head -n 1
```

**Option B: Save locally for manual upload:**
```bash
cp tmp/demos/* marketing/demos/
echo "Demos saved to marketing/demos/"
ls -la marketing/demos/
```

**Option C: Add to PR (for internal demos):**
```bash
PR_NUM=$(gh pr view --json number -q '.number' 2>/dev/null)
if [ -n "$PR_NUM" ]; then
  gh pr edit "$PR_NUM" --body "$(gh pr view $PR_NUM --json body -q '.body')

## Demo

[![Product Demo]($PUBLIC_BASE_URL/marketing/demos/[project-name]/demo.gif)]($PUBLIC_BASE_URL/marketing/demos/[project-name]/demo.mp4)

*Click to view full demo*"
fi
```

</upload>

### 7. Cleanup and Summary

<summary>

**Clean up temporary files:**
```bash
rm -rf tmp/screenshots
echo "Screenshots cleaned. Demos retained at: tmp/demos/ and marketing/demos/"
```

**Present completion summary:**

```markdown
## Marketing Demo Complete

**Product:** [project name]
**Type:** [demo type]
**Duration:** ~[X] seconds
**Format:** [MP4/GIF/both]

### Assets Created
| Asset | Size | Use Case |
|-------|------|----------|
| `demo.mp4` | [size] | Landing page, social media |
| `demo.gif` | [size] | Email, GitHub, docs |
| `demo-square.mp4` | [size] | Instagram |

### Shot List Executed
1. [Shot 1] - [description]
2. [Shot 2] - [description]
3. [Shot 3] - [description]

### Uploaded To
- [URL or local path]

### Suggested Usage
- **Landing page:** Embed MP4 as hero background or inline demo
- **Email campaign:** Use email-optimized GIF (<1MB)
- **Social post:** Pair with [suggested copy based on brand voice]
- **Sales deck:** Include MP4 in product slide

### Next Steps
- [ ] Review demo for accuracy and polish
- [ ] Add to landing page hero section
- [ ] Create social post with demo clip
- [ ] Include in next email campaign
```

</summary>

## Quick Usage Examples

```bash
# Record a hero demo for a landing page
/marketing-demo hero http://localhost:3000

# Record a feature highlight
/marketing-demo feature https://myapp.com/dashboard

# Record a social clip
/marketing-demo social https://myapp.com

# Record a full walkthrough for sales
/marketing-demo walkthrough https://myapp.com

# Record an email-safe GIF
/marketing-demo email https://myapp.com/feature
```

## Tips

- **Keep it short**: Shorter demos convert better. Hero demos should be 5-15 seconds max.
- **Lead with the outcome**: Show the result first, then the steps (especially for social clips).
- **Use realistic data**: Demo data should look real — real names, plausible content, no "test123".
- **Match your audience**: Technical audience = show the details. Business audience = show the outcome.
- **One feature per demo**: Don't try to show everything. Multiple short demos > one long demo.
- **Loop-friendly**: For GIFs, make the last frame transition smoothly back to the first.
- **Mobile-first framing**: If the demo will be viewed on mobile, use larger UI elements and text.
