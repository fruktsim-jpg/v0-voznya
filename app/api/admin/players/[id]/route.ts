import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission } from '@/lib/auth/admin-session'
import { PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/players/[id] — full player view for the admin panel:
 * profile + balance + role + inventory + purchase history + gift history.
 * Read-only; requires players.view.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requirePermission(PERM.PLAYERS_VIEW)
  if ('error' in guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: guard.error })
  }

  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  try {
    const [profile, inventory, purchases, giftsOut, giftsIn] = await Promise.all([
      query(
        `SELECT u.user_id, u.username, u.first_name, u.balance,
                u.total_earned, u.total_spent, u.messages_count,
                u.created_at, r.role
           FROM users u
           LEFT JOIN admin_roles r ON r.user_id = u.user_id
          WHERE u.user_id = $1`,
        [userId],
      ),
      query(
        `SELECT i.item_code, i.quantity, i.equipped, i.slot, i.source,
                i.acquired_at, c.name, c.rarity, c.type
           FROM inventory i
           LEFT JOIN inventory_items c ON c.code = i.item_code
          WHERE i.user_id = $1
          ORDER BY i.acquired_at DESC`,
        [userId],
      ),
      query(
        `SELECT id, offer_id, item_code, price, quantity, source,
                transaction_id, created_at
           FROM purchase_history
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [userId],
      ),
      query(
        `SELECT id, kind, item_code, amount, recipient_user_id AS counterparty,
                'sent' AS direction, created_at
           FROM gift_transactions
          WHERE sender_user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [userId],
      ),
      query(
        `SELECT id, kind, item_code, amount, sender_user_id AS counterparty,
                'received' AS direction, created_at
           FROM gift_transactions
          WHERE recipient_user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [userId],
      ),
    ])

    if (profile.length === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    const gifts = [...giftsOut, ...giftsIn].sort(
      (a, b) =>
        new Date(b.created_at as string).getTime() -
        new Date(a.created_at as string).getTime(),
    )

    return NextResponse.json({
      profile: profile[0],
      inventory,
      purchases,
      gifts,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
