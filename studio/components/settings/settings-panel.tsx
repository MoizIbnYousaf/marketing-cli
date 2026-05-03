import { Suspense } from "react"
import { EnvSection } from "./env-section"
import { IntegrationsSection } from "./integrations-section"
import { BrandHealthSection } from "./brand-health-section"
import { DoctorSection } from "./doctor-section"
import { ResetSection } from "./reset-section"
import { SettingsSidebar } from "./settings-sidebar"
import { ErrorBoundary } from "@/components/ui/error-boundary"

function BrandHealthSkeleton() {
  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center gap-3">
        <div className="size-9 rounded-lg bg-muted/40" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-40 rounded bg-muted/40" />
          <div className="h-3 w-64 rounded bg-muted/30" />
        </div>
      </div>
      <div className="space-y-0 rounded-xl border border-border/70 bg-background/60">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-border/40 last:border-b-0" />
        ))}
      </div>
    </div>
  )
}

export function SettingsPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border/60 bg-background/85 px-6 py-5 backdrop-blur">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your own API keys. Everything local-first. /cmo runs in your Claude Code terminal.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SettingsSidebar />

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-10">
            <section id="env" className="scroll-mt-4">
              <EnvSection />
            </section>
            <section id="integrations" className="scroll-mt-4">
              <IntegrationsSection />
            </section>
            <section id="brand" className="scroll-mt-4">
              {/* Localized Suspense + ErrorBoundary so a slow or failing
                  fs scan (G1 F25/F43: Playwright screenshot timeout at
                  1920/2560) streams/falls back independently and never
                  blocks the rest of the Settings page. */}
              <ErrorBoundary label="Brand file health unavailable">
                <Suspense fallback={<BrandHealthSkeleton />}>
                  <BrandHealthSection />
                </Suspense>
              </ErrorBoundary>
            </section>
            <section id="doctor" className="scroll-mt-4">
              <DoctorSection />
            </section>
            <section id="reset" className="scroll-mt-4">
              <ResetSection />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
