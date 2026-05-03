export type SignalFeedback = "pending" | "approved" | "dismissed" | "flagged" | "relevant" | "irrelevant" | "actioned"
export type SignalSeverity = "p0" | "p1" | "watch" | "negative" | "neutral"
export type SignalStream = "hashtag" | "trending" | "explore" | null

export interface SignalMetrics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
}

export interface Signal {
  id: string
  platform: string
  content?: string | null
  url?: string | null
  canonicalUrl?: string | null
  severity?: SignalSeverity | null
  spikeMultiplier?: number
  spikeDetected?: boolean
  feedback?: SignalFeedback | null
  feedbackAt?: number | null
  metadata?: string | null
  capturedAt: number
  createdAt: string
  updatedAt: string
  // Extended fields for richer signal display (title, author, hashtags, trend metrics).
  title?: string
  authorHandle?: string | null
  externalId?: string | null
  hashtags?: string[] | null
  stream?: SignalStream
  metrics?: SignalMetrics
  trendInterest?: number
  trendRising?: boolean
}

export interface SignalSnapshot {
  id: string
  signalId: string
  views?: number
  likes?: number
  comments?: number
  capturedAt: number
}

export interface SignalStats {
  totalSignals: number
  spikeCount: number
  lastUpdated: number | null
  platformCounts?: { platform: string; count: number }[]
}

export interface SignalBaseline {
  platform: string
  metric: string
  baselineValue: number
  windowDays: number
  computedAt: string
}
