"use client"

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Wrench,
  CornerDownRight,
  ExternalLink,
  ArrowDown,
} from "lucide-react"
import { Favicon } from "@/components/ui/favicon"

// --- Types ---

interface TextContent {
  type: "text"
  text: string
}

interface ToolCall {
  type: "tool-call"
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

interface ToolResult {
  type: "tool-result"
  toolCallId: string
  toolName: string
  output: unknown
}

type MessageContent = TextContent | ToolCall | ToolResult

interface Message {
  role: string
  content: string | MessageContent[] | Array<Record<string, unknown>>
}

type TimelineItem =
  | { type: "text"; text: string; index: number }
  | {
      type: "tool"
      toolCallId: string
      call: ToolCall
      result?: ToolResult
      index: number
    }

interface ResearchActivityFeedProps {
  messages?: Message[]
  isRunning: boolean
}

// --- Helpers ---

function getMessageSignature(messages: Message[] | undefined): string {
  if (!messages || messages.length === 0) return "0-none-0"
  const length = messages.length
  const lastRole = messages[length - 1]?.role || "unknown"
  let contentSize = 0
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      contentSize += msg.content.length
    } else if (Array.isArray(msg.content)) {
      contentSize += msg.content.length
    }
  }
  return `${length}-${lastRole}-${contentSize}`
}

function extractSources(
  output: unknown
): Array<{ title: string; url: string }> {
  if (!output || typeof output !== "object") return []
  let obj = output as Record<string, unknown>

  if (obj.type === "json" && obj.value && typeof obj.value === "object") {
    obj = obj.value as Record<string, unknown>
  }

  const tryExtract = (arr: unknown[]) =>
    arr
      .filter(
        (s: unknown) =>
          s && typeof s === "object" && (s as Record<string, unknown>).url
      )
      .map((s: unknown) => {
        const source = s as Record<string, string>
        return { title: source.title || source.url, url: source.url }
      })

  if (Array.isArray(obj.sources)) return tryExtract(obj.sources)
  if (Array.isArray(obj.results)) return tryExtract(obj.results)
  return []
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function getToolQuery(input: Record<string, unknown>): string | null {
  const queryKeys = [
    "query",
    "objective",
    "search_query",
    "q",
    "input",
    "question",
  ]
  for (const key of queryKeys) {
    if (typeof input[key] === "string") return input[key] as string
  }
  return null
}

// --- Sub-Components ---

const ReasoningItem = memo(
  function ReasoningItem({ text }: { text: string }) {
    return (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="size-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Reasoning</span>
        </div>
        <div className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed overflow-hidden break-words min-w-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      </div>
    )
  },
  (prev, next) => prev.text === next.text
)

const ToolCallItem = memo(
  function ToolCallItem({
    call,
    result,
  }: {
    toolCallId: string
    call: ToolCall
    result?: ToolResult
  }) {
    const hasResult = !!result
    const sources = hasResult ? extractSources(result.output) : []
    const query = getToolQuery(call.input)

    return (
      <div
        className={`rounded-lg border p-3 min-w-0 overflow-hidden ${
          hasResult
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Wrench
            className={`size-3.5 shrink-0 ${
              hasResult
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-amber-600 dark:text-amber-500 animate-pulse"
            }`}
          />
          <span
            className={`text-xs font-medium ${
              hasResult ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"
            }`}
          >
            {formatToolName(call.toolName)}
          </span>
          {!hasResult && (
            <span className="text-xs text-amber-600/60 dark:text-amber-500/60">Running...</span>
          )}
        </div>

        {query && (
          <p className="text-xs text-muted-foreground mt-1.5 truncate min-w-0">
            &quot;{query}&quot;
          </p>
        )}

        {hasResult && sources.length > 0 && (
          <div className="flex gap-2.5 pl-1 mt-2 min-w-0">
            <CornerDownRight className="size-4 text-emerald-600/40 dark:text-emerald-400/40 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wide">
                {sources.length}{" "}
                {sources.length === 1 ? "Source" : "Sources"} Found
              </div>
              {sources.map((source, i) => {
                let domain = ""
                try {
                  domain = new URL(source.url).hostname.replace("www.", "")
                } catch {
                  domain = source.url
                }
                return (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border hover:border-accent/40 group transition-all min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Favicon
                      url={source.url}
                      className="size-4 rounded-sm shrink-0"
                    />
                    <span className="text-xs text-muted-foreground flex-1 group-hover:text-accent transition-colors truncate min-w-0">
                      {source.title || domain}
                    </span>
                    <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-accent" />
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  },
  (prev, next) =>
    prev.toolCallId === next.toolCallId &&
    prev.call.toolName === next.call.toolName &&
    !!prev.result === !!next.result
)

// --- Main Component ---

export const ResearchActivityFeed = ({
  messages,
  isRunning,
}: ResearchActivityFeedProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messageSignature = getMessageSignature(messages)

  const timeline = useMemo(() => {
    if (!messages || messages.length === 0) return []

    const toolCallMap = new Map<
      string,
      { call: ToolCall; result?: ToolResult; index: number }
    >()
    const textBlocks: Array<{ text: string; index: number }> = []
    let messageIndex = 0

    for (const message of messages) {
      if (message.role === "assistant") {
        if (Array.isArray(message.content)) {
          for (const item of message.content as MessageContent[]) {
            if (
              item.type === "text" ||
              (item.type as string) === "reasoning"
            ) {
              textBlocks.push({
                text: (item as TextContent).text,
                index: messageIndex++,
              })
            } else if (item.type === "tool-call") {
              toolCallMap.set(item.toolCallId, {
                call: item as ToolCall,
                index: messageIndex++,
              })
            }
          }
        } else if (typeof message.content === "string") {
          textBlocks.push({ text: message.content, index: messageIndex++ })
        }
      } else {
        messageIndex++
      }
    }

    for (const message of messages) {
      if (message.role === "tool" && Array.isArray(message.content)) {
        for (const item of message.content as MessageContent[]) {
          if (item.type === "tool-result") {
            const existing = toolCallMap.get(
              (item as ToolResult).toolCallId
            )
            if (existing) existing.result = item as ToolResult
          }
        }
      }
    }

    const items: TimelineItem[] = [
      ...textBlocks.map((block) => ({ type: "text" as const, ...block })),
      ...Array.from(toolCallMap.entries()).map(([toolCallId, toolData]) => ({
        type: "tool" as const,
        toolCallId,
        call: toolData.call,
        result: toolData.result,
        index: toolData.index,
      })),
    ]

    items.sort((a, b) => a.index - b.index)
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageSignature])

  const stats = useMemo(() => {
    let steps = 0
    let sources = 0
    for (const item of timeline) {
      steps++
      if (item.type === "tool" && item.result) {
        sources += extractSources(item.result.output).length
      }
    }
    return { steps, sources }
  }, [timeline])

  useEffect(() => {
    if (isExpanded && isRunning && !userScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [timeline.length, isExpanded, isRunning, userScrolledUp])

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80
    setUserScrolledUp(!isNearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
      setUserScrolledUp(false)
    }
  }, [])

  if (timeline.length === 0) return null

  return (
    <div className="w-full mt-4 min-w-0 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors text-left min-w-0 overflow-hidden"
      >
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-accent" />
          <span className="text-sm font-medium">Activity Feed</span>
          <span className="text-xs text-muted-foreground">
            {stats.steps} step{stats.steps !== 1 ? "s" : ""}
            {stats.sources > 0 &&
              `, ${stats.sources} source${stats.sources !== 1 ? "s" : ""}`}
          </span>
          {isRunning && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 dark:text-emerald-500">Live</span>
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="relative mt-2 min-w-0 overflow-hidden">
          <div
            ref={feedRef}
            onScroll={handleScroll}
            className="max-h-[400px] overflow-y-auto overflow-x-hidden space-y-3 pr-1 min-w-0"
          >
            {timeline.map((item) => {
              if (item.type === "text") {
                return (
                  <ReasoningItem
                    key={`text-${item.index}`}
                    text={item.text}
                  />
                )
              }
              return (
                <ToolCallItem
                  key={`tool-${item.toolCallId}`}
                  toolCallId={item.toolCallId}
                  call={item.call}
                  result={item.result}
                />
              )
            })}
            <div ref={bottomRef} />
          </div>

          {userScrolledUp && isRunning && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-2 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium shadow-lg hover:bg-accent/90 transition-colors"
            >
              <ArrowDown className="size-3" />
              Latest
            </button>
          )}
        </div>
      )}
    </div>
  )
}
