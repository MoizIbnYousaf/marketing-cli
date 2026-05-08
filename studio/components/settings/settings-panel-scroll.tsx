"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Scrolls the Settings page to the section requested via ?panel=<id>.
 *
 * Lives as a sibling of <SettingsPanel> so the panel itself can stay a
 * server component. SettingsPanel transitively imports BrandHealthSection,
 * which uses `node:fs`; if SettingsPanel itself were "use client", Next 16 +
 * Turbopack would refuse to bundle the route ("chunking context does not
 * support external modules: node:fs"). Splitting the scroll handler into
 * this leaf-level client component keeps the server tree intact.
 *
 * The handler runs on initial mount AND every time `?panel=` changes (which
 * is exactly when the user clicks an item in <SettingsSidebar>). A ref
 * guards re-scrolling on the same value across re-renders so a stray
 * re-mount or focus loss doesn't yank the user back to the top of the
 * targeted section.
 */
export function SettingsPanelScroll() {
  const searchParams = useSearchParams()
  const panel = searchParams.get("panel")
  const lastScrolledPanel = useRef<string | null>(null)

  useEffect(() => {
    if (!panel) return
    if (lastScrolledPanel.current === panel) return
    const target = document.getElementById(panel)
    if (!target) return
    lastScrolledPanel.current = panel
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [panel])

  return null
}
