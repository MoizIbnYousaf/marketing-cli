import { create } from "zustand"
import { persist } from "zustand/middleware"

export type WorkspaceTab = "pulse" | "signals" | "publish" | "brand"
export type WorkspacePlatformFilter = "all" | "news" | "instagram" | "tiktok" | "google_trends"
export type WorkspaceStreamFilter = "all" | "hashtag" | "trending" | "explore"
export type WorkspaceTimeWindow = "live_2h" | "rising_8h" | "context_24h" | "all"

interface WorkspaceSignalFilters {
  platform: WorkspacePlatformFilter
  stream: WorkspaceStreamFilter
  timeWindow: WorkspaceTimeWindow
}

const DEFAULT_SIGNAL_FILTERS: WorkspaceSignalFilters = {
  platform: "all",
  stream: "all",
  timeWindow: "rising_8h",
}

// Accepts current canonical ids ("pulse", "signals", "publish", "brand") and
// the pre-rename legacy ids ("hq" -> "pulse", "content" -> "signals", plus
// trends collapse). Persisted state from before the rename is migrated via
// the version-bump migrate() below; this is the runtime guard for any
// in-flight values from /cmo or other callers.
function normalizeWorkspaceTab(tab: unknown): WorkspaceTab {
  if (tab === "pulse" || tab === "signals" || tab === "publish" || tab === "brand") return tab
  if (tab === "hq") return "pulse"
  if (tab === "content" || tab === "trends") return "signals"
  return "pulse"
}

interface WorkspaceState {
  workspaceTab: WorkspaceTab
  signalFilters: WorkspaceSignalFilters
  setWorkspaceTab: (tab: WorkspaceTab) => void
  setSignalFilters: (update: Partial<WorkspaceSignalFilters>) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceTab: "pulse" as WorkspaceTab,
      signalFilters: DEFAULT_SIGNAL_FILTERS,
      setWorkspaceTab: (tab) => {
        const normalized = normalizeWorkspaceTab(tab)
        set((s) => (s.workspaceTab === normalized ? s : { workspaceTab: normalized }))
      },
      setSignalFilters: (update) =>
        set((s) => {
          const next = {
            ...s.signalFilters,
            ...update,
          }
          if (
            next.platform === s.signalFilters.platform &&
            next.stream === s.signalFilters.stream &&
            next.timeWindow === s.signalFilters.timeWindow
          ) {
            return s
          }
          return {
            signalFilters: next,
          }
        }),
    }),
    {
      name: "mktg-studio-workspace",
      // v2 (Lane 4 rename): hq -> pulse, content -> signals. The migrate
      // function below funnels every persisted workspaceTab through
      // normalizeWorkspaceTab(), so any v1 user with workspaceTab: "hq"
      // gets upgraded to "pulse" on first read.
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>
        const filters = state?.signalFilters as
          | { platform?: WorkspacePlatformFilter; stream?: WorkspaceStreamFilter; timeWindow?: WorkspaceTimeWindow }
          | undefined

        return {
          workspaceTab: normalizeWorkspaceTab(state?.workspaceTab),
          signalFilters: {
            platform: filters?.platform ?? DEFAULT_SIGNAL_FILTERS.platform,
            stream: filters?.stream ?? DEFAULT_SIGNAL_FILTERS.stream,
            timeWindow: filters?.timeWindow ?? DEFAULT_SIGNAL_FILTERS.timeWindow,
          },
        }
      },
    },
  ),
)
