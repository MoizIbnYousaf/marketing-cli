export type KeyScope = "global" | "dashboard"
export type KeyGroup = "Navigation" | "Actions" | "Help"

export interface Keybinding {
  /** Key sequence. Single entry = single keypress. Two entries = chord. */
  sequence: readonly [string] | readonly [string, string]
  scope: KeyScope
  description: string
  group: KeyGroup
  /** Stable id used by consumers to hook dispatch. */
  id: string
}

export const CHORD_WINDOW_MS = 600

export const KEYMAP: readonly Keybinding[] = [
  // Global
  { id: "help", sequence: ["?"], scope: "global", description: "Show keyboard shortcuts", group: "Help" },
  { id: "palette", sequence: ["/"], scope: "global", description: "Focus command palette", group: "Actions" },

  // Dashboard tab navigation (g-prefix)
  { id: "nav:hq", sequence: ["g", "h"], scope: "dashboard", description: "Go to HQ", group: "Navigation" },
  { id: "nav:hq-legacy", sequence: ["g", "p"], scope: "dashboard", description: "Go to HQ", group: "Navigation" },
  { id: "nav:content", sequence: ["g", "c"], scope: "dashboard", description: "Go to Content", group: "Navigation" },
  { id: "nav:publish", sequence: ["g", "u"], scope: "dashboard", description: "Go to Publish", group: "Navigation" },
  { id: "nav:brand", sequence: ["g", "b"], scope: "dashboard", description: "Go to Brand", group: "Navigation" },
  { id: "nav:settings", sequence: ["g", ","], scope: "dashboard", description: "Open Settings", group: "Navigation" },
] as const

export function formatSequence(seq: readonly string[]): string {
  return seq.join(" ")
}

export function isTypingContext(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if ((el as HTMLElement).isContentEditable) return true
  // cmdk / role=textbox
  const role = el.getAttribute?.("role")
  return role === "textbox" || role === "combobox"
}
