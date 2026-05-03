import type { Metadata } from "next"
import {
  Archivo,
  Inter_Tight,
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

export const dynamic = "force-dynamic"

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
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
    "Local-first marketing studio powered by /cmo — 50 skills, brand intelligence, and social distribution in one dashboard.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="theme-color" content="#11161a" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#11161a" media="(prefers-color-scheme: dark)" />
        {/* Pre-hydration theme init — runs before React paints anything so
            OS-dark-mode users never see a light FOUC (G6-02). Must stay in
            sync with <ThemeToggle /> in components/layout/theme-toggle.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mktg-studio-theme');if(t!=='dark'&&t!=='light'&&t!=='system')t='system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${interTight.variable} ${archivo.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
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
