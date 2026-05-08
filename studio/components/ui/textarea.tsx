import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  cn(
    "border-input placeholder:text-muted-foreground dark:bg-input/30 flex w-full rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none field-sizing-content",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ),
  {
    variants: {
      size: {
        sm: "min-h-12 px-2.5 py-1.5 text-sm",
        default: "min-h-16 px-3 py-2 text-base md:text-sm",
        lg: "min-h-24 px-4 py-3 text-base",
      },
      intent: {
        default: "",
        error: "border-destructive ring-destructive/20",
        success: "border-success/60 ring-success/15",
      },
    },
    defaultVariants: {
      size: "default",
      intent: "default",
    },
  },
)

type TextareaProps = Omit<React.ComponentProps<"textarea">, "size"> &
  VariantProps<typeof textareaVariants>

function Textarea({ className, size, intent, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-size={size ?? "default"}
      data-intent={intent ?? "default"}
      className={cn(textareaVariants({ size, intent }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
