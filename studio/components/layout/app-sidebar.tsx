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
      { title: "Signals", href: "/dashboard?tab=signals", icon: Images },
      { title: "Publish", href: "/dashboard?tab=publish", icon: Send },
      { title: "Brand", href: "/dashboard?tab=brand", icon: BookOpen },
    ],
  },
  {
    label: "Library",
    items: [
      { title: "Skills", href: "/skills", icon: Sparkles },
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
      return pathname === "/dashboard" && (!tab || tab === "" || tab === "pulse")
    }

    return pathname.startsWith(href)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="px-3 py-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
        <ProjectIdentityCard />
      </SidebarHeader>

      <SidebarContent className="px-1">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase tracking-widest text-[11px] text-muted-foreground">
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
                          "rounded-xl border border-transparent text-sidebar-foreground transition-colors duration-150 hover:bg-surface-1 hover:text-foreground",
                          active &&
                            "border-lime/30 bg-surface-3 text-lime data-[active=true]:bg-surface-3 data-[active=true]:text-lime shadow-sm"
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(
                              "size-4",
                              active
                                ? "text-lime"
                                : "text-muted-foreground"
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
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span>mktg</span>
          <span aria-hidden="true">·</span>
          <span>local</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
