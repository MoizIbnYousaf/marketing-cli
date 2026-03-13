export type TerminalTone = "default" | "success" | "warning" | "error" | "muted" | "dim";

export type TerminalSegment = {
  text: string;
  tone?: TerminalTone;
  emphasis?: "strong" | "dim";
};

export type TerminalLine = {
  id: string;
  segments: readonly TerminalSegment[];
};

export type TerminalDemoSequence = {
  id: "init" | "status" | "doctor";
  label: string;
  windowTitle: string;
  command: string;
  lines: readonly TerminalLine[];
};

const header = (id: string, text: string): TerminalLine => ({
  id,
  segments: [{ text, emphasis: "strong" }],
});

const success = (id: string, text: string): TerminalLine => ({
  id,
  segments: [
    { text: "✓ ", tone: "success" },
    { text },
  ],
});

const warning = (id: string, text: string): TerminalLine => ({
  id,
  segments: [
    { text: "⚠ ", tone: "warning" },
    { text, tone: "warning" },
  ],
});

const failure = (id: string, text: string): TerminalLine => ({
  id,
  segments: [
    { text: "✕ ", tone: "error" },
    { text, tone: "error" },
  ],
});

const dim = (id: string, text: string): TerminalLine => ({
  id,
  segments: [{ text, tone: "dim", emphasis: "dim" }],
});

export const TERMINAL_DEMOS = [
  {
    id: "init",
    label: "mktg init",
    windowTitle: "bootstrap replay",
    command: "mktg init",
    lines: [
      header("init-header", "Bootstrapping your marketing operating system"),
      success("init-1", "Detected Next.js + Bun workspace"),
      success("init-2", "Created brand/voice-profile.md"),
      success("init-3", "Created brand/audience.md"),
      success("init-4", "Created brand/competitors.md"),
      success("init-5", "Installed 35 marketing skills into agent config"),
      success("init-6", "Installed 5 research and review agents"),
      warning("init-7", "Exa MCP missing — research skills will prompt on first run"),
      failure("init-8", "GitHub CLI auth missing — release shortcuts skipped"),
      success("init-9", "Doctor baseline passed for brand memory + skill registry"),
      dim("init-10", "Next step: run /cmo to build positioning, audience, and launch assets."),
    ],
  },
  {
    id: "status",
    label: "mktg status",
    windowTitle: "project snapshot",
    command: "mktg status",
    lines: [
      header("status-header", "Marketing state snapshot"),
      success("status-1", "Brand directory present with 9/9 foundation files"),
      success("status-2", "35/35 skills installed and available to your agent"),
      success("status-3", "Primary positioning angle synced across active playbooks"),
      warning("status-4", "keyword-plan.md is 12 days old — refresh before the next launch"),
      warning("status-5", "Audience research last updated before the latest feature release"),
      failure("status-6", "No launch brief found for the current product announcement"),
      success("status-7", "Brand voice profile marked fresh from website and README analysis"),
      dim("status-8", "Suggested next action: run /cmo -> /launch-strategy for an updated go-to-market plan."),
    ],
  },
  {
    id: "doctor",
    label: "mktg doctor",
    windowTitle: "health check",
    command: "mktg doctor",
    lines: [
      header("doctor-header", "Doctor health checks"),
      success("doctor-1", "Brand memory directory exists and contains required scaffolding"),
      success("doctor-2", "skills-manifest.json matches installed skill versions"),
      success("doctor-3", "Bun runtime detected and ready for CLI workflows"),
      success("doctor-4", "Agent registry includes all 5 bundled sub-agents"),
      warning("doctor-5", "Exa CLI not found — competitive scans unavailable"),
      warning("doctor-6", "Remotion missing — slideshow rendering commands disabled"),
      failure("doctor-7", "Playwright CLI missing — demo capture workflows blocked"),
      success("doctor-8", "Current project path is writable for brand scaffolding"),
      dim("doctor-9", "Run mktg update after installing missing CLIs to resync tooling."),
    ],
  },
] as const satisfies readonly TerminalDemoSequence[];
