import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { BG, EMERALD, BLUE, TEXT, MUTED, RED, GRID, EMERALD_GLOW, BLUE_GLOW } from "./theme";
import { BrandBox, TypedText, GridBackground, FadeIn, ProgressBar } from "./components";

loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadJetBrains("normal", { weights: ["400", "500"], subsets: ["latin"] });

const FPS = 30;

// ── Act 1: The Problem (0–6s = frames 0–180) ────────────

const Act1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeOut = interpolate(frame, [150, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Agent box */}
      <FadeIn delay={5} duration={20}>
        <BrandBox label="AI Agent" color={MUTED} width={280} />
      </FadeIn>

      {/* Prompt typing */}
      <div style={{ marginTop: 30, textAlign: "center" }}>
        <TypedText
          text={`"help me market this app"`}
          startFrame={25}
          fontSize={22}
          color={MUTED}
        />
      </div>

      {/* Bad output */}
      <FadeIn delay={65} duration={15}>
        <div
          style={{
            marginTop: 20,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: RED,
            opacity: 0.9,
          }}
        >
          "Generic copy. No voice. No memory."
        </div>
      </FadeIn>

      {/* Loop arrow — circular indicator */}
      <FadeIn delay={90} duration={15}>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20, color: MUTED, opacity: 0.6 }}>↻</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: MUTED,
              opacity: 0.5,
            }}
          >
            same result, every time
          </span>
        </div>
      </FadeIn>

      {/* Bottom tagline */}
      <FadeIn delay={110} duration={20} style={{ position: "absolute", bottom: 120 }}>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: MUTED,
            letterSpacing: "-0.02em",
          }}
        >
          Every session starts from zero.
        </span>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 2: One Install (6–10s = frames 0–120) ───────────

const Act2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Command types in, then burst into components
  const burstStart = 50;

  const cmdOpacity = interpolate(frame, [0, 5, burstStart - 5, burstStart], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const burstProgress = spring({
    frame: frame - burstStart,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Terminal command */}
      <div style={{ opacity: cmdOpacity, textAlign: "center" }}>
        <TypedText
          text="bun install -g mktg && mktg init"
          startFrame={5}
          charFrames={1}
          fontSize={26}
          color={EMERALD}
        />
      </div>

      {/* Three component boxes burst out */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 40,
          opacity: burstProgress,
          transform: `scale(${interpolate(burstProgress, [0, 1], [0.5, 1])})`,
        }}
      >
        <FadeIn delay={burstStart} direction="left" duration={20}>
          <BrandBox label="CLI" color={EMERALD} subtitle="infrastructure" glowing />
        </FadeIn>
        <FadeIn delay={burstStart + 5} direction="up" duration={20}>
          <BrandBox label="39 Skills" color={BLUE} subtitle="knowledge" glowing />
        </FadeIn>
        <FadeIn delay={burstStart + 10} direction="right" duration={20}>
          <BrandBox label="Brand Memory" color={EMERALD} subtitle="compounding state" glowing />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
};

// ── Act 3: Parallel Research (10–18s = frames 0–240) ─────

const AgentDot: React.FC<{
  label: string;
  file: string;
  delay: number;
  x: number;
}> = ({ label, file, delay, x }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 200 },
  });

  const arrowProgress = spring({
    frame: frame - delay - 15,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });

  const fileAppear = spring({
    frame: frame - delay - 30,
    fps,
    config: { damping: 15, stiffness: 150 },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 280,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 280,
        transform: `translateX(-140px)`,
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: BLUE,
          boxShadow: `0 0 20px ${BLUE_GLOW}, 0 0 40px ${BLUE_GLOW}`,
          transform: `scale(${appear})`,
        }}
      />
      {/* Agent name */}
      <span
        style={{
          marginTop: 10,
          fontFamily: "Inter, sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: BLUE,
          opacity: appear,
        }}
      >
        {label}
      </span>

      {/* Arrow line */}
      <div
        style={{
          width: 2,
          height: 80 * arrowProgress,
          background: `linear-gradient(to bottom, ${BLUE}, transparent)`,
          marginTop: 8,
        }}
      />

      {/* File box */}
      <div
        style={{
          marginTop: 8,
          opacity: fileAppear,
          transform: `scale(${fileAppear}) translateY(${interpolate(fileAppear, [0, 1], [10, 0])}px)`,
        }}
      >
        <BrandBox label={file} color={EMERALD} width={200} glowing={fileAppear > 0.8} />
      </div>
    </div>
  );
};

const Act3: React.FC = () => {
  const frame = useCurrentFrame();

  // Top bar (miniaturized components)
  const barOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseOpacity = interpolate(
    frame % 30,
    [0, 15, 30],
    [0.5, 1, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Top component bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
          paddingTop: 60,
          opacity: barOpacity,
          transform: `scale(0.7)`,
        }}
      >
        <BrandBox label="CLI" color={EMERALD} width={140} />
        <BrandBox label="39 Skills" color={BLUE} width={140} />
        <BrandBox
          label="Brand Memory"
          color={EMERALD}
          width={180}
          glowing={frame > 120}
        />
      </div>

      {/* Three parallel agents */}
      <AgentDot label="Brand Researcher" file="voice-profile.md" delay={30} x={360} />
      <AgentDot label="Audience Researcher" file="audience.md" delay={35} x={760} />
      <AgentDot label="Competitive Scanner" file="competitors.md" delay={40} x={1160} />

      {/* Parallel label */}
      <FadeIn delay={100} duration={20} style={{ position: "absolute", bottom: 100, width: "100%", textAlign: "center" }}>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 24,
            fontWeight: 600,
            color: BLUE,
            letterSpacing: "-0.02em",
          }}
        >
          3 agents research in parallel
        </span>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 4: Compounding (18–24s = frames 0–180) ──────────

const Act4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sessions = [
    { label: "Session 1", count: "3 / 9", threshold: 20, frac: 0.33 },
    { label: "Session 5", count: "6 / 9", threshold: 60, frac: 0.66 },
    { label: "Session 10", count: "9 / 9", threshold: 100, frac: 1.0 },
  ];

  // Current progress
  let currentFrac = 0;
  let currentCount = "0 / 9";
  for (const s of sessions) {
    const p = spring({
      frame: frame - s.threshold,
      fps,
      config: { damping: 200 },
      durationInFrames: 30,
    });
    currentFrac = interpolate(p, [0, 1], [currentFrac, s.frac]);
    if (p > 0.5) currentCount = s.count;
  }

  const fadeOut = interpolate(frame, [155, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Timeline markers */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: 600,
          marginBottom: 40,
        }}
      >
        {sessions.map((s, i) => {
          const appear = spring({
            frame: frame - s.threshold,
            fps,
            config: { damping: 15, stiffness: 200 },
          });
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                opacity: interpolate(appear, [0, 1], [0.3, 1]),
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: appear > 0.5 ? EMERALD : GRID,
                  boxShadow: appear > 0.5 ? `0 0 15px ${EMERALD_GLOW}` : "none",
                  transform: `scale(${interpolate(appear, [0, 1], [0.6, 1])})`,
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: appear > 0.5 ? TEXT : MUTED,
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <ProgressBar progress={currentFrac} width={600} />

      {/* Counter */}
      <div
        style={{
          marginTop: 24,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28,
          fontWeight: 600,
          color: EMERALD,
        }}
      >
        {currentCount}
        <span style={{ color: MUTED, fontWeight: 400, fontSize: 18, marginLeft: 8 }}>
          brand files
        </span>
      </div>

      {/* Tagline */}
      <FadeIn delay={120} duration={20} style={{ position: "absolute", bottom: 120 }}>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: TEXT,
            letterSpacing: "-0.02em",
          }}
        >
          Every session makes the next one smarter
        </span>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 5: The Result (24–30s = frames 0–180) ───────────

const ConnectionLine: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  delay: number;
}> = ({ x1, y1, x2, y2, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y1,
        width: length * progress,
        height: 1.5,
        background: `linear-gradient(90deg, rgba(71,85,105,0.2), rgba(71,85,105,0.5))`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0 50%",
      }}
    />
  );
};

const Act5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const taglineAppear = spring({
    frame: frame - 100,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Hub diagram */}
      <div style={{ position: "relative", width: 800, height: 500 }}>
        {/* Agent box — top center */}
        <div style={{ position: "absolute", left: 260, top: 0 }}>
          <FadeIn delay={5} duration={20}>
            <BrandBox label="AI Agent" color={EMERALD} width={280} glowing />
          </FadeIn>
        </div>

        {/* /cmo hub — center */}
        <div style={{ position: "absolute", left: 310, top: 140 }}>
          <FadeIn delay={15} duration={15}>
            <BrandBox label="/cmo" color={BLUE} width={180} glowing />
          </FadeIn>
        </div>

        {/* CLI — left */}
        <div style={{ position: "absolute", left: 30, top: 280 }}>
          <FadeIn delay={25} direction="left" duration={20}>
            <BrandBox label="CLI" color={EMERALD} width={160} subtitle="infrastructure" />
          </FadeIn>
        </div>

        {/* Skills — center bottom */}
        <div style={{ position: "absolute", left: 310, top: 290 }}>
          <FadeIn delay={30} direction="up" duration={20}>
            <BrandBox label="39 Skills" color={BLUE} width={180} subtitle="knowledge" />
          </FadeIn>
        </div>

        {/* Memory — right */}
        <div style={{ position: "absolute", left: 580, top: 280 }}>
          <FadeIn delay={35} direction="right" duration={20}>
            <BrandBox label="Brand Memory" color={EMERALD} width={190} subtitle="compounding" />
          </FadeIn>
        </div>

        {/* Connection lines */}
        <ConnectionLine x1={400} y1={65} x2={400} y2={140} delay={20} />
        <ConnectionLine x1={340} y1={195} x2={150} y2={280} delay={30} />
        <ConnectionLine x1={400} y1={195} x2={400} y2={290} delay={35} />
        <ConnectionLine x1={460} y1={195} x2={640} y2={280} delay={40} />
      </div>

      {/* Prompt + output */}
      <FadeIn delay={55} duration={15} style={{ textAlign: "center", marginTop: -20 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: MUTED }}>
          "help me market this app"
        </div>
      </FadeIn>
      <FadeIn delay={75} duration={15} style={{ textAlign: "center", marginTop: 12 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: EMERALD,
            maxWidth: 700,
          }}
        >
          "Write 3 SEO articles, atomize into social posts."
        </div>
      </FadeIn>

      {/* Final tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          width: "100%",
          textAlign: "center",
          opacity: taglineAppear,
          transform: `translateY(${interpolate(taglineAppear, [0, 1], [20, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          <span style={{ color: EMERALD }}>mktg</span>
          <span style={{ color: TEXT }}> — a full CMO brain for your agent</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ─────────────────────────────────────

export const MktgExplainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <GridBackground />

      <Sequence from={0} durationInFrames={6 * FPS} premountFor={FPS}>
        <Act1 />
      </Sequence>

      <Sequence from={6 * FPS} durationInFrames={4 * FPS} premountFor={FPS}>
        <Act2 />
      </Sequence>

      <Sequence from={10 * FPS} durationInFrames={8 * FPS} premountFor={FPS}>
        <Act3 />
      </Sequence>

      <Sequence from={18 * FPS} durationInFrames={6 * FPS} premountFor={FPS}>
        <Act4 />
      </Sequence>

      <Sequence from={24 * FPS} durationInFrames={6 * FPS} premountFor={FPS}>
        <Act5 />
      </Sequence>
    </AbsoluteFill>
  );
};
