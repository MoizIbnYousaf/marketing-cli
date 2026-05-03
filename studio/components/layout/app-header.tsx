"use client"

import React, { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, Search } from "lucide-react"

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
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { DemoMode } from "@/components/workspace/demo-mode"
import { StudioStatus } from "./studio-status"
import { ProjectIdentityChip } from "@/components/layout/project-identity"

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "mktg studio",
  settings: "Settings",
  brands: "Brands",
  agents: "Agents",
}

const isOpaqueIdSegment = (segment: string) =>
  /^[a-z0-9_-]{12,}$/i.test(segment) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)

const formatSegmentLabel = (
  segment: string,
  prevSegment: string | undefined
) => {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]
  if (isOpaqueIdSegment(segment)) {
    if (prevSegment === "brands") return "Brand Workspace"
    if (prevSegment === "agents") return "Agent Workspace"
    return "Details"
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export const buildCrumbs = (pathname?: string | null) => {
  if (!pathname) return []
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Array<{ label: string; href: string; isLast: boolean }> = []

  segments.forEach((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const prevSegment = i > 0 ? segments[i - 1] : undefined
    const label = formatSegmentLabel(segment, prevSegment)
    const isLast = i === segments.length - 1

    crumbs.push({ label, href, isLast })
  })

  return crumbs
}

export function AppHeader() {
  const pathname = usePathname()
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
    <header className="relative flex h-18 shrink-0 items-center gap-3 border-b border-white/10 bg-[#11161a]/95 px-4 text-[#f5f0e6] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(92deg,rgba(216,255,60,0.06),transparent_35%,transparent_70%,rgba(245,240,230,0.04))]" />

      <div className="relative flex items-center gap-2">
        <SidebarTrigger className="-ml-1 rounded-lg border border-white/10 bg-white/[0.035] p-1.5 text-[#f5f0e6] hover:bg-white/[0.06]" />
        <Separator orientation="vertical" className="mx-1 h-5 bg-white/10" />
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
        <div className="hidden h-9 w-[min(34vw,320px)] items-center gap-2 rounded-md border border-white/10 bg-[#0d1215] px-3 text-xs text-[#9da09a] lg:flex">
          <Search className="size-3.5" />
          <span className="flex-1">Search anything...</span>
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#9da09a]">
            ⌘K
          </span>
        </div>
        <StudioStatus />
        <button
          type="button"
          className="hidden size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-[#9da09a] hover:bg-white/[0.06] hover:text-[#f5f0e6] sm:flex"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-[#9da09a] sm:flex">
          <span suppressHydrationWarning className="tabular-nums">
            {localTime}
          </span>
        </div>
        <DemoMode />
        <ThemeToggle />
        <div className="text-xs text-muted-foreground">Local</div>
      </div>
    </header>
  )
}
