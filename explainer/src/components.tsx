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
  glowing?: boolean;
  style?: React.CSSProperties;
}> = ({ label, color = EMERALD, subtitle, width = 220, glowing = false, style }) => {
  const glow = color === EMERALD ? EMERALD_GLOW : BLUE_GLOW;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      <div
        style={{
          width,
          padding: "14px 24px",
          border: `1.5px solid ${color}`,
          borderRadius: 12,
          background: glowing
            ? `radial-gradient(ellipse at center, ${glow}, ${BG})`
            : BG,
          boxShadow: glowing ? `0 0 30px ${glow}, 0 0 60px ${glow}` : "none",
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      {subtitle && (
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: MUTED,
            fontWeight: 400,
            letterSpacing: "0.04em",
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
}> = ({ text, startFrame, charFrames = 2, fontSize = 20, color = MUTED, mono = true }) => {
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
        fontWeight: mono ? 400 : 500,
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
        backgroundSize: "60px 60px",
        opacity: 0.4,
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

  const translateMap = {
    up: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
    down: `translateY(${interpolate(progress, [0, 1], [-30, 0])}px)`,
    left: `translateX(${interpolate(progress, [0, 1], [40, 0])}px)`,
    right: `translateX(${interpolate(progress, [0, 1], [-40, 0])}px)`,
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

export const AnimatedArrow: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay?: number;
  color?: string;
}> = ({ from, to, delay = 0, color = BLUE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        left: from.x,
        top: from.y,
        width: length * progress,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color})`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0 50%",
        opacity: progress,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -4,
          top: -4,
          width: 10,
          height: 10,
          borderRight: `2px solid ${color}`,
          borderBottom: `2px solid ${color}`,
          transform: "rotate(-45deg)",
          opacity: progress > 0.8 ? 1 : 0,
        }}
      />
    </div>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  width?: number;
}> = ({ progress, width = 500 }) => {
  return (
    <div
      style={{
        width,
        height: 8,
        borderRadius: 4,
        background: GRID,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          borderRadius: 4,
          background: `linear-gradient(90deg, ${EMERALD}, ${BLUE})`,
          boxShadow: `0 0 20px ${EMERALD_GLOW}`,
        }}
      />
    </div>
  );
};
