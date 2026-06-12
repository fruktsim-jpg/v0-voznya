import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { CollectionsManager, type AdminCollection } from './collections-manager'

export const dynamic = 'force-dynamic'

/**
 * Collections admin (Collections Foundation). Items are born collection-aware;
 * this authors the parent collection records. Kit-based; writes via
 * /api/admin/collections (Pattern A, audited).
 */
export default async function AdminCollectionsPage() {
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

  let collections: AdminCollection[] = []
  try {
    collections = await query<AdminCollection>(
      `SELECT c.code, c.name, c.description, c.kind, c.season_code,
              c.sort_order, c.status,
              (SELECT count(*) FROM inventory_items i WHERE i.collection_code = c.code)::int AS item_count
         FROM collections c
        ORDER BY c.sort_order, c.name`,
    )
  } catch {
    collections = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Коллекции</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Авторские коллекции — родитель для предметов. Постоянные, сезонные и
        событийные наборы. Предметы привязываются к коллекции в Конструкторе.
      </p>
      <CollectionsManager initialCollections={collections} canManage={canManage} canPublish={canPublish} />
    </div>
  )
}
