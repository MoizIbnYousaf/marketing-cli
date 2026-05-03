"use client"

import { useRouter } from "next/navigation"
import { Sparkles, ArrowRight } from "lucide-react"
import { m, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"

export function StepDone() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  return (
    <div className="space-y-10 text-center">
      <div className="space-y-4">
        <m.div
          initial={reduceMotion ? { opacity: 1 } : { scale: 0.6, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto size-16"
        >
          <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl" aria-hidden />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/30">
            <Sparkles className="size-8 text-accent" />
          </div>
        </m.div>

        <m.h1
          initial={reduceMotion ? { opacity: 1 } : { y: 8, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Your marketing brain is live.
        </m.h1>
        <m.p
          initial={reduceMotion ? { opacity: 1 } : { y: 8, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          transition={{ delay: 0.16, duration: 0.3 }}
          className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto"
        >
          Three brand files are written and /cmo has context. HQ shows what
          changed, Content holds the creative assets, and Publish is
          where you act. Talk to /cmo in your Claude Code terminal; the
          Activity panel on the right streams what it does.
        </m.p>
      </div>

      <div className="space-y-3">
        <m.div
          initial={reduceMotion ? undefined : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
          className="grid grid-cols-3 gap-2 text-xs text-muted-foreground"
        >
          {[
            { icon: "🧠", label: "Voice profile" },
            { icon: "🖼️", label: "Signals" },
            { icon: "🥊", label: "Competitors" },
          ].map(({ icon, label }) => (
            <m.div
              key={label}
              variants={{
                hidden: { opacity: 0, y: 6 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
              }}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 py-3 px-2"
            >
              <span className="text-xl" aria-hidden>
                {icon}
              </span>
              <span>{label}</span>
            </m.div>
          ))}
        </m.div>
      </div>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => {
            try {
              localStorage.removeItem("mktg-studio:onboarding")
            } catch {
              // noop
            }
            router.push("/dashboard")
          }}
        >
          Open dashboard
          <ArrowRight className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            try {
              localStorage.removeItem("mktg-studio:onboarding")
            } catch {
              // noop
            }
            router.push("/dashboard?tab=brand")
          }}
        >
          See your brand docs →
        </Button>
      </div>
    </div>
  )
}
