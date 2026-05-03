# Patterns to Steal for v3

## From a polished review workspace

### Global Color Transition (No Layout Jank)
```css
* {
  transition-property: color, background-color, border-color, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```
Excludes `transform` and `opacity` to avoid scroll compositing issues.

### oklch Glow Effects
```css
.glow-primary {
  box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.15),
              0 0 40px oklch(from var(--primary) l c h / 0.05);
}
```
Derives opacity variants from the same brand hue automatically.

### Subtle Grid Background
```css
.bg-grid {
  background-image:
    linear-gradient(to right, oklch(0.32 0.02 260 / 0.5) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.32 0.02 260 / 0.5) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### Double-Pulse Flash (Better Than Fade)
```css
@keyframes state-flash {
  0% { background: transparent; }
  10% { background: var(--muted); }
  30% { background: transparent; }
  45% { background: var(--muted); }
  100% { background: transparent; }
}
```

### Custom Scrollbar
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
```

### Color Swatch Grid Preset Picker
5 color dots (w-3 h-3 rounded-full) per preset row. Selected state: border-primary + bg-primary/5.

### Resizable Panel (~80 lines)
- `pointerdown/pointermove/pointerup` (unified mouse+touch)
- 3px drag threshold
- `getBoundingClientRect()` on start (works regardless of CSS transforms)
- Min/max clamp + localStorage persistence

## From App Store Screenshots Skill

### Resolution-Independent Typography
```
headline: W * 0.09-0.10, weight 700, lineHeight 0.92-1.0
category: W * 0.028, weight 600
```
All sizes derive from canvas width — adapts to any resolution.

### CSS-Only Device Frame
```css
background: linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%);
box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.6);
border-radius: 18px;
```
Front camera dot, bezel highlight, screen area with overflow hidden.

### Floating Decorative Elements
- Slight 2-5deg rotation
- Drop shadows
- Position at card edges
- Never blocking main content

### Preview vs Export Architecture
- Preview: `transform: scale()` via ResizeObserver
- Export: offscreen at true resolution (`position: absolute; left: -9999px`)
- Double-call html-to-image trick (first warms fonts, second produces clean output)
