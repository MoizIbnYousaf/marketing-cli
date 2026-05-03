"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Activity,
  BookOpen,
  Images,
  Send,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ProjectIdentityCard } from "@/components/layout/project-identity"

export const NAV_GROUPS = [
  {
    label: "Marketing Ops",
    items: [
      { title: "Pulse", href: "/dashboard", icon: Activity },
      { title: "Signals", href: "/dashboard?tab=content", icon: Images },
      { title: "Publish", href: "/dashboard?tab=publish", icon: Send },
      { title: "Brand", href: "/dashboard?tab=brand", icon: BookOpen },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = (href: string) => {
    if (href.startsWith("/dashboard/settings")) {
      return pathname.startsWith("/dashboard/settings")
    }

    if (href.includes("?tab=")) {
      const url = new URL(href, "http://localhost")
      const hrefTab = url.searchParams.get("tab")
      return pathname === "/dashboard" && searchParams.get("tab") === hrefTab
    }

    if (href === "/dashboard") {
      const tab = searchParams.get("tab")
      return pathname === "/dashboard" && (!tab || tab === "" || tab === "hq" || tab === "pulse")
    }

    return pathname.startsWith(href)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-[#0d1215]"
    >
      <SidebarHeader className="px-3 py-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
        <ProjectIdentityCard />
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] uppercase tracking-widest text-[#9da09a] group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <Sparkles className="size-3" />
          <span className="group-data-[collapsible=icon]:sr-only">powered by /cmo</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase tracking-widest text-[11px] text-[#9da09a]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "rounded-xl border border-transparent text-[#d9d3c8] transition-all duration-150 hover:bg-white/[0.045] hover:text-[#f5f0e6]",
                          active &&
                            "!border-lime/30 !bg-white/[0.075] !text-lime shadow-sm"
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(
                              "size-4",
                              active
                                ? "text-lime"
                                : "text-[#9da09a]"
                            )}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4 pt-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-2.5 shadow-sm group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          {/* Clerk UserButton stripped — local-first has no auth */}
          <div className="flex size-7 items-center justify-center rounded-full bg-lime/20 font-mono text-[10px] text-lime">
            CMO
          </div>
          <div className="group-data-[collapsible=icon]:sr-only">
            <div className="text-xs font-medium text-[#f5f0e6]">Chief Marketing Officer</div>
            <div className="font-mono text-[10px] text-[#9da09a]">local workspace</div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
