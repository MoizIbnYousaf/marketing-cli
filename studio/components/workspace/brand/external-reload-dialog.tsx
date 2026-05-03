"use client"

// components/workspace/brand/external-reload-dialog.tsx: A13/H1-45.
//
// When /cmo writes a brand file while the user has unsaved edits, the
// header banner used to offer Ignore | Reload. "Reload" clobbered the
// user's text with no preview and no confirmation: data loss. This
// dialog lets the user inspect the remote version side-by-side with
// their in-flight edits and make the choice explicitly.
//
// Three outcomes:
//   * Keep my edits: do nothing, dismiss the banner.
//   * Take /cmo's version: overwrite the editor. This is the only
//     destructive path; the button carries clear "overwrite" copy.
//   * Cancel: close the dialog without deciding (banner stays up).
//
// The diff view is intentionally simple: two labelled columns of raw
// text with matching scroll containers. A real token/line-diff is A8
// territory; what matters for this P0 is that the user can *see*
// both sides before clobbering.

import { FileText, ShieldAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  /** User's current (possibly dirty) editor content. */
  localContent: string
  /** Remote content /cmo wrote. */
  remoteContent: string
  /** Chose to keep local: close banner, don't mutate editor. */
  onKeepLocal: () => void
  /** Chose to take /cmo's version: overwrite the editor. DESTRUCTIVE. */
  onTakeRemote: () => void
}

function summarizeDelta(local: string, remote: string): string {
  const localLines = local.split("\n").length
  const remoteLines = remote.split("\n").length
  const delta = remoteLines - localLines
  const sign = delta > 0 ? "+" : ""
  return `Your draft: ${localLines} lines · /cmo's version: ${remoteLines} lines (${sign}${delta})`
}

export function ExternalReloadDialog({
  open,
  onOpenChange,
  fileName,
  localContent,
  remoteContent,
  onKeepLocal,
  onTakeRemote,
}: Props) {
  const summary = summarizeDelta(localContent, remoteContent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-accent" aria-hidden />
            /cmo rewrote <code className="font-mono text-sm">{fileName}</code> while you were editing
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Your draft (kept by default)
            </p>
            <pre
              className="h-80 overflow-auto rounded-md border border-border/70 bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
              aria-label="Your local edits"
            >
              {localContent || "(empty)"}
            </pre>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              /cmo&apos;s version
            </p>
            <pre
              className="h-80 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
              aria-label="Remote version written by /cmo"
            >
              {remoteContent || "(empty)"}
            </pre>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="text-foreground/85 leading-relaxed">
            Taking /cmo&apos;s version overwrites your in-progress edits.
            Copy what you want to keep first if you&apos;re unsure. This
            cannot be undone from the editor.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onKeepLocal} className="min-h-11">
            Keep my edits
          </Button>
          <Button
            variant="destructive"
            onClick={onTakeRemote}
            className="min-h-11"
          >
            Take /cmo&apos;s version (overwrites)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
