import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { ItemBuilder, type AdminItem, type CollectionOption } from './item-builder'

export const dynamic = 'force-dynamic'

/**
 * IA-2 — Item Builder. The "create a real item without code" surface. Built
 * entirely from the CC Foundation kit (proof of velocity). Writes the item
 * CATALOG via /api/admin/items (Pattern A, audited); never grants ownership.
 */
export default async function AdminItemsPage() {
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

  let items: AdminItem[] = []
  let collections: CollectionOption[] = []
  try {
    items = await query<AdminItem>(
      `SELECT code, name, description, type AS item_class, rarity,
              collection_code, series_total, is_limited, max_supply,
              transferable, stackable, status, asset_code, featured_slot,
              available_from, available_until, updated_at
         FROM inventory_items
        ORDER BY updated_at DESC NULLS LAST, name`,
    )
    collections = await query<CollectionOption>(
      `SELECT code, name FROM collections ORDER BY sort_order, name`,
    )
  } catch {
    items = []
    collections = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Конструктор предметов</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Создай настоящий предмет: код, имя, описание, класс, редкость, коллекция,
        доступность, арт, слот «избранного» и статус жизненного цикла. Публикация
        делает предмет живым на витринах. Это каталог — выдача предметов игрокам
        остаётся за ботом.
      </p>
      <ItemBuilder
        initialItems={items}
        collections={collections}
        canManage={canManage}
        canPublish={canPublish}
      />
    </div>
  )
}
