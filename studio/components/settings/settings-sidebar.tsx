"use client"

import { useSearchParams } from "next/navigation"
import { KeyRound, Plug, FileText, Stethoscope, Trash2 } from "lucide-react"

const SECTIONS = [
  { id: "env", title: "API keys", icon: KeyRound },
  { id: "integrations", title: "Connected providers", icon: Plug },
  { id: "brand", title: "Brand file health", icon: FileText },
  { id: "doctor", title: "mktg doctor", icon: Stethoscope },
  { id: "reset", title: "Danger zone", icon: Trash2 },
] as const

export function SettingsSidebar() {
  const searchParams = useSearchParams()
  const focusPanel = searchParams.get("panel")

  return (
    <nav className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-3 md:w-60 md:border-b-0 md:border-r md:py-5">
      <ul className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                focusPanel === s.id
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <s.icon className="size-4" />
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
