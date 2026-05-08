import { Suspense } from "react"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Settings",
}

function SettingsFallback() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsPanel />
    </Suspense>
  )
}
