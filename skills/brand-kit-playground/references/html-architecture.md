# HTML Architecture Reference

This document defines the structure of the generated `brand-playground.html` file. The agent uses this as a blueprint — not a copy-paste template. Every playground is bespoke to the brand.

## Document Structure

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Brand Name] Brand Playground</title>
  <!-- Google Fonts — constructed from brand tokens -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...">
  <style>
    /* 1. CSS Reset (minimal) */
    /* 2. CSS Custom Properties on :root (brand tokens) */
    /* 3. Dark/light theme variants via [data-theme] */
    /* 4. Layout grid */
    /* 5. Controls panel styles */
    /* 6. Preview canvas styles */
    /* 7. Social card renderer styles */
    /* 8. Multi-preview strip styles */
    /* 9. Token output styles */
    /* 10. Governance strip styles */
  </style>
</head>
<body>
  <!-- Brand bar -->
  <!-- Main grid: controls | preview -->
  <!-- Token output -->
  <script>
    /* 1. State object */
    /* 2. DOM references */
    /* 3. updateAll() — master render function */
    /* 4. renderBrandSystem() */
    /* 5. renderSocialCard() */
    /* 6. renderOGImage() */
    /* 7. renderMultiPreview() */
    /* 8. runGovernance() */
    /* 9. updateTokenOutput() */
    /* 10. Control event listeners */
    /* 11. Tab switching */
    /* 12. Preset loader */
    /* 13. Copy to clipboard */
    /* 14. Theme toggle */
    /* 15. Init */
  </script>
</body>
</html>
```

## CSS Custom Properties

All brand tokens are CSS custom properties on `:root`. Controls modify these directly via `document.documentElement.style.setProperty()`.

```css
:root {
  /* Brand colors */
  --brand-primary: #6366F1;
  --brand-primary-fg: #FFFFFF;
  --brand-secondary: #7C3AED;
  --brand-secondary-fg: #FFFFFF;
  --brand-accent: #F59E0B;
  --brand-accent-fg: #1C1917;
  --brand-bg: #FFFFFF;
  --brand-fg: #0F172A;
  --brand-muted: #F1F5F9;
  --brand-muted-fg: #64748B;

  /* Typography */
  --brand-font-display: 'Space Grotesk', system-ui, sans-serif;
  --brand-font-body: 'Inter', system-ui, sans-serif;
  --brand-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --brand-type-base: 16px;
  --brand-type-ratio: 1.25;

  /* Visual */
  --brand-radius: 8px;
  --brand-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);

  /* Playground chrome (derived from brand) */
  --chrome-bg: #0F172A;
  --chrome-surface: #1E293B;
  --chrome-border: #334155;
  --chrome-text: #E2E8F0;
  --chrome-text-muted: #94A3B8;
}
```

## State Management

Single state object. Every control writes to it. Every render reads from it.

```javascript
const state = {
  tab: 'brand',           // 'brand' | 'social' | 'og'
  theme: 'dark',          // 'dark' | 'light'

  tokens: {
    colors: {
      primary: '#6366F1',
      primaryForeground: '#FFFFFF',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      background: '#FFFFFF',
      foreground: '#0F172A',
    },
    typography: {
      display: { family: 'Space Grotesk', weights: [700, 800] },
      body: { family: 'Inter', weights: [400, 500, 600] },
      scale: { base: 16, ratio: 1.25 },
    },
    visual: {
      borderRadius: 8,
      shadowDepth: 'md',
      texture: 'none',
    },
  },

  social: {
    headline: 'We just shipped dark mode',
    subhead: 'Available for all users today',
    badge: 'NEW',
    layout: 'centered',    // 'centered' | 'split' | 'overlay' | 'minimal'
    background: 'gradient', // 'gradient' | 'solid' | 'dark' | 'light'
    showLogo: true,
  },

  og: {
    title: 'Building the future of developer tools',
    description: 'A deep dive into our latest release.',
    author: '',
    tag: 'Engineering',
    layout: 'editorial',   // 'editorial' | 'minimal' | 'bold'
  },
};

function updateAll() {
  updateCSSVars();
  renderActiveTab();
  runGovernance();
  updateTokenOutput();
}
```

## Social Card Renderer

The social card is rendered inside a fixed-aspect-ratio container using the `aspect-ratio` CSS property. The main preview shows the card at the selected platform size, scaled to fit the canvas via `transform: scale()`.

```javascript
function renderSocialCard() {
  const card = document.getElementById('social-card-preview');
  const { headline, subhead, badge, layout, background, showLogo } = state.social;
  const { colors, typography, visual } = state.tokens;

  // Set dimensions based on current target (default: Twitter 1200x675)
  card.style.width = '1200px';
  card.style.height = '675px';

  // Background styles
  switch (background) {
    case 'gradient':
      card.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
      card.style.color = colors.primaryForeground;
      break;
    case 'solid':
      card.style.background = colors.primary;
      card.style.color = colors.primaryForeground;
      break;
    case 'dark':
      card.style.background = '#0F172A';
      card.style.color = '#F8FAFC';
      break;
    case 'light':
      card.style.background = colors.background;
      card.style.color = colors.foreground;
      break;
  }

  // Layout variants
  // ... (agent writes layout-specific positioning)

  // Scale to fit canvas
  const canvas = document.getElementById('canvas');
  const scale = Math.min(
    canvas.clientWidth / 1200,
    canvas.clientHeight / 675
  );
  card.style.transform = `scale(${scale})`;
  card.style.transformOrigin = 'top left';
}
```

## Multi-Preview Strip

Below the main canvas, render the same social card at all target sizes simultaneously, scaled down to thumbnails:

```javascript
const SOCIAL_TARGETS = [
  { name: 'Twitter/X', w: 1200, h: 675 },
  { name: 'LinkedIn', w: 1200, h: 627 },
  { name: 'Instagram', w: 1080, h: 1080 },
  { name: 'Story', w: 1080, h: 1920 },
];

function renderMultiPreview() {
  const strip = document.getElementById('multi-preview');
  strip.innerHTML = '';
  for (const target of SOCIAL_TARGETS) {
    const thumb = createSocialCardClone(target.w, target.h);
    const scale = 80 / target.h; // 80px tall thumbnails
    thumb.style.transform = `scale(${scale})`;
    thumb.style.transformOrigin = 'top left';
    // Wrap in container sized to scaled dimensions
    const wrapper = document.createElement('div');
    wrapper.style.width = `${target.w * scale}px`;
    wrapper.style.height = '80px';
    wrapper.style.overflow = 'hidden';
    wrapper.appendChild(thumb);
    strip.appendChild(wrapper);
  }
}
```

## Governance Implementation

Inline WCAG contrast ratio check — no library:

```javascript
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  const [R, G, B] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function runGovernance() {
  const checks = [];
  const { colors } = state.tokens;

  // Primary on background
  const ratio = contrastRatio(colors.primary, colors.background);
  checks.push({
    label: 'Primary/BG',
    ratio: ratio.toFixed(1),
    pass: ratio >= 4.5,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail',
  });

  // Foreground on background
  const fgRatio = contrastRatio(colors.foreground, colors.background);
  checks.push({
    label: 'Text/BG',
    ratio: fgRatio.toFixed(1),
    pass: fgRatio >= 4.5,
    level: fgRatio >= 7 ? 'AAA' : fgRatio >= 4.5 ? 'AA' : 'Fail',
  });

  // Render governance strip
  const strip = document.getElementById('governance');
  strip.innerHTML = checks.map(c =>
    `<span class="gov-check ${c.pass ? 'pass' : 'fail'}">
      ${c.pass ? '\u2713' : '\u26a0'} ${c.label}: ${c.level} (${c.ratio}:1)
    </span>`
  ).join('');
}
```

## Theme Toggle

The playground chrome defaults to dark. Toggle switches `data-theme` on `<html>`:

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  state.theme = next;
}
```

Dark theme uses the brand's dark palette for chrome. Light theme uses the brand's light palette. The preview canvas always shows the asset as it would appear — independent of the playground theme.

## Copy to Clipboard

```javascript
async function copyTokens() {
  const json = JSON.stringify(state.tokens, null, 2);
  await navigator.clipboard.writeText(json);
  const btn = document.getElementById('copy-btn');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy Tokens', 1500);
}
```

## Responsive Behavior

The playground is designed for desktop screens (1200px+). On smaller screens:
- Controls panel collapses to a bottom drawer
- Preview takes full width
- Multi-preview strip scrolls horizontally

Do not over-engineer responsiveness. This is a local dev tool opened on the developer's workstation.
