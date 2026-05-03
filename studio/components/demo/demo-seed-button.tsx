"use client"

import { useState } from "react"
import { Check, Copy, Database, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const SEED_CMD = "bun run scripts/seed-demo.ts"
const SEED_RESET_CMD = "bun run scripts/seed-demo.ts --reset"

/**
 * Surfaces the demo-seed script to the user. We don't expose seeding as an
 * HTTP endpoint because SQLite writes are server-only and the seed spec is
 * code-backed (see scripts/seed-demo.ts). The dialog copy-pastes the command
 * the user runs in their terminal.
 */
export function DemoSeedButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<"seed" | "reset" | null>(null)

  async function copy(cmd: string, key: "seed" | "reset") {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(key)
      setTimeout(() => setCopied((v) => (v === key ? null : v)), 1500)
    } catch {
      // Clipboard can fail in insecure contexts — no-op.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2" aria-label="Seed demo data">
          <Sparkles className="size-3.5" />
          Seed demo data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-4 text-accent" />
            Seed demo data
          </DialogTitle>
          <DialogDescription>
            Populates <code className="rounded bg-muted px-1 font-mono text-[11px]">marketing.db</code>{" "}
            with ~20 signals, 5 opportunities, 10 activity entries, 3 briefs, and 6 publish-log rows —
            realistic enough for screenshots, demos, and first-run walkthroughs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Run in your terminal
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 font-mono text-xs">
              <code className="flex-1">{SEED_CMD}</code>
              <button
                type="button"
                onClick={() => copy(SEED_CMD, "seed")}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] hover:border-accent/40 hover:text-foreground"
                aria-label="Copy seed command"
              >
                {copied === "seed" ? (
                  <>
                    <Check className="size-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Reset prior demo rows first
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 font-mono text-xs">
              <code className="flex-1">{SEED_RESET_CMD}</code>
              <button
                type="button"
                onClick={() => copy(SEED_RESET_CMD, "reset")}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] hover:border-accent/40 hover:text-foreground"
                aria-label="Copy reset command"
              >
                {copied === "reset" ? (
                  <>
                    <Check className="size-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Safe to run repeatedly. Demo rows are tagged with a{" "}
            <code className="rounded bg-muted px-1 font-mono">demo:</code> sentinel so{" "}
            <code className="rounded bg-muted px-1 font-mono">--reset</code> only clears seeded rows —
            real /cmo data is never touched.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
