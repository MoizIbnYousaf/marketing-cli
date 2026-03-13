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
import {
  BG, EMERALD, BLUE, TEXT, MUTED, RED, GRID,
  EMERALD_GLOW, BLUE_GLOW,
} from "./theme";
import {
  BrandBox, TypedText, GridBackground, FadeIn, ProgressBar, Headline,
} from "./components";

loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadJetBrains("normal", { weights: ["400", "500"], subsets: ["latin"] });

const FPS = 30;

// ── Act 1: The Problem (0–6s) ────────────────────────────

const Act1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeOut = interpolate(frame, [155, 180], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
        padding: "0 120px",
      }}
    >
      {/* Agent box */}
      <FadeIn delay={3} duration={15}>
        <BrandBox label="AI Agent" color={MUTED} width={380} fontSize={34} />
      </FadeIn>

      {/* Prompt typing */}
      <div style={{ marginTop: 40, textAlign: "center" }}>
        <TypedText
          text={`"help me market this app"`}
          startFrame={20}
          fontSize={36}
          color={MUTED}
        />
      </div>

      {/* Bad output */}
      <FadeIn delay={60} duration={12}>
        <div
          style={{
            marginTop: 32,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 34,
            color: RED,
            textAlign: "center",
          }}
        >
          "Generic copy. No voice. No memory."
        </div>
      </FadeIn>

      {/* Loop */}
      <FadeIn delay={85} duration={12}>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 32, color: MUTED, opacity: 0.6 }}>↻</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              color: MUTED,
              opacity: 0.5,
            }}
          >
            same result, every time
          </span>
        </div>
      </FadeIn>

      {/* Tagline */}
      <FadeIn delay={108} duration={18} style={{ position: "absolute", bottom: 140 }}>
        <Headline size={48} color={MUTED}>
          Every session starts from zero.
        </Headline>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 2: One Install (6–10s) ───────────────────────────

const Act2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const burstStart = 45;

  const cmdOpacity = interpolate(
    frame, [0, 5, burstStart - 8, burstStart], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const burstProgress = spring({
    frame: frame - burstStart,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
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
          startFrame={3}
          charFrames={1}
          fontSize={40}
          color={EMERALD}
        />
      </div>

      {/* Three component boxes */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginTop: 60,
          opacity: burstProgress,
          transform: `scale(${interpolate(burstProgress, [0, 1], [0.6, 1])})`,
        }}
      >
        <FadeIn delay={burstStart} direction="left" duration={18}>
          <BrandBox label="CLI" color={EMERALD} width={300} fontSize={32} subtitle="infrastructure" glowing />
        </FadeIn>
        <FadeIn delay={burstStart + 4} direction="up" duration={18}>
          <BrandBox label="39 Skills" color={BLUE} width={300} fontSize={32} subtitle="knowledge" glowing />
        </FadeIn>
        <FadeIn delay={burstStart + 8} direction="right" duration={18}>
          <BrandBox label="Brand Memory" color={EMERALD} width={340} fontSize={32} subtitle="compounding state" glowing />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
};

// ── Act 3: Parallel Research (10–18s) ────────────────────

const AgentColumn: React.FC<{
  label: string;
  file: string;
  delay: number;
}> = ({ label, file, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    frame: frame - delay, fps,
    config: { damping: 15, stiffness: 200 },
  });

  const arrowProgress = spring({
    frame: frame - delay - 12, fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  const fileAppear = spring({
    frame: frame - delay - 25, fps,
    config: { damping: 15, stiffness: 150 },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: BLUE,
          boxShadow: `0 0 30px ${BLUE_GLOW}, 0 0 60px ${BLUE_GLOW}`,
          transform: `scale(${appear})`,
        }}
      />
      {/* Agent name */}
      <span
        style={{
          marginTop: 16,
          fontFamily: "Inter, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: BLUE,
          opacity: appear,
        }}
      >
        {label}
      </span>

      {/* Arrow line */}
      <div
        style={{
          width: 3,
          height: 100 * arrowProgress,
          background: `linear-gradient(to bottom, ${BLUE}, transparent)`,
          marginTop: 12,
        }}
      />

      {/* File box */}
      <div
        style={{
          marginTop: 12,
          opacity: fileAppear,
          transform: `scale(${fileAppear}) translateY(${interpolate(fileAppear, [0, 1], [15, 0])}px)`,
        }}
      >
        <BrandBox label={file} color={EMERALD} width={320} fontSize={24} glowing={fileAppear > 0.8} />
      </div>
    </div>
  );
};

const Act3: React.FC = () => {
  const frame = useCurrentFrame();

  const barOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, padding: "0 80px" }}>
      {/* Top component bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 50,
          paddingTop: 60,
          opacity: barOpacity,
        }}
      >
        <BrandBox label="CLI" color={EMERALD} width={200} fontSize={22} />
        <BrandBox label="39 Skills" color={BLUE} width={200} fontSize={22} />
        <BrandBox label="Brand Memory" color={EMERALD} width={260} fontSize={22} glowing={frame > 100} />
      </div>

      {/* Three parallel agents */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 80,
          padding: "0 40px",
        }}
      >
        <AgentColumn label="Brand Researcher" file="voice-profile.md" delay={25} />
        <AgentColumn label="Audience Researcher" file="audience.md" delay={30} />
        <AgentColumn label="Competitive Scanner" file="competitors.md" delay={35} />
      </div>

      {/* Label */}
      <FadeIn delay={90} duration={18} style={{ position: "absolute", bottom: 100, width: "100%", textAlign: "center", left: 0 }}>
        <Headline size={40} color={BLUE}>
          3 agents research in parallel
        </Headline>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 4: Compounding (18–24s) ──────────────────────────

const Act4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sessions = [
    { label: "Session 1", count: "3 / 9", threshold: 15, frac: 0.33 },
    { label: "Session 5", count: "6 / 9", threshold: 50, frac: 0.66 },
    { label: "Session 10", count: "9 / 9", threshold: 90, frac: 1.0 },
  ];

  let currentFrac = 0;
  let currentCount = "0 / 9";
  for (const s of sessions) {
    const p = spring({
      frame: frame - s.threshold, fps,
      config: { damping: 200 },
      durationInFrames: 25,
    });
    currentFrac = interpolate(p, [0, 1], [currentFrac, s.frac]);
    if (p > 0.5) currentCount = s.count;
  }

  const fadeOut = interpolate(frame, [155, 180], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
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
          width: 800,
          marginBottom: 50,
        }}
      >
        {sessions.map((s) => {
          const appear = spring({
            frame: frame - s.threshold, fps,
            config: { damping: 15, stiffness: 200 },
          });
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                opacity: interpolate(appear, [0, 1], [0.25, 1]),
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: appear > 0.5 ? EMERALD : GRID,
                  boxShadow: appear > 0.5 ? `0 0 25px ${EMERALD_GLOW}` : "none",
                  transform: `scale(${interpolate(appear, [0, 1], [0.5, 1])})`,
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 26,
                  fontWeight: 600,
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
      <ProgressBar progress={currentFrac} width={800} height={16} />

      {/* Counter */}
      <div
        style={{
          marginTop: 36,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 48,
          fontWeight: 700,
          color: EMERALD,
        }}
      >
        {currentCount}
        <span style={{ color: MUTED, fontWeight: 500, fontSize: 28, marginLeft: 14 }}>
          brand files
        </span>
      </div>

      {/* Tagline */}
      <FadeIn delay={115} duration={18} style={{ position: "absolute", bottom: 140 }}>
        <Headline size={44} color={TEXT}>
          Every session makes the next one smarter
        </Headline>
      </FadeIn>
    </AbsoluteFill>
  );
};

// ── Act 5: The Result (24–30s) ───────────────────────────

const Act5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const taglineAppear = spring({
    frame: frame - 95, fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Hub layout — vertically stacked, centered */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          marginTop: -60,
        }}
      >
        {/* Agent */}
        <FadeIn delay={3} duration={15}>
          <BrandBox label="AI Agent" color={EMERALD} width={400} fontSize={36} glowing />
        </FadeIn>

        {/* Connector line */}
        <FadeIn delay={10} duration={10} direction="none">
          <div style={{ width: 3, height: 40, background: `linear-gradient(to bottom, ${EMERALD}, ${BLUE})` }} />
        </FadeIn>

        {/* /cmo hub */}
        <FadeIn delay={12} duration={12}>
          <BrandBox label="/cmo" color={BLUE} width={260} fontSize={32} glowing />
        </FadeIn>

        {/* Fan out to 3 */}
        <FadeIn delay={18} duration={10} direction="none">
          <div style={{ width: 3, height: 30, background: `linear-gradient(to bottom, ${BLUE}, transparent)` }} />
        </FadeIn>

        <div style={{ display: "flex", gap: 60, marginTop: 0 }}>
          <FadeIn delay={22} direction="left" duration={15}>
            <BrandBox label="CLI" color={EMERALD} width={240} fontSize={24} subtitle="infrastructure" />
          </FadeIn>
          <FadeIn delay={26} direction="up" duration={15}>
            <BrandBox label="39 Skills" color={BLUE} width={260} fontSize={24} subtitle="knowledge" />
          </FadeIn>
          <FadeIn delay={30} direction="right" duration={15}>
            <BrandBox label="Brand Memory" color={EMERALD} width={300} fontSize={24} subtitle="compounding" />
          </FadeIn>
        </div>
      </div>

      {/* Prompt + rich output */}
      <div style={{ marginTop: 50, textAlign: "center" }}>
        <FadeIn delay={45} duration={12}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              color: MUTED,
            }}
          >
            "help me market this app"
          </div>
        </FadeIn>
        <FadeIn delay={60} duration={12}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 30,
              color: EMERALD,
              marginTop: 16,
            }}
          >
            "Write 3 SEO articles, atomize into social posts."
          </div>
        </FadeIn>
      </div>

      {/* Final tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: "100%",
          textAlign: "center",
          opacity: taglineAppear,
          transform: `translateY(${interpolate(taglineAppear, [0, 1], [30, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          <span style={{ color: EMERALD }}>mktg</span>
          <span style={{ color: TEXT }}>{" "}— a full CMO brain for your agent</span>
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
