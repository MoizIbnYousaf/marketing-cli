import { Suspense } from "react"
import { SettingsPanel } from "@/components/settings/settings-panel"

export const metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPanel />
    </Suspense>
  )
}
