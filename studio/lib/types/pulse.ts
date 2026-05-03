// HQ legacy signal route shared types

export type Signal = {
  id: string
  platform: string
  title?: string
  content?: string | null
  canonicalUrl?: string | null
  authorHandle?: string | null
  authorFollowers?: number | null
  hashtags?: string[] | null
  metrics?: {
    views?: number | null
    likes?: number | null
    comments?: number | null
    shares?: number | null
  }
  severity?: "p0" | "p1" | "watch" | "negative" | "neutral" | null
  spikeMultiplier?: number | null
  spikeDetected?: boolean
  trendInterest?: number | null
  trendRising?: boolean | null
  capturedAt: number
  stream?: string | null
  feedback?: "pending" | "approved" | "dismissed" | "flagged"
}

export type Brief = {
  id: string
  title: string
  content: string
  skill?: string | null
  agentName?: string
  date?: string
  status?: "running" | "completed" | "failed"
  executiveSummary?: string | null
  contentOpportunities?: ContentOpportunity[] | null
  brandComments?: BrandComment[] | null
  platformIntelligence?: PlatformIntel[] | null
  topStories?: Story[] | null
  createdAt: string
}

export type ContentOpportunity = {
  platform?: string | null
  hook: string
  urgency?: "now" | "soon" | "watch"
}

export type BrandComment = {
  platform: string
  text: string
  author: string
  likes: number
  postUrl?: string | null
}

export type PlatformIntel = {
  platform: string
  insight: string
  metric?: string | null
  url?: string | null
}

export type Story = {
  title: string
  source: string
  url?: string | null
}

export type DecisionFeedData = {
  briefs: Brief[]
  stats: {
    totalSignals: number
    spikeCount: number
    feedItems: number
  }
}

export type SpikeStackData = Signal[]

export type FreshIntelData = {
  briefs: Brief[]
}

export type SocialHighlightsData = {
  signals: Signal[]
}

export type ArchetypeCardsData = {
  signals: Signal[]
}

export type LiveProofData = {
  generatedAt: string
  reportCount: number
  totals: {
    probeItems: number
    collectorEvidence: number
  }
  smokeEvidence?: Array<{ summary: string }>
}
