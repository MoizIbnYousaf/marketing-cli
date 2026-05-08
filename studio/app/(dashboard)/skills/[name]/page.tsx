import { notFound } from "next/navigation"
import { SkillDetail } from "@/components/skills/skill-detail"

type SkillRouteParams = { name: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<SkillRouteParams>
}) {
  const { name } = await params
  return { title: `${name} · Skills` }
}

const SKILL_NAME_PATTERN = /^[a-z0-9-]{1,64}$/

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<SkillRouteParams>
}) {
  const { name } = await params
  // Mirror the server-side resource id check at server.ts:2399 so a
  // bookmarked junk URL renders 404 instead of bouncing the API.
  if (!SKILL_NAME_PATTERN.test(name)) {
    notFound()
  }
  return <SkillDetail name={name} />
}
