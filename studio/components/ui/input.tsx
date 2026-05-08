import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  cn(
    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none",
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ),
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 py-1 text-sm",
        default: "h-9 px-3 py-1 text-base md:text-sm",
        lg: "h-10 px-4 py-2 text-base",
      },
      intent: {
        default: "",
        // Mirrors aria-invalid styles, opt-in for cases where validation
        // is tracked separately from the aria attribute.
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

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, size, intent, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      data-intent={intent ?? "default"}
      className={cn(inputVariants({ size, intent }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
