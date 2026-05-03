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
}

export type AudienceMetric = string

export type AudienceData = {
  profiles: AudienceProfile[]
  platformIntelligence: PlatformIntelligenceItem[]
  byTheNumbers: AudienceMetric[]
}
