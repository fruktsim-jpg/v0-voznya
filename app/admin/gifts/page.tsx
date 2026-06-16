import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { GiftsManager, type AdminGift, type GiftCollectionOption } from './gifts-manager'
import {
  DeliveriesManager,
  type AdminDelivery,
  type DeliveryStats,
} from './deliveries/deliveries-manager'
import { AdminPageHeader } from '@/components/admin/ui'
import { GiftsTabs } from './gifts-tabs'

export const dynamic = 'force-dynamic'

/**
 * Gifts — ONE destination for the whole gift lifecycle: Каталог (author the
 * gift) + Доставки (fulfil it). For the owner a gift is a single thing — create
 * it, see demand, see delivery — so the old split top-level Доставки tab folds
 * in here as a sub-tab (?tab=deliveries). Both managers are unchanged; this is
 * pure information-architecture. Mutations still go through their own audited
 * /api/admin/gifts and /api/admin/gifts/deliveries routes.
 */
export default async function AdminGiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
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
  const tab = (await searchParams).tab === 'deliveries' ? 'deliveries' : 'catalog'

  // --- Catalog data ---
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
    // Fallback for a DB that hasn't run the content-system migrations yet
    // (0038 collection_code / 0040 status+asset_code). Without it the JOIN
    // throws and the whole gift list silently renders empty — even though the
    // gifts exist (the shop reads them fine). Degrade to the base catalog so
    // the admin list always shows gifts; enrichment fields default to null.
    try {
      gifts = await query<AdminGift>(
        `SELECT g.code, g.name, g.description, g.star_cost,
                g.price_eshki::int AS price_eshki, g.telegram_gift_id,
                g.stock, g.reserved, g.sold_count, g.is_active, g.sort_order,
                NULL::text AS rarity, NULL::text AS collection_code,
                NULL::text AS status, NULL::text AS featured_slot,
                NULL::timestamptz AS available_from,
                NULL::timestamptz AS available_until,
                false AS has_art
           FROM gift_catalog g
          ORDER BY g.is_active DESC, g.sort_order, g.name`,
      )
    } catch {
      gifts = []
    }
  }
  try {
    collections = await query<GiftCollectionOption>(
      `SELECT code, name FROM collections ORDER BY sort_order, name`,
    )
  } catch {
    collections = []
  }

  // --- Deliveries data (only when that tab is active) ---
  let deliveries: AdminDelivery[] = []
  let deliveryStats: DeliveryStats | null = null
  if (tab === 'deliveries') {
    try {
      deliveries = await query<AdminDelivery>(
        `SELECT gt.idempotency_key, gt.recipient_user_id, gt.item_code, gt.status,
                gt.quantity, gt.transaction_id,
                (gt.meta->>'star_cost')::int AS star_cost,
                COALESCE((gt.meta->>'manual_delivery')::boolean, false) AS manual,
                gt.created_at, gc.name AS gift_name, gc.price_eshki AS price_eshki,
                u.first_name AS recipient_name, u.username AS recipient_username
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
    try {
      const s = await query<{
        total: string; completed: string; pending: string; cancelled: string
        failed: string; premium: string; limited: string
      }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE gt.status = 'completed')::text AS completed,
                COUNT(*) FILTER (WHERE gt.status = 'pending')::text AS pending,
                COUNT(*) FILTER (WHERE gt.status = 'cancelled')::text AS cancelled,
                COUNT(*) FILTER (WHERE gt.status = 'pending' AND COALESCE((gt.meta->>'attempts')::int, 0) > 0)::text AS failed,
                COUNT(*) FILTER (WHERE gt.item_code IN ('gift_premium_3m', 'gift_premium_6m'))::text AS premium,
                COUNT(*) FILTER (WHERE ii.is_limited)::text AS limited
           FROM gift_transactions gt
           LEFT JOIN inventory_items ii ON ii.code = gt.item_code
          WHERE gt.kind = 'tg_gift'`,
      )
      const r = s[0]
      if (r) {
        deliveryStats = {
          total: Number(r.total), completed: Number(r.completed), pending: Number(r.pending),
          cancelled: Number(r.cancelled), failed: Number(r.failed),
          premium: Number(r.premium), limited: Number(r.limited),
        }
      }
    } catch {
      deliveryStats = null
    }
  }

  const pendingCount = deliveryStats?.pending ?? null

  return (
    <div>
      <AdminPageHeader
        title="Подарки"
        subtitle="Полный цикл подарка: каталог — авторская студия (арт, редкость, цена, код генерируется сам), доставки — выдача и возвраты. Покупка и экономика остаются за ботом."
      />

      <GiftsTabs active={tab} pendingCount={pendingCount} />

      {tab === 'catalog' ? (
        <GiftsManager
          initialGifts={gifts}
          collections={collections}
          canManage={canManage}
          canPublish={canManage}
        />
      ) : (
        <DeliveriesManager
          initialDeliveries={deliveries}
          initialStatus="pending"
          initialStats={deliveryStats}
          canManage={canManage}
        />
      )}
    </div>
  )
}
