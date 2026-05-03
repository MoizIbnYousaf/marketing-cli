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
  return "border-white/10 bg-white/[0.04] text-[#9da09a]"
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
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#11161a]", className)}>
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
          <div className="truncate font-display text-base font-semibold text-[#f5f0e6]">
            {displayProjectName(project.name)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[#9da09a]">
            local project
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-[#0d1215] p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#9da09a]">Health</span>
          <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", healthClasses(project.health))}>
            {healthLabel(project.health)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9da09a]">Root</span>
          <span className="max-w-[220px] truncate text-right font-mono text-[11px] text-[#f5f0e6]" title={project.root}>
            {project.root}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#9da09a]">Brand</span>
          <span className="text-[#f5f0e6]">{brandReady}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#9da09a]">Native publish</span>
          <span className="text-[#f5f0e6]">{nativeStatus}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9da09a]">DB</span>
          <span className="max-w-[220px] truncate text-right font-mono text-[11px] text-[#f5f0e6]" title={project.dbPath}>
            {project.dbPath}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-[#f5f0e6] hover:bg-white/[0.08]">
          <Link href="/dashboard?tab=brand">
            <BookOpen className="size-3.5" />
            Open Brand
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-[#f5f0e6] hover:bg-white/[0.08]">
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
  const { data: project } = useSWR<ProjectIdentity>(
    `${apiBase}/api/project/current`,
    fetchProject,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (!project) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <div className="h-10 animate-pulse rounded-xl bg-white/[0.06] group-data-[collapsible=icon]:size-7" />
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-150 hover:border-lime/30 hover:bg-white/[0.065] active:scale-[0.99] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0"
        >
          <ProjectAvatar project={project} className="size-11 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:text-[10px]" />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-display text-base font-semibold leading-tight text-[#f5f0e6]">
              {displayProjectName(project.name)}
            </span>
            <span className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-widest text-[#9da09a]">
              <Folder className="size-3" />
              {project.rootLabel}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-[#9da09a] transition group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-white/10 bg-[#11161a] p-4 text-[#f5f0e6] shadow-2xl">
        <ProjectDetails project={project} />
      </PopoverContent>
    </Popover>
  )
}

export function ProjectIdentityChip() {
  const apiBase = resolveStudioApiBase()
  const { data: project } = useSWR<ProjectIdentity>(
    `${apiBase}/api/project/current`,
    fetchProject,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (!project) {
    return (
      <div className="hidden h-9 w-44 animate-pulse rounded-full border border-white/10 bg-white/[0.04] xl:block" />
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hidden max-w-[320px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left transition duration-150 hover:border-lime/25 hover:bg-white/[0.07] active:scale-[0.99] xl:flex"
        >
          <ProjectAvatar project={project} className="size-6 rounded-lg text-[10px]" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-[#f5f0e6]">
              {displayProjectName(project.name)}
            </span>
            <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-[#9da09a]">
              {project.launchIntent === "cmo" ? "/cmo launch" : "local studio"}
            </span>
          </span>
          <span className={cn("ml-1 flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider", healthClasses(project.health))}>
            <ShieldCheck className="size-3" />
            {healthLabel(project.health)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-white/10 bg-[#11161a] p-4 text-[#f5f0e6] shadow-2xl">
        <ProjectDetails project={project} />
      </PopoverContent>
    </Popover>
  )
}
