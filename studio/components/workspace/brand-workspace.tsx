"use client"

import { useState, useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Activity as ActivityIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { WorkspaceTabs, type WorkspaceTab } from "./workspace-tabs"
import { MobileTabDock } from "./mobile-tab-dock"
import { useSignalStats } from "@/lib/hooks/use-signal-stats"
import {
  useWorkspaceStore,
  type WorkspacePlatformFilter,
  type WorkspaceStreamFilter,
  type WorkspaceTimeWindow,
} from "@/lib/stores/workspace"
import { PulsePage } from "./pulse/pulse-page"
import { ContentTab } from "./content/content-tab"
import { PublishTab } from "./publish/publish-tab"
import { BrandTab } from "./brand/brand-tab"
import { ActivityPanel } from "./activity-panel/activity-panel"
import { PageTitle } from "@/components/ui/page-title"
import { useIsMobile } from "@/hooks/use-mobile"

// Accessible names for the <h1> we render per tab. These are screen-reader
// targets — the visible tab headings are in WorkspaceTabs / MobileTabDock,
// which carry their own labels. Keeping this as the canonical source so
// `<PageTitle srOnly>` + the browser's page title ladder stay in sync.
const TAB_TITLES: Record<WorkspaceTab, string> = {
  hq: "Pulse",
  content: "Signals",
  publish: "Publish",
  brand: "Brand files",
}

const VALID_TABS: Set<string> = new Set(["hq", "pulse", "content", "trends", "signals", "audience", "opportunities", "publish", "brand"])
const VALID_PLATFORM_FILTERS: Set<string> = new Set(["all", "news", "instagram", "tiktok", "google_trends"])
const VALID_STREAM_FILTERS: Set<string> = new Set(["all", "hashtag", "trending", "explore"])
const VALID_TIME_WINDOWS: Set<string> = new Set(["live_2h", "rising_8h", "context_24h", "all"])

function normalizeTab(value: string | null): WorkspaceTab {
  if (!value || !VALID_TABS.has(value)) return "hq"
  if (value === "pulse") return "hq"
  if (value === "trends" || value === "signals") return "content"
  if (value === "audience" || value === "opportunities") return "hq"
  return value as WorkspaceTab
}

function normalizePlatform(value: string | null): WorkspacePlatformFilter {
  if (!value || !VALID_PLATFORM_FILTERS.has(value)) return "all"
  return value as WorkspacePlatformFilter
}

function normalizeStream(value: string | null): WorkspaceStreamFilter {
  if (!value || !VALID_STREAM_FILTERS.has(value)) return "all"
  return value as WorkspaceStreamFilter
}

function normalizeTimeWindow(value: string | null): WorkspaceTimeWindow {
  if (!value || !VALID_TIME_WINDOWS.has(value)) return "rising_8h"
  return value as WorkspaceTimeWindow
}


export function BrandWorkspace({ groupId }: { groupId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const setWorkspaceTab = useWorkspaceStore((s) => s.setWorkspaceTab)
  const setSignalFilters = useWorkspaceStore((s) => s.setSignalFilters)
  const [activityOpen, setActivityOpen] = useState(false)
  const isMobile = useIsMobile()

  const signalStats = useSignalStats()

  // Use a stable string dep — useSearchParams() can return new object refs per
  // render in dev/Turbopack, which would re-fire these effects every paint.
  const search = searchParams.toString()
  const rawTab = searchParams.get("tab")
  const routeTab = normalizeTab(searchParams.get("tab"))
  const routePlatform = normalizePlatform(searchParams.get("platform"))
  const routeStreamRaw = normalizeStream(searchParams.get("stream"))
  const routeStream =
    routePlatform !== "all" && routePlatform !== "tiktok"
      ? "all"
      : routeStreamRaw
  const routeTimeWindow = normalizeTimeWindow(searchParams.get("time"))

  const activeTab = routeTab
  const signalFilters = {
    platform: routePlatform,
    stream: routeStream,
    timeWindow: routeTimeWindow,
  } as const

  const updateUrlState = useCallback((update: {
    tab?: WorkspaceTab
    platform?: WorkspacePlatformFilter
    stream?: WorkspaceStreamFilter
    timeWindow?: WorkspaceTimeWindow
  }) => {
    const nextParams = new URLSearchParams(search)
    const nextTab = update.tab ?? routeTab
    const nextPlatform = update.platform ?? routePlatform
    const nextStreamRaw = update.stream ?? routeStream
    const nextStream =
      nextPlatform !== "all" && nextPlatform !== "tiktok"
        ? "all"
        : nextStreamRaw
    const nextTimeWindow = update.timeWindow ?? routeTimeWindow

    if (nextTab === "hq") nextParams.delete("tab")
    else nextParams.set("tab", nextTab)

    nextParams.delete("mode")

    if (nextPlatform === "all") nextParams.delete("platform")
    else nextParams.set("platform", nextPlatform)

    if (nextStream === "all") nextParams.delete("stream")
    else nextParams.set("stream", nextStream)

    if (nextTimeWindow === "rising_8h") nextParams.delete("time")
    else nextParams.set("time", nextTimeWindow)

    const nextQuery = nextParams.toString()
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextHref, { scroll: false })
  }, [pathname, routePlatform, routeStream, routeTab, routeTimeWindow, router, search])

  const handleTabChange = useCallback((tab: WorkspaceTab) => {
    setWorkspaceTab(tab)
    updateUrlState({ tab })
  }, [setWorkspaceTab, updateUrlState])

  useEffect(() => {
    setWorkspaceTab(routeTab)
    setSignalFilters({
      platform: routePlatform,
      stream: routeStream,
      timeWindow: routeTimeWindow,
    })
  }, [routePlatform, routeStream, routeTab, routeTimeWindow, setSignalFilters, setWorkspaceTab])

  useEffect(() => {
    if (!rawTab) return
    if (rawTab === routeTab) return
    updateUrlState({ tab: routeTab })
  }, [rawTab, routeTab, updateUrlState])

  const workspaceTitleId = "workspace-active-tab-title"

  return (
    // <section> + aria-labelledby instead of a second <main>: the
    // `app/(dashboard)/layout.tsx` already mounts `<main id="dashboard-main">`
    // as the page-level landmark (A29: avoiding nested <main>), so this
    // region is a *named section inside* that main. Screen readers
    // announce the section via the h1 id referenced here.
    <section
      aria-labelledby={workspaceTitleId}
      className="relative flex h-full flex-col overflow-x-hidden bg-[#11161a]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_420px_at_-10%_-20%,rgba(216,255,60,0.08),transparent_70%),radial-gradient(820px_380px_at_110%_-20%,rgba(245,240,230,0.06),transparent_72%)]" />

      {/* G5-01: every tab gets exactly one <h1>. Screen-reader-only so
          the visible WorkspaceTabs remain the primary tab UI and we
          don't double up on on-screen "Pulse / Signals / ..." text. */}
      <PageTitle srOnly id={workspaceTitleId} title={TAB_TITLES[activeTab]} />

      <div className="relative z-10 flex h-full flex-col">
        <WorkspaceTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          spikeCount={signalStats?.spikeCount}
          className="hidden md:block md:border-b-0 md:px-6 md:pb-3 md:pt-0"
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {!isMobile ? (
            <div className="h-full min-h-0 px-6 pb-5">
              <div
                data-demo-id="workspace-shell"
                className="h-full min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#11161a]/95 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.85)] backdrop-blur"
              >
                <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="h-full min-h-0 overflow-hidden">
                    {activeTab === "hq" && (
                      <div className="h-full min-h-0 overflow-auto">
                        <PulsePage groupId={groupId} />
                      </div>
                    )}
                    {activeTab === "content" && <ContentTab groupId={groupId} />}
                    {activeTab === "publish" && <PublishTab groupId={groupId} />}
                    {activeTab === "brand" && <BrandTab />}
                  </div>

                  <div className="hidden h-full min-h-0 border-l border-white/10 bg-[#0e1418]/80 xl:block">
                    <ActivityPanel groupId={groupId} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto pb-28">
              {activeTab === "hq" && <PulsePage groupId={groupId} />}
              {activeTab === "content" && <ContentTab groupId={groupId} />}
              {activeTab === "publish" && <PublishTab groupId={groupId} />}
              {activeTab === "brand" && <BrandTab />}
            </div>
          )}
        </div>
      </div>

      {/* Mobile activity FAB — above MobileTabDock */}
      <button
        onClick={() => setActivityOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg md:hidden"
        aria-label="Open /cmo activity"
      >
        <ActivityIcon className="size-5" />
      </button>

      <MobileTabDock
        activeTab={activeTab}
        onTabChange={handleTabChange}
        spikeCount={signalStats?.spikeCount}
      />

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent side="bottom" className="h-[88dvh] rounded-t-3xl p-0 md:hidden">
          <div className="flex h-full flex-col pt-5">
            <div className="border-b border-border/70 px-4 pb-3">
              <SheetTitle className="font-serif text-lg tracking-tight">
                /cmo Activity
              </SheetTitle>
              <SheetDescription>
                Live stream of skill runs, brand writes, and publishes driven by /cmo.
              </SheetDescription>
            </div>
            <div className="min-h-0 flex-1 [&>div]:!border-l-0">
              <ActivityPanel groupId={groupId} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
