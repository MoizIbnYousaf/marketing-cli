import { redirect } from "next/navigation"

// The brand editor lives inside BrandWorkspace as a tab, so `/brand` is a
// canonical alias that keeps the URL addressable without duplicating the
// workspace chrome. Redirects to the dashboard with the brand tab active.
//
// `force-dynamic` opts this redirect-only page out of static generation.
// The (dashboard) layout mounts AppSidebar, which uses useSearchParams()
// without a Suspense boundary; under Next 16 + Turbopack that causes a
// prerender bailout (`/brand` was the only route hitting it because every
// other route inside the group either has its own Suspense wrapper or
// runs through a server component that handles the params upfront).
// Since this file's whole job is to throw a redirect, prerender adds no
// value here.
export const dynamic = "force-dynamic"

export default function BrandRoute() {
  redirect("/dashboard?tab=brand")
}
