"use client"

import { m } from "framer-motion"
import { Newspaper, TrendingUp, ExternalLink } from "lucide-react"
import { scaleIn, staggerItem } from "@/lib/animation/variants"
import type { Brief } from "@/lib/types/briefs"

const TopStoryCard = ({
  story,
  index,
}: {
  story: Brief["topStories"][number]
  index: number
}) => (
  <m.div
    variants={staggerItem}
    className="group rounded-lg border border-border p-4 hover:border-accent/30 hover:shadow-sm transition-all"
  >
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold mt-0.5">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1.5"
        >
          <h4 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent transition-colors">
            {story.title}
          </h4>
        </a>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2 break-words">
          {story.summary}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          <span className="font-semibold text-muted-foreground">{story.source}</span>
          <span>&#183;</span>
          <span>{story.publishedAt}</span>
        </div>
        <div className="flex items-start gap-1.5 rounded-md bg-accent/5 border border-accent/10 px-3 py-2">
          <TrendingUp className="size-3 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed break-words font-medium">
            {story.whyItMatters}
          </p>
        </div>
        {story.url && (
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-accent/10 border border-accent/25 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 hover:border-accent/40 transition-all"
          >
            <ExternalLink className="size-3.5" />
            View on {story.source} &rarr;
          </a>
        )}
      </div>
    </div>
  </m.div>
)

export const TopStoriesGrid = ({
  stories,
  emergingSignals,
}: {
  stories: Brief["topStories"]
  emergingSignals?: Brief["emergingSignals"]
}) => (
  <m.div variants={scaleIn} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Newspaper className="size-3" />
      Top Stories ({stories.length})
    </h3>
    <div className="space-y-2">
      {stories.map((story, i) => (
        <TopStoryCard key={i} story={story} index={i} />
      ))}
    </div>
    {emergingSignals && emergingSignals.length > 0 && (
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="size-3" />
          Emerging Signals
        </h4>
        {emergingSignals.map((signal, i) => {
          const isUrl = signal.source?.startsWith("http")
          return (
            <m.div
              key={i}
              variants={staggerItem}
              className="rounded-lg border-l-2 border-l-accent/50 border border-border/40 bg-muted/30 p-3"
            >
              <h4 className="text-sm font-medium text-foreground mb-1">{signal.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{signal.summary}</p>
              {signal.source && (
                isUrl ? (
                  <a
                    href={signal.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 rounded-full bg-muted/60 border border-border/50 px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/10 hover:border-accent/30 transition-all"
                  >
                    <ExternalLink className="size-2.5" />
                    View Source &rarr;
                  </a>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/60 font-medium">
                    {signal.source}
                  </p>
                )
              )}
            </m.div>
          )
        })}
      </div>
    )}
  </m.div>
)
