"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, RotateCcw, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"
import { resolveStudioApiBase } from "@/lib/studio-api-base"

type ResetSuccess = {
  filesReset: string[]
  backup:
    | { skipped: true; reason: string }
    | { skipped: false; path: string; fileCount: number; sizeBytes: number }
  note: string
}

function formatBytes(b: number): string {
  if (!Number.isFinite(b) || b <= 0) return "0 B"
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export function ResetSection() {
  const STUDIO_API_BASE = resolveStudioApiBase()
  const router = useRouter()
  const [resetting, setResetting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typedConfirm, setTypedConfirm] = useState("")

  const canConfirm = typedConfirm === "DELETE" && !resetting

  async function resetBrand() {
    if (!canConfirm) return
    setResetting(true)
    try {
      const res = await fetch(`${STUDIO_API_BASE}/api/brand/reset?confirm=true`, {
        method: "POST",
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        data?: ResetSuccess
      }
      if (!res.ok || json?.ok !== true) {
        const msg = extractErrorMessage(json, `Reset failed (HTTP ${res.status})`)
        const fix = extractErrorFix(json)
        toast.error(msg, fix ? { description: fix } : undefined)
        return
      }

      const backup = json.data?.backup
      if (backup && !backup.skipped) {
        // Surface the backup path in the success toast so users know where
        // their data went. Path is repo-relative (e.g.
        // `.mktg/brand-backups/brand-2026-04-21T06-10-30.zip`).
        toast.success("Brand files reset", {
          description: `Backup saved: ${backup.path} (${backup.fileCount} files, ${formatBytes(backup.sizeBytes)}). Run onboarding to re-populate.`,
          duration: 10_000,
        })
      } else if (backup && backup.skipped) {
        toast.success("Brand files reset", {
          description: `${backup.reason}. Run onboarding to re-populate.`,
        })
      } else {
        toast.success("Brand files reset. Run onboarding to re-populate.")
      }
      setConfirmOpen(false)
      setTypedConfirm("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed")
    } finally {
      setResetting(false)
    }
  }

  function openConfirm() {
    setTypedConfirm("")
    setConfirmOpen(true)
  }

  function reRunOnboarding() {
    try {
      localStorage.removeItem("mktg-studio:onboarding")
    } catch {
      // ignore storage errors
    }
    router.push("/onboarding")
  }

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10">
          <Trash2 className="size-4 text-rose-500/80" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Danger zone</h2>
          <p className="text-xs text-muted-foreground">
            Destructive actions. All reset calls use{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">?confirm=true</code>.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Re-run onboarding</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Walk through the wizard again to re-enter keys and spawn the 3 foundation research
              agents. Brand files are kept.
            </p>
          </div>
          <Button onClick={reRunOnboarding} size="sm" variant="outline" className="gap-2">
            <RotateCcw className="size-3.5" />
            Re-run
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Reset brand files</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Resets every file in{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">brand/</code>{" "}
              to templates. Your current files are{" "}
              <span className="font-medium text-foreground">zipped to a backup first</span>{" "}
              so nothing is permanently lost.
            </p>
          </div>
          <Button
            onClick={openConfirm}
            disabled={resetting}
            size="sm"
            variant="destructive"
            className="gap-2"
          >
            {resetting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Reset brand
          </Button>
        </div>
      </div>

      {/* Typed-DELETE confirmation (H1-109 / A15) -- replaces the native
          confirm() whose "OK" is a single click. Backup pathway is
          surfaced here too so the user knows recovery is real. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!resetting) {
            setConfirmOpen(next)
            if (!next) setTypedConfirm("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Trash2 className="size-4" aria-hidden />
              Reset all brand files?
            </DialogTitle>
            <DialogDescription>
              Every file in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">brand/</code>{" "}
              will be reset to an empty template. Voice profile, audience, positioning,
              competitors, landscape, learnings -- all replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <p className="text-foreground/85 leading-relaxed">
                Before anything is overwritten, the studio zips your current{" "}
                <code className="rounded bg-muted px-1 py-0 font-mono text-[10px]">brand/</code>{" "}
                to{" "}
                <code className="rounded bg-muted px-1 py-0 font-mono text-[10px]">
                  .mktg/brand-backups/brand-&lt;timestamp&gt;.zip
                </code>
                . If the backup fails, the reset aborts.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm" className="text-xs">
                Type{" "}
                <code className="rounded bg-muted px-1 py-0 font-mono text-[11px]">DELETE</code>{" "}
                to confirm
              </Label>
              <Input
                id="reset-confirm"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={resetting}
                className="font-mono"
                aria-describedby="reset-confirm-help"
              />
              <p id="reset-confirm-help" className="text-[11px] text-muted-foreground">
                Case-sensitive. Must match exactly.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!resetting) {
                  setConfirmOpen(false)
                  setTypedConfirm("")
                }
              }}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={resetBrand}
              disabled={!canConfirm}
              className="gap-2"
            >
              {resetting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Back up &amp; reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
