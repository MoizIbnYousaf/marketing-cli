"use client"

import Link from "next/link"
import useSWR from "swr"
import { BookOpen, ChevronDown, Folder, Settings, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { resolveStudioApiBase } from "@/lib/studio-api-base"

type ProjectLogo =
  | { kind: "image"; path: string; url: string; contentType: string }
  | { kind: "initials"; initials: string }

type ProjectIdentity = {
  name: string
  root: string
  rootLabel: string
  health: "ready" | "incomplete" | "needs-setup" | "unknown"
  brand: {
    populated: number
    template: number
    missing: number
    stale: number
    total: number
  }
  dbPath: string
  sessionId: string | null
  launchIntent: string | null
  logo: ProjectLogo
  nativePublish: {
    configured: boolean
    providerCount: number
    postCount: number
  }
  fetchedAt: string
}

type ProjectCurrentResponse = {
  ok: boolean
  data: ProjectIdentity
}

const fetchProject = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = (await res.json()) as ProjectCurrentResponse
  return body.data
}

function logoUrl(project: ProjectIdentity): string | null {
  if (project.logo.kind !== "image") return null
  const apiBase = resolveStudioApiBase()
  return `${apiBase}${project.logo.url}`
}

function healthLabel(health: ProjectIdentity["health"]): string {
  if (health === "ready") return "ready"
  if (health === "incomplete") return "needs brand"
  if (health === "needs-setup") return "setup needed"
  return "unknown"
}

function healthClasses(health: ProjectIdentity["health"]): string {
  if (health === "ready") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
  if (health === "incomplete") return "border-amber-400/25 bg-amber-400/10 text-amber-200"
  if (health === "needs-setup") return "border-rose-400/25 bg-rose-400/10 text-rose-200"
  return "border-border bg-surface-1 text-muted-foreground"
}

function displayProjectName(name: string): string {
  return name
    .split(/([\s_-]+)/)
    .map((part) => {
      if (/^[\s_-]+$/.test(part)) return part === "_" ? " " : part.replace(/-/g, " ")
      if (part.toLowerCase() === "cli") return "CLI"
      if (part.toLowerCase() === "cmo") return "CMO"
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

function ProjectAvatar({
  project,
  className,
}: {
  project: ProjectIdentity
  className?: string
}) {
  const src = logoUrl(project)
  if (src) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${project.name} logo`} className="size-full object-cover" />
      </span>
    )
  }

  const initials = project.logo.kind === "initials" ? project.logo.initials : "MK"
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl border border-lime/30 bg-lime/15 font-display text-sm font-bold tracking-wide text-lime", className)}>
      {initials}
    </span>
  )
}

function ProjectDetails({ project }: { project: ProjectIdentity }) {
  const brandReady = `${project.brand.populated}/${project.brand.total || 0} brand files populated`
  const nativeStatus = project.nativePublish.configured
    ? `${project.nativePublish.providerCount} provider${project.nativePublish.providerCount === 1 ? "" : "s"} configured`
    : "not configured yet"

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ProjectAvatar project={project} className="size-11" />
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold text-foreground">
            {displayProjectName(project.name)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            local project
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-sidebar p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Health</span>
          <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", healthClasses(project.health))}>
            {healthLabel(project.health)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Root</span>
          <span className="max-w-[220px] truncate text-right font-mono text-[11px] text-foreground" title={project.root}>
            {project.root}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Brand</span>
          <span className="text-foreground">{brandReady}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Native publish</span>
          <span className="text-foreground">{nativeStatus}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">DB</span>
          <span className="max-w-[220px] truncate text-right font-mono text-[11px] text-foreground" title={project.dbPath}>
            {project.dbPath}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="border-border bg-surface-1 text-foreground hover:bg-surface-3">
          <Link href="/dashboard?tab=brand">
            <BookOpen className="size-3.5" />
            Open Brand
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-border bg-surface-1 text-foreground hover:bg-surface-3">
          <Link href="/settings">
            <Settings className="size-3.5" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function ProjectIdentityCard() {
  const apiBase = resolveStudioApiBase()
  const { data: project, error: projectError } = useSWR<ProjectIdentity>(
    `${apiBase}/api/project/current`,
    fetchProject,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (!project) {
    // Distinguish errored-to-undefined from still-loading: a fetch failure
    // shows a muted rose dot on the skeleton so the user sees the chrome is
    // stale rather than guessing the data is still arriving.
    if (projectError) {
      return (
        <div
          className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          title="Project identity unavailable. Check that the studio API is running."
          role="status"
        >
          <span className="size-1.5 rounded-full bg-rose-500/80" />
          <span className="group-data-[collapsible=icon]:hidden">Project unavailable</span>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <div className="h-10 animate-pulse rounded-xl bg-surface-2 group-data-[collapsible=icon]:size-7" />
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-1 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-150 hover:border-lime/30 hover:bg-surface-2 active:scale-[0.99] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
        >
          <ProjectAvatar project={project} className="size-11 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:text-[10px]" />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-display text-base font-semibold leading-tight text-foreground">
              {displayProjectName(project.name)}
            </span>
            <span className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Folder className="size-3" />
              {project.rootLabel}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground transition group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <ProjectDetails project={project} />
      </PopoverContent>
    </Popover>
  )
}

export function ProjectIdentityChip() {
  const apiBase = resolveStudioApiBase()
  const { data: project, error: projectError } = useSWR<ProjectIdentity>(
    `${apiBase}/api/project/current`,
    fetchProject,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (!project) {
    if (projectError) {
      return (
        <div
          className="hidden h-9 max-w-[320px] items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground xl:flex"
          title="Project identity unavailable. Check that the studio API is running."
          role="status"
        >
          <span className="size-1.5 rounded-full bg-rose-500/80" />
          <span>Project unavailable</span>
        </div>
      )
    }
    return (
      <div className="hidden h-9 w-44 animate-pulse rounded-full border border-border bg-surface-1 xl:block" />
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hidden max-w-[320px] items-center gap-2 rounded-full border border-border bg-surface-1 px-2.5 py-1.5 text-left transition duration-150 hover:border-lime/25 hover:bg-surface-2 active:scale-[0.99] xl:flex"
        >
          <ProjectAvatar project={project} className="size-6 rounded-lg text-[10px]" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-foreground">
              {displayProjectName(project.name)}
            </span>
            <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {project.launchIntent === "cmo" ? "/cmo launch" : "local studio"}
            </span>
          </span>
          <span className={cn("ml-1 flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider", healthClasses(project.health))}>
            <ShieldCheck className="size-3" />
            {healthLabel(project.health)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <ProjectDetails project={project} />
      </PopoverContent>
    </Popover>
  )
}
