// Severity scoring for signal classification (local, no external deps).

export type SeverityLevel = "p0" | "p1" | "watch" | "negative" | "neutral"

/**
 * Classify a signal's severity based on spike multiplier and trend data.
 * p0 = very high spike (>= 5x), p1 = spike (>= 2x), negative = declining,
 * watch = mild interest, neutral = baseline.
 */
export function classifySeverity(
  spikeMultiplier?: number | null,
  trendInterest?: number | null,
  trendRising?: boolean | null
): SeverityLevel {
  if (spikeMultiplier != null) {
    if (spikeMultiplier >= 5) return "p0"
    if (spikeMultiplier >= 2) return "p1"
    if (spikeMultiplier < 0.5) return "negative"
  }
  if (trendRising === false && (trendInterest ?? 0) < 20) return "negative"
  if ((trendInterest ?? 0) >= 60 || trendRising) return "watch"
  return "neutral"
}

/**
 * Returns true when a signal qualifies as a spike (p0 or p1).
 */
export function isSpikeSignal(severity: SeverityLevel): boolean {
  return severity === "p0" || severity === "p1"
}

export type SignalForScoring = {
  title: string
  content?: string | null
  authorHandle?: string | null
  hashtags?: string[] | null
  metrics?: {
    views?: number | null
    likes?: number | null
    comments?: number | null
    shares?: number | null
  } | null
  spikeMultiplier?: number | null
  trendInterest?: number | null
  trendRising?: boolean | null
  capturedAt: number
}

export type RankedSignal<T extends SignalForScoring = SignalForScoring> = {
  signal: T
  score: number
  matches: string[]
}

const STOP_TERMS = new Set([
  "the", "and", "for", "with", "from", "your", "brand", "agent",
  "tiktok", "instagram", "social", "media", "trend", "trends",
  "analysis", "insight",
])

const FIT_THRESHOLD = 58

export const normalizeTrendTerm = (raw: string) =>
  raw
    .toLowerCase()
    .trim()
    .replace(/^#/, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")

const termTokensFromText = (raw: string) => {
  const normalized = normalizeTrendTerm(raw)
  if (!normalized) return []
  return normalized
    .split(/[\s,|/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOP_TERMS.has(part))
}

export type AgentForScoring = {
  keywords: string[]
  researchSubject?: string | null
  researchFocus?: string | null
  clientContext?: string | null
  instagramHandle?: string | null
  tiktokHandle?: string | null
}

export const extractFocusTerms = (agents: AgentForScoring[]): string[] => {
  const rankedTerms = new Map<string, number>()

  const boostTerm = (term: string, weight: number) => {
    if (!term || term.length < 3 || STOP_TERMS.has(term)) return
    rankedTerms.set(term, (rankedTerms.get(term) ?? 0) + weight)
  }

  for (const agent of agents) {
    for (const keyword of agent.keywords) {
      const normalizedKeyword = normalizeTrendTerm(keyword)
      if (normalizedKeyword.length >= 3) boostTerm(normalizedKeyword, 3)
      for (const token of termTokensFromText(keyword)) boostTerm(token, 2)
    }
    for (const token of termTokensFromText(agent.researchSubject ?? "")) boostTerm(token, 2)
    for (const token of termTokensFromText(agent.researchFocus ?? "")) boostTerm(token, 2)
    for (const token of termTokensFromText(agent.clientContext ?? "")) boostTerm(token, 1)
    for (const token of termTokensFromText(agent.instagramHandle ?? "")) boostTerm(token, 2)
    for (const token of termTokensFromText(agent.tiktokHandle ?? "")) boostTerm(token, 2)
  }

  return [...rankedTerms.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([term]) => term)
}

export const computeBrandFit = <T extends SignalForScoring>(
  signal: T,
  activeTerms: string[],
  freshestCapturedAt: number
): RankedSignal<T> => {
  const haystack = [
    signal.title,
    signal.content ?? "",
    signal.authorHandle ?? "",
    ...(signal.hashtags ?? []),
  ]
    .join(" ")
    .toLowerCase()

  const matches = activeTerms.filter((term) => haystack.includes(term))
  const uniqueMatches = [...new Set(matches)]

  const views = signal.metrics?.views ?? 0
  const likes = signal.metrics?.likes ?? 0
  const comments = signal.metrics?.comments ?? 0
  const shares = signal.metrics?.shares ?? 0
  const interactions = likes + comments + shares

  const keywordScore = Math.min(60, uniqueMatches.length * 16)
  const engagementScore = Math.min(
    18,
    Math.log10(views + 1) * 5 + Math.log10(interactions + 1) * 4
  )
  const spikeScore =
    signal.spikeMultiplier && signal.spikeMultiplier > 1
      ? Math.min(12, (signal.spikeMultiplier - 1) * 10)
      : 0
  const trendScore = Math.min(6, ((signal.trendInterest ?? 0) / 100) * 6)
  const risingBonus = signal.trendRising ? 5 : 0

  const ageHours = Math.max(0, (freshestCapturedAt - signal.capturedAt) / 3_600_000)
  const recencyScore =
    ageHours <= 6 ? 10 :
    ageHours <= 24 ? 8 :
    ageHours <= 72 ? 5 :
    ageHours <= 168 ? 2 : 0

  const fitBias = uniqueMatches.length > 0 ? 8 : -12

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        keywordScore + engagementScore + spikeScore + trendScore + risingBonus + recencyScore + fitBias
      )
    )
  )

  return { signal, score, matches: uniqueMatches.slice(0, 5) }
}

export const rankSignalsForBrand = <T extends SignalForScoring>(
  signals: T[],
  activeTerms: string[]
): RankedSignal<T>[] => {
  if (signals.length === 0) return []

  const freshestCapturedAt = signals.reduce(
    (max, signal) => Math.max(max, signal.capturedAt),
    signals[0]?.capturedAt ?? 0
  )

  return signals
    .map((signal) => computeBrandFit(signal, activeTerms, freshestCapturedAt))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const bViews = b.signal.metrics?.views ?? 0
      const aViews = a.signal.metrics?.views ?? 0
      if (bViews !== aViews) return bViews - aViews
      return b.signal.capturedAt - a.signal.capturedAt
    })
}

export { FIT_THRESHOLD }
