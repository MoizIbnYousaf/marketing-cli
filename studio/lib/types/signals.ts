export interface SignalStats {
  totalSignals: number
  spikeCount: number
  lastUpdated: number | null
  platformCounts?: { platform: string; count: number }[]
}
