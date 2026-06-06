import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { GiftsManager, type AdminGift } from './gifts-manager'

export const dynamic = 'force-dynamic'

/**
 * Gift catalog admin page. Gates on gift.view, loads the catalog (degrading to
 * empty if migration 0018 is not applied), hands it to the client manager.
 * Mutations go through /api/admin/gifts (re-checks gift.manage, writes audit).
 *
 * Stage 1: manage assortment + prices only. No purchase flow, no Telegram
 * delivery yet — see VOZNYA_ECONOMY_V2.
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
  try {
    gifts = await query<AdminGift>(
      `SELECT code, name, description, star_cost,
              price_eshki::int AS price_eshki, telegram_gift_id,
              stock, reserved, sold_count, is_active, sort_order
         FROM gift_catalog
        ORDER BY is_active DESC, sort_order, name`,
    )
  } catch {
    gifts = []
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Подарки</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Каталог Telegram Gifts для магазина за ешки. Ориентир курса: 1★ ≈ 10 ешек,
        цена обычно ≥ себестоимости в звёздах. Покупка и отправка подарков — на
        следующем этапе; сейчас только ассортимент и цены.
      </p>
      <GiftsManager initialGifts={gifts} canManage={canManage} />
    </div>
  )
}
