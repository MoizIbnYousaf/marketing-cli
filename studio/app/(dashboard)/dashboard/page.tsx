import { Suspense } from "react"
import { redirect } from "next/navigation"
import { BrandWorkspace } from "@/components/workspace/brand-workspace"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Dashboard",
}

type DashboardSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toUrlSearchParams(searchParams: DashboardSearchParams | undefined): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    } else if (value !== undefined) {
      params.set(key, value)
    }
  }
  return params
}

const TAB_COMPAT_REDIRECTS = {
  hq: "pulse",
  content: "signals",
  trends: "signals",
  audience: null,
  opportunities: null,
} as const

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const tab = firstParam(resolvedSearchParams?.tab)

  // Server-side compat redirects for legacy ?tab= values. Keeping this on the
  // server means bookmarks resolve cleanly before the client mounts (no flash
  // of the un-normalized URL). One-release window: hq/content/trends/audience/
  // opportunities all redirect to the canonical tab id (pulse, signals, or no
  // tab). After this release these can be deleted.
  if (tab && tab in TAB_COMPAT_REDIRECTS) {
    const nextParams = toUrlSearchParams(resolvedSearchParams)
    const target = TAB_COMPAT_REDIRECTS[tab as keyof typeof TAB_COMPAT_REDIRECTS]
    nextParams.delete("mode")
    if (target === null) {
      nextParams.delete("tab")
    } else {
      nextParams.set("tab", target)
    }
    const nextQuery = nextParams.toString()
    redirect(nextQuery ? `/dashboard?${nextQuery}` : "/dashboard")
  }

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <BrandWorkspace groupId="default" />
    </Suspense>
  )
}

function WorkspaceFallback() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
