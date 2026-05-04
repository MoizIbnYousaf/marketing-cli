# CRT Composition — Drop-in Remotion Template

A self-contained Remotion composition that renders a CRT-styled terminal scene
through a WebGL2 fragment shader. The terminal types `npx create-video@…`,
prints mock output, then a "Claude Code" panel appears below and types in
"Add a CRT effect using HTML-in-canvas". The whole frame is post-processed
with barrel distortion, scanlines, vignette, and chromatic aberration.

- **Duration**: 600 frames @ 60 fps (10 seconds)
- **Resolution**: 1920 × 1080 (16:9)
- **Composition id**: `CRTComposition`
- **Renderer**: `<HtmlInCanvas>` + WebGL2 fragment shader

## How to use

These three files are a drop-in replacement for the `src/` of a freshly
scaffolded Remotion project. They do not depend on any code outside of
`remotion` and `react`.

```bash
# 1. Scaffold a fresh Remotion project (blank, no Tailwind).
npx create-video@latest --yes --blank --no-tailwind crt-demo
cd crt-demo

# 2. Copy the three TSX/TS files from this template into the new project's src/.
#    Replace anything that conflicts (Root.tsx, index.ts).
cp <THIS_DIR>/CRTComposition.tsx src/CRTComposition.tsx
cp <THIS_DIR>/Root.tsx           src/Root.tsx
cp <THIS_DIR>/index.ts           src/index.ts

# 3. Install deps (the scaffolder usually does this for you).
npm install

# 4. Preview in Studio.
npx remotion studio

# 5. Bake the final MP4. WebGL effects need the ANGLE renderer.
npx remotion render --gl=angle CRTComposition out/crt.mp4
```

## Browser flag requirement

`<HtmlInCanvas>` is a **Chrome 149+** API. To preview locally in Studio you
must enable the experimental flag once per Chrome profile:

```
chrome://flags/#canvas-draw-element  →  Enabled
```

Studio will refuse to render the canvas without it. The CLI render path uses
its own bundled Chrome and is gated by the same flag — `--gl=angle` flips the
right combination for the CLI; you do not need to pass any extra browser
flag at the CLI.

## What the composition demonstrates

| Pattern | Where to look |
|---|---|
| Frame-driven typewriter | `typedSlice(frame, fullText, startFrame, charFrames)` |
| Spring-eased panel entrance | `spring({ frame, fps, config })` + `interpolate` |
| Per-line fade reveal | mapping over `OUTPUT_LINES` with `interpolate(frame, [start, start+18], [0, 1])` |
| WebGL2 program lifecycle | `onInit` compiles + links + uploads, returns a cleanup |
| `gl.texElementImage2D` upload | inside `onPaint`, casts the GL context to access the experimental method |
| Frame-modulated shader uniform | `intensity = 0.85 + 0.15 * sin(frame / 30)` so the CRT breathes |
| Barrel distortion + scanlines + vignette + chromatic aberration | the `FRAGMENT_SHADER` constant |

## Editing knobs

The most useful values to tweak live at the top of `CRTComposition.tsx`:

- `TERMINAL_CMD`, `CLAUDE_INVOKE`, `CLAUDE_PROMPT`, `OUTPUT_LINES` — copy.
- `STAGE_*` constants — frame anchors for each phase.
- `CMD_CHAR_FRAMES`, `CLAUDE_INVOKE_CHAR_FRAMES`, `CLAUDE_PROMPT_CHAR_FRAMES`
  — typewriter cadence (frames per character).
- Inside `FRAGMENT_SHADER`:
  - `0.08 * u_intensity` — barrel distortion strength.
  - `mod(gl_FragCoord.y, 2.0) < 1.0 ? 0.97 : 1.0` — scanline darkening (50%
    duty cycle, 3% darkening).
  - `smoothstep(0.85, 0.30, length(vc))` — vignette falloff.
  - `(1.0 / u_resolution.x) * u_intensity` — chromatic aberration offset.

## License notes

This template is part of `marketing-cli` (MIT) and is intended to be copied
into your own Remotion project. Remotion itself is dual-licensed; consult
[https://remotion.dev/license](https://remotion.dev/license) before
shipping commercial output.
