// Trends tab shared types

export type TrendSignal = {
  id: string
  platform?: string | null
  title: string
  content?: string | null
  canonicalUrl?: string | null
  authorHandle?: string | null
  authorFollowers?: number | null
  hashtags?: string[] | null
  metrics: {
    views?: number | null
    likes?: number | null
    comments?: number | null
    shares?: number | null
  }
  spikeMultiplier?: number | null
  trendInterest?: number | null
  trendRising?: boolean | null
  capturedAt: number
  stream?: string | null
}

export type HotContextLane = "act_now" | "watch" | "ignore"

export type HotContextFeedItem = {
  signalId: string
  groupId: string
  platform: string
  title: string
  canonicalUrl?: string
  authorHandle?: string
  capturedAt: number
  lane: HotContextLane
  score: number
  recommendedAction: string
  whyNow: string[]
  severity?: string
  spikeMultiplier?: number
  trendInterest?: number
}

export type HotContextActionInput = {
  signalId: string
  lane: HotContextLane
  recommendedAction: string
  whyNow: string[]
}

export type BrandAgent = {
  keywords: string[]
  researchSubject?: string | null
  researchFocus?: string | null
  clientContext?: string | null
  instagramHandle?: string | null
  tiktokHandle?: string | null
}

export type HotContextFeedData = {
  items: HotContextFeedItem[]
}

export type TrendsFeedData = {
  trending: TrendSignal[]
  explore: TrendSignal[]
  hashtag: TrendSignal[]
  instagram: TrendSignal[]
  agents: BrandAgent[]
}
