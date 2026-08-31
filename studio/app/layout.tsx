import type { Metadata } from "next"
import {
  Geist_Mono,
  Inter,
  Newsreader,
} from "next/font/google"
import { Toaster } from "sonner"
import { MotionProvider } from "@/components/providers/motion-provider"
import { PaletteProvider } from "@/components/command-palette/palette-provider"
import { SWRProvider } from "@/components/providers/swr-provider"
import { SSEBridge } from "@/components/providers/sse-bridge"
import { AxeA11y } from "@/components/providers/axe-a11y"
import { WebMCPProvider } from "@/components/providers/webmcp-provider"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})

const newsreader = Newsreader({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
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
    "Local-first marketing studio powered by /cmo -- 76 skills, brand intelligence, and social distribution in one dashboard.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <meta name="theme-color" content="#f5f5f5" />
      </head>
      <body
        className={`${inter.variable} ${newsreader.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        <SWRProvider>
          <MotionProvider>
            <PaletteProvider>
              <AxeA11y />
              {/* SSEBridge lives at the root so its EventSource survives any
                  dashboard-layer remount (HMR, Turbopack hiccups, route
                  transitions). See docs/BUG8-DIAGNOSIS.md. */}
              <SSEBridge />
              {/* WebMCP tools share the authenticated browser session and
                  persist across every Studio route. Unsupported browsers
                  treat this as a no-op progressive enhancement. */}
              <WebMCPProvider />
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
