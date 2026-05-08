import { create } from "zustand"
import { persist } from "zustand/middleware"

// Dimension tab type
export type Dimension = "trend" | "brand" | "audience"
export type WorkspaceTab = "pulse" | "signals" | "publish" | "brand"
export type WorkspacePlatformFilter = "all" | "news" | "instagram" | "tiktok" | "google_trends"
export type WorkspaceStreamFilter = "all" | "hashtag" | "trending" | "explore"
export type WorkspaceTimeWindow = "live_2h" | "rising_8h" | "context_24h" | "all"

interface WorkspaceSignalFilters {
  platform: WorkspacePlatformFilter
  stream: WorkspaceStreamFilter
  timeWindow: WorkspaceTimeWindow
}

interface WorkspaceRobotCommand {
  tab?: WorkspaceTab
  platform?: WorkspacePlatformFilter
  stream?: WorkspaceStreamFilter
  timeWindow?: WorkspaceTimeWindow
  signalId?: string
}

// UI-only state -- all domain data comes from local SQLite + mktg CLI
interface DemoWalkthrough {
  hasSeenAnnotations: boolean
  hasDismissedSuggestions: boolean
  hasTriggeredFirstRun: boolean
  hasSeenResearchTransition: boolean
  hasSeenResearchAnnotations: boolean
}

const DEFAULT_WALKTHROUGH: DemoWalkthrough = {
  hasSeenAnnotations: false,
  hasDismissedSuggestions: false,
  hasTriggeredFirstRun: false,
  hasSeenResearchTransition: false,
  hasSeenResearchAnnotations: false,
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
  sidebarOpen: boolean
  selectedAgentId: string | null
  activeView: "dashboard" | "workspace" | "settings" | "new-agent"
  panelSizes: { chat: number; preview: number; status: number }
  hasSeenWelcome: boolean
  demoWalkthrough: DemoWalkthrough
  activeDimension: Dimension
  workspaceTab: WorkspaceTab
  signalFilters: WorkspaceSignalFilters
  selectedSignalId: string | null
  toggleSidebar: () => void
  setSelectedAgent: (id: string | null) => void
  setActiveView: (view: WorkspaceState["activeView"]) => void
  setPanelSizes: (sizes: Partial<WorkspaceState["panelSizes"]>) => void
  setHasSeenWelcome: (seen: boolean) => void
  setDemoWalkthrough: (update: Partial<DemoWalkthrough>) => void
  setActiveDimension: (d: Dimension) => void
  setWorkspaceTab: (tab: WorkspaceTab) => void
  setSignalFilters: (update: Partial<WorkspaceSignalFilters>) => void
  setSelectedSignalId: (signalId: string | null) => void
  applyRobotCommand: (command: WorkspaceRobotCommand) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      selectedAgentId: null,
      activeView: "dashboard",
      panelSizes: { chat: 35, preview: 65, status: 30 },
      hasSeenWelcome: false,
      demoWalkthrough: DEFAULT_WALKTHROUGH,
      activeDimension: "trend" as Dimension,
      workspaceTab: "pulse" as WorkspaceTab,
      signalFilters: DEFAULT_SIGNAL_FILTERS,
      selectedSignalId: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSelectedAgent: (id) => set({ selectedAgentId: id }),
      setActiveView: (view) => set({ activeView: view }),
      setPanelSizes: (sizes) =>
        set((s) => ({ panelSizes: { ...s.panelSizes, ...sizes } })),
      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),
      setDemoWalkthrough: (update) =>
        set((s) => ({ demoWalkthrough: { ...s.demoWalkthrough, ...update } })),
      setActiveDimension: (d) => set((s) => (s.activeDimension === d ? s : { activeDimension: d })),
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
      setSelectedSignalId: (signalId) => set({ selectedSignalId: signalId }),
      applyRobotCommand: (command) =>
        set((s) => {
          const nextTab = normalizeWorkspaceTab(command.tab ?? s.workspaceTab)
          const nextPlatform = command.platform ?? s.signalFilters.platform
          const nextStream =
            command.stream
            ?? (nextPlatform !== "all" && nextPlatform !== "tiktok"
              ? "all"
              : s.signalFilters.stream)
          const nextTimeWindow = command.timeWindow ?? s.signalFilters.timeWindow

          return {
            workspaceTab: nextTab,
            signalFilters: {
              platform: nextPlatform,
              stream: nextStream,
              timeWindow: nextTimeWindow,
            },
            selectedSignalId: command.signalId ?? s.selectedSignalId,
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
        const ps = state?.panelSizes as { chat?: number; preview?: number } | undefined
        if (!ps || ps.chat === undefined || ps.chat < 20 || ps.preview === undefined || ps.preview < 35) {
          return {
            ...state,
            panelSizes: { chat: 35, preview: 65, status: 30 },
            demoWalkthrough: DEFAULT_WALKTHROUGH,
            workspaceTab: "pulse",
            signalFilters: DEFAULT_SIGNAL_FILTERS,
            selectedSignalId: null,
          }
        }
        const dw = state?.demoWalkthrough as Record<string, unknown> | undefined
        const migrated = !dw || dw.hasSeenResearchTransition === undefined
          ? {
              ...state,
              demoWalkthrough: {
                ...DEFAULT_WALKTHROUGH,
                ...dw,
              },
            }
          : state

        const filters = migrated.signalFilters as
          | { platform?: WorkspacePlatformFilter; stream?: WorkspaceStreamFilter; timeWindow?: WorkspaceTimeWindow }
          | undefined

        return {
          ...migrated,
          workspaceTab: normalizeWorkspaceTab(migrated.workspaceTab),
          signalFilters: {
            platform: filters?.platform ?? DEFAULT_SIGNAL_FILTERS.platform,
            stream: filters?.stream ?? DEFAULT_SIGNAL_FILTERS.stream,
            timeWindow: filters?.timeWindow ?? DEFAULT_SIGNAL_FILTERS.timeWindow,
          },
          selectedSignalId: (migrated.selectedSignalId as string | null | undefined) ?? null,
        }
      },
    },
  ),
)
