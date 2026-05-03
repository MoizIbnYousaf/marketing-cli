import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Setup — mktg studio",
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      {children}
    </div>
  )
}
