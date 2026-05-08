import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Card radius + surface variants. Radius slot names match silverspark's
// Lane 5 hierarchy:
//
//   - panel: 1.6rem. Top-level surface, full-width sections.
//     Replaces hand-rolled rounded-[1.6rem] at pulse-page.tsx:442.
//   - card: 1rem. Interior cards, action cards, snapshot cards. Default.
//     Replaces rounded-[1.45rem]/[1.65rem] in content-library.tsx and
//     the action/snapshot card radii in pulse-page.tsx.
//   - chip: 0.75rem. Inline icon containers, small clusters.
//
// Two specials stay one-off, NOT variants: the Pulse hero at
// pulse-page.tsx:249 (rounded-[2rem]) and rounded-full pills/badges.
//
// Surface variants ship a 3-step elevation ramp on --color-surface-{1,2,3}.
// Default = `card` token; subtle pulls a lighter surface for nested cards;
// elevated uses the highest surface plus stronger shadow.
const cardVariants = cva(
  "text-card-foreground flex flex-col gap-6 border py-6 shadow-sm",
  {
    variants: {
      radius: {
        panel: "rounded-panel",
        card: "rounded-card",
        chip: "rounded-chip",
      },
      surface: {
        default: "bg-card",
        subtle: "bg-surface-1",
        elevated: "bg-surface-3 shadow-md",
      },
    },
    defaultVariants: {
      radius: "card",
      surface: "default",
    },
  },
)

type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>

function Card({ className, radius, surface, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-radius={radius ?? "default"}
      data-surface={surface ?? "default"}
      className={cn(cardVariants({ radius, surface }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
