# Remotion Component Examples for Marketing Demos

Reference patterns for Mode B (Polished Demo). Copy and adapt these components.

## Root Composition (index.tsx)

```tsx
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={300} // 10s at 30fps
      fps={30}
      width={1280}
      height={720}
    />
  );
};
```

## Main Demo Video (DemoVideo.tsx)

```tsx
import { AbsoluteFill, Sequence } from "remotion";
import { Intro } from "./Intro";
import { DemoScene } from "./DemoScene";
import { Outro } from "./Outro";

// Define shots — update paths and captions per project
const SHOTS = [
  { src: "/shots/shot-01.png", caption: "Create in seconds" },
  { src: "/shots/shot-02.png", caption: "Organize everything" },
  { src: "/shots/shot-03.png", caption: "Share with your team" },
];

export const DemoVideo: React.FC = () => {
  const introDuration = 60; // 2s
  const sceneDuration = 60; // 2s per shot
  const outroDuration = 90; // 3s

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={introDuration}>
        <Intro />
      </Sequence>

      {SHOTS.map((shot, i) => (
        <Sequence
          key={i}
          from={introDuration + i * sceneDuration}
          durationInFrames={sceneDuration}
        >
          <DemoScene src={shot.src} caption={shot.caption} />
        </Sequence>
      ))}

      <Sequence
        from={introDuration + SHOTS.length * sceneDuration}
        durationInFrames={outroDuration}
      >
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
```

## Intro Scene (Intro.tsx)

```tsx
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Img
          src="/logo.png"
          style={{
            width: 120,
            height: 120,
            opacity: logoOpacity,
            marginBottom: 24,
          }}
        />
        <p
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontFamily: "Inter, sans-serif",
            opacity: taglineOpacity,
            fontWeight: 500,
          }}
        >
          Your tagline here
        </p>
      </div>
    </AbsoluteFill>
  );
};
```

## Demo Scene (DemoScene.tsx)

```tsx
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";

interface DemoSceneProps {
  src: string;
  caption: string;
}

export const DemoScene: React.FC<DemoSceneProps> = ({ src, caption }) => {
  const frame = useCurrentFrame();

  // Subtle zoom-in adds life to static screenshots
  const scale = interpolate(frame, [0, 60], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // Caption fades in slightly after screenshot
  const captionOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const captionY = interpolate(frame, [5, 20], [10, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Screenshot — fills 80% of frame */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          width: "80%",
          height: "75%",
          overflow: "hidden",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      </div>

      {/* Caption overlay at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "4%",
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: captionOpacity,
          transform: `translateY(${captionY}px)`,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 32,
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            background: "rgba(0,0,0,0.6)",
            padding: "8px 24px",
            borderRadius: 8,
          }}
        >
          {caption}
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

## Outro Scene (Outro.tsx)

```tsx
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const ctaOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [0, 25], [0.95, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
        }}
      >
        <Img
          src="/logo.png"
          style={{ width: 80, height: 80, marginBottom: 24 }}
        />
        <h2
          style={{
            color: "#ffffff",
            fontSize: 42,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Try it free
        </h2>
        <p
          style={{
            color: "#9ca3af",
            fontSize: 22,
            fontFamily: "Inter, sans-serif",
          }}
        >
          yourproduct.com
        </p>
      </div>
    </AbsoluteFill>
  );
};
```

## Adapting to Your Brand

1. Replace `#1a1a2e` / `#16213e` gradients with colors from `brand/creative-kit.md`
2. Replace `Inter` with your brand font
3. Replace `/logo.png` with your logo path
4. Adjust `durationInFrames` per scene based on shot duration rules in SKILL.md
5. For social (1080x1080), change the Composition dimensions and adjust layout accordingly

## Common Adjustments

| Need | Change |
|------|--------|
| Longer per scene | Increase `sceneDuration` (30fps × seconds) |
| More scenes | Add entries to `SHOTS` array |
| Different resolution | Change Composition `width`/`height` |
| Background music | Add `<Audio src="/music.mp3" />` to DemoVideo |
| Fade transitions | Add opacity interpolation at scene start/end frames |
