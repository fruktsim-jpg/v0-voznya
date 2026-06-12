import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { FeaturedManager, type AdminFeaturedSlot } from './featured-manager'

export const dynamic = 'force-dynamic'

/**
 * Featured Slots admin. One authored model for every hero surface — no more
 * heuristic "featured item". Kit-based; writes via /api/admin/featured.
 */
export default async function AdminFeaturedPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.CONTENT_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра контента.
      </div>
    )
  }
  const canManage = hasPermission(session.role, PERM.CONTENT_MANAGE)
  const canPublish = hasPermission(session.role, PERM.CONTENT_PUBLISH)

  let slots: AdminFeaturedSlot[] = []
  try {
    slots = await query<AdminFeaturedSlot>(
      `SELECT id, surface, ref_type, ref_code, title, subtitle, priority,
              status, available_from, available_until
         FROM featured_slots
        ORDER BY surface, priority, updated_at DESC`,
    )
  } catch {
    slots = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Избранное (Featured)</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Авторские слоты для героев каждой поверхности: HOME, SHOP, CASES, PLAY,
        CASINO, SEASON. Один движок — много потребителей. Никаких эвристик.
      </p>
      <FeaturedManager initialSlots={slots} canManage={canManage} canPublish={canPublish} />
    </div>
  )
}
