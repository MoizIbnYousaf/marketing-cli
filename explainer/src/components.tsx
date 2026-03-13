import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BG, EMERALD, BLUE, MUTED, TEXT, GRID, EMERALD_GLOW, BLUE_GLOW } from "./theme";

// ── Shared primitives ──────────────────────────────────

export const BrandBox: React.FC<{
  label: string;
  color?: string;
  subtitle?: string;
  width?: number;
  fontSize?: number;
  glowing?: boolean;
  style?: React.CSSProperties;
}> = ({ label, color = EMERALD, subtitle, width = 320, fontSize = 28, glowing = false, style }) => {
  const glow = color === EMERALD ? EMERALD_GLOW : BLUE_GLOW;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        ...style,
      }}
    >
      <div
        style={{
          width,
          padding: "20px 32px",
          border: `2px solid ${color}`,
          borderRadius: 16,
          background: glowing
            ? `radial-gradient(ellipse at center, ${glow}, ${BG})`
            : BG,
          boxShadow: glowing
            ? `0 0 40px ${glow}, 0 0 80px ${glow}, inset 0 0 30px ${glow}`
            : `0 0 0 1px rgba(255,255,255,0.03)`,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </div>
      {subtitle && (
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 18,
            color: MUTED,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};

export const TypedText: React.FC<{
  text: string;
  startFrame: number;
  charFrames?: number;
  fontSize?: number;
  color?: string;
  mono?: boolean;
}> = ({ text, startFrame, charFrames = 2, fontSize = 36, color = MUTED, mono = true }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.min(text.length, Math.floor(elapsed / charFrames));
  const showCursor = elapsed < text.length * charFrames + 30;
  const cursorOpacity = Math.round(frame / 8) % 2 === 0 ? 1 : 0;

  return (
    <span
      style={{
        fontFamily: mono ? "'JetBrains Mono', monospace" : "Inter, sans-serif",
        fontSize,
        color,
        fontWeight: mono ? 400 : 600,
      }}
    >
      {text.slice(0, chars)}
      {showCursor && (
        <span style={{ opacity: cursorOpacity, color }}>▎</span>
      )}
    </span>
  );
};

export const GridBackground: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(${GRID} 1px, transparent 1px),
          linear-gradient(90deg, ${GRID} 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        opacity: 0.3,
      }}
    />
  );
};

export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 15, direction = "up", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: duration,
  });

  const dist = 50;
  const translateMap = {
    up: `translateY(${interpolate(progress, [0, 1], [dist, 0])}px)`,
    down: `translateY(${interpolate(progress, [0, 1], [-dist, 0])}px)`,
    left: `translateX(${interpolate(progress, [0, 1], [dist, 0])}px)`,
    right: `translateX(${interpolate(progress, [0, 1], [-dist, 0])}px)`,
    none: "none",
  };

  return (
    <div
      style={{
        opacity: progress,
        transform: translateMap[direction],
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  width?: number;
  height?: number;
}> = ({ progress, width = 800, height = 16 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: height / 2,
        background: GRID,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          borderRadius: height / 2,
          background: `linear-gradient(90deg, ${EMERALD}, ${BLUE})`,
          boxShadow: `0 0 30px ${EMERALD_GLOW}, 0 4px 20px rgba(16, 185, 129, 0.3)`,
        }}
      />
    </div>
  );
};

export const Headline: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
}> = ({ children, size = 52, color = TEXT }) => (
  <div
    style={{
      fontFamily: "Inter, sans-serif",
      fontSize: size,
      fontWeight: 700,
      color,
      letterSpacing: "-0.03em",
      lineHeight: 1.2,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);
