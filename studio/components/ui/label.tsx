import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
      intent: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        error: "text-destructive",
      },
    },
    defaultVariants: {
      size: "default",
      intent: "default",
    },
  },
)

type LabelProps = React.ComponentProps<"label"> &
  VariantProps<typeof labelVariants>

function Label({ className, size, intent, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      data-size={size ?? "default"}
      data-intent={intent ?? "default"}
      className={cn(labelVariants({ size, intent }), className)}
      {...props}
    />
  )
}

export { Label, labelVariants }
