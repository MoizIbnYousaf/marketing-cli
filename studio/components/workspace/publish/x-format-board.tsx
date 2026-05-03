"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { Calendar, ImageIcon, Loader2, MessageCircle, Repeat2, Send, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PublishManifest } from "@/lib/types/mktg"
import type { PublishIntegration } from "@/lib/types/publish"

type PublishMode = "draft" | "schedule" | "now"

const X_LIMIT = 280

export function XFormatBoard({
  adapter,
  integrations,
  selectedIntegrationIds,
  onToggleIntegration,
  onPublished,
}: {
  adapter: string
  integrations: PublishIntegration[]
  selectedIntegrationIds: string[]
  onToggleIntegration: (integration: PublishIntegration) => void
  onPublished?: () => void
}) {
  const [content, setContent] = useState("")
  const [mode, setMode] = useState<PublishMode>("draft")
  const [scheduledAt, setScheduledAt] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const xAccounts = useMemo(
    () =>
      integrations.filter((integration) =>
        ["x", "twitter"].includes(integration.providerIdentifier.toLowerCase()),
      ),
    [integrations],
  )

  const selectedXAccounts = useMemo(() => {
    const selected = xAccounts.filter((integration) =>
      selectedIntegrationIds.includes(integration.id),
    )
    return selected.length > 0 ? selected : xAccounts.slice(0, 1)
  }, [selectedIntegrationIds, xAccounts])

  const tweets = useMemo(() => splitIntoTweets(content), [content])
  const firstAccount = selectedXAccounts[0]
  const hasAccount = selectedXAccounts.length > 0
  const hasContent = content.trim().length > 0
  const needsScheduleDate = mode === "schedule" && scheduledAt.trim().length === 0
  const disabled = !hasContent || !hasAccount || needsScheduleDate || submitting

  async function submit(nextMode = mode) {
    if (disabled && nextMode === mode) return
    if (!hasContent) return toast.error("Write the post before sending it.")
    if (!hasAccount) return toast.error("Connect or select an X account first.")
    if (nextMode === "schedule" && !scheduledAt) {
      return toast.error("Choose a schedule time first.")
    }

    setSubmitting(true)
    try {
      const manifest = buildXManifest({
        adapter,
        tweets,
        integrations: selectedXAccounts,
        mode: nextMode,
        scheduledAt,
      })

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adapter, manifest, confirm: true }),
      })
      const json = (await res.json()) as
        | { ok: true; data: { published?: number; failed?: number } }
        | { ok: false; error: { message: string; fix?: string } }

      if (!json.ok) {
        toast.error(json.error.fix ? `${json.error.message} - ${json.error.fix}` : json.error.message)
        return
      }

      const count = json.data.published ?? selectedXAccounts.length
      const label = nextMode === "now" ? "sent" : nextMode === "schedule" ? "scheduled" : "saved as draft"
      toast.success(`X post ${label}`, {
        description: `${tweets.length} tweet${tweets.length === 1 ? "" : "s"} prepared for ${count} account${count === 1 ? "" : "s"}.`,
      })
      setContent("")
      setScheduledAt("")
      onPublished?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`Publish error: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden border-accent/30 bg-[radial-gradient(circle_at_top_right,rgba(207,255,38,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] py-0 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            X formatter
          </p>
          <h2 className="text-base font-semibold">Write, preview, then publish</h2>
        </div>
        <div className="flex items-center gap-2">
          <ModeButton active={mode === "draft"} onClick={() => setMode("draft")}>
            Draft
          </ModeButton>
          <ModeButton active={mode === "schedule"} onClick={() => setMode("schedule")}>
            Schedule
          </ModeButton>
          <Button
            type="button"
            size="sm"
            variant="accent"
            className="min-h-10"
            disabled={submitting || !hasContent || !hasAccount}
            onClick={() => {
              setMode("now")
              void submit("now")
            }}
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid min-h-[520px] min-w-0 [@media(min-width:1900px)]:grid-cols-[minmax(420px,1fr)_420px]">
        <section className="min-w-0 border-b border-border/70 [@media(min-width:1900px)]:border-b-0 [@media(min-width:1900px)]:border-r">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
            {xAccounts.length === 0 ? (
              <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
                No X account connected yet
              </span>
            ) : (
              xAccounts.map((account) => {
                const selected = selectedXAccounts.some((item) => item.id === account.id)
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => onToggleIntegration(account)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                      selected
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <AccountAvatar account={account} />
                    @{account.profile || account.name}
                  </button>
                )
              })
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col p-4">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the X post here. Paste a rough idea, tighten the line breaks, then publish or save it as a draft."
              className="min-h-[260px] w-full min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:ring-0 md:text-lg"
            />

            {mode === "schedule" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/50 p-3">
                <Calendar className="size-4 text-muted-foreground" />
                <Input
                  aria-label="Schedule X post"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="max-w-xs"
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  {tweets.length} tweet{tweets.length === 1 ? "" : "s"}
                </span>
                <span className={cn(tweets.some((tweet) => tweet.length > X_LIMIT) && "text-red-400")}>
                  longest {Math.max(0, ...tweets.map((tweet) => tweet.length))} / {X_LIMIT}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-10"
                  disabled={!hasContent}
                  onClick={() => setContent("")}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant={mode === "schedule" ? "accent" : "secondary"}
                  size="sm"
                  className="min-h-10 min-w-28"
                  disabled={disabled}
                  onClick={() => void submit(mode)}
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {mode === "schedule" ? "Schedule" : mode === "now" ? "Publish" : "Save draft"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-w-0 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Live X preview</p>
            <span className="rounded-full border border-border/70 px-2 py-1 text-[10px] text-muted-foreground">
              {adapter === "mktg-native" ? "Native" : "Postiz"}
            </span>
          </div>
          <div className="space-y-3">
            {tweets.length === 0 ? (
              <TweetPreview account={firstAccount} text="" index={1} total={1} />
            ) : (
              tweets.map((tweet, index) => (
                <TweetPreview
                  key={`${index}-${tweet.slice(0, 12)}`}
                  account={firstAccount}
                  text={tweet}
                  index={index + 1}
                  total={tweets.length}
                />
              ))
            )}
          </div>
          {tweets.length > 1 ? (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Thread preview is split at 280 characters. The publish backend receives each tweet with thread metadata.
            </p>
          ) : null}
        </aside>
      </div>
    </Card>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border/70 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function TweetPreview({
  account,
  text,
  index,
  total,
}: {
  account?: PublishIntegration
  text: string
  index: number
  total: number
}) {
  const overLimit = text.length > X_LIMIT
  const displayName = account?.name || "Marketing Studio"
  const profile = account?.profile || "marketingcli"

  return (
    <article className="rounded-2xl border border-border/80 bg-background/90 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AccountAvatar account={account} large />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <strong className="truncate">{displayName}</strong>
            <span className="text-muted-foreground">@{profile}</span>
            <span className="text-muted-foreground">· now</span>
            {total > 1 ? (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {index}/{total}
              </span>
            ) : null}
          </div>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
            {text || <span className="text-muted-foreground">Your formatted tweet will preview here.</span>}
          </div>
          <div className="mt-4 flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-xs">
              <MessageCircle className="size-4" /> 0
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <Repeat2 className="size-4" /> 0
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <ImageIcon className="size-4" /> media
            </span>
            <span className={cn("text-xs font-medium", overLimit && "text-red-400")}>
              {text.length}/{X_LIMIT}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function AccountAvatar({
  account,
  large = false,
}: {
  account?: PublishIntegration
  large?: boolean
}) {
  const label = account?.name || account?.profile || "Marketing Studio"
  if (account?.picture) {
    return (
      <img
        src={account.picture}
        alt={label}
        className={cn(
          "rounded-full border border-border/70 object-cover",
          large ? "size-10" : "size-5",
        )}
      />
    )
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-foreground text-background",
        large ? "size-10" : "size-5",
      )}
      aria-hidden
    >
      <X className={large ? "size-5" : "size-3"} />
    </span>
  )
}

function splitIntoTweets(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").trim()
  if (!normalized) return []

  const chunks: string[] = []
  let current = ""
  for (const paragraph of normalized.split(/\n{2,}/)) {
    const block = paragraph.trim()
    if (!block) continue
    if ((current + "\n\n" + block).trim().length <= X_LIMIT) {
      current = (current ? `${current}\n\n${block}` : block).trim()
      continue
    }
    if (current) chunks.push(current)
    if (block.length <= X_LIMIT) {
      current = block
      continue
    }
    const words = block.split(/\s+/)
    current = ""
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (next.length <= X_LIMIT) {
        current = next
      } else {
        if (current) chunks.push(current)
        current = word
      }
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function buildXManifest({
  adapter,
  tweets,
  integrations,
  mode,
  scheduledAt,
}: {
  adapter: string
  tweets: string[]
  integrations: PublishIntegration[]
  mode: PublishMode
  scheduledAt: string
}): PublishManifest {
  const date =
    mode === "schedule" && scheduledAt
      ? new Date(scheduledAt).toISOString()
      : new Date().toISOString()

  return {
    name: `studio-x-${Date.now()}`,
    items: integrations.flatMap((integration) =>
      tweets.map((tweet, index) => ({
        type: "social" as const,
        adapter,
        content: tweet,
        metadata: {
          integrationId: integration.id,
          integrationIdentifier: integration.providerIdentifier,
          providers: [integration.providerIdentifier],
          postType: mode === "draft" ? "draft" : mode === "schedule" ? "schedule" : "now",
          date,
          threadIndex: String(index + 1),
          threadTotal: String(tweets.length),
        },
      })),
    ),
  }
}
