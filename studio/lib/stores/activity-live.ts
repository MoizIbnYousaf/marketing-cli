import { create } from "zustand"
import type { Activity } from "@/lib/types/activity"

interface ActivityLiveState {
  items: Activity[]
  connected: boolean
  push: (activity: Activity) => void
  clear: () => void
  setConnected: (connected: boolean) => void
}

const MAX_LIVE_ITEMS = 100

export const useActivityLiveStore = create<ActivityLiveState>()((set) => ({
  items: [],
  connected: false,
  push: (activity) =>
    set((s) => {
      if (s.items.some((a) => a.id === activity.id)) return s
      return { items: [activity, ...s.items].slice(0, MAX_LIVE_ITEMS) }
    }),
  clear: () => set({ items: [] }),
  setConnected: (connected) => set({ connected }),
}))
