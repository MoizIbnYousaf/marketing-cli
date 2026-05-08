"use client"

import React, { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Search } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DemoMode } from "@/components/workspace/demo-mode"
import { StudioStatus } from "./studio-status"
import { ProjectIdentityChip } from "@/components/layout/project-identity"
import { usePalette } from "@/components/command-palette/palette-provider"

const DEMO_ENABLED = process.env.NEXT_PUBLIC_STUDIO_DEMO === "1"

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "mktg studio",
  settings: "Settings",
  skills: "Skills",
}

// Cleaned up after the (dashboard) route group consolidation: the previous
// `brands`/`agents` keys plus the opaque-id workspace formatter served a
// `/brands/[id]` + `/agents/[id]` schema that no longer exists. Every
// current route is a single static segment.
const formatSegmentLabel = (segment: string) => {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export const buildCrumbs = (pathname?: string | null) => {
  if (!pathname) return []
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Array<{ label: string; href: string; isLast: boolean }> = []

  segments.forEach((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label = formatSegmentLabel(segment)
    const isLast = i === segments.length - 1

    crumbs.push({ label, href, isLast })
  })

  return crumbs
}

export function AppHeader() {
  const pathname = usePathname()
  const { open: openPalette } = usePalette()
  const [localTime, setLocalTime] = useState("--:--")
  const safePathname = pathname ?? "/dashboard"
  const crumbs = useMemo(() => buildCrumbs(safePathname), [safePathname])

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    const tick = () => setLocalTime(formatter.format(new Date()))
    tick()

    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      tick()
      interval = window.setInterval(tick, 60_000)
    }, (60 - new Date().getSeconds()) * 1000)

    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 text-foreground backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(92deg,rgba(216,255,60,0.06),transparent_35%,transparent_70%,rgba(245,240,230,0.04))]" />

      <div className="relative flex items-center gap-2">
        <SidebarTrigger className="-ml-1 rounded-lg border border-border bg-surface-1 p-1.5 text-foreground hover:bg-surface-2" />
        <Separator orientation="vertical" className="mx-1 h-5 bg-border" />
        <ProjectIdentityChip />
        <Breadcrumb className="md:hidden">
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="relative ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={openPalette}
          aria-label="Open command palette"
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          className="hidden h-9 w-[min(34vw,320px)] items-center gap-2 rounded-md border border-border bg-sidebar px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex"
        >
          <Search className="size-3.5" />
          <span className="flex-1">Search</span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </span>
        </button>
        <StudioStatus />
        <div className="hidden items-center gap-2 rounded-full border border-border bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
          <span suppressHydrationWarning className="tabular-nums">
            {localTime}
          </span>
        </div>
        {DEMO_ENABLED ? <DemoMode /> : null}
        <div className="text-xs text-muted-foreground">Local</div>
      </div>
    </header>
  )
}
