import type { Metadata } from "next"
import {
  Archivo,
  Geist_Mono,
} from "next/font/google"
import { Toaster } from "sonner"
import { MotionProvider } from "@/components/providers/motion-provider"
import { PaletteProvider } from "@/components/command-palette/palette-provider"
import { SWRProvider } from "@/components/providers/swr-provider"
import { SSEBridge } from "@/components/providers/sse-bridge"
import { AxeA11y } from "@/components/providers/axe-a11y"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import "./globals.css"

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // Metric-matched fallback so dropping Inter_Tight (the previous --font-sans
  // body family) does not introduce CLS during the font swap. system-ui
  // covers macOS / iOS / Windows / Android default UI fonts.
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "mktg studio",
    template: "%s | mktg studio",
  },
  description:
    "Local-first marketing studio powered by /cmo -- 58 skills, brand intelligence, and social distribution in one dashboard.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Studio is locked dark: ThemeToggle was removed in Wave A. The .dark class
    // is server-rendered so token overrides at globals.css :.dark take effect on
    // first paint without a pre-hydration script. Stale `mktg-studio-theme`
    // localStorage entries from prior builds are harmless: nothing reads them.
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <meta name="theme-color" content="#11161a" />
      </head>
      <body
        className={`${archivo.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        <SWRProvider>
          <MotionProvider>
            <PaletteProvider>
              <AxeA11y />
              {/* SSEBridge lives at the root so its EventSource survives any
                  dashboard-layer remount (HMR, Turbopack hiccups, route
                  transitions). See docs/BUG8-DIAGNOSIS.md. */}
              <SSEBridge />
              {/* ErrorBoundary wraps the route subtree, NOT the providers.
                  A runtime throw inside a workspace page used to surface
                  as a full-page Next.js dev overlay (G4-65/G4-66). Now it
                  becomes a friendly card with a Retry button, and the
                  SSEBridge + SWR cache stay alive across the crash. */}
              <ErrorBoundary>{children}</ErrorBoundary>
            </PaletteProvider>
          </MotionProvider>
        </SWRProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "font-sans",
            style: {
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
            },
          }}
        />
      </body>
    </html>
  )
}
