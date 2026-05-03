import { redirect } from "next/navigation"

// The brand editor lives inside BrandWorkspace as a tab, so `/brand` is a
// canonical alias that keeps the URL addressable without duplicating the
// workspace chrome. Redirects to the dashboard with the brand tab active.
export default function BrandRoute() {
  redirect("/dashboard?tab=brand")
}
