import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Canonical profile route is `/profile/[id]` (rich PlayerCard: 3-axis status,
 * MMR progress, marriage, full achievements, inventory). The earlier `/u/[id]`
 * (ProfileV2) was a weaker parallel fork and lost data — per the product audit
 * we converge on the stronger page and keep one clear system. This redirect
 * preserves any existing `/u/<id>` links (UserBadge, TopMembers, shares).
 */
export default async function UserProfileRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/profile/${id}`)
}
