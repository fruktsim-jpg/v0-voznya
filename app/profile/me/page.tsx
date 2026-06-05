import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

export const dynamic = 'force-dynamic'

/**
 * Shortcut to the logged-in user's own profile.
 * Not authenticated → home. Authenticated → /profile/{uid} (which itself shows
 * a friendly "not registered yet" message if the user never played).
 */
export default async function MyProfilePage() {
  const session = await getSession()
  if (!session) {
    redirect('/?auth=required')
  }
  redirect(`/profile/${session.uid}`)
}
