export type ActionStatus = "open" | "in_progress" | "completed" | "dismissed"

export type ActionBoardItem = {
  id: string
  title: string
  status: ActionStatus
  owner?: string
  score?: number
  updatedAt: number
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

export type OpportunitiesData = {
  opportunities: ContentOpportunity[]
  watchItems: WatchItem[]
  actions: ActionBoardItem[]
}
