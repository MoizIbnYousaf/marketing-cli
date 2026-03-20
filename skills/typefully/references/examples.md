# Typefully CLI Examples

Detailed examples for every operation. See the Commands Reference in SKILL.md for the full command list.

## Social Set Configuration

```bash
# Check current config
./scripts/typefully.js config:show

# Set default (interactive - lists available social sets)
./scripts/typefully.js config:set-default

# Set default (non-interactive)
./scripts/typefully.js config:set-default 123 --location global
```

## Creating Drafts

```bash
# Simple tweet (uses default social set)
./scripts/typefully.js drafts:create --text "Hello, world!"

# With explicit social_set_id
./scripts/typefully.js drafts:create 123 --text "Hello, world!"

# Cross-platform (specific platforms)
./scripts/typefully.js drafts:create --platform x,linkedin,threads --text "Big announcement!"

# All connected platforms
./scripts/typefully.js drafts:create --all --text "Posting everywhere!"

# Schedule for next slot
./scripts/typefully.js drafts:create --text "Scheduled post" --schedule next-free-slot

# With tags
./scripts/typefully.js drafts:create --text "Marketing post" --tags marketing,product

# Reply to a tweet
./scripts/typefully.js drafts:create --platform x --text "Great thread!" --reply-to "https://x.com/user/status/123456"

# Post to an X community
./scripts/typefully.js drafts:create --platform x --text "Community update" --community 1493446837214187523

# With share URL
./scripts/typefully.js drafts:create --text "Check this out" --share

# With scratchpad notes
./scripts/typefully.js drafts:create --text "Launching next week!" --scratchpad "Draft for product launch. Coordinate with marketing team before publishing."
```

## Listing Drafts

```bash
# Scheduled posts sorted by date
./scripts/typefully.js drafts:list --status scheduled --sort scheduled_date
```

## Media Upload

```bash
# Single upload (handles polling automatically)
./scripts/typefully.js media:upload ./image.jpg
# Returns: {"media_id": "abc-123-def", "status": "ready", "message": "Media uploaded and ready to use"}

# Create post with media
./scripts/typefully.js drafts:create --text "Check out this image!" --media abc-123-def

# Multiple media files
./scripts/typefully.js media:upload ./photo1.jpg  # Returns media_id: id1
./scripts/typefully.js media:upload ./photo2.jpg  # Returns media_id: id2
./scripts/typefully.js drafts:create --text "Photo dump!" --media id1,id2

# Add media to existing draft
./scripts/typefully.js media:upload ./new-image.jpg  # Returns media_id: xyz
./scripts/typefully.js drafts:update 456 --text "Updated post with image" --media xyz --use-default
```

## Setup

```bash
# Interactive
./scripts/typefully.js setup

# Non-interactive (auto-selects default if only one social set)
./scripts/typefully.js setup --key typ_xxx --location global

# With explicit default social set
./scripts/typefully.js setup --key typ_xxx --location global --default-social-set 123

# Skip default social set selection
./scripts/typefully.js setup --key typ_xxx --no-default
```
