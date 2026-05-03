// Spring animation configs for the workspace UI.
export const SPRING = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  smooth: { type: "spring" as const, stiffness: 300, damping: 25 },
  bouncy: { type: "spring" as const, stiffness: 400, damping: 15 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 20 },
} as const

export const DURATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  glacial: 0.8,
} as const

export const STAGGER = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
} as const

export const AGENT_PHASES = [
  { id: "parsing", label: "Parsing", color: "var(--phase-parsing)" },
  { id: "scanning", label: "Scanning", color: "var(--phase-scanning)" },
  { id: "filtering", label: "Filtering", color: "var(--phase-filtering)" },
  { id: "scoring", label: "Scoring", color: "var(--phase-scoring)" },
  { id: "briefing", label: "Briefing", color: "var(--phase-briefing)" },
  { id: "delivering", label: "Delivering", color: "var(--phase-delivering)" },
  { id: "complete", label: "Complete", color: "var(--phase-complete)" },
] as const

export type AgentPhaseId = (typeof AGENT_PHASES)[number]["id"]
