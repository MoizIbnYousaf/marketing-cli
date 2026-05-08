"use client"

import { m } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { fadeInUp } from "@/lib/animation/variants"
import { cn } from "@/lib/utils"

const emptyStateVariants = cva("text-center", {
  variants: {
    variant: {
      card: "rounded-xl border border-border bg-subtle/30 px-4 py-8",
      centered: "flex h-full flex-col items-center justify-center px-8",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

const iconWrapVariants = cva("mx-auto flex items-center justify-center", {
  variants: {
    variant: {
      card: "size-10 rounded-full bg-muted",
      centered: "mb-4 size-14 rounded-2xl bg-muted/60",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

const iconVariants = cva("", {
  variants: {
    variant: {
      card: "size-4.5 text-muted-foreground",
      centered: "size-7 text-muted-foreground/40",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

const titleVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      card: "mt-3 text-foreground/70",
      centered: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
} & VariantProps<typeof emptyStateVariants>

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "card",
}: EmptyStateProps) {
  return (
    <m.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(emptyStateVariants({ variant }), className)}
    >
      <div className={cn(iconWrapVariants({ variant }))}>
        <Icon className={cn(iconVariants({ variant }))} />
      </div>
      <p className={cn(titleVariants({ variant }))}>{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </m.div>
  )
}
