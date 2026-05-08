"use client"

import { useMemo, useState } from "react"
import { Calendar, Loader2, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ProviderPicker } from "./provider-picker"
import {
 getCharLimit,
 type PublishIntegration,
} from "@/lib/types/publish"
import type { PublishManifest } from "@/lib/types/mktg"

type Mode = "draft" | "schedule" | "now"

export function PostComposer({
 adapter,
 integrations,
 selectedIntegrationIds,
 onToggleIntegration,
 onContentChange,
 className,
}: {
 adapter: string
 integrations: PublishIntegration[]
 selectedIntegrationIds: string[]
 onToggleIntegration: (integration: PublishIntegration) => void
 onContentChange: (next: string) => void
 className?: string
}) {
 const [content, setContent] = useState("")
 const [mode, setMode] = useState<Mode>("draft")
 const [scheduledAt, setScheduledAt] = useState<string>("")
 const [submitting, setSubmitting] = useState(false)

 const selected = useMemo(
 () => integrations.filter((i) => selectedIntegrationIds.includes(i.id)),
 [integrations, selectedIntegrationIds],
 )

 const minCharLimit = useMemo(() => {
 if (selected.length === 0) return Infinity
 return Math.min(...selected.map((i) => getCharLimit(i.providerIdentifier)))
 }, [selected])

 const overflow = content.length > minCharLimit
 const empty = content.trim().length === 0
 const noProviders = selected.length === 0
 const disabled = empty || noProviders || submitting || overflow

 function updateContent(next: string) {
 setContent(next)
 onContentChange(next)
 }

 async function submit() {
 if (disabled) return
 setSubmitting(true)
 try {
 const manifest: PublishManifest = buildManifest({
 adapter,
 content,
 integrations: selected,
 mode,
 scheduledAt,
 })

 const res = await fetch("/api/publish", {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 adapter,
 manifest,
 confirm: true,
 }),
 })
 const json = (await res.json()) as
 | {
 ok: true
 data: {
 published?: number
 failed?: number
 adapters?: Array<{
 adapter: string
 published?: number
 failed?: number
 results?: Array<{
 status: "published" | "failed" | "skipped"
 detail: string
 /** Server-side follow-up: per-item post type so the UI
 * can stop inferring from `mode`. Optional until the
 * marketing-cli adapter starts emitting it. */
 postType?: "now" | "scheduled" | "draft"
 }>
 }>
 }
 }
 | { ok: false; error: { code: string; message: string; fix?: string } }

 if (!json.ok) {
 const message = json.error?.message ?? "Publish failed"
 const fix = json.error?.fix
 toast.error(fix ? `${message} -- ${fix}` : message)
 return
 }

 // A16 / H1-55: toast reads SERVER truth, not the requested `mode`.
 // Postiz v1 silently coerces everything to draft -- claiming
 // "published" when the user asked for `now` is a trust bug.
 //
 // Precedence:
 // 1. If the adapter reports per-item `postType`, use the modal
 // value across items (forward-compatible with the marketing-cli follow-up).
 // 2. Otherwise fall back to the static rule we know today:
 // postiz + any mode → "saved as draft" with an inline caveat
 // about publishing from the Postiz UI.
 // 3. For other adapters, trust the requested mode (they do what
 // you asked; this branch is postiz-specific).
 const successCount = json.data?.published ?? selected.length
 const failedCount = json.data?.failed ?? 0
 const adapterResult = json.data?.adapters?.[0]
 const postTypeCounts = (adapterResult?.results ?? []).reduce<
 Record<"now" | "scheduled" | "draft" | "unknown", number>
 >(
 (acc, r) => {
 const t = r.postType ?? "unknown"
 acc[t] = (acc[t] ?? 0) + 1
 return acc
 },
 { now: 0, scheduled: 0, draft: 0, unknown: 0 },
 )
 const hasExplicitPostType =
 postTypeCounts.now + postTypeCounts.scheduled + postTypeCounts.draft > 0

 const providerWord = `provider${successCount === 1 ? "" : "s"}`
 let message: string
 let description: string | undefined

 if (hasExplicitPostType) {
 // Server knows what actually happened. Use the modal bucket.
 const buckets = (["draft", "scheduled", "now"] as const).filter(
 (b) => postTypeCounts[b] > 0,
 )
 const label =
 buckets.length === 1
 ? buckets[0] === "draft"
 ? "saved as draft"
 : buckets[0] === "scheduled"
 ? "scheduled"
 : "published"
 : "submitted with mixed post types"
 message = `Post ${label} on ${successCount} ${providerWord}`
 } else {
 // Adapter hasn't been taught to report postType yet. We know
 // from the docs (CLAUDE.md §Postiz, postiz-api-reference.md) that
 // Postiz v1 creates drafts only, so call that out explicitly
 // instead of repeating the user's requested mode back at them.
 message = `Post saved as draft on ${successCount} ${providerWord}`
 description =
 adapter === "mktg-native"
 ? mode === "now"
 ? "The native backend marked this as published locally and stored it in the workspace queue."
 : mode === "schedule"
 ? "The native backend stored the scheduled post locally in the workspace queue."
 : "The native backend stored this draft locally in the workspace queue."
 : mode === "now"
 ? "Postiz v1 creates drafts only -- publish from the Postiz UI when ready."
 : mode === "schedule"
 ? "Postiz v1 stores this as a draft with your scheduled-at metadata; confirm in Postiz."
 : undefined
 }

 if (failedCount > 0) {
 toast.warning(message, {
 description: `${failedCount} failed. ${description ?? ""}`.trim(),
 })
 } else {
 toast.success(message, description ? { description } : undefined)
 }
 updateContent("")
 setScheduledAt("")
 } catch (err) {
 const message = err instanceof Error ? err.message : String(err)
 toast.error(`Publish error: ${message}`)
 } finally {
 setSubmitting(false)
 }
 }

 return (
 <Card className={cn("gap-4 py-4", className)} data-demo-id="publish-composer">
 <div className="flex items-center justify-between px-4">
 <h3 className="flex items-center gap-2 text-sm font-semibold">
 <Sparkles className="size-4 text-accent" />
 Compose post
 </h3>
 <ModeToggle mode={mode} onChange={setMode} />
 </div>

 <div className="space-y-3 px-4">
 <ProviderPicker
 integrations={integrations}
 selectedIntegrationIds={selectedIntegrationIds}
 onToggle={onToggleIntegration}
 />

 <Textarea
 value={content}
 onChange={(e) => updateContent(e.target.value)}
 placeholder={
 adapter === "mktg-native"
 ? "Write once for the native agent-first publish backend."
 : "Write once for the Postiz-backed multi-platform publish flow."
 }
 className="min-h-[140px] resize-y font-mono text-sm leading-relaxed"
 />

 <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
 {selected.length === 0 ? (
 <span>Select at least one account.</span>
 ) : (
 <span>
 Posting to{" "}
 <strong className="text-foreground">{selected.length}</strong> account
 {selected.length === 1 ? "" : "s"}.
 </span>
 )}
 {selected.length > 0 && (
 <span
 className={cn(
 "ml-auto font-medium",
 overflow ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
 )}
 >
 {content.length} / {minCharLimit === Infinity ? "--" : minCharLimit}
 {overflow && " · over limit on the strictest provider"}
 </span>
 )}
 </div>

 {mode === "schedule" && (
 <div className="flex items-center gap-2">
 <Calendar className="size-4 text-muted-foreground" />
 <Input
 aria-label="Scheduled at"
 type="datetime-local"
 value={scheduledAt}
 onChange={(e) => setScheduledAt(e.target.value)}
 className="max-w-xs"
 />
 </div>
 )}

 <div className="flex items-center justify-end gap-2 pt-1">
 {/* A19 / G2-03: demo-critical publish actions meet 44x44 on
 mobile. Using min-h-11 on the shadcn sm-size variants
 instead of bumping globally so density stays tight on
 desktop where targets don't dominate. */}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => updateContent("")}
 disabled={empty}
 className="min-h-11"
 >
 Clear
 </Button>
 <Button
 type="button"
 variant="accent"
 size="sm"
 disabled={disabled}
 onClick={submit}
 className="min-h-11 min-w-24"
 >
 {submitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 Sending…
 </>
 ) : (
 <>
 <Send className="size-3.5" />
 {modeLabel(mode)}
 </>
 )}
 </Button>
 </div>
 </div>
 </Card>
 )
}

function ModeToggle({
 mode,
 onChange,
}: {
 mode: Mode
 onChange: (next: Mode) => void
}) {
 const modes: { value: Mode; label: string }[] = [
 { value: "draft", label: "Draft" },
 { value: "schedule", label: "Schedule" },
 { value: "now", label: "Post now" },
 ]
 return (
 <div
 role="radiogroup"
 aria-label="Publish mode"
 className="inline-flex rounded-md border border-border/70 bg-background/60 p-0.5 text-[11px] font-medium"
 >
 {modes.map((m) => (
 <button
 key={m.value}
 type="button"
 role="radio"
 aria-checked={mode === m.value}
 onClick={() => onChange(m.value)}
 className={cn(
 // A19 / G2-03: 44x44 min tap-target on mobile; px-3 keeps
 // the visual chip density tight on desktop.
 "min-h-11 min-w-11 rounded-[5px] px-3 py-1 transition-colors",
 mode === m.value
 ? "bg-accent/15 text-accent"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 {m.label}
 </button>
 ))}
 </div>
 )
}

function modeLabel(mode: Mode): string {
 if (mode === "draft") return "Save draft"
 if (mode === "schedule") return "Schedule"
 return "Post now"
}

function buildManifest({
 adapter,
 content,
 integrations,
 mode,
 scheduledAt,
}: {
 adapter: string
 content: string
 integrations: PublishIntegration[]
 mode: Mode
 scheduledAt: string
}): PublishManifest {
 const date =
 mode === "schedule" && scheduledAt
 ? new Date(scheduledAt).toISOString()
 : new Date().toISOString()

 return {
 name: `studio-${Date.now()}`,
 items: integrations.map((integration) => ({
 type: "social" as const,
 adapter,
 content,
 metadata: {
 integrationId: integration.id,
 integrationIdentifier: integration.providerIdentifier,
 providers: [integration.providerIdentifier],
 postType: mode === "draft" ? "draft" : mode === "schedule" ? "schedule" : "now",
 date,
 },
 })),
 }
}
