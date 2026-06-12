import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { GiftsManager, type AdminGift, type GiftCollectionOption } from './gifts-manager'

export const dynamic = 'force-dynamic'

/**
 * Gift Studio admin page. Gates on gift.view, loads the catalog joined to its
 * authored visual definition (degrading to empty if migrations are missing),
 * plus collections for the inline picker. Mutations go through /api/admin/gifts
 * (re-checks gift.manage, writes audit, authors gift_catalog + inventory_items).
 */
export default async function AdminGiftsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра подарков.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.GIFT_MANAGE)

  let gifts: AdminGift[] = []
  let collections: GiftCollectionOption[] = []
  try {
    gifts = await query<AdminGift>(
      `SELECT g.code, g.name, g.description, g.star_cost,
              g.price_eshki::int AS price_eshki, g.telegram_gift_id,
              g.stock, g.reserved, g.sold_count, g.is_active, g.sort_order,
              i.rarity, i.collection_code, i.status, i.featured_slot,
              i.available_from, i.available_until,
              (i.asset_code IS NOT NULL) AS has_art
         FROM gift_catalog g
         LEFT JOIN inventory_items i ON i.code = g.code
        ORDER BY g.is_active DESC, g.sort_order, g.name`,
    )
  } catch {
    gifts = []
  }
  try {
    collections = await query<GiftCollectionOption>(
      `SELECT code, name FROM collections ORDER BY sort_order, name`,
    )
  } catch {
    collections = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Подарки</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Студия подарков: каждый подарок — это визуальный объект (арт, редкость,
        коллекция, статус, «избранное») плюс цена и доставка Telegram Gift. Код
        генерируется автоматически из названия. Покупка и экономика остаются за
        ботом.
      </p>
      <GiftsManager initialGifts={gifts} collections={collections} canManage={canManage} canPublish={canManage} />
    </div>
  )
}
