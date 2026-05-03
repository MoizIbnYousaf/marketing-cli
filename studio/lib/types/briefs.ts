export type BriefStatus = "completed" | "generating" | "failed"

export type TopStory = {
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  whyItMatters: string
}

export type EmergingSignal = {
  title: string
  summary: string
  source?: string
}

export type Sentiment = {
  positive: number
  negative: number
  neutral: number
  summary?: string
}

export type ContentOpportunity = {
  hook: string
  archetype: string
  platform?: string
  urgency?: "now" | "soon" | "watch"
}

export type WatchItem = {
  item: string
  action?: string
}

export type BrandComment = {
  platform: string
  author: string
  text: string
  likes: number
  timestamp?: string
  postUrl?: string
}

export type AudienceProfile = {
  platform: string
  handle: string
  followers: number
  following: number
  posts: number
  verified?: boolean
  engagementRate?: number
  bio?: string
}

export type PlatformIntelligenceItem = {
  platform: string
  metric: string
  insight: string
  comparison?: string
  action?: string
  url?: string
  dataSource?: string
}

export type Brief = {
  _id: string
  _creationTime: number
  date: string
  status: BriefStatus
  agentType?: string
  briefType?: string
  tldr?: string
  executiveSummary?: string
  topStories: TopStory[]
  emergingSignals: EmergingSignal[]
  sentiment: Sentiment
  contentOpportunities?: ContentOpportunity[]
  whatToWatch: WatchItem[]
  byTheNumbers: string[]
  brandComments?: BrandComment[]
  audienceProfiles?: AudienceProfile[]
  platformIntelligence?: PlatformIntelligenceItem[]
  htmlContent?: string
  totalArticles?: number
  totalSources?: number
}
