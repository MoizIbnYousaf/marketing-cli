import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Setup -- mktg studio",
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      id="onboarding-scroll-container"
      className="fixed inset-0 overflow-y-auto overflow-x-clip bg-background p-4 py-8"
    >
      <div className="pointer-events-none absolute -left-32 -top-32 size-[30rem] rounded-full bg-gradient-mint/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 size-[32rem] rounded-full bg-gradient-lavender/30 blur-3xl" />
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center">
        {children}
      </div>
    </div>
  )
}
