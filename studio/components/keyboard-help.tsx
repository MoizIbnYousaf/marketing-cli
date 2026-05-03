"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { KEYMAP, type KeyGroup } from "@/lib/keybindings"

const GROUP_ORDER: KeyGroup[] = ["Navigation", "Actions", "Help"]

function Kbd({ keys }: { keys: readonly string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}

interface KeyboardHelpProps {
  open: boolean
  onClose: () => void
}

export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    rows: KEYMAP.filter((k) => k.group === group),
  })).filter((g) => g.rows.length > 0)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">?</kbd>{" "}
            anywhere in the dashboard to reopen this overlay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {grouped.map(({ group, rows }) => (
            <section key={group}>
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </h3>
              <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 bg-background/60 px-3 py-2 text-sm"
                  >
                    <span>{row.description}</span>
                    <Kbd keys={row.sequence} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Tip: single-letter shortcuts are ignored while you&apos;re typing in an input or text area.
        </p>
      </DialogContent>
    </Dialog>
  )
}
