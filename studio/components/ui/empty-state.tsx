"use client"

import { m } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { fadeInUp } from "@/lib/animation/variants"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}) {
  return (
    <m.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col items-center justify-center h-full text-center px-8",
        className
      )}
    >
      <m.div
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 mb-4"
      >
        <Icon className="size-7 text-muted-foreground/40" />
      </m.div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </m.div>
  )
}
