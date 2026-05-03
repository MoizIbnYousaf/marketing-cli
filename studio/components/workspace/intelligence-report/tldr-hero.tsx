"use client"

import { m } from "framer-motion"
import { Lightbulb } from "lucide-react"
import { scaleIn } from "@/lib/animation/variants"

export const TldrHero = ({ text }: { text: string }) => (
  <m.div
    variants={scaleIn}
    className="relative rounded-xl border border-accent/20 bg-gradient-to-br from-accent/8 via-accent/[0.03] to-transparent p-6 overflow-hidden"
  >
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent/60 to-transparent" />
    <div className="flex items-center gap-2 mb-3">
      <Lightbulb className="size-4 text-accent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        Today&apos;s Signal
      </span>
    </div>
    <p className="text-lg leading-relaxed font-serif font-medium text-foreground tracking-tight">
      {text}
    </p>
  </m.div>
)
