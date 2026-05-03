export type PlatformStat = {
  platform: string
  count: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgInterest: number
  risingCount: number
}

export type IntelligenceLatest = {
  brief: import("./briefs").Brief | null
  pipelineRun: PipelineRun | null
  signalStats?: PlatformStat[]
}

export type PipelineRun = {
  _id: string
  status: string
  currentStep?: string
  progress: number
  startedAt: number
  completedAt?: number
  articlesFound?: number
  articlesRelevant?: number
  error?: string
}
