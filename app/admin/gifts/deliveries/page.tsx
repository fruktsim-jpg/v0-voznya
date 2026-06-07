import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { DeliveriesManager, type AdminDelivery } from './deliveries-manager'

export const dynamic = 'force-dynamic'

/**
 * Gift deliveries admin page. Gates on gift.view, loads the pending queue
 * (degrading to empty if the gift tables are not migrated), hands it to the
 * client manager. Manual complete/refund go through
 * /api/admin/gifts/deliveries (re-checks gift.manage, writes audit) — the same
 * logic as the bot. Lets ops resolve stuck deliveries without touching the bot.
 */
export default async function AdminGiftDeliveriesPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра доставок.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.GIFT_MANAGE)

  let deliveries: AdminDelivery[] = []
  try {
    deliveries = await query<AdminDelivery>(
      `SELECT gt.idempotency_key,
              gt.recipient_user_id,
              gt.item_code,
              gt.status,
              gt.quantity,
              gt.transaction_id,
              (gt.meta->>'star_cost')::int          AS star_cost,
              COALESCE((gt.meta->>'manual_delivery')::boolean, false) AS manual,
              gt.created_at,
              gc.name                                AS gift_name,
              gc.price_eshki                         AS price_eshki,
              u.first_name                           AS recipient_name,
              u.username                             AS recipient_username
         FROM gift_transactions gt
         LEFT JOIN gift_catalog gc ON gc.code = gt.item_code
         LEFT JOIN users u ON u.user_id = gt.recipient_user_id
        WHERE gt.kind = 'tg_gift' AND gt.status = 'pending'
        ORDER BY gt.created_at ASC
        LIMIT 200`,
    )
  } catch {
    deliveries = []
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Доставки подарков</h1>
        <a
          href="/admin/gifts"
          className="rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/15"
        >
          🎀 Каталог
        </a>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Оплаченные покупки и их выдача. Если автодоставка не сработала (выключена,
        нет telegram_gift_id, мало Stars) — выдай подарок вручную и отметь его
        выданным, либо верни ешки. Действия идут через ту же логику, что и в боте.
      </p>
      <DeliveriesManager
        initialDeliveries={deliveries}
        initialStatus="pending"
        canManage={canManage}
      />
    </div>
  )
}
