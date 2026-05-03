"use client"

import { useEffect, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import useSWR from "swr"
import {
  LayoutDashboard,
  Images,
  Send,
  Settings,
  RefreshCw,
  Trash2,
  FileText,
  Stethoscope,
  Zap,
  BookOpen,
  Terminal,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Skill {
  name: string
  slug: string
  description?: string
  category?: string
}

interface SkillsResponse {
  ok: boolean
  data: { skills: Skill[] }
}

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Pulse", href: "/dashboard", icon: LayoutDashboard },
  { label: "Signals", href: "/dashboard?tab=content", icon: Images },
  { label: "Publish", href: "/dashboard?tab=publish", icon: Send },
  { label: "Brand", href: "/dashboard?tab=brand", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
]

// ── Hardcoded playbooks from /cmo ────────────────────────────────────────────

const PLAYBOOKS = [
  "Full Product Launch",
  "Content Engine",
  "Founder Voice Rebrand",
  "Conversion Audit",
  "Retention Recovery",
  "Visual Identity",
  "Video Content",
  "Email Infrastructure",
  "SEO Authority Build",
  "Newsletter Launch",
]

// ── Fetcher ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<SkillsResponse>

// ── Main Palette ──────────────────────────────────────────────────────────────

interface PaletteProps {
  open: boolean
  onClose: () => void
}

export function Palette({ open, onClose }: PaletteProps) {
  const router = useRouter()
  const [runningSkill, setRunningSkill] = useState<string | null>(null)
  const [runningPlaybook, setRunningPlaybook] = useState<string | null>(null)

  const { data: skillsData } = useSWR<SkillsResponse>(
    open ? "/api/skills" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const skills: Skill[] = skillsData?.data?.skills ?? []

  // Close on Escape is handled by cmdk itself; we also need to trap focus.
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  const navigate = useCallback(
    (href: string) => {
      onClose()
      router.push(href)
    },
    [onClose, router]
  )

  async function runSkill(slug: string) {
    setRunningSkill(slug)
    onClose()
    try {
      await fetch("/api/skill/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: slug }),
      })
    } finally {
      setRunningSkill(null)
    }
  }

  async function runPlaybook(name: string) {
    setRunningPlaybook(name)
    onClose()
    try {
      await fetch("/api/cmo/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    } finally {
      setRunningPlaybook(null)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <Command
          className={cn(
            "pointer-events-auto w-full max-w-[640px] rounded-xl border border-border bg-background shadow-2xl overflow-hidden",
            "text-foreground"
          )}
          loop
          shouldFilter
        >
          <div className="flex items-center border-b border-border px-4">
            <Terminal className="size-4 text-muted-foreground shrink-0 mr-3" />
            <Command.Input
              placeholder="Search skills, navigate, run playbooks…"
              className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
                <Command.Item
                  key={label}
                  value={`navigate ${label}`}
                  onSelect={() => navigate(href)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Skills */}
            {skills.length > 0 && (
              <Command.Group
                heading="Run skill"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {skills.map((skill) => (
                  <Command.Item
                    key={skill.slug}
                    value={`skill ${skill.slug} ${skill.name} ${skill.description ?? ""}`}
                    onSelect={() => runSkill(skill.slug)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground"
                    )}
                  >
                    <Zap className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{skill.name}</span>
                      {skill.description && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          {skill.description.slice(0, 60)}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                      {skill.slug}
                    </span>
                    {runningSkill === skill.slug && (
                      <span className="text-xs text-primary animate-pulse">running…</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Playbooks */}
            <Command.Group
              heading="Run playbook"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {PLAYBOOKS.map((name) => (
                <Command.Item
                  key={name}
                  value={`playbook ${name}`}
                  onSelect={() => runPlaybook(name)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                  )}
                >
                  <BookOpen className="size-4 text-muted-foreground shrink-0" />
                  {name}
                  {runningPlaybook === name && (
                    <span className="ml-auto text-xs text-primary animate-pulse">running…</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Command.Item
                value="refresh brand brand files"
                onSelect={async () => {
                  onClose()
                  await fetch("/api/brand/refresh", { method: "POST" })
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                  "aria-selected:bg-accent aria-selected:text-accent-foreground"
                )}
              >
                <RefreshCw className="size-4 text-muted-foreground shrink-0" />
                Refresh brand
              </Command.Item>

              <Command.Item
                value="show mktg doctor health check"
                onSelect={() => navigate("/settings?panel=doctor")}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                  "aria-selected:bg-accent aria-selected:text-accent-foreground"
                )}
              >
                <Stethoscope className="size-4 text-muted-foreground shrink-0" />
                Show mktg doctor
              </Command.Item>

              <Command.Item
                value="open env local settings"
                onSelect={async () => {
                  onClose()
                  await fetch("/api/settings/open-env", { method: "POST" })
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                  "aria-selected:bg-accent aria-selected:text-accent-foreground"
                )}
              >
                <FileText className="size-4 text-muted-foreground shrink-0" />
                Open .env.local
              </Command.Item>

              <Command.Item
                value="seed demo data sample fixtures"
                onSelect={() => {
                  onClose()
                  navigator.clipboard?.writeText("bun run scripts/seed-demo.ts").catch(() => {})
                  router.push("/settings?panel=demo")
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none",
                  "aria-selected:bg-accent aria-selected:text-accent-foreground"
                )}
              >
                <Sparkles className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1">Seed demo data</span>
                <span className="font-mono text-[10px] text-muted-foreground">scripts/seed-demo.ts</span>
              </Command.Item>

              <Command.Item
                value="reset brand dangerous delete"
                onSelect={async () => {
                  if (!confirm("Reset all brand files? This cannot be undone.")) return
                  onClose()
                  await fetch("/api/brand/reset?confirm=true", { method: "POST" })
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none text-destructive",
                  "aria-selected:bg-destructive/10 aria-selected:text-destructive"
                )}
              >
                <Trash2 className="size-4 shrink-0" />
                Reset brand (dangerous)
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> select
            </span>
            <span>
              <kbd className="font-mono">Esc</kbd> close
            </span>
            <span className="ml-auto">
              {skills.length > 0 ? `${skills.length} skills loaded` : "loading skills…"}
            </span>
          </div>
        </Command>
      </div>
    </>
  )
}
