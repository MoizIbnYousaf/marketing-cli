import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { KeyboardProvider } from "@/components/providers/keyboard-provider"

// Dashboard routes share a tree of client components that read live state
// (SWR queries, useSearchParams tab/panel state, brand-file watchers, SSE).
// Static generation does not match that contract; useSearchParams without a
// Suspense boundary throws at build time. Force per-request rendering for
// every dashboard route. The root layout intentionally does NOT carry this
// directive so /onboarding can statically generate.
export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <KeyboardProvider>
        <a
          href="#dashboard-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:border-accent focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div className="flex h-dvh w-full overflow-hidden bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main
              id="dashboard-main"
              tabIndex={-1}
              className="min-h-0 flex-1 overflow-hidden focus:outline-none"
            >
              {children}
            </main>
          </div>
        </div>
      </KeyboardProvider>
    </SidebarProvider>
  )
}
