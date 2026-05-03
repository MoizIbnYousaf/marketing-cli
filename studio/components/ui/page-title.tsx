import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// PageTitle — the canonical h1 for every route.
//
// Three purposes:
//   1. Satisfies WCAG page-has-heading-one (G5-01): every rendered route
//      now gets exactly one <h1>.
//   2. Overrides the (now-removed) global `h1 { text-transform: uppercase }`
//      rule that was spoiling page titles and blocking this same audit
//      finding (G1 F13). Local styling keeps mixed-case on purpose.
//   3. Gives routes a single place to render title + description + an
//      optional trailing actions slot, so the visual rhythm across
//      tabs stays consistent without every page reimplementing it.
//
// Use at the top of every route's main content region:
//
//   <PageTitle title="Pulse" description="What /cmo sees right now." />
//
// The caller decides which landmark wraps it (<main>, <section
// aria-labelledby>, etc.) — PageTitle itself is just the heading.

type Props = {
  /** Visible title text. Renders inside <h1>. */
  title: ReactNode
  /** Optional subtitle/description rendered below the h1. */
  description?: ReactNode
  /** Optional actions (buttons, menus) rendered aligned right on wider viewports. */
  actions?: ReactNode
  /** Escape hatch — any wrapper-level classes the caller needs. */
  className?: string
  /** Optional id so a surrounding `<section aria-labelledby>` can reference the h1. */
  id?: string
  /**
   * Visually hide the title but keep it in the accessibility tree.
   * Use sparingly — for pages where a branded banner or graphic is the
   * visible title, we still need an h1 for screen readers + the audit.
   */
  srOnly?: boolean
}

export function PageTitle({
  title,
  description,
  actions,
  className,
  id,
  srOnly = false,
}: Props): ReactNode {
  if (srOnly) {
    return (
      <h1 id={id} className="sr-only">
        {title}
      </h1>
    )
  }

  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1
          id={id}
          className="font-display text-2xl font-semibold tracking-tight normal-case text-foreground"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
