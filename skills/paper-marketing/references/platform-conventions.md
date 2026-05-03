# Platform-Specific Design Conventions

## TikTok (1080×1920, 9:16)

| Convention | Why | Implementation |
|-----------|-----|----------------|
| Hook in first 1-3 seconds | Users scroll fast | Slide 1 must be the most visually striking |
| Text readable at phone size | Small screens, fast scanning | Minimum 48px body, 120px+ hero text |
| Safe zones | TikTok UI overlaps edges | Content in center 70% (avoid top 150px, bottom 300px) |
| High contrast | Bright ambient viewing | Navy/cream contrast, avoid subtle grays |
| Pattern interrupts every 2-3 slides | Maintain attention | Alternate backgrounds, vary slide types |
| Vertical text rhythm | Natural scroll direction | Stack elements vertically, generous spacing |

## Instagram Carousel (1080×1350, 4:5)

| Convention | Why | Implementation |
|-----------|-----|----------------|
| First slide = hook | Visible in feed, must stop scroll | Bold headline, clear value prop |
| Swipe cue on slide 1 | Users need to know it's a carousel | Arrow, "swipe →", or visual continuation |
| Consistent footer across slides | Brand recognition | Logo/handle in same position every slide |
| Last slide = CTA | Natural endpoint | "Save this", "Follow for more", URL |
| 5-9 slides optimal | Engagement sweet spot | Under 5 feels thin, over 9 loses attention |
| Text-heavy is fine | People read carousels | Unlike video, carousels reward dense text |

## Instagram Story (1080×1920, 9:16)

| Convention | Why | Implementation |
|-----------|-----|----------------|
| Top 10% reserved | Profile pic + name overlay | Keep empty |
| Bottom 20% reserved | Reply bar, swipe-up area | Keep empty or put CTA here |
| Large text only | Viewed briefly, often with sound off | 64px+ minimum |
| One idea per story | 15-second attention span | Single message per frame |
| Tap-through pacing | Users tap fast | Key info visible immediately, no reveal animations |

## YouTube Shorts (1080×1920, 9:16)

| Convention | Why | Implementation |
|-----------|-----|----------------|
| First 2 seconds critical | Autoplay in feed | Hook must land instantly |
| Under 60 seconds | Platform preference | Keep tight |
| Text captions | Many watch without sound | Burn in subtitles or use large text |
| Subscribe CTA | Platform-specific action | "Subscribe" not "Follow" |
| Higher production value expected | YouTube audience expectation | v2 Full tier recommended |
