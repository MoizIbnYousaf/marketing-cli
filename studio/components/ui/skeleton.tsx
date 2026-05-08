import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Shape variants for Skeleton.
//
//   - rect: bare block (callers add their own height/width). Default.
//   - text: text-line height. Pair with width utilities (w-full, w-1/2).
//   - circle: avatar-shaped placeholder. Pair with size-N.
//   - card: full-card placeholder with rounded-xl + min height.
//
// Before this primitive accepted a shape variant, every caller hand-rolled
// h-[Npx] / rounded-lg, leaving 7 different "skeleton card" sizes in
// non-ui code. The shape variant absorbs those.

const skeletonVariants = cva("bg-accent animate-pulse", {
  variants: {
    shape: {
      rect: "rounded-md",
      text: "h-4 rounded-md",
      circle: "rounded-full",
      card: "h-24 w-full rounded-xl",
    },
  },
  defaultVariants: {
    shape: "rect",
  },
})

type SkeletonProps = React.ComponentProps<"div"> &
  VariantProps<typeof skeletonVariants>

function Skeleton({ className, shape, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-shape={shape ?? "rect"}
      className={cn(skeletonVariants({ shape }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
