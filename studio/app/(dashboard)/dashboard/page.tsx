import { Suspense } from "react"
import { redirect } from "next/navigation"
import { BrandWorkspace } from "@/components/workspace/brand-workspace"

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const tab = firstParam(resolvedSearchParams?.tab)

  if (tab === "trends" || tab === "signals") {
    const nextParams = toUrlSearchParams(resolvedSearchParams)
    nextParams.set("tab", "content")
    nextParams.delete("mode")
    redirect(`/dashboard?${nextParams.toString()}`)
  }

  if (tab === "audience" || tab === "opportunities") {
    const nextParams = toUrlSearchParams(resolvedSearchParams)
    nextParams.delete("tab")
    nextParams.delete("mode")
    const nextQuery = nextParams.toString()
    redirect(nextQuery ? `/dashboard?${nextQuery}` : "/dashboard")
  }

  return (
    <Suspense>
      <BrandWorkspace groupId="default" />
    </Suspense>
  )
}
